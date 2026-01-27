<script lang="ts">
    /**
     * TaskList Component
     * Renders active todos with flip animations and drag-to-reorder
     */

    import { flip } from "svelte/animate";
    import { fade, fly } from "svelte/transition";
    import { quintOut } from "svelte/easing";
    import TaskItem from "./TaskItem.svelte";
    import EmptyState from "./EmptyState.svelte";
    import { todoList } from "$lib/stores/todo.svelte";

    // -------------------------------------------------------------------------
    // Props
    // -------------------------------------------------------------------------

    interface Props {
        class?: string;
        onEdit?: (id: string) => void;
        selectedTaskId?: string | null;
    }

    let {
        class: className = "",
        onEdit,
        selectedTaskId = null,
    }: Props = $props();

    // -------------------------------------------------------------------------
    // Derived State
    // -------------------------------------------------------------------------

    const activeTodos = $derived(todoList.activeTodos);
    const hasActiveTodos = $derived(activeTodos.length > 0);
    const isLoading = $derived(todoList.loading);

    // -------------------------------------------------------------------------
    // Drag and Drop State
    // -------------------------------------------------------------------------

    let draggedId = $state<string | null>(null);
    let dragOverId = $state<string | null>(null);
    let dragStartIndex = $state<number>(-1);

    function handleEdit(id: string) {
        if (onEdit) onEdit(id);
    }

    // -------------------------------------------------------------------------
    // Drag Handlers
    // -------------------------------------------------------------------------

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

        // Add slight delay for visual feedback
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

    function handleDrop(event: DragEvent, targetIndex: number): void {
        event.preventDefault();

        if (dragStartIndex >= 0 && dragStartIndex !== targetIndex) {
            todoList.reorder(dragStartIndex, targetIndex);
        }

        draggedId = null;
        dragOverId = null;
        dragStartIndex = -1;
    }

    // -------------------------------------------------------------------------
    // Touch Drag Support (Mobile)
    // -------------------------------------------------------------------------

    let touchStartY = $state(0);
    let touchedId = $state<string | null>(null);

    function handleTouchStart(event: TouchEvent, id: string): void {
        const touch = event.touches[0];
        if (!touch) return;

        touchStartY = touch.clientY;
        touchedId = id;
    }

    function handleTouchEnd(): void {
        touchedId = null;
    }
</script>

<section class="w-full {className}" aria-label="Active tasks">
    {#if isLoading}
        <!-- Loading State -->
        <div class="flex flex-col gap-3">
            {#each [1, 2, 3] as i}
                <div
                    class="h-16 md:h-20 rounded-2xl md:rounded-3xl bg-base-200/50 animate-pulse"
                    style="animation-delay: {i * 100}ms"
                ></div>
            {/each}
        </div>
    {:else if !hasActiveTodos}
        <!-- Empty State -->
        <EmptyState />
    {:else}
        <!-- Task List -->
        <div
            class="flex flex-col gap-2 md:gap-3"
            role="list"
            aria-label="Active tasks list"
        >
            {#each activeTodos as todo, index (todo.id)}
                <div
                    animate:flip={{ duration: 300, easing: quintOut }}
                    in:fly={{
                        y: 20,
                        duration: 300,
                        delay: index * 50,
                        easing: quintOut,
                    }}
                    out:fade={{ duration: 150 }}
                    draggable="true"
                    ondragstart={(e) => handleDragStart(e, todo.id, index)}
                    ondragend={handleDragEnd}
                    ondragover={(e) => handleDragOver(e, todo.id)}
                    ondragleave={handleDragLeave}
                    ondrop={(e) => handleDrop(e, index)}
                    ontouchstart={(e) => handleTouchStart(e, todo.id)}
                    ontouchend={handleTouchEnd}
                    class="
            {dragOverId === todo.id && draggedId !== todo.id
                        ? 'transform translate-y-1 transition-transform'
                        : ''}
            {selectedTaskId === todo.id
                        ? 'ring-2 ring-primary ring-offset-2 ring-offset-base-200 rounded-xl'
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

        <!-- Task Count Footer -->
        <div class="mt-4 flex justify-center">
            <p class="text-xs text-neutral/40 font-medium">
                {activeTodos.length}
                {activeTodos.length === 1 ? "task" : "tasks"} remaining
            </p>
        </div>
    {/if}
</section>
