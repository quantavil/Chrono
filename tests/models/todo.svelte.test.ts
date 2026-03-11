/**
 * Unit tests for TodoModel (Reactive)
 * Verifies business logic and state transitions using Svelte 5 runes
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TodoModel } from '../../src/lib/models/Todo.svelte';
import type { TodoLocal } from '../../src/lib/types';

describe('TodoModel', () => {
    const mockData: TodoLocal = {
        id: 'test-1',
        title: 'Original Title',
        description: 'Original Description',
        notes: 'Original Notes',
        is_completed: false,
        priority: 'medium',
        due_at: '2026-02-10T00:00:00.000Z',
        accumulated_time: 5000,
        estimated_time: 10000,
        last_start_time: null,
        position: 1,
        tags: ['work', 'urgent'],
        subtasks: [
            { id: 's1', title: 'Subtask 1', is_completed: false, position: 0 }
        ],
        recurrence: null,
        completed_at: null,
        created_at: '2026-02-01T12:00:00.000Z',
        updated_at: '2026-02-01T12:00:00.000Z',
        user_id: 'user-123'
    };

    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-02-07T12:00:00.000Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('Initialization', () => {
        it('should initialize with provided data', () => {
            const todo = new TodoModel(mockData);
            expect(todo.id).toBe('test-1');
            expect(todo.title).toBe('Original Title');
            expect(todo.priority).toBe('medium');
            expect(todo.tags).toEqual(['work', 'urgent']);
            expect(todo.subtasks).toHaveLength(1);
        });

        it('should initialize with default listId if missing', () => {
            const todo = new TodoModel({ ...mockData, list_id: undefined });
            expect(todo.listId).toBe('default');
        });
    });

    describe('Timer Logic', () => {
        it('should start timer', () => {
            const todo = new TodoModel(mockData);
            todo.start();

            expect(todo.isRunning).toBe(true);
            expect(todo.lastStartTime).toBe('2026-02-07T12:00:00.000Z');
            expect(todo._dirty).toBe(true);
        });

        it('should not start if already completed', () => {
            const todo = new TodoModel({ ...mockData, is_completed: true });
            todo.start();
            expect(todo.isRunning).toBe(false);
        });

        it('should calculate currentTimeMs while running', () => {
            const todo = new TodoModel(mockData);
            todo.start();

            // Advance time 5 seconds
            vi.advanceTimersByTime(5000);
            todo.tick(); // Update _tickTimestamp for reactivity simulation

            // 5000 (acc) + 5000 (running) = 10000
            expect(todo.currentTimeMs).toBe(10000);
        });

        it('should pause timer and accumulate time', () => {
            const todo = new TodoModel(mockData);
            todo.start();
            vi.advanceTimersByTime(3000);
            todo.pause();

            expect(todo.isRunning).toBe(false);
            expect(todo.lastStartTime).toBeNull();
            expect(todo.accumulatedTime).toBe(8000); // 5000 + 3000
        });

        it('should reset timer', () => {
            const todo = new TodoModel(mockData);
            todo.start();
            todo.resetTimer();

            expect(todo.isRunning).toBe(false);
            expect(todo.accumulatedTime).toBe(0);
        });
    });

    describe('Completion Logic', () => {
        it('should toggle complete', () => {
            const todo = new TodoModel(mockData);
            const result = todo.toggleComplete();

            expect(todo.isCompleted).toBe(true);
            expect(todo.completedAt).toBe('2026-02-07T12:00:00.000Z');
            expect(result.shouldCreateNext).toBe(false);
        });

        it('should pause timer when completing', () => {
            const todo = new TodoModel(mockData);
            todo.start();
            todo.toggleComplete();

            expect(todo.isRunning).toBe(false);
            expect(todo.isCompleted).toBe(true);
        });

        it('should handle recurrence when completing', () => {
            const recurrenceTodo = new TodoModel({
                ...mockData,
                recurrence: { type: 'daily', interval: 1 }
            });

            const result = recurrenceTodo.toggleComplete();

            expect(result.shouldCreateNext).toBe(true);
            expect(result.nextTodo?.due_at).toBe('2026-02-08T00:00:00.000Z');
        });
    });

    describe('Subtask Management', () => {
        it('should add subtask', () => {
            const todo = new TodoModel(mockData);
            todo.addSubtask('New Subtask');

            expect(todo.subtasks).toHaveLength(2);
            expect(todo.subtasks[1].title).toBe('New Subtask');
            expect(todo.subtasks[1].id).toBeDefined();
        });

        it('should toggle subtask completion', () => {
            const todo = new TodoModel(mockData);
            const subId = mockData.subtasks[0].id;
            todo.toggleSubtask(subId);

            expect(todo.subtasks[0].is_completed).toBe(true);
        });

        it('should calculate subtask progress', () => {
            const todo = new TodoModel({
                ...mockData,
                subtasks: [
                    { id: '1', title: 'S1', is_completed: true, position: 0 },
                    { id: '2', title: 'S2', is_completed: false, position: 1 }
                ]
            });

            expect(todo.subtaskProgress.completed).toBe(1);
            expect(todo.subtaskProgress.percent).toBe(50);
        });
    });

    describe('Updates and Serialization', () => {
        it('should apply partial updates', () => {
            const todo = new TodoModel(mockData);
            todo.applyUpdate({ title: 'New Title', priority: 'high' });

            expect(todo.title).toBe('New Title');
            expect(todo.priority).toBe('high');
            expect(todo._dirty).toBe(true);
        });

        it('should generate a local data object', () => {
            const todo = new TodoModel(mockData);
            const local = todo.toLocal();

            expect(local.id).toBe(todo.id);
            expect(local.title).toBe(todo.title);
            expect(local.tags).toEqual(todo.tags);
        });

        it('should create a snapshot', () => {
            const todo = new TodoModel(mockData);
            const snapshot = todo.snapshot();

            // Snapshot should be a plain object, not a proxy
            expect(snapshot.title).toBe(todo.title);
            // Verify it's not the same reference if it was reactive
            expect(snapshot).not.toBe(todo);
        });
    });
});
