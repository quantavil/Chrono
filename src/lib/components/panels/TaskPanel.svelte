<script lang="ts">
    import { fade, fly, slide } from "svelte/transition";
    import { quintOut } from "svelte/easing";
    import {
        X,
        Trash2,
        CheckCircle2,
        Calendar,
        Tag,
        Plus,
        AlertCircle,
        Repeat,
        FileText,
        ChevronDown,
        GripVertical,
        Clock,
    } from "lucide-svelte";
    import type { TodoItem } from "$lib/stores/todo.svelte";
    import type { RecurrenceConfig, Priority } from "$lib/types";
    import { todoList } from "$lib/stores/todo.svelte";
    import { formatRelativeDate } from "$lib/utils/formatTime";
    import TiptapEditor from "$lib/components/editor/TiptapEditor.svelte";

    interface Props {
        task: TodoItem;
        mode?: "content" | "settings";
        onClose: () => void;
        class?: string;
    }

    let {
        task,
        mode = "content",
        onClose,
        class: className = "",
    }: Props = $props();

    // -------------------------------------------------------------------------
    // Local State
    // -------------------------------------------------------------------------

    let title = $state("");
    let notes = $state("");
    let priority = $state<Priority>("medium");
    let tagsInput = $state("");
    let activeTags = $state<string[]>([]);
    let newSubtaskTitle = $state("");

    // UI State
    // let showMetadata = $state(false); // Removed in favor of mode

    // Recurrence
    let recurrenceDays = $state<number[]>([]);

    // -------------------------------------------------------------------------
    // Sync with task changes
    // -------------------------------------------------------------------------

    $effect(() => {
        title = task.title;
        notes = task.notes || "";
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

    const isCompleted = $derived(task.isCompleted);
    const isOverdue = $derived(
        task.dueAt && new Date(task.dueAt) < new Date() && !isCompleted,
    );
    const subtaskProgress = $derived(task.subtaskProgress);
    const hasSubtasks = $derived(task.subtasks.length > 0);
    const hasNotes = $derived(
        (notes || "").trim().length > 0 && notes !== "<p></p>",
    );

    // -------------------------------------------------------------------------
    // Handlers
    // -------------------------------------------------------------------------

    function handleTitleBlur(): void {
        const trimmed = title.trim();
        if (trimmed && trimmed !== task.title) {
            todoList.updateTitle(task.id, trimmed);
        }
    }

    function handleTitleKeydown(e: KeyboardEvent): void {
        if (e.key === "Enter") {
            e.preventDefault();
            (e.target as HTMLInputElement).blur();
        }
    }

    function handleNotesChange(content: string): void {
        notes = content;
        // Debounced save
        clearTimeout(notesSaveTimeout);
        notesSaveTimeout = setTimeout(() => {
            task.applyUpdate({ notes: content });
        }, 500);
    }

    let notesSaveTimeout: ReturnType<typeof setTimeout>;

    function handleToggleComplete(): void {
        todoList.toggleComplete(task.id);
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
        const trimmed = tagsInput.trim().toLowerCase();
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

    function handleTagKeydown(e: KeyboardEvent): void {
        if (e.key === "Enter") {
            e.preventDefault();
            addTag();
        } else if (
            e.key === "Backspace" &&
            tagsInput === "" &&
            activeTags.length > 0
        ) {
            activeTags = activeTags.slice(0, -1);
            task.applyUpdate({ tags: activeTags });
        }
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

    function updateSubtaskTitle(subtaskId: string, newTitle: string): void {
        const trimmed = newTitle.trim();
        if (!trimmed) return;
        const newSubtasks = task.subtasks.map((s) =>
            s.id === subtaskId ? { ...s, title: trimmed } : s,
        );
        todoList.updateSubtasks(task.id, newSubtasks);
    }

    // Recurrence
    function toggleDay(day: number): void {
        if (recurrenceDays.includes(day)) {
            recurrenceDays = recurrenceDays.filter((d) => d !== day);
        } else {
            recurrenceDays = [...recurrenceDays, day];
        }

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
            dot: "bg-danger",
        },
        medium: {
            label: "Medium",
            color: "text-warning",
            bg: "bg-warning/10",
            border: "border-warning",
            dot: "bg-warning",
        },
        low: {
            label: "Low",
            color: "text-info",
            bg: "bg-info/10",
            border: "border-info",
            dot: "bg-info",
        },
    };
</script>

<div class="h-full flex flex-col bg-base-100 {className}">
    <!-- ===== HEADER ===== -->
    <div
        class="flex items-center justify-between p-4 border-b border-base-200 bg-base-100/80 backdrop-blur-sm sticky top-0 z-10"
    >
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
                title={isCompleted ? "Mark incomplete" : "Mark complete"}
            >
                {#if isCompleted}
                    <CheckCircle2 class="w-4 h-4" strokeWidth={2.5} />
                {/if}
            </button>

            <!-- Priority Dot -->
            {#if priority}
                <div
                    class="w-2.5 h-2.5 rounded-full {priorityConfig[priority]
                        .dot}"
                ></div>
            {/if}
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
                title="Close panel (Esc)"
            >
                <X class="w-5 h-5" />
            </button>
        </div>
    </div>

    <!-- ===== SCROLLABLE CONTENT ===== -->
    <div class="flex-1 overflow-y-auto scrollbar-hide">
        <div class="p-6 space-y-6">
            <!-- ===== TITLE ===== -->
            <div in:fly={{ y: 10, duration: 200 }}>
                <input
                    bind:value={title}
                    onblur={handleTitleBlur}
                    onkeydown={handleTitleKeydown}
                    class="
            w-full bg-transparent
            text-xl font-bold
            placeholder:text-neutral/30
            outline-none
            transition-colors
            {isCompleted
                        ? 'line-through text-neutral/50'
                        : priorityConfig[priority].color}
          "
                    placeholder="Task title..."
                    disabled={isCompleted}
                />

                <!-- Quick Tags Display (Only in Content Mode) -->
                {#if mode === "content" && activeTags.length > 0}
                    <div class="flex flex-wrap gap-1.5 mt-2">
                        {#each activeTags as tag}
                            <span
                                class="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full"
                            >
                                #{tag}
                            </span>
                        {/each}
                    </div>
                {/if}
            </div>

            <!-- ===== CONTENT MODE: Subtasks & Notes ===== -->
            {#if mode === "content"}
                <!-- ===== NOTES SECTION (Live Markdown Editor) ===== -->
                <div in:fly={{ y: 10, duration: 200, delay: 100 }}>
                    <!-- Tiptap Live Editor -->
                    <TiptapEditor
                        content={notes}
                        placeholder="Write your notes here..."
                        onChange={handleNotesChange}
                        minHeight="calc(100vh - 400px)"
                        showToolbar={false}
                    />
                </div>
            {/if}

            <!-- ===== SETTINGS MODE: Metadata ===== -->
            {#if mode === "settings"}
                <div
                    in:fly={{ y: 10, duration: 200, delay: 50 }}
                    class="space-y-6"
                >
                    <!-- ===== DIVIDER ===== -->
                    <div class="border-t border-base-200"></div>

                    <div
                        class="space-y-4 pt-2"
                        transition:slide={{ duration: 200 }}
                    >
                        <!-- Priority -->
                        <div>
                            <p
                                class="text-xs font-medium text-neutral/50 mb-2 block"
                            >
                                Priority
                            </p>
                            <div class="flex gap-2">
                                {#each ["high", "medium", "low"] as const as p}
                                    {@const config = priorityConfig[p]}
                                    <button
                                        type="button"
                                        class="
                      flex-1 py-2 rounded-xl
                      text-xs font-semibold
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
                                    <p class="text-xs text-neutral/40">
                                        Due date
                                    </p>
                                </div>
                            </div>
                        {/if}

                        <!-- Recurrence -->
                        <div>
                            <p
                                class="text-xs font-medium text-neutral/50 mb-2 flex items-center gap-1.5"
                            >
                                <Repeat class="w-3.5 h-3.5" />
                                Repeats
                            </p>
                            <div
                                class="flex justify-between bg-base-200/50 rounded-xl p-1.5"
                            >
                                {#each DAYS as day}
                                    <button
                                        type="button"
                                        class="
                      w-8 h-8 rounded-lg
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
                        </div>

                        <!-- Tags -->
                        <div>
                            <p
                                class="text-xs font-medium text-neutral/50 mb-2 flex items-center gap-1.5"
                            >
                                <Tag class="w-3.5 h-3.5" />
                                Tags
                            </p>

                            <div class="flex flex-wrap gap-2 mb-2">
                                {#each activeTags as tag}
                                    <span
                                        class="
                      inline-flex items-center gap-1
                      px-2 py-1 rounded-lg
                      bg-primary/10 text-primary
                      text-xs font-medium
                    "
                                    >
                                        #{tag}
                                        <button
                                            type="button"
                                            class="hover:text-primary-dark ml-0.5"
                                            onclick={() => removeTag(tag)}
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
                  w-full bg-base-200/50 rounded-xl
                  px-3 py-2
                  text-sm outline-none
                  border-2 border-transparent
                  focus:border-primary/30 focus:bg-base-100
                  placeholder:text-neutral/40
                  transition-all
                "
                                placeholder="Add tag and press Enter..."
                            />
                        </div>
                    </div>
                </div>
            {/if}
        </div>
    </div>

    <!-- ===== FOOTER ===== -->
    <div class="p-4 border-t border-base-200 bg-base-100/80 backdrop-blur-sm">
        <div
            class="flex items-center justify-between text-[10px] text-neutral/30"
        >
            <div class="flex items-center gap-3">
                <span
                    >Created {new Date(
                        task.createdAt,
                    ).toLocaleDateString()}</span
                >
                {#if task.currentTimeMs > 0}
                    <span class="flex items-center gap-1">
                        <Clock class="w-3 h-3" />
                        {task.timerDisplay.formatted}
                    </span>
                {/if}
            </div>
            <span class="font-mono">ID: {task.id.slice(0, 8)}</span>
        </div>
    </div>
</div>
