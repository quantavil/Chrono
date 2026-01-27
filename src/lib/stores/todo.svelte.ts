
// src/lib/stores/todo.svelte.ts - COMPLETE REWRITE

import type {
  Todo,
  TodoLocal,
  TodoCreateInput,
  TodoUpdateInput,
  DailyStats,
  TimerDisplayData,
  Priority,
  FilterState,
  UndoAction,
  Subtask,
  RecurrenceConfig,
} from '../types';
import {
  LOCAL_STORAGE_KEYS,
  LOCAL_STORAGE_VERSION,
  TODO_TITLE_MAX_LENGTH,
  TIMER_UPDATE_INTERVAL_MS,
  TIMER_SAVE_INTERVAL_MS,
  SYNC_DEBOUNCE_MS,
  UNDO_STACK_MAX_SIZE,
  UNDO_EXPIRY_MS,
  DEFAULT_FILTERS,
  PRIORITY_CONFIG,
} from '../types';
import { formatTime, calculateCurrentTime, nowTimestamp, isOverdue } from '../utils/formatTime';
import { calculateNextOccurrence } from '../utils/recurrence';
import {
  fetchTodos,
  createTodo as apiCreateTodo,
  updateTodo as apiUpdateTodo,
  deleteTodo as apiDeleteTodo,
  batchUpdateTodos,
  subscribeTodoChanges,
  isSupabaseConfigured,
} from '../utils/supabase';
import { toastManager } from './toast.svelte';

// ============================================================================
// UUID Generator
// ============================================================================

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ============================================================================
// TodoItem Class - Individual Todo with Timer
// ============================================================================

export class TodoItem {
  readonly id: string;

  // Core fields
  title = $state<string>('');
  description = $state<string | null>(null);
  notes = $state<string | null>(null);
  isCompleted = $state<boolean>(false);
  priority = $state<Priority>(null);
  dueAt = $state<string | null>(null);

  // Timer fields
  accumulatedTime = $state<number>(0);
  estimatedTime = $state<number | null>(null);
  lastStartTime = $state<string | null>(null);

  // Organization
  position = $state<number>(0);
  tags = $state<string[]>([]);
  subtasks = $state<Subtask[]>([]);

  // Recurrence
  recurrence = $state<RecurrenceConfig | null>(null);
  startAt = $state<string | null>(null);
  endAt = $state<string | null>(null);

  // Metadata
  completedAt = $state<string | null>(null);
  createdAt = $state<string>('');
  updatedAt = $state<string>('');
  userId = $state<string | null>(null);

  // Sync state
  _dirty = $state<boolean>(false); // Changed to public access (implicit in svelte 5 runes usually, but keeping _ private convention if intended, but getter isDeleted maps to _deleted)
  // Actually, typescript needs access modifiers. If I use _dirty I need getter/setter or make it public.
  // The provided code used private _dirty = $state... and get isDirty...
  // But also used item._dirty in list methods (e.g. item._dirty = true).
  // I will make them public for simplicity in this file, or I need to add methods like markDirty().
  // The provided code had markDeleted() etc. but list add/remove might touch internal state.
  // Wait, in `add()`: `const item = new TodoItem(todoLocal)`. `item` constructor takes `TodoLocal`.
  // In `remove()`: `const restored = new TodoItem(snapshot); restored._dirty = true;` -> accessing private property. Svelte modules can access privates if in same file? No, TS checks visibility.
  // I will make them public or use `internal` (not a TS thing). I'll treat them as public properties for the store logic.

  _syncError = $state<string | null>(null);
  _deleted = $state<boolean>(false);
  _new = $state<boolean>(false);

  // Timer tick (triggers reactivity)
  private _tickTimestamp = $state<number>(Date.now());

