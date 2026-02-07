/**
 * Unit tests for DisplayEngine grouping and sorting logic
 */
import { describe, it, expect, beforeEach } from 'vitest';
import type { Priority, SortBy, SortOrder, GroupBy } from '../../src/lib/types';
import { PRIORITY_CONFIG } from '../../src/lib/types';

// Mock TodoModel for testing
interface MockTodo {
    id: string;
    title: string;
    position: number;
    priority: Priority | null;
    dueAt: string | null;
    isCompleted: boolean;
}

// Test utility functions that mirror DisplayEngine logic
const createSortFn = (sortBy: SortBy, sortOrder: SortOrder) => {
    return (a: MockTodo, b: MockTodo): number => {
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
};

const groupByPriority = (todos: MockTodo[]): Record<string, MockTodo[]> => {
    const groups: Record<string, MockTodo[]> = {
        high: [], medium: [], low: [], none: [],
    };
    todos.forEach(t => {
        const p = t.priority || 'none';
        if (groups[p]) groups[p].push(t);
    });
    return groups;
};

describe('DisplayEngine Logic', () => {
    let mockTodos: MockTodo[];

    beforeEach(() => {
        mockTodos = [
            { id: '1', title: 'Alpha task', position: 2, priority: 'low', dueAt: '2026-02-10', isCompleted: false },
            { id: '2', title: 'Beta task', position: 0, priority: 'high', dueAt: '2026-02-08', isCompleted: false },
            { id: '3', title: 'Gamma task', position: 1, priority: 'medium', dueAt: null, isCompleted: false },
            { id: '4', title: 'Delta task', position: 3, priority: null, dueAt: '2026-02-09', isCompleted: false },
        ];
    });

    describe('Sorting', () => {
        it('should sort by position ascending', () => {
            const sorted = [...mockTodos].sort(createSortFn('position', 'asc'));

            expect(sorted[0].title).toBe('Beta task');
            expect(sorted[1].title).toBe('Gamma task');
            expect(sorted[2].title).toBe('Alpha task');
            expect(sorted[3].title).toBe('Delta task');
        });

        it('should sort by position descending', () => {
            const sorted = [...mockTodos].sort(createSortFn('position', 'desc'));

            expect(sorted[0].title).toBe('Delta task');
            expect(sorted[3].title).toBe('Beta task');
        });

        it('should sort by priority ascending (high first)', () => {
            const sorted = [...mockTodos].sort(createSortFn('priority', 'asc'));

            expect(sorted[0].priority).toBe('high');
            expect(sorted[1].priority).toBe('medium');
            expect(sorted[2].priority).toBe('low');
            expect(sorted[3].priority).toBe(null); // none
        });

        it('should sort by priority descending (none first)', () => {
            const sorted = [...mockTodos].sort(createSortFn('priority', 'desc'));

            expect(sorted[0].priority).toBe(null); // none
            expect(sorted[3].priority).toBe('high');
        });

        it('should sort by date ascending (earliest first)', () => {
            const sorted = [...mockTodos].sort(createSortFn('date', 'asc'));

            expect(sorted[0].dueAt).toBe('2026-02-08');
            expect(sorted[1].dueAt).toBe('2026-02-09');
            expect(sorted[2].dueAt).toBe('2026-02-10');
            expect(sorted[3].dueAt).toBe(null); // No date goes to end
        });

        it('should sort alphabetically ascending', () => {
            const sorted = [...mockTodos].sort(createSortFn('alphabetical', 'asc'));

            expect(sorted[0].title).toBe('Alpha task');
            expect(sorted[1].title).toBe('Beta task');
            expect(sorted[2].title).toBe('Delta task');
            expect(sorted[3].title).toBe('Gamma task');
        });
    });

    describe('Grouping by Priority', () => {
        it('should group tasks by priority', () => {
            const groups = groupByPriority(mockTodos);

            expect(groups.high.length).toBe(1);
            expect(groups.medium.length).toBe(1);
            expect(groups.low.length).toBe(1);
            expect(groups.none.length).toBe(1);
        });

        it('should handle all tasks with same priority', () => {
            const samePriority = mockTodos.map(t => ({ ...t, priority: 'high' as Priority }));
            const groups = groupByPriority(samePriority);

            expect(groups.high.length).toBe(4);
            expect(groups.medium.length).toBe(0);
        });

        it('should handle tasks with null priority as none', () => {
            const groups = groupByPriority([{ id: '1', title: 'Test', position: 0, priority: null, dueAt: null, isCompleted: false }]);

            expect(groups.none.length).toBe(1);
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty todo list', () => {
            const sorted = [].sort(createSortFn('position', 'asc'));
            expect(sorted.length).toBe(0);

            const groups = groupByPriority([]);
            expect(groups.high.length).toBe(0);
        });

        it('should handle single todo', () => {
            const single = [mockTodos[0]];
            const sorted = single.sort(createSortFn('position', 'asc'));

            expect(sorted.length).toBe(1);
            expect(sorted[0].id).toBe('1');
        });

        it('should maintain stable sort for equal values', () => {
            const samePriority: MockTodo[] = [
                { id: '1', title: 'First', position: 0, priority: 'high', dueAt: null, isCompleted: false },
                { id: '2', title: 'Second', position: 1, priority: 'high', dueAt: null, isCompleted: false },
            ];

            const sorted = samePriority.sort(createSortFn('priority', 'asc'));

            // Same priority, should maintain original order
            expect(sorted[0].title).toBe('First');
            expect(sorted[1].title).toBe('Second');
        });
    });
});
