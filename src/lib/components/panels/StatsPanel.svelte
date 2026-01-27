<script lang="ts">
    import {
        Target,
        Clock,
        Flame,
        TrendingUp,
        Calendar,
        ChevronRight,
        Sparkles,
        CheckCircle2,
        Timer,
    } from "lucide-svelte";
    import { todoList } from "$lib/stores/todo.svelte";
    import {
        formatTimeCompact,
        formatRelativeDate,
    } from "$lib/utils/formatTime";
    import { fade, fly } from "svelte/transition";
    import { quintOut } from "svelte/easing";

    interface Props {
        onSelectTask: (id: string) => void;
        class?: string;
    }

    let { onSelectTask, class: className = "" }: Props = $props();

    // -------------------------------------------------------------------------
    // Derived State
    // -------------------------------------------------------------------------

    const stats = $derived(todoList.stats);
    const activeTodos = $derived(todoList.activeTodos);
    const completedTodos = $derived(todoList.completedTodos);

    const progress = $derived(
        stats.totalTasks > 0
            ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
            : 0,
    );

    const circumference = 2 * Math.PI * 70; // radius = 70
    const strokeDashoffset = $derived(
        circumference - (circumference * progress) / 100,
    );

    // Calculate streak (simplified - you'd want to persist this)
    const streak = $derived(completedTodos.length > 0 ? 1 : 0);

    // Get upcoming tasks (next 3 with due dates, or just first 3)
    const upcomingTasks = $derived(
        activeTodos.filter((t) => !t.isCompleted).slice(0, 4),
    );

    // Get tasks completed today
    const completedToday = $derived(
        completedTodos.filter((t) => {
            const completed = new Date(t.completedAt || t.updatedAt);
            const today = new Date();
            return completed.toDateString() === today.toDateString();
        }).length,
    );

    // Time of day greeting
    function getGreeting(): string {
        const hour = new Date().getHours();
        if (hour < 12) return "Good morning";
        if (hour < 17) return "Good afternoon";
        if (hour < 21) return "Good evening";
        return "Good night";
    }

    const greeting = $derived(getGreeting());
    const today = $derived(
        new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
        }),
    );
</script>

