<script lang="ts">
    import {
        GripVertical,
        Calendar,
        FileText,
        CheckSquare,
        Clock,
        AlertCircle,
        Repeat,
    } from "lucide-svelte";
    import type { TodoItem } from "$lib/stores/todo.svelte";
    import { getTodoStore } from "$lib/context";
    import { uiStore } from "$lib/stores/ui.svelte";
    import { formatRelativeDate, formatTimeOnly } from "$lib/utils/formatTime";

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

    // Priority-based liquid colors (for the card border/shadow, not the fill which is inside TaskLiquid)
    const liquidColors = {
        high: { solid: "#ef4444" },
        medium: { solid: "#f59e0b" },
        low: { solid: "#22c55e" },
    };

    const currentLiquidColor = $derived(
        liquidColors[todo.priority || "low"] || liquidColors.low,
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
            todoList.updateTitle(todo.id, trimmed);
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
</script>

<div
    class="
        group relative flex flex-col
        bg-base-100 rounded-xl
        shadow-sm hover:shadow-md
        transition-all duration-300
        overflow-hidden
        border border-base-300/50
        {isRunning ? 'ring-2 ring-opacity-40 shadow-xl' : ''}
        {isSelected || isFocused ? 'ring-2' : ''}
        {isFocused ? 'scale-[1.01] border-primary/40 bg-base-200/30' : ''}
        {isCompleted ? 'opacity-60' : ''}
        {isDragging ? 'scale-[1.02] shadow-2xl rotate-1 z-50' : ''}
        {className}
    "
    style="
        {isRunning || isSelected || isFocused
        ? `--tw-ring-color: ${currentLiquidColor.solid};`
        : ''}
        {isRunning || isFocused
        ? `box-shadow: 0 10px 40px -10px ${currentLiquidColor.solid}30;`
        : ''}
    "
    role="listitem"
>
    <!-- Liquid Fill Background & Animation -->
    <TaskLiquid {todo} />

    <!-- Priority indicator line -->
    <div
        class="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-xl z-20"
        style="background: {currentLiquidColor.solid};"
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
                <div class="flex-1 flex items-center gap-3 p-3 md:p-4 min-w-0">
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
                                maxlength={200}
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
                            <div class="flex items-center gap-2 mt-2 flex-wrap">
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
                                            <AlertCircle class="w-3.5 h-3.5" />
                                        {:else}
                                            <Calendar class="w-3.5 h-3.5" />
                                        {/if}
                                        {formatRelativeDate(todo.dueAt)}
                                    </p>
                                {/if}

                                {#each todo.tags.slice(0, 2) as tag}
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

                                {#if todo.startAt || todo.endAt}
                                    <p
                                        class="inline-flex items-center gap-1 text-xs font-bold text-primary/70"
                                    >
                                        <Clock class="w-3 h-3" />
                                        {formatTimeOnly(
                                            todo.startAt,
                                        )}{todo.endAt
                                            ? ` - ${formatTimeOnly(todo.endAt)}`
                                            : ""}
                                    </p>
                                {/if}

                                {#if todo.recurrence}
                                    <p
                                        class="inline-flex items-center gap-1 text-xs font-bold text-secondary/70"
                                    >
                                        <Repeat class="w-3 h-3" />
                                        {todo.recurrence.type === "daily"
                                            ? "Daily"
                                            : "Weekly"}
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

                    <!-- Actions (show on hover) - Hidden on Mobile, accessible via Details Modal -->
                    <div class="hidden md:block">
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
