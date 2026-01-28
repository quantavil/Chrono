<!--
  Interactive timer control for logging and tracking time spent on individual tasks.
-->
<script lang="ts">
    import { Play, Pause } from "lucide-svelte";
    import type { TodoItem } from "$lib/stores/todo.svelte";
    import { getTodoStore } from "$lib/context";
    import { PRIORITY_CONFIG } from "$lib/types";

    interface Props {
        todo: TodoItem;
    }

    const todoList = getTodoStore();
    let { todo }: Props = $props();

    const isRunning = $derived(todo.isRunning);
    const isCompleted = $derived(todo.isCompleted);
    const hasTime = $derived(todo.currentTimeMs > 0);
    const timerDisplay = $derived(todo.timerDisplay);

    const currentPriority = $derived(todo.priority || "none");
    const currentConfig = $derived(PRIORITY_CONFIG[currentPriority]);
    const currentPriorityColor = $derived(
        `var(--color-${currentConfig.color})`,
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
        ? `background: ${currentPriorityColor}; box-shadow: 0 4px 20px var(--color-${currentConfig.color} / 0.4);`
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
