
import type { RecurrenceConfig } from '../types';

export function calculateNextOccurrence(config: RecurrenceConfig, fromDate: Date = new Date()): Date | null {
    const { type, days, interval = 1 } = config;
    const nextDate = new Date(fromDate);

    // Reset time to start of day for accurate calculation, or keep time?
    // Usually for recurrence due dates, we want to keep the time if set, or default to start of day.
    // For now, let's just manipulate the date part and keep time.

    switch (type) {
        case 'daily':
            nextDate.setDate(nextDate.getDate() + interval);
            return nextDate;

        case 'weekly':
            nextDate.setDate(nextDate.getDate() + (7 * interval));
            return nextDate;

        case 'custom':
            if (!days || days.length === 0) return null;

            // Find the next day in the list
            // sort days just in case: 0 (Sun) - 6 (Sat)
            const sortedDays = [...days].sort((a, b) => a - b);
            const currentDay = nextDate.getDay();

            // Find next day in current week
            const nextDayInWeek = sortedDays.find(d => d > currentDay);

            if (nextDayInWeek !== undefined) {
                nextDate.setDate(nextDate.getDate() + (nextDayInWeek - currentDay));
            } else {
                // Wrap around to the first day in the list for next week
                const firstDay = sortedDays[0];
                const daysUntilNext = 7 - currentDay + firstDay;
                nextDate.setDate(nextDate.getDate() + daysUntilNext);
            }
            return nextDate;

        default:
            return null;
    }
}
