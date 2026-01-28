<!--
  Individual notification toast component that displays messages and optional action buttons.
-->
<script lang="ts">
    import { fly, fade } from "svelte/transition";
    import { flip } from "svelte/animate";
    import { quintOut } from "svelte/easing";
    import {
        CheckCircle,
        XCircle,
        AlertTriangle,
        Info,
        X,
    } from "lucide-svelte";
    import { toastManager } from "$lib/stores/toast.svelte";
    import type { Toast, ToastType } from "$lib/types";
    import { TOAST_CONFIG } from "$lib/types";

    const POSITION_CLASSES: Record<string, string> = {
        "top-right": "top-4 right-4 items-end",
        "top-center": "top-4 left-1/2 -translate-x-1/2 items-center",
        "bottom-right": "bottom-4 right-4 items-end",
        "bottom-center": "bottom-4 left-1/2 -translate-x-1/2 items-center",
    };

    const ICONS = {
        CheckCircle,
        XCircle,
        AlertTriangle,
        Info,
        CheckCircle2: CheckCircle, // Mapping CheckCircle2 to CheckCircle as fallback or alias if needed
    };

    // -------------------------------------------------------------------------
    // Props
    // -------------------------------------------------------------------------
    interface Props {
        position?:
            | "top-right"
            | "top-center"
            | "bottom-right"
            | "bottom-center";
        class?: string;
    }

    let { position = "bottom-center", class: className = "" }: Props = $props();

    // -------------------------------------------------------------------------
    // Derived
    // -------------------------------------------------------------------------
    const toasts = $derived(toastManager.toasts);
    const hasToasts = $derived(toastManager.hasToasts);
    const animationY = $derived(position.startsWith("top") ? -20 : 20);

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------
    function getConfig(type: ToastType) {
        return TOAST_CONFIG[type] ?? TOAST_CONFIG.info;
    }

    // -------------------------------------------------------------------------
    // Handlers
    // -------------------------------------------------------------------------
    function dismiss(id: string): void {
        toastManager.remove(id);
    }

    function handleAction(toast: Toast): void {
        toast.action?.onClick();
        dismiss(toast.id);
    }
</script>

<!-- ======================================================================= -->
<!-- COMPONENT RENDER -->
<!-- ======================================================================= -->

{#if hasToasts}
    <div
        class="fixed z-[100] pointer-events-none flex flex-col gap-2
               w-full max-w-sm px-4 md:w-auto md:min-w-[320px] md:max-w-md md:px-0
               {POSITION_CLASSES[position]} {className}"
        role="region"
        aria-label="Notifications"
        aria-live="polite"
    >
        {#each toasts as toast (toast.id)}
            {@const config = getConfig(toast.type)}
            {@const Icon = ICONS[config.icon as keyof typeof ICONS] || Info}

            <div
                animate:flip={{ duration: 200, easing: quintOut }}
                in:fly={{ y: animationY, duration: 300, easing: quintOut }}
                out:fade={{ duration: 150 }}
                class="relative overflow-hidden pointer-events-auto flex items-center gap-3 w-full px-4 py-3
                       rounded-xl border bg-base-100/95 backdrop-blur-sm
                       shadow-lg shadow-neutral/5 {config.classes.border}"
                role="alert"
                onmouseenter={() => toastManager.pause(toast.id)}
                onmouseleave={() => toastManager.resume(toast.id)}
            >
                <!-- Icon -->
                <div
                    class="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center {config
                        .classes.bg}"
                >
                    <Icon
                        class="w-4 h-4 {config.classes.text}"
                        strokeWidth={2.5}
                    />
                </div>

                <!-- Message -->
                <p class="flex-1 text-sm text-neutral font-medium">
                    {toast.message}
                </p>

                <!-- Action Button -->
                {#if toast.action}
                    <button
                        type="button"
                        class="flex-shrink-0 px-4 py-1.5 rounded-md text-sm font-semibold
                               bg-base-200/50 hover:bg-base-200 transition-colors
                               text-neutral-700 hover:text-neutral-900"
                        onclick={() => handleAction(toast)}
                    >
                        {toast.action.label}
                    </button>
                {/if}

                <!-- Dismiss Button -->
                <button
                    type="button"
                    class="flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center
                           text-neutral/30 hover:text-neutral/60 hover:bg-base-200 transition-colors"
                    onclick={() => dismiss(toast.id)}
                    aria-label="Dismiss notification"
                >
                    <X class="w-4 h-4" strokeWidth={2.5} />
                </button>

                <!-- Progress Bar -->
                {#if toast.duration > 0}
                    <div
                        class="absolute bottom-0 left-0 right-0 h-1 bg-base-200/50"
                    >
                        <div
                            class="h-full {config.classes.progress}"
                            style="
                                width: 100%;
                                animation: toast-shrink {toast.duration}ms linear forwards;
                                animation-play-state: {toast.pausedAt
                                ? 'paused'
                                : 'running'};
                            "
                        ></div>
                    </div>
                {/if}
            </div>
        {/each}
    </div>
{/if}