<div class="h-full flex flex-col {className}">
    <!-- Header -->
    <div class="p-6 border-b border-base-200">
        <div class="flex items-center gap-3 mb-1">
            <div
                class="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center"
            >
                <Sparkles class="w-5 h-5 text-white" />
            </div>
            <div>
                <h2 class="text-lg font-bold text-neutral">{greeting}</h2>
                <p class="text-sm text-neutral/50">{today}</p>
            </div>
        </div>
    </div>

    <!-- Scrollable Content -->
    <div class="flex-1 overflow-y-auto p-6 space-y-6">
        <!-- Progress Ring -->
        <div
            class="flex justify-center py-4"
            in:fly={{ y: 20, duration: 400, easing: quintOut }}
        >
            <div class="relative w-44 h-44">
                <!-- Background Ring -->
                <svg class="w-full h-full -rotate-90" viewBox="0 0 160 160">
                    <circle
                        cx="80"
                        cy="80"
                        r="70"
                        class="fill-none stroke-base-200"
                        stroke-width="10"
                    />
                    <!-- Progress Ring -->
                    <circle
                        cx="80"
                        cy="80"
                        r="70"
                        class="fill-none stroke-accent transition-all duration-700 ease-out"
                        stroke-width="10"
                        stroke-linecap="round"
                        stroke-dasharray={circumference}
                        stroke-dashoffset={strokeDashoffset}
                    />
                </svg>

                <!-- Center Content -->
                <div
                    class="absolute inset-0 flex flex-col items-center justify-center"
                >
                    <span class="text-5xl font-bold text-neutral tabular-nums"
                        >{progress}</span
                    >
                    <span class="text-sm text-neutral/50 font-medium"
                        >% complete</span
                    >
                </div>

                <!-- Decorative dots -->
                <div
                    class="absolute top-2 right-4 w-2 h-2 rounded-full bg-primary/30"
                ></div>
                <div
                    class="absolute bottom-4 left-2 w-1.5 h-1.5 rounded-full bg-secondary/30"
                ></div>
            </div>
        </div>

        <!-- Stats Grid -->
        <div
            class="grid grid-cols-2 gap-3"
            in:fly={{ y: 20, duration: 400, delay: 100, easing: quintOut }}
        >
            <!-- Tasks -->
            <div
                class="bg-base-200/50 hover:bg-base-200 rounded-2xl p-4 transition-colors group"
            >
                <div class="flex items-center gap-2 text-primary mb-2">
                    <Target
                        class="w-4 h-4 group-hover:scale-110 transition-transform"
                    />
                    <span class="text-xs font-bold uppercase tracking-wide"
                        >Tasks</span
                    >
                </div>
                <p class="text-2xl font-bold tabular-nums">
                    {stats.completedTasks}<span class="text-neutral/30"
                        >/{stats.totalTasks}</span
                    >
                </p>
            </div>

            <!-- Focus Time -->
            <div
                class="bg-base-200/50 hover:bg-base-200 rounded-2xl p-4 transition-colors group"
            >
                <div class="flex items-center gap-2 text-secondary mb-2">
                    <Clock
                        class="w-4 h-4 group-hover:scale-110 transition-transform"
                    />
                    <span class="text-xs font-bold uppercase tracking-wide"
                        >Focus</span
                    >
                </div>
                <p class="text-2xl font-bold font-mono tabular-nums">
                    {formatTimeCompact(stats.totalTimeMs)}
                </p>
            </div>

            <!-- Today's Completed -->
            <div
                class="bg-base-200/50 hover:bg-base-200 rounded-2xl p-4 transition-colors group"
            >
                <div class="flex items-center gap-2 text-accent mb-2">
                    <CheckCircle2
                        class="w-4 h-4 group-hover:scale-110 transition-transform"
                    />
                    <span class="text-xs font-bold uppercase tracking-wide"
                        >Today</span
                    >
                </div>
                <p class="text-2xl font-bold tabular-nums">
                    {completedToday}<span class="text-neutral/30 text-sm ml-1"
                        >done</span
                    >
                </p>
            </div>

            <!-- Streak -->
            <div
                class="bg-gradient-to-br from-amber-500/10 to-orange-500/10 hover:from-amber-500/20 hover:to-orange-500/20 rounded-2xl p-4 transition-colors group"
            >
                <div class="flex items-center gap-2 text-amber-500 mb-2">
                    <Flame
                        class="w-4 h-4 group-hover:scale-110 transition-transform"
                    />
                    <span class="text-xs font-bold uppercase tracking-wide"
                        >Streak</span
                    >
                </div>
                <div class="flex items-baseline gap-1">
                    <p class="text-2xl font-bold tabular-nums">{streak}</p>
                    <span class="text-neutral/50 text-sm">days</span>
                    {#if streak >= 7}
                        <span class="text-lg">🔥</span>
                    {/if}
                </div>
            </div>
        </div>

        <!-- Upcoming Tasks -->
        {#if upcomingTasks.length > 0}
            <div
                in:fly={{ y: 20, duration: 400, delay: 200, easing: quintOut }}
            >
                <div class="flex items-center justify-between mb-3">
                    <h3
                        class="text-sm font-bold text-neutral/70 flex items-center gap-2"
                    >
                        <Calendar class="w-4 h-4" />
                        Up Next
                    </h3>
                    <span class="text-xs text-neutral/40"
                        >{activeTodos.length} remaining</span
                    >
                </div>

                <div class="space-y-2">
                    {#each upcomingTasks as task, i}
                        <button
                            type="button"
                            class="
                w-full flex items-center gap-3
                p-3 rounded-xl
                bg-base-200/30 hover:bg-base-200/60
                border border-transparent hover:border-base-300
                text-left
                transition-all duration-200
                group
              "
                            onclick={() => onSelectTask(task.id)}
                            in:fly={{
                                x: -20,
                                duration: 300,
                                delay: 250 + i * 50,
                                easing: quintOut,
                            }}
                        >
                            <!-- Priority Indicator -->
                            <div
                                class="
                  w-2 h-2 rounded-full flex-shrink-0
                  {task.priority === 'high'
                                    ? 'bg-danger'
                                    : task.priority === 'medium'
                                      ? 'bg-warning'
                                      : task.priority === 'low'
                                        ? 'bg-info'
                                        : 'bg-primary'}
                "
                            ></div>

                            <!-- Task Info -->
                            <div class="flex-1 min-w-0">
                                <p
                                    class="text-sm font-medium text-neutral truncate group-hover:text-primary transition-colors"
                                >
                                    {task.title}
                                </p>
                                {#if task.dueAt}
                                    <p class="text-xs text-neutral/40">
                                        {formatRelativeDate(task.dueAt)}
                                    </p>
                                {/if}
                            </div>

                            <!-- Timer or Chevron -->
                            {#if task.currentTimeMs > 0}
                                <span
                                    class="text-xs font-mono text-neutral/40 tabular-nums"
                                >
                                    {task.timerDisplay.formatted}
                                </span>
                            {:else}
                                <ChevronRight
                                    class="w-4 h-4 text-neutral/20 group-hover:text-neutral/40 group-hover:translate-x-0.5 transition-all"
                                />
                            {/if}
                        </button>
                    {/each}
                </div>
            </div>
        {:else}
            <!-- Empty State -->
            <div class="text-center py-8" in:fade={{ duration: 300 }}>
                <div
                    class="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4"
                >
                    <CheckCircle2 class="w-8 h-8 text-accent" />
                </div>
                <h3 class="font-bold text-neutral mb-1">All caught up!</h3>
                <p class="text-sm text-neutral/50">
                    No tasks remaining. Enjoy your day!
                </p>
            </div>
        {/if}

        <!-- Motivational Quote or Tip -->
        <div
            class="bg-gradient-to-br from-primary/5 to-secondary/5 rounded-2xl p-4 border border-primary/10"
            in:fly={{ y: 20, duration: 400, delay: 300, easing: quintOut }}
        >
            <div class="flex items-start gap-3">
                <div
                    class="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0"
                >
                    <TrendingUp class="w-4 h-4 text-primary" />
                </div>
                <div>
                    <p class="text-sm text-neutral/70 italic">
                        "The secret of getting ahead is getting started."
                    </p>
                    <p class="text-xs text-neutral/40 mt-1">— Mark Twain</p>
                </div>
            </div>
        </div>
    </div>

    <!-- Footer: Quick Actions -->
    <div class="p-4 border-t border-base-200 bg-base-100/50">
        <div
            class="flex items-center justify-center gap-4 text-xs text-neutral/40"
        >
            <kbd class="px-2 py-1 rounded bg-base-200 font-mono">⌘K</kbd>
            <span>Quick add</span>
            <span class="text-neutral/20">•</span>
            <kbd class="px-2 py-1 rounded bg-base-200 font-mono">Esc</kbd>
            <span>Close panel</span>
        </div>
    </div>
</div>
