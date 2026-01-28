
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
export type PriorityOrNone = Priority | null;

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
  priority: PriorityOrNone;
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
  priority?: PriorityOrNone;
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
  priority?: PriorityOrNone;
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

export type SortField = 'created' | 'due' | 'priority' | 'title' | 'position';
export type SortOrder = 'asc' | 'desc';

export interface FilterState {
  priority: PriorityOrNone | 'all';
  listId: string;
  status: 'all' | 'active' | 'completed' | 'overdue';
  tags: string[];
  hasDueDate: boolean | null;
  sortBy: SortField;
  sortOrder: SortOrder;
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

export interface TaskGroup {
  id: string;
  label: string;
  tasks: any[]; // TodoModel eventually, but circular dependency issue if I import TodoModel here? 
  // actually types.ts doesn't import TodoModel. It imports Todo schema.
  // The store uses TodoModel. 
  // Let's make it generic or use Todo[] for now in types, but the store returns TodoModels.
  // Let's just define it as generic T or leave tasks as any[] in types and cast in store, 
  // OR define it in the store file to avoid circular deps if TodoModel is needed.
  // Actually, let's just NOT put TaskGroup in types.ts if it depends on the class.
  // Wait, I can use the interface Todo from types.
}

export const DEFAULT_FILTERS: FilterState = {
  listId: 'default', // Will be replaced by actual default list ID
  priority: 'all',
  status: 'all',
  tags: [],
  hasDueDate: null,
  sortBy: 'position',
  sortOrder: 'asc',
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
// UI State Types
// ============================================================================

export interface DragState {
  isDragging: boolean;
  draggedId: string | null;
  dropTargetId: string | null;
  dropPosition: 'before' | 'after' | null;
}

export interface ModalState {
  taskDetail: { isOpen: boolean; todoId: string | null };
  login: { isOpen: boolean };
  shortcuts: { isOpen: boolean };
  settings: { isOpen: boolean };
}

// ============================================================================
// User Preferences
// ============================================================================

export interface UserPreferences {
  // Add future preferences here
  theme?: Theme;
}

export const DEFAULT_PREFERENCES: UserPreferences = {};

// ============================================================================
// Supabase Response Types
// ============================================================================

export interface SupabaseResponse<T> {
  data: T | null;
  error: SupabaseError | null;
}

export interface SupabaseError {
  message: string;
  code: string;
  details: string | null;
  hint: string | null;
}

// ============================================================================
// Local Storage
// ============================================================================

export const LOCAL_STORAGE_VERSION = 2; // Bumped for new fields

export const LOCAL_STORAGE_KEYS = {
  TODOS: 'chronos_todos_v2',
  THEME: 'chronos_theme',
  FILTERS: 'chronos_filters',
  LAST_SYNC: 'chronos_last_sync',
  VERSION: 'chronos_version',
  UNDO_STACK: 'chronos_undo',
  PREFERENCES: 'chronos_preferences_v2',
  TAGS: 'chronos_tags_v1',
  LISTS: 'chronos_lists_v1',
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
// Priority Config
// ============================================================================

export const PRIORITY_CONFIG = {
  high: {
    label: "High",
    color: "red-500",
    sortWeight: 0,
    classes: {
      bg: "bg-red-500/10",
      bgHover: "hover:bg-red-500/20",
      text: "text-red-500",
      border: "border-red-500",
      ring: "ring-red-500/30",
      badge: "bg-red-500/10 text-red-500 border-red-500/20",
      button: "bg-red-500/10 text-red-500 border-red-500 hover:bg-red-500/20",
      buttonInactive: "border-base-300 text-neutral/40 hover:border-red-500/30 hover:text-red-500/60",
    },
  },
  medium: {
    label: "Medium",
    color: "amber-500",
    sortWeight: 1,
    classes: {
      bg: "bg-amber-500/10",
      bgHover: "hover:bg-amber-500/20",
      text: "text-amber-500",
      border: "border-amber-500",
      ring: "ring-amber-500/30",
      badge: "bg-amber-500/10 text-amber-500 border-amber-500/20",
      button: "bg-amber-500/10 text-amber-500 border-amber-500 hover:bg-amber-500/20",
      buttonInactive: "border-base-300 text-neutral/40 hover:border-amber-500/30 hover:text-amber-500/60",
    },
  },
  low: {
    label: "Low",
    color: "emerald-500",
    sortWeight: 2,
    classes: {
      bg: "bg-emerald-500/10",
      bgHover: "hover:bg-emerald-500/20",
      text: "text-emerald-500",
      border: "border-emerald-500",
      ring: "ring-emerald-500/30",
      badge: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
      button: "bg-emerald-500/10 text-emerald-500 border-emerald-500 hover:bg-emerald-500/20",
      buttonInactive: "border-base-300 text-neutral/40 hover:border-emerald-500/30 hover:text-emerald-500/60",
    },
  },
  none: {
    label: "None",
    color: "blue-500",
    sortWeight: 3,
    classes: {
      bg: "bg-blue-500/10",
      bgHover: "hover:bg-blue-500/20",
      text: "text-blue-500",
      border: "border-blue-500",
      ring: "ring-blue-500/30",
      badge: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      button: "bg-blue-500/10 text-blue-500 border-blue-500 hover:bg-blue-500/20",
      buttonInactive: "border-base-300 text-neutral/40 hover:border-blue-500/30 hover:text-blue-500/60",
    },
  },
} as const;

export const TOAST_CONFIG = {
  success: {
    icon: "CheckCircle",
    classes: {
      bg: "bg-emerald-500/10",
      text: "text-emerald-500",
      border: "border-emerald-500/20",
      progress: "bg-emerald-500",
    },
  },
  error: {
    icon: "XCircle",
    classes: {
      bg: "bg-red-500/10",
      text: "text-red-500",
      border: "border-red-500/20",
      progress: "bg-red-500",
    },
  },
  warning: {
    icon: "AlertTriangle",
    classes: {
      bg: "bg-amber-500/10",
      text: "text-amber-500",
      border: "border-amber-500/20",
      progress: "bg-amber-500",
    },
  },
  info: {
    icon: "Info",
    classes: {
      bg: "bg-blue-500/10",
      text: "text-blue-500",
      border: "border-blue-500/20",
      progress: "bg-blue-500",
    },
  },
} as const;

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