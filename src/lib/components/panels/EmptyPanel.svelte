<!--
  Placeholder component displayed in the detail pane when no task is selected.
-->
<script lang="ts">
    import {
        MousePointerClick,
        FileText,
        CheckSquare,
        Sparkles,
        ArrowLeft,
    } from "lucide-svelte";
    import { fade, fly } from "svelte/transition";
    import { quintOut } from "svelte/easing";

    interface Props {
        class?: string;
    }

    let { class: className = "" }: Props = $props();
</script>

<div
    class="
    h-full flex flex-col items-center justify-center
    p-8 text-center
    bg-gradient-to-b from-base-100 to-base-200/50
    {className}
  "
>
    <!-- Illustration -->
    <div
        class="relative mb-8"
        in:fly={{ y: 20, duration: 400, easing: quintOut }}
    >
        <!-- Background circles -->
        <div class="absolute inset-0 -m-8">
            <div
                class="absolute top-0 left-0 w-16 h-16 rounded-full bg-primary/5 animate-pulse"
            ></div>
            <div
                class="absolute bottom-0 right-0 w-12 h-12 rounded-full bg-secondary/5 animate-pulse"
                style="animation-delay: 0.5s"
            ></div>
        </div>

        <!-- Main icon container -->
        <div
            class="
        relative w-24 h-24 rounded-3xl
        bg-gradient-to-br from-base-200 to-base-300
        flex items-center justify-center
        shadow-lg
      "
        >
            <MousePointerClick
                class="w-10 h-10 text-neutral/30"
                strokeWidth={1.5}
            />

            <!-- Decorative elements -->
            <div
                class="absolute -top-2 -right-2 w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center"
            >
                <FileText class="w-3 h-3 text-primary" />
            </div>
            <div
                class="absolute -bottom-2 -left-2 w-6 h-6 rounded-lg bg-accent/10 flex items-center justify-center"
            >
                <CheckSquare class="w-3 h-3 text-accent" />
            </div>
        </div>
    </div>

    <!-- Text -->
    <div in:fly={{ y: 20, duration: 400, delay: 100, easing: quintOut }}>
        <h3 class="text-lg font-bold text-neutral mb-2">Select a task</h3>
        <p class="text-sm text-neutral/50 max-w-[240px] leading-relaxed">
            Click on any task to view details, add notes, and manage subtasks
        </p>
    </div>

    <!-- Features hint -->
    <div
        class="mt-10 space-y-3 w-full max-w-[260px]"
        in:fly={{ y: 20, duration: 400, delay: 200, easing: quintOut }}
    >
        <div
            class="flex items-center gap-3 p-3 rounded-xl bg-base-200/50 text-left"
        >
            <div
                class="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0"
            >
                <FileText class="w-4 h-4 text-primary" />
            </div>
            <div>
                <p class="text-sm font-medium text-neutral">Markdown Notes</p>
                <p class="text-xs text-neutral/40">Rich text with formatting</p>
            </div>
        </div>

        <div
            class="flex items-center gap-3 p-3 rounded-xl bg-base-200/50 text-left"
        >
            <div
                class="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0"
            >
                <CheckSquare class="w-4 h-4 text-accent" />
            </div>
            <div>
                <p class="text-sm font-medium text-neutral">Subtasks</p>
                <p class="text-xs text-neutral/40">Break down complex tasks</p>
            </div>
        </div>
    </div>

    <!-- Arrow hint -->
    <div
        class="mt-10 flex items-center gap-2 text-neutral/30"
        in:fade={{ duration: 400, delay: 400 }}
    >
        <ArrowLeft class="w-4 h-4" />
        <span class="text-xs font-medium">Select from the list</span>
    </div>
</div>
