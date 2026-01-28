import type {
  TodoCreateInput,
  Subtask,
  Priority,
  FilterState,
  UndoAction,
  DailyStats,
  UserPreferences,
  DisplayConfig,
  TaskGroup,
  SortBy,
  GroupBy,
} from "../types";
import {
  TIMER_UPDATE_INTERVAL_MS,
  UNDO_STACK_MAX_SIZE,
  SYNC_DEBOUNCE_MS,
  LOCAL_STORAGE_VERSION,
  DEFAULT_DISPLAY_CONFIG,
  PRIORITY_CONFIG,
} from "../types";
import { TodoModel } from "../models/Todo.svelte";
import { storageService } from "../services/storage.svelte";
import { toastManager } from "./toast.svelte";
import { isSupabaseConfigured, subscribeTodoChanges } from "../utils/supabase";
import { isOverdue, isToday, isTomorrow } from "../utils/formatTime";

/**
 * TodoList Store: Central orchestrator for task state, persistence, sync, and undo/redo.
 */
export class TodoList {
  // State
  private _items = $state<TodoModel[]>([]);
  private _userId = $state<string | null>(null);
  private _isLoading = $state(true);
  private _undoStack = $state<UndoAction[]>([]);
  private _preferences = $state<UserPreferences>(storageService.loadPreferences());
  private _tags = $state<string[]>(storageService.loadTags());
  // We'll manage filters in the store to allow deeper integration (e.g. persisted filters)
  private _filters = $state<FilterState>({ ...storageService.loadFilters() });
  // Display Config
  // We can load this from storageService if we add it there, or just manage it here for now.
  // Using a simple localStorage fallback for now.
  private _displayConfig = $state<DisplayConfig>({ ...DEFAULT_DISPLAY_CONFIG });

  private _tickInterval: any;
  private _unsubscribeRealtime: (() => void) | null = null;

  // derived getters for external consumption
  // We re-export TodoModel as TodoItem for compatibility if needed, 
  // or consumer updates.

  constructor() {
    this._init();
  }

  private _init() {
    // Load initial data
    const localTodos = storageService.loadLocalTodos();
    this._items = localTodos.map((t) => new TodoModel(t));
    this._syncTagsFromTasks(); // Ensure tags are synced

    this._isLoading = false;

    // Load Display Config
    const storedConfig = localStorage.getItem('chronos_display_config');
    if (storedConfig) {
      try {
        const parsed = JSON.parse(storedConfig);
        this._displayConfig = { ...DEFAULT_DISPLAY_CONFIG, ...parsed };
      } catch (e) {
        console.error("Failed to load display config", e);
      }
    }



    // Start Timer Loop
    this._startTimerLoop();
  }

  // Persistence & Reactivity
  // We use explicit save calls to robustly persist state changes.

  private _save() {
    // We defer this slightly to batch updates
    if (this._saveTimeout) clearTimeout(this._saveTimeout);
    this._saveTimeout = setTimeout(() => {
      const data = this._items.map((t) => t.toLocal());
      storageService.saveLocalTodos(data);
      storageService.saveLocalTodos(data);
    }, 500);

    // Persist display config whenever it changes (we'll call this manually in setter)
  }

  private _saveDisplayConfig() {
    localStorage.setItem('chronos_display_config', JSON.stringify(this._displayConfig));
  }
  private _saveTimeout: any;

  // Getters

  private _applyFilters(todos: TodoModel[]): TodoModel[] {
    let filtered = todos;

    // Apply Tag Filter
    if (this._filters.tags.length > 0) {
      filtered = filtered.filter(t =>
        this._filters.tags.every(filterTag => t.tags.includes(filterTag))
      );
    }

    // Apply Priority Filter
    if (this._filters.priority !== 'all') {
      filtered = filtered.filter(t => t.priority === this._filters.priority);
    }

    return filtered;
  }

  get all(): TodoModel[] {
    return this._items.filter(t => !t._deleted);
  }

