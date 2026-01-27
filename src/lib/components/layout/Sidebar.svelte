<script lang="ts">
    import {
        Sun,
        Moon,
        Monitor,
        CheckCircle2,
        Clock,
        Sparkles,
        LogIn,
        ListTodo,
        Focus,
        Settings,
        Flame,
        Zap,
    } from "lucide-svelte";
    import { themeManager } from "$lib/stores/theme.svelte";
    import { formatTimeCompact } from "$lib/utils/formatTime";
    import { getTodoStore, getAuthStore } from "$lib/context";
    import UserMenu from "$lib/components/UserMenu.svelte";
    import LoginForm from "$lib/components/LoginForm.svelte";
    import SettingsModal from "$lib/components/SettingsModal.svelte";
    import { uiStore } from "$lib/stores/ui.svelte";

    interface Props {
        class?: string;
    }

    // State
    const todoList = getTodoStore();
    const authManager = getAuthStore();

    let { class: className = "" }: Props = $props();

    // -------------------------------------------------------------------------
    // Local State
    // -------------------------------------------------------------------------
    let showLoginModal = $state(false);
    let isSettingsOpen = $state(false);

    // -------------------------------------------------------------------------
    // Derived State
    // -------------------------------------------------------------------------
    const stats = $derived(todoList.stats);
    const hasRunningTimer = $derived(todoList.hasRunningTimer);
    const totalTimeFormatted = $derived(formatTimeCompact(stats.totalTimeMs));
    const isAuthenticated = $derived(authManager.isAuthenticated);
    const isAuthLoading = $derived(authManager.isLoading);

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

    function openLogin(): void {
        showLoginModal = true;
    }
</script>

<div
    class="flex flex-col h-full w-[240px] bg-base-100 border-r border-base-200 p-4 sticky top-0 {className}"
>
    <!-- Logo -->
    <div class="flex items-center gap-3 px-2 py-4 mb-2">
        <div
            class="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-soft"
        >
            <Sparkles class="w-4 h-4 text-white" strokeWidth={2.5} />
        </div>
        <h1 class="text-xl font-bold font-display text-neutral tracking-tight">
            Chronos
        </h1>
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
                {@const percent =
                    (stats.completedTasks / stats.totalTasks) * 100}
                {#if percent >= 80}
                    <div
                        class="flex items-center gap-1 text-warning animate-pulse-slow"
                    >
                        <Flame class="w-3.5 h-3.5 fill-current" />
                        <span>On Fire!</span>
                    </div>
                {:else if percent >= 50}
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
                    >{Math.round(
                        stats.totalTasks > 0
                            ? (stats.completedTasks / stats.totalTasks) * 100
                            : 0,
                    )}%</span
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
                        width: {stats.totalTasks > 0
                        ? (stats.completedTasks / stats.totalTasks) * 100
                        : 0}%;
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

    <!-- Navigation -->
    <nav class="flex-1 space-y-1">
        <button
            class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-primary/10 text-primary font-bold text-sm"
        >
            <ListTodo class="w-4.5 h-4.5" />
            <span>My Tasks</span>
        </button>
        <button
            class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-neutral/60 hover:bg-base-200 hover:text-neutral font-medium text-sm transition-colors"
            onclick={() => uiStore.toggleFocusMode()}
        >
            <Focus class="w-4.5 h-4.5" />
            <span>Focus Mode</span>
        </button>
    </nav>

    <!-- Footer Settings -->
    <div class="pt-4 border-t border-base-200 space-y-2">
        <!-- Theme -->
        <button
            class="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-base-200 transition-colors group"
            onclick={cycleTheme}
        >
            <div
                class="flex items-center gap-3 text-sm font-medium text-neutral/80 group-hover:text-neutral"
            >
                <ThemeIcon class="w-4.5 h-4.5" />
                <span>{getThemeLabel()}</span>
            </div>
        </button>

        <!-- Settings -->
        <button
            class="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-base-200 transition-colors group"
            onclick={() => (isSettingsOpen = true)}
        >
            <div
                class="flex items-center gap-3 text-sm font-medium text-neutral/80 group-hover:text-neutral"
            >
                <Settings class="w-4.5 h-4.5" />
                <span>Settings</span>
            </div>
        </button>

        <!-- Auth -->
        {#if isAuthenticated}
            <div class="px-1 pt-1">
                <UserMenu onOpenSettings={() => (isSettingsOpen = true)} />
            </div>
        {:else if !isAuthLoading}
            <button
                onclick={openLogin}
                class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-base-200 text-sm font-medium text-neutral/80"
            >
                <LogIn class="w-4.5 h-4.5" />
                <span>Sign In</span>
            </button>
        {/if}
    </div>
</div>

<LoginForm bind:isOpen={showLoginModal} />
<SettingsModal bind:isOpen={isSettingsOpen} />
