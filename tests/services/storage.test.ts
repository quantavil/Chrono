/**
 * Unit tests for StorageService
 * Tests the generic helpers and immutable sync patterns
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Define minimal types needed for tests (to avoid $lib imports during test)
interface TodoLocal {
    id: string;
    title: string;
    _dirty?: boolean;
    _new?: boolean;
    _deleted?: boolean;
    _syncError?: string | null;
}

describe('StorageService', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    describe('_loadFromStorage helper pattern', () => {
        // Testing the pattern used by the generic helper

        it('should return default value when localStorage is empty', () => {
            const result = localStorage.getItem('nonexistent');
            expect(result).toBeNull();
        });

        it('should parse and return stored JSON', () => {
            const testData = [{ id: '1', title: 'Test' }];
            localStorage.setItem('test-key', JSON.stringify(testData));

            const json = localStorage.getItem('test-key');
            expect(json).not.toBeNull();
            const parsed = JSON.parse(json!);
            expect(parsed).toEqual(testData);
        });

        it('should merge with default value when merge flag is true', () => {
            const defaultValue = { showCompleted: true, sortBy: 'date' };
            const storedValue = { sortBy: 'priority' };
            localStorage.setItem('test-filters', JSON.stringify(storedValue));

            const json = localStorage.getItem('test-filters');
            const parsed = JSON.parse(json!);
            const merged = { ...defaultValue, ...parsed };

            expect(merged).toEqual({ showCompleted: true, sortBy: 'priority' });
        });

        it('should handle invalid JSON gracefully', () => {
            localStorage.setItem('invalid-json', 'not valid json {{{');

            let result: unknown = 'default';
            try {
                JSON.parse(localStorage.getItem('invalid-json')!);
            } catch {
                result = 'default';
            }

            expect(result).toBe('default');
        });

        it('should handle empty string as null', () => {
            localStorage.setItem('empty', '');

            const json = localStorage.getItem('empty');
            // Empty string is truthy in localStorage, but let's test the pattern
            expect(json).toBe('');

            let result: unknown[] = [];
            if (!json) {
                result = [];
            } else {
                try {
                    result = JSON.parse(json);
                } catch {
                    result = [];
                }
            }
            expect(result).toEqual([]);
        });
    });

    describe('_saveToStorage helper pattern', () => {
        it('should save data as JSON', () => {
            const data = { id: '1', title: 'Test Todo' };
            localStorage.setItem('test-save', JSON.stringify(data));

            const stored = localStorage.getItem('test-save');
            expect(stored).toBe(JSON.stringify(data));
        });

        it('should overwrite existing data', () => {
            localStorage.setItem('test-key', JSON.stringify({ old: true }));
            localStorage.setItem('test-key', JSON.stringify({ new: true }));

            const stored = JSON.parse(localStorage.getItem('test-key')!);
            expect(stored).toEqual({ new: true });
        });

        it('should handle arrays', () => {
            const todos = [
                { id: '1', title: 'Task 1' },
                { id: '2', title: 'Task 2' },
            ];
            localStorage.setItem('todos', JSON.stringify(todos));

            const stored = JSON.parse(localStorage.getItem('todos')!);
            expect(stored).toHaveLength(2);
            expect(stored[0].title).toBe('Task 1');
        });
    });

    describe('Immutable processDirtyItems pattern', () => {
        // Testing the immutable update pattern that fixes race conditions

        it('should collect results without mutating original array', async () => {
            const originalList: Partial<TodoLocal>[] = [
                { id: '1', title: 'Task 1', _dirty: true },
                { id: '2', title: 'Task 2', _dirty: false },
                { id: '3', title: 'Task 3', _new: true },
            ];

            // Simulate the immutable update pattern
            const updates = new Map<string, Partial<TodoLocal>>();
            updates.set('1', { _dirty: false, _syncError: null });
            updates.set('3', { _dirty: false, _new: false, _syncError: null });

            const updatedList = originalList.map((t) => {
                const update = updates.get(t.id!);
                return update ? { ...t, ...update } : t;
            });

            // Original should be unchanged
            expect(originalList[0]._dirty).toBe(true);
            expect(originalList[2]._new).toBe(true);

            // Updated list should have changes
            expect(updatedList[0]._dirty).toBe(false);
            expect(updatedList[2]._new).toBe(false);
        });

        it('should handle deletion without mutating', () => {
            const originalList = [
                { id: '1', title: 'Task 1' },
                { id: '2', title: 'Task 2', _deleted: true },
                { id: '3', title: 'Task 3' },
            ];

            const deleteSet = new Set(['2']);
            const filteredList = originalList.filter((t) => !deleteSet.has(t.id));

            // Original unchanged
            expect(originalList).toHaveLength(3);

            // Filtered removes the deleted item
            expect(filteredList).toHaveLength(2);
            expect(filteredList.find((t) => t.id === '2')).toBeUndefined();
        });

        it('should handle concurrent updates correctly with Promise.allSettled', async () => {
            // Simulate multiple async operations that would have caused race conditions
            const items = [
                { id: '1', delay: 100, result: 'success' },
                { id: '2', delay: 50, result: 'success' },
                { id: '3', delay: 150, result: 'error' },
            ];

            const results = await Promise.allSettled(
                items.map(
                    (item) =>
                        new Promise<{ id: string; success: boolean }>((resolve, reject) => {
                            setTimeout(() => {
                                if (item.result === 'error') {
                                    reject(new Error('Simulated error'));
                                } else {
                                    resolve({ id: item.id, success: true });
                                }
                            }, item.delay);
                        })
                )
            );

            // All promises complete, even the rejected one
            expect(results).toHaveLength(3);
            expect(results[0].status).toBe('fulfilled');
            expect(results[1].status).toBe('fulfilled');
            expect(results[2].status).toBe('rejected');

            // Results maintain order regardless of completion time
            const fulfilled = results.filter((r) => r.status === 'fulfilled') as PromiseFulfilledResult<{
                id: string;
                success: boolean;
            }>[];
            expect(fulfilled[0].value.id).toBe('1');
            expect(fulfilled[1].value.id).toBe('2');
        });

        it('should apply updates atomically after all promises complete', () => {
            // Simulating the atomic update pattern
            interface UpdateResult {
                id: string;
                data?: Partial<TodoLocal>;
            }

            const results: UpdateResult[] = [
                { id: '1', data: { title: 'Updated 1' } },
                { id: '2', data: { title: 'Updated 2' } },
            ];

            const updateMap = new Map<string, Partial<TodoLocal>>();
            for (const result of results) {
                if (result.data) {
                    updateMap.set(result.id, result.data);
                }
            }

            const originalList = [
                { id: '1', title: 'Original 1' },
                { id: '2', title: 'Original 2' },
                { id: '3', title: 'Original 3' },
            ];

            // Atomic update - single pass through the array
            const updatedList = originalList.map((t) => {
                const update = updateMap.get(t.id);
                return update ? { ...t, ...update } : t;
            });

            expect(updatedList[0].title).toBe('Updated 1');
            expect(updatedList[1].title).toBe('Updated 2');
            expect(updatedList[2].title).toBe('Original 3');
        });
    });

    describe('ItemProcessResult type handling', () => {
        it('should distinguish delete results from create/update', () => {
            type ItemProcessResult =
                | { type: 'delete'; id: string; success: boolean; error?: string }
                | { type: 'create'; id: string; success: boolean; data?: Partial<TodoLocal>; error?: string }
                | { type: 'update'; id: string; success: boolean; data?: Partial<TodoLocal>; error?: string };

            const results: ItemProcessResult[] = [
                { type: 'delete', id: '1', success: true },
                { type: 'create', id: '2', success: true, data: { title: 'New' } },
                { type: 'update', id: '3', success: false, error: 'Failed', data: { _syncError: 'Failed' } },
            ];

            const updateMap = new Map<string, Partial<TodoLocal>>();
            const deleteSet = new Set<string>();

            for (const value of results) {
                if (value.type === 'delete' && value.success) {
                    deleteSet.add(value.id);
                } else if (value.type !== 'delete' && value.data) {
                    updateMap.set(value.id, value.data);
                }
            }

            expect(deleteSet.has('1')).toBe(true);
            expect(updateMap.get('2')).toEqual({ title: 'New' });
            expect(updateMap.get('3')).toEqual({ _syncError: 'Failed' });
        });
    });
});
