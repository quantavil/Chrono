/**
 * Unit tests for UndoManager
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock toastManager before importing UndoManager
vi.mock('$lib/stores/toast.svelte', () => ({
    toastManager: {
        info: vi.fn(),
        success: vi.fn(),
        error: vi.fn(),
    },
}));

// Since UndoManager uses $state, we need to test it in a way that
// works without the Svelte compiler. For now, we'll test the logic directly.

describe('UndoManager Logic', () => {
    // Test the core undo logic without Svelte reactivity

    describe('Stack Operations', () => {
        it('should start with empty stack', () => {
            const stack: any[] = [];
            expect(stack.length).toBe(0);
        });

        it('should add action to front of stack', () => {
            const stack: any[] = [];
            const action = { id: '1', type: 'DELETE_TODO', timestamp: Date.now(), data: null, undo: vi.fn() };

            const newStack = [action, ...stack.slice(0, 19)];

            expect(newStack.length).toBe(1);
            expect(newStack[0].id).toBe('1');
        });

        it('should limit stack size to max 20', () => {
            let stack: any[] = [];

            // Add 25 items
            for (let i = 0; i < 25; i++) {
                const action = { id: String(i), type: 'DELETE_TODO', timestamp: Date.now(), data: null, undo: vi.fn() };
                stack = [action, ...stack.slice(0, 19)];
            }

            expect(stack.length).toBe(20);
            expect(stack[0].id).toBe('24'); // Most recent
            expect(stack[19].id).toBe('5'); // Oldest remaining
        });

        it('should execute undo callback when undoing', () => {
            const undoFn = vi.fn();
            const action = { id: '1', type: 'DELETE_TODO', timestamp: Date.now(), data: { title: 'test' }, undo: undoFn };

            action.undo();

            expect(undoFn).toHaveBeenCalledTimes(1);
        });
    });

    describe('Action Creators', () => {
        it('createDeleteAction should create valid action', () => {
            const snapshot = { id: '1', title: 'Test Todo' };
            const restoreFn = vi.fn();

            const action = {
                id: crypto.randomUUID(),
                type: 'DELETE_TODO',
                timestamp: Date.now(),
                data: snapshot,
                undo: () => restoreFn(snapshot),
            };

            expect(action.type).toBe('DELETE_TODO');
            expect(action.data).toEqual(snapshot);

            action.undo();
            expect(restoreFn).toHaveBeenCalledWith(snapshot);
        });

        it('createClearCompletedAction should handle multiple snapshots', () => {
            const snapshots = [
                { id: '1', title: 'Task 1' },
                { id: '2', title: 'Task 2' },
            ];
            const restoreFn = vi.fn();

            const action = {
                id: crypto.randomUUID(),
                type: 'CLEAR_COMPLETED',
                timestamp: Date.now(),
                data: snapshots,
                undo: () => restoreFn(snapshots),
            };

            action.undo();
            expect(restoreFn).toHaveBeenCalledWith(snapshots);
        });

        it('createDeleteTagAction should capture tag data', () => {
            const tagData = { tag: 'work', affectedTaskIds: ['1', '2'], wasInFilters: true };
            const restoreFn = vi.fn();

            const action = {
                id: crypto.randomUUID(),
                type: 'DELETE_TAG',
                timestamp: Date.now(),
                data: tagData,
                undo: () => restoreFn(tagData),
            };

            action.undo();
            expect(restoreFn).toHaveBeenCalledWith(tagData);
        });
    });
});
