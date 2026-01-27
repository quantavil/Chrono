<script lang="ts">
    import { X, Trash2 } from "lucide-svelte";
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
</script>

<div
    class="
        flex items-center justify-between border-b border-base-200 transition-all
        {variant === 'panel'
        ? 'p-4 bg-base-100/80 backdrop-blur-sm sticky top-0 z-10'
        : 'p-5 md:p-6 bg-base-100'}
        {className}
    "
>
    <div class="flex items-center gap-3">
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
        <button
            type="button"
            class="
                p-2 rounded-xl transition-all
                text-neutral/40 hover:text-neutral hover:bg-base-200
            "
            onclick={onClose}
            title="Close (Esc)"
        >
            <X class="w-5 h-5 md:w-6 md:h-6" />
        </button>
    </div>
</div>
