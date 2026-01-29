import type {
  TodoCreateInput,
  UndoAction,
  DailyStats,
  UserPreferences,
  DisplayConfig,
  TaskGroup,
  List,
  SortBy,
  GroupBy,
} from "../types";
import {
  UNDO_STACK_MAX_SIZE,
  DEFAULT_DISPLAY_CONFIG,
  PRIORITY_CONFIG,
} from "../types";
import { TodoModel } from "../models/Todo.svelte";
import { storageService } from "../services/storage.svelte";
import { toastManager } from "./toast.svelte";
import { isSupabaseConfigured, subscribeTodoChanges } from "../utils/supabase";
import { isOverdue, isToday, isTomorrow } from "../utils/formatTime";
import { ListStore } from "./list.svelte";
import { FilterStore } from "./filter.svelte";
import { TimerStore } from "./timer.svelte";

/**
 * TodoList Store: Central orchestrator for task state, persistence, sync, and undo/redo.
 * Delegates specialized logic to ListStore, FilterStore, and TimerStore.
 */
export class TodoList {
  // State
  private _items = $state<TodoModel[]>([]);
  private _userId = $state<string | null>(null);
  private _isLoading = $state(true);
  private _undoStack = $state<UndoAction[]>([]);
  private _preferences = $state<UserPreferences>(storageService.loadPreferences());
  private _tags = $state<string[]>(storageService.loadTags());

  // Persistence Batching
  private _saveTimeout: any;

  // Sub-Stores
  readonly listStore: ListStore;
  readonly filterStore: FilterStore;
  readonly timerStore: TimerStore;

  // Display Config
  private _displayConfig = $state<DisplayConfig>({ ...DEFAULT_DISPLAY_CONFIG });

  private _unsubscribeRealtime: (() => void) | null = null;

  constructor() {
    this.listStore = new ListStore();
    this.filterStore = new FilterStore();
    // TimerStore needs access to items to find running ones and save callback
    this.timerStore = new TimerStore(
      () => this._items,
      () => this._save()
    );

    this._init();
  }

  private _init() {
    // Load initial data
    const localTodos = storageService.loadLocalTodos();
    this._items = localTodos.map((t) => new TodoModel(t));
    this._syncTagsFromTasks();

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
  }

  // Use ListStore's data
  get lists() {
    return this.listStore.lists;
  }

  // Use FilterStore's data
  get filters() {
    return this.filterStore.filters;
  }

  // Persistence & Reactivity
  private _save() {
    if (this._saveTimeout) clearTimeout(this._saveTimeout);
    this._saveTimeout = setTimeout(() => {
      const data = this._items.map((t) => t.toLocal());
      storageService.saveLocalTodos(data);
    }, 500);

    // Lists and Filters manage their own persistence
    // Display Config managed locally
  }

  private _saveDisplayConfig() {
    localStorage.setItem('chronos_display_config', JSON.stringify(this._displayConfig));
  }

  // Getters

