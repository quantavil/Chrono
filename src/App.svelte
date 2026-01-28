<script lang="ts">
  import { onMount } from "svelte";
  import { fade } from "svelte/transition";

  // Layout
  import DualPaneLayout from "$lib/components/layout/DualPaneLayout.svelte";
  import LeftPane from "$lib/components/layout/LeftPane.svelte";
  import RightPane from "$lib/components/layout/RightPane.svelte";

  // Components
  import Header from "$lib/components/Header.svelte";
  import AddTaskBar from "$lib/components/AddTaskBar.svelte";
  import TaskList from "$lib/components/TaskList.svelte";
  import CompletedSection from "$lib/components/CompletedSection.svelte";
  import Toast from "$lib/components/Toast.svelte";
  import KeyboardShortcuts from "$lib/components/KeyboardShortcuts.svelte";
  import SettingsPage from "$lib/components/SettingsPage.svelte";

  // Stores
  import { themeManager } from "$lib/stores/theme.svelte";
  import { toastManager } from "$lib/stores/toast.svelte";
  import { uiStore } from "$lib/stores/ui.svelte";
  import { isSupabaseConfigured } from "$lib/utils/supabase";
  import { initStores } from "$lib/context";

  // Icons
  import { WifiOff } from "lucide-svelte";

  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------

  // Initialize Stores (Context)
  const { todoStore: todoList, authStore: authManager } = initStores();

  let isOnline = $state(true);
  let isInitialized = $state(false);

  // Selected task for right pane (desktop) or full view (mobile)
  let selectedTaskId = $state<string | null>(null);

  // Shortcuts modal state
  let isShortcutsOpen = $state(false);

  // -------------------------------------------------------------------------
  // Derived State
  // -------------------------------------------------------------------------

  const isSupabaseEnabled = isSupabaseConfigured();
  const isAuthenticated = $derived(authManager.isAuthenticated);
  const isAuthInitialized = $derived(authManager.isInitialized);
  const isLoading = $derived(todoList.loading);
  const view = $derived(uiStore.view);

  // Get the selected task object
  const selectedTask = $derived(
    selectedTaskId ? (todoList.getById(selectedTaskId) ?? null) : null,
  );

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  function handleSelectTask(id: string): void {
    if (selectedTaskId === id) {
      // Toggle off if same top-level selection (mostly for desktop behavior if desired,
      // but for unified URL state, we usually just push the new state or back)
      // For now, let's treat clicking the same task as "ensure open" or "no-op"
      // If we want toggle behavior:
      // history.back();
      // return;
    }

    selectedTaskId = id;

    // Always push state.
    // If we are already on this task, replaceState might be cleaner, but pushState is fine for history log.
    const url = new URL(window.location.href);
    url.hash = `task=${id}`;
    // prevent duplicate history entries if clicking same task repeatedly
    if (window.history.state?.taskId !== id) {
      window.history.pushState({ taskId: id }, "", url.toString());
    }
  }

  function handleCloseTask(): void {
    // Universal close handler
    if (
      window.history.state?.taskId ||
      window.location.hash.includes("task=")
    ) {
      window.history.back();
    } else {
      // Fallback if no history state (e.g. initial load with hash)
      selectedTaskId = null; // direct mutation
      const url = new URL(window.location.href);
      url.hash = "";
      window.history.replaceState(null, "", url.toString());
    }
  }

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  onMount(() => {
    isOnline = navigator.onLine;

    const handleOnline = () => {
      isOnline = true;
      toastManager.success("Back online");
      if (isSupabaseEnabled && isAuthenticated) {
        todoList.forceSync();
      }
    };

    const handleOffline = () => {
      isOnline = false;
      toastManager.warning(
        "You're offline. Changes will sync when reconnected.",
      );
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initial State Check
    if (window.location.hash.startsWith("#task=")) {
      const id = window.location.hash.replace("#task=", "");
      if (id) selectedTaskId = id;
    }

    // Handle History Navigation (Back/Forward)
    const handlePopState = (event: PopStateEvent) => {
      if (event.state?.taskId) {
        selectedTaskId = event.state.taskId;
      } else {
        // Check hash fallback if state is missing but hash exists (unlikely with correct pushState)
        if (window.location.hash.startsWith("#task=")) {
          const id = window.location.hash.replace("#task=", "");
          selectedTaskId = id;
        } else {
          selectedTaskId = null;
        }
      }
    };
    window.addEventListener("popstate", handlePopState);

    // Keyboard shortcuts
    const handleKeydown = (event: KeyboardEvent) => {
      // Cmd/Ctrl + K to focus add task input
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        const input = document.querySelector<HTMLInputElement>(
          'input[placeholder*="task"]',
        );
        input?.focus();
      }

      // Escape to close right panel
      if (event.key === "Escape") {
        if (selectedTaskId) {
          handleCloseTask();
        }
        // Also close settings if needed
        if (uiStore.view === "settings") {
          uiStore.view = "dashboard";
        }
      }

      // Cmd/Ctrl + / to toggle shortcuts
      if ((event.metaKey || event.ctrlKey) && event.key === "/") {
        event.preventDefault();
        isShortcutsOpen = !isShortcutsOpen;
      }

      // Keyboard Navigation
      const activeElement = document.activeElement;
      const isInputFocused =
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        activeElement?.getAttribute("contenteditable") === "true";

      if (!isInputFocused) {
        if (event.key === "ArrowDown") {
          event.preventDefault();
          uiStore.focusNext(todoList.activeTodos.map((t) => t.id));
        }
        if (event.key === "ArrowUp") {
          event.preventDefault();
          uiStore.focusPrev(todoList.activeTodos.map((t) => t.id));
        }
        if (event.key === " " || event.code === "Space") {
          if (uiStore.focusedTaskId) {
            event.preventDefault();
            todoList.toggleTimer(uiStore.focusedTaskId);
          }
        }
        if (event.key === "Enter" && uiStore.focusedTaskId) {
          event.preventDefault();
          handleSelectTask(uiStore.focusedTaskId);
        }
      }
    };

    window.addEventListener("keydown", handleKeydown);

    // Mark as initialized
    const initTimeout = setTimeout(() => {
      isInitialized = true;
    }, 500);

    if (isAuthInitialized && !isLoading) {
      isInitialized = true;
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("keydown", handleKeydown);
      clearTimeout(initTimeout);
      todoList.destroy();
      toastManager.destroy();
      authManager.destroy();
    };
  });

  // Watch for initialization
  $effect(() => {
    if (isAuthInitialized && !isLoading && !isInitialized) {
      isInitialized = true;
    }
  });

  // Clear selection if task is deleted
  $effect(() => {
    if (selectedTaskId && !selectedTask) {
      selectedTaskId = null;
    }
  });
