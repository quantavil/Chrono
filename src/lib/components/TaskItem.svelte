<script lang="ts">
    import {
        GripVertical,
        Calendar,
        FileText,
        CheckSquare,
        Clock,
        AlertCircle,
        Repeat,
        Trash2,
    } from "lucide-svelte";
    import type { TodoItem } from "$lib/stores/todo.svelte";
    import { getTodoStore } from "$lib/context";
    import { uiStore } from "$lib/stores/ui.svelte";
    import { formatRelativeDate } from "$lib/utils/formatTime";
    import { PRIORITY_CONFIG, TODO_TITLE_MAX_LENGTH } from "$lib/types";

    // Sub-components
    import TaskLiquid from "./task-item/TaskLiquid.svelte";
    import TaskCheckbox from "./task-item/TaskCheckbox.svelte";
    import TaskTimer from "./task-item/TaskTimer.svelte";
    import TaskActions from "./task-item/TaskActions.svelte";
    import TaskSubtasks from "./task-item/TaskSubtasks.svelte";

    interface Props {
        todo: TodoItem;
        index?: number;
        isDragging?: boolean;
        isSelected?: boolean;
        class?: string;
        onEdit?: (id: string, mode?: "content" | "settings") => void;
    }

    const todoList = getTodoStore();

    let {
        todo,
        index = 0,
        isDragging = false,
        isSelected = false,
        class: className = "",
        onEdit = () => {},
    }: Props = $props();

    let isSubtasksOpen = $state(false);
    let isEditing = $state(false);
    let editValue = $state("");
    let inputRef = $state<HTMLInputElement | null>(null);

    const isRunning = $derived(todo.isRunning);
    const isCompleted = $derived(todo.isCompleted);
    const isFocused = $derived(uiStore.focusedTaskId === todo.id);
    const hasNotes = $derived((todo.notes || "").trim().length > 0);
    const hasSubtasks = $derived(todo.subtasks.length > 0);
    const subtaskProgress = $derived(todo.subtaskProgress);

    const isOverdue = $derived(
        todo.dueAt && new Date(todo.dueAt) < new Date() && !isCompleted,
    );

    const currentPriority = $derived(todo.priority || "low");
    const currentConfig = $derived(PRIORITY_CONFIG[currentPriority]);
    const currentPriorityColor = $derived(
        `var(--color-${currentConfig.color})`,
    );

    function startEditing(): void {
        if (isCompleted) return;
        editValue = todo.title;
        isEditing = true;
        setTimeout(() => inputRef?.focus(), 0);
    }

    function saveEdit(): void {
        const trimmed = editValue.trim();
        if (trimmed && trimmed !== todo.title) {
            todoList.updateTask(todo.id, { title: trimmed });
        }
        isEditing = false;
    }

    function handleKeydown(event: KeyboardEvent): void {
        if (event.key === "Enter") {
            event.preventDefault();
            saveEdit();
        } else if (event.key === "Escape") {
            isEditing = false;
        }
    }

    function handleToggleSubtasks() {
        isSubtasksOpen = !isSubtasksOpen;
    }

    // --- Swipe Gestures (Mobile) ---
    let touchStartX = 0;
    let touchStartY = 0;
    let touchCurrentX = $state(0);
    let isSwiping = $state(false);
    const SWIPE_THRESHOLD = 80;

    function handleTouchStart(e: TouchEvent) {
        // Only on mobile/tablet to avoid interfering with desktop (though touch events usually mobile only)
        if (!uiStore.isMobile && !uiStore.isTablet) return;

        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchCurrentX = 0;
        isSwiping = false;
    }

    function handleTouchMove(e: TouchEvent) {
        if (!touchStartX) return;

        const deltaX = e.touches[0].clientX - touchStartX;
        const deltaY = e.touches[0].clientY - touchStartY;

        // If predominantly horizontal
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
            isSwiping = true;
            touchCurrentX = deltaX;
            // Prevent scroll if we are definitely swiping
            if (e.cancelable && Math.abs(deltaX) > 30) e.preventDefault();
        }
    }

    function handleTouchEnd() {
        if (isSwiping) {
            if (touchCurrentX > SWIPE_THRESHOLD) {
                // Swipe Right -> Complete
                todoList.toggleComplete(todo.id);
            } else if (touchCurrentX < -SWIPE_THRESHOLD) {
                // Swipe Left -> Delete
                todoList.remove(todo.id);
            }
        }
        // Reset
        touchStartX = 0;
        touchStartY = 0;
        touchCurrentX = 0;
        isSwiping = false;
    }
