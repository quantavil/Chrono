
/**
 * Central repository for all TypeScript interfaces, types, and constants used across the application.
 */

// ============================================================================
// Theme Types
// ============================================================================

export type Theme = 'light' | 'dark' | 'system';

export interface ThemeState {
  current: Theme;
  resolved: 'light' | 'dark';
}

// ============================================================================
// User Types
// ============================================================================

export interface User {
  id: string;
  email: string;
  avatar_url: string | null;
  full_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

// ============================================================================
// Priority & Status
// ============================================================================

export type Priority = 'high' | 'medium' | 'low' | 'none';

export type TaskStatus = 'active' | 'completed' | 'overdue';

// ============================================================================
// Recurrence Types
// ============================================================================

export type RecurrenceType = 'daily' | 'weekdays' | 'weekly' | 'biweekly' | 'monthly' | 'custom';

export interface RecurrenceConfig {
  type: RecurrenceType;
  days?: number[]; // 0-6 for Sun-Sat
  interval?: number;
  endDate?: string; // ISO date to stop recurrence
}

// ============================================================================
// List Types
// ============================================================================

export interface List {
  id: string;
  title: string;
  icon?: string; // Lucide icon name or emoji
  isDefault?: boolean; // "My Tasks"
  created_at: string;
}

// ============================================================================
// Subtask Types
// ============================================================================

export interface Subtask {
  id: string;
  title: string;
  is_completed: boolean;
  position: number;
}

// ============================================================================
// Todo Types (Database Schema)
// ============================================================================

export interface Todo {
  id: string;
  list_id: string;
  user_id: string | null;
  title: string;
  description: string | null;
  notes: string | null;
  is_completed: boolean;
  priority: Priority;
  due_at: string | null; // ISO timestamp
  accumulated_time: number; // milliseconds
  estimated_time: number | null; // milliseconds - for time estimates
  last_start_time: string | null;
  position: number;
  recurrence: RecurrenceConfig | null;
  tags: string[];
  subtasks: Subtask[];
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TodoLocal extends Todo {
  _dirty: boolean;
  _deleted: boolean;
  _new: boolean;
  _syncError: string | null;
}

export interface TodoCreateInput {
  listId: string;
  title: string;
  description?: string | null;
  notes?: string | null;
  priority?: Priority;
  due_at?: string | null;
  estimated_time?: number | null;
  recurrence?: RecurrenceConfig | null;
  tags?: string[];
  subtasks?: Subtask[];
  position?: number;
}

export interface TodoUpdateInput {
  listId?: string;
  title?: string;
  description?: string | null;
  notes?: string | null;
  is_completed?: boolean;
  priority?: Priority;
  due_at?: string | null;
  accumulated_time?: number;
  estimated_time?: number | null;
  last_start_time?: string | null;
  position?: number;
  recurrence?: RecurrenceConfig | null;
  tags?: string[];
  subtasks?: Subtask[];
  completed_at?: string | null;
}

// ============================================================================
// Timer Types
// ============================================================================

export interface TimerDisplayData {
  hours: string;
  minutes: string;
  seconds: string;
  formatted: string;
  compact: string;
  totalMs: number;
}

// ============================================================================
// Toast Types
// ============================================================================

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
  action?: ToastAction;
  createdAt: number;
  pausedAt?: number;
}

export interface ToastInput {
  type: ToastType;
  message: string;
  duration?: number;
  action?: ToastAction;
}

// ============================================================================
// Filter & Search Types
// ============================================================================

export type SortOrder = 'asc' | 'desc';

export interface FilterState {
  priority: Priority | 'all';
  listId: string;
  status: 'all' | 'active' | 'completed' | 'overdue';
  tags: string[];
  hasDueDate: boolean | null;
}

export type GroupBy = 'none' | 'priority' | 'date';
export type SortBy = 'priority' | 'date' | 'alphabetical' | 'position';

export interface DisplayConfig {
  groupBy: GroupBy;
  sortBy: SortBy;
  sortOrder: SortOrder;
}

export const DEFAULT_DISPLAY_CONFIG: DisplayConfig = {
  groupBy: 'none',
  sortBy: 'position',
  sortOrder: 'asc',
};

export interface TaskGroup<T = unknown> {
  id: string;
  label: string;
  tasks: T[];
}

export const DEFAULT_FILTERS: FilterState = {
  listId: 'default',
  priority: 'all',
  status: 'all',
  tags: [],
  hasDueDate: null,
};

// ============================================================================
// Stats Types
// ============================================================================

export interface DailyStats {
  totalTasks: number;
  completedTasks: number;
  activeTasks: number;
  overdueTasks: number;
  totalTimeMs: number;
  estimatedTimeMs: number;
  averageTimePerTask: number;
  completionRate: number;
  tagCounts: Record<string, number>;
}

// ============================================================================
// Undo System Types
// ============================================================================

export type UndoActionType =
  | 'DELETE_TODO'
  | 'COMPLETE_TODO'
  | 'UPDATE_TODO'
  | 'DELETE_TAG'
  | 'CLEAR_COMPLETED';

export interface UndoAction {
  id: string;
  type: UndoActionType;
  timestamp: number;
  data: unknown;
  undo: () => void;
}


// ============================================================================
// User Preferences
// ============================================================================

export interface UserPreferences {
  theme?: Theme;
  enableFocusMode?: boolean;
}

export const DEFAULT_PREFERENCES: UserPreferences = {};

// ============================================================================
// Local Storage
// ============================================================================

export const LOCAL_STORAGE_KEYS = {
  TODOS: 'chronos_todos_v2',
  THEME: 'chronos_theme',
  FILTERS: 'chronos_filters',
  LAST_SYNC: 'chronos_last_sync',
  UNDO_STACK: 'chronos_undo',
  PREFERENCES: 'chronos_preferences_v2',
  TAGS: 'chronos_tags_v1',
  LISTS: 'chronos_lists_v1',
  DISPLAY_CONFIG: 'chronos_display_config',
} as const;

// ============================================================================
// Constants
// ============================================================================

export const TODO_TITLE_MAX_LENGTH = 200;
export const TODO_DESCRIPTION_MAX_LENGTH = 2000;
export const MAX_TAGS_PER_TODO = 10;
export const MAX_SUBTASKS_PER_TODO = 20;
export const TAG_MAX_LENGTH = 30;

export const TIMER_UPDATE_INTERVAL_MS = 100;
export const TIMER_SAVE_INTERVAL_MS = 5000; // Save running timer every 5s

export const TOAST_DEFAULT_DURATION_MS = 2000;
export const TOAST_ERROR_DURATION_MS = 4000;
export const TOAST_WITH_ACTION_DURATION_MS = 6000;

export const SYNC_DEBOUNCE_MS = 1000;
export const SYNC_RETRY_DELAYS = [1000, 2000, 5000, 10000]; // Exponential backoff

export const UNDO_STACK_MAX_SIZE = 20;
export const UNDO_EXPIRY_MS = 30000; // 30 seconds



// ============================================================================
// Utility Types
// ============================================================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Nullable<T> = T | null;

export type AsyncResult<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };