<script lang="ts">
    import { fade, fly, slide } from "svelte/transition";
    import { untrack } from "svelte";
    import { quintOut } from "svelte/easing";
    import {
        X,
        Clock,
        Tag,
        Trash2,
        CheckCircle2,
        Calendar,
        Flag,
        Play,
        Pause,
        RotateCcw,
        ChevronDown,
        Plus,
        AlertCircle,
        Repeat,
    } from "lucide-svelte";
    import type { TodoItem } from "$lib/stores/todo.svelte";
    import type { RecurrenceConfig, Priority } from "$lib/types";
    import { todoList } from "$lib/stores/todo.svelte";
    import {
        formatRelativeDate,
        formatTimeCompact,
    } from "$lib/utils/formatTime";

    interface Props {
        task: TodoItem;
        onClose: () => void;
        class?: string;
    }

    let { task, onClose, class: className = "" }: Props = $props();

    // -------------------------------------------------------------------------
    // Local State
    // -------------------------------------------------------------------------

    let title = $state(untrack(() => task.title));
    let priority = $state<Priority>(untrack(() => task.priority));
    let tagsInput = $state("");
    let activeTags = $state<string[]>(untrack(() => [...task.tags]));
    let showSubtasks = $state(true);
    let newSubtaskTitle = $state("");

    // Recurrence
    let recurrenceDays = $state<number[]>([]);

    // -------------------------------------------------------------------------
    // Sync with task changes
    // -------------------------------------------------------------------------

    $effect(() => {
        title = task.title;
        priority = task.priority;
        activeTags = [...task.tags];

        if (task.recurrence?.type === "daily") {
            recurrenceDays = [0, 1, 2, 3, 4, 5, 6];
        } else if (task.recurrence?.type === "weekly" && task.recurrence.days) {
            recurrenceDays = [...task.recurrence.days];
        } else {
            recurrenceDays = [];
        }
    });

    // -------------------------------------------------------------------------
    // Derived
    // -------------------------------------------------------------------------

    const isRunning = $derived(task.isRunning);
    const isCompleted = $derived(task.isCompleted);
    const hasTime = $derived(task.currentTimeMs > 0);
    const isOverdue = $derived(
        task.dueAt && new Date(task.dueAt) < new Date() && !isCompleted,
    );

    const subtaskProgress = $derived(task.subtaskProgress);

    // -------------------------------------------------------------------------
    // Handlers
    // -------------------------------------------------------------------------

    function handleTitleBlur(): void {
        const trimmed = title.trim();
        if (trimmed && trimmed !== task.title) {
            todoList.updateTitle(task.id, trimmed);
        }
    }

    function handleToggleComplete(): void {
        todoList.toggleComplete(task.id);
    }

    function handleToggleTimer(): void {
        todoList.toggleTimer(task.id);
    }

    function handleResetTimer(): void {
        if (confirm("Reset timer to 0:00?")) {
            todoList.resetTimer(task.id);
        }
    }

    function handleDelete(): void {
        if (confirm("Delete this task?")) {
            todoList.remove(task.id);
            onClose();
        }
    }

    function handlePriorityChange(p: Priority): void {
        priority = p;
        task.applyUpdate({ priority: p });
    }

    // Tags
    function addTag(): void {
        const trimmed = tagsInput.trim();
        if (trimmed && !activeTags.includes(trimmed)) {
            activeTags = [...activeTags, trimmed];
            task.applyUpdate({ tags: activeTags });
        }
        tagsInput = "";
    }

    function removeTag(tag: string): void {
        activeTags = activeTags.filter((t) => t !== tag);
        task.applyUpdate({ tags: activeTags });
    }

    // Subtasks
    function addSubtask(): void {
        const trimmed = newSubtaskTitle.trim();
        if (!trimmed) return;

        todoList.updateSubtasks(task.id, [
            ...task.subtasks,
            {
                id: crypto.randomUUID(),
                title: trimmed,
                is_completed: false,
                position: task.subtasks.length,
            },
        ]);
        newSubtaskTitle = "";
    }

    function toggleSubtask(subtaskId: string): void {
        const newSubtasks = task.subtasks.map((s) =>
            s.id === subtaskId ? { ...s, is_completed: !s.is_completed } : s,
        );
        todoList.updateSubtasks(task.id, newSubtasks);
    }

    function deleteSubtask(subtaskId: string): void {
        const newSubtasks = task.subtasks.filter((s) => s.id !== subtaskId);
        todoList.updateSubtasks(task.id, newSubtasks);
    }

    // Recurrence
    function toggleDay(day: number): void {
        if (recurrenceDays.includes(day)) {
            recurrenceDays = recurrenceDays.filter((d) => d !== day);
        } else {
            recurrenceDays = [...recurrenceDays, day];
        }

        // Update task
        let recurrence: RecurrenceConfig | null = null;
        if (recurrenceDays.length === 7) {
            recurrence = { type: "daily" };
        } else if (recurrenceDays.length > 0) {
            recurrence = { type: "weekly", days: recurrenceDays };
        }
        task.applyUpdate({ recurrence });
    }

    const DAYS = [
        { label: "M", value: 1 },
        { label: "T", value: 2 },
        { label: "W", value: 3 },
        { label: "T", value: 4 },
        { label: "F", value: 5 },
        { label: "S", value: 6 },
        { label: "S", value: 0 },
    ];

    const priorityConfig = {
        high: {
            label: "High",
            color: "text-danger",
            bg: "bg-danger/10",
            border: "border-danger",
        },
        medium: {
            label: "Medium",
            color: "text-warning",
            bg: "bg-warning/10",
            border: "border-warning",
        },
        low: {
            label: "Low",
            color: "text-info",
            bg: "bg-info/10",
            border: "border-info",
        },
    };
