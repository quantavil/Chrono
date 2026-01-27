<script lang="ts">
    import { fade } from "svelte/transition";
    import EmptyPanel from "$lib/components/panels/EmptyPanel.svelte";
    import TaskPanel from "$lib/components/panels/TaskPanel.svelte";
    import type { TodoItem } from "$lib/stores/todo.svelte";

    interface Props {
        task: TodoItem | null;
        onClose: () => void;
        class?: string;
    }

    let { task, onClose, class: className = "" }: Props = $props();
</script>

<div class="h-full {className}">
    {#if task}
        <div class="h-full" in:fade={{ duration: 200 }}>
            <TaskPanel {task} {onClose} />
        </div>
    {:else}
        <div class="h-full" in:fade={{ duration: 200 }}>
            <EmptyPanel />
        </div>
    {/if}
</div>
