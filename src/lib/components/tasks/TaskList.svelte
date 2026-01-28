<!--
  Renders and manages a collection of TaskItems with drag-and-drop support.
-->
<script lang="ts">
    import { flip } from "svelte/animate";
    import { fade, fly } from "svelte/transition";
    import { quintOut } from "svelte/easing";
    import { uiStore } from "$lib/stores/ui.svelte";
    import TaskItem from "./TaskItem.svelte";
    import EmptyState from "$lib/components/ui/EmptyState.svelte";
    import { getTodoStore } from "$lib/context";

    interface Props {
        class?: string;
        onEdit?: (id: string) => void;
        selectedTaskId?: string | null;
    }

    let {
        class: className = "",
        onEdit = () => {},
        selectedTaskId = null,
    }: Props = $props();

    const todoList = getTodoStore();

    const activeTodos = $derived(todoList.activeTodos);
    const hasActiveTodos = $derived(activeTodos.length > 0);
    const groupedTasks = $derived(todoList.groupedTasks);
    const displayConfig = $derived(todoList.displayConfig);

    // Allow drag if sorting by position (custom), regardless of grouping
    const canDrag = $derived(displayConfig.sortBy === "position");
    const isLoading = $derived(todoList.loading);

    let draggedId = $state<string | null>(null);
    let dragOverId = $state<string | null>(null);
    let dragStartIndex = $state<number>(-1);

    function handleEdit(id: string) {
        onEdit(id);
    }

    function handleDragStart(
        event: DragEvent,
        id: string,
        index: number,
    ): void {
        if (!event.dataTransfer) return;
        draggedId = id;
        dragStartIndex = index;
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", id);
        setTimeout(() => {
            const target = event.target as HTMLElement;
            target.style.opacity = "0.5";
        }, 0);
    }

    function handleDragEnd(event: DragEvent): void {
        const target = event.target as HTMLElement;
        target.style.opacity = "1";
        draggedId = null;
        dragOverId = null;
        dragStartIndex = -1;
    }

    function handleDragOver(event: DragEvent, id: string): void {
        event.preventDefault();
        if (!event.dataTransfer) return;
        event.dataTransfer.dropEffect = "move";
        dragOverId = id;
    }

    function handleDragLeave(): void {
        dragOverId = null;
    }

    function handleDrop(event: DragEvent, targetId: string): void {
        event.preventDefault();
        if (draggedId && draggedId !== targetId) {
            todoList.move(draggedId, targetId);
        }
        draggedId = null;
        dragOverId = null;
        dragStartIndex = -1;
    }
</script>

<section class="w-full {className}" aria-label="Active tasks">
    {#if isLoading}
        <div class="flex flex-col gap-3">
            {#each [1, 2, 3] as i}
                <div
                    class="h-16 md:h-20 rounded-2xl bg-base-200/50 animate-pulse"
                    style="animation-delay: {i * 100}ms"
                ></div>
            {/each}
        </div>
    {:else if !hasActiveTodos}
        <EmptyState />
    {:else}
        <div class="flex flex-col gap-6" role="list">
            {#each groupedTasks as group (group.id)}
                <div class="flex flex-col gap-2">
                    {#if displayConfig.groupBy !== "none"}
                        <h3
                            class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-1 flex items-center gap-2"
                        >
                            {group.label}
                            <span
                                class="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded-full font-normal"
                            >
                                {group.tasks.length}
                            </span>
                        </h3>
                    {/if}

                    <div class="flex flex-col gap-2 md:gap-3">
                        {#each group.tasks as todo, index (todo.id)}
                            <div
                                animate:flip={{
                                    duration: 300,
                                    easing: quintOut,
                                }}
                                in:fly={{
                                    y: 20,
                                    duration: 300,
                                    delay: Math.min(index * 50, 200),
                                    easing: quintOut,
                                }}
                                out:fade={{ duration: 150 }}
                                draggable={canDrag}
                                ondragstart={(e) =>
                                    canDrag &&
                                    handleDragStart(e, todo.id, index)}
                                ondragend={handleDragEnd}
                                ondragover={(e) =>
                                    canDrag && handleDragOver(e, todo.id)}
                                ondragleave={handleDragLeave}
                                ondrop={(e) =>
                                    canDrag && handleDrop(e, todo.id)}
                                class="
                                    transition-transform
                                    {dragOverId === todo.id &&
                                draggedId !== todo.id &&
                                canDrag
                                    ? 'translate-y-1'
                                    : ''}
                                "
                                role="listitem"
                            >
                                <TaskItem
                                    {todo}
                                    {index}
                                    isDragging={draggedId === todo.id}
                                    isSelected={selectedTaskId === todo.id}
                                    onEdit={handleEdit}
                                />
                            </div>
                        {/each}
                    </div>
                </div>
            {/each}
        </div>

        <div class="mt-4 flex justify-center">
            <p class="text-xs text-neutral/40 font-medium">
                {activeTodos.length}
                {activeTodos.length === 1 ? "task" : "tasks"} remaining
            </p>
        </div>
    {/if}
</section>
