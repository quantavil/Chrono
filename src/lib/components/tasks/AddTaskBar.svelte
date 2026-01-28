<!--
  Task entry bar component that enables quick task creation with natural language parsing.
-->
<script lang="ts">
  import { Plus, Calendar, Clock, Flag } from "lucide-svelte";
  import CustomDatePicker from "$lib/components/ui/CustomDatePicker.svelte";
  import { getTodoStore } from "$lib/context";
  import { TODO_TITLE_MAX_LENGTH, PRIORITY_CONFIG } from "$lib/types";
  import { fly, slide } from "svelte/transition";
  import { getDatePreset, formatDuration } from "$lib/utils/formatTime";
  import { parseTaskInput } from "$lib/utils/smartInput";
  import TaskInputEditor from "./TaskInputEditor.svelte";

  // -------------------------------------------------------------------------
  // Constants
  // -------------------------------------------------------------------------

  const PRIORITY_OPTIONS = ["high", "medium", "low", "none"] as const;
  const DUE_DATE_OPTIONS = ["today", "tomorrow", "week"] as const;

  const DUE_DATE_CONFIG = {
    today: { label: "Today", getValue: () => getDatePreset("today") },
    tomorrow: { label: "Tomorrow", getValue: () => getDatePreset("tomorrow") },
    week: { label: "Next Week", getValue: () => getDatePreset("week") },
  } as const;

  type Priority = (typeof PRIORITY_OPTIONS)[number];
  type DueDatePreset = (typeof DUE_DATE_OPTIONS)[number];

  // -------------------------------------------------------------------------
  // Props & State
  // -------------------------------------------------------------------------
  interface Props {
    class?: string;
    variant?: "inline" | "fixed";
  }

  let { variant = "inline", class: className = "" }: Props = $props();

  const todoList = getTodoStore();

  let inputValue = $state("");
  let inputRef = $state<TaskInputEditor | null>(null);
  let isFocused = $state(false);
  let isSubmitting = $state(false);
  let showQuickActions = $state(false);

  let selectedPriority = $state<Priority | null>("none");
  let selectedDueDate = $state<DueDatePreset | null>(null);
  let customDueDate = $state<string | null>(null);
  let selectedDuration = $state<number | null>(null);

  const canSubmit = $derived(inputValue.trim().length > 0);
  const isMobile = $derived(variant === "fixed");

  // Reactive parsing for UI feedback
  const parsed = $derived(parseTaskInput(inputValue));

  // Logic: Manual selection > Parsed in text > Default preference
  // We use this for the indicator icons.
  const effectiveDuration = $derived.by(() => {
    if (selectedDuration) return selectedDuration * 60 * 1000;
    if (parsed.estimatedTime) return parsed.estimatedTime;
    // Note: We don't show the default in the indicator to keep UI clean,
    // but we apply it on submit if needed.
    return null;
  });

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------
  function toggle<T>(current: T | null, value: T): T | null {
    return current === value ? null : value;
  }

  function getResolvedDueDate(): string | undefined {
    if (customDueDate) return customDueDate;
    if (selectedDueDate)
      return DUE_DATE_CONFIG[selectedDueDate].getValue().toISOString();
    return undefined;
  }

  function resetForm(): void {
    inputValue = "";
    selectedPriority = "none";
    selectedDueDate = null;
    customDueDate = null;
    showQuickActions = false;
    selectedDuration = null;
    inputRef?.focus();
  }

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------
  function handleSubmit(event?: Event): void {
    // Note: event is optional now as it can come from Tiptap custom event
    event?.preventDefault();
    const title = inputValue.trim();
    if (!title || isSubmitting) return;

    isSubmitting = true;
    try {
      // Use the reactive parsed state we already computed
      const finalTitle = parsed.title;
      const finalTags = parsed.tags;

      // Determination of duration to save
      // Manual (selectedDuration) > Parsed (parsed.estimatedTime) > Default
      let durationToSave = selectedDuration
        ? selectedDuration * 60 * 1000
        : parsed.estimatedTime;

      // Prevent adding task if title became empty after parsing (e.g. only tags were typed)
      if (!finalTitle && finalTags.length > 0) {
        return;
      }

      if (!finalTitle) return;

      todoList.add({
        title: finalTitle,
        priority: selectedPriority,
        due_at: getResolvedDueDate(),
        estimated_time: durationToSave ?? undefined,
        tags: finalTags.length > 0 ? finalTags : undefined,
      });
      resetForm();
    } finally {
      isSubmitting = false;
    }
  }

  function handleFocus(): void {
    isFocused = true;
    showQuickActions = true;
  }

  function handleFormBlur(event: FocusEvent): void {
    const form = (event.target as HTMLElement).closest("form");
    // blur logic for Tiptap might be slightly different as element is contenteditable div
    // We can rely on TaskInputEditor onblur prop
    // But keeping this for form-level focus checks if needed
    if (!form?.contains(event.relatedTarget as Node)) {
      isFocused = false;
      showQuickActions = false;
    }
  }

  $effect(() => {
    if (customDueDate) selectedDueDate = null;
  });
