/**
 * Logic for calculating the next occurrence of recurring tasks based on configuration.
 */
import type { RecurrenceConfig } from '../types';

export function calculateNextOccurrence(config: RecurrenceConfig, fromDate: Date = new Date()): Date | null {
    const { type, days, interval = 1 } = config;
    const nextDate = new Date(fromDate);

    switch (type) {
        case 'daily':
            nextDate.setDate(nextDate.getDate() + interval);
            return nextDate;

        case 'weekly':
            if (days && days.length > 0) {
                // Specific days of the week logic
                const sortedDays = [...days].sort((a, b) => a - b);
                const currentDay = nextDate.getDay();

                // Find next day in current week
                const nextDayInWeek = sortedDays.find(d => d > currentDay);

                if (nextDayInWeek !== undefined) {
                    nextDate.setDate(nextDate.getDate() + (nextDayInWeek - currentDay));
                } else {
                    // Wrap around to the first day in the next interval week
                    const firstDay = sortedDays[0]!;
                    const daysUntilNext = (7 * interval) - currentDay + firstDay;
                    nextDate.setDate(nextDate.getDate() + daysUntilNext);
                }
            } else {
                // Simple week offset
                nextDate.setDate(nextDate.getDate() + (7 * interval));
            }
            return nextDate;

        case 'custom':
            // Deprecated/Alias for weekly with days in this implementation
            return calculateNextOccurrence({ ...config, type: 'weekly' }, fromDate);

        default:
            return null;
    }
}
