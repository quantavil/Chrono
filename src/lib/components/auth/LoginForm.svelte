<!--
  Authentication form with Magic Link and GitHub OAuth options.
-->
<script lang="ts">
    import { fade, scale } from "svelte/transition";
    import { backOut } from "svelte/easing";
    import {
        X,
        Mail,
        Github,
        Sparkles,
        ArrowRight,
        CheckCircle,
        AlertCircle,
        Loader2,
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
    // State
    // -------------------------------------------------------------------------

    let email = $state("");
    let emailSent = $state(false);
    let error = $state("");
    let isLoading = $state(false);
    let mode = $state<"email" | "oauth">("email");
    let inputRef = $state<HTMLInputElement | null>(null);

    // -------------------------------------------------------------------------
    // Derived
    // -------------------------------------------------------------------------

    const isValidEmail = $derived(
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()),
    );
    const canSubmit = $derived(isValidEmail && !isLoading);
    const isConfigured = $derived(authManager.isConfigured);

    // -------------------------------------------------------------------------
    // Effects
    // -------------------------------------------------------------------------

    $effect(() => {
        if (isOpen) {
            reset();
            setTimeout(() => inputRef?.focus(), 100);
        }
    });

    // -------------------------------------------------------------------------
    // Handlers
    // -------------------------------------------------------------------------

    function close() {
        isOpen = false;
        onClose?.();
    }

    function reset() {
        emailSent = false;
        error = "";
        email = "";
    }

    function handleKeydown(e: KeyboardEvent) {
        if (e.key === "Escape" && isOpen) close();
    }

    async function submitEmail(e?: Event) {
        e?.preventDefault();
        if (!canSubmit) return;

        error = "";
        isLoading = true;

        try {
            const result = await authManager.signInWithEmail(email.trim());
            emailSent = result.success;
            if (!result.success) {
                error = result.error || "Failed to send magic link";
            }
        } catch (err) {
            error = err instanceof Error ? err.message : "An error occurred";
        } finally {
            isLoading = false;
        }
    }

    async function signInWithGitHub() {
        error = "";
        isLoading = true;

        try {
            await authManager.signInWithGitHub();
        } catch (err) {
            error =
                err instanceof Error ? err.message : "GitHub sign in failed";
            isLoading = false;
        }
    }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
    <!-- Backdrop -->
    <div
        class="fixed inset-0 z-50 grid place-items-center p-4 bg-black/40 backdrop-blur-sm {className}"
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-title"
        tabindex="-1"
        onclick={(e) => e.target === e.currentTarget && close()}
        onkeydown={(e) => e.key === "Escape" && close()}
        transition:fade={{ duration: 150 }}
    >
        <!-- Modal -->
        <div
            class="relative w-full max-w-sm bg-base-100 rounded-2xl shadow-xl"
            role="none"
            onclick={(e) => e.stopPropagation()}
            onkeydown={() => {}}
            transition:scale={{ duration: 200, easing: backOut, start: 0.95 }}
        >
            <!-- Close Button -->
            <button
                type="button"
                class="absolute top-3 right-3 p-2 rounded-lg text-neutral/40
                       hover:text-neutral hover:bg-base-200 transition-colors"
                onclick={close}
                aria-label="Close dialog"
            >
                <X class="w-4 h-4" />
            </button>

            <!-- Header -->
            <header class="px-6 pt-6 pb-4 text-center">
                <div
                    class="inline-grid place-items-center w-12 h-12 mb-3 rounded-xl
                           bg-primary text-primary-content"
                >
                    <Sparkles class="w-6 h-6" />
                </div>
                <h2 id="login-title" class="text-lg font-semibold">
                    Sign in to Chronos
                </h2>
                <p class="mt-1 text-sm text-neutral/60">
                    Sync your tasks across devices
                </p>
            </header>

            <!-- Body -->
            <div class="px-6 pb-6">
                {#if !isConfigured}
                    <!-- Unconfigured Warning -->
                    <div
                        class="p-4 rounded-xl bg-warning/10 border border-warning/20"
                    >
                        <div class="flex gap-3">
                            <AlertCircle
                                class="w-5 h-5 text-warning shrink-0 mt-0.5"
                            />
                            <div class="text-sm">
                                <p class="font-medium text-warning">
                                    Not configured
                                </p>
                                <p class="mt-0.5 text-warning/70">
                                    Add Supabase credentials to enable cloud
                                    sync.
                                </p>
                            </div>
                        </div>
                    </div>
                {:else}
                    <!-- Tab Switcher -->
                    <div
                        class="flex gap-1 p-1 mb-4 bg-base-200 rounded-xl"
                        role="tablist"
                    >
                        {#each [{ id: "email", icon: Mail, label: "Email" }, { id: "oauth", icon: Github, label: "GitHub" }] as const as tab (tab.id)}
                            <button
                                type="button"
                                role="tab"
                                aria-selected={mode === tab.id}
                                class="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg
                                       text-sm font-medium transition-all
                                       {mode === tab.id
                                    ? 'bg-base-100 text-neutral shadow-sm'
                                    : 'text-neutral/50 hover:text-neutral'}"
                                onclick={() => {
                                    mode = tab.id;
                                    error = "";
                                }}
                            >
                                <tab.icon class="w-4 h-4" />
                                {tab.label}
                            </button>
                        {/each}
                    </div>

                    <!-- Tab Panels -->
                    {#if mode === "email"}
                        <div
                            role="tabpanel"
                            transition:fade={{ duration: 100 }}
                        >
                            {#if emailSent}
                                <!-- Success State -->
                                <div
                                    class="py-6 text-center"
                                    in:scale={{ duration: 200, start: 0.95 }}
                                >
                                    <div
                                        class="inline-grid place-items-center w-12 h-12 mb-3
                                               rounded-full bg-success/10"
                                    >
                                        <CheckCircle
                                            class="w-6 h-6 text-success"
                                        />
                                    </div>
                                    <p class="font-medium">Check your inbox</p>
                                    <p class="mt-1 text-sm text-neutral/60">
                                        Sent to <span
                                            class="text-neutral font-medium"
                                            >{email}</span
                                        >
                                    </p>
                                    <button
                                        type="button"
                                        class="mt-4 text-sm text-primary hover:underline"
                                        onclick={() => {
                                            reset();
                                            inputRef?.focus();
                                        }}
                                    >
                                        Use different email
                                    </button>
                                </div>
                            {:else}
                                <!-- Email Form -->
                                <form onsubmit={submitEmail} class="space-y-3">
                                    <div class="relative">
                                        <Mail
                                            class="absolute left-3 top-1/2 -translate-y-1/2
                                                   w-5 h-5 text-neutral/30 pointer-events-none"
                                        />
                                        <input
                                            bind:this={inputRef}
                                            bind:value={email}
                                            type="email"
                                            placeholder="you@example.com"
                                            autocomplete="email"
                                            disabled={isLoading}
                                            class="w-full pl-11 pr-4 py-3 bg-base-200 rounded-xl
                                                   placeholder:text-neutral/40 disabled:opacity-50
                                                   focus:outline-none focus:ring-2 focus:ring-primary/50
                                                   transition-shadow"
                                        />
                                    </div>

                                    {#if error}
                                        <p
                                            class="flex items-center gap-2 text-sm text-error"
                                        >
                                            <AlertCircle
                                                class="w-4 h-4 shrink-0"
                                            />
                                            {error}
                                        </p>
                                    {/if}

                                    <button
                                        type="submit"
                                        disabled={!canSubmit}
                                        class="w-full flex items-center justify-center gap-2 py-3
                                               rounded-xl bg-primary text-primary-content font-medium
                                               hover:brightness-95 disabled:opacity-50
                                               disabled:cursor-not-allowed transition"
                                    >
                                        {#if isLoading}
                                            <Loader2
                                                class="w-5 h-5 animate-spin"
                                            />
                                            <span>Sending...</span>
                                        {:else}
                                            <span>Send magic link</span>
                                            <ArrowRight class="w-4 h-4" />
                                        {/if}
                                    </button>
                                </form>
                            {/if}
                        </div>
                    {:else}
                        <!-- OAuth Panel -->
                        <div
                            role="tabpanel"
                            class="space-y-3"
                            transition:fade={{ duration: 100 }}
                        >
                            <button
                                type="button"
                                disabled={isLoading}
                                onclick={signInWithGitHub}
                                class="w-full flex items-center justify-center gap-2 py-3
                                       rounded-xl bg-neutral text-neutral-content font-medium
                                       hover:brightness-95 disabled:opacity-50
                                       disabled:cursor-not-allowed transition"
                            >
                                {#if isLoading}
                                    <Loader2 class="w-5 h-5 animate-spin" />
                                {:else}
                                    <Github class="w-5 h-5" />
                                {/if}
                                <span>Continue with GitHub</span>
                            </button>

                            {#if error}
                                <p
                                    class="flex items-center gap-2 text-sm text-error"
                                >
                                    <AlertCircle class="w-4 h-4 shrink-0" />
                                    {error}
                                </p>
                            {/if}
                        </div>
                    {/if}
                {/if}
            </div>
        </div>
    </div>
{/if}
