<script lang="ts">
    /**
     * Header Component
     * Displays logo, current date, task statistics, theme toggle, and auth
     */

    import {
        Sun,
        Moon,
        Monitor,
        CheckCircle2,
        Clock,
        Sparkles,
        LogIn,
        Settings,
    } from "lucide-svelte";
    import { themeManager } from "$lib/stores/theme.svelte";
    import { getTodoStore, getAuthStore } from "$lib/context";
    import { formatDateHeader, formatTimeCompact } from "$lib/utils/formatTime";
    import { uiStore } from "$lib/stores/ui.svelte";
    import UserMenu from "./UserMenu.svelte";
    import LoginForm from "./LoginForm.svelte";

    // -------------------------------------------------------------------------
    // Props
    // -------------------------------------------------------------------------

    interface Props {
        class?: string;
    }

    let { class: className = "" }: Props = $props();

    // -------------------------------------------------------------------------
    // Local State
    // -------------------------------------------------------------------------
    const todoList = getTodoStore();
    const authManager = getAuthStore();

    let showLoginModal = $state(false);

    // -------------------------------------------------------------------------
    // Derived State
    // -------------------------------------------------------------------------

    const dateInfo = $derived(formatDateHeader(new Date()));
    const stats = $derived(todoList.stats);
    const hasRunningTimer = $derived(todoList.hasRunningTimer);
    const totalTimeFormatted = $derived(formatTimeCompact(stats.totalTimeMs));
    const isAuthenticated = $derived(authManager.isAuthenticated);
    const isAuthLoading = $derived(authManager.isLoading);
    const isConfigured = $derived(authManager.isConfigured);

    // -------------------------------------------------------------------------
    // Theme Cycling
    // -------------------------------------------------------------------------

    function cycleTheme(): void {
        themeManager.toggle();
    }

    function getThemeIcon(): typeof Sun {
        if (themeManager.theme === "system") return Monitor;
        if (themeManager.isDark) return Moon;
        return Sun;
    }

    function getThemeLabel(): string {
        if (themeManager.theme === "system") return "System theme";
        if (themeManager.isDark) return "Dark mode";
        return "Light mode";
    }

    const ThemeIcon = $derived(getThemeIcon());

    // -------------------------------------------------------------------------
    // Auth
    // -------------------------------------------------------------------------

    function openLogin(): void {
        showLoginModal = true;
    }
</script>

<header
    class="sticky top-0 z-30 w-full border-b border-base-200/50 bg-base-100/80 backdrop-blur-md {className}"
