/**
 * Typed Svelte context wrappers for accessing global stores (UI, Auth, Todo).
 */
import { setContext, getContext } from 'svelte';
import { TodoList } from '../stores/todo.svelte';
import { AuthManager } from '../stores/auth.svelte';

const TODO_KEY = Symbol('TODO');
const AUTH_KEY = Symbol('AUTH');

export function initStores() {
    const todoStore = new TodoList();
    const authStore = new AuthManager(todoStore);

    setContext(TODO_KEY, todoStore);
    setContext(AUTH_KEY, authStore);

    return { todoStore, authStore };
}

export function getTodoStore() {
    const store = getContext<TodoList>(TODO_KEY);
    if (!store) throw new Error('Todo store not initialized in component tree');
    return store;
}

export function getAuthStore() {
    const store = getContext<AuthManager>(AUTH_KEY);
    if (!store) throw new Error('Auth store not initialized in component tree');
    return store;
}
