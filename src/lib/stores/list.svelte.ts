import { storageService } from "../services/storage.svelte";

import type { List } from "../types";

export class ListStore {
    private _lists = $state<List[]>([]);

    constructor() {
        this._lists = storageService.loadLists();

        // Migration: ensure default list exists
        if (this._lists.length === 0) {
            this._createDefaultList();
        }
    }

    get lists() {
        return this._lists;
    }

    private _createDefaultList() {
        const defaultList: List = {
            id: "default",
            title: "My Tasks",
            icon: "ListTodo",
            isDefault: true,
            created_at: new Date().toISOString()
        };
        this._lists = [defaultList];
        storageService.saveLists(this._lists);
    }

    addList(title: string, icon?: string) {
        const list: List = {
            id: crypto.randomUUID(),
            title,
            icon,
            created_at: new Date().toISOString()
        };
        this._lists.push(list);
        storageService.saveLists(this._lists);
        return list;
    }

    removeList(id: string): boolean {
        const list = this._lists.find(l => l.id === id);
        if (!list || list.isDefault) return false;

        this._lists = this._lists.filter(l => l.id !== id);
        storageService.saveLists(this._lists);
        return true;
    }

    updateList(id: string, updates: Partial<List>) {
        const list = this._lists.find(l => l.id === id);
        if (!list || list.isDefault) return; // Prevent updating default list
        Object.assign(list, updates);
        storageService.saveLists(this._lists);
    }
}
