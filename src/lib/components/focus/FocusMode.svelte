<script lang="ts">
    import { fade, blur, fly } from "svelte/transition";
    import { getTodoStore } from "$lib/context";
    import { formatTimeCompact } from "$lib/utils/formatTime";
    import {
        Play,
        Pause,
        SkipForward,
        Minimize2,
        CheckCircle2,
        MoreVertical,
        ArrowLeft,
    } from "lucide-svelte";
    import { onMount } from "svelte";
    import { PRIORITY_CONFIG } from "$lib/types";

    interface Props {
        onClose: () => void;
    }

    let { onClose }: Props = $props();

    const todoList = getTodoStore();

    // Derived State
    const currentTask = $derived(todoList.runningTodo);
    const hasActiveTask = $derived(!!currentTask);
    const activeTasks = $derived(todoList.activeTodos);

    // Local State
    let isMinimized = $state(false);

    // If no task is running, we might want to prompt user to pick one
    // But for MVP, if no task is running, we show a "Select a task" state or just close?
    // Let's assume this view is only opened when the user wants to focus.

    // Handlers
    function toggleTimer() {
        if (currentTask) {
            currentTask.toggleTimer();
        }
    }

    function completeTask() {
        if (currentTask) {
            todoList.toggleComplete(currentTask.id);
            // If we complete the task, do we exit focus mode?
            // Maybe. Or we stay to pick next.
            // For now, let's close after a delay?
            setTimeout(onClose, 500);
        }
    }

    function handleKeydown(e: KeyboardEvent) {
        if (e.key === "Escape") onClose();
        if (e.code === "Space") {
            // Only toggle if not typing in an input (though there are none here yet)
            e.preventDefault();
            toggleTimer();
        }
    }
</script>

<svelte:window onkeydown={handleKeydown} />

<div
    class="fixed inset-0 z-50 bg-[#0A0A0B] text-white flex flex-col transition-all duration-700 ease-out will-change-transform font-sans"
    in:fly={{ y: 20, duration: 400, opacity: 0 }}
    out:fade={{ duration: 300 }}
