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
    } from "lucide-svelte";
    import type { TodoItem } from "$lib/stores/todo.svelte";
    import { todoList } from "$lib/stores/todo.svelte";
    import { formatRelativeDate } from "$lib/utils/formatTime";

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

    let isSubtasksOpen = $state(false); // New state for manually toggling subtasks

    let isEditing = $state(false);
    let editValue = $state("");
    let inputRef = $state<HTMLInputElement | null>(null);
    let newSubtaskTitle = $state(""); // State for new subtask input

    const isRunning = $derived(todo.isRunning);
    const isCompleted = $derived(todo.isCompleted);
    const timerDisplay = $derived(todo.timerDisplay);
    const hasTime = $derived(todo.currentTimeMs > 0);
    const hasNotes = $derived((todo.notes || "").trim().length > 0);
    const hasSubtasks = $derived(todo.subtasks.length > 0);
    const subtaskProgress = $derived(todo.subtaskProgress);

    const isOverdue = $derived(
        todo.dueAt && new Date(todo.dueAt) < new Date() && !isCompleted,
    );

    const priorityColors = {
        high: "border-l-danger",
        medium: "border-l-warning",
        low: "border-l-info",
    };

    const priorityRingColors = {
        high: "ring-danger",
        medium: "ring-warning",
        low: "ring-info",
    };

    const priorityBgColors = {
        high: "bg-danger/5",
        medium: "bg-warning/5",
        low: "bg-info/5",
    };

    const priorityTextColors = {
        high: "text-danger",
        medium: "text-warning",
        low: "text-info",
    };

    const priorityBgTimerColors = {
        high: "bg-danger",
        medium: "bg-warning",
        low: "bg-info",
    };

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

        todoList.updateSubtasks(todo.id, [
            ...todo.subtasks,
            {
                id: crypto.randomUUID(),
                title: trimmed,
                is_completed: false,
                position: todo.subtasks.length,
            },
        ]);
        newSubtaskTitle = "";
    }

    function toggleSubtask(subtaskId: string): void {
        const newSubtasks = todo.subtasks.map((s) =>
            s.id === subtaskId ? { ...s, is_completed: !s.is_completed } : s,
        );
        todoList.updateSubtasks(todo.id, newSubtasks);
    }

    function deleteSubtask(subtaskId: string): void {
        const newSubtasks = todo.subtasks.filter((s) => s.id !== subtaskId);
        todoList.updateSubtasks(todo.id, newSubtasks);
    }

    function updateSubtaskTitle(subtaskId: string, newTitle: string): void {
        const trimmed = newTitle.trim();
        if (!trimmed) return;
        const newSubtasks = todo.subtasks.map((s) =>
            s.id === subtaskId ? { ...s, title: trimmed } : s,
        );
        todoList.updateSubtasks(todo.id, newSubtasks);
    }
</script>

<div
    class="
    group relative flex flex-col
    bg-base-100 rounded-xl
    shadow-sm hover:shadow-md
    transition-all duration-200
    overflow-visible
    border-l-4
    {todo.priority ? priorityColors[todo.priority] : 'border-l-primary'}
    {isRunning
        ? `ring-2 ring-opacity-50 shadow-lg ${todo.priority ? priorityRingColors[todo.priority] : 'ring-primary'} ${todo.priority ? priorityRingColors[todo.priority].replace('ring-', 'shadow-') : 'shadow-primary'}/10`
        : ''}
    {isSelected
        ? `ring-2 ${todo.priority ? priorityRingColors[todo.priority] : 'ring-primary'} ${todo.priority ? priorityBgColors[todo.priority] : 'bg-primary/5'}`
        : 'border border-base-300/50'}
    {isCompleted ? 'opacity-60' : ''}
    {isDragging ? 'scale-[1.02] shadow-xl rotate-1 z-50' : ''}
    {className}
  "
    role="listitem"
