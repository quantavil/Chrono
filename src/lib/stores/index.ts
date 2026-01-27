/**
 * Store Exports
 * Centralized exports for all state management
 */

export { todoList, TodoItem, TodoList } from './todo.svelte';
export { themeManager, getTheme, setTheme, toggleTheme, toggleLightDark } from './theme.svelte';
export { 
  toastManager, 
  showToast, 
  showSuccess, 
  showError, 
  showInfo, 
  showWarning,
  dismissToast,
  clearAllToasts 
} from './toast.svelte';
export {
  authManager,
  getUser,
  isAuthenticated,
  signInWithEmail,
  signInWithGitHub,
  signOut,
} from './auth.svelte';