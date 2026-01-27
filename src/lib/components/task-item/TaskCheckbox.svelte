<script lang="ts">
    import { Check } from "lucide-svelte";
    import type { TodoItem } from "$lib/stores/todo.svelte";
    import { getTodoStore } from "$lib/context";

    interface Props {
        todo: TodoItem;
    }

    let { todo }: Props = $props();

    const todoList = getTodoStore();

    const isCompleted = $derived(todo.isCompleted);

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
        focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50
        {isCompleted
        ? 'bg-accent border-accent'
        : 'border-neutral-muted hover:border-primary hover:bg-primary-muted'}
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
