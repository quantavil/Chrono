<!--
  Collapsible navigation sidebar for filtering tasks by category, project, or status.
-->
<script lang="ts">
    import {
        Sparkles,
        ListTodo,
        X,
        Tag,
        Plus,
        Trash2,
        Sun,
        Moon,
        Monitor,
        Settings,
        LogIn,
    } from "lucide-svelte";
    import { formatTimeCompact, formatDateHeader } from "$lib/utils/formatTime";
    import { getTodoStore, getAuthStore } from "$lib/context";
    import { uiStore } from "$lib/stores/ui.svelte";
    import { themeManager } from "$lib/stores/theme.svelte";
    import UserMenu from "../auth/UserMenu.svelte";
    import LoginForm from "../auth/LoginForm.svelte";

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
    // const hasRunningTimer = $derived(todoList.hasRunningTimer); // Unused
    // const totalTimeFormatted = $derived(formatTimeCompact(stats.totalTimeMs)); // Unused
    const dateInfo = $derived(formatDateHeader(new Date()));

    // -------------------------------------------------------------------------
    // Local State
    let isAddingTag = $state(false);
    let newTagInput = $state("");
    let newTagInputEl = $state<HTMLInputElement | null>(null);
    let showLoginModal = $state(false);

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

    // Theme Helpers
    const ThemeIcon = $derived(
        themeManager.theme === "system"
            ? Monitor
            : themeManager.isDark
              ? Moon
              : Sun,
    );

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

    <!-- Bottom Controls -->
    <div class="mt-auto pt-4 border-t border-base-200 flex flex-col gap-1">
        <!-- Theme -->
        <button
            class="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-base-200 text-neutral/70 transition-colors w-full text-left"
            onclick={() => themeManager.toggle()}
            title="Toggle Theme"
        >
            <ThemeIcon class="w-4.5 h-4.5" />
            <span class="text-sm font-medium">
                {themeManager.theme === "system"
                    ? "System Theme"
                    : themeManager.isDark
                      ? "Dark Mode"
                      : "Light Mode"}
            </span>
        </button>

        <!-- Settings -->
        <button
            class="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-base-200 text-neutral/70 transition-colors w-full text-left"
            onclick={() => (uiStore.view = "settings")}
            title="Settings"
        >
            <Settings class="w-4.5 h-4.5" />
            <span class="text-sm font-medium">Settings</span>
        </button>

        <!-- Auth -->
        {#if authManager.isAuthenticated}
            <div class="pt-2 mt-1 border-t border-base-200/50">
                <UserMenu onOpenSettings={() => (uiStore.view = "settings")} />
            </div>
        {:else}
            <button
                class="flex items-center gap-3 px-3 py-2 rounded-lg text-primary hover:bg-primary/10 transition-colors w-full text-left font-medium"
                onclick={() => (showLoginModal = true)}
            >
                <LogIn class="w-4.5 h-4.5" />
                <span class="text-sm">Sign in</span>
            </button>
        {/if}
    </div>
</div>

<LoginForm bind:isOpen={showLoginModal} />
