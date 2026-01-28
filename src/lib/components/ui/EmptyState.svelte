<!--
  Informative component for displaying when a view or list is empty.
-->
<script lang="ts">
    /**
     * EmptyState Component
     * Friendly illustration and message when no tasks exist
     */

    import { Sparkles, Coffee, Sun, Moon, CloudSun } from "lucide-svelte";
    import { themeManager } from "$lib/stores/theme.svelte";
    import { fade, scale } from "svelte/transition";
    import { elasticOut } from "svelte/easing";

    // -------------------------------------------------------------------------
    // Props
    // -------------------------------------------------------------------------

    interface Props {
        class?: string;
    }

    let { class: className = "" }: Props = $props();

    // -------------------------------------------------------------------------
    // Time-based Message
    // -------------------------------------------------------------------------

    function getTimeOfDay(): "morning" | "afternoon" | "evening" | "night" {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) return "morning";
        if (hour >= 12 && hour < 17) return "afternoon";
        if (hour >= 17 && hour < 21) return "evening";
        return "night";
    }

    function getGreeting(): {
        icon: typeof Sun;
        message: string;
        submessage: string;
    } {
        const timeOfDay = getTimeOfDay();

        switch (timeOfDay) {
            case "morning":
                return {
                    icon: Sun,
                    message: "Good morning! ☀️",
                    submessage: "Start your day with a fresh task",
                };
            case "afternoon":
                return {
                    icon: CloudSun,
                    message: "Good afternoon! 🌤️",
                    submessage: "What would you like to accomplish?",
                };
            case "evening":
                return {
                    icon: Coffee,
                    message: "Good evening! 🌅",
                    submessage: "Wind down or catch up on tasks",
                };
            case "night":
                return {
                    icon: Moon,
                    message: "Burning the midnight oil? 🌙",
                    submessage: "Don't forget to rest!",
                };
        }
    }

    const greeting = $derived(getGreeting());
    const isDark = $derived(themeManager.isDark);
    const GreetingIcon = $derived(greeting.icon);
</script>

<div
    class="
    flex flex-col items-center justify-center
    py-12 md:py-16 px-6
    text-center
    {className}
  "
    role="status"
    aria-label="No tasks"
    in:fade={{ duration: 300 }}
>
    <!-- Illustration -->
    <div
        class="
      relative w-32 h-32 md:w-40 md:h-40 mb-6
      flex items-center justify-center
    "
        in:scale={{ duration: 500, delay: 100, easing: elasticOut, start: 0.8 }}
    >
        <!-- Background Circles -->
        <div
            class="
        absolute inset-0
        rounded-full
        bg-gradient-to-br from-primary/10 to-secondary/10
        animate-pulse
      "
            style="animation-duration: 3s;"
        ></div>
        <div
            class="
        absolute inset-3
        rounded-full
        bg-gradient-to-tr from-accent/10 to-primary/5
      "
        ></div>

        <!-- Floating Decorations -->
        <div class="absolute -top-2 -right-2 w-6 h-6">
            <Sparkles
                class="w-full h-full text-secondary animate-bounce"
                style="animation-duration: 2s; animation-delay: 0.2s;"
                strokeWidth={2}
            />
        </div>
        <div class="absolute -bottom-1 -left-3 w-5 h-5">
            <Sparkles
                class="w-full h-full text-accent animate-bounce"
                style="animation-duration: 2.5s; animation-delay: 0.5s;"
                strokeWidth={2}
            />
        </div>
        <div class="absolute top-4 -left-4 w-4 h-4">
            <Sparkles
                class="w-full h-full text-primary/60 animate-bounce"
                style="animation-duration: 2.2s; animation-delay: 0.8s;"
                strokeWidth={2}
            />
        </div>

        <!-- Main Icon -->
        <div
            class="
        relative z-10
        w-16 h-16 md:w-20 md:h-20
        rounded-2xl
        bg-gradient-to-br from-primary to-primary-dark
        shadow-lg shadow-primary/20
        flex items-center justify-center
        transform hover:scale-105 hover:rotate-3 transition-transform duration-300
      "
        >
            <GreetingIcon
                class="w-8 h-8 md:w-10 md:h-10 text-white"
                strokeWidth={1.5}
            />
        </div>
    </div>

    <!-- Message -->
    <div class="max-w-xs" in:fade={{ duration: 300, delay: 200 }}>
        <h3 class="text-lg md:text-xl font-bold font-display text-neutral mb-2">
            {greeting.message}
        </h3>
        <p class="text-sm md:text-base text-neutral/50 mb-1">
            {greeting.submessage}
        </p>
        <p class="text-xs text-neutral/30">Your task list is empty</p>
    </div>

    <!-- Helpful Hint -->
    <div
        class="
      mt-8 flex items-center gap-2
      px-4 py-2 rounded-full
      bg-base-200/50 text-neutral/40
      text-xs font-medium
    "
        in:fade={{ duration: 300, delay: 400 }}
    >
        <span class="hidden md:inline">Press</span>
        <kbd
            class="
        px-2 py-0.5 rounded-md
        bg-base-100 border border-base-300
        font-mono text-[10px]
        shadow-sm
      "
        >
            <span class="hidden md:inline">⌘</span>
            <span class="md:hidden">Tap</span>
        </kbd>
        <span class="hidden md:inline">+ K or type below to add a task</span>
        <span class="md:hidden">below to add your first task</span>
    </div>

    <!-- Decorative Bottom Wave -->
    <svg
        class="
      absolute bottom-0 left-0 right-0 w-full h-16
      text-base-200/30 pointer-events-none
      hidden md:block
    "
        viewBox="0 0 1440 100"
        preserveAspectRatio="none"
        aria-hidden="true"
    >
        <path
            fill="currentColor"
            d="M0,50 C360,100 1080,0 1440,50 L1440,100 L0,100 Z"
        />
    </svg>
</div>