  get activeTodos(): TodoModel[] {
    const active = this.all.filter((t) => !t.isCompleted);
    return this._applyFilters(active).sort((a, b) => a.position - b.position);
  }

  get completedTodos(): TodoModel[] {
    const completed = this.all.filter((t) => t.isCompleted);
    return this._applyFilters(completed).sort(
      (a, b) =>
        new Date(b.completedAt || 0).getTime() -
        new Date(a.completedAt || 0).getTime()
    );
  }

  // =========================================================================
  // Display Engine (Grouping & Sorting)
  // =========================================================================

  get displayConfig() {
    return this._displayConfig;
  }

  setDisplayConfig(config: Partial<DisplayConfig>) {
    this._displayConfig = { ...this._displayConfig, ...config };
    this._saveDisplayConfig();
  }

  // Core Display Logic
  get groupedTasks(): TaskGroup[] {
    const todos = this.activeTodos; // Already filtered by tags/priority filters
    const { groupBy, sortBy, sortOrder } = this._displayConfig;

    // 1. Sort Helper
    const sortFn = (a: TodoModel, b: TodoModel): number => {
      let diff = 0;
      switch (sortBy) {
        case 'priority':
          // High (0) < Med (1) < Low (2) < None (3)
          const pA = a.priority ? PRIORITY_CONFIG[a.priority].sortWeight : 3;
          const pB = b.priority ? PRIORITY_CONFIG[b.priority].sortWeight : 3;
          diff = pA - pB;
          break;
        case 'date':
          // Earliest first
          const dateA = a.dueAt ? new Date(a.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
          const dateB = b.dueAt ? new Date(b.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
          diff = dateA - dateB;
          break;
        case 'alphabetical':
          diff = a.title.localeCompare(b.title);
          break;
        case 'position':
        default:
          diff = a.position - b.position;
          break;
      }
      return sortOrder === 'asc' ? diff : -diff;
    };

    // 2. Grouping
    if (groupBy === 'none') {
      return [{
        id: 'all',
        label: 'All Tasks',
        tasks: [...todos].sort(sortFn)
      }];
    }

    if (groupBy === 'priority') {
      // We want fixed groups: High, Medium, Low, None
      const groups: Record<string, TaskGroup> = {
        high: { id: 'high', label: 'High Priority', tasks: [] },
        medium: { id: 'medium', label: 'Medium Priority', tasks: [] },
        low: { id: 'low', label: 'Low Priority', tasks: [] },
        none: { id: 'none', label: 'No Priority', tasks: [] },
      };

      todos.forEach(t => {
        const p = t.priority || 'none';
        if (groups[p]) groups[p].tasks.push(t);
      });

      // Filter empty groups or keep them? 
      // Usually cleaner to show only populated or all? 
      // Let's show all for drag targets if D&D is enabled, 
      // but for cleaner view maybe just populated.
      // Let's return only populated ones to avoid clutter.
      return ['high', 'medium', 'low', 'none']
        .map(k => groups[k])
        .filter(g => g.tasks.length > 0)
        .map(g => ({ ...g, tasks: g.tasks.sort(sortFn) }));
    }

    if (groupBy === 'date') {
      // Groups: Overdue, Today, Tomorrow, Upcoming, No Date
      const groups = {
        overdue: { id: 'overdue', label: 'Overdue', tasks: [] as TodoModel[] },
        today: { id: 'today', label: 'Today', tasks: [] as TodoModel[] },
        tomorrow: { id: 'tomorrow', label: 'Tomorrow', tasks: [] as TodoModel[] },
        upcoming: { id: 'upcoming', label: 'Upcoming', tasks: [] as TodoModel[] },
        noDate: { id: 'noDate', label: 'No Date', tasks: [] as TodoModel[] },
      };

      todos.forEach(t => {
        if (!t.dueAt) {
          groups.noDate.tasks.push(t);
        } else if (isOverdue(t.dueAt) && !isToday(t.dueAt)) { // isOverdue logic might include today depending on time, but isToday() checks date only. 
          // Our isOverdue utility checks date < today. So safely strictly overdue.
          groups.overdue.tasks.push(t);
        } else if (isToday(t.dueAt)) {
          groups.today.tasks.push(t);
        } else if (isTomorrow(t.dueAt)) {
          groups.tomorrow.tasks.push(t);
        } else {
          groups.upcoming.tasks.push(t);
        }
      });

      return [groups.overdue, groups.today, groups.tomorrow, groups.upcoming, groups.noDate]
        .filter(g => g.tasks.length > 0)
        .map(g => ({ ...g, tasks: g.tasks.sort(sortFn) }));
    }

    return [];
  }

  get runningTodo(): TodoModel | null {
    return this._items.find((t) => t.isRunning && !t._deleted) ?? null;
  }

  get hasRunningTimer(): boolean {
    return this.runningTodo !== null;
  }

  get stats(): DailyStats {
    const all = this.all;
    const active = all.filter((t) => !t.isCompleted);
    const completed = all.filter((t) => t.isCompleted);
    const overdue = active.filter((t) => t.isOverdue);
    const totalTimeMs = all.reduce((sum, t) => sum + t.currentTimeMs, 0);
    const estimatedTimeMs = all.reduce(
      (sum, t) => sum + (t.estimatedTime ?? 0),
      0
    );

    const tagCounts: Record<string, number> = {};
    all.forEach((t) =>
      t.tags.forEach((tag) => {
        tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
      })
    );

    return {
      totalTasks: all.length,
      completedTasks: completed.length,
      activeTasks: active.length,
      overdueTasks: overdue.length,
      totalTimeMs,
      estimatedTimeMs,
      averageTimePerTask: all.length > 0 ? totalTimeMs / all.length : 0,
      completionRate:
        all.length > 0 ? (completed.length / all.length) * 100 : 0,
      tagCounts,
    };
  }

  get preferences() {
    return this._preferences;
  }

  get availableTags() {
    return this._tags;
  }

  get filters() {
    return this._filters;
  }

  get loading() { return this._isLoading; }
  get syncing() { return storageService.isSyncing; }
  get error() { return storageService.lastError; }

  get undoStack() { return this._undoStack; }
  get canUndo() { return this._undoStack.length > 0; }

  // Actions

  add(input: TodoCreateInput): TodoModel {
    const now = new Date().toISOString();
    const maxPos = Math.max(0, ...this._items.map((t) => t.position));

    const newItem = new TodoModel({
      id: crypto.randomUUID(),
      user_id: this._userId,
      title: input.title,
      description: input.description ?? null,
      notes: input.notes ?? null,
      priority: input.priority ?? "none",
      tags: input.tags ?? [],
      recurrence: input.recurrence ?? null,
      due_at: input.due_at ?? null,
      estimated_time: input.estimated_time ?? null,
      subtasks: input.subtasks ?? [],
      position: input.position ?? maxPos + 1,
      is_completed: false,
      accumulated_time: 0,
      last_start_time: null,
      created_at: now,
      updated_at: now,
      completed_at: null,
      _dirty: true,
      _new: true,
      _deleted: false,
      _syncError: null,
    });

    // Sync tags (add any new ones to global list)
    if (input.tags) {
      input.tags.forEach(t => this.addTag(t));
    }

    this._items.push(newItem);
    this._save();
    return newItem;
  }

  remove(id: string): void {
    const item = this.getById(id);
    if (!item) return;

    // Undo Snapshot
    const snapshot = item.snapshot();
    this._pushUndo({
      id: crypto.randomUUID(),
      type: "DELETE_TODO",
      timestamp: Date.now(),
      data: snapshot,
      undo: () => {
        const restored = new TodoModel(snapshot);
        restored.markDirty(); // Ensure it syncs back
        this._items.push(restored);
        this._save();
        toastManager.success("Task restored");
      },
    });

    if (item._new && !this._userId) {
      // Never synced, safe to hard delete
      this._items = this._items.filter(t => t.id !== id);
    } else {
      // Soft delete for sync
      item.markDeleted();
    }

    this._save();
    toastManager.add({
      type: "info",
      message: `Deleted "${item.title}"`,
      action: { label: "Undo", onClick: () => this.undo() },
    });
  }

  toggleComplete(id: string): void {
    const item = this.getById(id);
    if (!item) return;

    const { shouldCreateNext, nextTodo } = item.toggleComplete();

    if (shouldCreateNext && nextTodo) {
      this.add(nextTodo);
      toastManager.info("Next occurrence created");
    }

    this._save();
  }

  updateTask(id: string, fields: Partial<TodoModel> | Record<string, any>) {
    const item = this.getById(id);
    if (!item) return;

    if ('title' in fields && typeof fields.title === 'string') {
      item.updateTitle(fields.title);
      const { title, ...rest } = fields;
      if (Object.keys(rest).length > 0) {
        item.applyUpdate(rest);
      }
    } else {
      item.applyUpdate(fields);
    }

    // Sync tags if we updated them
    if ('tags' in fields && Array.isArray(fields.tags)) {
      fields.tags.forEach((t: string) => this.addTag(t));
    }

    this._save();
  }

  move(draggedId: string, targetId: string) {
    if (draggedId === targetId) return;

    // We operate on the full active list to preserve global order
    // But conceptually users expect to reorder relative to what they see.
    // If we just swap global positions, it works for "Custom" sort implicitly.

    const active = this.activeTodos;
    const fromIndex = active.findIndex(t => t.id === draggedId);
    const toIndex = active.findIndex(t => t.id === targetId);

    if (fromIndex === -1 || toIndex === -1) return;

    const itemMoving = active[fromIndex];
    if (!itemMoving) return;

    // Remove from old pos
    const newOrder = [...active];
    newOrder.splice(fromIndex, 1);

    // Insert at new pos
    // If moving down (from < to), we insert AFTER the target? 
    // Or normally drag drops BEFORE target. 
    // Let's assume drop BEFORE target as standard standard list behavior
    // BUT we need to account for index shift if from < to.

    // Actually, `findIndex` gives us the index in the array.
    // If we splice out `from`, indices shift.
    // It's safer to just calculate simple move:

    // Re-calculating toIndex after removal if necessary?
    // Let's use standard move logic.
    // If we drop ON target, we put it at target's index.
    let insertIndex = toIndex;
    if (fromIndex < toIndex) {
      // If we are moving down, the target's index effectively shifts down by 1?
      // No, `active` is the snapshot before mutation.
      // If we remove `from`, `to` index shifts down by 1.
      insertIndex = toIndex;
      // Wait, if I drop Item A (idx 0) onto Item C (idx 2). 
      // I want A to be where C was? Or after?
      // Standard sortable usually drops *before* item if coming from top? 
      // Let's assume drop means "place before".
      // If I move 0 to 2. Remove 0. Arr is [B, C]. C is at 1. Insert at 1 -> [B, A, C].
      // So A is before C. Correct.
      // But in `active` list, C was at 2. So we use `toIndex` - 1?
      // Let's stick to `splice(toIndex, 0, item)`.

      // CORRECTION:
      // Because of how Svelte animate interactions work, usually we pass the index of the drop target.
      // If we use ID, we just find that target.
      insertIndex = toIndex;
      // If from < to, we remove first. The target index shifts -1.
      insertIndex -= 1;
      // BUT, if the user explicitly dropped "after", that logic is UI side.
      // Let's assume simplistic "swap" or "insert before".
      // Actually, let's look at `reorder` which worked for index.
      // It did `splice(from, 1); splice(to, 0, item)`. 
      // If from < to. e.g. [A, B, C]. Move A(0) to C(2). 
      // Remove A -> [B, C]. C is at 1. Insert at 2 ([B, C, A])? 
      // No, toIndex was passed from UI. 
      // If UI passes target ID, we can just insert *at* that ID's current position.
      // If I drop A on C. C is at 2. Remove A. C becomes 1. Insert at 2? No.

      // Let's simplify:
      // We calculate new array.
      // We filter out dragged.
      // We find index of target in filtered array.
      // We insert there.
    }

    const filtered = active.filter(t => t.id !== draggedId);
    let newIndex = filtered.findIndex(t => t.id === targetId);

    // Default to end if not found (shouldn't happen)
    if (newIndex === -1) newIndex = filtered.length;

    // Insert
    filtered.splice(newIndex, 0, itemMoving);

    // Update positions
    filtered.forEach((t, i) => {
      t.position = i;
      t.markDirty();
    });

    this._save();
  }

  // Deprecated reorder by index (kept for compatibility or if needed)
  // Deprecated reorder by index (kept for compatibility or if needed)
  /* reorder(fromIndex: number, toIndex: number) {
     this.move(this.activeTodos[fromIndex].id, this.activeTodos[toIndex].id);
  } */

  // Timer

  toggleTimer(id: string): void {
    const item = this.getById(id);
    if (!item) return;

    // Enforce one timer at a time
    if (!item.isRunning) {
      this.runningTodo?.pause();
    }

    item.toggleTimer();
    this._save();
  }

  startTimer(id: string): void {
    const item = this.getById(id);
    if (!item) return;

    this.runningTodo?.pause();
    item.start();
    this._save();
  }

  pauseTimer(id: string): void {
    this.getById(id)?.pause();
    this._save();
  }

  pauseAllTimers(): void {
    this._items.forEach(t => t.pause());
    this._save();
  }

  resetTimer(id: string): void {
    this.getById(id)?.resetTimer();
    this._save();
  }

  // Bulk Operations

  clearCompleted() {
    const completed = this.completedTodos;
    if (completed.length === 0) return;

    const snapshots = completed.map(t => t.snapshot());
    this._pushUndo({
      id: crypto.randomUUID(),
      type: 'CLEAR_COMPLETED',
      timestamp: Date.now(),
      data: snapshots,
      undo: () => {
        snapshots.forEach(s => {
          const restored = new TodoModel(s);
          restored.markDirty();
          this._items.push(restored);
        });
        this._save();
        toastManager.success(`Restored ${snapshots.length} tasks`);
      }
    });

    completed.forEach(t => t.markDeleted());
    this._save();
  }

  // Preferences

  updatePreference<K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) {
    this._preferences[key] = value;
    storageService.savePreferences(this._preferences);
  }

  // Tags Management

  addTag(tag: string) {
    if (!tag.trim()) return;
    if (!this._tags.includes(tag)) {
      this._tags.push(tag);
      this._tags.sort();
      storageService.saveTags(this._tags);
    }
  }

  deleteTag(tag: string) {
    // 1. Capture snapshot for undo
    // We need to know which tasks had this tag to restore it accurately
    const affectedTaskIds: string[] = [];
    this._items.forEach(t => {
      if (t.tags.includes(tag)) {
        affectedTaskIds.push(t.id);
      }
    });

    const wasInFilters = this._filters.tags.includes(tag);

    // Undo Action
    this._pushUndo({
      id: crypto.randomUUID(),
      type: "DELETE_TAG",
      timestamp: Date.now(),
      data: { tag, affectedTaskIds, wasInFilters },
      undo: () => {
        // Restore to global list
        if (!this._tags.includes(tag)) {
          this._tags.push(tag);
          this._tags.sort();
          storageService.saveTags(this._tags);
        }

        // Restore to tasks
        affectedTaskIds.forEach(id => {
          const t = this.getById(id);
          if (t && !t.tags.includes(tag)) {
            t.tags = [...t.tags, tag];
            t.markDirty();
          }
        });

        // Restore filter if it was active
        if (wasInFilters && !this._filters.tags.includes(tag)) {
          this._filters.tags = [...this._filters.tags, tag];
        }

        this._save();
        toastManager.success(`Restored tag "${tag}"`);
      }
    });

    // 2. Perform Deletion
    // Remove from available tags
    if (this._tags.includes(tag)) {
      this._tags = this._tags.filter(t => t !== tag);
      storageService.saveTags(this._tags);
    }

    // Remove from all todos
    let updated = false;
    this._items.forEach(todo => {
      if (todo.tags.includes(tag)) {
        todo.tags = todo.tags.filter(t => t !== tag);
        todo._dirty = true;
        updated = true;
      }
    });

    // Remove from filters if active
    if (this._filters.tags.includes(tag)) {
      // Bug fixed: Was calling toggle which might re-add if logic changed
      this._filters.tags = this._filters.tags.filter(t => t !== tag);
    }

    if (updated) this._save();

    // 3. Show Toast
    toastManager.add({
      type: "info",
      message: `Deleted tag "${tag}"`,
      action: { label: "Undo", onClick: () => this.undo() },
    });
  }

  toggleTagFilter(tag: string) {
    if (this._filters.tags.includes(tag)) {
      this._filters.tags = this._filters.tags.filter(t => t !== tag);
    } else {
      // Decide if multi-select or single-select. 
      // TickTick often allows single context or multi. 
      // Let's support adding to filter (AND logic implemented in getter).
      // But arguably, user might want to switch tags. 
      // Let's do single select first for sidebar behavior, or toggle.
      // If clicking a tag in sidebar, usually it selects that ONE tag.
      // So we clear others unless generic multi-select is requested.
      // For sidebar "navigation", it's usually 1 tag context.
      this._filters.tags = [tag];
    }
    // We don't necessarily save filters for session persistence unless requested.
    // storageservice has saveFilters.
    // storageService.saveFilters(this._filters); 
  }

  clearFilters() {
    this._filters.tags = [];
    // storageService.saveFilters(this._filters);
  }

  // =========================================================================
  // Helpers
  // =========================================================================

  private _syncTagsFromTasks() {
    const allTaskTags = new Set<string>();
    this._items.forEach(t => {
      if (!t._deleted) {
        t.tags.forEach(tag => allTaskTags.add(tag));
      }
    });

    let changed = false;
    allTaskTags.forEach(tag => {
      if (!this._tags.includes(tag)) {
        this._tags.push(tag);
        changed = true;
      }
    });

    if (changed) {
      this._tags.sort();
      storageService.saveTags(this._tags);
    }
  }

  getById(id: string): TodoModel | undefined {
    return this._items.find(t => t.id === id && !t._deleted);
  }

  get allTags(): string[] {
    const tags = new Set<string>();
    this._items.forEach(t => !t._deleted && t.tags.forEach(tag => tags.add(tag)));
    return Array.from(tags).sort();
  }

  private _startTimerLoop() {
    this._tickInterval = setInterval(() => {
      const running = this.runningTodo;
      if (running) running.tick();
    }, TIMER_UPDATE_INTERVAL_MS);
  }

  private async _performSync() {
    if (!this._userId) return;
    // We pass ALL items, including deleted ones (for now, until cleaned)
    const snapshot = this._items.map(t => t.toLocal());
    const { updatedTodos, error } = await storageService.sync(this._userId, snapshot);

    if (updatedTodos) {
      // Rehydrate models from updated DTOs
      // We want to preserve object identity if possible to avoid UI flicker?
      // But we have Svelte 5 runes. Updating properties is better.

      const newIds = new Set(updatedTodos.map(t => t.id));

      // 1. Update existing
      this._items.forEach(model => {
        const dto = updatedTodos.find(d => d.id === model.id);
        if (dto) {
          // Update properties
          // We can implement a `model.hydrate(dto)` or just `new TodoModel`.
          // Replacing the object might be safer for deep updates.
          // But effectively we can just map again?
        }
      });

      // Actually, replacing properies is verbose.
      // Let's just create new models for simplicity, Svelte keyed each block handles arrays well.
      // BUT if user is editing a field, replacing the model structure might lose cursor focus?
      // "TaskPanel" binds to `task.title` etc.
      // If the OBJECT reference changes, the binding might break or reset?
      // Yes.
      // SO we must Mutate the existing models if they exist.

      updatedTodos.forEach(dto => {
        const existing = this._items.find(t => t.id === dto.id);
        if (existing) {
          // Updating internal state
          // We need a method `hydrate` on TodoModel?
          // Or just careful property assign.
          existing.title = dto.title;
          existing.isCompleted = dto.is_completed;
          existing._dirty = dto._dirty;
          existing._syncError = dto._syncError;
          existing._new = dto._new;
          existing._deleted = dto._deleted;
          // ... other fields?
          // If we are syncing regularly, we should update all fields.
          // If we are syncing regularly, we should update all fields.
          existing.applyUpdate(dto); // Utilizes the update method we made
        } else {
          this._items.push(new TodoModel(dto));
        }
      });

      // Remove items not in updatedTodos? 
      // `sync` returns the full working set.
      // If something was removed from working set (handled delete), it won't be in updatedTodos.
      this._items = this._items.filter(t => newIds.has(t.id));
    }

    if (error) {
      toastManager.error("Sync partial failure: " + error);
    }
  }

  // Handle Realtime Updates
  private _handleRealtimeChange(payload: { eventType: string; old: any; new: any }) {
    const { eventType, new: newRec, old: oldRec } = payload;

    // Safety check: ignore updates from ourselves if we could detect it, 
    // but here we just check if state matches.

    if (eventType === 'INSERT' && newRec) {
      // Check if we already have it (optimistic creation or duplicate event)
      const existing = this.getById(newRec.id);
      if (!existing) {
        // Incoming from another device
        this._items.push(new TodoModel(newRec));
        // Need to save to local?
        this._save();
      } else {
        // We have it. If it was dirty/new, this confirms it's saved?
        if (existing._new) {
          existing._new = false;
          existing._dirty = false;
          existing._syncError = null;
          this._save();
        }
      }
    } else if (eventType === 'UPDATE' && newRec) {
      const existing = this.getById(newRec.id);
      if (existing) {
        // We have it.
        if (existing._dirty) {
          // Conflict: Local changes vs Remote changes. 
          // Currently we prioritize local changes until next sync push?
          // Or we warn?
          // For now, let's NOT overwrite local dirty state to prevent losing user work.
        } else {
          // Apply remote update
          existing.applyUpdate(newRec);
          this._save();
        }
      }
    } else if (eventType === 'DELETE' && oldRec) {
      // Remote delete
      const existing = this.getById(oldRec.id);
      if (existing) {
        if (existing._dirty) {
          // Local edit vs Remote delete.
          // Assume remote delete wins for consistency (or resurrect?)
          // Let's delete it.
        }
        this._items = this._items.filter(t => t.id !== oldRec.id);
        this._save();
      }
    }
  }

  async setUser(userId: string | null) {
    this._userId = userId;
    this._items.forEach(t => t.userId = userId);
    this._save();

    if (userId) {
      this._performSync();

      // Setup Realtime
      if (this._unsubscribeRealtime) this._unsubscribeRealtime();
      this._unsubscribeRealtime = subscribeTodoChanges(userId, (p) => this._handleRealtimeChange(p));
    } else {
      if (this._unsubscribeRealtime) {
        this._unsubscribeRealtime();
        this._unsubscribeRealtime = null;
      }
    }
  }

  // Undo
  private _pushUndo(action: UndoAction) {
    this._undoStack = [action, ...this._undoStack.slice(0, UNDO_STACK_MAX_SIZE - 1)];
  }

  undo() {
    const action = this._undoStack[0];
    if (!action) return;
    this._undoStack = this._undoStack.slice(1);
    action.undo();
  }
  async forceSync(): Promise<void> {
    if (this._userId && isSupabaseConfigured()) {
      await this._performSync();
    }
  }

  destroy(): void {
    if (this._tickInterval) clearInterval(this._tickInterval);
    if (this._unsubscribeRealtime) this._unsubscribeRealtime();
    if (this._saveTimeout) clearTimeout(this._saveTimeout);
  }
}

// Re-export alias if needed for components
export { TodoModel as TodoItem };