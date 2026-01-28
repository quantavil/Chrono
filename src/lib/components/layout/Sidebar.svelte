<!--
  Collapsible navigation sidebar for filtering tasks by category, project, or status.
-->
<script lang="ts">
    import {
        Clock,
        Sparkles,
        ListTodo,
        Flame,
        Zap,
        X,
        Tag,
        Plus,
        Trash2,
    } from "lucide-svelte";
    import { formatTimeCompact, formatDateHeader } from "$lib/utils/formatTime";
    import { getTodoStore, getAuthStore } from "$lib/context";
    import { uiStore } from "$lib/stores/ui.svelte";

    interface Props {
        class?: string;
    }

    // State
    const todoList = getTodoStore();
    const authManager = getAuthStore();

    let { class: className = "" }: Props = $props();

    // -------------------------------------------------------------------------
    // Derived State
    // -------------------------------------------------------------------------
    const stats = $derived(todoList.stats);
    const hasRunningTimer = $derived(todoList.hasRunningTimer);
    const totalTimeFormatted = $derived(formatTimeCompact(stats.totalTimeMs));
    const dateInfo = $derived(formatDateHeader(new Date()));

    // -------------------------------------------------------------------------
    // Local State
    let isAddingTag = $state(false);
    let newTagInput = $state("");
    let newTagInputEl = $state<HTMLInputElement | null>(null);

    function toggleTagFilter(tag: string) {
        todoList.toggleTagFilter(tag);
        // On mobile close sidebar after selection
        if (uiStore.isMobile) {
            uiStore.isMobileSidebarOpen = false;
        }
    }

    function handleAddTag(e?: Event) {
        e?.preventDefault();
        todoList.addTag(newTagInput);
        newTagInput = "";
        isAddingTag = false;
    }

    $effect(() => {
        if (isAddingTag && newTagInputEl) {
            newTagInputEl.focus();
        }
    });
    // -------------------------------------------------------------------------
</script>

<div
    class="flex flex-col h-full w-[240px] bg-base-100 border-r border-base-200 p-4 sticky top-0 {className}"
