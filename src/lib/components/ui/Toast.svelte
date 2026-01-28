<script lang="ts">
    import { fly, fade } from "svelte/transition";
    import { flip } from "svelte/animate";
    import { quintOut } from "svelte/easing";
    import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-svelte";
    import { toastManager } from "$lib/stores/toast.svelte";
    import type { Toast, ToastType } from "$lib/types";

    // -------------------------------------------------------------------------
    // Constants
    // -------------------------------------------------------------------------
    const TOAST_CONFIG = {
        success: { icon: CheckCircle, color: "accent" },
        error: { icon: XCircle, color: "red-500" },
        warning: { icon: AlertTriangle, color: "amber-500" },
        info: { icon: Info, color: "primary" },
    } as const;

    const POSITION_CLASSES: Record<string, string> = {
        "top-right": "top-4 right-4 items-end",
        "top-center": "top-4 left-1/2 -translate-x-1/2 items-center",
        "bottom-right": "bottom-4 right-4 items-end",
        "bottom-center": "bottom-4 left-1/2 -translate-x-1/2 items-center",
    };

    // -------------------------------------------------------------------------
    // Props
    // -------------------------------------------------------------------------
    interface Props {
        position?: "top-right" | "top-center" | "bottom-right" | "bottom-center";
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
        const config = TOAST_CONFIG[type] ?? TOAST_CONFIG.info;
        return {
            Icon: config.icon,
            color: config.color,
        };
    }

    function getStyleClasses(color: string) {
        return {
            bg: `bg-${color}/10`,
            icon: `text-${color}`,
            border: `border-${color}/20`,
            progress: `bg-${color}`,
        };
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
            {@const { Icon, color } = getConfig(toast.type)}
            {@const styles = getStyleClasses(color)}

            <div
                animate:flip={{ duration: 200, easing: quintOut }}
                in:fly={{ y: animationY, duration: 300, easing: quintOut }}
                out:fade={{ duration: 150 }}
                class="pointer-events-auto flex items-start gap-3 w-full px-4 py-3
                       rounded-2xl border bg-base-100/95 backdrop-blur-sm
                       shadow-lg shadow-neutral/5 {styles.border}"
                role="alert"
                onmouseenter={() => toastManager.pause(toast.id)}
                onmouseleave={() => toastManager.resume(toast.id)}
            >
                <!-- Icon -->
                <div class="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center {styles.bg}">
                    <Icon class="w-4 h-4 {styles.icon}" strokeWidth={2.5} />
                </div>

                <!-- Message -->
                <p class="flex-1 text-sm text-neutral font-medium pt-1">
                    {toast.message}
                </p>

                <!-- Action Button -->
                {#if toast.action}
                    <button
                        type="button"
                        class="flex-shrink-0 px-3 py-1 rounded-lg text-xs font-bold uppercase
                               bg-base-200 hover:bg-base-300 transition-colors"
                        onclick={() => handleAction(toast)}
                    >
                        {toast.action.label}
                    </button>
                {/if}

                <!-- Dismiss Button -->
                <button
                    type="button"
                    class="flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center
                           text-neutral/30 hover:text-neutral/60 hover:bg-base-200 transition-colors"
                    onclick={() => dismiss(toast.id)}
                    aria-label="Dismiss notification"
                >
                    <X class="w-4 h-4" strokeWidth={2.5} />
                </button>

                <!-- Progress Bar -->
                {#if toast.duration > 0}
                    <div class="absolute bottom-0 left-4 right-4 h-0.5 rounded-full overflow-hidden bg-base-200">
                        <div
                            class="h-full rounded-full {styles.progress} opacity-50"
                            style="animation: toast-shrink {toast.duration}ms linear forwards;"
                        ></div>
                    </div>
                {/if}
            </div>
        {/each}
    </div>
{/if}

<style>
    @keyframes toast-shrink {
        from { width: 100%; }
        to { width: 0%; }
    }
</style>