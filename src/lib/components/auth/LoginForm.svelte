<!--
  Authentication form component providing Magic Link and GitHub OAuth login options.
-->
<script lang="ts">
    /**
     * LoginForm Component
     * Modal/panel for user authentication with magic link and OAuth
     */

    import { fade, fly, scale } from "svelte/transition";
    import { quintOut, backOut } from "svelte/easing";
    import {
        X,
        Mail,
        Github,
        Sparkles,
        ArrowRight,
        CheckCircle,
        AlertCircle,
        Loader2,
        Cloud,
        Shield,
    } from "lucide-svelte";
    import { getAuthStore } from "$lib/context";

    // -------------------------------------------------------------------------
    // Props
    // -------------------------------------------------------------------------

    interface Props {
        isOpen?: boolean;
        onClose?: () => void;
        class?: string;
    }

    let {
        isOpen = $bindable(false),
        onClose,
        class: className = "",
    }: Props = $props();

    const authManager = getAuthStore();

    // -------------------------------------------------------------------------
    // Local State
    // -------------------------------------------------------------------------

    let email = $state("");
    let emailSent = $state(false);
    let emailError = $state("");
    let isSubmitting = $state(false);
    let activeTab = $state<"email" | "oauth">("email");
    let inputRef = $state<HTMLInputElement | null>(null);

    // -------------------------------------------------------------------------
    // Derived State
    // -------------------------------------------------------------------------

    const isValidEmail = $derived(
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()),
    );
    const canSubmit = $derived(isValidEmail && !isSubmitting);
    const isConfigured = $derived(authManager.isConfigured);

    // -------------------------------------------------------------------------
    // Effects
    // -------------------------------------------------------------------------

    $effect(() => {
        if (isOpen) {
            // Focus input when modal opens
            setTimeout(() => inputRef?.focus(), 100);
            // Reset state
            emailSent = false;
            emailError = "";
            email = "";
        }
    });

    // -------------------------------------------------------------------------
    // Handlers
    // -------------------------------------------------------------------------

    function handleClose(): void {
        isOpen = false;
        onClose?.();
    }

    function handleBackdropClick(event: MouseEvent): void {
        if (event.target === event.currentTarget) {
            handleClose();
        }
    }

    function handleKeydown(event: KeyboardEvent): void {
        if (event.key === "Escape") {
            handleClose();
        }
    }

    async function handleEmailSubmit(event?: Event): Promise<void> {
        event?.preventDefault();

        if (!canSubmit) return;

        emailError = "";
        isSubmitting = true;

        try {
            const result = await authManager.signInWithEmail(email.trim());

            if (result.success) {
                emailSent = true;
            } else {
                emailError = result.error || "Failed to send magic link";
            }
        } catch (error) {
            emailError =
                error instanceof Error ? error.message : "An error occurred";
        } finally {
            isSubmitting = false;
        }
    }

    async function handleGitHubSignIn(): Promise<void> {
        isSubmitting = true;
        emailError = "";

        try {
            await authManager.signInWithGitHub();
            // Note: This will redirect, so we won't reach this point
        } catch (error) {
            emailError =
                error instanceof Error
                    ? error.message
                    : "Failed to sign in with GitHub";
        } finally {
            isSubmitting = false;
        }
    }

    function resetForm(): void {
        emailSent = false;
        emailError = "";
        email = "";
        inputRef?.focus();
    }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
    <!-- Backdrop -->
    <div
        class="
      fixed inset-0 z-[90]
      bg-neutral/40 backdrop-blur-sm
      flex items-center justify-center
      p-4
      {className}
    "
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-title"
        tabindex="-1"
        onclick={handleBackdropClick}
        onkeydown={(e) => e.key === "Escape" && handleClose()}
        transition:fade={{ duration: 200 }}
    >
        <!-- Modal -->
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <div
            class="
        relative w-full max-w-md
        bg-base-100 rounded-3xl
        shadow-2xl shadow-neutral/20
        overflow-hidden
      "
            transition:scale={{ duration: 300, easing: backOut, start: 0.95 }}
            onclick={(e) => e.stopPropagation()}
            role="document"
            tabindex="-1"
            onkeydown={(e) => e.stopPropagation()}
        >
            <!-- Close Button -->
            <button
                type="button"
                class="
          absolute top-4 right-4 z-10
          w-8 h-8 rounded-xl
          flex items-center justify-center
          text-neutral/40 hover:text-neutral
          hover:bg-base-200
          transition-colors
        "
                onclick={handleClose}
                aria-label="Close"
            >
                <X class="w-5 h-5" strokeWidth={2} />
            </button>

            <!-- Header -->
            <div class="relative px-6 pt-8 pb-6 text-center">
                <!-- Background Decoration -->
                <div
                    class="
            absolute inset-0
            bg-gradient-to-br from-primary/5 via-transparent to-secondary/5
          "
                    aria-hidden="true"
                ></div>

                <!-- Logo -->
                <div
                    class="
            relative inline-flex items-center justify-center
            w-16 h-16 mb-4
            rounded-2xl
            bg-gradient-to-br from-primary to-secondary
            shadow-lg shadow-primary/20
          "
                >
                    <Sparkles class="w-8 h-8 text-white" strokeWidth={1.5} />
                </div>

                <h2
                    id="login-title"
                    class="text-xl font-bold font-display text-neutral mb-1"
                >
                    Welcome to Chronos
                </h2>
                <p class="text-sm text-neutral/60">
                    Sign in to sync your tasks across devices
                </p>
            </div>

            <!-- Not Configured Warning -->
            {#if !isConfigured}
                <div
                    class="
            mx-6 mb-4 p-4 rounded-2xl
            bg-amber-500/10 border border-amber-500/20
          "
                >
                    <div class="flex items-start gap-3">
                        <AlertCircle
                            class="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5"
                            strokeWidth={2}
                        />
                        <div>
                            <p
                                class="text-sm font-medium text-amber-600 dark:text-amber-400"
                            >
                                Authentication not configured
                            </p>
                            <p
                                class="text-xs text-amber-600/70 dark:text-amber-400/70 mt-1"
                            >
                                Set up Supabase environment variables to enable
                                sign in. Your tasks are still saved locally.
                            </p>
                        </div>
                    </div>
                </div>
            {:else}
                <!-- Tab Switcher -->
                <div class="px-6 mb-4">
                    <div class="flex bg-base-200 rounded-2xl p-1">
                        <button
                            type="button"
                            class="
                flex-1 flex items-center justify-center gap-2
                py-2.5 rounded-xl
                text-sm font-medium
                transition-all duration-200
                {activeTab === 'email'
                                ? 'bg-base-100 text-neutral shadow-sm'
                                : 'text-neutral/50 hover:text-neutral/70'}
              "
                            onclick={() => (activeTab = "email")}
                        >
                            <Mail class="w-4 h-4" strokeWidth={2} />
                            Email
                        </button>
                        <button
                            type="button"
                            class="
                flex-1 flex items-center justify-center gap-2
                py-2.5 rounded-xl
                text-sm font-medium
                transition-all duration-200
                {activeTab === 'oauth'
                                ? 'bg-base-100 text-neutral shadow-sm'
                                : 'text-neutral/50 hover:text-neutral/70'}
              "
                            onclick={() => (activeTab = "oauth")}
                        >
                            <Shield class="w-4 h-4" strokeWidth={2} />
                            OAuth
                        </button>
                    </div>
                </div>

                <!-- Content -->
                <div class="px-6 pb-6">
                    {#if activeTab === "email"}
                        <!-- Email Tab -->
                        <div transition:fade={{ duration: 150 }}>
                            {#if emailSent}
                                <!-- Success State -->
                                <div
                                    class="text-center py-8"
                                    in:scale={{
                                        duration: 300,
                                        easing: backOut,
                                        start: 0.9,
                                    }}
                                >
                                    <div
                                        class="
                      inline-flex items-center justify-center
                      w-16 h-16 mb-4
                      rounded-full
                      bg-accent/10
                    "
                                    >
                                        <CheckCircle
                                            class="w-8 h-8 text-accent"
                                            strokeWidth={1.5}
                                        />
                                    </div>
                                    <h3
                                        class="text-lg font-semibold text-neutral mb-2"
                                    >
                                        Check your inbox!
                                    </h3>
                                    <p class="text-sm text-neutral/60 mb-6">
                                        We sent a magic link to<br />
                                        <span class="font-medium text-neutral"
                                            >{email}</span
                                        >
                                    </p>
                                    <button
                                        type="button"
                                        class="
                      text-sm text-primary hover:text-primary-dark
                      font-medium
                    "
                                        onclick={resetForm}
                                    >
                                        Use a different email
                                    </button>
                                </div>
                            {:else}
                                <!-- Email Form -->
                                <form onsubmit={handleEmailSubmit}>
                                    <div class="space-y-4">
                                        <!-- Email Input -->
                                        <div>
                                            <label
                                                for="email-input"
                                                class="block text-sm font-medium text-neutral/70 mb-2"
                                            >
                                                Email address
                                            </label>
                                            <div class="relative">
                                                <Mail
                                                    class="
                            absolute left-4 top-1/2 -translate-y-1/2
                            w-5 h-5 text-neutral/30
                          "
                                                    strokeWidth={2}
                                                />
                                                <input
                                                    bind:this={inputRef}
                                                    bind:value={email}
                                                    id="email-input"
                                                    type="email"
                                                    placeholder="you@example.com"
                                                    autocomplete="email"
                                                    class="
                            w-full pl-12 pr-4 py-3.5
                            bg-base-200 border-2 border-transparent
                            rounded-2xl
                            text-neutral placeholder:text-neutral/40
                            focus:bg-base-100 focus:border-primary
                            outline-none transition-all
                          "
                                                    disabled={isSubmitting}
                                                />
                                            </div>
                                        </div>

                                        <!-- Error Message -->
                                        {#if emailError}
                                            <div
                                                class="
                          flex items-center gap-2
                          px-4 py-3 rounded-xl
                          bg-red-500/10 text-red-500
                          text-sm
                        "
                                                transition:fly={{
                                                    y: -10,
                                                    duration: 200,
                                                }}
                                            >
                                                <AlertCircle
                                                    class="w-4 h-4 flex-shrink-0"
                                                    strokeWidth={2}
                                                />
                                                {emailError}
                                            </div>
                                        {/if}

                                        <!-- Submit Button -->
                                        <button
                                            type="submit"
                                            disabled={!canSubmit}
                                            class="
                        w-full flex items-center justify-center gap-2
                        py-3.5 rounded-2xl
                        bg-primary text-white
                        font-semibold
                        hover:bg-primary-dark
                        disabled:opacity-50 disabled:cursor-not-allowed
                        transition-all duration-200
                        active:scale-[0.98]
                      "
                                        >
                                            {#if isSubmitting}
                                                <Loader2
                                                    class="w-5 h-5 animate-spin"
                                                    strokeWidth={2}
                                                />
                                                Sending...
                                            {:else}
                                                Send magic link
                                                <ArrowRight
                                                    class="w-5 h-5"
                                                    strokeWidth={2}
                                                />
                                            {/if}
                                        </button>
                                    </div>
                                </form>
                            {/if}
                        </div>
                    {:else}
                        <!-- OAuth Tab -->
                        <div
                            class="space-y-3"
                            transition:fade={{ duration: 150 }}
                        >
                            <!-- GitHub -->
                            <button
                                type="button"
                                class="
                  w-full flex items-center justify-center gap-3
                  py-3.5 rounded-2xl
                  bg-neutral text-white
                  font-semibold
                  hover:bg-neutral-dark
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-all duration-200
                  active:scale-[0.98]
                "
                                disabled={isSubmitting}
                                onclick={handleGitHubSignIn}
                            >
                                {#if isSubmitting}
                                    <Loader2
                                        class="w-5 h-5 animate-spin"
                                        strokeWidth={2}
                                    />
                                {:else}
                                    <Github class="w-5 h-5" strokeWidth={2} />
                                {/if}
                                Continue with GitHub
                            </button>

                            <!-- Error Message -->
                            {#if emailError}
                                <div
                                    class="
                    flex items-center gap-2
                    px-4 py-3 rounded-xl
                    bg-red-500/10 text-red-500
                    text-sm
                  "
                                    transition:fly={{ y: -10, duration: 200 }}
                                >
                                    <AlertCircle
                                        class="w-4 h-4 flex-shrink-0"
                                        strokeWidth={2}
                                    />
                                    {emailError}
                                </div>
                            {/if}
                        </div>
                    {/if}
                </div>

                <!-- Footer -->
                <div
                    class="
            px-6 py-4
            bg-base-200/50 border-t border-base-300/50
          "
                >
                    <div
                        class="flex items-center justify-center gap-2 text-xs text-neutral/40"
                    >
                        <Cloud class="w-3.5 h-3.5" strokeWidth={2} />
                        <span>Your data syncs securely with Supabase</span>
                    </div>
                </div>
            {/if}
        </div>
    </div>
{/if}
