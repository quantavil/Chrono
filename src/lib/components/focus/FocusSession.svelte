<script lang="ts">
    import { fade, scale } from "svelte/transition";
    import {
        Minimize2,
        Pause,
        Play,
        Square,
        CheckCircle2,
        X,
        Maximize2,
    } from "lucide-svelte";
    import { getTodoStore } from "$lib/context";
    import { uiStore } from "$lib/stores/ui.svelte";

    const todoList = getTodoStore();

    // Get the currently running task, or the last one if we are paused inside focus mode?
    // Actually, focus mode implies we are focusing on *something*.
    // If we pause, we are still in focus mode until we exit.
    // So we should track the *active* task.
    // However, todoList.runningTodo might be null if paused.
    // But we usually enter focus mode for a specific task.
    // Let's use `uiStore.focusedTaskId` or derive it.
    // Better: FocusSession should probably lock onto the task that started it.
    // But for simplicity, let's look for the running task.
    // IF no task is running, does the Focus Mode close?
    // "when user exist the will be still running" -> Exiting keeps it running.
    // If I stop the timer inside Focus Mode, should it close? Usually yes or go to "Select Task" state.
    // Let's assume Focus mode is bound to the task that was running when opened.

    // We can use a derived store for the task to display.
    // If todoList.runningTodo is null, we might show "Ready to Focus" or just the last focused task.
    // But simpler: Bind to `todoList.runningTodo`. If null, show a placeholder or close?
    // If I pause in focus mode, `runningTodo` becomes null. The UI would disappear or break if I rely only on `runningTodo`.
    // Be careful. `todo.startTime` is nullified on pause? No, `isRunning` connects to `runningTodo`.
    // I need the task object even if paused.

    // Let's find the task that *was* running or is currently selected.
    // We can iterate `todoList.activeTodos` and find the one that has `accumulated_time` changing? No.
    // Let's use `todoList.activeTodos` and find the one with `isRunning`.
    // If none are running (paused), we should probably stay on the task that *was* active.
    // How do we know which one?
    // Maybe `uiStore.focusedTaskId`?

    // Alternative: `FocusSession` takes a `taskId` prop? No, it's a global overlay.
    // Let's make `uiStore.focusModeTaskId` to track which task we are focusing on.

    let activeTask = $derived(
        uiStore.focusedTaskId
            ? todoList.getById(uiStore.focusedTaskId)
            : todoList.runningTodo,
    );

    // Start/Stop handlers
    function toggleTimer() {
        if (activeTask) {
            todoList.toggleTimer(activeTask.id);
        }
    }

    function stopFocus() {
        if (activeTask?.isRunning) {
            todoList.pauseTimer(activeTask.id);
        }
        uiStore.isFocusModeActive = false;
    }

    function minimize() {
        // Just hide the UI, keep timer running
        uiStore.isFocusModeActive = false;
    }

    function completeTask() {
        if (activeTask) {
            todoList.toggleComplete(activeTask.id);
            // If we complete, we should probably close focus mode or ask for next task
            // For now, close it.
            uiStore.isFocusModeActive = false;
        }
    }

    // Colors based on priority?
    // We can reuse the priority config colors if we want, or stick to a clean dark/glass theme.
</script>

