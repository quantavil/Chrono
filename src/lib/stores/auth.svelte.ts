/**
 * Authentication State Management with Svelte 5 Runes
 * Handles user auth state, magic link, and OAuth providers
 */

import type { User, AuthState } from '../types';
import {
  getSupabase,
  getCurrentUser,
  signInWithMagicLink as apiSignInWithMagicLink,
  signInWithGitHub as apiSignInWithGitHub,
  signOut as apiSignOut,
  isSupabaseConfigured,
} from '../utils/supabase';
import { toastManager } from './toast.svelte';
import type { TodoList } from './todo.svelte';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

// ============================================================================
// Auth Manager Class
// ============================================================================

export class AuthManager {
  private currentUser = $state<User | null>(null);
  private loading = $state<boolean>(true);
  private authError = $state<string | null>(null);
  private initialized = $state<boolean>(false);
  private unsubscribeAuth: (() => void) | null = null;

  private todoList: TodoList;

  constructor(todoList: TodoList) {
    this.todoList = todoList;
    if (typeof window !== 'undefined') {
      this.initialize();
    }
  }

  // -------------------------------------------------------------------------
  // Getters
  // -------------------------------------------------------------------------

  get user(): User | null {
    return this.currentUser;
  }

  get isLoading(): boolean {
    return this.loading;
  }

  get isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  get isInitialized(): boolean {
    return this.initialized;
  }

  get error(): string | null {
    return this.authError;
  }

  get state(): AuthState {
    return {
      user: this.currentUser,
      isLoading: this.loading,
      isAuthenticated: this.isAuthenticated,
    };
  }

  get isConfigured(): boolean {
    return isSupabaseConfigured();
  }

  get userInitials(): string {
    if (!this.currentUser) return '?';

    const name = this.currentUser.full_name || this.currentUser.email;
    if (!name) return '?';

    const parts = name.split(/[\s@]+/);
    if (parts.length >= 2) {
      return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase();
    }
    return (parts[0]?.[0] ?? '?').toUpperCase();
  }

  get displayName(): string {
    if (!this.currentUser) return 'Guest';
    return this.currentUser.full_name || this.currentUser.email.split('@')[0] || 'User';
  }

  // -------------------------------------------------------------------------
  // Initialization
  // -------------------------------------------------------------------------

  private async initialize(): Promise<void> {
    if (!isSupabaseConfigured()) {
      this.loading = false;
      this.initialized = true;
      return;
    }

    const client = getSupabase();
    if (!client) {
      this.loading = false;
      this.initialized = true;
      return;
    }

    try {
      // Get initial session
      const { data: { session } } = await client.auth.getSession();

      if (session?.user) {
        this.currentUser = this.mapSessionUser(session);
        this.currentUser = this.mapSessionUser(session);
        await this.todoList.setUser(session.user.id);
      }

      // Listen for auth changes
      const { data: { subscription } } = client.auth.onAuthStateChange(
        async (event: AuthChangeEvent, session: Session | null) => {
          await this.handleAuthChange(event, session);
        }
      );

      this.unsubscribeAuth = () => subscription.unsubscribe();

    } catch (error) {
      console.error('[Chronos] Auth initialization error:', error);
      this.authError = 'Failed to initialize authentication';
    } finally {
      this.loading = false;
      this.initialized = true;
    }
  }

  private async handleAuthChange(
    event: AuthChangeEvent,
    session: Session | null
  ): Promise<void> {
    console.log('[Chronos] Auth event:', event);

    switch (event) {
      case 'SIGNED_IN':
        if (session?.user) {
          this.currentUser = this.mapSessionUser(session);
          this.currentUser = this.mapSessionUser(session);
          await this.todoList.setUser(session.user.id);
          toastManager.success(`Welcome back, ${this.displayName}!`);
        }
        break;

      case 'SIGNED_OUT':
        this.currentUser = null;
        this.currentUser = null;
        await this.todoList.setUser(null);
        toastManager.info('You have been signed out');
        break;

      case 'TOKEN_REFRESHED':
        if (session?.user) {
          this.currentUser = this.mapSessionUser(session);
        }
        break;

      case 'USER_UPDATED':
        if (session?.user) {
          this.currentUser = this.mapSessionUser(session);
        }
        break;

      case 'PASSWORD_RECOVERY':
        // Handle password recovery if needed
        break;
    }

    this.authError = null;
  }

  private mapSessionUser(session: Session): User {
    const { user } = session;
    return {
      id: user.id,
      email: user.email ?? '',
      avatar_url: user.user_metadata?.avatar_url ?? null,
      full_name: user.user_metadata?.full_name ?? null,
      created_at: user.created_at,
      updated_at: user.updated_at ?? user.created_at,
    };
  }

  // -------------------------------------------------------------------------
  // Auth Methods
  // -------------------------------------------------------------------------

  async signInWithEmail(email: string): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Authentication is not configured' };
    }

    this.loading = true;
    this.authError = null;

    try {
      const { error } = await apiSignInWithMagicLink(email);

      if (error) {
        this.authError = error.message;
        toastManager.error(error.message);
        return { success: false, error: error.message };
      }

      toastManager.success('Check your email for the magic link!');
      return { success: true };

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sign in failed';
      this.authError = message;
      toastManager.error(message);
      return { success: false, error: message };

    } finally {
      this.loading = false;
    }
  }

  async signInWithGitHub(): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Authentication is not configured' };
    }

    this.loading = true;
    this.authError = null;

    try {
      const { error } = await apiSignInWithGitHub();

      if (error) {
        this.authError = error.message;
        toastManager.error(error.message);
        return { success: false, error: error.message };
      }

      // Redirect will happen, so just return success
      return { success: true };

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sign in failed';
      this.authError = message;
      toastManager.error(message);
      return { success: false, error: message };

    } finally {
      this.loading = false;
    }
  }

  async signOut(): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Authentication is not configured' };
    }

    this.loading = true;
    this.authError = null;

    try {
      const { error } = await apiSignOut();

      if (error) {
        this.authError = error.message;
        toastManager.error(error.message);
        return { success: false, error: error.message };
      }

      return { success: true };

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sign out failed';
      this.authError = message;
      toastManager.error(message);
      return { success: false, error: message };

    } finally {
      this.loading = false;
    }
  }

  // -------------------------------------------------------------------------
  // Utility Methods
  // -------------------------------------------------------------------------

  clearError(): void {
    this.authError = null;
  }

  async refreshUser(): Promise<void> {
    if (!isSupabaseConfigured()) return;

    try {
      const user = await getCurrentUser();
      if (user) {
        this.currentUser = user;
      }
    } catch (error) {
      console.error('[Chronos] Failed to refresh user:', error);
    }
  }

  // -------------------------------------------------------------------------
  // Cleanup
  // -------------------------------------------------------------------------

  destroy(): void {
    if (this.unsubscribeAuth) {
      this.unsubscribeAuth();
      this.unsubscribeAuth = null;
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

// Singleton removed in favor of Context