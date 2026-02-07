/**
 * UndoManager: Manages undo stack for task operations with type-safe action handling.
 */
import type { UndoAction } from "../types";
import { UNDO_STACK_MAX_SIZE } from "../types";
import { toastManager } from "./toast.svelte";

export class UndoManager {
    private _stack = $state<UndoAction[]>([]);

    get stack(): UndoAction[] {
        return this._stack;
    }

    get canUndo(): boolean {
        return this._stack.length > 0;
    }

    get lastAction(): UndoAction | undefined {
        return this._stack[0];
    }

    /**
     * Push a new undo action onto the stack.
     * Automatically trims the stack to max size.
     */
    push(action: UndoAction): void {
        this._stack = [action, ...this._stack.slice(0, UNDO_STACK_MAX_SIZE - 1)];
    }

    /**
     * Execute the most recent undo action and remove it from the stack.
     * Returns true if an action was undone, false if stack was empty.
     */
    undo(): boolean {
        const action = this._stack[0];
        if (!action) return false;

        this._stack = this._stack.slice(1);
        action.undo();
        toastManager.info("Undid last action");
        return true;
    }

    /**
     * Clear all undo actions from the stack.
     */
    clear(): void {
        this._stack = [];
    }

    /**
     * Create a standard delete action that can be undone.
     */
    createDeleteAction(
        snapshot: unknown,
        restoreCallback: (snapshot: unknown) => void
    ): UndoAction {
        return {
            id: crypto.randomUUID(),
            type: "DELETE_TODO",
            timestamp: Date.now(),
            data: snapshot,
            undo: () => restoreCallback(snapshot),
        };
    }

    /**
     * Create a clear completed action that can be undone.
     */
    createClearCompletedAction(
        snapshots: unknown[],
        restoreCallback: (snapshots: unknown[]) => void
    ): UndoAction {
        return {
            id: crypto.randomUUID(),
            type: "CLEAR_COMPLETED",
            timestamp: Date.now(),
            data: snapshots,
            undo: () => restoreCallback(snapshots),
        };
    }

    /**
     * Create a delete tag action that can be undone.
     */
    createDeleteTagAction(
        data: { tag: string; affectedTaskIds: string[]; wasInFilters: boolean },
        restoreCallback: (data: { tag: string; affectedTaskIds: string[]; wasInFilters: boolean }) => void
    ): UndoAction {
        return {
            id: crypto.randomUUID(),
            type: "DELETE_TAG",
            timestamp: Date.now(),
            data,
            undo: () => restoreCallback(data),
        };
    }
}
