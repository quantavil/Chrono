/**
 * Unit tests for FilterStore
 * Verifies filter state management and persistence
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FilterStore } from '../../src/lib/stores/filter.svelte';
import { storageService } from '../../src/lib/services/storage.svelte';
import type { FilterState } from '../../src/lib/types';

// Mock storageService
vi.mock('../../src/lib/services/storage.svelte', () => ({
    storageService: {
        loadFilters: vi.fn(),
        saveFilters: vi.fn(),
    }
}));

const mockedStorage = vi.mocked(storageService);

const defaultFilters: FilterState = {
    tags: [],
    priority: 'all',
    listId: 'default',
    status: 'all',
    hasDueDate: false,
    sortBy: 'position',
    sortOrder: 'asc'
};

describe('FilterStore', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockedStorage.loadFilters.mockReturnValue({ ...defaultFilters });
    });

    it('should initialize with filters from storage', () => {
        const store = new FilterStore();
        expect(store.filters.listId).toBe('default');
    });

    it('should update list filter and persist', () => {
        const store = new FilterStore();
        store.setListFilter('list-123');

        expect(store.filters.listId).toBe('list-123');
        expect(mockedStorage.saveFilters).toHaveBeenCalled();
    });

    it('should toggle tag filter (single-selection behavior)', () => {
        const store = new FilterStore();

        // Add tag
        store.toggleTagFilter('work');
        expect(store.filters.tags).toEqual(['work']);

        // Add another tag (should replace 'work' as per implementation)
        store.toggleTagFilter('home');
        expect(store.filters.tags).toEqual(['home']);

        // Toggle 'home' again (should remove it)
        store.toggleTagFilter('home');
        expect(store.filters.tags).toEqual([]);
    });

    it('should update priority filter', () => {
        const store = new FilterStore();
        store.setPriorityFilter('high');

        expect(store.filters.priority).toBe('high');
        expect(mockedStorage.saveFilters).toHaveBeenCalledWith(expect.objectContaining({ priority: 'high' }));
    });

    it('should clear all filters', () => {
        const store = new FilterStore();
        store.toggleTagFilter('work');
        store.clearFilters();

        expect(store.filters.tags).toHaveLength(0);
    });
});
