<script lang="ts">
    import type { TodoList } from "$lib/stores/todo.svelte";
    import { getTodoStore } from "$lib/context";
    import {
        List,
        Calendar,
        Flag,
        ArrowDownAZ,
        ArrowDown,
        ArrowUp,
        Layers,
        ChevronDown,
        GripVertical,
    } from "lucide-svelte";
    import { slide } from "svelte/transition";

    const todoList = getTodoStore();

    // Local state for dropdown visibility
    let showOptions = $state(false);

    function toggleOptions(event: MouseEvent) {
        event.stopPropagation();
        showOptions = !showOptions;
    }

    function handleOutsideClick(event: MouseEvent) {
        if (showOptions) {
            const tempEl = event.target as HTMLElement;
            if (!tempEl.closest(".view-options-container")) {
                showOptions = false;
            }
        }
    }

    // Helper to update config
    function updateConfig(key: string, value: any) {
        const newConfig = { [key]: value };
        todoList.setDisplayConfig(newConfig);
        showOptions = false;
    }

    const groupByOptions = [
        { value: "none", label: "No Grouping", icon: List },
        { value: "priority", label: "Priority", icon: Flag },
        { value: "date", label: "Due Date", icon: Calendar },
    ];

    const sortByOptions = [
        { value: "position", label: "Custom", icon: GripVertical },
        { value: "priority", label: "Priority", icon: Flag },
        { value: "date", label: "Due Date", icon: Calendar },
        { value: "alphabetical", label: "Alphabetical", icon: ArrowDownAZ },
    ];
</script>

<svelte:window onclick={handleOutsideClick} />

<div class="relative z-20 flex justify-end view-options-container">
    <button
        class="flex items-center gap-2 px-3 py-2 text-sm font-bold text-neutral/70 bg-base-200/50 hover:bg-base-200 rounded-xl transition-all active:scale-95"
        onclick={toggleOptions}
        aria-label="View Options"
    >
        <Layers size={15} />
        <span>View</span>
        <ChevronDown
            size={14}
            class="opacity-50 transition-transform duration-300 {showOptions
                ? 'rotate-180'
                : ''}"
        />
    </button>

    {#if showOptions}
        <div
            transition:slide={{ duration: 200, axis: "y" }}
            class="absolute top-full right-0 mt-2 w-64 p-2 bg-base-100 border border-base-200 rounded-2xl shadow-xl shadow-base-300/20 flex flex-col gap-1 z-50 overflow-hidden"
        >
            <!-- Group By -->
            <div class="p-2 space-y-2">
                <span
                    class="text-[10px] font-bold text-neutral/40 uppercase tracking-widest px-2"
                    >Group By</span
                >
                <div class="flex flex-col gap-1">
                    {#each groupByOptions as option}
                        <button
                            class="flex items-center gap-3 px-3 py-2 text-sm rounded-xl transition-colors w-full text-left
                     {todoList.displayConfig.groupBy === option.value
                                ? 'bg-primary/10 text-primary font-bold'
                                : 'text-neutral/70 hover:bg-base-200 font-medium'}"
                            onclick={() =>
                                updateConfig("groupBy", option.value)}
                        >
                            <option.icon size={16} />
                            {option.label}
                            {#if todoList.displayConfig.groupBy === option.value}
                                <div
                                    class="ml-auto w-1.5 h-1.5 rounded-full bg-primary"
                                ></div>
                            {/if}
                        </button>
                    {/each}
                </div>
            </div>

            <div class="h-px bg-base-200 mx-2"></div>

            <!-- Sort By -->
            <div class="p-2 space-y-2">
                <span
                    class="text-[10px] font-bold text-neutral/40 uppercase tracking-widest px-2"
                    >Sort By</span
                >
                <div class="flex flex-col gap-1">
                    {#each sortByOptions as option}
                        {@const isActive =
                            todoList.displayConfig.sortBy === option.value}
                        <div
                            class="flex items-center gap-1 px-1 py-0.5 rounded-xl transition-colors w-full text-left
                     {isActive
                                ? 'bg-primary/10 text-primary'
                                : 'text-neutral/70 hover:bg-base-200'}"
                        >
                            <button
                                class="flex-1 flex items-center gap-3 px-2 py-1.5 text-sm font-medium"
                                class:font-bold={isActive}
                                onclick={() =>
                                    updateConfig("sortBy", option.value)}
                            >
                                <option.icon size={16} />
                                {option.label}
                            </button>

                            {#if isActive && option.value !== "position"}
                                <div class="flex items-center pr-1">
                                    <!-- Toggle Order if Current -->
                                    <button
                                        class="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors"
                                        onclick={(e) => {
                                            e.stopPropagation();
                                            updateConfig(
                                                "sortOrder",
                                                todoList.displayConfig
                                                    .sortOrder === "asc"
                                                    ? "desc"
                                                    : "asc",
                                            );
                                        }}
                                        aria-label="Toggle sort order"
                                    >
                                        {#if todoList.displayConfig.sortOrder === "asc"}
                                            <ArrowUp size={14} />
                                        {:else}
                                            <ArrowDown size={14} />
                                        {/if}
                                    </button>
                                </div>
                            {/if}
                        </div>
                    {/each}
                </div>
            </div>
        </div>
    {/if}
</div>