>
    <!-- Background Gradient (Ambient Cinematic) -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
        <div
            class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100vw] h-[100vw] max-w-[1200px] max-h-[1200px] bg-gradient-to-tr from-primary/10 via-secondary/5 to-accent/5 rounded-full blur-[150px] animate-pulse-slow opacity-60"
        ></div>
        <div
            class="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay"
        ></div>
    </div>

    <!-- Header Toolbar -->
    <div class="relative z-10 flex items-center justify-between p-6">
        <button
            class="p-2 rounded-xl text-neutral/50 hover:bg-base-200 hover:text-neutral transition-colors"
            onclick={onClose}
            title="Exit Focus Mode (Esc)"
        >
            <ArrowLeft class="w-6 h-6" />
        </button>

        <div class="flex items-center gap-2">
            <button
                class="p-2 rounded-xl text-neutral/50 hover:bg-base-200 transition-colors"
            >
                <Minimize2 class="w-5 h-5" />
            </button>
            <button
                class="p-2 rounded-xl text-neutral/50 hover:bg-base-200 transition-colors"
            >
                <MoreVertical class="w-5 h-5" />
            </button>
        </div>
    </div>

    <!-- Main Content -->
    <div
        class="flex-1 flex flex-col items-center justify-center relative z-10 p-8 text-center max-w-4xl mx-auto w-full"
    >
        {#if currentTask}
            <div
                in:fly={{ y: 30, duration: 600, delay: 100 }}
                class="space-y-12 w-full max-w-2xl mx-auto"
            >
                <!-- Status Pill -->
                <div
                    class="
                        inline-flex items-center gap-3 px-5 py-2.5 rounded-full
                        bg-white/5 border border-white/10 backdrop-blur-md
                        text-primary-light font-bold text-xs uppercase tracking-[0.2em] shadow-2xl
                        animate-fade-in
                    "
                >
                    <span class="relative flex h-2 w-2">
                        <span
                            class="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"
                        ></span>
                        <span
                            class="relative inline-flex rounded-full h-2 w-2 bg-primary"
                        ></span>
                    </span>
                    Now Focusing
                </div>

                <!-- Task Title -->
                <div class="space-y-6">
                    <h1
                        class="text-5xl md:text-6xl lg:text-7xl font-bold font-display text-white leading-[1.1] tracking-tight text-shadow-lg"
                    >
                        {currentTask.title}
                    </h1>
                    {#if currentTask.notes}
                        <div
                            class="opacity-60 max-w-lg mx-auto text-lg leading-relaxed font-light"
                        >
                            {@html currentTask.notes}
                        </div>
                    {/if}
                </div>

                <!-- Timer Display -->
                <div class="py-10">
                    <div
                        class="text-[12rem] md:text-[14rem] font-bold font-mono tracking-tighter leading-none text-white tabular-nums select-none drop-shadow-2xl"
                    >
                        {currentTask.timerDisplay.formatted}
                    </div>
                    <p
                        class="text-white/30 font-medium text-lg mt-4 uppercase tracking-[0.2em]"
                    >
                        Session Time
                    </p>
                </div>

                <!-- Controls -->
                <div class="flex items-center justify-center gap-8">
                    <button
                        class="p-5 rounded-3xl bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 hover:text-white hover:border-white/20 transition-all active:scale-95 group"
                        onclick={completeTask}
                        title="Mark Complete"
                    >
                        <CheckCircle2
                            class="w-8 h-8 group-hover:text-accent transition-colors"
                        />
                    </button>

                    <button
                        class="
                            w-28 h-28 rounded-[2.5rem]
                            flex items-center justify-center
                            bg-white text-black
                            shadow-[0_0_40px_rgba(255,255,255,0.15)]
                            hover:scale-105 hover:shadow-[0_0_60px_rgba(255,255,255,0.25)]
                            active:scale-95 transition-all duration-300
                        "
                        onclick={toggleTimer}
                    >
                        {#if currentTask.isRunning}
                            <Pause class="w-10 h-10 fill-current" />
                        {:else}
                            <Play
                                class="w-10 h-10 fill-current translate-x-1"
                            />
                        {/if}
                    </button>

                    <button
                        class="p-5 rounded-3xl bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 hover:text-white hover:border-white/20 transition-all active:scale-95 group"
                        title="Skip / Finish Session"
                        onclick={onClose}
                    >
                        <SkipForward
                            class="w-8 h-8 group-hover:text-white transition-colors"
                        />
                    </button>
                </div>
            </div>
        {:else}
            <!-- Empty State Improved (Cinematic) -->
            <div class="text-center space-y-10 max-w-xl mx-auto w-full" in:fade>
                <div class="space-y-4">
                    <h2
                        class="text-4xl md:text-5xl font-bold text-white tracking-tight text-shadow-lg"
                    >
                        Ready to Focus?
                    </h2>
                    <p class="text-white/40 text-lg md:text-xl font-medium">
                        Select a task to start your deep work session.
                    </p>
                </div>

                <div
                    class="grid gap-3 w-full max-h-[50vh] overflow-y-auto px-2 scrollbar-hide"
                >
                    {#each activeTasks as task}
                        <button
                            class="
                                flex items-center justify-between p-5
                                bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10
                                rounded-[2rem] transition-all group
                                hover:translate-x-1 active:scale-[0.98]
                            "
                            onclick={() => todoList.startTimer(task.id)}
                        >
                            <div class="flex items-center gap-5 text-left">
                                <div
                                    class="w-3 h-3 rounded-full
                                    {task.priority === 'high'
                                        ? 'bg-danger shadow-[0_0_12px_rgba(var(--color-danger),0.6)]'
                                        : task.priority === 'medium'
                                          ? 'bg-warning shadow-[0_0_12px_rgba(var(--color-warning),0.4)]'
                                          : 'bg-success shadow-[0_0_12px_rgba(var(--color-success),0.4)]'}"
                                ></div>
                                <span
                                    class="font-bold text-lg text-white/80 group-hover:text-white transition-colors"
                                >
                                    {task.title}
                                </span>
                            </div>
                            <div
                                class="p-3 rounded-2xl bg-white/10 text-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <Play class="w-5 h-5 fill-current" />
                            </div>
                        </button>
                    {/each}

                    {#if activeTasks.length === 0}
                        <div
                            class="py-12 px-6 rounded-[2.5rem] border-2 border-dashed border-white/10 bg-white/5"
                        >
                            <p class="text-white/30 font-medium">
                                Your task list is empty.<br />Add a task to
                                start focusing.
                            </p>
                        </div>
                    {/if}
                </div>

                <button
                    class="text-white/30 hover:text-white font-bold uppercase tracking-widest text-sm transition-colors py-4 px-8"
                    onclick={onClose}
                >
                    Maybe Later
                </button>
            </div>
        {/if}
    </div>
</div>
