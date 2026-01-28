<script lang="ts">
    import { fade, slide } from "svelte/transition";
    import { uiStore } from "$lib/stores/ui.svelte";
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
        <!-- Drawer Overlay -->
        {#if uiStore.isMobileSidebarOpen}
            <div
                class="fixed inset-0 z-[60] flex"
                transition:fade={{ duration: 200 }}
            >
                <button
                    type="button"
                    class="fixed inset-0 bg-black/50 backdrop-blur-sm w-full h-full border-none cursor-default"
                    onclick={() => (uiStore.isMobileSidebarOpen = false)}
                    aria-label="Close menu"
                ></button>

                <div
                    class="relative w-[280px] h-full bg-base-100 shadow-2xl flex flex-col"
                    transition:slide={{ axis: "x", duration: 300 }}
                >
                    <Sidebar class="w-full h-full border-none" />
                </div>
            </div>
        {/if}

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
