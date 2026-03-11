<!--
  Interactive completion checkbox optimized for task list interactions.
-->
<script lang="ts">
    import { Check } from "lucide-svelte";
    import type { TodoItem } from "$lib/stores/todo.svelte";
    import { getTodoStore } from "$lib/context";
    import { PRIORITY_CONFIG } from "$lib/types";

    interface Props {
        todo: TodoItem;
    }

    let { todo }: Props = $props();

    const todoList = getTodoStore();

    const isCompleted = $derived(todo.isCompleted);
    const priorityConfig = $derived(PRIORITY_CONFIG[todo.priority || "none"]);

    function handleToggleComplete(): void {
        todoList.toggleComplete(todo.id);
    }
</script>

<button
    type="button"
    class="
        relative flex-shrink-0
        w-5 h-5 md:w-6 md:h-6
        rounded-lg border-2
        transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-${priorityConfig.color}/50
        {isCompleted
        ? `bg-${priorityConfig.color} border-${priorityConfig.color}`
        : `border-neutral-muted hover:border-${priorityConfig.color} hover:bg-${priorityConfig.color}/10`}
    "
    onclick={(e) => {
        e.stopPropagation();
        handleToggleComplete();
    }}
    aria-label={isCompleted ? "Mark incomplete" : "Mark complete"}
>
    {#if isCompleted}
        <Check
            class="absolute inset-0 m-auto w-3 h-3 md:w-4 md:h-4 text-white"
            strokeWidth={3}
        />
    {/if}
</button>
