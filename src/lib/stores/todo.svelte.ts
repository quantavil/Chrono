import type {
  TodoCreateInput,
  DailyStats,
  UserPreferences,
  TaskGroup,
  TodoLocal,
} from "../types";
import { TodoModel } from "../models/Todo.svelte";
import { storageService } from "../services/storage.svelte";
import { toastManager } from "./toast.svelte";
import { isSupabaseConfigured } from "../utils/supabase";

// Extracted focused classes
import { ListStore } from "./list.svelte";
import { FilterStore } from "./filter.svelte";
import { TimerStore } from "./timer.svelte";
import { UndoManager } from "./undo.svelte";
import { SyncCoordinator } from "./sync.svelte";
import { DisplayEngine } from "./display.svelte";

/**
 * TodoList Store: Central orchestrator for task state.
 * Delegates to focused sub-stores for specific concerns:
 * - ListStore: List management
 * - FilterStore: Filter state
 * - TimerStore: Timer operations
 * - UndoManager: Undo/redo operations
 * - SyncCoordinator: Supabase sync
 * - DisplayEngine: Grouping and sorting
 */
export class TodoList {
  // Core state
  private _items = $state<TodoModel[]>([]);
  private _isLoading = $state(true);
  private _preferences = $state<UserPreferences>(storageService.loadPreferences());
  private _tags = $state<string[]>(storageService.loadTags());

  // Persistence batching
  private _saveTimeout: any;

  // Sub-stores (composition over inheritance)
  readonly listStore: ListStore;
  readonly filterStore: FilterStore;
  readonly timerStore: TimerStore;
  readonly undoManager: UndoManager;
  readonly syncCoordinator: SyncCoordinator;
  readonly displayEngine: DisplayEngine;

  constructor() {
    this.listStore = new ListStore();
    this.filterStore = new FilterStore();
    this.timerStore = new TimerStore(
      () => this._items,
      () => this._save()
    );
    this.undoManager = new UndoManager();
    this.displayEngine = new DisplayEngine();
    this.syncCoordinator = new SyncCoordinator({
      getItems: () => this._items,
      setItems: (updater) => {
        this._items = updater(this._items);
      },
      createModel: (data) => new TodoModel(data),
      save: () => this._save(),
    });

    this._init();
  }

  private _init() {
    const localTodos = storageService.loadLocalTodos();
    this._items = localTodos.map((t) => new TodoModel(t));
    this._syncTagsFromTasks();
    this._isLoading = false;
  }

  // ==========================================================================
  // Delegated Getters
  // ==========================================================================

  get lists() { return this.listStore.lists; }
  get filters() { return this.filterStore.filters; }

  get runningTodo() { return this.timerStore.runningTodo; }
  get hasRunningTimer() { return this.timerStore.hasRunningTimer; }

  get undoStack() { return this.undoManager.stack; }
  get canUndo() { return this.undoManager.canUndo; }

  get displayConfig() { return this.displayEngine.config; }

  get loading() { return this._isLoading; }
  get syncing() { return this.syncCoordinator.isSyncing; }
  get error() { return this.syncCoordinator.lastError; }

  get preferences() { return this._preferences; }
  get availableTags() { return this._tags; }

  // ==========================================================================
  // Core Getters
  // ==========================================================================

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

  get groupedTasks(): TaskGroup[] {
    return this.displayEngine.groupTasks(this.activeTodos);
  }

