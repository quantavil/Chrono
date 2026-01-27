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
    import { todoList } from "$lib/stores/todo.svelte";
    import { authManager } from "$lib/stores/auth.svelte";
    import { formatDateHeader, formatTimeCompact } from "$lib/utils/formatTime";
    import UserMenu from "./UserMenu.svelte";
    import LoginForm from "./LoginForm.svelte";
    import SettingsModal from "./SettingsModal.svelte";

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

    let showLoginModal = $state(false);
    let isSettingsOpen = $state(false);

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

<header class="w-full {className}">
    <!-- Desktop Layout -->
    <div class="hidden md:flex items-center justify-between gap-4">
        <!-- Logo & Date -->
        <div class="flex items-center gap-4">
            <div class="flex items-center gap-2">
                <div
                    class="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-soft"
                >
                    <Sparkles class="w-5 h-5 text-white" strokeWidth={2.5} />
                </div>
                <div>
                    <h1
                        class="text-xl font-bold font-display text-neutral tracking-tight"
                    >
                        Chronos
                    </h1>
                    <p class="text-xs text-neutral/50 font-medium">
                        {dateInfo.fullDate}
                    </p>
                </div>
            </div>
        </div>

        <!-- Stats, Theme & Auth -->
        <div class="flex items-center gap-3">
            <!-- Stats Pills -->
            {#if stats.totalTasks > 0}
                <div class="flex items-center gap-2">
                    <!-- Task Count -->
                    <div
                        class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-base-200/80 text-neutral/70"
                        title="{stats.completedTasks} of {stats.totalTasks} tasks completed"
                    >
                        <CheckCircle2
                            class="w-3.5 h-3.5 text-accent"
                            strokeWidth={2.5}
                        />
                        <span class="text-xs font-semibold tabular-nums">
                            {stats.completedTasks}/{stats.totalTasks}
                        </span>
                    </div>

                    <!-- Total Time -->
                    <div
                        class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-base-200/80 text-neutral/70"
                        class:animate-pulse={hasRunningTimer}
                        title="Total time tracked"
                    >
                        <Clock
                            class="w-3.5 h-3.5 text-primary"
                            strokeWidth={2.5}
                        />
                        <span
                            class="text-xs font-semibold font-mono tabular-nums"
                        >
                            {totalTimeFormatted}
                        </span>
                    </div>
                </div>
            {/if}

            <!-- Theme Toggle -->
            <button
                type="button"
                class="relative w-10 h-10 rounded-2xl bg-base-200 hover:bg-base-300 flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 group"
                onclick={cycleTheme}
                aria-label={getThemeLabel()}
                title={getThemeLabel()}
            >
                <ThemeIcon
                    class="w-5 h-5 text-neutral/70 group-hover:text-neutral transition-colors"
                    strokeWidth={2}
                />
            </button>

            <!-- Settings Button -->
            <button
                type="button"
                class="relative w-10 h-10 rounded-2xl bg-base-200 hover:bg-base-300 flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 group"
                onclick={() => (isSettingsOpen = true)}
                title="Settings"
            >
                <Settings
                    class="w-5 h-5 text-neutral/70 group-hover:text-neutral transition-colors"
                    strokeWidth={2}
                />
            </button>

            <!-- Auth: User Menu or Sign In -->
            {#if isAuthenticated}
                <UserMenu onOpenSettings={() => (isSettingsOpen = true)} />
            {:else if !isAuthLoading}
                <button
                    type="button"
                    class="
            flex items-center gap-2
            px-4 py-2 rounded-full
            bg-primary text-white
            font-medium text-sm
            hover:bg-primary-dark
            active:scale-95
            transition-all
          "
                    onclick={openLogin}
                >
                    <LogIn class="w-4 h-4" strokeWidth={2} />
                    Sign in
                </button>
            {/if}
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
                    onclick={() => (isSettingsOpen = true)}
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

<!-- Settings Modal -->
<SettingsModal bind:isOpen={isSettingsOpen} />
