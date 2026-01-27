<script lang="ts">
  import { Plus, Calendar, Flag, X, ChevronDown } from "lucide-svelte";
  import { todoList } from "$lib/stores/todo.svelte";
  import { TODO_TITLE_MAX_LENGTH } from "$lib/types";
  import { fly, fade, scale, slide } from "svelte/transition";

  interface Props {
    class?: string;
    variant?: "inline" | "fixed";
  }

  let { class: className = "", variant = "inline" }: Props = $props();

  let inputValue = $state("");
  let inputRef = $state<HTMLInputElement | null>(null);
  let isFocused = $state(false);
  let isSubmitting = $state(false);

  // Quick action states
  let showQuickActions = $state(false);
  let selectedPriority = $state<"high" | "medium" | "low" | null>(null);
  let selectedDueDate = $state<"today" | "tomorrow" | "week" | null>(null);

  const canSubmit = $derived(inputValue.trim().length > 0);

  const priorityConfig = {
    high: { label: "High", color: "text-danger", bg: "bg-danger/10" },
    medium: { label: "Medium", color: "text-warning", bg: "bg-warning/10" },
    low: { label: "Low", color: "text-info", bg: "bg-info/10" },
  };

  const dueDateConfig = {
    today: { label: "Today", value: () => new Date() },
    tomorrow: {
      label: "Tomorrow",
      value: () => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        return d;
      },
    },
    week: {
      label: "Next Week",
      value: () => {
        const d = new Date();
        d.setDate(d.getDate() + 7);
        return d;
      },
    },
  };

  function handleSubmit(event?: Event): void {
    event?.preventDefault();

    const title = inputValue.trim();
    if (!title || isSubmitting) return;

    isSubmitting = true;

    try {
      todoList.add({
        title,
        priority: selectedPriority,
        due_at: selectedDueDate
          ? dueDateConfig[selectedDueDate].value().toISOString()
          : undefined,
      });

      // Reset
      inputValue = "";
      selectedPriority = null;
      selectedDueDate = null;
      showQuickActions = false;
      inputRef?.focus();
    } finally {
      isSubmitting = false;
    }
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
    if (event.key === "Escape") {
      showQuickActions = false;
      inputRef?.blur();
    }
  }

  function togglePriority(p: "high" | "medium" | "low") {
    selectedPriority = selectedPriority === p ? null : p;
  }

  function toggleDueDate(d: "today" | "tomorrow" | "week") {
    selectedDueDate = selectedDueDate === d ? null : d;
  }

  function handleFocus() {
    isFocused = true;
    showQuickActions = true;
  }
</script>

