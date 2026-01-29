/**
 * Storage Service: Handles persistence of application data to local storage and coordinates synchronization with Supabase.
 */
import type { TodoLocal, Todo, TodoCreateInput, FilterState, UserPreferences, List } from "../types";
import { LOCAL_STORAGE_KEYS, DEFAULT_FILTERS, DEFAULT_PREFERENCES } from "../types";
import {
    fetchTodos,
    createTodo,
    updateTodo,
    deleteTodo,
    isSupabaseConfigured,
} from "../utils/supabase";

/**
 * StorageService
 *
 * Handles persistence to LocalStorage and synchronization with Supabase.
 * Isolates all input/output side effects.
 */
class StorageService {
    // Save state
    private _isSyncing = $state(false);
    private _lastError = $state<string | null>(null);
    private _lastSyncTime = $state<number>(0);

    get isSyncing() { return this._isSyncing; }
    get lastError() { return this._lastError; }
    get lastSyncTime() { return this._lastSyncTime; }

    set isSyncing(v: boolean) { this._isSyncing = v; }
    set lastError(v: string | null) { this._lastError = v; }
    set lastSyncTime(v: number) { this._lastSyncTime = v; }

    constructor() {
        this._lastSyncTime = Number(
            localStorage.getItem(LOCAL_STORAGE_KEYS.LAST_SYNC) || 0
        );
    }

    // =========================================================================
    // Local Storage
    // =========================================================================

    loadLocalTodos(): TodoLocal[] {
        try {
            const json = localStorage.getItem(LOCAL_STORAGE_KEYS.TODOS);
            if (!json) return [];
            return JSON.parse(json);
        } catch (e) {
            console.error("Failed to load todos from local storage", e);
            return [];
        }
    }

    saveLocalTodos(todos: TodoLocal[]): void {
        try {
            localStorage.setItem(LOCAL_STORAGE_KEYS.TODOS, JSON.stringify(todos));
        } catch (e) {
            console.error("Failed to save todos to local storage", e);
        }
    }

    loadFilters(): FilterState {
        try {
            const json = localStorage.getItem(LOCAL_STORAGE_KEYS.FILTERS);
            if (!json) return { ...DEFAULT_FILTERS };
            return { ...DEFAULT_FILTERS, ...JSON.parse(json) };
        } catch (e) {
            return { ...DEFAULT_FILTERS };
        }
    }

    saveFilters(filters: FilterState): void {
        try {
            localStorage.setItem(LOCAL_STORAGE_KEYS.FILTERS, JSON.stringify(filters));
        } catch (e) {
            console.error("Failed to save filters", e);
        }
    }

    loadPreferences(): UserPreferences {
        try {
            const json = localStorage.getItem(LOCAL_STORAGE_KEYS.PREFERENCES);
            if (!json) return { ...DEFAULT_PREFERENCES };
            return { ...DEFAULT_PREFERENCES, ...JSON.parse(json) };
        } catch (e) {
            return { ...DEFAULT_PREFERENCES };
        }
    }

    savePreferences(prefs: UserPreferences): void {
        try {
            localStorage.setItem(LOCAL_STORAGE_KEYS.PREFERENCES, JSON.stringify(prefs));
        } catch (e) {
            console.error("Failed to save preferences", e);
        }
    }

    loadTags(): string[] {
        try {
            const json = localStorage.getItem(LOCAL_STORAGE_KEYS.TAGS);
            if (!json) return [];
            return JSON.parse(json);
        } catch (e) {
            console.error("Failed to load tags", e);
            return [];
        }
    }

    saveTags(tags: string[]): void {
        try {
            localStorage.setItem(LOCAL_STORAGE_KEYS.TAGS, JSON.stringify(tags));
        } catch (e) {
            console.error("Failed to save tags", e);
        }
    }

    loadLists(): List[] {
        try {
            const json = localStorage.getItem(LOCAL_STORAGE_KEYS.LISTS);
            if (!json) return [];
            return JSON.parse(json);
        } catch (e) {
            console.error("Failed to load lists", e);
            return [];
        }
    }

    saveLists(lists: List[]): void {
        try {
            localStorage.setItem(LOCAL_STORAGE_KEYS.LISTS, JSON.stringify(lists));
        } catch (e) {
            console.error("Failed to save lists", e);
        }
    }

    // =========================================================================
    // Synchronization
    // =========================================================================

    /**
     * Synchronizes a list of Todos with the remote database.
     * Returns the updated list of Todos (merged with remote changes).
     */
    async sync(
        userId: string,
        networkTodos: TodoLocal[]
    ): Promise<{
        updatedTodos: TodoLocal[];
        error: string | null;
    }> {
        if (!isSupabaseConfigured()) {
            return { updatedTodos: networkTodos, error: null };
        }

        // Fix: Concurrency Guard
        if (this.isSyncing) {
            return { updatedTodos: networkTodos, error: null };
        }

        this.isSyncing = true;
        this.lastError = null;

        let workingList = [...networkTodos];
        let errors: string[] = [];

        try {
            // 1. Process local modifications (Dirty Items)
            const { updatedList, processErrors } = await this.processDirtyItems(workingList);
            workingList = updatedList;
            errors = [...errors, ...processErrors];

            // 2. Fetch latest from Server
            const { data: serverTodos, error: fetchError } = await fetchTodos(userId);
            if (fetchError) {
                throw new Error(fetchError.message);
            }

            if (serverTodos) {
                // 3. Merge Strategy
                workingList = this.mergeWithServer(workingList, serverTodos);
            }

            this.lastSyncTime = Date.now();
            localStorage.setItem(LOCAL_STORAGE_KEYS.LAST_SYNC, String(this.lastSyncTime));

        } catch (err: any) {
            console.error("Sync failed", err);
            this.lastError = err.message || "Unknown sync error";
            errors.push(this.lastError!);
        } finally {
            this.isSyncing = false;
        }

        return {
            updatedTodos: workingList,
            error: errors.length > 0 ? errors.join(", ") : null,
        };
    }

