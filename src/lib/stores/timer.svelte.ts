import { TIMER_UPDATE_INTERVAL_MS } from "../types";
import type { TodoModel } from "../models/Todo.svelte";

/**
 * Manages the timer interval and enforces "one timer at a time".
 */
export class TimerStore {
    private _tickInterval: any;
    private _getItems: () => TodoModel[];
    private _save: () => void;

    constructor(getItems: () => TodoModel[], saveCallback: () => void) {
        this._getItems = getItems;
        this._save = saveCallback;
        this._startTimerLoop();
    }

    private _startTimerLoop() {
        if (typeof window === 'undefined') return;

        this._tickInterval = setInterval(() => {
            const running = this.runningTodo;
            if (running) {
                running.tick();
                // We don't save on every tick
            }
        }, TIMER_UPDATE_INTERVAL_MS);
    }

    get runningTodo(): TodoModel | null {
        const items = this._getItems();
        return items.find((t) => t.isRunning && !t._deleted) ?? null;
    }

    get hasRunningTimer(): boolean {
        return this.runningTodo !== null;
    }

    toggleTimer(id: string): void {
        const items = this._getItems();
        const item = items.find(t => t.id === id);
        if (!item) return;

        // Enforce one timer at a time
        if (!item.isRunning) {
            this.runningTodo?.pause();
        }

        item.toggleTimer();
        this._save();
    }

    startTimer(id: string): void {
        const items = this._getItems();
        const item = items.find(t => t.id === id);
        if (!item) return;

        this.runningTodo?.pause();
        item.start();
        this._save();
    }

    pauseTimer(id: string): void {
        const items = this._getItems();
        const item = items.find(t => t.id === id);
        item?.pause();
        this._save();
    }

    pauseAllTimers(): void {
        const items = this._getItems();
        items.forEach(t => t.pause());
        this._save();
    }

    resetTimer(id: string): void {
        const items = this._getItems();
        const item = items.find(t => t.id === id);
        item?.resetTimer();
        this._save();
    }

    cleanup() {
        if (this._tickInterval) clearInterval(this._tickInterval);
    }
}