{#if variant === "fixed"}
  <!-- Mobile Fixed Bottom Bar -->
  <div
    class="fixed bottom-0 left-0 right-0 z-50 md:hidden {className}"
    in:fly={{ y: 100, duration: 400 }}
  >
    <div class="bg-base-100 border-t border-base-300 shadow-lg">
      <!-- Quick Actions Row -->
      {#if showQuickActions && isFocused}
        <div
          class="px-4 py-2 flex items-center gap-2 border-b border-base-200 overflow-x-auto scrollbar-hide"
          transition:fly={{ y: 20, duration: 200 }}
        >
          <!-- Priority -->
          {#each ["high", "medium", "low"] as p}
            {@const config = priorityConfig[p as keyof typeof priorityConfig]}
            <button
              type="button"
              class="
                flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                border transition-all whitespace-nowrap
                {selectedPriority === p
                ? `${config.bg} ${config.color} border-current`
                : 'border-base-300 text-neutral-light hover:border-neutral-muted'}
              "
              onclick={() => togglePriority(p as "high" | "medium" | "low")}
            >
              <Flag class="w-3 h-3" />
              {config.label}
            </button>
          {/each}

          <div class="w-px h-5 bg-base-300"></div>

          <!-- Due Date -->
          {#each ["today", "tomorrow", "week"] as d}
            {@const config = dueDateConfig[d as keyof typeof dueDateConfig]}
            <button
              type="button"
              class="
                flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                border transition-all whitespace-nowrap
                {selectedDueDate === d
                ? 'bg-primary-muted text-primary border-primary'
                : 'border-base-300 text-neutral-light hover:border-neutral-muted'}
              "
              onclick={() => toggleDueDate(d as "today" | "tomorrow" | "week")}
            >
              <Calendar class="w-3 h-3" />
              {config.label}
            </button>
          {/each}
        </div>
      {/if}

      <div class="px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <form
          onsubmit={handleSubmit}
          class="
            flex items-center gap-2
            bg-base-200 rounded-xl
            p-1.5 pl-4
            ring-2 transition-all duration-200
            {isFocused ? 'ring-primary bg-base-100' : 'ring-transparent'}
          "
        >
          <input
            bind:this={inputRef}
            bind:value={inputValue}
            type="text"
            placeholder="Add a task..."
            class="flex-1 bg-transparent outline-none text-sm text-neutral py-2"
            maxlength={TODO_TITLE_MAX_LENGTH}
            onkeydown={handleKeydown}
            onfocus={handleFocus}
            onblur={() =>
              setTimeout(() => {
                isFocused = false;
              }, 200)}
            autocomplete="off"
            enterkeyhint="done"
          />

          <!-- Active Selections Preview -->
          {#if selectedPriority || selectedDueDate}
            <div class="flex items-center gap-1">
              {#if selectedPriority}
                <span
                  class="w-2 h-2 rounded-full {selectedPriority === 'high'
                    ? 'bg-danger'
                    : selectedPriority === 'medium'
                      ? 'bg-warning'
                      : 'bg-info'}"
                ></span>
              {/if}
              {#if selectedDueDate}
                <Calendar class="w-3.5 h-3.5 text-primary" />
              {/if}
            </div>
          {/if}

          <button
            type="submit"
            disabled={!canSubmit || isSubmitting}
            class="
              w-10 h-10 rounded-lg
              flex items-center justify-center
              transition-all
              {canSubmit
              ? 'bg-primary text-white shadow-primary active:scale-95'
              : 'bg-base-300 text-neutral-muted'}
            "
          >
            <Plus class="w-5 h-5" strokeWidth={2.5} />
          </button>
        </form>
      </div>
    </div>
  </div>
{:else}
  <!-- Desktop Inline - Similar pattern with expanded quick actions -->
  <div class="hidden md:block w-full {className}">
    <form
      onsubmit={handleSubmit}
      onfocusout={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          isFocused = false;
          showQuickActions = false;
        }
      }}
      class="
        relative bg-base-100 rounded-2xl
        shadow-sm border border-base-300/50
        transition-all duration-300
        {isFocused ? 'shadow-md border-primary/30' : 'hover:shadow-md'}
      "
    >
      <div class="flex items-center gap-3 p-2 pl-5">
        <input
          bind:this={inputRef}
          bind:value={inputValue}
          type="text"
          placeholder="Add a new task... (⌘K)"
          class="flex-1 bg-transparent outline-none text-base text-neutral py-3"
          maxlength={TODO_TITLE_MAX_LENGTH}
          onkeydown={handleKeydown}
          onfocus={handleFocus}
          autocomplete="off"
        />

        <!-- Quick Action Buttons (Desktop) -->
        <div class="flex items-center gap-1">
          <!-- Priority Dropdown -->
          <div class="relative">
            <button
              type="button"
              class="
                p-2 rounded-lg transition-colors
                {selectedPriority
                ? priorityConfig[selectedPriority].color +
                  ' ' +
                  priorityConfig[selectedPriority].bg
                : 'text-neutral-muted hover:bg-base-200'}
              "
              onclick={() => (showQuickActions = !showQuickActions)}
              title="Set priority"
            >
              <Flag class="w-4 h-4" />
            </button>
          </div>

          <!-- Due Date -->
          <button
            type="button"
            class="
              p-2 rounded-lg transition-colors
              {selectedDueDate
              ? 'text-primary bg-primary-muted'
              : 'text-neutral-muted hover:bg-base-200'}
            "
            title="Set due date"
          >
            <Calendar class="w-4 h-4" />
          </button>
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          class="
            flex items-center gap-2
            px-5 py-2.5 rounded-xl
            font-semibold text-sm
            transition-all
            {canSubmit
            ? 'bg-primary text-white shadow-primary hover:brightness-110 active:scale-[0.98]'
            : 'bg-base-200 text-neutral-muted'}
          "
        >
          <Plus class="w-4 h-4" strokeWidth={2.5} />
          Add
        </button>
      </div>

      <!-- Quick Actions - Now Inline and Sliding -->
      {#if showQuickActions}
        <div
          class="px-5 pb-5 pt-2 border-t border-base-200/50"
          transition:slide={{ duration: 300 }}
        >
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <!-- Priority Selector -->
            <div class="space-y-3">
              <span
                class="text-[10px] font-bold text-neutral/40 uppercase tracking-[0.1em] px-1"
                >Priority Level</span
              >
              <div class="flex flex-wrap gap-2">
                {#each ["high", "medium", "low"] as p}
                  {@const config =
                    priorityConfig[p as keyof typeof priorityConfig]}
                  <button
                    type="button"
                    class="
                      group relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold
                      border transition-all duration-300
                      {selectedPriority === p
                      ? `${config.bg} ${config.color} border-current shadow-sm`
                      : 'bg-base-200/50 border-transparent text-neutral/60 hover:bg-base-200 hover:text-neutral hover:border-base-300'}
                    "
                    onclick={() =>
                      togglePriority(p as "high" | "medium" | "low")}
                  >
                    <div
                      class="w-1.5 h-1.5 rounded-full {selectedPriority === p
                        ? 'bg-current'
                        : 'bg-neutral/20 group-hover:bg-neutral/40'} transition-colors"
                    ></div>
                    {config.label}
                  </button>
                {/each}
              </div>
            </div>

            <!-- Due Date Selector -->
            <div class="space-y-3">
              <span
                class="text-[10px] font-bold text-neutral/40 uppercase tracking-[0.1em] px-1"
                >Timeline</span
              >
              <div class="flex flex-wrap gap-2">
                {#each ["today", "tomorrow", "week"] as d}
                  {@const config =
                    dueDateConfig[d as keyof typeof dueDateConfig]}
                  <button
                    type="button"
                    class="
                      group flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold
                      border transition-all duration-300
                      {selectedDueDate === d
                      ? 'bg-primary/10 text-primary border-primary/30 shadow-sm'
                      : 'bg-base-200/50 border-transparent text-neutral/60 hover:bg-base-200 hover:text-neutral hover:border-base-300'}
                    "
                    onclick={() =>
                      toggleDueDate(d as "today" | "tomorrow" | "week")}
                  >
                    <Calendar
                      class="w-3.5 h-3.5 {selectedDueDate === d
                        ? 'text-primary'
                        : 'text-neutral/40 group-hover:text-neutral/60'}"
                    />
                    {config.label}
                  </button>
                {/each}
              </div>
            </div>
          </div>
        </div>
      {/if}
    </form>
  </div>
{/if}
