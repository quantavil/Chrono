<script lang="ts">
    import { fade, fly } from "svelte/transition";
    import { X, Trash2 } from "lucide-svelte";
    import type { TodoItem } from "$lib/stores/todo.svelte";
    import { todoList } from "$lib/stores/todo.svelte";
    import { uiStore } from "$lib/stores/ui.svelte";
    import TaskEditor from "$lib/components/editor/TaskEditor.svelte";
    import TaskHeader from "$lib/components/editor/TaskHeader.svelte";

    interface Props {
        isOpen: boolean;
        todo: TodoItem | null;
    }

    let { isOpen = $bindable(false), todo }: Props = $props();

    const isMobile = $derived(uiStore.isMobile);

    function close() {
        isOpen = false;
    }

    // Transition params generator
    function getTransitionParams() {
        if (isMobile) {
            return { y: 300, duration: 300, opacity: 1 };
        }
        return { x: 300, duration: 300, opacity: 1 };
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

    <!-- Sidebar / Bottom Sheet Container -->
    <div
        class="
            fixed z-50
            inset-x-0 bottom-0 md:inset-x-auto md:inset-y-0 md:right-0
            w-full md:w-96
            max-h-[85vh] md:max-h-full
            flex flex-col
            bg-base-100
            md:rounded-l-3xl rounded-t-3xl md:rounded-tr-none
            shadow-2xl
        "
        in:fly={getTransitionParams()}
        out:fly={getTransitionParams()}
        role="dialog"
        aria-modal="true"
    >
        <!-- Mobile Handle -->
        <div
            class="md:hidden flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing"
            onclick={close}
            role="button"
            tabindex="0"
            onkeydown={(e) => (e.key === "Enter" || e.key === " ") && close()}
        >
            <div class="w-12 h-1.5 rounded-full bg-neutral/20"></div>
        </div>

        <TaskHeader task={todo} onClose={close} variant="modal" />

        <!-- Content -->
        <div class="flex-1 overflow-hidden relative">
            {#key todo.id}
                <TaskEditor task={todo} class="h-full" />
            {/key}
        </div>
    </div>
{/if}