</script>

<div
    class="
        group relative flex flex-col
        rounded-xl
        transition-all duration-300
        {className}
    "
    role="listitem"
>
    <!-- Swipe Background Layer -->
    <div
        class="absolute inset-0 rounded-xl overflow-hidden flex items-center justify-between px-6 z-0"
    >
        <!-- Left: Complete (Green) -->
        <div
            class="absolute inset-0 bg-success flex items-center justify-start pl-6 transition-opacity duration-200"
            style="opacity: {touchCurrentX > 0
                ? Math.min(Math.abs(touchCurrentX) / 60, 1)
                : 0}"
        >
            <CheckSquare class="text-success-content w-6 h-6" />
        </div>

        <!-- Right: Delete (Red) -->
        <div
            class="absolute inset-0 bg-error flex items-center justify-end pr-6 transition-opacity duration-200"
            style="opacity: {touchCurrentX < 0
                ? Math.min(Math.abs(touchCurrentX) / 60, 1)
                : 0}"
        >
            <Trash2 class="text-error-content w-6 h-6" />
        </div>
    </div>

    <!-- Swipeable Card Content -->
    <div
        class="
            relative z-10 flex flex-col
            bg-base-100 rounded-xl
            border border-base-300/50
            shadow-sm hover:shadow-md
            transition-transform duration-100 ease-out
            overflow-hidden
            {isRunning ? 'ring-2 ring-opacity-40 shadow-xl' : ''}
            {isSelected || isFocused ? 'ring-2' : ''}
            {isFocused ? 'scale-[1.01] border-primary/40 bg-base-200/30' : ''}
            {isCompleted ? 'opacity-60' : ''}
            {isDragging ? 'scale-[1.02] shadow-2xl rotate-1 z-50' : ''}
        "
        ontouchstart={handleTouchStart}
        ontouchmove={handleTouchMove}
        ontouchend={handleTouchEnd}
        style="
            transform: translateX({isSwiping ? touchCurrentX : 0}px);
            {isRunning || isSelected || isFocused
            ? `--tw-ring-color: ${currentPriorityColor};`
            : ''}
            {isRunning || isFocused
            ? `box-shadow: 0 10px 40px -10px var(--color-${currentConfig.color} / 0.15);`
            : ''}
        "
    >
        <!-- Liquid Fill Background & Animation -->
        <TaskLiquid {todo} />

        <div
            class="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-xl z-20"
            style="background: {currentPriorityColor};"
        ></div>

        <div class="flex items-stretch relative z-10">
            <div class="flex flex-col w-full">
                <div class="flex items-stretch w-full">
                    <!-- Drag Handle -->
                    <button
                        type="button"
                        class="
                        hidden md:flex items-center justify-center
                        w-8 flex-shrink-0 ml-1.5
                        text-neutral-muted hover:text-neutral-light
                        cursor-grab active:cursor-grabbing
                        hover:bg-base-200/50
                        transition-colors rounded
                    "
                        aria-label="Drag to reorder"
                        tabindex={-1}
                        onclick={(e) => e.stopPropagation()}
                    >
                        <GripVertical class="w-4 h-4" strokeWidth={1.5} />
                    </button>

                    <!-- Main Content -->
                    <div
                        class="flex-1 flex items-center gap-3 p-3 md:p-4 min-w-0"
                    >
                        <!-- Checkbox -->
                        <TaskCheckbox {todo} />

                        <!-- Title & Meta -->
                        <div class="flex-1 min-w-0">
                            {#if isEditing}
                                <input
                                    bind:this={inputRef}
                                    bind:value={editValue}
                                    type="text"
                                    class="w-full bg-transparent border-none outline-none text-sm md:text-base text-neutral font-medium"
                                    onkeydown={handleKeydown}
                                    onblur={saveEdit}
                                    onclick={(e) => e.stopPropagation()}
                                    maxlength={TODO_TITLE_MAX_LENGTH}
                                />
                            {:else}
                                <div
                                    class="flex flex-col cursor-text py-1"
                                    onclick={(e) => {
                                        e.stopPropagation();
                                        if (uiStore.isMobile) {
                                            onEdit(todo.id);
                                        } else {
                                            startEditing();
                                        }
                                    }}
                                    role="button"
                                    tabindex="0"
                                    onkeydown={(e) => {
                                        if (e.key === "Enter") startEditing();
                                    }}
                                >
                                    <p
                                        class="
                                        text-sm md:text-base font-semibold truncate transition-colors
                                        {isCompleted
                                            ? 'text-neutral-muted line-through opacity-50'
                                            : 'text-neutral'}
                                    "
                                    >
                                        {todo.title}
                                    </p>
                                </div>
                            {/if}

                            <!-- Meta Row -->
                            {#if !isCompleted && (todo.tags.length > 0 || todo.dueAt || hasSubtasks || hasNotes)}
                                <div
                                    class="flex items-center gap-2 mt-2 flex-wrap"
                                >
                                    {#if todo.dueAt}
                                        <p
                                            class="
                                            inline-flex items-center gap-1
                                            text-xs font-bold px-2 py-0.5 rounded-md
                                            {isOverdue
                                                ? 'text-danger bg-danger/10'
                                                : 'text-neutral-light bg-base-200/80'}
                                        "
                                        >
                                            {#if isOverdue}
                                                <AlertCircle
                                                    class="w-3.5 h-3.5"
                                                />
                                            {:else}
                                                <Calendar class="w-3.5 h-3.5" />
                                            {/if}
                                            {formatRelativeDate(todo.dueAt)}
                                        </p>
                                    {/if}

                                    {#each todo.tags.slice(0, 2) as tag (tag)}
                                        <p
                                            class="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md"
                                        >
                                            #{tag}
                                        </p>
                                    {/each}
                                    {#if todo.tags.length > 2}
                                        <p class="text-xs text-neutral/40">
                                            +{todo.tags.length - 2}
                                        </p>
                                    {/if}

                                    {#if hasSubtasks}
                                        <p
                                            class="inline-flex items-center gap-1 text-xs font-bold text-neutral/50"
                                        >
                                            <CheckSquare class="w-3.5 h-3.5" />
                                            {subtaskProgress.completed}/{subtaskProgress.total}
                                        </p>
                                    {/if}

                                    {#if todo.estimatedTime}
                                        <p
                                            class="inline-flex items-center gap-1 text-xs font-bold text-neutral/40"
                                        >
                                            <Clock class="w-3 h-3" />
                                            ~{Math.round(
                                                todo.estimatedTime / 60000,
                                            )}m
                                        </p>
                                    {/if}

                                    {#if todo.recurrence}
                                        <p
                                            class="inline-flex items-center gap-1 text-xs font-bold text-secondary/70"
                                        >
                                            <Repeat class="w-3 h-3" />
                                            {#if todo.recurrence.type === "daily"}
                                                Daily
                                            {:else if todo.recurrence.type === "weekly" && todo.recurrence.days}
                                                {@const days =
                                                    todo.recurrence.days}
                                                {#if days.length === 5 && days.every( (d) => [1, 2, 3, 4, 5].includes(d), )}
                                                    Weekdays
                                                {:else}
                                                    {days
                                                        .map(
                                                            (d) =>
                                                                [
                                                                    "S",
                                                                    "M",
                                                                    "T",
                                                                    "W",
                                                                    "T",
                                                                    "F",
                                                                    "S",
                                                                ][d],
                                                        )
                                                        .join(" ")}
                                                {/if}
                                            {/if}
                                        </p>
                                    {/if}

                                    {#if hasNotes}
                                        <p class="text-primary/60">
                                            <FileText class="w-3.5 h-3.5" />
                                        </p>
                                    {/if}
                                </div>
                            {/if}
                        </div>

                        <!-- Actions -->
                        <div class="flex items-center">
                            <TaskActions
                                {todo}
                                {isSubtasksOpen}
                                {onEdit}
                                onToggleSubtasks={handleToggleSubtasks}
                            />
                        </div>

                        <!-- Timer Section - RIGHT END -->
                        <TaskTimer {todo} />
                    </div>
                </div>

                <!-- Subtasks Section -->
                {#if isSubtasksOpen}
                    <TaskSubtasks {todo} />
                {/if}
            </div>
        </div>
    </div>
</div>
