/**
 * SyncCoordinator: Handles sync operations.
 * Note: Realtime subscriptions have been temporarily disabled in favor of REST API syncing for Cloudflare free tier.
 */
import type { TodoLocal, Todo } from "../types";
import { storageService } from "../services/storage.svelte";
import { toastManager } from "./toast.svelte";
import type { TodoModel } from "../models/Todo.svelte";

export class SyncCoordinator {
    private _userId = $state<string | null>(null);

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
     * Set the current user and initiate sync.
     */
    async setUser(userId: string | null): Promise<void> {
        this._userId = userId;

        // Keep only items that belong to the target userId
        // This prevents local (guest) tasks from automatically merging into an account,
        // and also prevents account tasks from leaking into the local guest session on logout.
        const items = this._getItems();
        const itemsToKeep = items.filter(t => t.userId === userId);
        
        this._setItems(() => itemsToKeep);
        this._save();

        if (userId) {
            await this.performSync();
        }
    }

    /**
     * Force a sync with the server.
     */
    async forceSync(): Promise<void> {
        if (this._userId) {
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
     * Cleanup subscriptions.
     */
    destroy(): void {
        // No realtime subscriptions to clean up
    }
}
