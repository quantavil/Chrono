<script lang="ts">
    import { slide } from "svelte/transition";
    import {
        Play,
        Pause,
        RotateCcw,
        Trash2,
        GripVertical,
        Check,
        CheckSquare,
        ChevronRight,
        Clock,
        AlertCircle,
        Calendar,
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
        onEdit?: (id: string) => void;
    }

    let {
        todo,
        index = 0,
        isDragging = false,
        isSelected = false,
        class: className = "",
        onEdit = () => {},
    }: Props = $props();

    let isEditing = $state(false);
    let editValue = $state("");
    let inputRef = $state<HTMLInputElement | null>(null);

    const isRunning = $derived(todo.isRunning);
    const isCompleted = $derived(todo.isCompleted);
    const timerDisplay = $derived(todo.timerDisplay);
    const hasTime = $derived(todo.currentTimeMs > 0);
    const isOverdue = $derived(
        todo.dueAt && new Date(todo.dueAt) < new Date() && !isCompleted,
    );
    const priorityColors = {
        high: "text-danger bg-danger/10 border-danger/20",
        medium: "text-warning bg-warning/10 border-warning/20",
        low: "text-info bg-info/10 border-info/20",
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

    let isSubtasksOpen = $state(false);
    let newSubtaskTitle = $state("");

    function toggleSubtasks(): void {
        isSubtasksOpen = !isSubtasksOpen;
    }

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
</script>

<div
    class="
    group relative flex flex-col
    bg-base-100 rounded-xl
    shadow-sm hover:shadow-md
    transition-all duration-200
    overflow-visible
    border-l-4
    {todo.priority === 'high'
        ? 'border-l-danger'
        : todo.priority === 'medium'
          ? 'border-l-warning'
          : todo.priority === 'low'
            ? 'border-l-info'
            : 'border-l-primary'}
    {isRunning
        ? todo.priority === 'high'
            ? 'border-t-2 border-r-2 border-b-2 border-danger shadow-soft-lg shadow-danger/10'
            : todo.priority === 'medium'
              ? 'border-t-2 border-r-2 border-b-2 border-warning shadow-soft-lg shadow-warning/10'
              : todo.priority === 'low'
                ? 'border-t-2 border-r-2 border-b-2 border-info shadow-soft-lg shadow-info/10'
                : 'border-t-2 border-r-2 border-b-2 border-primary shadow-soft-lg shadow-primary/10'
        : 'border-t border-r border-b border-base-300/50'}
    {isCompleted ? 'opacity-60' : ''}
    {isDragging ? 'scale-[1.02] shadow-xl rotate-1 z-50' : ''}
    {isSelected ? 'bg-primary/5' : ''}
    {className}
  "
    role="listitem"
>
    <div class="flex items-stretch">
        <!-- Inner Priority Bar Removed - using border-l-4 on parent -->

        <!-- Drag Handle - Always visible but subtle -->
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
                onclick={handleToggleComplete}
                aria-label={isCompleted ? "Mark incomplete" : "Mark complete"}
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
                        class="
                w-full bg-transparent border-none outline-none
                text-sm md:text-base text-neutral font-medium
              "
                        onkeydown={handleKeydown}
                        onblur={saveEdit}
                        maxlength={200}
                    />
                {:else}
                    <div class="flex flex-col">
                        <button
                            type="button"
                            class="
                w-full text-left text-sm md:text-base font-medium
                truncate transition-colors
                {isCompleted
                                ? 'text-neutral-muted line-through'
                                : 'text-neutral'}
                {!isCompleted ? 'hover:text-primary' : ''}
              "
                            onclick={startEditing}
                            ondblclick={() => onEdit(todo.id)}
                            disabled={isCompleted}
                        >
                            {todo.title}
                        </button>
                    </div>
                {/if}

                <!-- Meta Row: Tags, Due Date, Subtasks -->
                {#if (todo.tags.length > 0 || todo.dueAt || todo.subtasks.length > 0) && !isCompleted}
                    <div class="flex items-center gap-2 mt-1 flex-wrap">
                        {#if todo.dueAt}
                            <span
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
                            </span>
                        {/if}
                        {#each todo.tags.slice(0, 2) as tag}
                            <span
                                class="text-[10px] font-medium text-primary bg-primary-muted px-1.5 py-0.5 rounded"
                            >
                                {tag}
                            </span>
                        {/each}
                        {#if todo.subtasks.length > 0}
                            <button
                                type="button"
                                onclick={toggleSubtasks}
                                class="text-[10px] font-medium px-1.5 py-0.5 rounded bg-base-200 text-neutral-light hover:bg-base-300 flex items-center gap-1"
                            >
                                <span
                                    class="{isSubtasksOpen
                                        ? 'rotate-90'
                                        : ''} transition-transform">▶</span
                                >
                                {todo.subtaskProgress.completed}/{todo
                                    .subtaskProgress.total}
                            </button>
                        {/if}
                    </div>
                {/if}
            </div>

            <!-- Timer Section -->
            <div class="flex items-center gap-2 flex-shrink-0">
                <!-- Timer Display -->
                <button
                    type="button"
                    class="
              flex items-center gap-1.5
              px-2 py-1 rounded-lg
              font-mono text-xs md:text-sm tabular-nums
              transition-all
              {isRunning
                        ? todo.priority === 'high'
                            ? 'bg-danger text-white font-semibold animate-pulse'
                            : todo.priority === 'medium'
                              ? 'bg-warning text-white font-semibold animate-pulse'
                              : todo.priority === 'low'
                                ? 'bg-info text-white font-semibold animate-pulse'
                                : 'bg-primary text-white font-semibold animate-pulse'
                        : hasTime
                          ? 'bg-base-200 text-neutral-light hover:bg-base-300'
                          : 'text-neutral-muted hover:bg-base-200'}
            "
                    onclick={handleToggleTimer}
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

                <!-- Reset (only when has time and not running) -->
                {#if hasTime && !isRunning && !isCompleted}
                    <button
                        type="button"
                        class="
                p-1.5 rounded-lg
                text-neutral-muted hover:text-neutral hover:bg-base-200
                opacity-0 group-hover:opacity-100
                transition-all
                "
                        onclick={handleResetTimer}
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
                <div class="relative">
                    <button
                        type="button"
                        class="p-2 rounded-lg text-neutral-muted hover:text-primary hover:bg-primary-muted transition-colors"
                        onclick={toggleSubtasks}
                        title="Toggle Subtasks"
                    >
                        <svg
                            class="w-4 h-4 {isSubtasksOpen
                                ? 'rotate-180'
                                : ''} transition-transform"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            ><polyline points="6 9 12 15 18 9"></polyline></svg
                        >
                    </button>
                </div>

                <button
                    type="button"
                    class="
              p-2 rounded-lg
              text-neutral-muted hover:text-primary hover:bg-primary-muted
              transition-colors
            "
                    onclick={() => onEdit(todo.id)}
                    title="Edit details"
                >
                    <ChevronRight class="w-4 h-4" strokeWidth={2} />
                </button>

                <button
                    type="button"
                    class="
              p-2 rounded-lg
              text-neutral-muted hover:text-danger hover:bg-danger/10
              transition-colors
            "
                    onclick={handleDelete}
                    title="Delete task"
                >
                    <Trash2 class="w-4 h-4" strokeWidth={2} />
                </button>
            </div>
        </div>
    </div>

    <!-- Subtasks Inline Section -->
    {#if isSubtasksOpen && !isCompleted}
        <div
            class="px-4 pb-4 pl-12 space-y-2 border-t border-base-200/50 pt-3"
            transition:slide
        >
            {#each todo.subtasks as sub (sub.id)}
                <div class="flex items-center gap-3 group/sub">
                    <button
                        onclick={() => toggleSubtask(sub.id)}
                        class="w-4 h-4 rounded border flex items-center justify-center transition-colors {sub.is_completed
                            ? 'bg-neutral border-neutral'
                            : 'border-neutral/30 hover:border-neutral'}"
                    >
                        {#if sub.is_completed}<CheckSquare
                                class="w-3 h-3 text-white"
                            />{/if}
                    </button>
                    <span
                        class="flex-1 text-sm {sub.is_completed
                            ? 'line-through text-neutral/50'
                            : 'text-neutral'}"
                    >
                        {sub.title}
                    </span>
                    <button
                        onclick={() => deleteSubtask(sub.id)}
                        class="text-neutral/30 hover:text-red-400 opacity-0 group-hover/sub:opacity-100 transition-opacity"
                    >
                        <Trash2 class="w-3.5 h-3.5" />
                    </button>
                </div>
            {/each}

            <div class="flex items-center gap-3 mt-2">
                <div class="w-4 h-4 flex items-center justify-center">
                    <div class="w-1 h-1 rounded-full bg-neutral/20"></div>
                </div>
                <input
                    bind:value={newSubtaskTitle}
                    class="flex-1 bg-transparent text-sm outline-none placeholder:text-neutral/40"
                    placeholder="Add subtask..."
                    onkeydown={(e) => e.key === "Enter" && addSubtask()}
                />
            </div>
        </div>
    {/if}
</div>
