<script lang="ts">
    import type { TodoItem } from "$lib/stores/todo.svelte";
    import TaskEditor from "./TaskEditor.svelte";
    import TaskHeader from "./TaskHeader.svelte";

    interface Props {
        task: TodoItem;
        onClose: () => void;
        variant: "modal" | "panel";
        class?: string;
    }

    let { task, onClose, variant, class: className = "" }: Props = $props();
</script>

<div class="flex flex-col h-full bg-base-100 {className}">
    <TaskHeader {task} {onClose} {variant} />

    <!-- ===== SCROLLABLE CONTENT ===== -->
    <div class="flex-1 overflow-hidden relative">
        {#key task.id}
            <!-- TaskEditor handles its own scrolling and layout -->
            <TaskEditor {task} class="h-full" />
        {/key}
    </div>
</div>