>
    <!-- Logo -->
    <!-- Logo & Date -->
    <div class="flex flex-col gap-1 px-4 py-3 mb-4">
        <div class="flex items-center justify-between gap-2.5">
            <div class="flex items-center gap-2.5">
                <div
                    class="w-6 h-6 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-md shadow-primary/20"
                >
                    <Sparkles
                        class="w-3.5 h-3.5 text-white"
                        strokeWidth={2.5}
                    />
                </div>
                <h1
                    class="text-lg font-bold font-display text-neutral tracking-tight leading-none"
                >
                    Chronos
                </h1>
            </div>

            <!-- Mobile Close Button -->
            <button
                class="lg:hidden p-1 rounded-md hover:bg-base-200 text-neutral/50"
                onclick={() => (uiStore.isMobileSidebarOpen = false)}
                aria-label="Close Sidebar"
            >
                <X class="w-5 h-5" />
            </button>
        </div>
        <div class="px-0.5">
            <p
                class="text-[10px] font-bold uppercase tracking-widest text-neutral/40"
            >
                {dateInfo.fullDate}
            </p>
        </div>
    </div>

    <!-- Stats Card (Momentum) -->
    <div
        class="bg-base-200/50 rounded-2xl p-4 mb-6 space-y-3 relative overflow-hidden group"
    >
        {#if stats.completedTasks > 0 && stats.totalTasks > 0}
            <div
                class="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity"
            >
                <Sparkles class="w-12 h-12 text-current" />
            </div>
        {/if}

        <div
            class="flex items-center justify-between text-xs font-bold uppercase tracking-wider"
        >
            <span class="text-neutral/50">Daily Goal</span>
            {#if stats.totalTasks > 0}
                {#if stats.completionRate >= 80}
                    <div
                        class="flex items-center gap-1 text-warning animate-pulse-slow"
                    >
                        <Flame class="w-3.5 h-3.5 fill-current" />
                        <span>On Fire!</span>
                    </div>
                {:else if stats.completionRate >= 50}
                    <div class="flex items-center gap-1 text-primary">
                        <Zap class="w-3.5 h-3.5 fill-current" />
                        <span>Focused</span>
                    </div>
                {/if}
            {/if}
        </div>

        <div class="space-y-2">
            <div class="flex items-end justify-between">
                <span
                    class="text-3xl font-bold text-neutral tabular-nums tracking-tight"
                    >{Math.round(stats.completionRate)}%</span
                >
                <div class="text-right">
                    <span class="text-xs text-neutral/50 block">completed</span>
                    <span class="text-xs font-bold text-neutral/70"
                        >{stats.completedTasks}/{stats.totalTasks} tasks</span
                    >
                </div>
            </div>

            <!-- Progress Bar -->
            <div
                class="h-2 w-full bg-base-300 rounded-full overflow-hidden shadow-inner"
            >
                <div
                    class="h-full transition-all duration-700 ease-out relative"
                    style="
                        width: {stats.completionRate}%;
                        background: linear-gradient(90deg, var(--color-primary), var(--color-secondary));
                     "
                >
                    <div
                        class="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]"
                    ></div>
                </div>
            </div>
        </div>

        <div class="pt-3 border-t border-base-300/50 flex flex-col gap-2">
            <div class="flex items-center justify-between text-xs">
                <div class="flex items-center gap-1.5 text-neutral/60">
                    <Clock class="w-3.5 h-3.5" />
                    <span>Tracked</span>
                </div>
                <span
                    class="font-mono font-bold text-neutral/80"
                    class:text-primary={hasRunningTimer}
                    class:animate-pulse={hasRunningTimer}
                >
                    {totalTimeFormatted}
                </span>
            </div>
        </div>
    </div>

    <nav class="flex-1 space-y-6 overflow-y-auto scrollbar-hide">
        <!-- Main Nav -->
        <div class="space-y-1">
            <button
                class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-sm transition-colors
                {todoList.filters.tags.length === 0
                    ? 'bg-primary/10 text-primary'
                    : 'text-neutral/70 hover:bg-base-200'}"
                onclick={() => todoList.clearFilters()}
            >
                <ListTodo class="w-4.5 h-4.5" />
                <span>My Tasks</span>
            </button>
        </div>

        <!-- Tags Section -->
        <div class="space-y-2">
            <div class="px-3 flex items-center justify-between group">
                <h3
                    class="text-xs font-bold text-neutral/40 uppercase tracking-widest"
                >
                    Tags
                </h3>
                <button
                    class="p-1 rounded hover:bg-base-200 text-neutral/40 hover:text-primary transition-colors"
                    onclick={() => (isAddingTag = true)}
                    aria-label="Add Tag"
                >
                    <Plus class="w-3.5 h-3.5" />
                </button>
            </div>

            <div class="space-y-0.5">
                {#each todoList.availableTags as tag (tag)}
                    {@const isActive = todoList.filters.tags.includes(tag)}
                    <div class="relative group/tag">
                        <button
                            class="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                            {isActive
                                ? 'bg-primary/10 text-primary'
                                : 'text-neutral/70 hover:bg-base-200'}"
                            onclick={() => toggleTagFilter(tag)}
                        >
                            <Tag
                                class="w-4 h-4 {isActive ? 'fill-current' : ''}"
                            />
                            <span class="truncate">{tag}</span>

                            <!-- Count -->
                            <span
                                class="ml-auto text-xs opacity-50 font-normal"
                            >
                                {stats.tagCounts[tag] ?? 0}
                            </span>
                        </button>

                        <!-- Delete Action (Hover) -->
                        <button
                            class="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-neutral/40 hover:text-danger hover:bg-danger/10 opacity-0 group-hover/tag:opacity-100 transition-all"
                            onclick={(e) => {
                                e.stopPropagation();
                                todoList.deleteTag(tag);
                            }}
                            title="Delete Tag"
                        >
                            <Trash2 class="w-3.5 h-3.5" />
                        </button>
                    </div>
                {/each}

                <!-- Add Tag Input -->
                {#if isAddingTag}
                    <form class="px-2 py-1" onsubmit={handleAddTag}>
                        <div
                            class="flex items-center gap-2 bg-base-200 rounded-lg px-3 py-2 ring-2 ring-primary"
                        >
                            <Tag class="w-4 h-4 text-primary" />
                            <input
                                bind:this={newTagInputEl}
                                bind:value={newTagInput}
                                type="text"
                                class="bg-transparent border-none outline-none w-full text-sm placeholder:text-neutral/30 min-w-0"
                                placeholder="Tag name..."
                                onblur={() => {
                                    if (!newTagInput) isAddingTag = false;
                                }}
                                onkeydown={(e) => {
                                    if (e.key === "Escape") isAddingTag = false;
                                }}
                            />
                        </div>
                    </form>
                {/if}

                {#if todoList.availableTags.length === 0 && !isAddingTag}
                    <div class="px-3 py-4 text-center">
                        <p class="text-xs text-neutral/40 mb-2">No tags yet</p>
                        <button
                            class="text-xs font-bold text-primary hover:underline"
                            onclick={() => (isAddingTag = true)}
                        >
                            Create a tag
                        </button>
                    </div>
                {/if}
            </div>
        </div>
    </nav>
</div>
