<script lang="ts">
    import { fade, slide } from "svelte/transition";
    import {
        Calendar,
        Tag,
        Clock,
        Type,
        AlignLeft,
        MoreVertical,
        Trash2,
        CheckSquare,
        AlertCircle,
        Repeat,
        CheckCircle2,
        Plus,
        X,
        ChevronRight,
        ChevronDown,
    } from "lucide-svelte";
    import { getTodoStore } from "$lib/context";
    import type { TodoItem } from "$lib/stores/todo.svelte";
    import { formatRelativeDate } from "$lib/utils/formatTime";
    import TiptapEditor from "$lib/components/editor/TiptapEditor.svelte";
    import type { Priority, RecurrenceConfig } from "$lib/types";
    import { uiStore } from "$lib/stores/ui.svelte";
    import TaskHeader from "$lib/components/editor/TaskHeader.svelte";
    import CustomDatePicker from "$lib/components/CustomDatePicker.svelte";

    interface Props {
        task: TodoItem;
        class?: string;
    }

    let { task, class: className = "" }: Props = $props();

    const todoList = getTodoStore();

    let titleRef = $state<HTMLTextAreaElement | null>(null);
    let datePickerRef = $state<HTMLInputElement | null>(null);
    // -------------------------------------------------------------------------
    // Local State
    // -------------------------------------------------------------------------
    let tagsInput = $state("");
    let newSubtaskTitle = $state("");
    let isSubtasksOpen = $state(true);

    // Recurrence
    let recurrenceDays = $state<number[]>([]);

    const activeTags = $derived(task.tags);
    const isCompleted = $derived(task.isCompleted);
    const subtaskProgress = $derived(task.subtaskProgress);

    // -------------------------------------------------------------------------
    // Responsive State
    // -------------------------------------------------------------------------
    const isMobile = $derived(uiStore.isMobile);

    // -------------------------------------------------------------------------
    // Sync Reactivity
    // -------------------------------------------------------------------------
    $effect(() => {
        // Sync Recurrence Days derived from task
        if (task.recurrence?.type === "daily") {
            recurrenceDays = [0, 1, 2, 3, 4, 5, 6];
        } else if (task.recurrence?.type === "weekly" && task.recurrence.days) {
            recurrenceDays = [...task.recurrence.days];
        } else {
            recurrenceDays = [];
        }
    });

    // -------------------------------------------------------------------------
    // Actions
    // -------------------------------------------------------------------------

    function updateTitle(e: Event) {
        const value = (e.target as HTMLInputElement).value;
        if (value !== task.title) {
            todoList.updateTitle(task.id, value);
        }
    }

    function handleNotesChange(content: string) {
        // Debounce handled in Tiptap? Or we debounce here logic if needed.
        // Direct update likely fine if Tiptap debounces on input.
        // TaskPanel had debounce. Let's add simple debounce if performance issue.
        // For now, direct update to model which is smart.
        task.applyUpdate({ notes: content });
    }

    function handlePriorityChange(p: Priority) {
        task.applyUpdate({ priority: p });
    }

    // --- Tags ---
    function addTag() {
        const trimmed = tagsInput.trim().toLowerCase();
        if (trimmed && !task.tags.includes(trimmed)) {
            todoList.updateTags(task.id, [...task.tags, trimmed]);
        }
        tagsInput = "";
    }

    function removeTag(tag: string) {
        todoList.updateTags(
            task.id,
            task.tags.filter((t) => t !== tag),
        );
    }

    function handleTagKeydown(e: KeyboardEvent) {
        if (e.key === "Enter") {
            e.preventDefault();
            addTag();
        } else if (
            e.key === "Backspace" &&
            !tagsInput &&
            task.tags.length > 0
        ) {
            removeTag(task.tags[task.tags.length - 1]);
        }
    }

    // --- Subtasks ---
    function addSubtask() {
        const trimmed = newSubtaskTitle.trim();
        if (!trimmed) return;
        task.addSubtask(trimmed);
        newSubtaskTitle = "";
    }

    function deleteSubtask(id: string) {
        task.removeSubtask(id);
    }

    // --- Recurrence ---
    function toggleDay(day: number) {
        let newDays = [...recurrenceDays];
        if (newDays.includes(day)) {
            newDays = newDays.filter((d) => d !== day);
        } else {
            newDays.push(day);
        }
        applyRecurrence(newDays);
    }

    function applyRecurrence(days: number[]) {
        recurrenceDays = days;
        let recurrence: RecurrenceConfig | null = null;
        if (days.length === 7) {
            recurrence = { type: "daily" };
        } else if (days.length > 0) {
            recurrence = { type: "weekly", days: days };
        }
        task.applyUpdate({ recurrence });
    }

    function setRecurrencePreset(type: "daily" | "weekdays") {
        const isDaily = task.recurrence?.type === "daily";
        const isWeekdays =
            task.recurrence?.type === "weekly" &&
            task.recurrence.days?.length === 5 &&
            task.recurrence.days.every((d) => [1, 2, 3, 4, 5].includes(d));

        if (type === "daily" && isDaily) {
            task.applyUpdate({ recurrence: null });
            recurrenceDays = [];
        } else if (type === "weekdays" && isWeekdays) {
            task.applyUpdate({ recurrence: null });
            recurrenceDays = [];
        } else if (type === "daily") {
            applyRecurrence([0, 1, 2, 3, 4, 5, 6]);
        } else if (type === "weekdays") {
            applyRecurrence([1, 2, 3, 4, 5]);
        }
    }

    function setDueDate(type: "today" | "tomorrow" | "week" | "clear") {
        const d = new Date();
        d.setHours(0, 0, 0, 0);

        if (type === "today") {
            task.applyUpdate({ dueAt: d.toISOString() });
        } else if (type === "tomorrow") {
            d.setDate(d.getDate() + 1);
            task.applyUpdate({ dueAt: d.toISOString() });
        } else if (type === "week") {
            d.setDate(d.getDate() + 7);
            task.applyUpdate({ dueAt: d.toISOString() });
        } else {
            task.applyUpdate({ dueAt: null });
        }
    }

    // -------------------------------------------------------------------------
    // Constants
    // -------------------------------------------------------------------------
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
            class: "bg-danger/10 text-danger border-danger",
        },
        medium: {
            label: "Medium",
            class: "bg-warning/10 text-warning border-warning",
        },
        low: {
            label: "Low",
            class: "bg-success/10 text-success border-success",
        },
    };
