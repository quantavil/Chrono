<script lang="ts">
    import {
        Sun,
        Moon,
        Monitor,
        Sparkles,
        LogIn,
        Settings,
        Menu,
    } from "lucide-svelte";
    import { themeManager } from "$lib/stores/theme.svelte";
    import { getTodoStore, getAuthStore } from "$lib/context";
    import { formatDateHeader } from "$lib/utils/formatTime";
    import { uiStore } from "$lib/stores/ui.svelte";
    import UserMenu from "./UserMenu.svelte";
    import LoginForm from "./LoginForm.svelte";

    interface Props {
        class?: string;
    }

    let { class: className = "" }: Props = $props();

    const todoList = getTodoStore();
    const authManager = getAuthStore();

    let showLoginModal = $state(false);

    // Derived
    const dateInfo = $derived(formatDateHeader(new Date()));
    const stats = $derived(todoList.stats);
    const isAuthenticated = $derived(authManager.isAuthenticated);
    const isAuthLoading = $derived(authManager.isLoading);

    // Theme config
    const themeIcon = $derived(
        themeManager.theme === "system"
            ? Monitor
            : themeManager.isDark
              ? Moon
              : Sun,
    );
    const themeLabel = $derived(
        themeManager.theme === "system"
            ? "System theme"
            : themeManager.isDark
              ? "Dark mode"
              : "Light mode",
    );

    // Handlers
    function openSidebar(): void {
        uiStore.isMobileSidebarOpen = true;
    }

    function openSettings(): void {
        uiStore.view = "settings";
    }

    function openLogin(): void {
        showLoginModal = true;
    }
</script>

<!-- ======================================================================= -->
<!-- SHARED SNIPPETS -->
<!-- ======================================================================= -->

{#snippet menuButton()}
    <button
        type="button"
        class="w-9 h-9 rounded-xl bg-base-200 hover:bg-base-300 flex items-center justify-center transition-all active:scale-95"
        onclick={openSidebar}
        aria-label="Open menu"
    >
        <Menu class="w-5 h-5 text-neutral/70" strokeWidth={2} />
    </button>
{/snippet}

{#snippet branding(compact = false)}
    <div class="flex items-center gap-2">
        <div
            class="{compact
                ? 'w-9 h-9'
                : 'w-8 h-8'} rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-md shadow-primary/20"
        >
            <Sparkles class="w-4 h-4 text-white" strokeWidth={2.5} />
        </div>
        <div class="flex flex-col">
            <h1
                class="text-base font-bold font-display text-neutral tracking-tight leading-none"
            >
                Chronos
            </h1>
            <p
                class="{compact
                    ? 'text-[10px]'
                    : 'text-[9px]'} font-bold uppercase tracking-widest text-neutral/40 leading-none mt-0.5"
            >
                {dateInfo.fullDate}
            </p>
        </div>
    </div>
{/snippet}

{#snippet statsDisplay(compact = false)}
    {#if stats.totalTasks > 0}
        {@const size = compact ? "0.875rem" : "1rem"}
        <div
            class="flex items-center gap-2 bg-base-200/50 rounded-lg {compact
                ? 'px-2 py-1'
                : 'px-3 py-1 border border-base-200/50'}"
            title="{stats.completedTasks} of {stats.totalTasks} tasks completed"
        >
            <div
                class="radial-progress text-primary text-[10px]"
                style="--value:{stats.completionRate}; --size:{size}; --thickness: 2px;"
                role="progressbar"
            ></div>
            <span
                class="{compact
                    ? 'text-[10px] font-bold'
                    : 'text-xs font-medium'} text-neutral/70 tabular-nums"
            >
                {stats.completedTasks}/{stats.totalTasks}
            </span>
        </div>
    {/if}
{/snippet}

{#snippet themeButton()}
    {@const Icon = themeIcon}
    <button
        type="button"
        class="relative w-8 h-8 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center transition-all duration-200 text-neutral/60 hover:text-neutral"
        onclick={() => themeManager.toggle()}
        aria-label={themeLabel}
        title={themeLabel}
    >
        <Icon class="w-4 h-4" strokeWidth={2} />
    </button>
{/snippet}

{#snippet settingsButton()}
    <button
        type="button"
        class="relative w-8 h-8 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center transition-all duration-200 text-neutral/60 hover:text-neutral"
        onclick={openSettings}
        title="Settings"
    >
        <Settings class="w-4 h-4" strokeWidth={2} />
    </button>
{/snippet}

{#snippet authSection(compact = false)}
    {#if isAuthenticated}
        <div
            class={compact
                ? "scale-75 origin-right"
                : "pl-1 ml-1 border-l border-base-200"}
        >
            <UserMenu onOpenSettings={openSettings} />
        </div>
    {:else if !isAuthLoading}
        {#if compact}
            <button
                type="button"
                class="w-8 h-8 rounded-lg hover:bg-base-200 flex items-center justify-center transition-all text-neutral/60"
                onclick={openLogin}
            >
                <LogIn class="w-4 h-4" strokeWidth={2} />
            </button>
        {:else}
            <div class="pl-1 ml-1 border-l border-base-200">
                <button
                    type="button"
                    class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary text-white font-medium text-xs hover:bg-primary-dark hover:shadow-md hover:shadow-primary/20 active:scale-95 transition-all"
                    onclick={openLogin}
                >
                    <LogIn class="w-3.5 h-3.5" strokeWidth={2} />
                    Sign in
                </button>
            </div>
        {/if}
    {/if}
{/snippet}

<!-- ======================================================================= -->
<!-- HEADER LAYOUT -->
<!-- ======================================================================= -->

<header
    class="sticky top-0 z-30 w-full border-b border-base-200/50 bg-base-100/80 backdrop-blur-md {className}"
>
    <!-- DESKTOP -->
    <div
        class="hidden md:flex items-center justify-between h-14 w-full px-6 xl:px-10"
    >
        <!-- Left: Menu & Branding (tablet only) -->
        <div class="flex items-center gap-4 lg:hidden">
            {@render menuButton()}
            {@render branding()}
        </div>

        <!-- Right: Controls -->
        <div class="flex items-center gap-2 ml-auto">
            <div class="hidden lg:block mr-2">
                {@render statsDisplay()}
            </div>
            <div class="flex items-center gap-0.5 p-0.5">
                {@render themeButton()}
                {@render settingsButton()}
                {@render authSection()}
            </div>
        </div>
    </div>

    <!-- MOBILE -->
    <div class="flex md:hidden items-center justify-between gap-3 px-4 py-2">
        <!-- Left -->
        <div class="flex items-center gap-3">
            {@render menuButton()}
            {@render branding(true)}
        </div>

        <!-- Right -->
        <div class="flex items-center gap-2">
            {@render statsDisplay(true)}
            {@render themeButton()}
            {@render authSection(true)}
        </div>
    </div>
</header>

<LoginForm bind:isOpen={showLoginModal} />
