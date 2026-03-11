<!--
  Wrapper component for the task editor and detail view in the right pane.
-->
<script lang="ts">
    import type { TodoItem } from "$lib/stores/todo.svelte";
    import TaskDetailContainer from "$lib/components/tasks/editor/TaskDetailContainer.svelte";

    interface Props {
        task: TodoItem;
        onClose: () => void;
        class?: string;
    }

    let { task, onClose, class: className = "" }: Props = $props();
</script>

<TaskDetailContainer {task} {onClose} variant="panel" class={className} />
