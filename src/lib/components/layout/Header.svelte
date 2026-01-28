<script lang="ts">
    import { Menu, ListTodo } from "lucide-svelte";
    import { uiStore } from "$lib/stores/ui.svelte";
    import { getTodoStore } from "$lib/context";
    import ViewOptions from "$lib/components/tasks/ViewOptions.svelte";

    interface Props {
        class?: string;
    }

    let { class: className = "" }: Props = $props();

    const todoList = getTodoStore();
    const stats = $derived(todoList.stats);

    function openSidebar(): void {
        uiStore.isMobileSidebarOpen = true;
    }
</script>

<header
    class="sticky top-0 z-30 w-full border-b border-base-200/50 bg-base-100/80 backdrop-blur-md {className}"
>
    <div class="flex items-center h-14 w-full px-4 md:px-6 xl:px-8 gap-4">
        <!-- Mobile Menu Button -->
        <button
            type="button"
            class="lg:hidden w-9 h-9 rounded-xl bg-base-200 hover:bg-base-300 flex items-center justify-center transition-all active:scale-95"
            onclick={openSidebar}
            aria-label="Open menu"
        >
            <Menu class="w-5 h-5 text-neutral/70" strokeWidth={2} />
        </button>

        <!-- Title -->
        <div class="flex items-center gap-3 flex-1">
            <div
                class="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary"
            >
                <ListTodo class="w-5 h-5" />
            </div>
            <h1
                class="text-xl font-bold font-display text-neutral tracking-tight"
            >
                My Tasks
            </h1>

            <div class="h-6 w-px bg-base-300 mx-1"></div>

            <div
                class="flex items-center justify-center h-6 px-2.5 rounded-full bg-base-200 text-xs font-bold text-neutral/60 tabular-nums"
            >
                {stats.completedTasks}/{stats.totalTasks}
            </div>
        </div>

        <!-- View Options -->
        <ViewOptions />
    </div>
</header>
