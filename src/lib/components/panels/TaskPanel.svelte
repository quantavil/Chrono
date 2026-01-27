<script lang="ts">
    import { fly } from "svelte/transition";
    import type { TodoItem } from "$lib/stores/todo.svelte";
    import TaskHeader from "$lib/components/editor/TaskHeader.svelte";
    import TaskEditor from "$lib/components/editor/TaskEditor.svelte";

    interface Props {
        task: TodoItem;
        onClose: () => void;
        class?: string;
    }

    let { task, onClose, class: className = "" }: Props = $props();
</script>

<div class="h-full flex flex-col bg-base-100 {className}">
    <TaskHeader {task} {onClose} variant="panel" />

    <!-- ===== SCROLLABLE CONTENT ===== -->
    <div class="flex-1 overflow-hidden relative">
        {#key task.id}
            <!-- TaskEditor handles its own scrolling and layout -->
            <TaskEditor {task} class="h-full" />
        {/key}
    </div>
</div>
