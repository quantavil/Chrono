/**
 * Unit tests for TodoList Store
 * Tests the central orchestrator and its interactions with sub-stores and services
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TodoList } from '../../src/lib/stores/todo.svelte';
import { storageService } from '../../src/lib/services/storage.svelte';
import type { TodoLocal, FilterState, UserPreferences } from '../../src/lib/types';
import { toastManager } from '../../src/lib/stores/toast.svelte';

// Mock storageService
vi.mock('../../src/lib/services/storage.svelte', () => ({
    storageService: {
        loadLocalTodos: vi.fn(() => []),
        saveLocalTodos: vi.fn(),
        loadPreferences: vi.fn(),
        savePreferences: vi.fn(),
        loadTags: vi.fn(() => []),
        saveTags: vi.fn(),
        loadFilters: vi.fn(),
        saveFilters: vi.fn(),
        loadLists: vi.fn(() => []),
        saveLists: vi.fn(),
    }
}));

// Mock toastManager
vi.mock('../../src/lib/stores/toast.svelte', () => ({
    toastManager: {
        info: vi.fn(),
        success: vi.fn(),
        error: vi.fn(),
        add: vi.fn(),
    }
}));

// Mock supabase utils
vi.mock('../../src/lib/utils/supabase', () => ({
    isSupabaseConfigured: vi.fn(() => false),
}));

// Helper to access mocked methods
const mockedStorage = vi.mocked(storageService);

// Helper to create valid TodoLocal for tests
const createMockTodo = (overrides: Partial<TodoLocal> = {}): TodoLocal => ({
    id: crypto.randomUUID(),
    list_id: 'default',
    user_id: null,
    title: 'Test Todo',
    description: null,
    notes: null,
    is_completed: false,
    priority: 'none',
    tags: [],
    recurrence: null,
    due_at: null,
    estimated_time: null,
    accumulated_time: 0,
    last_start_time: null,
    position: 0,
    subtasks: [],
    completed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    _dirty: false,
    _deleted: false,
    _new: false,
    _syncError: null,
    ...overrides
});

const defaultFilters: FilterState = {
    tags: [],
    priority: 'all',
    listId: 'default',
    status: 'all',
    hasDueDate: false,
    sortBy: 'position',
    sortOrder: 'asc'
};

const defaultPrefs: UserPreferences = {
    theme: 'dark',
    enableFocusMode: false
};

describe('TodoList Store', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.clearAllMocks();

        // Default returns for mocks
        mockedStorage.loadLocalTodos.mockReturnValue([]);
        mockedStorage.loadPreferences.mockReturnValue(defaultPrefs);
        mockedStorage.loadTags.mockReturnValue([]);
        mockedStorage.loadFilters.mockReturnValue(defaultFilters);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should initialize with items from storage', () => {
        mockedStorage.loadLocalTodos.mockReturnValue([
            createMockTodo({ id: '1', title: 'Test Todo' })
        ]);

        const store = new TodoList();
        expect(store.all).toHaveLength(1);
        expect(store.all[0].title).toBe('Test Todo');
        expect(store.loading).toBe(false);
    });

    describe('CRUD Actions', () => {
        it('should add a new todo', () => {
            const store = new TodoList();
            const newItem = store.add({ title: 'New Task', listId: 'default' });

            expect(store.all).toHaveLength(1);
            expect(newItem.title).toBe('New Task');
            expect(newItem._new).toBe(true);
        });

        it('should remove a todo and update undo stack', () => {
            mockedStorage.loadLocalTodos.mockReturnValue([
                createMockTodo({ id: '1', title: 'ToDelete' })
            ]);

            const store = new TodoList();
            store.remove('1');

            expect(store.all).toHaveLength(0);
            expect(store.undoStack).toHaveLength(1);
            expect(store.undoStack[0].type).toBe('DELETE_TODO');
        });

        it('should toggle complete status', () => {
            mockedStorage.loadLocalTodos.mockReturnValue([
                createMockTodo({ id: '1', title: 'Task', is_completed: false })
            ]);

            const store = new TodoList();
            store.toggleComplete('1');

            expect(store.getById('1')?.isCompleted).toBe(true);
        });

        it('should clear completed tasks', () => {
            mockedStorage.loadLocalTodos.mockReturnValue([
                createMockTodo({ id: '1', title: 'Active', is_completed: false }),
                createMockTodo({ id: '2', title: 'Done', is_completed: true })
            ]);

            const store = new TodoList();
            store.clearCompleted();

            expect(store.all).toHaveLength(1);
            expect(store.all[0].title).toBe('Active');
        });
    });

    describe('Filtering', () => {
        it('should filter by priority', () => {
            mockedStorage.loadLocalTodos.mockReturnValue([
                createMockTodo({ id: '1', title: 'High', priority: 'high' }),
                createMockTodo({ id: '2', title: 'Low', priority: 'low' })
            ]);

            const store = new TodoList();
            store.filterStore.setPriorityFilter('high');

            expect(store.activeTodos).toHaveLength(1);
            expect(store.activeTodos[0].title).toBe('High');
        });

        it('should filter by tags', () => {
            mockedStorage.loadLocalTodos.mockReturnValue([
                createMockTodo({ id: '1', title: 'Work task', tags: ['work'] }),
                createMockTodo({ id: '2', title: 'Home task', tags: ['home'] })
            ]);

            const store = new TodoList();
            store.toggleTagFilter('work');

            expect(store.activeTodos).toHaveLength(1);
            expect(store.activeTodos[0].title).toBe('Work task');
        });
    });

    describe('Stats', () => {
        it('should calculate correct stats', () => {
            mockedStorage.loadLocalTodos.mockReturnValue([
                createMockTodo({ id: '1', title: 'T1', is_completed: true, accumulated_time: 1000 }),
                createMockTodo({ id: '2', title: 'T2', is_completed: false, accumulated_time: 2000 })
            ]);

            const store = new TodoList();
            const stats = store.stats;

            expect(stats.totalTasks).toBe(2);
            expect(stats.completedTasks).toBe(1);
            expect(stats.activeTasks).toBe(1);
            expect(stats.totalTimeMs).toBe(3000);
        });
    });

    describe('Persistence', () => {
        it('should batch save to storage', () => {
            const store = new TodoList();

            store.add({ title: 'Task 1', listId: 'default' });
            expect(mockedStorage.saveLocalTodos).not.toHaveBeenCalled();

            // Advance time to trigger batched save (TodoList uses 500ms)
            vi.advanceTimersByTime(600);
            expect(mockedStorage.saveLocalTodos).toHaveBeenCalledTimes(1);
        });
    });

    describe('Tag Management', () => {
        it('should add tags and persist them', () => {
            const store = new TodoList();
            store.addTag('new-tag');

            expect(store.availableTags).toContain('new-tag');
            expect(mockedStorage.saveTags).toHaveBeenCalledWith(expect.arrayContaining(['new-tag']));
        });

        it('should remove tags from tasks when deleted', () => {
            mockedStorage.loadLocalTodos.mockReturnValue([
                createMockTodo({ id: '1', title: 'Task 1', tags: ['work', 'urgent'] })
            ]);

            const store = new TodoList();
            store.deleteTag('urgent');

            expect(store.all[0].tags).toEqual(['work']);
            expect(store.availableTags).not.toContain('urgent');
        });
    });
});
