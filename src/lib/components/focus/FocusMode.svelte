<script lang="ts">
    import { fade, blur, fly } from "svelte/transition";
    import { todoList } from "$lib/stores/todo.svelte";
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

    interface Props {
        onClose: () => void;
    }

    let { onClose }: Props = $props();

    // Derived State
    const currentTask = $derived(todoList.runningTodo);
    const hasActiveTask = $derived(!!currentTask);

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
    class="fixed inset-0 z-50 bg-base-100 flex flex-col transition-all duration-500 will-change-transform"
    in:fade={{ duration: 300 }}
    out:fade={{ duration: 300 }}
>
    <!-- Background Gradient (Ambient) -->
    <div
        class="absolute inset-0 overflow-hidden pointer-events-none opacity-30"
    >
        <div
            class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-tr from-primary/20 to-secondary/20 rounded-full blur-[120px] animate-pulse-slow"
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
        class="flex-1 flex flex-col items-center justify-center relative z-10 p-8 text-center max-w-2xl mx-auto w-full"
    >
        {#if currentTask}
            <div in:fly={{ y: 20, duration: 400 }} class="space-y-12 w-full">
                <!-- Status Pill -->
                <div
                    class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary font-bold text-sm uppercase tracking-widest animate-fade-in"
                >
                    <span class="relative flex h-2.5 w-2.5">
                        <span
                            class="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"
                        ></span>
                        <span
                            class="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"
                        ></span>
                    </span>
                    Focusing
                </div>

                <!-- Task Title -->
                <div class="space-y-4">
                    <h1
                        class="text-4xl md:text-5xl lg:text-6xl font-bold font-display text-neutral leading-tight break-words"
                    >
                        {currentTask.title}
                    </h1>
                    {#if currentTask.notes}
                        <p
                            class="text-xl text-neutral/50 max-w-lg mx-auto line-clamp-2"
                        >
                            {currentTask.notes.replace(/<[^>]*>?/gm, "")}
                            <!-- Strip HTML roughly for preview -->
                        </p>
                    {/if}
                </div>

                <!-- Timer Display -->
                <div class="py-8">
                    <div
                        class="text-[8rem] md:text-[10rem] font-bold font-mono tracking-tighter leading-none text-neutral tabular-nums select-none"
                    >
                        {currentTask.timerDisplay.formatted}
                    </div>
                    <p class="text-neutral/40 font-medium text-lg mt-2">
                        Total tracked time
                    </p>
                </div>

                <!-- Controls -->
                <div class="flex items-center justify-center gap-6">
                    <button
                        class="p-6 rounded-3xl bg-base-200 text-neutral/50 hover:bg-base-300 hover:text-neutral transition-all active:scale-95"
                        onclick={completeTask}
                        title="Mark Complete"
                    >
                        <CheckCircle2 class="w-8 h-8" />
                    </button>

                    <button
                        class="
                            w-32 h-32 rounded-[2.5rem]
                            flex items-center justify-center
                            bg-neutral text-base-100
                            shadow-2xl shadow-neutral/20
                            hover:scale-105 active:scale-95 transition-all duration-300
                        "
                        onclick={toggleTimer}
                    >
                        {#if currentTask.isRunning}
                            <Pause class="w-12 h-12 fill-current" />
                        {:else}
                            <Play
                                class="w-12 h-12 fill-current translate-x-1"
                            />
                        {/if}
                    </button>

                    <button
                        class="p-6 rounded-3xl bg-base-200 text-neutral/50 hover:bg-base-300 hover:text-neutral transition-all active:scale-95"
                        title="Skip / Finish Session"
                    >
                        <SkipForward class="w-8 h-8" />
                    </button>
                </div>
            </div>
        {:else}
            <!-- Empty State -->
            <div class="text-center space-y-4" in:fade>
                <h2 class="text-3xl font-bold text-neutral/50">
                    No active task
                </h2>
                <p class="text-neutral/40">
                    Select a task from your list to start focusing.
                </p>
                <button
                    class="px-6 py-3 bg-primary text-white rounded-xl font-bold shadow-lg hover:bg-primary-dark transition-all"
                    onclick={onClose}
                >
                    Go back to tasks
                </button>
            </div>
        {/if}
    </div>
</div>
