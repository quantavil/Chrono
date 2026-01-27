<script lang="ts">
    import { fade, fly } from "svelte/transition";
    import { X, Trash2 } from "lucide-svelte";
    import type { TodoItem } from "$lib/stores/todo.svelte";
    import { todoList } from "$lib/stores/todo.svelte";
    import { onMount } from "svelte";
    import TaskEditor from "$lib/components/editor/TaskEditor.svelte";

    interface Props {
        isOpen: boolean;
        todo: TodoItem | null;
    }

    let { isOpen = $bindable(false), todo }: Props = $props();

    let isMobile = $state(false);

    function updateMedia() {
        if (typeof window !== "undefined") {
            isMobile = window.innerWidth < 768;
        }
    }

    onMount(() => {
        updateMedia();
        window.addEventListener("resize", updateMedia);
        return () => window.removeEventListener("resize", updateMedia);
    });

    function close() {
        isOpen = false;
    }

    function handleDelete(): void {
        if (todo && confirm("Delete this task?")) {
            todoList.remove(todo.id);
            close();
        }
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

        <!-- Header -->
        <div
            class="flex items-center justify-between p-6 border-b border-base-200"
        >
            <h2 class="text-lg font-bold text-neutral">Task Details</h2>
            <div class="flex items-center gap-1">
                <button
                    onclick={handleDelete}
                    class="p-2 hover:bg-red-50 text-neutral/40 hover:text-red-500 rounded-xl transition-colors"
                    title="Delete Task"
                >
                    <Trash2 class="w-5 h-5" />
                </button>
                <button
                    onclick={close}
                    class="p-2 hover:bg-base-200 rounded-xl transition-colors"
                >
                    <X class="w-5 h-5 text-neutral/60" />
                </button>
            </div>
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-hidden relative">
            {#key todo.id}
                <TaskEditor task={todo} class="h-full" />
            {/key}
        </div>
    </div>
{/if}