  constructor(data: TodoLocal) {
    this.id = data.id;
    this.title = data.title;
    this.description = data.description;
    this.notes = data.notes;
    this.isCompleted = data.is_completed;
    this.priority = data.priority;
    this.dueAt = data.due_at;
    this.accumulatedTime = data.accumulated_time;
    this.estimatedTime = data.estimated_time;
    this.lastStartTime = data.last_start_time;
    this.position = data.position;
    this.tags = data.tags ?? [];
    this.subtasks = data.subtasks ?? [];
    this.recurrence = data.recurrence;
    this.startAt = data.start_at;
    this.endAt = data.end_at;
    this.completedAt = data.completed_at;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
    this.userId = data.user_id;
    this._dirty = data._dirty;
    this._deleted = data._deleted;
    this._new = data._new;
    this._syncError = data._syncError;
  }

  // -------------------------------------------------------------------------
  // Computed Properties
  // -------------------------------------------------------------------------

  get isRunning(): boolean {
    return this.lastStartTime !== null && !this.isCompleted;
  }

  get currentTimeMs(): number {
    if (!this.isRunning) return this.accumulatedTime;
    void this._tickTimestamp; // Reactive dependency
    return calculateCurrentTime(this.accumulatedTime, this.lastStartTime);
  }

  get timerDisplay(): TimerDisplayData {
    return formatTime(this.currentTimeMs);
  }

  get isDeleted(): boolean {
    return this._deleted;
  }

  get isDirty(): boolean {
    return this._dirty;
  }

  get isNew(): boolean {
    return this._new;
  }

  get syncError(): string | null {
    return this._syncError;
  }

  get isOverdue(): boolean {
    if (!this.dueAt || this.isCompleted) return false;
    return isOverdue(this.dueAt);
  }

  get status(): 'active' | 'completed' | 'overdue' {
    if (this.isCompleted) return 'completed';
    if (this.isOverdue) return 'overdue';
    return 'active';
  }

  get progress(): number {
    if (!this.estimatedTime || this.estimatedTime === 0) return 0;
    return Math.min(100, (this.currentTimeMs / this.estimatedTime) * 100);
  }

  get subtaskProgress(): { completed: number; total: number; percent: number } {
    const total = this.subtasks.length;
    const completed = this.subtasks.filter(s => s.is_completed).length;
    return {
      completed,
      total,
      percent: total > 0 ? (completed / total) * 100 : 0,
    };
  }

  // -------------------------------------------------------------------------
  // Timer Methods
  // -------------------------------------------------------------------------

  tick(): void {
    this._tickTimestamp = Date.now();
  }

  start(): void {
    if (this.isCompleted || this.isRunning) return;
    this.lastStartTime = nowTimestamp();
    this._markDirty();
  }

  pause(): void {
    if (!this.isRunning) return;
    const elapsed = calculateCurrentTime(0, this.lastStartTime);
    this.accumulatedTime += elapsed;
    this.lastStartTime = null;
    this._markDirty();
  }

  toggle(): void {
    if (this.isRunning) {
      this.pause();
    } else {
      this.start();
    }
  }

  resetTimer(): void {
    if (this.isRunning) this.pause();
    this.accumulatedTime = 0;
    this._markDirty();
  }

  addTime(ms: number): void {
    this.accumulatedTime = Math.max(0, this.accumulatedTime + ms);
    this._markDirty();
  }

  // -------------------------------------------------------------------------
  // Completion Methods
  // -------------------------------------------------------------------------

  complete(): { shouldCreateNext: boolean; nextTodo?: TodoCreateInput } {
    if (this.isRunning) this.pause();

    this.isCompleted = true;
    this.completedAt = nowTimestamp();
    this._markDirty();

    // Handle recurrence
    if (this.recurrence) {
      const nextDate = calculateNextOccurrence(this.recurrence, new Date());
      if (nextDate) {
        return {
          shouldCreateNext: true,
          nextTodo: this._createRecurrenceInput(nextDate),
        };
      }
    }

    return { shouldCreateNext: false };
  }

  uncomplete(): void {
    this.isCompleted = false;
    this.completedAt = null;
    this._markDirty();
  }

