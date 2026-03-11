<script lang="ts">
    import { Menu, ListTodo, Tag } from "lucide-svelte";
    import * as Icons from "lucide-svelte"; // Import for dynamic icons
    import { uiStore } from "$lib/stores/ui.svelte";
    import { getTodoStore } from "$lib/context";
    import ViewOptions from "$lib/components/tasks/ViewOptions.svelte";

    interface Props {
        class?: string;
    }

    let { class: className = "" }: Props = $props();

    const todoList = getTodoStore();
    const stats = $derived(todoList.stats);

    // Dynamic Header Logic
    // Dynamic Header Logic
    const activeTagName = $derived(todoList.filters.tags[0] || null);

    // Find active list
    const activeList = $derived(
        todoList.lists.find((l) => l.id === todoList.filters.listId) || null,
    );

    const headerTitle = $derived(
        activeTagName
            ? activeTagName
            : activeList
              ? activeList.title
              : "My Tasks",
    );

    const HeaderIcon = $derived(
        activeTagName
            ? Tag
            : activeList?.icon
              ? (Icons as any)[activeList.icon]
              : ListTodo,
    );

    const titleFontSize = $derived.by(() => {
        const len = headerTitle.length;
        if (len > 24) return "text-xs sm:text-sm";
        if (len > 18) return "text-sm sm:text-base";
        if (len > 12) return "text-base sm:text-lg";
        return "text-lg sm:text-xl";
    });

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
        <div
            class="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 flex-nowrap"
        >
            <div
                class="w-8 h-8 rounded-lg bg-primary/10 flex-shrink-0 flex items-center justify-center text-primary"
            >
                <HeaderIcon
                    class="w-5 h-5 {activeTagName ? 'fill-current/20' : ''}"
                />
            </div>
            <h1
                class="{titleFontSize} font-bold font-display text-neutral tracking-tight whitespace-nowrap overflow-hidden"
            >
                {headerTitle}
            </h1>

            <div
                class="h-6 w-px bg-base-300 mx-0.5 sm:mx-1 flex-shrink-0"
            ></div>

            <div
                class="flex items-center justify-center h-6 px-2 rounded-full bg-base-200 text-[10px] sm:text-xs font-bold text-neutral/60 tabular-nums flex-shrink-0"
            >
                {stats.completedTasks}/{stats.totalTasks}
            </div>
        </div>

        <!-- View Options -->
        <ViewOptions />
    </div>
</header>
