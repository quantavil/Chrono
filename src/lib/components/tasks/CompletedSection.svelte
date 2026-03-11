<!--
  Collapsible layout section for displaying and managing completed tasks.
-->
<script lang="ts">
  /**
   * CompletedSection Component
   * Collapsible section displaying completed todos with bulk actions
   */

  import {
    ChevronDown,
    Trash2,
    CheckCircle2,
    Clock,
    CheckSquare,
  } from "lucide-svelte";
  import { flip } from "svelte/animate";
  import { slide, fade } from "svelte/transition";
  import { quintOut } from "svelte/easing";
  import { ChevronRight } from "lucide-svelte";
  import { getTodoStore } from "$lib/context";
  import TaskItem from "./TaskItem.svelte";
  import { formatRelativeDate, formatTimeCompact } from "$lib/utils/formatTime";

  // -------------------------------------------------------------------------
  // Props
  // -------------------------------------------------------------------------

  interface Props {
    class?: string;
  }

  let { class: className = "" }: Props = $props();

  // -------------------------------------------------------------------------
  // Local State
  // -------------------------------------------------------------------------

  let isExpanded = $state(false);
  let showClearConfirm = $state(false);

  // -------------------------------------------------------------------------
  // Derived State
  // -------------------------------------------------------------------------
  const todoList = getTodoStore();

  const completedTodos = $derived(todoList.completedTodos);
  const hasCompleted = $derived(completedTodos.length > 0);
  const completedCount = $derived(completedTodos.length);
  const totalCompletedTime = $derived(
    completedTodos.reduce((sum, t) => sum + t.currentTimeMs, 0),
  );

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  function toggleExpanded(): void {
    isExpanded = !isExpanded;
    if (!isExpanded) {
      showClearConfirm = false;
    }
  }

  function handleUncomplete(id: string): void {
    todoList.toggleComplete(id);
  }

  function handleDelete(id: string): void {
    todoList.remove(id);
  }

  function handleClearAll(): void {
    if (showClearConfirm) {
      todoList.clearCompleted();
      showClearConfirm = false;
      isExpanded = false;
    } else {
      showClearConfirm = true;
      // Auto-hide confirm after 3 seconds
      setTimeout(() => {
        showClearConfirm = false;
      }, 3000);
    }
  }

  function cancelClear(): void {
    showClearConfirm = false;
  }
</script>