  private _createRecurrenceInput(nextDate: Date): TodoCreateInput {
    const shiftDate = (isoStr: string | null): string | null => {
      if (!isoStr) return null;
      const original = new Date(isoStr);
      const shifted = new Date(nextDate);
      shifted.setHours(original.getHours(), original.getMinutes(), 0, 0);
      return shifted.toISOString();
    };

    return {
      title: this.title,
      description: this.description,
      notes: this.notes,
      priority: this.priority,
      recurrence: this.recurrence,
      tags: [...this.tags],
      due_at: shiftDate(this.dueAt),
      start_at: shiftDate(this.startAt),
      end_at: shiftDate(this.endAt),
      estimated_time: this.estimatedTime,
      subtasks: this.subtasks.map(s => ({
        ...s,
        id: generateId(),
        is_completed: false,
      })),
    };
  }

  // -------------------------------------------------------------------------
  // Update Methods
  // -------------------------------------------------------------------------

  updateTitle(newTitle: string): void {
    const trimmed = newTitle.trim().slice(0, TODO_TITLE_MAX_LENGTH);
    if (trimmed === this.title) return;
    this.title = trimmed;
    this._markDirty();
  }

  updatePriority(priority: Priority): void {
    this.priority = priority;
    this._markDirty();
  }

  updateDueDate(dueAt: string | null): void {
    this.dueAt = dueAt;
    this._markDirty();
  }

  addTag(tag: string): void {
    const normalized = tag.trim().toLowerCase();
    if (!normalized || this.tags.includes(normalized)) return;
    this.tags = [...this.tags, normalized];
    this._markDirty();
  }

  removeTag(tag: string): void {
    this.tags = this.tags.filter(t => t !== tag);
    this._markDirty();
  }

  toggleSubtask(subtaskId: string): void {
    this.subtasks = this.subtasks.map(s =>
      s.id === subtaskId ? { ...s, is_completed: !s.is_completed } : s
    );
    this._markDirty();
  }

  applyUpdate(updates: Partial<Todo>): void {
    if (updates.title !== undefined) this.title = updates.title;
    if (updates.description !== undefined) this.description = updates.description;
    if (updates.notes !== undefined) this.notes = updates.notes;
    if (updates.is_completed !== undefined) this.isCompleted = updates.is_completed;
    if (updates.priority !== undefined) this.priority = updates.priority;
    if (updates.due_at !== undefined) this.dueAt = updates.due_at;
    if (updates.accumulated_time !== undefined) this.accumulatedTime = updates.accumulated_time;
    if (updates.estimated_time !== undefined) this.estimatedTime = updates.estimated_time;
    if (updates.last_start_time !== undefined) this.lastStartTime = updates.last_start_time;
    if (updates.position !== undefined) this.position = updates.position;
    if (updates.tags !== undefined) this.tags = updates.tags;
    if (updates.subtasks !== undefined) this.subtasks = updates.subtasks;
    if (updates.recurrence !== undefined) this.recurrence = updates.recurrence;
    if (updates.start_at !== undefined) this.startAt = updates.start_at;
    if (updates.end_at !== undefined) this.endAt = updates.end_at;
    if (updates.completed_at !== undefined) this.completedAt = updates.completed_at;
    if (updates.updated_at !== undefined) this.updatedAt = updates.updated_at;
    this._markDirty();
  }

  // -------------------------------------------------------------------------
  // Sync Methods
  // -------------------------------------------------------------------------

  markDeleted(): void {
    if (this.isRunning) this.pause();
    this._deleted = true;
    this._dirty = true;
  }

  markSynced(): void {
    this._dirty = false;
    this._new = false;
    this._syncError = null;
  }

  markSyncError(error: string): void {
    this._syncError = error;
  }

  private _markDirty(): void {
    this._dirty = true;
    this.updatedAt = nowTimestamp();
  }

  // -------------------------------------------------------------------------
  // Serialization
  // -------------------------------------------------------------------------

