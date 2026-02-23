/**
 * Authentication Store: Manages user session, login/logout logic using Better Auth.
 */

import type { User, AuthState } from '../types';
import { toastManager } from './toast.svelte';
import type { TodoList } from './todo.svelte';
import { createAuthClient } from "better-auth/svelte";

export const authClient = createAuthClient();

export class AuthManager {
  private currentUser = $state<User | null>(null);
  private loading = $state<boolean>(true);
  private authError = $state<string | null>(null);
  private initialized = $state<boolean>(false);

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

  get isConfigured(): boolean {
    return true; // We always assume configured via custom backend now
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
    try {
      const { data: session } = await authClient.getSession();

      if (session?.user) {
        this.currentUser = {
          id: session.user.id,
          email: session.user.email,
          avatar_url: session.user.image || null,
          full_name: session.user.name || null,
          created_at: session.user.createdAt.toISOString(),
          updated_at: session.user.updatedAt.toISOString(),
        };
        await this.todoList.setUser(session.user.id);
      }
    } catch (error) {
      console.error('[Chronos] Auth initialization error:', error);
      this.authError = 'Failed to initialize authentication';
    } finally {
      this.loading = false;
      this.initialized = true;
    }
  }

  // -------------------------------------------------------------------------
  // Auth Methods
  // -------------------------------------------------------------------------

  async signInWithEmail(email: string, password?: string): Promise<{ success: boolean; error?: string }> {
    this.loading = true;
    this.authError = null;

    try {
      const { error } = await authClient.signIn.email({
        email,
        password: password || '', // Use the provided password
      });

      if (error) {
        this.authError = error.message || 'Unknown error';
        toastManager.error(error.message || 'Unknown error');
        return { success: false, error: this.authError };
      }

      toastManager.success('Signed in successfully!');
      await this.refreshUser();

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

  async signUpWithEmail(email: string, password?: string): Promise<{ success: boolean; error?: string }> {
    this.loading = true;
    this.authError = null;

    try {
      const { error } = await authClient.signUp.email({
        email,
        password: password || '',
        name: email.split('@')[0], // Give a default name
      });

      if (error) {
        this.authError = error.message || 'Unknown error';
        toastManager.error(error.message || 'Unknown error');
        return { success: false, error: this.authError };
      }

      toastManager.success('Account created successfully!');
      await this.refreshUser();

      return { success: true };

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sign up failed';
      this.authError = message;
      toastManager.error(message);
      return { success: false, error: message };

    } finally {
      this.loading = false;
    }
  }



  async signOut(): Promise<{ success: boolean; error?: string }> {
    this.loading = true;
    this.authError = null;

    try {
      await authClient.signOut();
      this.currentUser = null;
      await this.todoList.setUser(null);
      toastManager.info('You have been signed out');

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
    try {
      const { data: session } = await authClient.getSession();
      if (session?.user) {
        this.currentUser = {
          id: session.user.id,
          email: session.user.email,
          avatar_url: session.user.image || null,
          full_name: session.user.name || null,
          created_at: session.user.createdAt.toISOString(),
          updated_at: session.user.updatedAt.toISOString(),
        };
      }
    } catch (error) {
      console.error('[Chronos] Failed to refresh user:', error);
    }
  }

  // -------------------------------------------------------------------------
  // Cleanup
  // -------------------------------------------------------------------------

  destroy(): void {
    // No global subscriptions to clean up for better-auth
  }
}