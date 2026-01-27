<script lang="ts">
    import { fade } from "svelte/transition";
    import type { Snippet } from "svelte";
    import Sidebar from "$lib/components/layout/Sidebar.svelte";

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
    <div class="lg:hidden text-neutral">
        {@render mobileContent()}
    </div>

    <!-- Desktop Dual-Pane Layout (≥ lg) -->
    <div class="hidden lg:flex h-screen text-neutral">
        <!-- Sidebar Navigation -->
        <Sidebar class="flex-shrink-0 z-20" />

        <!-- Main Content Area -->
        <div class="flex-1 flex min-w-0">
            <!-- Middle Pane: Task List -->
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
                         mx-auto
                        transition-all duration-300 ease-in-out
                    "
                >
                    {@render leftPane()}
                </div>
            </div>

            <!-- Right Pane: Contextual Panel -->
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
                        z-10 shadow-xl shadow-base-300/20
                    "
                    transition:fade={{ duration: 200 }}
                >
                    {@render rightPane()}
                </div>
            {/if}
        </div>
    </div>
</div>
