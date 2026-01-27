<script lang="ts">
    import {
        MoreVertical,
        Trash2,
        Clock,
        FileText,
        CheckSquare,
        Pencil,
        ChevronDown,
        RotateCcw,
        ChevronRight,
    } from "lucide-svelte";
    import type { TodoItem } from "$lib/stores/todo.svelte";
    import { getTodoStore } from "$lib/context";

    interface Props {
        todo: TodoItem;
        isSubtasksOpen: boolean;
        onEdit: (id: string, mode?: "content" | "settings") => void;
        onToggleSubtasks: () => void;
    }

    const todoList = getTodoStore();

    let { todo, isSubtasksOpen, onToggleSubtasks, onEdit }: Props = $props();

    const isRunning = $derived(todo.isRunning);
    const isCompleted = $derived(todo.isCompleted);
    const hasTime = $derived(todo.currentTimeMs > 0);
    const hasSubtasks = $derived(todo.subtasks.length > 0);

    function handleResetTimer(): void {
        if (confirm("Reset timer to 0:00?")) {
            todoList.resetTimer(todo.id);
        }
    }

    function handleDelete(): void {
        todoList.remove(todo.id);
    }
</script>

<div
    class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
>
    {#if hasSubtasks}
        <button
            type="button"
            class="p-2 rounded-lg text-neutral-muted hover:text-neutral hover:bg-base-200/80 transition-colors"
            onclick={(e) => {
                e.stopPropagation();
                onToggleSubtasks();
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
