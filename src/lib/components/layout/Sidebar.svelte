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
        Users,
    } from "lucide-svelte";
    import { themeManager } from "$lib/stores/theme.svelte";
    import { todoList } from "$lib/stores/todo.svelte";
    import { authManager } from "$lib/stores/auth.svelte";
    import { formatTimeCompact } from "$lib/utils/formatTime";
    import UserMenu from "$lib/components/UserMenu.svelte";
    import LoginForm from "$lib/components/LoginForm.svelte";
    import { uiStore } from "$lib/stores/ui.svelte";

    interface Props {
        class?: string;
    }

    let { class: className = "" }: Props = $props();

    // -------------------------------------------------------------------------
    // Local State
    // -------------------------------------------------------------------------
    let showLoginModal = $state(false);

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

    <!-- Stats Card -->
    <div class="bg-base-200/50 rounded-2xl p-4 mb-6 space-y-3">
        <div
            class="flex items-center justify-between text-xs text-neutral/50 font-medium uppercase tracking-wider"
        >
            <span>Daily Progress</span>
        </div>

        <div class="space-y-1">
            <div class="flex items-end justify-between">
                <span class="text-2xl font-bold text-neutral tabular-nums"
                    >{stats.completedTasks}/{stats.totalTasks}</span
                >
                <span class="text-xs text-neutral/50 mb-1">tasks</span>
            </div>
            <!-- Progress Bar -->
            <div class="h-1.5 w-full bg-base-300 rounded-full overflow-hidden">
                <div
                    class="h-full bg-accent transition-all duration-500"
                    style="width: {stats.totalTasks > 0
                        ? (stats.completedTasks / stats.totalTasks) * 100
                        : 0}%"
                ></div>
            </div>
        </div>

        <div
            class="pt-2 border-t border-base-300/50 flex items-center gap-2 text-xs"
        >
            <Clock class="w-3.5 h-3.5 text-primary" />
            <span
                class="font-mono font-medium text-neutral/70"
                class:animate-pulse={hasRunningTimer}
            >
                {totalTimeFormatted} tracked
            </span>
        </div>
    </div>

    <!-- Navigation (Placeholder for now, can expand later) -->
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
        <button
            class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-neutral/60 hover:bg-base-200 hover:text-neutral font-medium text-sm transition-colors"
        >
            <Users class="w-4.5 h-4.5" />
            <span>Teams</span>
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

        <!-- Auth -->
        {#if isAuthenticated}
            <div class="px-1 pt-1">
                <UserMenu />
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
