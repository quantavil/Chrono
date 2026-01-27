<script lang="ts">
    import type { TodoItem } from "$lib/stores/todo.svelte";
    import { PRIORITY_CONFIG } from "$lib/types";

    let { todo }: { todo: TodoItem } = $props();

    const isRunning = $derived(todo.isRunning);
    const hasTime = $derived(todo.currentTimeMs > 0);

    // Calculate fill percentage based on time
    const fillPercentage = $derived(() => {
        if (todo.estimatedTime && todo.estimatedTime > 0) {
            return Math.min(
                (todo.currentTimeMs / todo.estimatedTime) * 100,
                100,
            );
        }
        // If no estimate, use a logarithmic scale capped at 2 hours for 100%
        const maxMs = 2 * 60 * 60 * 1000; // 2 hours
        return Math.min((todo.currentTimeMs / maxMs) * 100, 100);
    });

    const currentPriority = $derived(todo.priority || "low");
    const currentConfig = $derived(PRIORITY_CONFIG[currentPriority]);

    const fillStyle = $derived(`var(--color-${currentConfig.color} / 0.15)`);
    const waveStyle = $derived(`var(--color-${currentConfig.color} / 0.25)`);
    const solidStyle = $derived(`var(--color-${currentConfig.color})`);
</script>

<!-- Liquid Fill Background -->
<div
    style="
        width: {fillPercentage()}%;
        background: linear-gradient(
            90deg,
            {fillStyle} 0%,
            {fillStyle} 85%,
            {waveStyle} 100%
        );
    "
>
    <!-- Wave effect at the edge -->
    {#if isRunning || hasTime}
        <div
            class="absolute right-0 top-0 bottom-0 w-6 overflow-hidden"
            style="opacity: {isRunning ? 1 : 0.4};"
        >
            <svg
                class="absolute h-full w-12 -right-4"
                class:animate-wave={isRunning}
                viewBox="0 0 20 100"
                preserveAspectRatio="none"
            >
                <path
                    d="M0,0 Q12,25 0,50 Q12,75 0,100 L20,100 L20,0 Z"
                    fill={waveStyle}
                />
            </svg>
        </div>
    {/if}

    <!-- Bubbles when running -->
    {#if isRunning}
        <div class="absolute inset-0 overflow-hidden">
            <div
                class="bubble bubble-1"
                style="background: {solidStyle};"
            ></div>
            <div
                class="bubble bubble-2"
                style="background: {solidStyle};"
            ></div>
            <div
                class="bubble bubble-3"
                style="background: {solidStyle};"
            ></div>
        </div>
    {/if}
</div>

<style>
    /* Wave animation */
    @keyframes wave {
        0%,
        100% {
            transform: translateY(0) rotate(0deg);
        }
        50% {
            transform: translateY(-8px) rotate(2deg);
        }
    }

    .animate-wave {
        animation: wave 3s ease-in-out infinite;
    }

    /* Bubble animations */
    .bubble {
        position: absolute;
        border-radius: 50%;
        opacity: 0.4;
        filter: blur(1px);
        animation: rise 4s ease-in infinite;
    }

    .bubble-1 {
        width: 10px;
        height: 10px;
        left: 20%;
        bottom: -20px;
        animation-delay: 0s;
    }

    .bubble-2 {
        width: 6px;
        height: 6px;
        left: 55%;
        bottom: -20px;
        animation-delay: 1.5s;
    }

    .bubble-3 {
        width: 14px;
        height: 14px;
        left: 80%;
        bottom: -20px;
        animation-delay: 2.8s;
    }

    @keyframes rise {
        0% {
            transform: translateY(0) scale(1);
            opacity: 0;
        }
        20% {
            opacity: 0.4;
        }
        100% {
            transform: translateY(-100px) scale(0.6);
            opacity: 0;
        }
    }
</style>
