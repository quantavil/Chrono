<script lang="ts">
    interface Props {
        value?: number | null;
        onChange?: (ms: number | null) => void;
        class?: string;
    }

    let {
        value = null,
        onChange = () => {},
        class: className = "",
    }: Props = $props();

    const MAX_MINUTES = 720;
    const POWER = 2.5;
    const HEIGHT = 64;

    let container = $state<HTMLDivElement | null>(null);
    let width = $state(0);
    let dragging = $state(false);
    let minutes = $state(0); // Initialize with default, sync via effect

    function toMinutes(ms: number | null) {
        return ms ? Math.round(ms / 60000) : 0;
    }

    // Sync prop → state (runs immediately on init + when value changes)
    $effect(() => {
        const m = toMinutes(value);
        if (!dragging) minutes = m;
    });

    // Observe container width
    $effect(() => {
        if (!container) return;
        const ro = new ResizeObserver(([e]) => (width = e.contentRect.width));
        ro.observe(container);
        return () => ro.disconnect();
    });

    // Derived values
    const active = $derived(minutes > 0);
    const ratio = $derived(Math.pow(minutes / MAX_MINUTES, 1 / POWER));
    const freq = $derived(0.2 + ratio * 0.8);
    const amp = $derived(active ? 5 + ratio * 20 : 2);

    const color = $derived(
        active
            ? `hsl(${Math.max(0, 200 - ratio * 220)} ${60 + ratio * 30}% ${60 - ratio * 10}%)`
            : undefined
    );

    const label = $derived.by(() => {
        if (minutes <= 0) return "No time";
        if (minutes < 60) return `${minutes}m`;
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return m ? `${h}h ${m}m` : `${h}h`;
    });

    const path = $derived.by(() => {
        if (width <= 0) return "";
        const mid = HEIGHT / 2;
        let d = `M0,${mid}`;
        for (let x = 0; x <= width; x += 2) {
            d += `L${x},${mid + Math.sin((x / width) * 50 * freq) * amp}`;
        }
        return d;
    });

    const knobX = $derived(ratio * width);
    const knobY = $derived(
        width > 0 ? HEIGHT / 2 + Math.sin((knobX / width) * 50 * freq) * amp : HEIGHT / 2
    );

    function posToMinutes(clientX: number): number {
        if (!container || width <= 0) return 0;
        const x = clientX - container.getBoundingClientRect().left;
        const r = Math.max(0, Math.min(1, x / width));
        const raw = Math.pow(r, POWER) * MAX_MINUTES;

        if (raw <= 0) return 0;
        if (raw < 15) return Math.round(raw);
        if (raw < 60) return Math.round(raw / 5) * 5;
        return Math.round(raw / 15) * 15;
    }

    function update(clientX: number) {
        const next = posToMinutes(clientX);
        if (next !== minutes) {
            minutes = next;
            navigator.vibrate?.(5);
        }
    }

    function commit() {
        dragging = false;
        onChange(minutes ? minutes * 60000 : null);
    }

    function onpointerdown(e: PointerEvent) {
        if (e.button !== 0) return;
        dragging = true;
        update(e.clientX);
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }

    function onpointermove(e: PointerEvent) {
        if (dragging) update(e.clientX);
    }

    function onkeydown(e: KeyboardEvent) {
        const step = e.shiftKey ? 15 : 5;
        let next = minutes;

        if (e.key === "ArrowRight") {
            next = Math.min(MAX_MINUTES, minutes + step);
        } else if (e.key === "ArrowLeft") {
            next = Math.max(0, minutes - step);
        } else {
            return;
        }

        e.preventDefault();
        if (next !== minutes) {
            minutes = next;
            onChange(minutes ? minutes * 60000 : null);
        }
    }
</script>

<div
    bind:this={container}
    class="relative h-16 w-full touch-none select-none rounded-xl bg-base-200/50 
           overflow-hidden cursor-crosshair {className}"
    role="slider"
    tabindex="0"
    aria-label="Duration"
    aria-valuenow={minutes}
    aria-valuemin={0}
    aria-valuemax={MAX_MINUTES}
    aria-valuetext={label}
    {onpointerdown}
    {onpointermove}
    onpointerup={commit}
    onpointercancel={commit}
    onlostpointercapture={commit}
    {onkeydown}
>
    <!-- Track -->
    <div class="absolute inset-x-3 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-current/10"></div>

    <!-- Wave -->
    <svg class="absolute inset-0 overflow-visible pointer-events-none">
        <path
            d={path}
            fill="none"
            stroke={color ?? "currentColor"}
            stroke-width="3"
            stroke-linecap="round"
            class="transition-colors duration-200"
            class:opacity-20={!active}
        ></path>
    </svg>

    <!-- Knob -->
    <div
        class="absolute -ml-2 -mt-2 size-4 rounded-full border-2 bg-base-100 shadow-md 
               pointer-events-none z-10 transition-transform duration-150"
        class:scale-125={dragging}
        style:left="{knobX}px"
        style:top="{knobY}px"
        style:border-color={color ?? "#a3a3a3"}
    ></div>

    <!-- Label -->
    <div class="absolute inset-x-0 bottom-1 flex justify-center pointer-events-none">
        {#if active || dragging}
            <span class="text-[10px] font-bold tabular-nums px-2 py-0.5 bg-base-100/90 
                         rounded-full shadow-sm border border-base-200 backdrop-blur-sm">
                {label}
            </span>
        {:else}
            <span class="text-[10px] uppercase tracking-wider text-neutral/40 font-medium">
                Drag to set
            </span>
        {/if}
    </div>
</div>