<script lang="ts">
    import AddTaskBar from "$lib/components/AddTaskBar.svelte";
    import Header from "$lib/components/Header.svelte";
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

<div class={className}>
    <!-- Header Ribbon (Sticky) -->
    <Header />

    <!-- Main Content Area -->
    <div class="px-6 xl:px-10 py-6 mx-auto max-w-3xl space-y-6">
        <!-- Add Task Bar -->
        <AddTaskBar variant="inline" />

        <!-- Active Tasks -->
        <TaskList onEdit={onSelectTask} {selectedTaskId} />

        <!-- Completed Tasks -->
        <CompletedSection />
    </div>
</div>
