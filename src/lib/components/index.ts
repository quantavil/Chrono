/**
 * Component Registry: Centralized exports for all Svelte components in the library.
 */
// Auth
export { default as LoginForm } from './auth/LoginForm.svelte';
export { default as UserMenu } from './auth/UserMenu.svelte';

// Layout
export { default as Header } from './layout/Header.svelte';
export { default as DualPaneLayout } from './layout/DualPaneLayout.svelte';
export { default as LeftPane } from './layout/LeftPane.svelte';
export { default as RightPane } from './layout/RightPane.svelte';
export { default as TasksView } from './layout/TasksView.svelte';

// Settings
export { default as SettingsPage } from './settings/SettingsPage.svelte';

// Tasks
export { default as AddTaskBar } from './tasks/AddTaskBar.svelte';
export { default as CompletedSection } from './tasks/CompletedSection.svelte';
export { default as TaskInputEditor } from './tasks/TaskInputEditor.svelte';
export { default as TaskItem } from './tasks/TaskItem.svelte';
export { default as TaskList } from './tasks/TaskList.svelte';

// Tasks - Editor
export { default as TiptapEditor } from './tasks/editor/TiptapEditor.svelte';
export { default as TaskDetailContainer } from './tasks/editor/TaskDetailContainer.svelte';
export { default as TaskHeader } from './tasks/editor/TaskHeader.svelte';
export { default as TaskEditor } from './tasks/editor/TaskEditor.svelte';

// Panels
export { default as EmptyPanel } from './panels/EmptyPanel.svelte';
export { default as TaskPanel } from './panels/TaskPanel.svelte';

// UI
export { default as CustomDatePicker } from './ui/CustomDatePicker.svelte';
export { default as EmptyState } from './ui/EmptyState.svelte';
export { default as KeyboardShortcuts } from './ui/KeyboardShortcuts.svelte';
export { default as Toast } from './ui/Toast.svelte';
export { default as SquigglyDuration } from './ui/SquigglyDuration.svelte';