>
    <!-- Full-card action button (Surface Button Pattern) -->
    <!-- Surface button removed as requested -->

    <div class="flex items-stretch relative z-10 pointer-events-none">
        <!-- Inner elements need pointer-events-auto to capture clicks -->
        <div class="flex flex-col w-full pointer-events-auto">
            <div class="flex items-stretch w-full">
                <!-- Drag Handle -->
                <button
                    type="button"
                    class="
        hidden md:flex items-center justify-center
        w-8 flex-shrink-0
        text-neutral-muted hover:text-neutral-light
        cursor-grab active:cursor-grabbing
        hover:bg-base-200
        transition-colors
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
          rounded-md border-2
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
                                    if (e.key === "Enter") {
                                        startEditing();
                                    }
                                }}
                            >
                                <p
                                    class="
                text-sm md:text-base font-medium truncate transition-colors
                {isCompleted
                                        ? 'text-neutral-muted line-through'
                                        : 'text-neutral'}
              "
                                >
                                    {todo.title}
                                </p>
                            </div>
                        {/if}

                        <!-- Meta Row: Tags, Due Date, Indicators -->
                        {#if !isCompleted && (todo.tags.length > 0 || todo.dueAt || hasSubtasks || hasNotes)}
                            <div
                                class="flex items-center gap-2 mt-1.5 flex-wrap"
                            >
                                <!-- Due Date -->
                                {#if todo.dueAt}
                                    <p
                                        class="
                  inline-flex items-center gap-1
                  text-[10px] font-medium px-1.5 py-0.5 rounded
                  {isOverdue
                                            ? 'text-danger bg-danger/10'
                                            : 'text-neutral-light bg-base-200'}
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

                                <!-- Tags -->
                                {#each todo.tags.slice(0, 2) as tag}
                                    <p
                                        class="text-[10px] font-medium text-primary bg-primary-muted px-1.5 py-0.5 rounded"
                                    >
                                        #{tag}
                                    </p>
                                {/each}
                                {#if todo.tags.length > 2}
                                    <p class="text-[10px] text-neutral/40">
                                        +{todo.tags.length - 2}
                                    </p>
                                {/if}

                                <!-- Subtasks Indicator -->
                                {#if hasSubtasks}
                                    <p
                                        class="inline-flex items-center gap-1 text-[10px] font-medium text-neutral/50"
                                    >
                                        <CheckSquare class="w-3 h-3" />
                                        {subtaskProgress.completed}/{subtaskProgress.total}
                                    </p>
                                {/if}

                                <!-- Notes Indicator -->
                                {#if hasNotes}
                                    <p class="text-primary/60">
                                        <FileText class="w-3 h-3" />
                                    </p>
                                {/if}
                            </div>
                        {/if}
                    </div>

                    <!-- Timer Section -->
                    <div class="flex items-center gap-2 flex-shrink-0">
                        <button
                            type="button"
                            class="
            flex items-center gap-1.5
            px-2 py-1 rounded-lg
            font-mono text-xs md:text-sm tabular-nums
            transition-all
            transition-all
            {isRunning
                                ? `${todo.priority ? priorityBgTimerColors[todo.priority] : 'bg-primary'} text-white font-semibold animate-pulse`
                                : hasTime
                                  ? 'bg-base-200 text-neutral-light hover:bg-base-300'
                                  : 'text-neutral-muted hover:bg-base-200'}
          "
                            onclick={(e) => {
                                e.stopPropagation();
                                handleToggleTimer();
                            }}
                            disabled={isCompleted}
                            title={isRunning ? "Pause timer" : "Start timer"}
                        >
                            {#if isRunning}
                                <Pause class="w-3.5 h-3.5" strokeWidth={2.5} />
                            {:else}
                                <Play class="w-3.5 h-3.5" strokeWidth={2.5} />
                            {/if}
                            <span>{timerDisplay.formatted}</span>
                        </button>

                        {#if hasTime && !isRunning && !isCompleted}
                            <button
                                type="button"
                                class="
              p-1.5 rounded-lg
              text-neutral-muted hover:text-neutral hover:bg-base-200
              opacity-0 group-hover:opacity-100
              transition-all
            "
                                onclick={(e) => {
                                    e.stopPropagation();
                                    handleResetTimer();
                                }}
                                title="Reset timer"
                            >
                                <RotateCcw class="w-4 h-4" strokeWidth={2} />
                            </button>
                        {/if}
                    </div>

                    <!-- Actions -->
                    <div
                        class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        {#if hasSubtasks}
                            <button
                                type="button"
                                class="p-2 rounded-lg text-neutral-muted hover:text-neutral hover:bg-base-200 transition-colors"
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
                </div>
            </div>

            <!-- Subtasks Section (Inline) -->
            {#if isSubtasksOpen}
                <div
                    class="px-3 pb-3 md:px-4 md:pb-4 pl-12 md:pl-14 space-y-2"
                    transition:slide
                >
                    <!-- Subtask List -->
                    {#each todo.subtasks as subtask (subtask.id)}
                        <div class="flex items-center gap-2 text-sm group/sub">
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
                                    if (e.key === "Enter") {
                                        (e.target as HTMLInputElement).blur();
                                    }
                                }}
                            />
                            <button
                                type="button"
                                class="opacity-0 group-hover/sub:opacity-100 p-0.5 text-neutral/30 hover:text-danger"
                                onclick={() => deleteSubtask(subtask.id)}
                            >
                                <Trash2 class="w-3 h-3" />
                            </button>
                        </div>
                    {/each}

                    <!-- Add Subtask inline -->
                    <div class="flex items-center gap-2">
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
</div>
