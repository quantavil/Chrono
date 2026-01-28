<script lang="ts">
    import type { TodoItem } from "$lib/stores/todo.svelte";

    let { todo, colorName }: { todo: TodoItem; colorName: string } = $props();

    const isRunning = $derived(todo.isRunning);
    const hasTime = $derived(todo.currentTimeMs > 0);

    // Calculate fill percentage based on time
    const fillPercentage = $derived(() => {
        if (todo.estimatedTime && todo.estimatedTime > 0) {
            return todo.progress;
        }
        // If no estimate, use a logarithmic scale capped at 2 hours for 100%
        const maxMs = 2 * 60 * 60 * 1000; // 2 hours
        return Math.min((todo.currentTimeMs / maxMs) * 100, 100);
    });

    const fillStyle = $derived(
        `color-mix(in srgb, var(--color-${colorName}) 20%, transparent)`,
    );
    const waveStyle = $derived(
        `color-mix(in srgb, var(--color-${colorName}) 30%, transparent)`,
    );
    const solidStyle = $derived(`var(--color-${colorName})`);
</script>

<!-- Liquid Fill Background -->
<div
    class="absolute left-0 top-0 bottom-0 pointer-events-none rounded-xl overflow-hidden transition-all duration-300 ease-in-out"
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
