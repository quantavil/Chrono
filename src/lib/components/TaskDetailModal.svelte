<script lang="ts">
    import { fade, fly } from "svelte/transition";
    import { uiStore } from "$lib/stores/ui.svelte";
    import type { TodoItem } from "$lib/stores/todo.svelte";
    import TaskDetailContainer from "$lib/components/editor/TaskDetailContainer.svelte";

    interface Props {
        isOpen: boolean;
        todo: TodoItem | null;
        onClose?: () => void;
    }

    let { isOpen = $bindable(false), todo, onClose }: Props = $props();

    function close() {
        if (onClose) {
            onClose();
        } else {
            isOpen = false;
        }
    }
</script>

{#if isOpen && todo}
    <!-- Backdrop -->
    <div
        class="fixed inset-0 z-50 bg-black/20 backdrop-blur-[2px] transition-opacity"
        transition:fade={{ duration: 200 }}
        onclick={close}
        onkeydown={(e) => e.key === "Escape" && close()}
        role="button"
        tabindex="0"
        aria-label="Close details"
    ></div>

    <!-- Sidebar / Bottom Sheet Container (Now Full Page on Mobile) -->
    <div
        class="
            fixed z-50
            inset-0 md:inset-x-auto md:inset-y-0 md:right-0
            w-full md:w-96
            h-full
            flex flex-col
            bg-base-100
            md:rounded-l-3xl
            shadow-2xl
        "
        in:fly={uiStore.isMobile
            ? { x: "100%", duration: 300 }
            : uiStore.detailTransition}
        out:fly={uiStore.isMobile
            ? { x: "100%", duration: 300 }
            : uiStore.detailTransition}
        role="dialog"
        aria-modal="true"
    >
        <!-- Mobile Handle (Removed for full page view) -->

        <TaskDetailContainer task={todo} onClose={close} variant="modal" />
    </div>
{/if}
