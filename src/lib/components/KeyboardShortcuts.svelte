<script lang="ts">
    import { fade, scale } from "svelte/transition";
    import { X, Keyboard } from "lucide-svelte";

    interface Props {
        isOpen: boolean;
    }

    let { isOpen = $bindable(false) }: Props = $props();

    const shortcuts = [
        { keys: ["⌘", "K"], action: "Focus add task" },
        { keys: ["⌘", "/"], action: "Show shortcuts" },
        { keys: ["⌘", "F"], action: "Search tasks" },
        { keys: ["Esc"], action: "Close modal / Clear" },
        { keys: ["Enter"], action: "Add task / Save" },
        { keys: ["Space"], action: "Toggle timer (when focused)" },
        { keys: ["Delete"], action: "Delete task (when focused)" },
        { keys: ["↑", "↓"], action: "Navigate tasks" },
    ];
</script>

{#if isOpen}
    <div
        class="fixed inset-0 z-50 bg-neutral/40 backdrop-blur-sm flex items-center justify-center p-4"
        transition:fade={{ duration: 150 }}
        onclick={() => (isOpen = false)}
        onkeydown={(e) => e.key === "Escape" && (isOpen = false)}
        role="dialog"
        tabindex="-1"
    >
        <div
            class="bg-base-100 rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
            transition:scale={{ duration: 200, start: 0.95 }}
            onclick={(e) => e.stopPropagation()}
            role="document"
        >
            <div
                class="flex items-center justify-between p-5 border-b border-base-300"
            >
                <div class="flex items-center gap-3">
                    <Keyboard class="w-5 h-5 text-primary" />
                    <h2 class="text-lg font-bold">Keyboard Shortcuts</h2>
                </div>
                <button
                    class="p-2 rounded-lg hover:bg-base-200"
                    onclick={() => (isOpen = false)}
                >
                    <X class="w-5 h-5" />
                </button>
            </div>

            <div class="p-5 space-y-3">
                {#each shortcuts as { keys, action }}
                    <div class="flex items-center justify-between">
                        <span class="text-sm text-neutral-light">{action}</span>
                        <div class="flex items-center gap-1">
                            {#each keys as key}
                                <kbd
                                    class="
                  px-2 py-1 rounded-md
                  bg-base-200 border border-base-300
                  text-xs font-mono font-medium
                  shadow-sm
                ">{key}</kbd
                                >
                            {/each}
                        </div>
                    </div>
                {/each}
            </div>
        </div>
    </div>
{/if}
