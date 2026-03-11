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
 * Result type for individual item processing in sync operations.
 * Returned by each promise to enable atomic updates after all complete.
 */
type ItemProcessResult =
    | { type: 'delete'; id: string; success: boolean; error?: string }
    | { type: 'create'; id: string; success: boolean; data?: Partial<TodoLocal>; error?: string }
    | { type: 'update'; id: string; success: boolean; data?: Partial<TodoLocal>; error?: string };

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
    // Local Storage Helpers
    // =========================================================================

    /**
     * Generic helper to load data from localStorage with error handling.
     * Eliminates code duplication across load methods.
     */
    private _loadFromStorage<T>(key: string, defaultValue: T, merge = false): T {
        try {
            const json = localStorage.getItem(key);
            if (!json) return defaultValue;
            const parsed = JSON.parse(json);
            return merge && typeof defaultValue === 'object' && defaultValue !== null
                ? { ...defaultValue, ...parsed }
                : parsed;
        } catch (e) {
            console.error(`Failed to load ${key} from localStorage`, e);
            return defaultValue;
        }
    }

    /**
     * Generic helper to save data to localStorage with error handling.
     */
    private _saveToStorage(key: string, value: unknown): void {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.error(`Failed to save ${key} to localStorage`, e);
        }
    }

    // =========================================================================
    // Local Storage Public API
    // =========================================================================

    loadLocalTodos(): TodoLocal[] {
        return this._loadFromStorage<TodoLocal[]>(LOCAL_STORAGE_KEYS.TODOS, []);
    }

    saveLocalTodos(todos: TodoLocal[]): void {
        this._saveToStorage(LOCAL_STORAGE_KEYS.TODOS, todos);
    }

    loadFilters(): FilterState {
        return this._loadFromStorage<FilterState>(LOCAL_STORAGE_KEYS.FILTERS, { ...DEFAULT_FILTERS }, true);
    }

    saveFilters(filters: FilterState): void {
        this._saveToStorage(LOCAL_STORAGE_KEYS.FILTERS, filters);
    }

    loadPreferences(): UserPreferences {
        return this._loadFromStorage<UserPreferences>(LOCAL_STORAGE_KEYS.PREFERENCES, { ...DEFAULT_PREFERENCES }, true);
    }

    savePreferences(prefs: UserPreferences): void {
        this._saveToStorage(LOCAL_STORAGE_KEYS.PREFERENCES, prefs);
    }

    loadTags(): string[] {
        return this._loadFromStorage<string[]>(LOCAL_STORAGE_KEYS.TAGS, []);
    }

    saveTags(tags: string[]): void {
        this._saveToStorage(LOCAL_STORAGE_KEYS.TAGS, tags);
    }

    loadLists(): List[] {
        return this._loadFromStorage<List[]>(LOCAL_STORAGE_KEYS.LISTS, []);
    }

    saveLists(lists: List[]): void {
        this._saveToStorage(LOCAL_STORAGE_KEYS.LISTS, lists);
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



    /**
     * Process dirty items using immutable pattern.
     * Each promise returns an ItemProcessResult, and updates are applied atomically after completion.
     * This prevents race conditions from concurrent array mutations.
     */
    private async processDirtyItems(list: TodoLocal[]): Promise<{ updatedList: TodoLocal[], processErrors: string[] }> {
        const errors: string[] = [];
        const dirtyItems = list.filter((t) => t._dirty || t._new || t._deleted);

        // Each promise returns a result object instead of mutating shared state
        const results = await Promise.allSettled(
            dirtyItems.map(async (item): Promise<ItemProcessResult> => {
                if (item._deleted) {
                    if (!item._new) {
                        const { error } = await deleteTodo(item.id);
                        if (error) {
                            console.error(`Failed to delete todo ${item.id}`, error);
                            return { type: 'delete', id: item.id, success: false, error: `Failed to delete "${item.title}"` };
                        }
                    }
                    return { type: 'delete', id: item.id, success: true };
                } else if (item._new) {
                    const { _dirty, _deleted, _new, _syncError, list_id, ...rest } = item;
                    const insertData = { ...rest, listId: list_id ?? 'default' };
                    const { data, error } = await createTodo(insertData as TodoCreateInput);

                    if (error) {
                        console.error(`Failed to create todo ${item.title}`, error);
                        return { type: 'create', id: item.id, success: false, error: `Failed to sync newly created "${item.title}"`, data: { _syncError: error.message } };
                    }
                    return { type: 'create', id: item.id, success: true, data: { ...data, _dirty: false, _new: false, _syncError: null } };
                } else if (item._dirty) {
                    const { _dirty, _deleted, _new, _syncError, ...updateData } = item;
                    const { data, error } = await updateTodo(item.id, updateData);

                    if (error) {
                        console.error(`Failed to update todo ${item.title}`, error);
                        return { type: 'update', id: item.id, success: false, error: `Failed to save changes for "${item.title}"`, data: { _syncError: error.message } };
                    }
                    return { type: 'update', id: item.id, success: true, data: { ...data, _dirty: false, _syncError: null } };
                }
                // Fallback (shouldn't happen since we filtered for dirty items)
                return { type: 'update', id: item.id, success: true };
            })
        );

        // Build update map from results (immutable - no concurrent mutation)
        const updateMap = new Map<string, Partial<TodoLocal>>();
        const deleteSet = new Set<string>();

        for (const result of results) {
            if (result.status === 'rejected') {
                errors.push(`Unexpected error: ${result.reason}`);
                continue;
            }
            const value = result.value;
            if (!value.success && value.error) {
                errors.push(value.error);
            }
            if (value.type === 'delete' && value.success) {
                deleteSet.add(value.id);
            } else if (value.type !== 'delete' && value.data) {
                updateMap.set(value.id, value.data);
            }
        }

        // Apply all updates atomically in a single pass
        const updatedList = list
            .filter((t) => !deleteSet.has(t.id))
            .map((t) => {
                const update = updateMap.get(t.id);
                return update ? { ...t, ...update } : t;
            });

        return { updatedList, processErrors: errors };
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
