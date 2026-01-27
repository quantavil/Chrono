<script lang="ts">
    import { Play, Pause } from "lucide-svelte";
    import type { TodoItem } from "$lib/stores/todo.svelte";
    import { getTodoStore } from "$lib/context";

    interface Props {
        todo: TodoItem;
    }

    const todoList = getTodoStore();
    let { todo }: Props = $props();

    const isRunning = $derived(todo.isRunning);
    const isCompleted = $derived(todo.isCompleted);
    const hasTime = $derived(todo.currentTimeMs > 0);
    const timerDisplay = $derived(todo.timerDisplay);

    const liquidColors = {
        high: { solid: "#ef4444" },
        medium: { solid: "#f59e0b" },
        low: { solid: "#22c55e" },
    };

    const currentLiquidColor = $derived(
        liquidColors[todo.priority || "low"] || liquidColors.low,
    );

    function handleToggleTimer(): void {
        todoList.toggleTimer(todo.id);
    }
</script>

<button
    type="button"
    class="
        flex items-center gap-2
        px-4 py-2.5 rounded-xl
        font-mono text-sm md:text-base tabular-nums
        transition-all duration-300
        min-w-[110px] justify-center
        {isRunning
        ? 'text-white font-bold scale-105'
        : hasTime
          ? 'bg-base-200/80 text-neutral-light hover:bg-base-300'
          : 'text-neutral-muted hover:bg-base-200/80 border border-transparent'}
    "
    style="
        {isRunning
        ? `background: ${currentLiquidColor.solid}; box-shadow: 0 4px 20px ${currentLiquidColor.solid}60;`
        : ''}
    "
    onclick={(e) => {
        e.stopPropagation();
        handleToggleTimer();
    }}
    disabled={isCompleted}
    title={isRunning ? "Pause timer" : "Start timer"}
>
    {#if isRunning}
        <Pause class="w-4 h-4" strokeWidth={2.5} fill="currentColor" />
    {:else}
        <Play
            class="w-4 h-4"
            strokeWidth={2.5}
            fill={hasTime ? "currentColor" : "none"}
        />
    {/if}
    <span class="tracking-wider">{timerDisplay.formatted}</span>
</button>
