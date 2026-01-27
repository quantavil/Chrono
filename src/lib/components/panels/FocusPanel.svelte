<script lang="ts">
    import { fade, fly, scale } from "svelte/transition";
    import { quintOut, elasticOut } from "svelte/easing";
    import {
        Pause,
        Play,
        RotateCcw,
        CheckCircle,
        Coffee,
        Target,
        Flame,
        Volume2,
        VolumeX,
        Maximize2,
        SkipForward,
    } from "lucide-svelte";
    import type { TodoItem } from "$lib/stores/todo.svelte";
    import { todoList } from "$lib/stores/todo.svelte";
    import { onMount } from "svelte";

    interface Props {
        task: TodoItem;
        class?: string;
    }

    let { task, class: className = "" }: Props = $props();

    // -------------------------------------------------------------------------
    // Pomodoro State
    // -------------------------------------------------------------------------

    const POMODORO_WORK = 25 * 60 * 1000; // 25 minutes
    const POMODORO_BREAK = 5 * 60 * 1000; // 5 minutes
    const POMODORO_LONG_BREAK = 15 * 60 * 1000; // 15 minutes

    let sessionCount = $state(0);
    let isBreak = $state(false);
    let soundEnabled = $state(true);

    // -------------------------------------------------------------------------
    // Derived
    // -------------------------------------------------------------------------

    const isRunning = $derived(task.isRunning);
    const currentTime = $derived(task.currentTimeMs);
    const timerDisplay = $derived(task.timerDisplay);

    // Calculate session progress (every 25 min = 1 session)
    const sessionsCompleted = $derived(Math.floor(currentTime / POMODORO_WORK));

    // Time until next break
    const timeInCurrentSession = $derived(currentTime % POMODORO_WORK);
    const timeUntilBreak = $derived(POMODORO_WORK - timeInCurrentSession);
    const minutesUntilBreak = $derived(Math.ceil(timeUntilBreak / 60000));

    // Progress ring calculation
    const progressPercent = $derived(
        (timeInCurrentSession / POMODORO_WORK) * 100,
    );
    const circumference = 2 * Math.PI * 120;
    const strokeDashoffset = $derived(
        circumference - (circumference * progressPercent) / 100,
    );

    // -------------------------------------------------------------------------
    // Handlers
    // -------------------------------------------------------------------------

    function handleToggleTimer(): void {
        todoList.toggleTimer(task.id);
    }

    function handleResetTimer(): void {
        if (confirm("Reset timer to 0:00?")) {
            todoList.resetTimer(task.id);
        }
    }

    function handleComplete(): void {
        todoList.toggleComplete(task.id);
    }

    function handleSkipToBreak(): void {
        // This would trigger a break - for now just pause
        todoList.toggleTimer(task.id);
    }

    // -------------------------------------------------------------------------
    // Sound Effects (placeholder)
    // -------------------------------------------------------------------------

    function playSound(type: "start" | "pause" | "complete"): void {
        if (!soundEnabled) return;
        // Add actual sound implementation
    }

    // -------------------------------------------------------------------------
    // Animation Tick
    // -------------------------------------------------------------------------

    let pulseScale = $state(1);

    onMount(() => {
        const interval = setInterval(() => {
            if (isRunning) {
                pulseScale = pulseScale === 1 ? 1.02 : 1;
            }
        }, 1000);

        return () => clearInterval(interval);
    });
</script>

<div
    class="
    h-full flex flex-col
    bg-gradient-to-b from-primary/5 via-base-100 to-base-100
    {className}
  "
