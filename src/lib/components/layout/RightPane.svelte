<script lang="ts">
    import { fade, fly } from "svelte/transition";
    import StatsPanel from "$lib/components/panels/StatsPanel.svelte";
    import DetailsPanel from "$lib/components/panels/DetailsPanel.svelte";
    import FocusPanel from "$lib/components/panels/FocusPanel.svelte";
    import type { TodoItem } from "$lib/stores/todo.svelte";

    interface Props {
        mode: "stats" | "details" | "focus";
        selectedTask: TodoItem | null;
        timerTask: TodoItem | null;
        onClose: () => void;
        onSelectTask: (id: string) => void;
        class?: string;
    }

    let {
        mode,
        selectedTask,
        timerTask,
        onClose,
        onSelectTask,
        class: className = "",
    }: Props = $props();
</script>

<div class="h-full {className}">
    {#key mode}
        <div
            class="h-full"
            in:fade={{ duration: 200, delay: 50 }}
            out:fade={{ duration: 150 }}
        >
            {#if mode === "focus" && timerTask}
                <FocusPanel task={timerTask} />
            {:else if mode === "details" && selectedTask}
                <DetailsPanel task={selectedTask} {onClose} />
            {:else}
                <StatsPanel {onSelectTask} />
            {/if}
        </div>
    {/key}
</div>
