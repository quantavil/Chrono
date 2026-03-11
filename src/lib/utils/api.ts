/**
 * API client for interacting with the local Cloudflare Pages Functions backend.
 */

import type { Todo, TodoCreateInput } from '../types';

export async function fetchTodos(): Promise<{ data: Todo[] | null; error: Error | null }> {
    try {
        const res = await fetch('/api/todos');
        if (!res.ok) {
            const body = await res.json();
            throw new Error(body.error || 'Failed to fetch todos');
        }

        const json = await res.json();
        // Since we store tags and subtasks as JSON strings in SQLite, we parse them if necessary
        // Drizzle might return them as objects if mode: "json" worked, let's normalize just in case.
        const data = (json.data as any[]).map(t => ({
            ...t,
            // SQLite boolean integer mapping
            is_completed: Boolean(t.is_completed),
            tags: typeof t.tags === 'string' ? JSON.parse(t.tags) : (t.tags || []),
            subtasks: typeof t.subtasks === 'string' ? JSON.parse(t.subtasks) : (t.subtasks || []),
            recurrence: typeof t.recurrence === 'string' ? JSON.parse(t.recurrence) : t.recurrence
        }));

        return { data, error: null };
    } catch (err) {
        return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
    }
}

export async function createTodo(
    todo: TodoCreateInput
): Promise<{ data: Todo | null; error: Error | null }> {
    try {
        const res = await fetch('/api/todos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(todo)
        });

        if (!res.ok) {
            const body = await res.json();
            throw new Error(body.error || 'Failed to create todo');
        }

        const { data } = await res.json();
        return { data, error: null };
    } catch (err) {
        return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
    }
}

export async function updateTodo(
    id: string,
    updates: Partial<Todo>
): Promise<{ data: Todo | null; error: Error | null }> {
    try {
        const res = await fetch(`/api/todos/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });

        if (!res.ok) {
            const body = await res.json();
            throw new Error(body.error || 'Failed to update todo');
        }

        const { data } = await res.json();
        return { data, error: null };
    } catch (err) {
        return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
    }
}

export async function deleteTodo(id: string): Promise<{ error: Error | null }> {
    try {
        const res = await fetch(`/api/todos/${id}`, {
            method: 'DELETE'
        });

        if (!res.ok) {
            const body = await res.json();
            throw new Error(body.error || 'Failed to delete todo');
        }

        return { error: null };
    } catch (err) {
        return { error: err instanceof Error ? err : new Error('Unknown error') };
    }
}

export async function batchUpdateTodos(
    updates: Array<{ id: string; updates: Partial<Todo> }>
): Promise<{ error: Error | null }> {
    try {
        const res = await fetch('/api/todos', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });

        if (!res.ok) {
            const body = await res.json();
            throw new Error(body.error || 'Failed to batch update todos');
        }

        return { error: null };
    } catch (err) {
        return { error: err instanceof Error ? err : new Error('Unknown error') };
    }
}