{#if hasCompleted}
  <section class="w-full {className}" aria-label="Completed tasks">
    <!-- Header / Toggle Button -->
    <button
      type="button"
      class="
        w-full flex items-center justify-between
        px-4 py-3 rounded-2xl
        bg-base-100/50 hover:bg-base-100
        border border-base-300/50
        transition-all duration-200
        group
      "
      onclick={toggleExpanded}
      aria-expanded={isExpanded}
      aria-controls="completed-list"
    >
      <div class="flex items-center gap-3">
        <!-- Icon -->
        <div
          class="
            w-8 h-8 rounded-xl
            bg-accent/10 text-accent
            flex items-center justify-center
          "
        >
          <CheckCircle2 class="w-4 h-4" strokeWidth={2.5} />
        </div>

        <!-- Title & Count -->
        <div class="text-left">
          <span class="text-sm font-semibold text-neutral"> Completed </span>
          <span
            class="
              ml-2 px-2 py-0.5
              rounded-full bg-accent/10
              text-xs font-bold text-accent tabular-nums
            "
          >
            {completedCount}
          </span>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <!-- Total Time -->
        {#if totalCompletedTime > 0}
          <div
            class="
              hidden sm:flex items-center gap-1.5
              text-xs text-neutral/40 font-mono tabular-nums
            "
          >
            <Clock class="w-3 h-3" strokeWidth={2} />
            {formatTimeCompact(totalCompletedTime)}
          </div>
        {/if}

        <!-- Chevron -->
        <div
          class="
            w-6 h-6 rounded-lg
            flex items-center justify-center
            text-neutral/40 group-hover:text-neutral/60
            transition-transform duration-200
            {isExpanded ? 'rotate-180' : ''}
          "
        >
          <ChevronDown class="w-4 h-4" strokeWidth={2.5} />
        </div>
      </div>
    </button>

    <!-- Expanded Content -->
    {#if isExpanded}
      <div
        id="completed-list"
        class="mt-3"
        transition:slide={{ duration: 250, easing: quintOut }}
      >
        <!-- Bulk Actions -->
        <div
          class="
            flex items-center justify-between
            px-4 py-2 mb-3
            rounded-xl bg-base-200/30
          "
        >
          <span class="text-xs text-neutral/50 font-medium">
            {completedCount}
            {completedCount === 1 ? "task" : "tasks"} completed
          </span>

          {#if showClearConfirm}
            <div class="flex items-center gap-2" in:fade={{ duration: 150 }}>
              <span class="text-xs text-red-400 font-medium"> Clear all? </span>
              <button
                type="button"
                class="
                  px-3 py-1 rounded-lg
                  text-xs font-semibold
                  bg-red-500 text-white
                  hover:bg-red-600
                  active:scale-95
                  transition-all
                "
                onclick={handleClearAll}
              >
                Yes
              </button>
              <button
                type="button"
                class="
                  px-3 py-1 rounded-lg
                  text-xs font-semibold
                  bg-base-300 text-neutral/70
                  hover:bg-base-400
                  active:scale-95
                  transition-all
                "
                onclick={cancelClear}
              >
                No
              </button>
            </div>
          {:else}
            <button
              type="button"
              class="
                flex items-center gap-1.5
                px-3 py-1.5 rounded-lg
                text-xs font-medium
                text-neutral/50 hover:text-red-400
                hover:bg-red-50 dark:hover:bg-red-900/20
                transition-colors
              "
              onclick={handleClearAll}
            >
              <Trash2 class="w-3 h-3" strokeWidth={2.5} />
              Clear all
            </button>
          {/if}
        </div>

        <!-- Completed Items List -->
        <div class="flex flex-col gap-2" role="list">
          {#each completedTodos as todo (todo.id)}
            <div
              animate:flip={{ duration: 200, easing: quintOut }}
              class="
                group flex items-center gap-3
                px-4 py-3 rounded-2xl
                bg-base-100/30 hover:bg-base-100/60
                border border-base-300/30
                transition-all duration-200
              "
              role="listitem"
            >
              <!-- Completed Checkbox (Interactive) -->
              <button
                type="button"
                class="
                  w-5 h-5 rounded-lg
                  bg-accent border-2 border-accent text-white
                  flex items-center justify-center
                  flex-shrink-0 hover:bg-accent-dark hover:border-accent-dark
                  transition-all active:scale-90
                "
                onclick={(e) => {
                  e.stopPropagation();
                  handleUncomplete(todo.id);
                }}
                aria-label="Restore task"
                title="Restore task"
              >
                <CheckCircle2 class="w-3.5 h-3.5" strokeWidth={3} />
              </button>

              <!-- Title -->
              <span
                class="
                  flex-1 text-sm text-neutral/50
                  line-through truncate
                "
              >
                {todo.title}
              </span>

              <!-- Time -->
              {#if todo.currentTimeMs > 0}
                <span
                  class="
                    text-xs font-mono tabular-nums text-neutral/30
                    flex-shrink-0
                  "
                >
                  {todo.timerDisplay.formatted}
                </span>
              {/if}

              <!-- Actions (show on hover) -->
              <div
                class="
                  flex items-center gap-1
                  opacity-0 group-hover:opacity-100
                  transition-opacity duration-200
                "
              >
                <!-- Delete -->
                <button
                  type="button"
                  class="
                    w-7 h-7 rounded-lg
                    flex items-center justify-center
                    text-neutral/30 hover:text-red-400
                    hover:bg-red-50 dark:hover:bg-red-900/20
                    transition-colors
                  "
                  onclick={() => handleDelete(todo.id)}
                  aria-label="Delete task"
                  title="Delete permanently"
                >
                  <Trash2 class="w-3.5 h-3.5" strokeWidth={2.5} />
                </button>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </section>
{/if}
