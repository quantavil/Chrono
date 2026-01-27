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
  import TaskDetailModal from "$lib/components/TaskDetailModal.svelte";
  import Toast from "$lib/components/Toast.svelte";

  // Stores
  import { todoList } from "$lib/stores/todo.svelte";
  import { themeManager } from "$lib/stores/theme.svelte";
  import { toastManager } from "$lib/stores/toast.svelte";
  import { authManager } from "$lib/stores/auth.svelte";
  import { isSupabaseConfigured } from "$lib/utils/supabase";

  // Icons
  import { WifiOff } from "lucide-svelte";

  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------

  let isOnline = $state(true);
  let isInitialized = $state(false);

  // Selected task for right pane (desktop) or modal (mobile)
  let selectedTaskId = $state<string | null>(null);
  let selectedTaskMode = $state<"content" | "settings">("content");

  // Mobile modal state
  let isMobileModalOpen = $state(false);

  // -------------------------------------------------------------------------
  // Derived State
  // -------------------------------------------------------------------------

  const isSupabaseEnabled = isSupabaseConfigured();
  const isAuthenticated = $derived(authManager.isAuthenticated);
  const isAuthInitialized = $derived(authManager.isInitialized);
  const isLoading = $derived(todoList.loading);

  // Get the selected task object
  const selectedTask = $derived(
    selectedTaskId ? (todoList.getById(selectedTaskId) ?? null) : null,
  );

  const isRightPaneOpen = $derived(!!selectedTask);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  function handleSelectTask(
    id: string,
    mode: "content" | "settings" = "content",
  ): void {
    // On desktop: show in right pane
    // On mobile: open modal
    if (typeof window !== "undefined" && window.innerWidth >= 1024) {
      if (selectedTaskId === id) {
        if (selectedTaskMode === mode) {
          // Same task, same mode -> Close
          selectedTaskId = null;
        } else {
          // Same task, different mode -> Switch mode
          selectedTaskMode = mode;
        }
      } else {
        // New task -> Open
        selectedTaskId = id;
        selectedTaskMode = mode;
      }
    } else {
      selectedTaskId = id;
      selectedTaskMode = mode; // Mobile might not use mode yet, but good to set
      isMobileModalOpen = true;
    }
  }

  function handleCloseRightPane(): void {
    selectedTaskId = null;
  }

  function handleCloseMobileModal(): void {
    isMobileModalOpen = false;
    // Keep selectedTaskId for potential reopen, or clear it:
    // selectedTaskId = null;
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
          selectedTaskId = null;
        }
        if (isMobileModalOpen) {
          isMobileModalOpen = false;
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
    <DualPaneLayout {isRightPaneOpen}>
      <!-- LEFT PANE (Desktop) -->
      {#snippet leftPane()}
        <LeftPane {selectedTaskId} onSelectTask={handleSelectTask} />
      {/snippet}

      <!-- RIGHT PANE (Desktop) -->
      {#snippet rightPane()}
        <RightPane
          task={selectedTask}
          mode={selectedTaskMode}
          onClose={handleCloseRightPane}
        />
      {/snippet}

      <!-- MOBILE CONTENT -->
      {#snippet mobileContent()}
        <div class="w-full px-4 sm:px-6 pt-6 pb-32">
          <Header class="mb-6" />
          <AddTaskBar variant="inline" class="mb-6" />
          <TaskList
            class="mb-6"
            onEdit={(id) => handleSelectTask(id, "content")}
          />
          <CompletedSection />
        </div>

        <!-- Mobile Fixed Bottom Add Bar -->
        <AddTaskBar variant="fixed" />

        <!-- Mobile Task Detail Modal -->
        <TaskDetailModal bind:isOpen={isMobileModalOpen} todo={selectedTask} />
      {/snippet}
    </DualPaneLayout>
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
</div>

<style>
  :global(#app) {
    position: relative;
    z-index: 1;
  }
</style>
