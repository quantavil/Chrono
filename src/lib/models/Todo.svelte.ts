import type {
    Todo,
    TodoLocal,
    TodoCreateInput,
    Subtask,
    RecurrenceConfig,
    Priority,
    TimerDisplayData,
} from "../types";
import { formatTime, calculateCurrentTime, nowTimestamp, isOverdue } from "../utils/formatTime";
import { calculateNextOccurrence } from "../utils/recurrence";
import { TODO_TITLE_MAX_LENGTH } from "../types";

/**
 * TodoModel
 *
 * Represents a single Todo item with business logic.
 * Uses Svelte 5 runes for fine-grained reactivity.
 */
export class TodoModel {
    readonly id: string;

    // Core Data (Reactive)
    title = $state("");
    description = $state<string | null>(null);
    notes = $state<string | null>(null);
    isCompleted = $state(false);
    priority = $state<Priority>("medium");
    dueAt = $state<string | null>(null);

    // Timer Data
    accumulatedTime = $state(0);
    estimatedTime = $state<number | null>(null);
    lastStartTime = $state<string | null>(null);

    // Organization
    position = $state(0);
    tags = $state<string[]>([]);
    subtasks = $state<Subtask[]>([]);

    // Recurrence
    recurrence = $state<RecurrenceConfig | null>(null);

    // Metadata
    completedAt = $state<string | null>(null);
    createdAt = $state("");
    updatedAt = $state("");
    userId = $state<string | null>(null);

    // Sync Flags
    _dirty = $state(false);
    _deleted = $state(false);
    _new = $state(false);
    _syncError = $state<string | null>(null);

    // Internal Reactivity
    private _tickTimestamp = $state(Date.now());

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
        this.completedAt = data.completed_at;
        this.createdAt = data.created_at;
        this.updatedAt = data.updated_at;
        this.userId = data.user_id;

