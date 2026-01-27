<script lang="ts">
  /**
   * UserMenu Component
   * Avatar dropdown with user info and sign out option
   */
  
  import { fade, fly } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import { 
    User, 
    LogOut, 
    Settings, 
    ChevronDown,
    Cloud,
    CheckCircle
  } from 'lucide-svelte';
  import { authManager } from '$lib/stores/auth.svelte';
  import { todoList } from '$lib/stores/todo.svelte';
  import { formatTimeCompact } from '$lib/utils/formatTime';

  // -------------------------------------------------------------------------
  // Props
  // -------------------------------------------------------------------------

  interface Props {
    class?: string;
  }

  let { class: className = '' }: Props = $props();

  // -------------------------------------------------------------------------
  // Local State
  // -------------------------------------------------------------------------

  let isOpen = $state(false);
  let menuRef = $state<HTMLDivElement | null>(null);

  // -------------------------------------------------------------------------
  // Derived State
  // -------------------------------------------------------------------------

  const user = $derived(authManager.user);
  const isAuthenticated = $derived(authManager.isAuthenticated);
  const initials = $derived(authManager.userInitials);
  const displayName = $derived(authManager.displayName);
  const stats = $derived(todoList.stats);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  function toggleMenu(): void {
    isOpen = !isOpen;
  }

  function closeMenu(): void {
    isOpen = false;
  }

  async function handleSignOut(): Promise<void> {
    closeMenu();
    await authManager.signOut();
  }

  function handleClickOutside(event: MouseEvent): void {
    if (menuRef && !menuRef.contains(event.target as Node)) {
      closeMenu();
    }
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      closeMenu();
    }
  }
</script>

<svelte:window onclick={handleClickOutside} onkeydown={handleKeydown} />

{#if isAuthenticated && user}
  <div 
    bind:this={menuRef}
    class="relative {className}"
  >
    <!-- Avatar Button -->
    <button
      type="button"
      class="
        flex items-center gap-2
        p-1 pr-2 rounded-full
        bg-base-200 hover:bg-base-300
        transition-all duration-200
        group
      "
      onclick={toggleMenu}
      aria-expanded={isOpen}
      aria-haspopup="true"
    >
      <!-- Avatar -->
      {#if user.avatar_url}
        <img 
          src={user.avatar_url} 
          alt={displayName}
          class="w-8 h-8 rounded-full object-cover"
        />
      {:else}
        <div 
          class="
            w-8 h-8 rounded-full
            bg-gradient-to-br from-primary to-secondary
            flex items-center justify-center
            text-white text-xs font-bold
          "
        >
          {initials}
        </div>
      {/if}

      <!-- Chevron -->
      <ChevronDown 
        class="
          w-4 h-4 text-neutral/40
          group-hover:text-neutral/60
          transition-transform duration-200
          {isOpen ? 'rotate-180' : ''}
        "
        strokeWidth={2}
      />
    </button>

    <!-- Dropdown Menu -->
    {#if isOpen}
      <div 
        class="
          absolute right-0 top-full mt-2
          w-72 p-2
          bg-base-100 rounded-2xl
          shadow-xl shadow-neutral/10
          border border-base-300/50
          z-50
        "
        transition:fly={{ y: -10, duration: 200, easing: quintOut }}
        role="menu"
      >
        <!-- User Info -->
        <div class="px-3 py-3 border-b border-base-300/50 mb-2">
          <div class="flex items-center gap-3">
            {#if user.avatar_url}
              <img 
                src={user.avatar_url} 
                alt={displayName}
                class="w-10 h-10 rounded-full object-cover"
              />
            {:else}
              <div 
                class="
                  w-10 h-10 rounded-full
                  bg-gradient-to-br from-primary to-secondary
                  flex items-center justify-center
                  text-white text-sm font-bold
                "
              >
                {initials}
              </div>
            {/if}
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold text-neutral truncate">
                {displayName}
              </p>
              <p class="text-xs text-neutral/50 truncate">
                {user.email}
              </p>
            </div>
          </div>
        </div>

        <!-- Stats -->
        <div class="px-3 py-2 mb-2">
          <div class="grid grid-cols-2 gap-2">
            <div 
              class="
                flex items-center gap-2
                px-3 py-2 rounded-xl
                bg-base-200/50
              "
            >
              <CheckCircle class="w-4 h-4 text-accent" strokeWidth={2} />
              <div>
                <p class="text-xs text-neutral/50">Completed</p>
                <p class="text-sm font-semibold text-neutral tabular-nums">
                  {stats.completedTasks}
                </p>
              </div>
            </div>
            <div 
              class="
                flex items-center gap-2
                px-3 py-2 rounded-xl
                bg-base-200/50
              "
            >
              <Cloud class="w-4 h-4 text-primary" strokeWidth={2} />
              <div>
                <p class="text-xs text-neutral/50">Total Time</p>
                <p class="text-sm font-semibold text-neutral font-mono tabular-nums">
                  {formatTimeCompact(stats.totalTimeMs)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Menu Items -->
        <div class="space-y-1">
          <!-- Settings (placeholder) -->
          <button
            type="button"
            class="
              w-full flex items-center gap-3
              px-3 py-2.5 rounded-xl
              text-sm text-neutral/70
              hover:bg-base-200 hover:text-neutral
              transition-colors
            "
            role="menuitem"
            onclick={closeMenu}
          >
            <Settings class="w-4 h-4" strokeWidth={2} />
            Settings
          </button>

          <!-- Sign Out -->
          <button
            type="button"
            class="
              w-full flex items-center gap-3
              px-3 py-2.5 rounded-xl
              text-sm text-red-500
              hover:bg-red-50 dark:hover:bg-red-900/20
              transition-colors
            "
            role="menuitem"
            onclick={handleSignOut}
          >
            <LogOut class="w-4 h-4" strokeWidth={2} />
            Sign out
          </button>
        </div>
      </div>
    {/if}
  </div>
{/if}