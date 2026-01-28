<script lang="ts">
    import { slide } from "svelte/transition";
    import { Plus, GripVertical, X, Trash2, CheckCircle2 } from "lucide-svelte";
    import TaskCheckbox from "./TaskCheckbox.svelte";
    import { getTodoStore } from "$lib/context";
    import type { TodoItem } from "$lib/stores/todo.svelte";

    let { todo }: { todo: TodoItem } = $props();

    let newSubtaskTitle = $state("");

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