  toLocal(): TodoLocal {
    return {
      id: this.id,
      user_id: this.userId,
      title: this.title,
      description: this.description,
      notes: this.notes,
      is_completed: this.isCompleted,
      priority: this.priority,
      due_at: this.dueAt,
      accumulated_time: this.accumulatedTime,
      estimated_time: this.estimatedTime,
      last_start_time: this.lastStartTime,
      position: this.position,
      tags: this.tags,
      subtasks: this.subtasks,
      recurrence: this.recurrence,
      start_at: this.startAt,
      end_at: this.endAt,
      completed_at: this.completedAt,
      created_at: this.createdAt,
      updated_at: this.updatedAt,
      _dirty: this._dirty,
      _deleted: this._deleted,
      _new: this._new,
      _syncError: this._syncError,
    };
  }

  toApi(): Todo {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _dirty, _deleted, _new, _syncError, ...rest } = this.toLocal();
    return rest as Todo;
  }

  // Create a snapshot for undo
  snapshot(): TodoLocal {
    return JSON.parse(JSON.stringify(this.toLocal()));
  }
}

// ============================================================================
// TodoList Class - Collection Manager
// ============================================================================

export class TodoList {
  // Core state
  private _items = $state<TodoItem[]>([]);
  private _userId = $state<string | null>(null);
  private _isLoading = $state<boolean>(true);
  private _isSyncing = $state<boolean>(false);
  private _lastError = $state<string | null>(null);
  private _isInitialized = $state<boolean>(false);

  // Filter state
  private _filters = $state<FilterState>({ ...DEFAULT_FILTERS });

  // Undo stack
  private _undoStack = $state<UndoAction[]>([]);

  // Timer management
  private _tickInterval: ReturnType<typeof setInterval> | null = null;
  private _saveInterval: ReturnType<typeof setInterval> | null = null;
  private _syncTimeout: ReturnType<typeof setTimeout> | null = null;
  private _unsubscribeRealtime: (() => void) | null = null;

  constructor() {
    this._loadFromLocalStorage();
    this._startSmartTickLoop();
    this._startAutoSave();
    this._cleanupExpiredUndos();
  }

  // =========================================================================
  // Getters
  // =========================================================================

  get all(): TodoItem[] {
    return this._items.filter(t => !t.isDeleted);
  }

  get todos(): TodoItem[] {
    return this._applyFilters(this.all);
  }

  get activeTodos(): TodoItem[] {
    return this.all.filter(t => !t.isCompleted).sort((a, b) => a.position - b.position);
  }

  get completedTodos(): TodoItem[] {
    return this.all.filter(t => t.isCompleted).sort((a, b) =>
      new Date(b.completedAt ?? 0).getTime() - new Date(a.completedAt ?? 0).getTime()
    );
  }

  get overdueTodos(): TodoItem[] {
    return this.activeTodos.filter(t => t.isOverdue);
  }

  get runningTodo(): TodoItem | null {
    return this._items.find(t => t.isRunning && !t.isDeleted) ?? null;
  }

  get hasRunningTimer(): boolean {
    return this.runningTodo !== null;
  }

  get loading(): boolean {
    return this._isLoading;
  }

  get syncing(): boolean {
    return this._isSyncing;
  }

  get error(): string | null {
    return this._lastError;
  }

  get filters(): FilterState {
    return this._filters;
  }

  get hasActiveFilters(): boolean {
    return (
      this._filters.search.length > 0 ||
      this._filters.priority !== 'all' ||
      this._filters.status !== 'all' ||
      this._filters.tags.length > 0 ||
      this._filters.hasDueDate !== null
    );
  }

  get hasDirtyItems(): boolean {
    return this._items.some(t => t.isDirty || t.isNew || t.isDeleted);
  }

  get undoStack(): UndoAction[] {
    return this._undoStack;
  }

  get canUndo(): boolean {
    return this._undoStack.length > 0;
  }

  get allTags(): string[] {
    const tags = new Set<string>();
    this.all.forEach(t => t.tags.forEach(tag => tags.add(tag)));
    return Array.from(tags).sort();
  }

