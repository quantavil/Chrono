
/**
 * Toast Store: Manages a queue of transient notification messages with support for timeouts and interactive actions.
 */

import type { Toast, ToastInput, ToastAction, ToastType } from '../types';
import { TOAST_DEFAULT_DURATION_MS, TOAST_WITH_ACTION_DURATION_MS } from '../types';

let toastIdCounter = 0;

function generateToastId(): string {
  return `toast-${Date.now()}-${++toastIdCounter}`;
}

class ToastManager {
  private _queue = $state<Toast[]>([]);
  private _timers = new Map<string, { timeout: ReturnType<typeof setTimeout>; remaining: number; startedAt: number }>();
  private _maxToasts = 5;

  get toasts(): Toast[] {
    return this._queue;
  }

  get hasToasts(): boolean {
    return this._queue.length > 0;
  }

  add(input: ToastInput): string {
    const hasAction = Boolean(input.action);
    const toast: Toast = {
      id: generateToastId(),
      type: input.type,
      message: input.message,
      duration: input.duration ?? (hasAction ? TOAST_WITH_ACTION_DURATION_MS : TOAST_DEFAULT_DURATION_MS),
      action: input.action,
      createdAt: Date.now(),
    };

    // Remove oldest if at capacity
    if (this._queue.length >= this._maxToasts) {
      const oldest = this._queue[0];
      if (oldest) this.remove(oldest.id);
    }

    this._queue = [...this._queue, toast];

    if (toast.duration > 0) {
      this._startTimer(toast.id, toast.duration);
    }

    return toast.id;
  }

  remove(id: string): void {
    this._clearTimer(id);
    this._queue = this._queue.filter(t => t.id !== id);
  }

  clear(): void {
    this._timers.forEach((_, id) => this._clearTimer(id));
    this._queue = [];
  }

  // -------------------------------------------------------------------------
  // Pause/Resume for hover
  // -------------------------------------------------------------------------

  pause(id: string): void {
    const timer = this._timers.get(id);
    if (!timer) return;

    clearTimeout(timer.timeout);
    const elapsed = Date.now() - timer.startedAt;
    this._timers.set(id, { ...timer, remaining: timer.remaining - elapsed });

    // Update toast to track pause
    const toast = this._queue.find(t => t.id === id);
    if (toast) {
      toast.pausedAt = Date.now();
    }
  }

  resume(id: string): void {
    const timer = this._timers.get(id);
    if (!timer || timer.remaining <= 0) return;

    const timeout = setTimeout(() => this.remove(id), timer.remaining);
    this._timers.set(id, { timeout, remaining: timer.remaining, startedAt: Date.now() });

    // Clear pause state
    const toast = this._queue.find(t => t.id === id);
    if (toast) {
      toast.pausedAt = undefined;
    }
  }

  // -------------------------------------------------------------------------
  // Convenience Methods
  // -------------------------------------------------------------------------

  success(message: string, duration?: number): string {
    return this.add({ type: 'success', message, duration });
  }

  error(message: string, duration?: number): string {
    return this.add({ type: 'error', message, duration: duration ?? 6000 });
  }

  info(message: string, duration?: number): string {
    return this.add({ type: 'info', message, duration });
  }

  warning(message: string, duration?: number): string {
    return this.add({ type: 'warning', message, duration: duration ?? 5000 });
  }

  // Toast with undo action
  withUndo(message: string, onUndo: () => void, type: ToastType = 'info'): string {
    return this.add({
      type,
      message,
      duration: TOAST_WITH_ACTION_DURATION_MS,
      action: {
        label: 'Undo',
        onClick: onUndo,
      },
    });
  }

  // -------------------------------------------------------------------------
  // Private
  // -------------------------------------------------------------------------

  private _startTimer(id: string, duration: number): void {
    const timeout = setTimeout(() => this.remove(id), duration);
    this._timers.set(id, { timeout, remaining: duration, startedAt: Date.now() });
  }

  private _clearTimer(id: string): void {
    const timer = this._timers.get(id);
    if (timer) {
      clearTimeout(timer.timeout);
      this._timers.delete(id);
    }
  }

  destroy(): void {
    this.clear();
  }
}


export const toastManager = new ToastManager();

export function showToast(input: ToastInput) { return toastManager.add(input); }
export function showSuccess(message: string, duration?: number) { return toastManager.success(message, duration); }
export function showError(message: string, duration?: number) { return toastManager.error(message, duration); }
export function showInfo(message: string, duration?: number) { return toastManager.info(message, duration); }
export function showWarning(message: string, duration?: number) { return toastManager.warning(message, duration); }
export function dismissToast(id: string) { return toastManager.remove(id); }
export function clearAllToasts() { return toastManager.clear(); }