/**
 * SyncCoordinator: Handles Supabase sync operations and realtime subscriptions.
 */
import type { TodoLocal, Todo } from "../types";
import { storageService } from "../services/storage.svelte";
import { isSupabaseConfigured, subscribeTodoChanges } from "../utils/supabase";
import { toastManager } from "./toast.svelte";
import type { TodoModel } from "../models/Todo.svelte";

type RealtimePayload = {
    eventType: string;
    old: Todo | null;
    new: Todo | null;
};

export class SyncCoordinator {
    private _userId = $state<string | null>(null);
    private _unsubscribeRealtime: (() => void) | null = null;

    // Callbacks for TodoList integration
    private _getItems: () => TodoModel[];
    private _setItems: (updater: (items: TodoModel[]) => TodoModel[]) => void;
    private _createModel: (data: TodoLocal) => TodoModel;
    private _save: () => void;

    constructor(options: {
        getItems: () => TodoModel[];
        setItems: (updater: (items: TodoModel[]) => TodoModel[]) => void;
        createModel: (data: TodoLocal) => TodoModel;
        save: () => void;
    }) {
        this._getItems = options.getItems;
        this._setItems = options.setItems;
        this._createModel = options.createModel;
        this._save = options.save;
    }

    get userId(): string | null {
        return this._userId;
    }

    get isSyncing(): boolean {
        return storageService.isSyncing;
    }

    get lastError(): string | null {
        return storageService.lastError;
    }

    /**
     * Set the current user and initiate sync + realtime subscription.
     */
    async setUser(userId: string | null): Promise<void> {
        this._userId = userId;

        // Update all items with the new userId
        const items = this._getItems();
        items.forEach(t => (t.userId = userId));
        this._save();

        if (userId && isSupabaseConfigured()) {
            await this.performSync();
            this._subscribeToRealtime(userId);
        } else {
            this._unsubscribeFromRealtime();
        }
    }

    /**
     * Force a sync with the server.
     */
    async forceSync(): Promise<void> {
        if (this._userId && isSupabaseConfigured()) {
            await this.performSync();
        }
    }

    /**
     * Perform sync operation with server.
     */
    async performSync(): Promise<void> {
        if (!this._userId) return;

        const items = this._getItems();
        const snapshot = items.map(t => t.toLocal());
        const { updatedTodos, error } = await storageService.sync(this._userId, snapshot);

        if (updatedTodos) {
            const newIds = new Set(updatedTodos.map(t => t.id));

            this._setItems((currentItems) => {
                // Build updated list immutably
                const result: TodoModel[] = [];

                // Add existing items that were updated
                currentItems.forEach(item => {
                    if (!newIds.has(item.id)) return; // Skip items no longer on server

                    const dto = updatedTodos.find(t => t.id === item.id);
                    if (dto) {
                        item.applyUpdate(dto);
                    }
                    result.push(item);
                });

                // Add new items from server
                updatedTodos.forEach(dto => {
                    if (!currentItems.some(t => t.id === dto.id)) {
                        result.push(this._createModel(dto));
                    }
                });

                return result;
            });

            this._save();
        }

        if (error) {
            toastManager.error("Sync partial failure: " + error);
        }
    }

    /**
     * Handle realtime database changes.
     */
    handleRealtimeChange(payload: RealtimePayload): void {
        const { eventType, new: newRec, old: oldRec } = payload;

        if (eventType === "INSERT" && newRec) {
            const items = this._getItems();
            const existing = items.find(t => t.id === newRec.id && !t._deleted);

            if (!existing) {
                this._setItems((currentItems) => [
                    ...currentItems,
                    this._createModel(newRec as TodoLocal),
                ]);
                this._save();
            } else if (existing._new) {
                existing._new = false;
                existing._dirty = false;
                existing._syncError = null;
                this._save();
            }
        } else if (eventType === "UPDATE" && newRec) {
            const items = this._getItems();
            const existing = items.find(t => t.id === newRec.id && !t._deleted);

            if (existing && !existing._dirty) {
                existing.applyUpdate(newRec);
                this._save();
            }
            // If dirty, local changes take precedence (conflict resolution)
        } else if (eventType === "DELETE" && oldRec) {
            this._setItems((currentItems) =>
                currentItems.filter(t => t.id !== oldRec.id)
            );
            this._save();
        }
    }

    private _subscribeToRealtime(userId: string): void {
        this._unsubscribeFromRealtime();
        this._unsubscribeRealtime = subscribeTodoChanges(userId, (p) =>
            this.handleRealtimeChange(p as RealtimePayload)
        );
    }

    private _unsubscribeFromRealtime(): void {
        if (this._unsubscribeRealtime) {
            this._unsubscribeRealtime();
            this._unsubscribeRealtime = null;
        }
    }

    /**
     * Cleanup subscriptions.
     */
    destroy(): void {
        this._unsubscribeFromRealtime();
    }
}
