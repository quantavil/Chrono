<!--
  User profile row with avatar, name, and direct logout button (no dropdown).
-->
<script lang="ts">
  import { LogOut } from "lucide-svelte";
  import { getAuthStore } from "$lib/context";

  interface Props {
    class?: string;
    onOpenSettings?: () => void;
  }

  let { class: className = "", onOpenSettings = () => {} }: Props = $props();

  const authManager = getAuthStore();

  const user = $derived(authManager.user);
  const isAuthenticated = $derived(authManager.isAuthenticated);
  const initials = $derived(authManager.userInitials);
  const displayName = $derived(authManager.displayName);

  async function handleSignOut(): Promise<void> {
    await authManager.signOut();
  }
</script>

{#if isAuthenticated && user}
  <div class="flex items-center gap-2 px-1 py-1.5 {className}">
    <!-- Avatar -->
    {#if user.avatar_url}
      <img
        src={user.avatar_url}
        alt={displayName}
        class="w-8 h-8 rounded-full object-cover flex-shrink-0"
      />
    {:else}
      <div
        class="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
      >
        {initials}
      </div>
    {/if}

    <!-- Name / email -->
    <div class="flex-1 min-w-0">
      <p class="text-sm font-semibold text-neutral truncate leading-tight">
        {displayName}
      </p>
      <p class="text-xs text-neutral/40 truncate leading-tight">
        {user.email}
      </p>
    </div>

    <!-- Logout button -->
    <button
      type="button"
      class="flex-shrink-0 p-1.5 rounded-lg text-neutral/40 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
      onclick={handleSignOut}
      title="Sign out"
      aria-label="Sign out"
    >
      <LogOut class="w-4 h-4" strokeWidth={2} />
    </button>
  </div>
{/if}
