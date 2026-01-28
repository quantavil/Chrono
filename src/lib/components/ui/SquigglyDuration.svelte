<script lang="ts">
    import { onMount } from "svelte";
    import { Clock } from "lucide-svelte";
    import { spring } from "svelte/motion";

    interface Props {
        value?: number | null; // Duration in ms
        onChange?: (ms: number | null) => void;
        class?: string;
    }

    let {
        value = null,
        onChange = () => {},
        class: className = "",
    }: Props = $props();

    // Scale Config
    const MAX_HOURS = 12;
    const MAX_MINUTES = MAX_HOURS * 60; // 720 min
    const POWER = 2.5; // Exponent for power scale (feels logarithmic)

    // State
    let container: HTMLDivElement;
    let containerWidth = $state(0);
    let isDragging = $state(false);

    // Internal State
    let currentValue = $state(value ? Math.round(value / 60000) : 0);

    // Sync with prop
    $effect(() => {
        const newVal = value ? Math.round(value / 60000) : 0;
        if (!isDragging && newVal !== currentValue) {
            currentValue = newVal;
        }
    });

    // Derived
    const isTimed = $derived(currentValue > 0);
    const formattedTime = $derived(formatMinutes(currentValue));

    // Position ratio (0 to 1) determined by INVERSE of power curve
    // If min = ratio^P * MAX, then ratio = (min / MAX)^(1/P)
    const currentRatio = $derived(
        Math.pow(currentValue / MAX_MINUTES, 1 / POWER),
    );

    // Dynamic Color
    const dynamicColor = $derived(getGradientColor(currentRatio));

    function getGradientColor(t: number) {
        if (!isTimed) return "currentColor"; // Inherit (neutral)

        // HSL Transition:
        // Cool Blue (210) -> Purple (270) -> Red (360/0) -> Orange (30)
        // Let's do a simple Blue -> Red transition for clarity
        // Start: 200 (Blue). End: 0 (Red).
        // t goes 0 -> 1.
        const hue = Math.max(0, 200 - t * 220);

        // Saturation: 60% -> 90%
        const sat = 60 + t * 30;

        // Lightness: 60% -> 50%
        const light = 60 - t * 10;

        return `hsl(${hue}, ${sat}%, ${light}%)`;
    }

    function formatMinutes(m: number) {
        if (m <= 0) return "No time set";
        if (m < 60) return `${m}m`;
        const h = Math.floor(m / 60);
        const min = m % 60;
        return min > 0 ? `${h}h ${min}m` : `${h}h`;
    }

    // --- Interaction ---

    function valFromX(x: number, width: number) {
        const clampedX = Math.max(0, Math.min(x, width));
        const ratio = clampedX / width;
        // Power curve mapping
        const rawMin = Math.pow(ratio, POWER) * MAX_MINUTES;

        // Snapping
        if (rawMin <= 0) return 0;
        if (rawMin < 15) return Math.round(rawMin);
        if (rawMin < 60) return Math.round(rawMin / 5) * 5;
        return Math.round(rawMin / 15) * 15;
    }

    function update(clientX: number) {
        if (!container || containerWidth === 0) return;
        const rect = container.getBoundingClientRect();
        const x = clientX - rect.left;
        const nextVal = valFromX(x, containerWidth);

        if (nextVal !== currentValue) {
            currentValue = nextVal;
            if (
                typeof navigator !== "undefined" &&
                typeof navigator.vibrate === "function"
            ) {
                try {
                    navigator.vibrate(5);
                } catch (e) {}
            }
        }
    }

    function handleStart(clientX: number) {
        isDragging = true;
        update(clientX);
        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
    }

    function handleMove(clientX: number) {
        if (!isDragging) return;
        update(clientX);
    }

    function handleEnd() {
        isDragging = false;
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
        // Commit
        onChange(currentValue === 0 ? null : currentValue * 60 * 1000);
    }

    // Events
    function onMouseDown(e: MouseEvent) {
        handleStart(e.clientX);
    }
    function onMouseMove(e: MouseEvent) {
        handleMove(e.clientX);
    }
    function onMouseUp() {
        handleEnd();
    }

    function onTouchStart(e: TouchEvent) {
        handleStart(e.touches[0].clientX);
    }
    function onTouchMove(e: TouchEvent) {
        if (isDragging) e.preventDefault();
        handleMove(e.touches[0].clientX);
    }
    function onTouchEnd() {
        handleEnd();
    }

    // --- Resize ---
    onMount(() => {
        if (!container) return;
        const ro = new ResizeObserver((entries) => {
            containerWidth = entries[0].contentRect.width;
        });
        ro.observe(container);
        return () => ro.disconnect();
    });

    // --- Visuals ---
    function generateSine(width: number, t: number) {
        if (width <= 0) return "";
        const points = 50;
        const step = width / points;
        const h = 64; // container fixed height
        const mid = h / 2;

        // Freq increases with t
        const freq = 0.2 + t * 0.8;
        // Amp increases with t
        const amp = isTimed ? 5 + t * 20 : 2;

        // Phase shift for animation?
        // We can't easily animate phase in pure SVG path string reactively without requestAnimationFrame loop.
        // For now, static sine based on value is fine as requested "simple sine... changing".
        // If we want it to "wiggle", we need a time variable.

        let d = `M 0,${mid}`;
        for (let i = 0; i <= points; i++) {
            const x = i * step;
            const y = mid + Math.sin(i * freq) * amp;
            d += ` L ${x},${y}`;
        }
        return d;
    }
</script>

<div
    bind:this={container}
    class="relative h-16 w-full touch-none select-none rounded-xl bg-base-200/50 overflow-hidden cursor-crosshair {className}"
    role="slider"
    aria-label="Duration slider"
    aria-valuenow={currentValue}
    aria-valuemin={0}
    aria-valuemax={MAX_MINUTES}
    onmousedown={onMouseDown}
    ontouchstart={onTouchStart}
    ontouchmove={onTouchMove}
    ontouchend={onTouchEnd}
>
    <!-- Track -->
    <div
        class="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none"
    >
        <div class="h-0.5 w-[90%] bg-current rounded-full"></div>
    </div>

    <!-- Sine Wave -->
    <svg
        class="absolute inset-0 w-full h-full overflow-visible pointer-events-none"
    >
        <path
            d={generateSine(containerWidth, currentRatio)}
            fill="none"
            stroke={isTimed ? dynamicColor : "currentColor"}
            stroke-width={3}
            stroke-linecap="round"
            stroke-linejoin="round"
            class="transition-colors duration-200 {isTimed
                ? ''
                : 'text-neutral/20'}"
        />
    </svg>

    <!-- Knob / Indicator -->
    <div
        class="absolute top-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center transition-all duration-75"
        style="left: {currentRatio * 100}%;"
    >
        <div
            class="w-4 h-4 rounded-full border-2 bg-base-100 shadow-sm"
            style="border-color: {isTimed ? dynamicColor : '#a3a3a3'};"
        ></div>
    </div>

    <!-- Float Label -->
    <div
        class="absolute inset-x-0 bottom-1 flex justify-center pointer-events-none"
    >
        {#if isTimed || isDragging}
            <span
                class="text-[10px] font-bold tabular-nums px-2 py-0.5 bg-base-100/80 rounded-full shadow-sm border border-base-200"
            >
                {formattedTime}
            </span>
        {:else}
            <span
                class="text-[10px] uppercase tracking-wider text-neutral/40 font-medium"
            >
                Drag to set
            </span>
        {/if}
    </div>
</div>