  private _applyFilters(todos: TodoModel[]): TodoModel[] {
    let filtered = todos;
    const filters = this.filterStore.filters;

    // Apply Tag Filter
    if (filters.tags.length > 0) {
      filtered = filtered.filter(t =>
        filters.tags.every(filterTag => t.tags.includes(filterTag))
      );
    }

    // Apply Priority Filter
    if (filters.priority !== 'all') {
      filtered = filtered.filter(t => t.priority === filters.priority);
    }

    // Apply List Filter
    if (filters.listId && filters.listId !== "default") {
      filtered = filtered.filter(t => t.listId === filters.listId);
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

  get groupedTasks(): TaskGroup[] {
    const todos = this.activeTodos;
    const { groupBy, sortBy, sortOrder } = this._displayConfig;

    // 1. Sort Helper
    const sortFn = (a: TodoModel, b: TodoModel): number => {
      let diff = 0;
      switch (sortBy) {
        case 'priority':
          const pA = a.priority ? PRIORITY_CONFIG[a.priority].sortWeight : 3;
          const pB = b.priority ? PRIORITY_CONFIG[b.priority].sortWeight : 3;
          diff = pA - pB;
          break;
        case 'date':
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

      return ['high', 'medium', 'low', 'none']
        .map(k => groups[k])
        .filter(g => g.tasks.length > 0)
        .map(g => ({ ...g, tasks: g.tasks.sort(sortFn) }));
    }

    if (groupBy === 'date') {
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
        } else if (isOverdue(t.dueAt) && !isToday(t.dueAt)) {
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

  // Timer Delegation
  get runningTodo() { return this.timerStore.runningTodo; }
  get hasRunningTimer() { return this.timerStore.hasRunningTimer; }

  toggleTimer(id: string) { this.timerStore.toggleTimer(id); }
  startTimer(id: string) { this.timerStore.startTimer(id); }
  pauseTimer(id: string) { this.timerStore.pauseTimer(id); }
  pauseAllTimers() { this.timerStore.pauseAllTimers(); }
  resetTimer(id: string) { this.timerStore.resetTimer(id); }

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

  get preferences() { return this._preferences; }
  get availableTags() { return this._tags; }

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
      list_id: input.listId,
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

  getById(id: string): TodoModel | undefined {
    return this._items.find(t => t.id === id && !t._deleted);
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

    const active = this.activeTodos;
    const fromIndex = active.findIndex(t => t.id === draggedId);
    let toIndex = active.findIndex(t => t.id === targetId);

    if (fromIndex === -1 || toIndex === -1) return;

    const itemMoving = active[fromIndex];
    if (!itemMoving) return;

    const filtered = active.filter(t => t.id !== draggedId);
    let newIndex = active.findIndex(t => t.id === targetId);

    if (fromIndex < newIndex) {
      newIndex -= 1;
    }

    if (newIndex === -1) newIndex = filtered.length;

    filtered.splice(newIndex, 0, itemMoving);

    filtered.forEach((t, i) => {
      t.position = i;
      t.markDirty();
    });

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

  // Delegation of List Operations
  addList(title: string, icon?: string) { return this.listStore.addList(title, icon); }
  removeList(id: string) {
    const removed = this.listStore.removeList(id);
    if (removed) {
      // Move tasks to default list logic
      const tasksInList = this._items.filter(t => t.listId === id);
      if (tasksInList.length > 0) {
        tasksInList.forEach(t => {
          t.listId = "default";
          t.markDirty();
        });
        toastManager.info(`Moved ${tasksInList.length} tasks to My Tasks`);
        this._save();
      }
      // Update filter if needed
      if (this.filterStore.filters.listId === id) {
        this.filterStore.setListFilter("default");
      }
    }
  }
  updateList(id: string, updates: Partial<any>) { this.listStore.updateList(id, updates); }

  // Delegation of Filter Operations
  setListFilter(id: string) { this.filterStore.setListFilter(id); }
  toggleTagFilter(tag: string) { this.filterStore.toggleTagFilter(tag); }
  clearFilters() { this.filterStore.clearFilters(); }

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
    const affectedTaskIds: string[] = [];
    this._items.forEach(t => {
      if (t.tags.includes(tag)) {
        affectedTaskIds.push(t.id);
      }
    });

    const wasInFilters = this.filterStore.filters.tags.includes(tag);

    this._pushUndo({
      id: crypto.randomUUID(),
      type: "DELETE_TAG",
      timestamp: Date.now(),
      data: { tag, affectedTaskIds, wasInFilters },
      undo: () => {
        if (!this._tags.includes(tag)) {
          this._tags.push(tag);
          this._tags.sort();
          storageService.saveTags(this._tags);
        }

        affectedTaskIds.forEach(id => {
          const t = this.getById(id);
          if (t && !t.tags.includes(tag)) {
            t.tags = [...t.tags, tag];
            t.markDirty();
          }
        });

        if (wasInFilters && !this.filterStore.filters.tags.includes(tag)) {
          this.filterStore.toggleTagFilter(tag);
        }

        this._save();
        toastManager.success(`Restored tag "${tag}"`);
      }
    });

    if (this._tags.includes(tag)) {
      this._tags = this._tags.filter(t => t !== tag);
      storageService.saveTags(this._tags);
    }

    let updated = false;
    this._items.forEach(todo => {
      if (todo.tags.includes(tag)) {
        todo.tags = todo.tags.filter(t => t !== tag);
        todo._dirty = true;
        updated = true;
      }
    });

    if (this.filterStore.filters.tags.includes(tag)) {
      this.filterStore.toggleTagFilter(tag);
    }

    if (updated) this._save();

    toastManager.add({
      type: "info",
      message: `Deleted tag "${tag}"`,
      action: { label: "Undo", onClick: () => this.undo() },
    });
  }

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

  get allTags(): string[] {
    const tags = new Set<string>();
    this._items.forEach(t => !t._deleted && t.tags.forEach(tag => tags.add(tag)));
    return Array.from(tags).sort();
  }

  // _startTimerLoop removed in favor of TimerStore

  private async _performSync() {
    if (!this._userId) return;
    const snapshot = this._items.map(t => t.toLocal());
    const { updatedTodos, error } = await storageService.sync(this._userId, snapshot);

    if (updatedTodos) {
      const newIds = new Set(updatedTodos.map(t => t.id));

      updatedTodos.forEach(dto => {
        const existing = this._items.find(t => t.id === dto.id);
        if (existing) {
          existing.applyUpdate(dto); // Utilizes the update method we made
        } else {
          this._items.push(new TodoModel(dto));
        }
      });

      this._items = this._items.filter(t => newIds.has(t.id));
    }

    if (error) {
      toastManager.error("Sync partial failure: " + error);
    }
  }

  // Handle Realtime Updates
  private _handleRealtimeChange(payload: { eventType: string; old: any; new: any }) {
    const { eventType, new: newRec, old: oldRec } = payload;

    if (eventType === 'INSERT' && newRec) {
      const existing = this.getById(newRec.id);
      if (!existing) {
        this._items.push(new TodoModel(newRec));
        this._save();
      } else {
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
        if (existing._dirty) {
          // Conflict handling priority local
        } else {
          existing.applyUpdate(newRec);
          this._save();
        }
      }
    } else if (eventType === 'DELETE' && oldRec) {
      const existing = this.getById(oldRec.id);
      if (existing) {
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
    toastManager.info("Undid last action");
  }
  async forceSync(): Promise<void> {
    if (this._userId && isSupabaseConfigured()) {
      await this._performSync();
    }
  }

  destroy(): void {
    this.timerStore.cleanup();
    if (this._unsubscribeRealtime) this._unsubscribeRealtime();
    if (this._saveTimeout) clearTimeout(this._saveTimeout);
  }
}

// Re-export alias if needed for components
export { TodoModel as TodoItem };