        // Sync state restoration
        this._dirty = data._dirty ?? false;
        this._deleted = data._deleted ?? false;
        this._new = data._new ?? false;
        this._syncError = data._syncError ?? null;
    }

    // =========================================================================
    // Getters / Computed
    // =========================================================================

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

    get isOverdue(): boolean {
        if (!this.dueAt || this.isCompleted) return false;
        return isOverdue(this.dueAt);
    }

    get progress(): number {
        if (!this.estimatedTime || this.estimatedTime === 0) return 0;
        return Math.min(100, (this.currentTimeMs / this.estimatedTime) * 100);
    }

    get subtaskProgress() {
        const total = this.subtasks.length;
        const completed = this.subtasks.filter((s) => s.is_completed).length;
        return {
            completed,
            total,
            percent: total > 0 ? (completed / total) * 100 : 0,
        };
    }

    // =========================================================================
    // Actions (Mutators)
    // =========================================================================

    tick(): void {
        this._tickTimestamp = Date.now();
    }

    markDirty(): void {
        this._dirty = true;
        this.updatedAt = nowTimestamp();
    }

    markSynced(): void {
        this._dirty = false;
        this._new = false;
        this._syncError = null;
    }

    markDeleted(): void {
        if (this.isRunning) this.pause();
        this._deleted = true;
        this.markDirty();
    }

    // --- Timer ---

    toggleTimer(): void {
        if (this.isRunning) {
            this.pause();
        } else {
            this.start();
        }
    }

    start(): void {
        if (this.isCompleted || this.isRunning) return;
        this.lastStartTime = nowTimestamp();
        this.markDirty();
    }

    pause(): void {
        if (!this.isRunning) return;
        const elapsed = calculateCurrentTime(0, this.lastStartTime);
        this.accumulatedTime += elapsed;
        this.lastStartTime = null;
        this.markDirty();
    }

    resetTimer(): void {
        if (this.isRunning) this.pause();
        this.accumulatedTime = 0;
        this.markDirty();
    }

    // --- Completion ---

    toggleComplete(): { shouldCreateNext: boolean; nextTodo?: TodoCreateInput } {
        if (this.isCompleted) {
            this.isCompleted = false;
            this.completedAt = null;
        } else {
            if (this.isRunning) this.pause();
            this.isCompleted = true;
            this.completedAt = nowTimestamp();

            if (this.recurrence) {
                const nextDate = calculateNextOccurrence(this.recurrence, new Date());
                if (nextDate) {
                    this.markDirty();
                    return {
                        shouldCreateNext: true,
                        nextTodo: this._createRecurrenceInput(nextDate),
                    };
                }
            }
        }
        this.markDirty();
        return { shouldCreateNext: false };
    }

    // --- Updates ---

    applyUpdate(fields: Partial<Todo> | Record<string, any>): void {
        let changed = false;

        const keyMap: Record<string, string> = {
            due_at: "dueAt",
            estimated_time: "estimatedTime",
            last_start_time: "lastStartTime",
            accumulated_time: "accumulatedTime",
            is_completed: "isCompleted",
            user_id: "userId",
            completed_at: "completedAt",
            created_at: "createdAt",
            updated_at: "updatedAt",
        };

        for (const [key, value] of Object.entries(fields)) {
            const mappedKey = (keyMap[key] || key) as keyof this;
            if (mappedKey in this && (this as any)[mappedKey] !== value) {
                (this as any)[mappedKey] = value;
                changed = true;
            }
        }

        if (changed) this.markDirty();
    }

    updateTitle(title: string): void {
        const trimmed = title.trim().slice(0, TODO_TITLE_MAX_LENGTH);
        if (trimmed !== this.title) {
            this.title = trimmed;
            this.markDirty();
        }
    }

    // --- Subtasks ---

    addSubtask(title: string): void {
        const id = crypto.randomUUID();
        this.subtasks = [
            ...this.subtasks,
            { id, title, is_completed: false, position: this.subtasks.length },
        ];
        this.markDirty();
    }

    toggleSubtask(id: string): void {
        this.subtasks = this.subtasks.map((s) =>
            s.id === id ? { ...s, is_completed: !s.is_completed } : s
        );
        this.markDirty();
    }

    updateSubtaskTitle(id: string, title: string): void {
        this.subtasks = this.subtasks.map((s) =>
            s.id === id ? { ...s, title } : s
        );
        this.markDirty();
    }

    removeSubtask(id: string): void {
        this.subtasks = this.subtasks.filter((s) => s.id !== id);
        this.markDirty();
    }

    // =========================================================================
    // Serialization
    // =========================================================================

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
            tags: $state.snapshot(this.tags),
            subtasks: $state.snapshot(this.subtasks),
            recurrence: $state.snapshot(this.recurrence),
            completed_at: this.completedAt,
            created_at: this.createdAt,
            updated_at: this.updatedAt,
            _dirty: this._dirty,
            _deleted: this._deleted,
            _new: this._new,
            _syncError: this._syncError,
        };
    }

    snapshot(): TodoLocal {
        return JSON.parse(JSON.stringify(this.toLocal()));
    }

    private _createRecurrenceInput(nextDate: Date): TodoCreateInput {
        const shiftDate = (isoStr: string | null): string | null => {
            if (!isoStr) return null;
            const original = new Date(isoStr);
            const shifted = new Date(nextDate);
            shifted.setHours(
                original.getHours(),
                original.getMinutes(),
                original.getSeconds()
            );
            return shifted.toISOString();
        };

        return {
            title: this.title,
            description: this.description,
            notes: this.notes,
            priority: this.priority,
            recurrence: $state.snapshot(this.recurrence),
            tags: [...this.tags],
            due_at: shiftDate(this.dueAt),
            estimated_time: this.estimatedTime,
            subtasks: this.subtasks.map((s) => ({
                ...s,
                id: crypto.randomUUID(),
                is_completed: false,
            })),
        };
    }
}
