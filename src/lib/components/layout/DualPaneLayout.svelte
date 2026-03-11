<!--
  Primary application layout manager that handles responsive display of task list and details in a dual-pane setup.
-->
<script lang="ts">
    import { fade, slide, fly } from "svelte/transition";
    import { uiStore } from "$lib/stores/ui.svelte";
    import type { Snippet } from "svelte";
    import Sidebar from "$lib/components/layout/Sidebar.svelte";

    interface Props {
        listPane: Snippet;
        detailPane: Snippet;
        isRightPaneOpen?: boolean; // Desktop Split State
        mobileShowDetail?: boolean; // Mobile/Tablet Full Page State
        class?: string;
    }

    let {
        listPane,
        detailPane,
        isRightPaneOpen = true,
        mobileShowDetail = false,
        class: className = "",
    }: Props = $props();
</script>

<div class="flex h-screen h-[100dvh] overflow-hidden bg-base-200 {className}">
    <!-- 1. SIDEBAR -->
    <!-- Desktop Mode (>=960px): Always visible -->
    <!-- 1. SIDEBAR -->
    <!-- Desktop: Always visible -->
    <div class="hidden lg:block flex-shrink-0 z-20 h-full">
        <Sidebar class="h-full border-r border-base-300/50" />
    </div>

    <!-- Mobile/Tablet: Off-canvas Overlay -->
    {#if uiStore.isMobileSidebarOpen}
        <div
            class="fixed inset-0 z-[60] flex lg:hidden"
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

    <!-- 2. MAIN CONTENT AREA -->
    <div class="flex-1 flex min-w-0 relative h-full">
        <!-- LIST PANE -->
        <!-- 
             Desktop: Always visible (flex-1)
             Mobile: Visible ONLY if detail is NOT showing (or if we want to keep it in DOM for state? usually cleaner to hide)
             Strategy: Use CSS logic. 
             If mobileShowDetail is true, hide list on mobile.
        -->
        <div
            class="
                flex-1 flex flex-col h-full overflow-hidden
                transition-all duration-300 ease-in-out
                {mobileShowDetail ? 'hidden lg:flex' : 'flex'}
                {isRightPaneOpen ? 'lg:border-r lg:border-base-300/50' : ''}
            "
        >
            <div class="flex-1 overflow-y-auto scrollbar-hide">
                <div class="mx-auto h-full">
                    {@render listPane()}
                </div>
            </div>
        </div>

        <!-- DETAIL PANE -->
        <!-- 
             Desktop: Visible if isRightPaneOpen (Static Column)
             Mobile: Visible if mobileShowDetail (Absolute Overlay or Flex Swap)
             Unified: 
                - On Mobile: Absolute Inset-0 (covers list)
                - On Desktop: Relative static width
        -->
        {#if mobileShowDetail || isRightPaneOpen}
            <div
                class="
                    /* Mobile/Tablet Styles (< lg) */
                    fixed inset-0 z-50 lg:static lg:z-auto
                    w-full h-full lg:h-auto lg:w-auto
                    bg-base-100 lg:bg-transparent

                    /* Desktop Styles (>= lg) */
                    lg:flex-shrink-0
                    lg:w-[400px] xl:w-[480px] 2xl:w-[560px]
                    lg:border-l lg:border-base-200
                    lg:shadow-xl lg:shadow-base-300/20

                    /* Common */
                    overflow-y-auto scrollbar-hide
                    transition-all duration-300 ease-in-out
                    
                    /* Visibility check for Desktop specifically (if we wanted to close it physically) */
                    {isRightPaneOpen ? 'lg:block' : 'lg:hidden'}
                    /* Visibility check for Mobile specifically */
                    {mobileShowDetail ? 'block' : 'hidden lg:block'}
                "
                in:fly={uiStore.isMobile
                    ? { x: "100%", duration: 300 }
                    : { duration: 0 }}
                out:fly={uiStore.isMobile
                    ? { x: "100%", duration: 300 }
                    : { duration: 0 }}
            >
                {@render detailPane()}
            </div>
        {/if}
    </div>
</div>
