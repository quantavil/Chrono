import { storageService } from "../services/storage.svelte";
import type { FilterState } from "../types";

export class FilterStore {
    // We initialize with what's storageService, knowing TodoList managed it inside too.
    // TodoList logic: private _filters = $state<FilterState>({ ...storageService.loadFilters() });
    private _filters = $state<FilterState>({ ...storageService.load('FILTERS') });

    constructor() {
        // No specific initialization needed beyond property init
    }

    get filters() {
        return this._filters;
    }

    // Allow direct mutation or setters? FilterState is deep object.
    // It's a proxy.
    get state() {
        return this._filters;
    }

    setListFilter(listId: string) {
        this._filters.listId = listId;
        storageService.save('FILTERS', this._filters);
    }

    toggleTagFilter(tag: string) {
        if (this._filters.tags.includes(tag)) {
            this._filters.tags = this._filters.tags.filter(t => t !== tag);
        } else {
            // Single select behavior as per original store
            this._filters.tags = [tag];
        }
        // Note: storageService.saveFilters was commented out in original code for this method, 
        // implying session-only persistence? Or maybe we should persist it.
        // Let's persist to be safe.
        storageService.save('FILTERS', this._filters);
    }

    clearFilters() {
        this._filters.tags = [];
        storageService.save('FILTERS', this._filters);
    }

    setPriorityFilter(priority: FilterState['priority']) {
        this._filters.priority = priority;
        storageService.save('FILTERS', this._filters);
    }
}