    private async processDirtyItems(list: TodoLocal[]): Promise<{ updatedList: TodoLocal[], processErrors: string[] }> {
        const workingList = [...list];
        const errors: string[] = [];
        const dirtyItems = workingList.filter((t) => t._dirty || t._new || t._deleted);

        // Optimization: Parallelize processing
        await Promise.all(dirtyItems.map(async (item) => {
            try {
                if (item._deleted) {
                    if (!item._new) {
                        const { error } = await deleteTodo(item.id);
                        if (error) {
                            console.error(`Failed to delete todo ${item.id}`, error);
                            errors.push(`Failed to delete "${item.title}"`);
                        }
                    }
                } else if (item._new) {
                    const { _dirty, _deleted, _new, _syncError, list_id, ...rest } = item;
                    const insertData = { ...rest, listId: list_id ?? 'default' };
                    const { data, error } = await createTodo(insertData as TodoCreateInput);

                    if (error) {
                        console.error(`Failed to create todo ${item.title}`, error);
                        // We modify the item in workingList, but we need to find it again?
                        // Since `item` is a reference to an object in `workingList` (shallow copy of array, but objects are refs if not cloned?)
                        // Wait, `workingList = [...list]` creates a new array, but elements are shared references?
                        // `processDirtyItems` takes `list` (from `sync` which did `[...networkTodos]`).
                        // Objects are references. `item` is a reference.
                        // Wait, `processDirtyItems` iterates `dirtyItems`.
                        // IF `item` is a direct reference to an object in `workingList`, modifying `item` modifies `workingList`!
                        // BUT, earlier code did: `workingList[idx] = { ...workingList[idx], ...data }`
                        // This implies it replaces the object reference in the array with a new one.
                        // So I must do the same.

                        // Since we are inside map, finding index is safe.
                        const idx = workingList.findIndex(t => t.id === item.id);
                        if (idx !== -1) {
                            workingList[idx] = { ...workingList[idx], _syncError: error.message };
                        }
                        errors.push(`Failed to sync newly created "${item.title}"`);
                    } else if (data) {
                        const idx = workingList.findIndex(t => t.id === item.id);
                        if (idx !== -1) {
                            workingList[idx] = { ...workingList[idx], ...data, _dirty: false, _new: false, _syncError: null };
                        }
                    }
                } else if (item._dirty) {
                    const { _dirty, _deleted, _new, _syncError, ...updateData } = item;
                    const { data, error } = await updateTodo(item.id, updateData);

                    if (error) {
                        console.error(`Failed to update todo ${item.title}`, error);
                        const idx = workingList.findIndex(t => t.id === item.id);
                        if (idx !== -1) {
                            workingList[idx] = { ...workingList[idx], _syncError: error.message };
                        }
                        errors.push(`Failed to save changes for "${item.title}"`);
                    } else if (data) {
                        const idx = workingList.findIndex(t => t.id === item.id);
                        if (idx !== -1) {
                            workingList[idx] = { ...workingList[idx], ...data, _dirty: false, _syncError: null };
                        }
                    }
                }
            } catch (err) {
                console.error(`Unexpected error processing item ${item.id}`, err);
                errors.push(`Error processing "${item.title}"`);
            }
        }));

        return { updatedList: workingList, processErrors: errors };
    }

    private mergeWithServer(localTodos: TodoLocal[], serverTodos: Todo[]): TodoLocal[] {
        const serverMap = new Map(serverTodos.map(t => [t.id, t]));
        const localMap = new Map(localTodos.map(t => [t.id, t]));
        const merged: TodoLocal[] = [];

        // A. Process Server Items
        for (const serverItem of serverTodos) {
            const localItem = localMap.get(serverItem.id);

            if (localItem) {
                if (localItem._dirty || localItem._deleted) {
                    // Locally modified wins for now (will push next sync)
                    merged.push(localItem);
                } else {
                    // Accepts server version (clean)
                    merged.push({
                        ...serverItem,
                        _dirty: false,
                        _new: false,
                        _deleted: false,
                        _syncError: null,
                    });
                }
                localMap.delete(serverItem.id);
            } else {
                // New from Server
                merged.push({
                    ...serverItem,
                    _dirty: false,
                    _new: false,
                    _deleted: false,
                    _syncError: null,
                });
            }
        }

        // B. Process Remaining Local Items
        for (const [id, localItem] of localMap) {
            if (localItem._new) {
                merged.push(localItem);
            } else if (localItem._deleted) {
                // If it was supposed to be deleted but step 1 failed, keep it here
                merged.push(localItem);
            } else if (localItem._dirty) {
                // Item exists locally and is dirty but not on server? 
                // Treat as remote delete but we have local edits. 
                // For simplicity, we respect remote delete unless it's a new item.
                console.warn(`Item ${localItem.title} (${id}) missing from server. Assuming remote delete.`);
            }
            // Clean local items not on server are dropped (remote delete)
        }

        return merged;
    }
}

export const storageService = new StorageService();
