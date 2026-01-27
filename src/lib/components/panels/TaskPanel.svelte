<script lang="ts">
    import { fly } from "svelte/transition";
    import { X, Trash2 } from "lucide-svelte";
    import type { TodoItem } from "$lib/stores/todo.svelte";
    import { todoList } from "$lib/stores/todo.svelte";
    import TaskEditor from "$lib/components/editor/TaskEditor.svelte";

    interface Props {
        task: TodoItem;
        onClose: () => void;
        mode?: "content" | "settings"; // Kept for compatibility, unused
        class?: string;
    }

    let {
        task,
        onClose, // mode, // Unused
        class: className = "",
    }: Props = $props();

    function handleDelete(): void {
        if (confirm("Delete this task?")) {
            todoList.remove(task.id);
            onClose();
        }
    }
</script>

<div class="h-full flex flex-col bg-base-100 {className}">
    <!-- ===== HEADER ===== -->
    <div
        class="flex items-center justify-between p-4 border-b border-base-200 bg-base-100/80 backdrop-blur-sm sticky top-0 z-10"
    >
        <div class="flex items-center gap-3">
            <h2
                class="text-sm font-bold text-neutral/70 uppercase tracking-widest"
            >
                Task Details
            </h2>
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
    <div class="flex-1 overflow-hidden relative">
        {#key task.id}
            <!-- TaskEditor handles its own scrolling and layout -->
            <TaskEditor {task} class="h-full" />
        {/key}
    </div>
</div>