>
    <div
        class="hidden md:flex items-center justify-between h-14 w-full px-6 xl:px-10"
    >
        <!-- Page Title (Replaces LeftPane title) -->
        <!-- Page Title (Removed) -->
        <div></div>

        <!-- Right Side Controls (The Ribbon) -->
        <div class="flex items-center gap-2">
            <!-- Stats (Compact) -->
            {#if stats.totalTasks > 0}
                <div
                    class="hidden lg:flex items-center gap-3 px-3 py-1 bg-base-200/50 rounded-lg border border-base-200/50 mr-2"
                >
                    <div
                        class="flex items-center gap-2"
                        title="{stats.completedTasks} of {stats.totalTasks} tasks completed"
                    >
                        <div
                            class="radial-progress text-primary text-[10px]"
                            style="--value:{stats.totalTasks > 0
                                ? (stats.completedTasks / stats.totalTasks) *
                                  100
                                : 0}; --size:1rem; --thickness: 2px;"
                            role="progressbar"
                        ></div>
                        <span class="text-xs font-medium text-neutral/70">
                            {stats.completedTasks}/{stats.totalTasks}
                        </span>
                    </div>
                </div>
            {/if}

            <div class="flex items-center gap-0.5 p-0.5">
                <!-- Theme Toggle -->
                <button
                    type="button"
                    class="relative w-8 h-8 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center transition-all duration-200 text-neutral/60 hover:text-neutral"
                    onclick={cycleTheme}
                    aria-label={getThemeLabel()}
                    title={getThemeLabel()}
                >
                    <ThemeIcon class="w-4 h-4" strokeWidth={2} />
                </button>

                <!-- Settings Button -->
                <button
                    type="button"
                    class="relative w-8 h-8 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center transition-all duration-200 text-neutral/60 hover:text-neutral"
                    onclick={() => (uiStore.view = "settings")}
                    title="Settings"
                >
                    <Settings class="w-4 h-4" strokeWidth={2} />
                </button>

                <!-- Auth -->
                {#if isAuthenticated}
                    <div class="pl-1 ml-1 border-l border-base-200">
                        <UserMenu
                            onOpenSettings={() => (isSettingsOpen = true)}
                        />
                    </div>
                {:else if !isAuthLoading}
                    <div class="pl-1 ml-1 border-l border-base-200">
                        <button
                            type="button"
                            class="
                    flex items-center gap-2
                    px-3 py-1.5 rounded-lg
                    bg-primary text-white
                    font-medium text-xs
                    hover:bg-primary-dark
                    hover:shadow-md hover:shadow-primary/20
                    active:scale-95
                    transition-all
                  "
                            onclick={openLogin}
                        >
                            <LogIn class="w-3.5 h-3.5" strokeWidth={2} />
                            Sign in
                        </button>
                    </div>
                {/if}
            </div>
        </div>
    </div>

    <!-- Mobile Layout -->
    <div class="flex md:hidden flex-col gap-3">
        <!-- Top Row: Logo, Theme & Auth -->
        <div class="flex items-center justify-between">
            <div class="flex items-center gap-2.5">
                <div
                    class="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-soft"
                >
                    <Sparkles class="w-4 h-4 text-white" strokeWidth={2.5} />
                </div>
                <h1
                    class="text-lg font-bold font-display text-neutral tracking-tight"
                >
                    Chronos
                </h1>
            </div>

            <div class="flex items-center gap-2">
                <!-- Theme Toggle -->
                <button
                    type="button"
                    class="w-9 h-9 rounded-xl bg-base-200 hover:bg-base-300 flex items-center justify-center transition-all active:scale-95"
                    onclick={cycleTheme}
                    aria-label={getThemeLabel()}
                >
                    <ThemeIcon
                        class="w-4.5 h-4.5 text-neutral/70"
                        strokeWidth={2}
                    />
                </button>

                <!-- Settings Button -->
                <button
                    type="button"
                    class="w-9 h-9 rounded-xl bg-base-200 hover:bg-base-300 flex items-center justify-center transition-all active:scale-95"
                    onclick={() => (uiStore.view = "settings")}
                    aria-label="Settings"
                >
                    <Settings
                        class="w-4.5 h-4.5 text-neutral/70"
                        strokeWidth={2}
                    />
                </button>

                <!-- Auth -->
                {#if isAuthenticated}
                    <UserMenu onOpenSettings={() => (isSettingsOpen = true)} />
                {:else if !isAuthLoading}
                    <button
                        type="button"
                        class="
              w-9 h-9 rounded-xl
              bg-primary text-white
              flex items-center justify-center
              active:scale-95
              transition-all
            "
                        onclick={openLogin}
                        aria-label="Sign in"
                    >
                        <LogIn class="w-4 h-4" strokeWidth={2} />
                    </button>
                {/if}
            </div>
        </div>

        <!-- Bottom Row: Date & Stats -->
        <div class="flex items-center justify-between px-1">
            <div>
                <p class="text-sm font-semibold text-neutral">Today</p>
                <p class="text-xs text-neutral/50">
                    {dateInfo.fullDate}
                </p>
            </div>

            {#if stats.totalTasks > 0}
                <div class="flex items-center gap-2 text-xs">
                    <span class="text-neutral/60 font-medium tabular-nums">
                        {stats.totalTasks}
                        {stats.totalTasks === 1 ? "task" : "tasks"}
                    </span>
                    {#if stats.totalTimeMs > 0}
                        <span class="text-neutral/40">•</span>
                        <span
                            class="font-mono tabular-nums text-primary font-medium"
                            class:animate-pulse={hasRunningTimer}
                        >
                            {totalTimeFormatted}
                        </span>
                    {/if}
                </div>
            {/if}
        </div>
    </div>
</header>

<!-- Login Modal -->
<LoginForm bind:isOpen={showLoginModal} />
