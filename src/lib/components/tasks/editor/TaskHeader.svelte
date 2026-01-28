<!--
  Header component for the task detail view, providing editable titles and key status indicators.
-->
<script lang="ts">
    import { X, Trash2, RotateCcw, ArrowLeft } from "lucide-svelte";
    import { getTodoStore } from "$lib/context";
    import type { TodoItem } from "$lib/stores/todo.svelte";

    interface Props {
        task: TodoItem;
        onClose: () => void;
        variant?: "panel" | "modal";
        class?: string;
    }

    let {
        task,
        onClose,
        variant = "panel",
        class: className = "",
    }: Props = $props();

    const todoList = getTodoStore();

    function handleDelete(): void {
        // No confirm dialog, rely on Undo toast
        todoList.remove(task.id);
        onClose();
    }

    function handleResetTimer(e: Event): void {
        e.preventDefault();
        e.stopPropagation();
        todoList.resetTimer(task.id);
    }
</script>

<div
    class="
        flex items-center justify-between border-b border-base-200 transition-all
        {variant === 'panel'
        ? 'p-4 bg-base-100/80 backdrop-blur-sm sticky top-0 z-10'
        : 'p-4 md:p-6 bg-base-100 sticky top-0 md:static z-10'}
        {className}
    "
>
    <div class="flex items-center gap-3">
        {#if variant === "modal"}
            <button
                type="button"
                class="md:hidden -ml-2 p-2 text-neutral hover:bg-base-200 rounded-full"
                onclick={onClose}
                aria-label="Go back"
            >
                <ArrowLeft class="w-6 h-6" />
            </button>
        {/if}
        <h2
            class="
                font-bold text-neutral
                {variant === 'panel'
                ? 'text-xs uppercase tracking-widest opacity-60'
                : 'text-lg md:text-xl'}
            "
        >
            Task Details
        </h2>
    </div>

    <div class="flex items-center gap-1">
        <button
            type="button"
            class="
                p-2 rounded-xl transition-all
                text-neutral/40 hover:text-danger hover:bg-danger/10
            "
            onclick={handleDelete}
            title="Delete task"
        >
            <Trash2 class="w-4 h-4 md:w-5 md:h-5" />
        </button>
        {#if task.currentTimeMs > 0 && !task.isRunning && !task.isCompleted}
            <button
                type="button"
                class="
                    p-2 rounded-xl transition-all
                    text-neutral/40 hover:text-neutral hover:bg-base-200
                "
                onclick={handleResetTimer}
                title="Reset timer"
            >
                <RotateCcw class="w-4 h-4 md:w-5 md:h-5" />
            </button>
        {/if}

        <!-- Close button (Desktop only for modal, or Panel) -->
        <button
            type="button"
            class="
                p-2 rounded-xl transition-all
                text-neutral/40 hover:text-neutral hover:bg-base-200
                {variant === 'modal' ? 'hidden md:block' : ''}
            "
            onclick={onClose}
            title="Close (Esc)"
        >
            <X class="w-5 h-5 md:w-6 md:h-6" />
        </button>
    </div>
</div>