</script>

<!-- ======================================================================= -->
<!-- SHARED SNIPPETS -->
<!-- ======================================================================= -->

{#snippet taskInput()}
  <TaskInputEditor
    bind:this={inputRef}
    bind:value={inputValue}
    placeholder={isMobile ? "Add a task..." : "Add a new task... (⌘K)"}
    class="flex-1 min-w-0"
    inputClass="text-sm text-neutral py-2 {!isMobile
      ? 'sm:text-base sm:py-3'
      : ''}"
    onsubmit={() => handleSubmit()}
    oncancel={() => {
      showQuickActions = false;
      inputRef?.blur();
    }}
    onfocus={handleFocus}
    onblur={isMobile
      ? () => setTimeout(() => (isFocused = false), 200)
      : undefined}
  />
{/snippet}

{#snippet selectionIndicators()}
  {#if selectedPriority || selectedDueDate || customDueDate || effectiveDuration}
    <div class="flex items-center gap-1.5">
      {#if selectedPriority}
        <span
          class="w-2 h-2 rounded-full"
          class:bg-danger={selectedPriority === "high"}
          class:bg-warning={selectedPriority === "medium"}
          class:bg-info={selectedPriority === "low"}
        ></span>
      {/if}
      {#if selectedDueDate || customDueDate}
        <Calendar class="w-3.5 h-3.5 text-primary" />
      {/if}
      {#if effectiveDuration}
        <div class="flex items-center gap-1 text-xs text-secondary font-medium">
          <Clock class="w-3.5 h-3.5" />
          <span>{formatDuration(effectiveDuration)}</span>
        </div>
      {/if}
    </div>
  {/if}
{/snippet}

{#snippet submitBtn(compact = false)}
  <button
    type="submit"
    disabled={!canSubmit || isSubmitting}
    class="
      flex items-center justify-center gap-2 font-semibold text-sm transition-all
      {compact
      ? 'w-10 h-10 rounded-lg'
      : 'w-10 h-10 rounded-lg p-0 sm:w-auto sm:h-auto sm:px-5 sm:py-2.5 sm:rounded-xl'}
      {canSubmit
      ? 'bg-primary text-white shadow-primary hover:brightness-110 active:scale-[0.98]'
      : 'bg-base-200 text-neutral-muted'}
    "
  >
    <Plus
      class={compact ? "w-5 h-5" : "w-5 h-5 sm:w-4 sm:h-4"}
      strokeWidth={2.5}
    />
    {#if !compact}<span class="hidden sm:inline">Add</span>{/if}
  </button>
{/snippet}

{#snippet chipBase(
  isActive: boolean,
  compact: boolean,
  activeClass: string,
  onclick: () => void,
  children: import("svelte").Snippet,
)}
  <button
    type="button"
    class="
      flex items-center gap-1.5 font-medium border transition-all whitespace-nowrap
      {compact
      ? 'px-2.5 py-1 text-xs rounded-full'
      : 'px-3 py-2 text-xs font-semibold rounded-xl text-center'}
      {isActive
      ? activeClass
      : compact
        ? 'border-base-300 text-neutral-light hover:border-neutral-muted'
        : 'bg-base-200/50 border-transparent text-neutral/60 hover:bg-base-200 hover:text-neutral hover:border-base-300'}
    "
    {onclick}
  >
    {@render children()}
  </button>
{/snippet}

{#snippet priorityChips(compact = false)}
  {#each PRIORITY_OPTIONS as p (p)}
    {@const config = PRIORITY_CONFIG[p]}
    {@const isActive = selectedPriority === p}
    {@render chipBase(
      isActive,
      compact,
      `text-${config.color} bg-${config.color}/10 border-current shadow-sm`,
      () => (selectedPriority = toggle(selectedPriority, p)),
      chipContent,
    )}
    {#snippet chipContent()}
      {#if !compact}
        <div
          class="w-1.5 h-1.5 rounded-full {isActive
            ? 'bg-current'
            : 'bg-neutral/20'}"
        ></div>
      {:else}
        <Flag class="w-3 h-3" />
      {/if}
      {config.label}
    {/snippet}
  {/each}
{/snippet}

{#snippet dueDateChips(compact = false)}
  {#each DUE_DATE_OPTIONS as d (d)}
    {@const config = DUE_DATE_CONFIG[d]}
    {@const isActive = selectedDueDate === d}
    {@render chipBase(
      isActive,
      compact,
      "bg-primary/10 text-primary border-primary/30",
      () => {
        selectedDueDate = toggle(selectedDueDate, d);
        if (selectedDueDate) customDueDate = null;
      },
      chipContent,
    )}
    {#snippet chipContent()}
      {#if compact}<Calendar class="w-3 h-3" />{/if}
      {config.label}
    {/snippet}
  {/each}
{/snippet}

{#snippet quickActionsRow()}
  <div class="flex items-center gap-2 overflow-x-auto scrollbar-hide">
    {@render priorityChips(true)}
    <div class="w-px h-5 bg-base-300 flex-shrink-0"></div>
    {@render dueDateChips(true)}
  </div>
{/snippet}

{#snippet quickActionsPanel()}
  <div
    class="px-5 pb-5 pt-2 border-t border-base-200/50"
    transition:slide={{ duration: 300 }}
  >
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
      <!-- Priority & Duration -->
      <div class="space-y-6">
        <div class="space-y-3">
          <span
            class="text-[10px] font-bold text-neutral/40 uppercase tracking-[0.1em] px-1"
            >Priority Level</span
          >
          <div class="flex flex-wrap gap-2">
            {@render priorityChips(false)}
          </div>
        </div>
      </div>
      <!-- Timeline -->
      <div class="space-y-3">
        <span
          class="text-[10px] font-bold text-neutral/40 uppercase tracking-[0.1em] px-1"
          >Timeline</span
        >
        <div class="flex flex-wrap gap-2">
          {@render dueDateChips(false)}
        </div>
      </div>
    </div>
  </div>
{/snippet}

{#snippet iconButtons()}
  <div class="flex items-center gap-1">
    <button
      type="button"
      class="p-1.5 rounded-lg transition-colors {selectedPriority
        ? `text-${PRIORITY_CONFIG[selectedPriority].color} bg-${PRIORITY_CONFIG[selectedPriority].color}/10`
        : 'text-neutral-muted hover:bg-base-200'}"
      onclick={() => (showQuickActions = !showQuickActions)}
      title="Set priority"
    >
      <Flag class="w-4 h-4" />
    </button>

    <CustomDatePicker bind:value={customDueDate} class="!w-auto">
      {#snippet trigger()}
        <button
          type="button"
          title="Set due date"
          class="p-1.5 rounded-lg transition-colors {selectedDueDate ||
          customDueDate
            ? 'text-primary bg-primary-muted'
            : 'text-neutral-muted hover:bg-base-200'}"
        >
          <Calendar class="w-4 h-4" />
        </button>
      {/snippet}
    </CustomDatePicker>
  </div>
{/snippet}

<!-- ======================================================================= -->
<!-- RENDER VARIANTS -->
<!-- ======================================================================= -->

{#if variant === "fixed"}
  <!-- MOBILE FIXED -->
  <div
    class="fixed bottom-0 left-0 right-0 z-50 lg:hidden {className}"
    in:fly={{ y: 100, duration: 400 }}
  >
    <div class="bg-base-100 border-t border-base-300 shadow-lg">
      {#if showQuickActions && isFocused}
        <div
          class="px-4 py-2 border-b border-base-200"
          transition:fly={{ y: 20, duration: 200 }}
        >
          {@render quickActionsRow()}
        </div>
      {/if}

      <div class="px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <form
          onsubmit={handleSubmit}
          class="flex items-center gap-2 bg-base-200 rounded-xl p-1.5 pl-4 ring-2 transition-all duration-200
            {isFocused ? 'ring-primary bg-base-100' : 'ring-transparent'}"
        >
          {@render taskInput()}
          {@render selectionIndicators()}
          {@render submitBtn(true)}
        </form>
      </div>
    </div>
  </div>
{:else}
  <!-- DESKTOP INLINE -->
  <div class="w-full {className}">
    <form
      onsubmit={handleSubmit}
      onfocusout={handleFormBlur}
      class="relative bg-base-100 rounded-2xl shadow-sm border border-base-300/50 transition-all duration-300
        {isFocused ? 'shadow-md border-primary/30' : 'hover:shadow-md'}"
    >
      <div class="flex items-center gap-3 p-2 pl-5">
        {@render taskInput()}
        {@render iconButtons()}
        {@render submitBtn(false)}
      </div>

      {#if showQuickActions}
        {@render quickActionsPanel()}
      {/if}
    </form>
  </div>
{/if}
