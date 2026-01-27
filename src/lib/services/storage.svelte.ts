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
        const errors: string[] = [];

        try {
            // 1. Process local modifications (Dirty Items)
            // -----------------------------------------------------------------
            const dirtyItems = workingList.filter((t) => t._dirty || t._new || t._deleted);

            for (const item of dirtyItems) {
                // DELETE
                if (item._deleted) {
                    // If it was never synced (isNew), just ignore it locally (store handles removal)
                    // If it has an ID and not new, delete from API
                    if (!item._new) {
                        const { error } = await deleteTodo(item.id);
                        if (error) {
                            console.error(`Failed to delete todo ${item.id}`, error);
                            errors.push(`Failed to delete "${item.title}"`);
                        }
                    }
                    // We remove it from the returning list effectively by filtering later
                    // But in the "workingList" it's still there until the caller removes it based on result or we remove it here?
                    // The caller (Store) usually filters out _deleted items from the UI, but here we are syncing data.
                    // If successfully deleted from server, we can drop it from local storage too.
                }
                // CREATE
                else if (item._new) {
                    const { _dirty, _deleted, _new, _syncError, ...insertData } = item;
                    // Supabase create expects Insert payload, which matches Todo minus system fields
                    // We need to ensure we don't send extra fields if type mismatch
                    const { data, error } = await createTodo(
                        insertData as TodoCreateInput
                    );

                    if (error) {
                        console.error(`Failed to create todo ${item.title}`, error);
                        item._syncError = error.message;
                        errors.push(`Failed to compare "${item.title}"`);
                    } else if (data) {
                        // Update local item with server data (id might be same but good to confirm)
                        // Mark clean
                        const idx = workingList.findIndex(t => t.id === item.id);
                        if (idx !== -1) {
                            workingList[idx] = {
                                ...workingList[idx],
                                ...data,
                                _dirty: false,
                                _new: false,
                                _syncError: null,
                            };
                        }
                    }
                }
                // UPDATE
                else if (item._dirty) {
                    const { _dirty, _deleted, _new, _syncError, ...updateData } = item;
                    const { data, error } = await updateTodo(item.id, updateData);

                    if (error) {
                        console.error(`Failed to update todo ${item.title}`, error);
                        item._syncError = error.message;
                        errors.push(`Failed to save "${item.title}"`);
                    } else if (data) {
                        const idx = workingList.findIndex(t => t.id === item.id);
                        if (idx !== -1) {
                            workingList[idx] = {
                                ...workingList[idx],
                                ...data,
                                _dirty: false,
                                _syncError: null,
                            };
                        }
                    }
                }
            }

            // 2. Fetch latest from Server
            // -----------------------------------------------------------------
            const { data: serverTodos, error: fetchError } = await fetchTodos(userId);
            if (fetchError) {
                throw new Error(fetchError.message);
            }

            if (serverTodos) {
                // Merge Strategy: Server Wins for non-dirty items.
                // If we have a dirty item locally, we keep it (Optimistic UI assumptions), 
                // effectively "Last Write Wins" locally until next sync pushes it.
                // But if the server has an item we don't have, we add it.
                // If the server lacks an item we have (and we didn't just create it), it means it was deleted on another device.

                // Create a map of server todos
                const serverMap = new Map(serverTodos.map(t => [t.id, t]));
                const localMap = new Map(workingList.map(t => [t.id, t]));

                const merged: TodoLocal[] = [];

                // A. Process Server Items
                for (const serverItem of serverTodos) {
                    const localItem = localMap.get(serverItem.id);

                    if (localItem) {
                        // Conflict: We have it, Server has it.
                        if (localItem._dirty) {
                            // KEEP LOCAL (Push next time)
                            merged.push(localItem);
                        } else {
                            // ACCEPT SERVER
                            // We preserve local meta flags just in case, though they should be clean
                            merged.push({
                                ...serverItem,
                                _dirty: false,
                                _new: false,
                                _deleted: false,
                                _syncError: null,
                            });
                        }
                        localMap.delete(serverItem.id); // Mark handled
                    } else {
                        // New from Server
                        // Unless we just deleted it locally and waiting to push delete? 
                        // If we deleted it, isDeleted would be true in localMap (which we iterate next)
                        // If it's not in localMap at all, it's new from server.
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
                        // Keep new items not yet synced
                        merged.push(localItem);
                    } else if (localItem._deleted) {
                        // Keep deleted items until they are successfully removed from server (handled in step 1)
                        // If step 1 failed, they stay deleted and dirty.
                        merged.push(localItem);
                    } else if (localItem._dirty) {
                        // Dirty but not on server? 
                        // Check if it's because it was deleted on server?
                        // If it has an ID (not new) and not on server, it was deleted remotely.
                        // BUT we have local changes.
                        // "Resurrection" vs "Delete Wins".
                        // Usually Delete Wins, but if I edited it, I might want to keep it.
                        // Use case: I edit offline. Someone deletes online.
                        // Simplest: If not on server and not _new, treat as deleted remotely -> remove.
                        // UNLESS we want to support "Undelete via Edit".
                        // Let's drop it to respect remote delete.
                        console.warn(`Item ${localItem.title} (${id}) exists locally but not on server. Assuming remote delete.`);
                    } else {
                        // Clean item locally, not on server -> Remote Delete
                        // Drop it.
                    }
                }

                workingList = merged;
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
}

export const storageService = new StorageService();
