<script lang="ts">
    import { slide } from "svelte/transition";
    import {
        Play,
        Pause,
        RotateCcw,
        Trash2,
        GripVertical,
        Check,
        ChevronRight,
        Clock,
        AlertCircle,
        Calendar,
        FileText,
        CheckSquare,
        Plus,
        CheckCircle2,
        ChevronDown,
        Repeat,
    } from "lucide-svelte";
    import type { TodoItem } from "$lib/stores/todo.svelte";
    import { todoList } from "$lib/stores/todo.svelte";
    import { uiStore } from "$lib/stores/ui.svelte";
    import { formatRelativeDate, formatTimeOnly } from "$lib/utils/formatTime";

    interface Props {
        todo: TodoItem;
        index?: number;
        isDragging?: boolean;
        isSelected?: boolean;
        class?: string;
        onEdit?: (id: string, mode?: "content" | "settings") => void;
    }

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
    let newSubtaskTitle = $state("");

    const isRunning = $derived(todo.isRunning);
    const isCompleted = $derived(todo.isCompleted);
    const isFocused = $derived(uiStore.focusedTaskId === todo.id);
    const timerDisplay = $derived(todo.timerDisplay);
    const hasTime = $derived(todo.currentTimeMs > 0);
    const hasNotes = $derived((todo.notes || "").trim().length > 0);
    const hasSubtasks = $derived(todo.subtasks.length > 0);
    const subtaskProgress = $derived(todo.subtaskProgress);

    const isOverdue = $derived(
        todo.dueAt && new Date(todo.dueAt) < new Date() && !isCompleted,
    );

    // Calculate fill percentage based on time
    const fillPercentage = $derived(() => {
        if (todo.estimatedTime && todo.estimatedTime > 0) {
            return Math.min(
                (todo.currentTimeMs / todo.estimatedTime) * 100,
                100,
            );
        }
        // If no estimate, use a logarithmic scale capped at 2 hours for 100%
        const maxMs = 2 * 60 * 60 * 1000; // 2 hours
        return Math.min((todo.currentTimeMs / maxMs) * 100, 100);
    });

    // Priority-based liquid colors (with transparency for the fill)
    const liquidColors = {
        high: {
            fill: "rgba(239, 68, 68, 0.15)",
            wave: "rgba(239, 68, 68, 0.25)",
            solid: "#ef4444",
        },
        medium: {
            fill: "rgba(245, 158, 11, 0.15)",
            wave: "rgba(245, 158, 11, 0.25)",
            solid: "#f59e0b",
        },
        low: {
            fill: "rgba(34, 197, 94, 0.15)",
            wave: "rgba(34, 197, 94, 0.25)",
            solid: "#22c55e",
        },
    };

    const currentLiquidColor = $derived(
        liquidColors[todo.priority || "low"] || liquidColors.low,
    );

    function handleToggleComplete(): void {
        todoList.toggleComplete(todo.id);
    }

    function handleToggleTimer(): void {
        todoList.toggleTimer(todo.id);
    }

    function handleResetTimer(): void {
        if (confirm("Reset timer to 0:00?")) {
            todoList.resetTimer(todo.id);
        }
    }

    function handleDelete(): void {
        todoList.remove(todo.id);
    }

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

    // Subtasks Logic
    function addSubtask(): void {
        const trimmed = newSubtaskTitle.trim();
        if (!trimmed) return;
        todo.addSubtask(trimmed);
        newSubtaskTitle = "";
    }

    function toggleSubtask(subtaskId: string): void {
        todo.toggleSubtask(subtaskId);
    }

    function deleteSubtask(subtaskId: string): void {
        todo.removeSubtask(subtaskId);
    }

    function updateSubtaskTitle(subtaskId: string, newTitle: string): void {
        todo.updateSubtaskTitle(subtaskId, newTitle);
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
    <!-- Liquid Fill Background -->
    <div
        class="absolute inset-0 pointer-events-none transition-all duration-700 ease-out z-0"
        style="
            width: {fillPercentage()}%;
            background: linear-gradient(
                90deg,
                {currentLiquidColor.fill} 0%,
                {currentLiquidColor.fill} 85%,
                {currentLiquidColor.wave} 100%
            );
        "
    >
        <!-- Wave effect at the edge -->
        {#if isRunning || hasTime}
            <div
                class="absolute right-0 top-0 bottom-0 w-6 overflow-hidden"
                style="opacity: {isRunning ? 1 : 0.4};"
            >
                <svg
                    class="absolute h-full w-12 -right-4"
                    class:animate-wave={isRunning}
                    viewBox="0 0 20 100"
                    preserveAspectRatio="none"
                >
                    <path
                        d="M0,0 Q12,25 0,50 Q12,75 0,100 L20,100 L20,0 Z"
                        fill={currentLiquidColor.wave}
                    />
                </svg>
            </div>
        {/if}

        <!-- Bubbles when running -->
        {#if isRunning}
            <div class="absolute inset-0 overflow-hidden">
                <div
                    class="bubble bubble-1"
                    style="background: {currentLiquidColor.solid};"
                ></div>
                <div
                    class="bubble bubble-2"
                    style="background: {currentLiquidColor.solid};"
                ></div>
                <div
                    class="bubble bubble-3"
                    style="background: {currentLiquidColor.solid};"
                ></div>
            </div>
        {/if}
    </div>

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
                        aria-label={isCompleted
                            ? "Mark incomplete"
                            : "Mark complete"}
                    >
                        {#if isCompleted}
                            <Check
                                class="absolute inset-0 m-auto w-3 h-3 md:w-4 md:h-4 text-white"
                                strokeWidth={3}
                            />
                        {/if}
                    </button>

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
                                    startEditing();
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
                                class="flex items-center gap-2 mt-1.5 flex-wrap"
                            >
                                {#if todo.dueAt}
                                    <p
                                        class="
                                            inline-flex items-center gap-1
                                            text-[10px] font-bold px-1.5 py-0.5 rounded-md
                                            {isOverdue
                                            ? 'text-danger bg-danger/10'
                                            : 'text-neutral-light bg-base-200/80'}
                                        "
                                    >
                                        {#if isOverdue}
                                            <AlertCircle class="w-3 h-3" />
                                        {:else}
                                            <Calendar class="w-3 h-3" />
                                        {/if}
                                        {formatRelativeDate(todo.dueAt)}
                                    </p>
                                {/if}

                                {#each todo.tags.slice(0, 2) as tag}
                                    <p
                                        class="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-md"
                                    >
                                        #{tag}
                                    </p>
                                {/each}
                                {#if todo.tags.length > 2}
                                    <p class="text-[10px] text-neutral/40">
                                        +{todo.tags.length - 2}
                                    </p>
                                {/if}

                                {#if hasSubtasks}
                                    <p
                                        class="inline-flex items-center gap-1 text-[10px] font-bold text-neutral/50"
                                    >
                                        <CheckSquare class="w-3 h-3" />
                                        {subtaskProgress.completed}/{subtaskProgress.total}
                                    </p>
                                {/if}

                                {#if todo.estimatedTime}
                                    <p
                                        class="inline-flex items-center gap-1 text-[10px] font-bold text-neutral/40"
                                    >
                                        <Clock class="w-2.5 h-2.5" />
                                        ~{Math.round(
                                            todo.estimatedTime / 60000,
                                        )}m
                                    </p>
                                {/if}

                                {#if todo.startAt || todo.endAt}
                                    <p
                                        class="inline-flex items-center gap-1 text-[10px] font-bold text-primary/70"
                                    >
                                        <Clock class="w-2.5 h-2.5" />
                                        {formatTimeOnly(
                                            todo.startAt,
                                        )}{todo.endAt
                                            ? ` - ${formatTimeOnly(todo.endAt)}`
                                            : ""}
                                    </p>
                                {/if}

                                {#if todo.recurrence}
                                    <p
                                        class="inline-flex items-center gap-1 text-[10px] font-bold text-secondary/70"
                                    >
                                        <Repeat class="w-2.5 h-2.5" />
                                        {todo.recurrence.type === "daily"
                                            ? "Daily"
                                            : "Weekly"}
                                    </p>
                                {/if}

                                {#if hasNotes}
                                    <p class="text-primary/60">
                                        <FileText class="w-3 h-3" />
                                    </p>
                                {/if}
                            </div>
                        {/if}
                    </div>

                    <!-- Actions (show on hover) -->
                    <div
                        class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        {#if hasSubtasks}
                            <button
                                type="button"
                                class="p-2 rounded-lg text-neutral-muted hover:text-neutral hover:bg-base-200/80 transition-colors"
                                onclick={(e) => {
                                    e.stopPropagation();
                                    isSubtasksOpen = !isSubtasksOpen;
                                }}
                                title="Toggle Subtasks"
                            >
                                <ChevronDown
                                    class="w-4 h-4 transition-transform {isSubtasksOpen
                                        ? 'rotate-180'
                                        : ''}"
                                />
                            </button>
                        {/if}

                        {#if hasTime && !isRunning && !isCompleted}
                            <button
                                type="button"
                                class="p-2 rounded-lg text-neutral-muted hover:text-neutral hover:bg-base-200/80 transition-all"
                                onclick={(e) => {
                                    e.stopPropagation();
                                    handleResetTimer();
                                }}
                                title="Reset timer"
                            >
                                <RotateCcw class="w-4 h-4" strokeWidth={2} />
                            </button>
                        {/if}

                        <button
                            type="button"
                            class="p-2 rounded-lg text-neutral-muted hover:text-primary hover:bg-primary-muted transition-colors"
                            onclick={(e) => {
                                e.stopPropagation();
                                onEdit(todo.id);
                            }}
                            title="Task Details"
                        >
                            <ChevronRight class="w-4 h-4" strokeWidth={2} />
                        </button>

                        <button
                            type="button"
                            class="p-2 rounded-lg text-neutral-muted hover:text-danger hover:bg-danger/10 transition-colors"
                            onclick={(e) => {
                                e.stopPropagation();
                                handleDelete();
                            }}
                            title="Delete task"
                        >
                            <Trash2 class="w-4 h-4" strokeWidth={2} />
                        </button>
                    </div>

                    <!-- Timer Section - RIGHT END -->
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
                            <Pause
                                class="w-4 h-4"
                                strokeWidth={2.5}
                                fill="currentColor"
                            />
                        {:else}
                            <Play
                                class="w-4 h-4"
                                strokeWidth={2.5}
                                fill={hasTime ? "currentColor" : "none"}
                            />
                        {/if}
                        <span class="tracking-wider"
                            >{timerDisplay.formatted}</span
                        >
                    </button>
                </div>
            </div>

            <!-- Subtasks Section -->
            {#if isSubtasksOpen}
                <div
                    class="px-3 pb-3 md:px-4 md:pb-4 pl-12 md:pl-14 space-y-2 relative z-10"
                    transition:slide
                >
                    {#each todo.subtasks as subtask (subtask.id)}
                        <div
                            class="flex items-center gap-2 text-sm group/sub bg-base-100/40 rounded-lg p-2 border border-base-200/50"
                        >
                            <button
                                type="button"
                                class="
                                    w-4 h-4 rounded border
                                    flex items-center justify-center
                                    transition-all flex-shrink-0
                                    {subtask.is_completed
                                    ? 'bg-accent border-accent text-white'
                                    : 'border-neutral/30 hover:border-accent'}
                                "
                                onclick={() => toggleSubtask(subtask.id)}
                            >
                                {#if subtask.is_completed}
                                    <CheckCircle2 class="w-3 h-3" />
                                {/if}
                            </button>
                            <input
                                value={subtask.title}
                                class="
                                    flex-1 bg-transparent
                                    text-sm outline-none
                                    {subtask.is_completed
                                    ? 'line-through text-neutral/40'
                                    : 'text-neutral'}
                                    placeholder:text-neutral/30
                                "
                                onclick={(e) => e.stopPropagation()}
                                onblur={(e) =>
                                    updateSubtaskTitle(
                                        subtask.id,
                                        (e.target as HTMLInputElement).value,
                                    )}
                                onkeydown={(e) => {
                                    if (e.key === "Enter")
                                        (e.target as HTMLInputElement).blur();
                                }}
                            />
                            <button
                                type="button"
                                class="opacity-0 group-hover/sub:opacity-100 p-0.5 text-neutral-muted hover:text-danger transition-opacity"
                                onclick={() => deleteSubtask(subtask.id)}
                            >
                                <Trash2 class="w-3 h-3" />
                            </button>
                        </div>
                    {/each}

                    <div
                        class="flex items-center gap-2 bg-base-100/30 rounded-lg p-2 border border-dashed border-base-300"
                    >
                        <Plus class="w-4 h-4 text-neutral/30" />
                        <input
                            class="bg-transparent text-sm outline-none placeholder:text-neutral/40 flex-1"
                            placeholder="Add subtask..."
                            bind:value={newSubtaskTitle}
                            onkeydown={(e) => e.key === "Enter" && addSubtask()}
                        />
                    </div>
                </div>
            {/if}
        </div>
    </div>

    <!-- Fill percentage indicator (subtle) -->
    {#if hasTime && !isCompleted}
        <div
            class="absolute bottom-0 left-0 right-0 h-1 bg-base-200/30 overflow-hidden z-20"
        >
            <div
                class="h-full transition-all duration-700 ease-out"
                style="width: {fillPercentage()}%; background: {currentLiquidColor.solid}; box-shadow: 0 0 10px {currentLiquidColor.solid};"
            ></div>
        </div>
    {/if}
</div>

<style>
    /* Wave animation */
    @keyframes wave {
        0%,
        100% {
            transform: translateY(0) rotate(0deg);
        }
        50% {
            transform: translateY(-8px) rotate(2deg);
        }
    }

    .animate-wave {
        animation: wave 3s ease-in-out infinite;
    }

    /* Bubble animations */
    .bubble {
        position: absolute;
        border-radius: 50%;
        opacity: 0.4;
        filter: blur(1px);
        animation: rise 4s ease-in infinite;
    }

    .bubble-1 {
        width: 10px;
        height: 10px;
        left: 20%;
        bottom: -20px;
        animation-delay: 0s;
    }

    .bubble-2 {
        width: 6px;
        height: 6px;
        left: 55%;
        bottom: -20px;
        animation-delay: 1.5s;
    }

    .bubble-3 {
        width: 14px;
        height: 14px;
        left: 80%;
        bottom: -20px;
        animation-delay: 2.8s;
    }

    @keyframes rise {
        0% {
            transform: translateY(0) scale(1);
            opacity: 0;
        }
        20% {
            opacity: 0.4;
        }
        100% {
            transform: translateY(-100px) scale(0.6);
            opacity: 0;
        }
    }
</style>
