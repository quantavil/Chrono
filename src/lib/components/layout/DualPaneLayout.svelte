<script lang="ts">
    import { fade } from "svelte/transition";
    import type { Snippet } from "svelte";

    interface Props {
        leftPane: Snippet;
        rightPane: Snippet;
        mobileContent: Snippet;
        class?: string;
    }

    let {
        leftPane,
        rightPane,
        mobileContent,
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
        border-r border-base-300/50
        scrollbar-hide
      "
        >
            <div class="max-w-2xl mx-auto px-6 xl:px-8 py-8">
                {@render leftPane()}
            </div>
        </div>

        <!-- Right Pane: Sticky Contextual Panel -->

        <div
            class="
        w-[400px] xl:w-[460px] 2xl:w-[520px]
        flex-shrink-0
        bg-base-100
        overflow-y-auto
        scrollbar-hide
      "
        >
            {@render rightPane()}
        </div>
    </div>
</div>
