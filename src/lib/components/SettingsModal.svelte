<script lang="ts">
    import { fade, fly } from "svelte/transition";
    import { X, Clock, Save, Check } from "lucide-svelte";
    import { todoList } from "$lib/stores/todo.svelte";
    import { onMount } from "svelte";

    import { uiStore } from "$lib/stores/ui.svelte";

    interface Props {
        isOpen: boolean;
    }

    let { isOpen = $bindable(false) }: Props = $props();

    const isMobile = $derived(uiStore.isMobile);
    let selectedDuration = $state(todoList.preferences.defaultTaskDurationMs);
    let durationMinutes = $state(0);

    // Sync durationMinutes when selectedDuration changes (e.g. via presets)
    $effect(() => {
        durationMinutes = Math.round(selectedDuration / 60000);
    });

    let isSaving = $state(false);
    let showSavedFeedback = $state(false);

    const durations = [
        { label: "30m", value: 30 * 60 * 1000 },
        { label: "1h", value: 60 * 60 * 1000 },
        { label: "1.5h", value: 90 * 60 * 1000 },
        { label: "2h", value: 120 * 60 * 1000 },
    ];

    function close() {
        isOpen = false;
    }

    async function handleSave() {
        isSaving = true;
        todoList.updatePreference("defaultTaskDurationMs", selectedDuration);

        setTimeout(() => {
            isSaving = false;
            showSavedFeedback = true;
            setTimeout(() => {
                showSavedFeedback = false;
                close();
            }, 1000);
        }, 500);
    }

    function getTransitionParams() {
        if (isMobile) {
            return { y: 300, duration: 300, opacity: 1 };
        }
        return { scale: 0.95, duration: 200, opacity: 0 };
    }
</script>

{#if isOpen}
    <!-- Backdrop -->
    <div
        class="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm transition-opacity"
        transition:fade={{ duration: 200 }}
        onclick={close}
        onkeydown={(e) => e.key === "Escape" && close()}
        role="button"
        tabindex="0"
        aria-label="Close settings"
    ></div>

    <!-- Modal Container -->
    <div
        class="
            fixed z-[70]
            {isMobile
            ? 'inset-x-0 bottom-0 rounded-t-3xl'
            : 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] rounded-3xl'}
            bg-base-100 shadow-2xl overflow-hidden
        "
        transition:fly={getTransitionParams()}
        role="dialog"
        aria-modal="true"
    >
        <!-- Header -->
        <div
            class="flex items-center justify-between p-6 border-b border-base-200"
        >
            <div class="flex items-center gap-3">
                <div class="p-2 bg-primary/10 rounded-xl text-primary">
                    <Clock class="w-5 h-5" />
                </div>
                <h2 class="text-xl font-bold text-neutral">Settings</h2>
            </div>
            <button
                onclick={close}
                class="p-2 hover:bg-base-200 rounded-xl transition-colors text-neutral/40 hover:text-neutral"
            >
                <X class="w-5 h-5" />
            </button>
        </div>

        <!-- Content -->
        <div class="p-6 space-y-8">
            <section class="space-y-4">
                <div class="space-y-1">
                    <h3 class="text-sm font-semibold text-neutral">
                        Default Time Estimate
                    </h3>
                    <p class="text-xs text-neutral/50">
                        New tasks will be initialized with this duration.
                    </p>
                </div>

                <div class="grid grid-cols-2 gap-3">
                    {#each durations as { label, value }}
                        <button
                            type="button"
                            class="
                                py-3 px-4 rounded-2xl text-sm font-medium transition-all
                                {selectedDuration === value
                                ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]'
                                : 'bg-base-200 text-neutral/60 hover:bg-base-300'}
                            "
                            onclick={() => {
                                selectedDuration = value;
                                durationMinutes = Math.round(value / 60000);
                            }}
                        >
                            {label}
                        </button>
                    {/each}
                </div>

                <!-- Custom input -->
                <div class="space-y-2 pt-2">
                    <div
                        class="flex justify-between text-xs font-medium text-neutral/60"
                    >
                        <span>Custom Estimate (minutes)</span>
                        <span>{durationMinutes}m</span>
                    </div>
                    <input
                        type="range"
                        min="5"
                        max="480"
                        step="5"
                        bind:value={durationMinutes}
                        oninput={() =>
                            (selectedDuration = durationMinutes * 60 * 1000)}
                        class="w-full h-2 bg-base-200 rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                </div>
            </section>
        </div>

        <!-- Footer -->
        <div class="p-6 bg-base-200/50 flex gap-3">
            <button
                onclick={close}
                class="flex-1 py-3 px-4 rounded-2xl font-semibold text-neutral/60 hover:bg-base-300 transition-colors"
            >
                Cancel
            </button>
            <button
                onclick={handleSave}
                disabled={isSaving || showSavedFeedback}
                class="
                    flex-[2] py-3 px-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all
                    {showSavedFeedback
                    ? 'bg-success text-white'
                    : 'bg-primary text-white hover:opacity-90 shadow-lg shadow-primary/20'}
                "
            >
                {#if showSavedFeedback}
                    <Check class="w-4 h-4" />
                    Saved!
                {:else if isSaving}
                    <div
                        class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
                    ></div>
                    Saving...
                {:else}
                    <Save class="w-4 h-4" />
                    Save Changes
                {/if}
            </button>
        </div>
    </div>
{/if}

<style>
    /* Range input styling */
    input[type="range"]::-webkit-slider-thumb {
        appearance: none;
        width: 18px;
        height: 18px;
        background: white;
        border: 2px solid var(--color-primary);
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
</style>
