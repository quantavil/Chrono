<!--
  Root App Component: Orchestrates the high-level application state, context provision, and view routing.
-->
<script lang="ts">
  import { onMount } from "svelte";
  import { fade } from "svelte/transition";

  import DualPaneLayout from "$lib/components/layout/DualPaneLayout.svelte";
  import RightPane from "$lib/components/layout/RightPane.svelte";

  import Header from "$lib/components/layout/Header.svelte";
  import AddTaskBar from "$lib/components/tasks/AddTaskBar.svelte";
  import TaskList from "$lib/components/tasks/TaskList.svelte";
  import CompletedSection from "$lib/components/tasks/CompletedSection.svelte";
  import Toast from "$lib/components/ui/Toast.svelte";
  import KeyboardShortcuts from "$lib/components/ui/KeyboardShortcuts.svelte";
  import SettingsPage from "$lib/components/settings/SettingsPage.svelte";

  import { themeManager } from "$lib/stores/theme.svelte";
  import { toastManager } from "$lib/stores/toast.svelte";
  import { uiStore } from "$lib/stores/ui.svelte";
  import { isSupabaseConfigured } from "$lib/utils/supabase";
  import { initStores } from "$lib/context";

  import { WifiOff } from "lucide-svelte";

  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------
  const { todoStore: todoList, authStore: authManager } = initStores();
  const isSupabaseEnabled = isSupabaseConfigured();

  let isOnline = $state(true);
  let isInitialized = $state(false);
  let selectedTaskId = $state<string | null>(null);
  let isShortcutsOpen = $state(false);

  // -------------------------------------------------------------------------
  // Derived
  // -------------------------------------------------------------------------
  const isAuthenticated = $derived(authManager.isAuthenticated);
  const isAuthInitialized = $derived(authManager.isInitialized);
  const isLoading = $derived(todoList.loading);
  const selectedTask = $derived(
    selectedTaskId ? (todoList.getById(selectedTaskId) ?? null) : null,
  );

  // -------------------------------------------------------------------------
  // URL/Navigation Helpers
  // -------------------------------------------------------------------------
  function getTaskIdFromHash(): string | null {
    const hash = window.location.hash;
    return hash.startsWith("#task=")
      ? hash.replace("#task=", "") || null
      : null;
  }

  function updateUrlWithTask(taskId: string | null): void {
    const url = new URL(window.location.href);
    if (taskId) {
      url.hash = `task=${taskId}`;
      if (window.history.state?.taskId !== taskId) {
        window.history.pushState({ taskId }, "", url.toString());
      }
    } else {
      url.hash = "";
      window.history.replaceState(null, "", url.toString());
    }
  }

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------
  function handleSelectTask(id: string): void {
    selectedTaskId = id;
    updateUrlWithTask(id);
  }

  function handleCloseTask(): void {
    if (
      window.history.state?.taskId ||
      window.location.hash.includes("task=")
    ) {
      window.history.back();
    } else {
      selectedTaskId = null;
      updateUrlWithTask(null);
    }
  }

  function handleOnlineStatus(online: boolean): void {
    isOnline = online;
    if (online) {
      toastManager.success("Back online");
      if (isSupabaseEnabled && isAuthenticated) todoList.forceSync();
    } else {
      toastManager.warning(
        "You're offline. Changes will sync when reconnected.",
      );
    }
  }

  function handleKeydown(event: KeyboardEvent): void {
    const { key, metaKey, ctrlKey } = event;
    const mod = metaKey || ctrlKey;

    const el = document.activeElement;
    const isTyping =
      el instanceof HTMLInputElement ||
      el instanceof HTMLTextAreaElement ||
      el?.getAttribute("contenteditable") === "true";

    // Global shortcuts
    if (mod && key === "k") {
      event.preventDefault();
      document
        .querySelector<HTMLInputElement>('input[placeholder*="task"]')
        ?.focus();
      return;
    }

    if (mod && key === "/") {
      event.preventDefault();
      isShortcutsOpen = !isShortcutsOpen;
      return;
    }

    if (key === "Escape") {
      if (selectedTaskId) handleCloseTask();
      if (uiStore.view === "settings") uiStore.view = "dashboard";
      return;
    }

    if (isTyping) return;

    const taskIds = todoList.activeTodos.map((t) => t.id);

    if (key === "ArrowDown") {
      event.preventDefault();
      uiStore.focusNext(taskIds);
    } else if (key === "ArrowUp") {
      event.preventDefault();
      uiStore.focusPrev(taskIds);
    } else if (
      (key === " " || event.code === "Space") &&
      uiStore.focusedTaskId
    ) {
      event.preventDefault();
      todoList.toggleTimer(uiStore.focusedTaskId);
    } else if (key === "Enter" && uiStore.focusedTaskId) {
      event.preventDefault();
      handleSelectTask(uiStore.focusedTaskId);
    }
  }

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------
  onMount(() => {
    isOnline = navigator.onLine;

    // Check initial hash
    const initialTaskId = getTaskIdFromHash();
    if (initialTaskId) selectedTaskId = initialTaskId;

    // Event listeners
    const onOnline = () => handleOnlineStatus(true);
    const onOffline = () => handleOnlineStatus(false);
    const onPopState = (e: PopStateEvent) => {
      selectedTaskId = e.state?.taskId ?? getTaskIdFromHash();
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("popstate", onPopState);
    window.addEventListener("keydown", handleKeydown);

    // Init timeout
    const initTimeout = setTimeout(() => (isInitialized = true), 500);
    if (isAuthInitialized && !isLoading) isInitialized = true;

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("keydown", handleKeydown);
      clearTimeout(initTimeout);
      todoList.destroy();
      toastManager.destroy();
      authManager.destroy();
    };
  });

  $effect(() => {
    if (isAuthInitialized && !isLoading && !isInitialized) isInitialized = true;
  });

  $effect(() => {
    if (selectedTaskId && !selectedTask) selectedTaskId = null;
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
        {#snippet listPane()}
          <div class="h-full flex flex-col">
            <Header class="flex-shrink-0" />
            <div
              class="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-32 lg:pb-6 pt-4"
            >
              <AddTaskBar variant="inline" class="mb-6" />
              <TaskList class="mb-6" onEdit={handleSelectTask} />
              <CompletedSection />
            </div>
          </div>
        {/snippet}

        {#snippet detailPane()}
          <RightPane task={selectedTask} onClose={handleCloseTask} />
        {/snippet}
      </DualPaneLayout>
    {/if}
  {:else}
    <!-- Loading -->
    <div class="min-h-screen bg-base-200 flex items-center justify-center">
      <div class="flex flex-col items-center gap-4">
        <div
          class="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-secondary animate-pulse"
        ></div>
        <p class="text-sm text-neutral/50 font-medium">Loading Chronos...</p>
      </div>
    </div>
  {/if}

  <Toast position="bottom-center" />

  <!-- Offline Banner -->
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

  <!-- Background -->
  {#if uiStore.view !== "settings"}
    <div
      class="fixed inset-0 pointer-events-none overflow-hidden opacity-30 dark:opacity-10 -z-10"
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

  <KeyboardShortcuts bind:isOpen={isShortcutsOpen} />
</div>

<style>
  :global(#app) {
    position: relative;
    z-index: 1;
  }
</style>