{#if activeTask}
    <div
        class="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-base-100/95 backdrop-blur-3xl transition-all duration-500"
        in:fade={{ duration: 300 }}
        out:fade={{ duration: 300 }}
    >
        <!-- Background Ambient Blobs -->
        <div class="absolute inset-0 overflow-hidden pointer-events-none -z-10">
            <div
                class="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] animate-pulse-slow"
            ></div>
            <div
                class="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-secondary/20 rounded-full blur-[120px] animate-pulse-slow"
                style="animation-delay: 1s;"
            ></div>
        </div>

        <!-- Top Bar -->
        <div
            class="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-20"
        >
            <div class="flex items-center gap-2 text-neutral/50">
                <div
                    class="w-2 h-2 rounded-full bg-primary/50 animate-pulse"
                ></div>
                <span class="text-sm font-medium tracking-widest uppercase"
                    >Focus Mode</span
                >
            </div>
            <button
                class="btn btn-circle btn-ghost text-neutral/60 hover:text-neutral hover:bg-neutral/10"
                onclick={minimize}
                title="Minimize (Keep running)"
            >
                <Minimize2 class="w-5 h-5" />
            </button>
        </div>

        <!-- Main Content -->
        <div
            class="flex flex-col items-center max-w-4xl w-full px-6 text-center z-10"
            in:scale={{ start: 0.95, duration: 400 }}
        >
            <!-- Tags (if any) -->
            {#if activeTask.tags.length > 0}
                <div class="flex gap-2 mb-8 flex-wrap justify-center">
                    {#each activeTask.tags as tag}
                        <span
                            class="px-3 py-1 rounded-full bg-base-300/50 text-neutral/60 text-sm font-medium border border-white/5"
                        >
                            #{tag}
                        </span>
                    {/each}
                </div>
            {/if}

            <!-- Task Title -->
            <h1
                class="text-4xl md:text-5xl lg:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-neutral to-neutral/60 mb-12 leading-tight tracking-tight"
            >
                {activeTask.title}
            </h1>

            <!-- Timer Display -->
            <div class="relative group cursor-default mb-16">
                <div
                    class="text-[8rem] md:text-[12rem] leading-none font-mono font-bold tracking-tighter tabular-nums text-primary drop-shadow-2xl transition-all duration-300 group-hover:scale-105"
                >
                    {activeTask.timerDisplay.formatted}
                </div>
                {#if activeTask.isRunning}
                    <div
                        class="absolute -bottom-4 left-1/2 -translate-x-1/2 text-sm font-medium text-primary/50 tracking-widest uppercase animate-pulse"
                    >
                        Running
                    </div>
                {:else}
                    <div
                        class="absolute -bottom-4 left-1/2 -translate-x-1/2 text-sm font-medium text-neutral/30 tracking-widest uppercase"
                    >
                        Paused
                    </div>
                {/if}
            </div>

            <!-- Controls -->
            <div class="flex items-center gap-6 md:gap-8">
                <button
                    class="group flex flex-col items-center gap-2"
                    onclick={stopFocus}
                    title="Stop Session"
                >
                    <div
                        class="w-14 h-14 rounded-2xl bg-base-200 border border-base-300 flex items-center justify-center text-neutral/60 transition-all duration-300 group-hover:border-error/30 group-hover:bg-error/10 group-hover:text-error shadow-lg"
                    >
                        <Square class="w-5 h-5 fill-current" />
                    </div>
                    <span
                        class="text-xs font-medium text-neutral/40 group-hover:text-error transition-colors"
                        >Stop</span
                    >
                </button>

                <!-- Play/Pause (Primary) -->
                <button
                    class="group flex flex-col items-center gap-3"
                    onclick={toggleTimer}
                >
                    <div
                        class="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white shadow-2xl shadow-primary/25 transition-all duration-300 hover:scale-110 hover:shadow-primary/40 active:scale-95"
                    >
                        {#if activeTask.isRunning}
                            <Pause class="w-10 h-10 fill-current" />
                        {:else}
                            <Play class="w-10 h-10 fill-current ml-1" />
                        {/if}
                    </div>
                </button>

                <button
                    class="group flex flex-col items-center gap-2"
                    onclick={completeTask}
                    title="Complete Task"
                >
                    <div
                        class="w-14 h-14 rounded-2xl bg-base-200 border border-base-300 flex items-center justify-center text-neutral/60 transition-all duration-300 group-hover:border-emerald-500/30 group-hover:bg-emerald-500/10 group-hover:text-emerald-500 shadow-lg"
                    >
                        <CheckCircle2 class="w-6 h-6" />
                    </div>
                    <span
                        class="text-xs font-medium text-neutral/40 group-hover:text-emerald-500 transition-colors"
                        >Done</span
                    >
                </button>
            </div>
        </div>

        <!-- Footer / Quote / Subtitles -->
        <div class="absolute bottom-8 text-neutral/30 text-sm font-medium">
            Stay focused. One element at a time.
        </div>
    </div>
{/if}

<style>
    /* Custom slow pulse for background blobs */
    @keyframes pulse-slow {
        0%,
        100% {
            opacity: 0.5;
            transform: scale(1);
        }
        50% {
            opacity: 0.8;
            transform: scale(1.1);
        }
    }
    .animate-pulse-slow {
        animation: pulse-slow 8s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }
</style>