>
    <!-- Header -->
    <div class="flex items-center justify-between p-4">
        <div class="flex items-center gap-2">
            <div class="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
            <span class="text-sm font-semibold text-primary">Focus Mode</span>
        </div>

        <div class="flex items-center gap-1">
            <button
                type="button"
                class="p-2 rounded-xl text-neutral/40 hover:text-neutral hover:bg-base-200 transition-colors"
                onclick={() => (soundEnabled = !soundEnabled)}
                title={soundEnabled ? "Mute sounds" : "Enable sounds"}
            >
                {#if soundEnabled}
                    <Volume2 class="w-4 h-4" />
                {:else}
                    <VolumeX class="w-4 h-4" />
                {/if}
            </button>
        </div>
    </div>

    <!-- Main Timer Area -->
    <div class="flex-1 flex flex-col items-center justify-center px-8">
        <!-- Session Indicators -->
        <div
            class="flex items-center gap-2 mb-8"
            in:fly={{ y: -20, duration: 400 }}
        >
            {#each Array(4) as _, i}
                <div
                    class="
            w-3 h-3 rounded-full
            transition-all duration-300
            {i < sessionsCompleted
                        ? 'bg-accent scale-100'
                        : i === sessionsCompleted
                          ? 'bg-primary/50 scale-110 animate-pulse'
                          : 'bg-base-300'}
          "
                ></div>
            {/each}
            <span class="text-xs text-neutral/40 ml-2">
                {sessionsCompleted}/4 sessions
            </span>
        </div>

        <!-- Giant Timer Ring -->
        <div
            class="relative mb-8"
            style="transform: scale({pulseScale}); transition: transform 0.5s ease-out"
            in:scale={{ duration: 500, easing: elasticOut, start: 0.8 }}
        >
            <!-- SVG Ring -->
            <svg class="w-64 h-64 -rotate-90" viewBox="0 0 260 260">
                <!-- Background Ring -->
                <circle
                    cx="130"
                    cy="130"
                    r="120"
                    class="fill-none stroke-base-200"
                    stroke-width="8"
                />
                <!-- Progress Ring -->
                <circle
                    cx="130"
                    cy="130"
                    r="120"
                    class="fill-none stroke-primary transition-all duration-1000 ease-linear"
                    stroke-width="8"
                    stroke-linecap="round"
                    stroke-dasharray={circumference}
                    stroke-dashoffset={strokeDashoffset}
                />
                <!-- Glow Effect -->
                <circle
                    cx="130"
                    cy="130"
                    r="120"
                    class="fill-none stroke-primary/20 blur-sm"
                    stroke-width="12"
                    stroke-dasharray={circumference}
                    stroke-dashoffset={strokeDashoffset}
                />
            </svg>

            <!-- Timer Display -->
            <div
                class="absolute inset-0 flex flex-col items-center justify-center"
            >
                <span
                    class="
            text-6xl font-mono font-bold tabular-nums
            {isRunning ? 'text-primary' : 'text-neutral'}
          "
                >
                    {timerDisplay.formatted}
                </span>
                <span class="text-sm text-neutral/40 mt-2">
                    {#if isRunning}
                        {isBreak ? "Break time" : "Stay focused"}
                    {:else}
                        Paused
                    {/if}
                </span>
            </div>
        </div>

        <!-- Task Title -->
        <div
            class="text-center mb-8 max-w-xs"
            in:fly={{ y: 20, duration: 400, delay: 100 }}
        >
            <h2 class="text-xl font-bold text-neutral mb-2 line-clamp-2">
                {task.title}
            </h2>

            <!-- Tags -->
            {#if task.tags.length > 0}
                <div class="flex flex-wrap justify-center gap-2">
                    {#each task.tags as tag}
                        <span
                            class="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium"
                        >
                            {tag}
                        </span>
                    {/each}
                </div>
            {/if}
        </div>

        <!-- Controls -->
        <div
            class="flex items-center gap-4"
            in:fly={{ y: 20, duration: 400, delay: 200 }}
        >
            <!-- Reset -->
            <button
                type="button"
                class="
          w-14 h-14 rounded-2xl
          bg-base-200 hover:bg-base-300
          flex items-center justify-center
          transition-all active:scale-95
          group
        "
                onclick={handleResetTimer}
                title="Reset timer"
            >
                <RotateCcw
                    class="w-5 h-5 text-neutral/60 group-hover:text-neutral"
                />
            </button>

            <!-- Play/Pause -->
            <button
                type="button"
                class="
          w-20 h-20 rounded-3xl
          flex items-center justify-center
          transition-all active:scale-95
          {isRunning
                    ? 'bg-primary shadow-xl shadow-primary/30 hover:bg-primary-dark'
                    : 'bg-primary shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30'}
        "
                onclick={handleToggleTimer}
            >
                {#if isRunning}
                    <Pause class="w-8 h-8 text-white" fill="white" />
                {:else}
                    <Play class="w-8 h-8 text-white ml-1" fill="white" />
                {/if}
            </button>

            <!-- Complete -->
            <button
                type="button"
                class="
          w-14 h-14 rounded-2xl
          bg-accent/10 hover:bg-accent
          flex items-center justify-center
          transition-all active:scale-95
          group
        "
                onclick={handleComplete}
                title="Mark complete"
            >
                <CheckCircle
                    class="w-5 h-5 text-accent group-hover:text-white"
                />
            </button>
        </div>
    </div>

    <!-- Bottom Stats Bar -->
    <div class="p-6 border-t border-base-200 bg-base-100/80 backdrop-blur-sm">
        <div class="flex items-center justify-between">
            <!-- Break Reminder -->
            <div class="flex items-center gap-2 text-sm text-neutral/50">
                <Coffee class="w-4 h-4" />
                <span>
                    {#if minutesUntilBreak <= 5 && isRunning}
                        <span class="text-accent font-medium">Break soon!</span>
                    {:else}
                        Break in {minutesUntilBreak}m
                    {/if}
                </span>
            </div>

            <!-- Skip to Break -->
            <button
                type="button"
                class="
          flex items-center gap-1.5
          px-3 py-1.5 rounded-lg
          text-xs font-medium
          text-neutral/40 hover:text-neutral hover:bg-base-200
          transition-colors
        "
                onclick={handleSkipToBreak}
            >
                <SkipForward class="w-3.5 h-3.5" />
                Take a break
            </button>
        </div>

        <!-- Quick Stats -->
        <div
            class="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-base-200"
        >
            <div class="text-center">
                <p
                    class="text-2xl font-bold font-mono tabular-nums text-neutral"
                >
                    {timerDisplay.formatted}
                </p>
                <p class="text-[10px] text-neutral/40 uppercase tracking-wide">
                    Total Today
                </p>
            </div>
            <div class="w-px h-8 bg-base-300"></div>
            <div class="text-center">
                <p class="text-2xl font-bold tabular-nums text-neutral">
                    {sessionsCompleted}
                </p>
                <p class="text-[10px] text-neutral/40 uppercase tracking-wide">
                    Sessions
                </p>
            </div>
            <div class="w-px h-8 bg-base-300"></div>
            <div class="text-center">
                <p
                    class="text-2xl font-bold text-accent flex items-center gap-1"
                >
                    <Flame class="w-5 h-5" />
                </p>
                <p class="text-[10px] text-neutral/40 uppercase tracking-wide">
                    On Fire
                </p>
            </div>
        </div>
    </div>
</div>
