import type {
  TodoCreateInput,
  Subtask,
  Priority,
  FilterState,
  UndoAction,
  DailyStats,
  UserPreferences,
} from "../types";
import {
  TIMER_UPDATE_INTERVAL_MS,
  UNDO_STACK_MAX_SIZE,
  SYNC_DEBOUNCE_MS,
  LOCAL_STORAGE_VERSION,
} from "../types";
import { TodoModel } from "../models/Todo.svelte";
import { storageService } from "../services/storage.svelte";
import { toastManager } from "./toast.svelte";
import { isSupabaseConfigured, subscribeTodoChanges } from "../utils/supabase";

/**
 * TodoList Store
 *
 * Manages the collection of Todos.
 * Orchestrates persistence via StorageService.
 * Handles undo/redo and filtering.
 */
export class TodoList {
  // State
  private _items = $state<TodoModel[]>([]);
  private _userId = $state<string | null>(null);
  private _isLoading = $state(true);
  private _undoStack = $state<UndoAction[]>([]);
  private _preferences = $state<UserPreferences>(storageService.loadPreferences());

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
    this._isLoading = false;

    // Start Timer Loop
    this._startTimerLoop();
  }

  // =========================================================================
  // Reactivity (Auto-Save)
  // =========================================================================

  // Note: In Svelte 5 classes, we can use $effect if we register it in effect root.
  // However, since this is a singleton exported at module level, effects might not strictly attach to component tree.
  // Best practice for stores is often explicit save or subscriptions.
  // But we are in a .svelte.ts module.
  // calling $effect(() => ...) at top level of module works? No.
  // Inside constructor? Yes, but needs a root.
  // We will stick to explicit save schedules triggered by actions + reactivity on change?
  // Actually, `TodoModel` marks itself dirty. We can watch `_items` in an effect if we are inside a component.
  // But here we are the store.
  // We will use a standard "subscription" pattern via $effect in the App.svelte or use `setInterval`.
  // OR we rely on the fact that `_items` is reactive.

  // Let's implement explicit save for now to be safe and robust without relying on unmounted effects.
  // Actually, we can use a simple `$effect.root` if we want, but explicit method calls `save()` are clearer.
  // I will add `_save()` calls to all mutators.

  private _save() {
    // We defer this slightly to batch updates
    if (this._saveTimeout) clearTimeout(this._saveTimeout);
    this._saveTimeout = setTimeout(() => {
      const data = this._items.map((t) => t.toLocal());
      storageService.saveLocalTodos(data);
    }, 500);
  }
  private _saveTimeout: any;

  // =========================================================================
  // Getters
  // =========================================================================

  get all(): TodoModel[] {
    return this._items.filter(t => !t._deleted);
  }

  get activeTodos(): TodoModel[] {
    return this.all
      .filter((t) => !t.isCompleted)
      .sort((a, b) => a.position - b.position);
  }

  get completedTodos(): TodoModel[] {
    return this.all
      .filter((t) => t.isCompleted)
      .sort(
        (a, b) =>
          new Date(b.completedAt || 0).getTime() -
          new Date(a.completedAt || 0).getTime()
      );
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

  get loading() { return this._isLoading; }
  get syncing() { return storageService.isSyncing; }
  get error() { return storageService.lastError; }

  get undoStack() { return this._undoStack; }
  get canUndo() { return this._undoStack.length > 0; }

  // =========================================================================
  // Actions
  // =========================================================================

  add(input: TodoCreateInput): TodoModel {
    const now = new Date().toISOString();
    const maxPos = Math.max(0, ...this._items.map((t) => t.position));

    const newItem = new TodoModel({
      id: crypto.randomUUID(),
      user_id: this._userId,
      title: input.title,
      description: input.description ?? null,
      notes: input.notes ?? null,
      priority: input.priority ?? null,
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
    this._save();
  }

  reorder(fromIndex: number, toIndex: number) {
    const active = this.activeTodos; // This is a sorted view, but we need to manipulate positions
    // We better rely on the view that passed the indices.
    // Assuming indices correspond to "Active Todos" view.

    if (fromIndex === toIndex) return;

    // Remove from list
    // Note: splice on a derived array won't affect source, we need to map positions
    // 1. Get the item moving
    const itemMoving = active[fromIndex];
    const itemTarget = active[toIndex];

    if (!itemMoving) return;

    // Visual reorder in the filtered list
    const newOrder = [...active];
    newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, itemMoving);

    // Update positions based on new index
    newOrder.forEach((t, i) => {
      t.position = i;
      t.markDirty();
    });

    this._save();
  }

  // --- Timer ---

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

  // --- Bulk ---

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

  // =========================================================================
  // Filters
  // =========================================================================

  updatePreference<K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) {
    this._preferences[key] = value;
    storageService.savePreferences(this._preferences);
  }

  // =========================================================================
  // Helpers
  // =========================================================================

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