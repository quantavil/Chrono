<script lang="ts">
    import AddTaskBar from "$lib/components/AddTaskBar.svelte";
    import TaskList from "$lib/components/TaskList.svelte";
    import CompletedSection from "$lib/components/CompletedSection.svelte";
    import { formatDateHeader } from "$lib/utils/formatTime";

    interface Props {
        selectedTaskId: string | null;
        onSelectTask: (id: string) => void;
        class?: string;
    }

    let {
        selectedTaskId,
        onSelectTask,
        class: className = "",
    }: Props = $props();

    const today = new Date();
</script>

<div class="space-y-6 {className}">
    <!-- Page Title for Desktop (since Sidebar has logo) -->
    <div class="mb-8">
        <h1 class="text-3xl font-bold text-neutral tracking-tight">Today</h1>
        <p class="text-neutral/50 font-medium">
            {formatDateHeader(today).fullDate}
        </p>
    </div>

    <!-- Add Task Bar -->
    <AddTaskBar variant="inline" />

    <!-- Active Tasks -->
    <TaskList onEdit={onSelectTask} {selectedTaskId} />

    <!-- Completed Tasks -->
    <CompletedSection />
</div>
