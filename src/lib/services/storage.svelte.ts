/**
 * Storage Service: Handles persistence of application data to local storage and coordinates synchronization with Supabase.
 */
import type { TodoLocal, Todo, TodoCreateInput, FilterState, UserPreferences } from "../types";
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
    isSyncing = $state(false);
    lastError = $state<string | null>(null);
    lastSyncTime = $state<number>(0);

    constructor() {
        this.lastSyncTime = Number(
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

        for (const item of dirtyItems) {
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
                    const { _dirty, _deleted, _new, _syncError, ...insertData } = item;
                    const { data, error } = await createTodo(insertData as TodoCreateInput);

                    if (error) {
                        console.error(`Failed to create todo ${item.title}`, error);
                        item._syncError = error.message;
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
                        item._syncError = error.message;
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
        }

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
