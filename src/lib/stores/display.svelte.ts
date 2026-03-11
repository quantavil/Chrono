/**
 * DisplayEngine: Handles task grouping, sorting, and display configuration.
 */
import type { DisplayConfig, TaskGroup, GroupBy, SortBy, SortOrder } from "../types";
import { DEFAULT_DISPLAY_CONFIG, PRIORITY_CONFIG } from "../types";
import { isOverdue, isToday, isTomorrow } from "../utils/formatTime";
import type { TodoModel } from "../models/Todo.svelte";

const DISPLAY_CONFIG_KEY = "chronos_display_config";

export class DisplayEngine {
    private _config = $state<DisplayConfig>({ ...DEFAULT_DISPLAY_CONFIG });

    constructor() {
        this._loadConfig();
    }

    get config(): DisplayConfig {
        return this._config;
    }

    get groupBy(): GroupBy {
        return this._config.groupBy;
    }

    get sortBy(): SortBy {
        return this._config.sortBy;
    }

    get sortOrder(): SortOrder {
        return this._config.sortOrder;
    }

    /**
     * Update display configuration.
     */
    setConfig(updates: Partial<DisplayConfig>): void {
        this._config = { ...this._config, ...updates };
        this._saveConfig();
    }

    /**
     * Generate grouped and sorted task list.
     */
    groupTasks(todos: TodoModel[]): TaskGroup<TodoModel>[] {
        const { groupBy, sortBy, sortOrder } = this._config;

        // Sort function
        const sortFn = (a: TodoModel, b: TodoModel): number => {
            let diff = 0;
            switch (sortBy) {
                case "priority":
                    const pA = a.priority ? PRIORITY_CONFIG[a.priority].sortWeight : 3;
                    const pB = b.priority ? PRIORITY_CONFIG[b.priority].sortWeight : 3;
                    diff = pA - pB;
                    break;
                case "date":
                    const dateA = a.dueAt ? new Date(a.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
                    const dateB = b.dueAt ? new Date(b.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
                    diff = dateA - dateB;
                    break;
                case "alphabetical":
                    diff = a.title.localeCompare(b.title);
                    break;
                case "position":
                default:
                    diff = a.position - b.position;
                    break;
            }
            return sortOrder === "asc" ? diff : -diff;
        };

        // No grouping
        if (groupBy === "none") {
            return [{
                id: "all",
                label: "All Tasks",
                tasks: [...todos].sort(sortFn),
            }];
        }

        // Group by priority
        if (groupBy === "priority") {
            return this._groupByPriority(todos, sortFn);
        }

        // Group by date
        if (groupBy === "date") {
            return this._groupByDate(todos, sortFn);
        }

        return [];
    }

    private _groupByPriority(
        todos: TodoModel[],
        sortFn: (a: TodoModel, b: TodoModel) => number
    ): TaskGroup<TodoModel>[] {
        const groups: Record<string, TaskGroup<TodoModel>> = {
            high: { id: "high", label: "High Priority", tasks: [] },
            medium: { id: "medium", label: "Medium Priority", tasks: [] },
            low: { id: "low", label: "Low Priority", tasks: [] },
            none: { id: "none", label: "No Priority", tasks: [] },
        };

        todos.forEach(t => {
            const p = t.priority || "none";
            if (groups[p]) groups[p].tasks.push(t);
        });

        return ["high", "medium", "low", "none"]
            .map(k => groups[k])
            .filter(g => g.tasks.length > 0)
            .map(g => ({ ...g, tasks: g.tasks.sort(sortFn) }));
    }

    private _groupByDate(
        todos: TodoModel[],
        sortFn: (a: TodoModel, b: TodoModel) => number
    ): TaskGroup<TodoModel>[] {
        const groups = {
            overdue: { id: "overdue", label: "Overdue", tasks: [] as TodoModel[] },
            today: { id: "today", label: "Today", tasks: [] as TodoModel[] },
            tomorrow: { id: "tomorrow", label: "Tomorrow", tasks: [] as TodoModel[] },
            upcoming: { id: "upcoming", label: "Upcoming", tasks: [] as TodoModel[] },
            noDate: { id: "noDate", label: "No Date", tasks: [] as TodoModel[] },
        };

        todos.forEach(t => {
            if (!t.dueAt) {
                groups.noDate.tasks.push(t);
            } else if (isOverdue(t.dueAt) && !isToday(t.dueAt)) {
                groups.overdue.tasks.push(t);
            } else if (isToday(t.dueAt)) {
                groups.today.tasks.push(t);
            } else if (isTomorrow(t.dueAt)) {
                groups.tomorrow.tasks.push(t);
            } else {
                groups.upcoming.tasks.push(t);
            }
        });

        return [groups.overdue, groups.today, groups.tomorrow, groups.upcoming, groups.noDate]
            .filter(g => g.tasks.length > 0)
            .map(g => ({ ...g, tasks: g.tasks.sort(sortFn) }));
    }

    private _loadConfig(): void {
        if (typeof localStorage === "undefined") return;

        try {
            const stored = localStorage.getItem(DISPLAY_CONFIG_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                this._config = { ...DEFAULT_DISPLAY_CONFIG, ...parsed };
            }
        } catch (e) {
            console.error("Failed to load display config", e);
        }
    }

    private _saveConfig(): void {
        if (typeof localStorage === "undefined") return;

        try {
            localStorage.setItem(DISPLAY_CONFIG_KEY, JSON.stringify(this._config));
        } catch (e) {
            console.error("Failed to save display config", e);
        }
    }
}
