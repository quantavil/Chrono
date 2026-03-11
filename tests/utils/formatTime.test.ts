/**
 * Unit tests for formatTime utility functions
 * Tests time formatting, date calculations, and duration parsing
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    formatTime,
    formatTimeCompact,
    calculateCurrentTime,
    nowTimestamp,
    getDatePreset,
    getDatePresetISO,
    formatDateHeader,
    isOverdue,
    isToday,
    isTomorrow,
    formatRelativeDate,
    formatDueDate,
    parseDuration,
    formatDuration,
} from '../../src/lib/utils/formatTime';

describe('formatTime utilities', () => {
    describe('formatTime', () => {
        it('should format zero milliseconds', () => {
            const result = formatTime(0);
            expect(result.hours).toBe('00');
            expect(result.minutes).toBe('00');
            expect(result.seconds).toBe('00');
            expect(result.formatted).toBe('00:00:00');
            expect(result.compact).toBe('0s');
        });

        it('should format seconds only', () => {
            const result = formatTime(45000); // 45 seconds
            expect(result.hours).toBe('00');
            expect(result.minutes).toBe('00');
            expect(result.seconds).toBe('45');
            expect(result.formatted).toBe('00:00:45');
            expect(result.compact).toBe('45s');
        });

        it('should format minutes and seconds', () => {
            const result = formatTime(125000); // 2m 5s
            expect(result.hours).toBe('00');
            expect(result.minutes).toBe('02');
            expect(result.seconds).toBe('05');
            expect(result.formatted).toBe('00:02:05');
            expect(result.compact).toBe('2m 05s');
        });

        it('should format hours and minutes', () => {
            const result = formatTime(3661000); // 1h 1m 1s
            expect(result.hours).toBe('01');
            expect(result.minutes).toBe('01');
            expect(result.seconds).toBe('01');
            expect(result.formatted).toBe('01:01:01');
            expect(result.compact).toBe('1h 01m');
        });

        it('should handle large values (10+ hours)', () => {
            const result = formatTime(36000000); // 10 hours
            expect(result.hours).toBe('10');
            expect(result.minutes).toBe('00');
            expect(result.compact).toBe('10h 00m');
        });

        it('should handle negative values as zero', () => {
            const result = formatTime(-5000);
            expect(result.formatted).toBe('00:00:00');
            expect(result.totalMs).toBe(-5000);
        });
    });

    describe('formatTimeCompact', () => {
        it('should return compact format string', () => {
            expect(formatTimeCompact(3600000)).toBe('1h 00m');
            expect(formatTimeCompact(90000)).toBe('1m 30s');
            expect(formatTimeCompact(5000)).toBe('5s');
        });
    });

    describe('calculateCurrentTime', () => {
        beforeEach(() => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date('2026-02-07T00:00:00.000Z'));
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('should return accumulated time when no start time', () => {
            expect(calculateCurrentTime(5000, null)).toBe(5000);
        });

        it('should calculate running timer correctly', () => {
            // Started 30 seconds ago with 60 seconds accumulated
            const startTime = new Date('2026-02-06T23:59:30.000Z').toISOString();
            const result = calculateCurrentTime(60000, startTime);
            expect(result).toBe(90000); // 60s + 30s = 90s
        });

        it('should handle invalid timestamp gracefully', () => {
            expect(calculateCurrentTime(5000, 'invalid-date')).toBe(5000);
        });
    });

    describe('nowTimestamp', () => {
        beforeEach(() => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date('2026-02-07T00:00:00.000Z'));
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('should return valid ISO timestamp', () => {
            const result = nowTimestamp();
            expect(result).toBe('2026-02-07T00:00:00.000Z');
        });
    });

    describe('getDatePreset', () => {
        beforeEach(() => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date('2026-02-07T00:00:00.000Z'));
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('should return today at midnight', () => {
            const result = getDatePreset('today');
            expect(result.getDate()).toBe(7);
            expect(result.getHours()).toBe(0);
            expect(result.getMinutes()).toBe(0);
        });

        it('should return tomorrow at midnight', () => {
            const result = getDatePreset('tomorrow');
            expect(result.getDate()).toBe(8);
        });

        it('should return one week from now', () => {
            const result = getDatePreset('week');
            expect(result.getDate()).toBe(14);
        });
    });

    describe('getDatePresetISO', () => {
        beforeEach(() => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date('2026-02-07T12:00:00.000Z'));
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('should return ISO string for preset', () => {
            const result = getDatePresetISO('today');
            expect(result).toMatch(/2026-02/); // Check month/year
            expect(new Date(result).getHours()).toBe(0); // Check it was set to midnight local
        });
    });

    describe('formatDateHeader', () => {
        it('should format date header correctly', () => {
            const date = new Date('2026-02-07T12:00:00.000Z');
            const result = formatDateHeader(date);

            expect(result.dayName).toBe('Saturday');
            expect(result.monthDay).toBe('Feb 7');
            expect(result.fullDate).toBe('Saturday, Feb 7');
        });

        it('should use current date when no argument', () => {
            const result = formatDateHeader();
            expect(result.dayName).toBeDefined();
            expect(result.monthDay).toBeDefined();
        });
    });

    describe('isOverdue', () => {
        beforeEach(() => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date('2026-02-07T00:00:00.000Z'));
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('should return true for past dates', () => {
            expect(isOverdue('2026-02-05')).toBe(true);
            expect(isOverdue('2026-02-06')).toBe(true);
        });

        it('should return false for today', () => {
            expect(isOverdue('2026-02-07')).toBe(false);
        });

        it('should return false for future dates', () => {
            expect(isOverdue('2026-02-08')).toBe(false);
            expect(isOverdue('2026-02-15')).toBe(false);
        });
    });

    describe('isToday', () => {
        beforeEach(() => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date('2026-02-07T00:00:00.000Z'));
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('should return true for today', () => {
            expect(isToday('2026-02-07')).toBe(true);
            expect(isToday('2026-02-07T23:59:59')).toBe(true);
        });

        it('should return false for other days', () => {
            expect(isToday('2026-02-06')).toBe(false);
            expect(isToday('2026-02-08')).toBe(false);
        });
    });

    describe('isTomorrow', () => {
        beforeEach(() => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date('2026-02-07T00:00:00.000Z'));
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('should return true for tomorrow', () => {
            expect(isTomorrow('2026-02-08')).toBe(true);
        });

        it('should return false for today', () => {
            expect(isTomorrow('2026-02-07')).toBe(false);
        });

        it('should return false for day after tomorrow', () => {
            expect(isTomorrow('2026-02-09')).toBe(false);
        });
    });

    describe('formatRelativeDate', () => {
        beforeEach(() => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date('2026-02-07T00:00:00.000Z'));
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('should return "Today" for today', () => {
            expect(formatRelativeDate('2026-02-07')).toBe('Today');
        });

        it('should return "Tomorrow" for tomorrow', () => {
            expect(formatRelativeDate('2026-02-08')).toBe('Tomorrow');
        });

        it('should return "Yesterday" for yesterday', () => {
            expect(formatRelativeDate('2026-02-06')).toBe('Yesterday');
        });

        it('should return "X days ago" for recent past', () => {
            expect(formatRelativeDate('2026-02-04')).toBe('3 days ago');
        });

        it('should return "In X days" for near future', () => {
            expect(formatRelativeDate('2026-02-10')).toBe('In 3 days');
        });

        it('should return empty string for empty input', () => {
            expect(formatRelativeDate('')).toBe('');
        });
    });

    describe('formatDueDate', () => {
        beforeEach(() => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date('2026-02-07T00:00:00.000Z'));
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('should return empty for null input', () => {
            const result = formatDueDate(null);
            expect(result.text).toBe('');
            expect(result.isOverdue).toBe(false);
            expect(result.isToday).toBe(false);
        });

        it('should detect overdue dates', () => {
            const result = formatDueDate('2026-02-05');
            expect(result.isOverdue).toBe(true);
        });

        it('should detect today', () => {
            const result = formatDueDate('2026-02-07');
            expect(result.isToday).toBe(true);
            expect(result.text).toBe('Today');
        });
    });

    describe('parseDuration', () => {
        it('should parse seconds', () => {
            expect(parseDuration('30s')).toBe(30000);
            expect(parseDuration('45 sec')).toBe(45000);
            expect(parseDuration('15 seconds')).toBe(15000);
        });

        it('should parse minutes', () => {
            expect(parseDuration('5m')).toBe(300000);
            expect(parseDuration('15 min')).toBe(900000);
            expect(parseDuration('30 minutes')).toBe(1800000);
        });

        it('should parse hours', () => {
            expect(parseDuration('1h')).toBe(3600000);
            expect(parseDuration('2 hr')).toBe(7200000);
            expect(parseDuration('1.5 hours')).toBe(5400000);
        });

        it('should parse decimal values', () => {
            expect(parseDuration('1.5h')).toBe(5400000);
            expect(parseDuration('0.5m')).toBe(30000);
        });

        it('should return null for invalid input', () => {
            expect(parseDuration('invalid')).toBeNull();
            expect(parseDuration('30')).toBeNull();
            expect(parseDuration('')).toBeNull();
        });
    });

    describe('formatDuration', () => {
        it('should format hours and minutes', () => {
            expect(formatDuration(5400000)).toBe('1h 30m'); // 1.5 hours
        });

        it('should format hours only', () => {
            expect(formatDuration(7200000)).toBe('2h'); // 2 hours
        });

        it('should format minutes only', () => {
            expect(formatDuration(900000)).toBe('15m'); // 15 minutes
        });

        it('should return "< 1m" for very short durations', () => {
            expect(formatDuration(30000)).toBe('< 1m');
            expect(formatDuration(0)).toBe('< 1m');
        });
    });
});