</script>

<div
    class="flex flex-col h-full bg-base-100 {className} overflow-y-auto scrollbar-hide"
>
    <div class="p-6 space-y-8">
        <!-- 1. TITLE SECTION -->
        <div class="space-y-4">
            <div class="flex items-start gap-3">
                <!-- Checkbox -->
                <button
                    class="
                        mt-1.5 w-6 h-6 rounded-lg border-2
                        flex items-center justify-center
                        transition-all duration-200 shrink-0
                        {isCompleted
                        ? 'bg-accent border-accent text-white'
                        : 'border-neutral/30 hover:border-accent hover:bg-accent/10'}
                    "
                    onclick={() => todoList.toggleComplete(task.id)}
                >
                    {#if isCompleted}
                        <CheckCircle2 class="w-4 h-4" strokeWidth={3} />
                    {/if}
                </button>

                <!-- Title Input -->
                <div class="flex-1 space-y-2">
                    <input
                        value={task.title}
                        onblur={updateTitle}
                        onkeydown={(e) =>
                            e.key === "Enter" &&
                            (e.target as HTMLElement).blur()}
                        class="
                            w-full bg-transparent
                            text-xl font-bold
                            placeholder:text-neutral/30
                            outline-none
                            text-neutral
                            {isCompleted ? 'line-through text-neutral/50' : ''}
                        "
                        placeholder="Task title..."
                    />

                    <!-- Quick Tags -->
                    {#if task.tags.length > 0}
                        <div class="flex flex-wrap gap-1.5">
                            {#each task.tags as tag}
                                <span
                                    class="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full"
                                >
                                    #{tag}
                                </span>
                            {/each}
                        </div>
                    {/if}
                </div>
            </div>
        </div>

        <!-- 2. DESCRIPTION (NOTES) -->
        <div class="prose prose-sm max-w-none text-neutral/80">
            <TiptapEditor
                content={task.notes || ""}
                placeholder="Add notes, details, or links..."
                onChange={handleNotesChange}
                minHeight="120px"
                showToolbar={true}
            />
        </div>

        <!-- 3. SUBTASKS -->
        <div class="space-y-3 border-t border-base-200 pt-6">
            <button
                class="flex items-center gap-2 text-xs font-bold text-neutral/50 uppercase tracking-wider hover:text-neutral transition-colors w-full group"
                onclick={() => (isSubtasksOpen = !isSubtasksOpen)}
            >
                {#if isSubtasksOpen}
                    <ChevronDown class="w-4 h-4" />
                {:else}
                    <ChevronRight class="w-4 h-4" />
                {/if}
                Subtasks
                {#if subtaskProgress.total > 0}
                    <span class="ml-auto font-normal normal-case opacity-50">
                        {subtaskProgress.completed}/{subtaskProgress.total}
                    </span>
                {/if}
            </button>

            {#if isSubtasksOpen}
                <div
                    class="space-y-2 pl-1"
                    transition:slide={{ duration: 200 }}
                >
                    {#each task.subtasks as subtask (subtask.id)}
                        <div class="group flex items-center gap-3">
                            <button
                                class="
                                    w-4 h-4 rounded border
                                    flex items-center justify-center
                                    transition-all
                                    {subtask.is_completed
                                    ? 'bg-primary border-primary text-white'
                                    : 'border-neutral/30 hover:border-primary'}
                                "
                                onclick={() => task.toggleSubtask(subtask.id)}
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
                                    ? 'text-neutral/40 line-through'
                                    : 'text-neutral'}
                                "
                                onblur={(e) =>
                                    task.updateSubtaskTitle(
                                        subtask.id,
                                        (e.target as HTMLInputElement).value,
                                    )}
                                onkeydown={(e) =>
                                    e.key === "Enter" &&
                                    (e.target as HTMLElement).blur()}
                            />

                            <button
                                class="opacity-0 group-hover:opacity-100 text-neutral/30 hover:text-danger"
                                onclick={() => deleteSubtask(subtask.id)}
                            >
                                <X class="w-3.5 h-3.5" />
                            </button>
                        </div>
                    {/each}

                    <!-- Add Subtask -->
                    <div class="flex items-center gap-3 mt-2">
                        <Plus class="w-4 h-4 text-neutral/40" />
                        <input
                            bind:value={newSubtaskTitle}
                            class="flex-1 bg-transparent text-sm text-neutral placeholder:text-neutral/40 outline-none"
                            placeholder="Add subtask..."
                            onkeydown={(e) => e.key === "Enter" && addSubtask()}
                        />
                    </div>
                </div>
            {/if}
        </div>

        <!-- 4. METADATA & SETTINGS -->
        <div class="space-y-6 pt-6 border-t border-base-200">
            <h3
                class="text-xs font-bold text-neutral/40 uppercase tracking-wider"
            >
                Settings
            </h3>

            <!-- Priority -->
            <div>
                <p class="text-xs font-medium text-neutral/50 mb-2">Priority</p>
                <div class="flex gap-2">
                    {#each ["high", "medium", "low"] as const as p}
                        {@const config = priorityConfig[p]}
                        <button
                            class="
                                flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all
                                {task.priority === p
                                ? `${config.class} border-opacity-100`
                                : 'border-base-300 text-neutral/40 hover:border-neutral/30'}
                            "
                            onclick={() => handlePriorityChange(p)}
                        >
                            {config.label}
                        </button>
                    {/each}
                </div>
            </div>

            <!-- Due Date -->
            <div class="space-y-3">
                <div class="flex items-center justify-between">
                    <p
                        class="text-xs font-medium text-neutral/50 flex items-center gap-1.5"
                    >
                        <Calendar class="w-3.5 h-3.5" /> Due Date
                    </p>
                </div>

                <!-- Presets Row -->
                <div class="flex gap-2">
                    <button
                        class="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-base-200/50 hover:bg-base-200 transition-all text-neutral/70 border border-transparent hover:border-base-300"
                        onclick={() => setDueDate("today")}
                    >
                        Today
                    </button>
                    <button
                        class="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-base-200/50 hover:bg-base-200 transition-all text-neutral/70 border border-transparent hover:border-base-300"
                        onclick={() => setDueDate("tomorrow")}
                    >
                        Tomorrow
                    </button>
                    <button
                        class="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-base-200/50 hover:bg-base-200 transition-all text-neutral/70 border border-transparent hover:border-base-300"
                        onclick={() => setDueDate("week")}
                    >
                        Next Week
                    </button>
                </div>

                <!-- Custom Picker & Clear Button -->
                <div class="flex items-center gap-2">
                    <CustomDatePicker bind:value={task.dueAt} class="flex-1" />

                    {#if task.dueAt}
                        <button
                            class="h-full px-3 rounded-xl border-2 border-dashed border-danger/30 text-danger/50 hover:text-danger hover:border-danger hover:bg-danger/5 transition-all flex items-center justify-center aspect-square"
                            title="Clear due date"
                            onclick={() => setDueDate("clear")}
                        >
                            <X class="w-5 h-5" />
                        </button>
                    {/if}
                </div>
            </div>

            <!-- Estimated Duration -->
            <!-- Estimated Duration -->
            <div>
                <p
                    class="text-xs font-medium text-neutral/50 mb-2 flex items-center gap-1.5"
                >
                    <Clock class="w-3.5 h-3.5" /> Estimated Duration
                </p>
                <div class="flex flex-wrap gap-2 mb-3">
                    {#each todoList.preferences.customTimePresets || [15, 30, 45, 60, 90, 120] as mins}
                        <button
                            class="
                                flex-1 min-w-[3.5rem] px-2 py-1.5 rounded-lg text-xs font-semibold
                                text-center whitespace-nowrap transition-all
                                {Math.round(
                                (task.estimatedTime || 0) / 60000,
                            ) === mins
                                ? 'bg-primary text-white shadow-sm'
                                : 'bg-base-200 text-neutral/60 hover:bg-base-300'}
                            "
                            onclick={() =>
                                task.applyUpdate({
                                    estimatedTime: mins * 60 * 1000,
                                })}
                        >
                            {mins >= 60
                                ? `${Number(mins / 60).toLocaleString()}h`
                                : `${mins}m`}
                        </button>
                    {/each}
                </div>
            </div>

            <!-- Recurrence -->
            <div>
                <div class="flex items-center justify-between mb-2">
                    <p
                        class="text-xs font-medium text-neutral/50 flex items-center gap-1.5"
                    >
                        <Repeat class="w-3.5 h-3.5" /> Recurrence
                    </p>
                    <div class="flex gap-2">
                        <button
                            class="text-[10px] font-bold text-primary hover:bg-primary/10 px-2 py-1 rounded transition-colors uppercase tracking-wider"
                            onclick={() => setRecurrencePreset("daily")}
                        >
                            Daily
                        </button>
                        <button
                            class="text-[10px] font-bold text-primary hover:bg-primary/10 px-2 py-1 rounded transition-colors uppercase tracking-wider"
                            onclick={() => setRecurrencePreset("weekdays")}
                        >
                            Weekdays
                        </button>
                    </div>
                </div>
                <div
                    class="flex justify-between bg-base-200/50 rounded-xl p-1.5"
                >
                    {#each DAYS as day}
                        <button
                            class="
                                w-8 h-8 rounded-lg text-xs font-bold transition-all
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
            </div>

            <!-- Tags -->
            <div>
                <p
                    class="text-xs font-medium text-neutral/50 mb-2 flex items-center gap-1.5"
                >
                    <Tag class="w-3.5 h-3.5" /> Tags
                </p>
                <div class="flex flex-wrap gap-2 mb-2">
                    {#each task.tags as tag}
                        <span
                            class="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10 text-primary text-xs font-medium"
                        >
                            #{tag}
                            <button
                                onclick={() => removeTag(tag)}
                                class="hover:text-primary-dark ml-0.5"
                            >
                                <X class="w-3 h-3" />
                            </button>
                        </span>
                    {/each}
                </div>
                <input
                    bind:value={tagsInput}
                    onkeydown={handleTagKeydown}
                    class="
                        w-full bg-base-200/50 rounded-xl px-3 py-2
                        text-sm outline-none border-2 border-transparent
                        focus:border-primary/30 focus:bg-base-100
                        placeholder:text-neutral/40 transition-all
                    "
                    placeholder="Add tag and press Enter..."
                />
            </div>
        </div>

        <!-- Footer Metadata -->
        <div
            class="pt-6 border-t border-base-200 flex justify-between items-center text-[10px] text-neutral/30 font-mono"
        >
            <span>Created {new Date(task.createdAt).toLocaleDateString()}</span>
            <span>ID: {task.id.slice(0, 8)}</span>
        </div>
    </div>
</div>
