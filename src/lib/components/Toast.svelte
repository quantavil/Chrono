<script lang="ts">
    /**
     * Toast Component
     * Fixed position container for toast notifications
     */

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
    // Derived State
    // -------------------------------------------------------------------------

    const toasts = $derived(toastManager.toasts);
    const hasToasts = $derived(toastManager.hasToasts);

    // -------------------------------------------------------------------------
    // Position Classes
    // -------------------------------------------------------------------------

    const positionClasses: Record<string, string> = {
        "top-right": "top-4 right-4 items-end",
        "top-center": "top-4 left-1/2 -translate-x-1/2 items-center",
        "bottom-right": "bottom-4 right-4 items-end",
        "bottom-center": "bottom-4 left-1/2 -translate-x-1/2 items-center",
    };

    // -------------------------------------------------------------------------
    // Toast Styling
    // -------------------------------------------------------------------------

    function getToastStyles(type: ToastType): {
        icon: typeof CheckCircle;
        bgClass: string;
        iconClass: string;
        borderClass: string;
    } {
        switch (type) {
            case "success":
                return {
                    icon: CheckCircle,
                    bgClass: "bg-accent/10",
                    iconClass: "text-accent",
                    borderClass: "border-accent/20",
                };
            case "error":
                return {
                    icon: XCircle,
                    bgClass: "bg-red-500/10",
                    iconClass: "text-red-500",
                    borderClass: "border-red-500/20",
                };
            case "warning":
                return {
                    icon: AlertTriangle,
                    bgClass: "bg-amber-500/10",
                    iconClass: "text-amber-500",
                    borderClass: "border-amber-500/20",
                };
            case "info":
            default:
                return {
                    icon: Info,
                    bgClass: "bg-primary/10",
                    iconClass: "text-primary",
                    borderClass: "border-primary/20",
                };
        }
    }

    // -------------------------------------------------------------------------
    // Handlers
    // -------------------------------------------------------------------------

    function handleDismiss(id: string): void {
        toastManager.remove(id);
    }

    function handleMouseEnter(id: string): void {
        toastManager.pause(id);
    }

    function handleMouseLeave(id: string): void {
        toastManager.resume(id);
    }

    // -------------------------------------------------------------------------
    // Animation Direction
    // -------------------------------------------------------------------------

    function getAnimationY(): number {
        return position.startsWith("top") ? -20 : 20;
    }
</script>

{#if hasToasts}
    <div
        class="
      fixed z-[100] pointer-events-none
      flex flex-col gap-2
      w-full max-w-sm px-4
      md:w-auto md:min-w-[320px] md:max-w-md md:px-0
      {positionClasses[position]}
      {className}
    "
        role="region"
        aria-label="Notifications"
        aria-live="polite"
    >
        {#each toasts as toast (toast.id)}
            {@const styles = getToastStyles(toast.type)}
            {@const Icon = styles.icon}
            <div
                animate:flip={{ duration: 200, easing: quintOut }}
                in:fly={{ y: getAnimationY(), duration: 300, easing: quintOut }}
                out:fade={{ duration: 150 }}
                class="
          pointer-events-auto
          flex items-start gap-3
          w-full px-4 py-3
          rounded-2xl border
          bg-base-100/95 backdrop-blur-sm
          shadow-lg shadow-neutral/5
          {styles.borderClass}
        "
                role="alert"
                onmouseenter={() => handleMouseEnter(toast.id)}
                onmouseleave={() => handleMouseLeave(toast.id)}
            >
                <!-- Icon -->
                <div
                    class="
            flex-shrink-0 w-8 h-8 rounded-xl
            flex items-center justify-center
            {styles.bgClass}
          "
                >
                    <Icon
                        class="w-4 h-4 {styles.iconClass}"
                        strokeWidth={2.5}
                    />
                </div>

                <!-- Message -->
                <p class="flex-1 text-sm text-neutral font-medium pt-1">
                    {toast.message}
                </p>

                <!-- Action Button -->
                {#if toast.action}
                    <button
                        type="button"
                        class="
                      flex-shrink-0 px-3 py-1 rounded-lg
                      text-xs font-bold uppercase
                      bg-base-200 hover:bg-base-300
                      transition-colors
                    "
                        onclick={() => {
                            if (toast.action) {
                                toast.action.onClick();
                                handleDismiss(toast.id);
                            }
                        }}
                    >
                        {toast.action.label}
                    </button>
                {/if}

                <!-- Dismiss Button -->
                <button
                    type="button"
                    class="
            flex-shrink-0 w-6 h-6 rounded-lg
            flex items-center justify-center
            text-neutral/30 hover:text-neutral/60
            hover:bg-base-200
            transition-colors
          "
                    onclick={() => handleDismiss(toast.id)}
                    aria-label="Dismiss notification"
                >
                    <X class="w-4 h-4" strokeWidth={2.5} />
                </button>

                <!-- Progress Bar -->
                {#if toast.duration > 0}
                    <div
                        class="
              absolute bottom-0 left-4 right-4 h-0.5
              rounded-full overflow-hidden
              bg-base-200
            "
                    >
                        <div
                            class="
                h-full rounded-full
                {styles.iconClass.replace('text-', 'bg-')}
                opacity-50
              "
                            style="
                animation: shrink {toast.duration}ms linear forwards;
              "
                        ></div>
                    </div>
                {/if}
            </div>
        {/each}
    </div>
{/if}

<style>
    @keyframes shrink {
        from {
            width: 100%;
        }
        to {
            width: 0%;
        }
    }
</style>
