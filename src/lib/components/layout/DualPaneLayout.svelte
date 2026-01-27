<script lang="ts">
    import { fade } from "svelte/transition";
    import type { Snippet } from "svelte";

    interface Props {
        leftPane: Snippet;
        rightPane: Snippet;
        mobileContent: Snippet;
        isRightPaneOpen?: boolean;
        class?: string;
    }

    let {
        leftPane,
        rightPane,
        mobileContent,
        isRightPaneOpen = true,
        class: className = "",
    }: Props = $props();
</script>

<div class="min-h-screen min-h-dvh bg-base-200 {className}">
    <!-- Mobile Layout (< lg) -->
    <div class="lg:hidden">
        {@render mobileContent()}
    </div>

    <!-- Desktop Dual-Pane Layout (≥ lg) -->
    <div class="hidden lg:flex h-screen">
        <!-- Left Pane: Scrollable Task List -->
        <div
            class="
        flex-1 overflow-y-auto
        {isRightPaneOpen ? 'border-r border-base-300/50' : ''}
        scrollbar-hide
        transition-all duration-300 ease-in-out
      "
        >
            <div
                class="
            mx-auto px-6 xl:px-8 py-8
            transition-all duration-300 ease-in-out
            max-w-4xl
        "
            >
                {@render leftPane()}
            </div>
        </div>

        <!-- Right Pane: Sticky Contextual Panel -->
        {#if isRightPaneOpen}
            <div
                class="
            w-[400px] xl:w-[480px] 2xl:w-[560px]
            flex-shrink-0
            bg-base-100
            overflow-y-auto
            scrollbar-hide
            border-l border-base-200
            transition-all duration-300 ease-in-out
          "
                transition:fade={{ duration: 200 }}
            >
                {@render rightPane()}
            </div>
        {/if}
    </div>
</div>