</script>

<div class="h-full flex flex-col {className}">
    <!-- Header -->
    <div class="flex items-center justify-between p-4 border-b border-base-200">
        <div class="flex items-center gap-3">
            <!-- Completion Checkbox -->
            <button
                type="button"
                class="
          w-7 h-7 rounded-lg border-2
          flex items-center justify-center
          transition-all duration-200
          {isCompleted
                    ? 'bg-accent border-accent text-white'
                    : 'border-neutral/30 hover:border-accent hover:bg-accent/10'}
        "
                onclick={handleToggleComplete}
            >
                {#if isCompleted}
                    <CheckCircle2 class="w-4 h-4" strokeWidth={2.5} />
                {/if}
            </button>

            <span class="text-sm font-semibold text-neutral/60"
                >Task Details</span
            >
        </div>

        <div class="flex items-center gap-1">
            <button
                type="button"
                class="p-2 rounded-xl text-neutral/40 hover:text-danger hover:bg-danger/10 transition-colors"
                onclick={handleDelete}
                title="Delete task"
            >
                <Trash2 class="w-4 h-4" />
            </button>
            <button
                type="button"
                class="p-2 rounded-xl text-neutral/40 hover:text-neutral hover:bg-base-200 transition-colors"
                onclick={onClose}
                title="Close panel"
            >
                <X class="w-4 h-4" />
            </button>
        </div>
    </div>

    <!-- Scrollable Content -->
    <div class="flex-1 overflow-y-auto p-6 space-y-6">
        <!-- Title -->
        <div in:fly={{ y: 10, duration: 200 }}>
            <input
                bind:value={title}
                onblur={handleTitleBlur}
                class="
          w-full bg-transparent
          text-xl font-bold text-neutral
          placeholder:text-neutral/30
          outline-none
          border-b-2 border-transparent
          focus:border-primary
          transition-colors
          {isCompleted ? 'line-through text-neutral/50' : ''}
        "
                placeholder="Task title..."
                disabled={isCompleted}
            />
        </div>

        <!-- Timer Section -->
        <div
            class="bg-base-200/50 rounded-2xl p-4"
            in:fly={{ y: 10, duration: 200, delay: 50 }}
        >
            <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2 text-neutral/60">
                    <Clock class="w-4 h-4" />
                    <span class="text-sm font-medium">Time Tracked</span>
                </div>

                {#if hasTime && !isRunning}
                    <button
                        type="button"
                        class="text-xs text-neutral/40 hover:text-danger transition-colors"
                        onclick={handleResetTimer}
                    >
                        Reset
                    </button>
                {/if}
            </div>

            <div class="flex items-center justify-between">
                <span
                    class="
            text-3xl font-mono font-bold tabular-nums
            {isRunning ? 'text-primary' : 'text-neutral'}
          "
                >
                    {task.timerDisplay.formatted}
                </span>

                <button
                    type="button"
                    class="
            w-12 h-12 rounded-xl
            flex items-center justify-center
            transition-all active:scale-95
            {isRunning
                        ? 'bg-primary text-white shadow-lg shadow-primary/30'
                        : 'bg-base-300 text-neutral hover:bg-primary hover:text-white'}
          "
                    onclick={handleToggleTimer}
                    disabled={isCompleted}
                >
                    {#if isRunning}
                        <Pause class="w-5 h-5" fill="currentColor" />
                    {:else}
                        <Play class="w-5 h-5 ml-0.5" fill="currentColor" />
                    {/if}
                </button>
            </div>
        </div>

        <!-- Priority -->
        <div in:fly={{ y: 10, duration: 200, delay: 100 }}>
            <span
                class="text-xs font-bold text-neutral/40 uppercase tracking-wider mb-2 block"
            >
                Priority
            </span>
            <div class="flex gap-2">
                {#each ["high", "medium", "low"] as const as p}
                    {@const config = priorityConfig[p]}
                    <button
                        type="button"
                        class="
              flex-1 py-2.5 rounded-xl
              text-sm font-semibold
              border-2 transition-all
              {priority === p
                            ? `${config.bg} ${config.color} ${config.border}`
                            : 'border-base-300 text-neutral/50 hover:border-neutral/30'}
            "
                        onclick={() => handlePriorityChange(p)}
                    >
                        {config.label}
                    </button>
                {/each}
            </div>
        </div>

        <!-- Due Date -->
        {#if task.dueAt}
            <div
                class="flex items-center gap-3 p-3 rounded-xl {isOverdue
                    ? 'bg-danger/10'
                    : 'bg-base-200/50'}"
                in:fly={{ y: 10, duration: 200, delay: 150 }}
            >
                {#if isOverdue}
                    <AlertCircle class="w-5 h-5 text-danger" />
                {:else}
                    <Calendar class="w-5 h-5 text-primary" />
                {/if}
                <div>
                    <p
                        class="text-sm font-medium {isOverdue
                            ? 'text-danger'
                            : 'text-neutral'}"
                    >
                        {formatRelativeDate(task.dueAt)}
                    </p>
                    <p class="text-xs text-neutral/40">Due date</p>
                </div>
            </div>
        {/if}

        <!-- Recurrence -->
        <div in:fly={{ y: 10, duration: 200, delay: 200 }}>
            <label
                class="text-xs font-bold text-neutral/40 uppercase tracking-wider mb-2 flex items-center gap-2"
            >
                <Repeat class="w-3.5 h-3.5" />
                Repeats
            </label>
            <div class="flex justify-between bg-base-200/50 rounded-xl p-2">
                {#each DAYS as day}
                    <button
                        type="button"
                        class="
              w-9 h-9 rounded-lg
              text-xs font-bold
              transition-all
              {recurrenceDays.includes(day.value)
                            ? 'bg-primary text-white shadow-sm'
                            : 'text-neutral/40 hover:bg-base-200 hover:text-neutral'}
            "
                        onclick={() => toggleDay(day.value)}
                    >
                        {day.label}
                    </button>
                {/each}
            </div>
            <p class="text-[10px] text-neutral/40 mt-1.5 text-center">
                {#if recurrenceDays.length === 0}
                    Does not repeat
                {:else if recurrenceDays.length === 7}
                    Repeats daily
                {:else}
                    Repeats weekly on selected days
                {/if}
            </p>
        </div>

        <!-- Tags -->
        <div in:fly={{ y: 10, duration: 200, delay: 250 }}>
            <label
                class="text-xs font-bold text-neutral/40 uppercase tracking-wider mb-2 flex items-center gap-2"
            >
                <Tag class="w-3.5 h-3.5" />
                Tags
            </label>

            {#if activeTags.length > 0}
                <div class="flex flex-wrap gap-2 mb-3">
                    {#each activeTags as tag}
                        <span
                            class="
                inline-flex items-center gap-1.5
                px-2.5 py-1 rounded-lg
                bg-primary/10 text-primary
                text-xs font-bold
              "
                        >
                            {tag}
                            <button
                                type="button"
                                class="hover:text-primary-dark"
                                onclick={() => removeTag(tag)}
                            >
                                <X class="w-3 h-3" />
                            </button>
                        </span>
                    {/each}
                </div>
            {/if}

            <div class="relative">
                <input
                    bind:value={tagsInput}
                    onkeydown={(e) =>
                        e.key === "Enter" && (e.preventDefault(), addTag())}
                    class="
            w-full bg-base-200/50 rounded-xl
            pl-3 pr-10 py-2.5
            text-sm outline-none
            border-2 border-transparent
            focus:border-primary/30 focus:bg-base-100
            transition-all
          "
                    placeholder="Add a tag..."
                />
                <button
                    type="button"
                    class="
            absolute right-2 top-1/2 -translate-y-1/2
            p-1.5 rounded-lg
            text-neutral/30 hover:text-primary hover:bg-primary/10
            transition-colors
            "
                    onclick={addTag}
                >
                    <Plus class="w-4 h-4" />
                </button>
            </div>
        </div>

        <!-- Subtasks -->
        <div in:fly={{ y: 10, duration: 200, delay: 300 }}>
            <button
                type="button"
                class="w-full flex items-center justify-between mb-2 group"
                onclick={() => (showSubtasks = !showSubtasks)}
            >
                <span
                    class="text-xs font-bold text-neutral/40 uppercase tracking-wider flex items-center gap-2"
                >
                    <CheckCircle2 class="w-3.5 h-3.5" />
                    Subtasks
                    {#if task.subtasks.length > 0}
                        <span class="text-primary font-mono">
                            {subtaskProgress.completed}/{subtaskProgress.total}
                        </span>
                    {/if}
                </span>
                <ChevronDown
                    class="w-4 h-4 text-neutral/30 transition-transform {showSubtasks
                        ? 'rotate-180'
                        : ''}"
                />
            </button>

            {#if showSubtasks}
                <div class="space-y-2" transition:slide={{ duration: 200 }}>
                    {#each task.subtasks as subtask (subtask.id)}
                        <div
                            class="flex items-center gap-3 p-2 rounded-lg hover:bg-base-200/50 group/sub"
                        >
                            <button
                                type="button"
                                class="
                  w-5 h-5 rounded border-2
                  flex items-center justify-center
                  transition-colors
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
                            <span
                                class="flex-1 text-sm {subtask.is_completed
                                    ? 'line-through text-neutral/40'
                                    : 'text-neutral'}"
                            >
                                {subtask.title}
                            </span>
                            <button
                                type="button"
                                class="opacity-0 group-hover/sub:opacity-100 text-neutral/30 hover:text-danger transition-all"
                                onclick={() => deleteSubtask(subtask.id)}
                            >
                                <Trash2 class="w-3.5 h-3.5" />
                            </button>
                        </div>
                    {/each}

                    <!-- Add Subtask -->
                    <div class="flex items-center gap-3 p-2">
                        <div class="w-5 h-5 flex items-center justify-center">
                            <Plus class="w-4 h-4 text-neutral/30" />
                        </div>
                        <input
                            bind:value={newSubtaskTitle}
                            onkeydown={(e) => e.key === "Enter" && addSubtask()}
                            class="flex-1 bg-transparent text-sm outline-none placeholder:text-neutral/30"
                            placeholder="Add subtask..."
                        />
                    </div>
                </div>
            {/if}
        </div>
    </div>

    <!-- Footer -->
    <div class="p-4 border-t border-base-200 bg-base-100/80 backdrop-blur-sm">
        <div
            class="flex items-center justify-between text-[10px] text-neutral/30"
        >
            <span>Created {new Date(task.createdAt).toLocaleDateString()}</span>
            <span>ID: {task.id.slice(0, 8)}</span>
        </div>
    </div>
</div>