</script>

<svelte:head>
  <title>Chronos - Todo & Timer</title>
</svelte:head>

<div data-theme={themeManager.resolved}>
  {#if isInitialized}
    {#if uiStore.view === "settings"}
      <SettingsPage />
    {:else}
      <DualPaneLayout
        isRightPaneOpen={!!selectedTask}
        mobileShowDetail={!!selectedTask}
      >
        <!-- LEFT PANE (List) -->
        {#snippet listPane()}
          <div class="h-full flex flex-col relative">
            <!-- Header (Sticky) -->
            <Header class="flex-shrink-0" />

            <!-- Scrollable List Area -->
            <div
              class="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-32 lg:pb-6 pt-4"
            >
              <!-- Inline Add Task (Desktop/Tablet) -->
              <div class="hidden lg:block mb-6">
                <AddTaskBar variant="inline" />
              </div>

              <TaskList class="mb-6" onEdit={(id) => handleSelectTask(id)} />
              <CompletedSection />
            </div>

            <!-- Fixed Add Task (Mobile/Tablet < lg) -->
            <div class="lg:hidden">
              <AddTaskBar variant="fixed" />
            </div>
          </div>
        {/snippet}

        <!-- DETAIL PANE (Right/Full) -->
        {#snippet detailPane()}
          <RightPane task={selectedTask} onClose={handleCloseTask} />
        {/snippet}
      </DualPaneLayout>
    {/if}
  {:else}
    <!-- Loading State -->
    <div class="min-h-screen bg-base-200 flex items-center justify-center">
      <div class="flex flex-col items-center gap-4">
        <div
          class="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-secondary animate-pulse"
        ></div>
        <p class="text-sm text-neutral/50 font-medium">Loading Chronos...</p>
      </div>
    </div>
  {/if}

  <!-- Toast Notifications -->
  <Toast position="bottom-center" />

  <!-- Offline Banner (Mobile) -->
  {#if !isOnline}
    <div
      class="fixed top-0 left-0 right-0 z-50 lg:hidden bg-amber-500 text-white text-center text-xs font-semibold py-1.5 px-4"
      transition:fade={{ duration: 150 }}
    >
      <div class="flex items-center justify-center gap-2">
        <WifiOff class="w-3.5 h-3.5" strokeWidth={2.5} />
        <span>You're offline. Changes will sync later.</span>
      </div>
    </div>
  {/if}

  <!-- Background Decoration -->
  {#if uiStore.view !== "settings"}
    <div
      class="fixed inset-0 pointer-events-none overflow-hidden opacity-30 dark:opacity-10"
      aria-hidden="true"
    >
      <div
        class="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 blur-3xl"
      ></div>
      <div
        class="absolute -bottom-48 -left-48 w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-accent/20 to-primary/20 blur-3xl"
      ></div>
    </div>
  {/if}

  <!-- Keyboard Shortcuts Modal -->
  <KeyboardShortcuts bind:isOpen={isShortcutsOpen} />
</div>

<style>
  :global(#app) {
    position: relative;
    z-index: 1;
  }
</style>