  get stats(): DailyStats {
    const all = this.all;
    const active = all.filter(t => !t.isCompleted);
    const completed = all.filter(t => t.isCompleted);
    const overdue = active.filter(t => t.isOverdue);

    const totalTimeMs = all.reduce((sum, t) => sum + t.currentTimeMs, 0);
    const estimatedTimeMs = all.reduce((sum, t) => sum + (t.estimatedTime ?? 0), 0);

    const tagCounts: Record<string, number> = {};
    all.forEach(t => t.tags.forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
    }));

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

  // =========================================================================
  // Filter Methods
  // =========================================================================

  setFilter<K extends keyof FilterState>(key: K, value: FilterState[K]): void {
    this._filters = { ...this._filters, [key]: value };
    this._saveFiltersToStorage();
  }

  setFilters(filters: Partial<FilterState>): void {
    this._filters = { ...this._filters, ...filters };
    this._saveFiltersToStorage();
  }

  clearFilters(): void {
    this._filters = { ...DEFAULT_FILTERS };
    this._saveFiltersToStorage();
  }

  private _applyFilters(items: TodoItem[]): TodoItem[] {
    let result = [...items];
    const f = this._filters;

    // Search
    if (f.search) {
      const query = f.search.toLowerCase();
      result = result.filter(t =>
        t.title.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query) ||
        t.tags.some(tag => tag.includes(query))
      );
    }

    // Priority
    if (f.priority !== 'all') {
      result = result.filter(t => t.priority === f.priority);
    }

    // Status
    if (f.status !== 'all') {
      result = result.filter(t => t.status === f.status);
    }

    // Tags
    if (f.tags.length > 0) {
      result = result.filter(t =>
        f.tags.some(tag => t.tags.includes(tag))
      );
    }

    // Has due date
    if (f.hasDueDate !== null) {
      result = result.filter(t =>
        f.hasDueDate ? t.dueAt !== null : t.dueAt === null
      );
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;

      switch (f.sortBy) {
        case 'due':
          const aDue = a.dueAt ? new Date(a.dueAt).getTime() : Infinity;
          const bDue = b.dueAt ? new Date(b.dueAt).getTime() : Infinity;
          comparison = aDue - bDue;
          break;

        case 'priority':
          const aPriority = a.priority ? PRIORITY_CONFIG[a.priority].sortWeight : 99;
          const bPriority = b.priority ? PRIORITY_CONFIG[b.priority].sortWeight : 99;
          comparison = aPriority - bPriority;
          break;

        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;

        case 'created':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;

        case 'position':
        default:
          comparison = a.position - b.position;
      }

      return f.sortOrder === 'desc' ? -comparison : comparison;
    });

    return result;
  }

  private _saveFiltersToStorage(): void {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEYS.FILTERS, JSON.stringify(this._filters));
    } catch (e) {
      console.warn('[Chronos] Failed to save filters:', e);
    }
  }

  private _loadFiltersFromStorage(): void {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.FILTERS);
      if (stored) {
        this._filters = { ...DEFAULT_FILTERS, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.warn('[Chronos] Failed to load filters:', e);
    }
  }

  // =========================================================================
  // CRUD Operations
  // =========================================================================

  add(input: TodoCreateInput): TodoItem {
    const now = nowTimestamp();
    const maxPosition = Math.max(0, ...this._items.map(t => t.position));

    const todoLocal: TodoLocal = {
      id: generateId(),
      user_id: this._userId,
      title: input.title.trim().slice(0, TODO_TITLE_MAX_LENGTH),
      description: input.description ?? null,
      notes: input.notes ?? null,
      is_completed: false,
      priority: input.priority ?? null,
      due_at: input.due_at ?? null,
      accumulated_time: 0,
      estimated_time: input.estimated_time ?? null,
      last_start_time: null,
      position: input.position ?? maxPosition + 1,
      tags: input.tags ?? [],
      subtasks: input.subtasks ?? [],
      recurrence: input.recurrence ?? null,
      start_at: input.start_at ?? null,
      end_at: input.end_at ?? null,
      completed_at: null,
      created_at: now,
      updated_at: now,
      _dirty: true,
      _deleted: false,
      _new: true,
      _syncError: null,
    };

    const item = new TodoItem(todoLocal);
    this._items = [...this._items, item];

    this._scheduleSave();
    this._scheduleSync();

    return item;
  }

  remove(id: string): void {
    const item = this._items.find(t => t.id === id);
    if (!item) return;

    // Create undo action BEFORE deleting
    const snapshot = item.snapshot();
    this._pushUndo({
      id: generateId(),
      type: 'DELETE_TODO',
      timestamp: Date.now(),
      data: snapshot,
      undo: () => {
        const restored = new TodoItem(snapshot);
        restored._dirty = true;
        this._items = [...this._items, restored];
        this._scheduleSave();
        this._scheduleSync();
        toastManager.success('Task restored');
      },
    });

    // Perform deletion
    if (item.isNew && !this._userId) {
      // Never synced, just remove
      this._items = this._items.filter(t => t.id !== id);
    } else {
      item.markDeleted();
    }

    this._scheduleSave();
    this._scheduleSync();

    // Show toast with undo action
    toastManager.add({
      type: 'info',
      message: `Deleted "${item.title}"`,
      duration: 5000,
      action: {
        label: 'Undo',
        onClick: () => this.undo(),
      },
    });
  }

  getById(id: string): TodoItem | undefined {
    return this._items.find(t => t.id === id && !t.isDeleted);
  }

  updateTitle(id: string, title: string): void {
    const item = this.getById(id);
    if (!item) return;
    item.updateTitle(title);
    this._scheduleSave();
    this._scheduleSync();
  }

  updatePriority(id: string, priority: Priority): void {
    const item = this.getById(id);
    if (!item) return;
    item.updatePriority(priority);
    this._scheduleSave();
    this._scheduleSync();
  }

  updateDueDate(id: string, dueAt: string | null): void {
    const item = this.getById(id);
    if (!item) return;
    item.updateDueDate(dueAt);
    this._scheduleSave();
    this._scheduleSync();
  }

  toggleComplete(id: string): void {
    const item = this.getById(id);
    if (!item) return;

    if (item.isCompleted) {
      item.uncomplete();
    } else {
      const { shouldCreateNext, nextTodo } = item.complete();
      if (shouldCreateNext && nextTodo) {
        this.add(nextTodo);
        toastManager.info('Next occurrence created');
      }
    }
    this._scheduleSave();
    this._scheduleSync();
  }

  updateSubtasks(id: string, subtasks: Subtask[]): void {
    const item = this.getById(id);
    if (!item) return;
    item.applyUpdate({ subtasks });
    this._scheduleSave();
    this._scheduleSync();
  }

  updateTags(id: string, tags: string[]): void {
    const item = this.getById(id);
    if (!item) return;
    item.applyUpdate({ tags });
    this._scheduleSave();
    this._scheduleSync();
  }

  // =========================================================================
  // Internal Helpers


  reorder(fromIndex: number, toIndex: number): void {
    const active = this.activeTodos;
    if (fromIndex < 0 || fromIndex >= active.length) return;
    if (toIndex < 0 || toIndex >= active.length) return;
    if (fromIndex === toIndex) return;

    const [moved] = active.splice(fromIndex, 1);
    if (!moved) return;
    active.splice(toIndex, 0, moved);

    active.forEach((item, index) => {
      item.position = index;
    });

    this._scheduleSave();
    this._scheduleSync();
  }

  // =========================================================================
  // Timer Operations
  // =========================================================================

  toggleTimer(id: string): void {
    const item = this.getById(id);
    if (!item || item.isCompleted) return;

    // Stop other running timers
    if (!item.isRunning) {
      const running = this.runningTodo;
      if (running && running.id !== id) {
        running.pause();
      }
    }

    item.toggle();
    this._scheduleSave();
    this._scheduleSync();
  }

  startTimer(id: string): void {
    const item = this.getById(id);
    if (!item || item.isCompleted || item.isRunning) return;

    const running = this.runningTodo;
    if (running) running.pause();

    item.start();
    this._scheduleSave();
    this._scheduleSync();
  }

  pauseTimer(id: string): void {
    const item = this.getById(id);
    if (!item || !item.isRunning) return;
    item.pause();
    this._scheduleSave();
    this._scheduleSync();
  }

  resetTimer(id: string): void {
    const item = this.getById(id);
    if (!item) return;
    item.resetTimer();
    this._scheduleSave();
    this._scheduleSync();
  }

  pauseAllTimers(): void {
    this._items.forEach(item => {
      if (item.isRunning) item.pause();
    });
    this._scheduleSave();
    this._scheduleSync();
  }

  // =========================================================================
  // Undo System
  // =========================================================================

  private _pushUndo(action: UndoAction): void {
    this._undoStack = [action, ...this._undoStack.slice(0, UNDO_STACK_MAX_SIZE - 1)];
  }

  undo(): boolean {
    const action = this._undoStack[0];
    if (!action) return false;

    this._undoStack = this._undoStack.slice(1);
    action.undo();
    return true;
  }

  private _cleanupExpiredUndos(): void {
    const now = Date.now();
    this._undoStack = this._undoStack.filter(
      action => now - action.timestamp < UNDO_EXPIRY_MS
    );

    // Schedule next cleanup
    if (typeof window !== 'undefined') {
      setTimeout(() => this._cleanupExpiredUndos(), 10000);
    }
  }

  // =========================================================================
  // Bulk Operations
  // =========================================================================

  clearCompleted(): void {
    const completed = this.completedTodos;
    if (completed.length === 0) return;

    // Create undo data
    const snapshots = completed.map(t => t.snapshot());
    this._pushUndo({
      id: generateId(),
      type: 'CLEAR_COMPLETED',
      timestamp: Date.now(),
      data: snapshots,
      undo: () => {
        snapshots.forEach(snapshot => {
          const restored = new TodoItem(snapshot);
          this._items = [...this._items, restored];
        });
        this._scheduleSave();
        this._scheduleSync();
        toastManager.success(`Restored ${snapshots.length} tasks`);
      },
    });

    completed.forEach(item => item.markDeleted());
    this._scheduleSave();
    this._scheduleSync();

    toastManager.add({
      type: 'info',
      message: `Cleared ${completed.length} completed tasks`,
      duration: 5000,
      action: { label: 'Undo', onClick: () => this.undo() },
    });
  }

  // =========================================================================
  // Smart Timer Loop (Only runs when needed)
  // =========================================================================

  private _startSmartTickLoop(): void {
    if (this._tickInterval) return;

    this._tickInterval = setInterval(() => {
      const running = this.runningTodo;
      if (running) {
        running.tick();
      }
    }, TIMER_UPDATE_INTERVAL_MS);
  }

  private _startAutoSave(): void {
    // Save running timer state periodically
    this._saveInterval = setInterval(() => {
      if (this.hasRunningTimer) {
        this._saveToLocalStorage();
      }
    }, TIMER_SAVE_INTERVAL_MS);
  }

  // =========================================================================
  // Persistence
  // =========================================================================

  private _loadFromLocalStorage(): void {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.TODOS);
      if (stored) {
        const parsed: TodoLocal[] = JSON.parse(stored);
        this._items = parsed.map(data => new TodoItem(data));
      }
      this._loadFiltersFromStorage();
    } catch (error) {
      console.error('[Chronos] Failed to load from localStorage:', error);
      this._lastError = 'Failed to load saved todos';
    } finally {
      this._isLoading = false;
      this._isInitialized = true;
    }
  }

  private _saveToLocalStorage(): void {
    try {
      const data = this._items.map(item => item.toLocal());
      localStorage.setItem(LOCAL_STORAGE_KEYS.TODOS, JSON.stringify(data));
      localStorage.setItem(LOCAL_STORAGE_KEYS.VERSION, LOCAL_STORAGE_VERSION.toString());
    } catch (error) {
      console.error('[Chronos] Failed to save:', error);
      this._lastError = 'Failed to save todos';
    }
  }

  private _saveTimeout: ReturnType<typeof setTimeout> | null = null;

  private _scheduleSave(): void {
    if (this._saveTimeout) clearTimeout(this._saveTimeout);
    this._saveTimeout = setTimeout(() => this._saveToLocalStorage(), 100);
  }

  private _scheduleSync(): void {
    if (!this._userId || !isSupabaseConfigured()) return;
    if (this._syncTimeout) clearTimeout(this._syncTimeout);
    this._syncTimeout = setTimeout(() => this.syncWithServer(), SYNC_DEBOUNCE_MS);
  }

  // =========================================================================
  // Supabase Sync (simplified - full implementation would be longer)
  // =========================================================================

  async setUser(userId: string | null): Promise<void> {
    this._userId = userId;

    if (userId) {
      this._items.forEach(item => {
        if (!item.userId) {
          item.userId = userId;
        }
      });
      await this.syncWithServer();
    }

    this._saveToLocalStorage();
  }

  async syncWithServer(): Promise<void> {
    if (!this._userId || !isSupabaseConfigured() || this._isSyncing) return;

    this._isSyncing = true;
    this._lastError = null;

    try {
      const { data: serverTodos, error } = await fetchTodos(this._userId);
      if (error) throw error;

      if (serverTodos) {
        // Simple merge strategy: server wins conflict? Or just load?
        // For simplicity: load strict for now or simple merge.
        // Let's iterate server todos and update local.
        const serverMap = new Map(serverTodos.map(t => [t.id, t]));

        // Update existing & Add new
        serverTodos.forEach(serverTodo => {
          const local = this._items.find(t => t.id === serverTodo.id);
          if (local) {
            // Only update if not dirty? Or assume server is newer?
            // Since we have _dirty flag, if local is dirty and server has update, we have conflict.
            // If local is not dirty, take server.
            if (!local._dirty) {
              // Apply server updates
              // local.applyUpdate(serverTodo);
              // But todoItem.applyUpdate takes partial.
              // We'd need to map.
            }
          } else {
            // New from server
            const newLocal = new TodoItem({
              ...serverTodo,
              _dirty: false,
              _deleted: false,
              _new: false,
              _syncError: null
            });
            this._items.push(newLocal);
          }
        });

        // Handle deletions? If in local but not server?
      }

      // Push local dirty
      const dirtyItems = this._items.filter(t => t._dirty);
      for (const item of dirtyItems) {
        if (item.isNew) {
          await apiCreateTodo(item.toApi());
          item.markSynced();
        } else if (item.isDeleted) {
          await apiDeleteTodo(item.id);
          // Remove from local completely on success
          this._items = this._items.filter(t => t.id !== item.id);
        } else {
          await apiUpdateTodo(item.id, item.toApi());
          item.markSynced();
        }
      }

    } catch (error) {
      console.error('[Chronos] Sync failed:', error);
      this._lastError = error instanceof Error ? error.message : 'Sync failed';
    } finally {
      this._isSyncing = false;
    }
  }

  async forceSync(): Promise<void> {
    if (this._syncTimeout) clearTimeout(this._syncTimeout);
    await this.syncWithServer();
  }

  // =========================================================================
  // Cleanup
  // =========================================================================

  destroy(): void {
    if (this._tickInterval) clearInterval(this._tickInterval);
    if (this._saveInterval) clearInterval(this._saveInterval);
    if (this._saveTimeout) clearTimeout(this._saveTimeout);
    if (this._syncTimeout) clearTimeout(this._syncTimeout);
    if (this._unsubscribeRealtime) this._unsubscribeRealtime();
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const todoList = new TodoList();