  get stats(): DailyStats {
    const all = this.all;
    const active = all.filter((t) => !t.isCompleted);
    const completed = all.filter((t) => t.isCompleted);
    const overdue = active.filter((t) => t.isOverdue);
    const totalTimeMs = all.reduce((sum, t) => sum + t.currentTimeMs, 0);
    const estimatedTimeMs = all.reduce((sum, t) => sum + (t.estimatedTime ?? 0), 0);

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
      completionRate: all.length > 0 ? (completed.length / all.length) * 100 : 0,
      tagCounts,
    };
  }

  get allTags(): string[] {
    const tags = new Set<string>();
    this._items.forEach(t => !t._deleted && t.tags.forEach(tag => tags.add(tag)));
    return Array.from(tags).sort();
  }

  // ==========================================================================
  // Private Helpers
  // ==========================================================================

  private _save() {
    if (this._saveTimeout) clearTimeout(this._saveTimeout);
    this._saveTimeout = setTimeout(() => {
      const data = this._items.map((t) => t.toLocal());
      storageService.saveLocalTodos(data);
    }, 500);
  }

  private _applyFilters(todos: TodoModel[]): TodoModel[] {
    let filtered = todos;
    const filters = this.filterStore.filters;

    if (filters.tags.length > 0) {
      filtered = filtered.filter(t =>
        filters.tags.every(filterTag => t.tags.includes(filterTag))
      );
    }

    if (filters.priority !== "all") {
      filtered = filtered.filter(t => t.priority === filters.priority);
    }

    if (filters.listId && filters.listId !== "default") {
      filtered = filtered.filter(t => t.listId === filters.listId);
    }

    return filtered;
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

  // ==========================================================================
  // CRUD Actions
  // ==========================================================================

  add(input: TodoCreateInput): TodoModel {
    const now = new Date().toISOString();
    const maxPos = Math.max(0, ...this._items.map((t) => t.position));

    const newItem = new TodoModel({
      id: crypto.randomUUID(),
      list_id: input.listId,
      user_id: this.syncCoordinator.userId,
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

    const snapshot = item.snapshot();
    const undoAction = this.undoManager.createDeleteAction(snapshot, (s) => {
      const restored = new TodoModel(s as TodoLocal);
      restored.markDirty();
      this._items.push(restored);
      this._save();
      toastManager.success("Task restored");
    });
    this.undoManager.push(undoAction);

    if (item._new && !this.syncCoordinator.userId) {
      this._items = this._items.filter(t => t.id !== id);
    } else {
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

    if ("title" in fields && typeof fields.title === "string") {
      item.updateTitle(fields.title);
      const { title, ...rest } = fields;
      if (Object.keys(rest).length > 0) {
        item.applyUpdate(rest);
      }
    } else {
      item.applyUpdate(fields);
    }

    if ("tags" in fields && Array.isArray(fields.tags)) {
      fields.tags.forEach((t: string) => this.addTag(t));
    }

    this._save();
  }

  move(draggedId: string, targetId: string) {
    if (draggedId === targetId) return;

    const active = this.activeTodos;
    const fromIndex = active.findIndex(t => t.id === draggedId);
    const toIndex = active.findIndex(t => t.id === targetId);

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

  clearCompleted() {
    const completed = this.completedTodos;
    if (completed.length === 0) return;

    const snapshots = completed.map(t => t.snapshot());
    const undoAction = this.undoManager.createClearCompletedAction(snapshots, (s) => {
      (s as TodoLocal[]).forEach(snapshot => {
        const restored = new TodoModel(snapshot);
        restored.markDirty();
        this._items.push(restored);
      });
      this._save();
      toastManager.success(`Restored ${snapshots.length} tasks`);
    });
    this.undoManager.push(undoAction);

    completed.forEach(t => t.markDeleted());
    this._save();
  }

  // ==========================================================================
  // Delegated Actions
  // ==========================================================================

  // Timer
  toggleTimer(id: string) { this.timerStore.toggleTimer(id); }
  startTimer(id: string) { this.timerStore.startTimer(id); }
  pauseTimer(id: string) { this.timerStore.pauseTimer(id); }
  pauseAllTimers() { this.timerStore.pauseAllTimers(); }
  resetTimer(id: string) { this.timerStore.resetTimer(id); }

  // Display
  setDisplayConfig(config: Parameters<typeof this.displayEngine.setConfig>[0]) {
    this.displayEngine.setConfig(config);
  }

  // Undo
  undo() { this.undoManager.undo(); }

  // Sync
  async setUser(userId: string | null) {
    await this.syncCoordinator.setUser(userId);
  }

  async forceSync(): Promise<void> {
    await this.syncCoordinator.forceSync();
  }

  // Lists
  addList(title: string, icon?: string) { return this.listStore.addList(title, icon); }

  removeList(id: string) {
    const removed = this.listStore.removeList(id);
    if (removed) {
      const tasksInList = this._items.filter(t => t.listId === id);
      if (tasksInList.length > 0) {
        tasksInList.forEach(t => {
          t.listId = "default";
          t.markDirty();
        });
        toastManager.info(`Moved ${tasksInList.length} tasks to My Tasks`);
        this._save();
      }
      if (this.filterStore.filters.listId === id) {
        this.filterStore.setListFilter("default");
      }
    }
  }

  updateList(id: string, updates: Partial<any>) { this.listStore.updateList(id, updates); }

  // Filters
  setListFilter(id: string) { this.filterStore.setListFilter(id); }
  toggleTagFilter(tag: string) { this.filterStore.toggleTagFilter(tag); }
  clearFilters() { this.filterStore.clearFilters(); }

  // Preferences
  updatePreference<K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) {
    this._preferences[key] = value;
    storageService.savePreferences(this._preferences);
  }

  // Tags
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

    const undoAction = this.undoManager.createDeleteTagAction(
      { tag, affectedTaskIds, wasInFilters },
      (data) => {
        if (!this._tags.includes(data.tag)) {
          this._tags.push(data.tag);
          this._tags.sort();
          storageService.saveTags(this._tags);
        }

        data.affectedTaskIds.forEach((id: string) => {
          const t = this.getById(id);
          if (t && !t.tags.includes(data.tag)) {
            t.tags = [...t.tags, data.tag];
            t.markDirty();
          }
        });

        if (data.wasInFilters && !this.filterStore.filters.tags.includes(data.tag)) {
          this.filterStore.toggleTagFilter(data.tag);
        }

        this._save();
        toastManager.success(`Restored tag "${data.tag}"`);
      }
    );
    this.undoManager.push(undoAction);

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

  // ==========================================================================
  // Cleanup
  // ==========================================================================

  destroy(): void {
    this.timerStore.cleanup();
    this.syncCoordinator.destroy();
    if (this._saveTimeout) clearTimeout(this._saveTimeout);
  }
}

// Re-export alias for components
export { TodoModel as TodoItem };