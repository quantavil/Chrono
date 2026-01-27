
// src/lib/utils/formatTime.ts - ENHANCED

import type { TimerDisplayData } from '../types';

function padZero(num: number, digits: number = 2): string {
  return num.toString().padStart(digits, '0');
}

export function formatTime(ms: number): TimerDisplayData {
  const totalSeconds = Math.floor(Math.max(0, ms) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const hoursStr = padZero(hours);
  const minutesStr = padZero(minutes);
  const secondsStr = padZero(seconds);

  // Compact format
  let compact: string;
  if (hours > 0) {
    compact = `${hours}h ${minutesStr}m`;
  } else if (minutes > 0) {
    compact = `${minutes}m ${secondsStr}s`;
  } else {
    compact = `${seconds}s`;
  }

  return {
    hours: hoursStr,
    minutes: minutesStr,
    seconds: secondsStr,
    formatted: `${hoursStr}:${minutesStr}:${secondsStr}`,
    compact,
    totalMs: ms,
  };
}

export function formatTimeCompact(ms: number): string {
  return formatTime(ms).compact;
}

export function calculateCurrentTime(accumulatedMs: number, lastStartTime: string | null): number {
  if (!lastStartTime) return accumulatedMs;
  const startMs = new Date(lastStartTime).getTime();
  if (isNaN(startMs)) return accumulatedMs;
  return accumulatedMs + Math.max(0, Date.now() - startMs);
}

export function nowTimestamp(): string {
  return new Date().toISOString();
}

// ============================================================================
// Date Formatting
// ============================================================================

export function formatDateHeader(date: Date = new Date()): {
  dayName: string;
  monthDay: string;
  fullDate: string;
} {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return {
    dayName: dayNames[date.getDay()]!,
    monthDay: `${monthNames[date.getMonth()]} ${date.getDate()}`,
    fullDate: `${dayNames[date.getDay()]}, ${monthNames[date.getMonth()]} ${date.getDate()}`,
  };
}

export function isOverdue(dateStr: string): boolean {
  const date = new Date(dateStr);
  const now = new Date();

  // Compare just the dates (ignore time for due dates)
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const todayOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return dateOnly < todayOnly;
}

export function isToday(dateStr: string): boolean {
  const date = new Date(dateStr);
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

export function isTomorrow(dateStr: string): boolean {
  const date = new Date(dateStr);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return (
    date.getDate() === tomorrow.getDate() &&
    date.getMonth() === tomorrow.getMonth() &&
    date.getFullYear() === tomorrow.getFullYear()
  );
}

export function formatRelativeDate(dateStr: string): string {
  if (!dateStr) return '';

  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (isToday(dateStr)) return 'Today';
  if (isTomorrow(dateStr)) return 'Tomorrow';

  if (diffDays < 0) {
    const absDays = Math.abs(diffDays);
    if (absDays === 1) return 'Yesterday';
    if (absDays < 7) return `${absDays} days ago`;
    if (absDays < 14) return '1 week ago';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  if (diffDays < 7) return `In ${diffDays} days`;
  if (diffDays < 14) return 'Next week';

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatDueDate(dateStr: string | null): { text: string; isOverdue: boolean; isToday: boolean } {
  if (!dateStr) return { text: '', isOverdue: false, isToday: false };

  return {
    text: formatRelativeDate(dateStr),
    isOverdue: isOverdue(dateStr),
    isToday: isToday(dateStr),
  };
}

// ============================================================================
// Duration Parsing (e.g., "30m" -> milliseconds)
// ============================================================================

export function parseDuration(input: string): number | null {
  const match = input.trim().match(/^(\d+(?:\.\d+)?)\s*(s|m|h|sec|min|hr|hour|minute|second)s?$/i);
  if (!match) return null;

  const value = parseFloat(match[1]!);
  const unit = match[2]!.toLowerCase();

  switch (unit) {
    case 's':
    case 'sec':
    case 'second':
      return value * 1000;
    case 'm':
    case 'min':
    case 'minute':
      return value * 60 * 1000;
    case 'h':
    case 'hr':
    case 'hour':
      return value * 60 * 60 * 1000;
    default:
      return null;
  }
}

export function formatDuration(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return '< 1m';
}