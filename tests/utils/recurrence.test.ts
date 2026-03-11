/**
 * Unit tests for recurrence calculation utilities
 * Tests next occurrence calculations for recurring tasks
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { calculateNextOccurrence } from '../../src/lib/utils/recurrence';
import type { RecurrenceConfig } from '../../src/lib/types';

describe('calculateNextOccurrence', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        // Set to Saturday, February 7, 2026
        vi.setSystemTime(new Date('2026-02-07T12:00:00.000Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('daily recurrence', () => {
        it('should add 1 day by default', () => {
            const config: RecurrenceConfig = { type: 'daily' };
            const result = calculateNextOccurrence(config);

            expect(result).not.toBeNull();
            expect(result!.getDate()).toBe(8);
            expect(result!.getMonth()).toBe(1); // February
        });

        it('should add custom interval days', () => {
            const config: RecurrenceConfig = { type: 'daily', interval: 3 };
            const result = calculateNextOccurrence(config);

            expect(result).not.toBeNull();
            expect(result!.getDate()).toBe(10); // 7 + 3 = 10
        });

        it('should handle from custom date', () => {
            const config: RecurrenceConfig = { type: 'daily', interval: 2 };
            const fromDate = new Date('2026-02-10T10:00:00.000Z');
            const result = calculateNextOccurrence(config, fromDate);

            expect(result).not.toBeNull();
            expect(result!.getDate()).toBe(12);
        });
    });

    describe('weekly recurrence', () => {
        it('should add 1 week by default without specific days', () => {
            const config: RecurrenceConfig = { type: 'weekly' };
            const result = calculateNextOccurrence(config);

            expect(result).not.toBeNull();
            expect(result!.getDate()).toBe(14); // 7 + 7 = 14
        });

        it('should add custom interval weeks', () => {
            const config: RecurrenceConfig = { type: 'weekly', interval: 2 };
            const result = calculateNextOccurrence(config);

            expect(result).not.toBeNull();
            expect(result!.getDate()).toBe(21); // 7 + 14 = 21
        });

        it('should find next day in current week when days specified', () => {
            // Saturday (day 6), looking for Sunday (day 0) - wraps to next week
            // But if we look for Monday (day 1), it's next day
            // Actually Saturday is the last day, so Mon would be in next week
            // Let's test with a Wednesday start
            vi.setSystemTime(new Date('2026-02-04T12:00:00.000Z')); // Wednesday (day 3)

            const config: RecurrenceConfig = { type: 'weekly', days: [5] }; // Friday
            const result = calculateNextOccurrence(config);

            expect(result).not.toBeNull();
            // Wednesday + 2 days = Friday
            expect(result!.getDate()).toBe(6);
        });

        it('should wrap to next interval week when no days left in current week', () => {
            // Saturday (day 6), looking for Monday (day 1)
            const config: RecurrenceConfig = { type: 'weekly', days: [1], interval: 1 }; // Monday
            const result = calculateNextOccurrence(config);

            expect(result).not.toBeNull();
            // Saturday (Feb 7) -> next Monday (Feb 9)
            expect(result!.getDate()).toBe(9);
        });

        it('should handle multiple days and pick next available', () => {
            vi.setSystemTime(new Date('2026-02-04T12:00:00.000Z')); // Wednesday (day 3)

            // Looking for Mon (1), Wed (3), Fri (5) - next is Friday
            const config: RecurrenceConfig = { type: 'weekly', days: [1, 3, 5] };
            const result = calculateNextOccurrence(config);

            expect(result).not.toBeNull();
            expect(result!.getDate()).toBe(6); // Friday
        });

        it('should handle empty days array as simple week offset', () => {
            const config: RecurrenceConfig = { type: 'weekly', days: [] };
            const result = calculateNextOccurrence(config);

            expect(result).not.toBeNull();
            expect(result!.getDate()).toBe(14);
        });
    });

    describe('custom recurrence', () => {
        it('should delegate to weekly', () => {
            const config: RecurrenceConfig = { type: 'custom', days: [1, 3, 5] };
            vi.setSystemTime(new Date('2026-02-04T12:00:00.000Z')); // Wednesday

            const result = calculateNextOccurrence(config);

            expect(result).not.toBeNull();
            expect(result!.getDate()).toBe(6); // Friday
        });
    });

    describe('edge cases', () => {
        it('should return null for unsupported type', () => {
            const config = { type: 'monthly' } as RecurrenceConfig;
            const result = calculateNextOccurrence(config);

            expect(result).toBeNull();
        });

        it('should handle interval of 1 as default', () => {
            const config: RecurrenceConfig = { type: 'daily', interval: 1 };
            const result = calculateNextOccurrence(config);

            expect(result!.getDate()).toBe(8);
        });
    });
});
