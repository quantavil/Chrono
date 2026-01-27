/**
 * Supabase Client Configuration
 * Initializes and exports the Supabase client with proper TypeScript types
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Todo, User, RecurrenceConfig, Subtask } from '../types';

// ============================================================================
// Database Types (Generated from Schema)
// ============================================================================

export interface Database {
    public: {
        Tables: {
            todos: {
                Row: Todo;
                Insert: {
                    id?: string;
                    user_id?: string | null;
                    title: string;
                    is_completed?: boolean;
                    accumulated_time?: number;
                    last_start_time?: string | null;
                    position?: number;
                    recurrence?: RecurrenceConfig | null;
                    start_at?: string | null;
                    end_at?: string | null;
                    deadline?: string | null;
                    tags?: string[];
                    subtasks?: Subtask[];
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    user_id?: string | null;
                    title?: string;
                    is_completed?: boolean;
                    accumulated_time?: number;
                    last_start_time?: string | null;
                    position?: number;
                    recurrence?: RecurrenceConfig | null;
                    start_at?: string | null;
                    end_at?: string | null;
                    deadline?: string | null;
                    tags?: string[];
                    subtasks?: Subtask[];
                    created_at?: string;
                    updated_at?: string;
                };
            };
        };
        Views: Record<string, never>;
        Functions: Record<string, never>;
        Enums: Record<string, never>;
    };
}

// ============================================================================
// Environment Variables
// ============================================================================

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// ============================================================================
// Client Configuration
// ============================================================================

interface SupabaseConfig {
    url: string;
    anonKey: string;
    isConfigured: boolean;
}

function getSupabaseConfig(): SupabaseConfig {
    const url = SUPABASE_URL ?? '';
    const anonKey = SUPABASE_ANON_KEY ?? '';
    const isConfigured = Boolean(url && anonKey);

    return { url, anonKey, isConfigured };
}

export const supabaseConfig = getSupabaseConfig();

// ============================================================================
// Client Instance
// ============================================================================

let supabaseInstance: SupabaseClient<Database> | null = null;

function createSupabaseClient(): SupabaseClient<Database> | null {
    if (!supabaseConfig.isConfigured) {
        console.warn(
            '[Chronos] Supabase not configured. Running in local-only mode. ' +
            'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable sync.'
        );
        return null;
    }

    return createClient<Database>(supabaseConfig.url, supabaseConfig.anonKey, {
        auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true,
            storage: typeof window !== 'undefined' ? window.localStorage : undefined,
            storageKey: 'chronos_auth',
        },
        global: {
            headers: {
                'x-client-info': 'chronos/1.0.0',
            },
        },
        db: {
            schema: 'public',
        },
    });
}

export function getSupabase(): SupabaseClient<Database> | null {
    if (supabaseInstance === null && supabaseConfig.isConfigured) {
        supabaseInstance = createSupabaseClient();
    }
    return supabaseInstance;
}

export const supabase = getSupabase();

// ============================================================================
// Auth Helpers
// ============================================================================

export async function getCurrentUser(): Promise<User | null> {
    const client = getSupabase();
    if (!client) return null;

    try {
        const { data: { user }, error } = await client.auth.getUser();

        if (error || !user) return null;

        return {
            id: user.id,
            email: user.email ?? '',
            avatar_url: user.user_metadata?.avatar_url ?? null,
            full_name: user.user_metadata?.full_name ?? null,
            created_at: user.created_at,
            updated_at: user.updated_at ?? user.created_at,
        };
    } catch {
        return null;
    }
}

export async function signInWithMagicLink(email: string): Promise<{ error: Error | null }> {
    const client = getSupabase();
    if (!client) {
        return { error: new Error('Supabase not configured') };
    }

    try {
        const { error } = await client.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: window.location.origin,
            },
        });

        return { error: error ? new Error(error.message) : null };
    } catch (err) {
        return { error: err instanceof Error ? err : new Error('Unknown error') };
    }
}

export async function signInWithGitHub(): Promise<{ error: Error | null }> {
    const client = getSupabase();
    if (!client) {
        return { error: new Error('Supabase not configured') };
    }

    try {
        const { error } = await client.auth.signInWithOAuth({
            provider: 'github',
            options: {
                redirectTo: window.location.origin,
            },
        });

        return { error: error ? new Error(error.message) : null };
    } catch (err) {
        return { error: err instanceof Error ? err : new Error('Unknown error') };
    }
}

export async function signOut(): Promise<{ error: Error | null }> {
    const client = getSupabase();
    if (!client) {
        return { error: null };
    }

    try {
        const { error } = await client.auth.signOut();
        return { error: error ? new Error(error.message) : null };
    } catch (err) {
        return { error: err instanceof Error ? err : new Error('Unknown error') };
    }
}

// ============================================================================
// Todo API Helpers
// ============================================================================

export async function fetchTodos(userId: string): Promise<{ data: Todo[] | null; error: Error | null }> {
    const client = getSupabase();
    if (!client) {
        return { data: null, error: new Error('Supabase not configured') };
    }

    try {
        const { data, error } = await client
            .from('todos')
            .select('*')
            .eq('user_id', userId)
            .order('position', { ascending: true });

        if (error) {
            return { data: null, error: new Error(error.message) };
        }

        return { data, error: null };
    } catch (err) {
        return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
    }
}

export async function createTodo(
    todo: Database['public']['Tables']['todos']['Insert']
): Promise<{ data: Todo | null; error: Error | null }> {
    const client = getSupabase();
    if (!client) {
        return { data: null, error: new Error('Supabase not configured') };
    }

    try {
        const { data, error } = await (client
            .from('todos') as any)
            .insert(todo)
            .select()
            .single();

        if (error) {
            return { data: null, error: new Error(error.message) };
        }

        return { data, error: null };
    } catch (err) {
        return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
    }
}

export async function updateTodo(
    id: string,
    updates: Database['public']['Tables']['todos']['Update']
): Promise<{ data: Todo | null; error: Error | null }> {
    const client = getSupabase();
    if (!client) {
        return { data: null, error: new Error('Supabase not configured') };
    }

    try {
        const { data, error } = await (client
            .from('todos') as any)
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return { data: null, error: new Error(error.message) };
        }

        return { data, error: null };
    } catch (err) {
        return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
    }
}

export async function deleteTodo(id: string): Promise<{ error: Error | null }> {
    const client = getSupabase();
    if (!client) {
        return { error: new Error('Supabase not configured') };
    }

    try {
        const { error } = await client
            .from('todos')
            .delete()
            .eq('id', id);

        return { error: error ? new Error(error.message) : null };
    } catch (err) {
        return { error: err instanceof Error ? err : new Error('Unknown error') };
    }
}

export async function batchUpdateTodos(
    updates: Array<{ id: string; updates: Database['public']['Tables']['todos']['Update'] }>
): Promise<{ error: Error | null }> {
    const client = getSupabase();
    if (!client) {
        return { error: new Error('Supabase not configured') };
    }

    try {
        const promises = updates.map(({ id, updates: todoUpdates }) =>
            (client
                .from('todos') as any)
                .update({ ...todoUpdates, updated_at: new Date().toISOString() })
                .eq('id', id)
        );

        const results = await Promise.all(promises);
        const firstError = results.find((r) => r.error);

        return { error: firstError?.error ? new Error(firstError.error.message) : null };
    } catch (err) {
        return { error: err instanceof Error ? err : new Error('Unknown error') };
    }
}

// ============================================================================
// Realtime Subscriptions
// ============================================================================

export type TodoChangeCallback = (payload: {
    eventType: 'INSERT' | 'UPDATE' | 'DELETE';
    old: Todo | null;
    new: Todo | null;
}) => void;

export function subscribeTodoChanges(
    userId: string,
    callback: TodoChangeCallback
): (() => void) | null {
    const client = getSupabase();
    if (!client) return null;

    const channel = client
        .channel(`todos:user:${userId}`)
        .on<Todo>(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'todos',
                filter: `user_id=eq.${userId}`,
            },
            (payload) => {
                callback({
                    eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
                    old: (payload.old as Todo) ?? null,
                    new: (payload.new as Todo) ?? null,
                });
            }
        )
        .subscribe();

    return () => {
        client.removeChannel(channel);
    };
}

// ============================================================================
// Connection Status
// ============================================================================

export function isSupabaseConfigured(): boolean {
    return supabaseConfig.isConfigured;
}

export async function checkConnection(): Promise<boolean> {
    const client = getSupabase();
    if (!client) return false;

    try {
        const { error } = await client.from('todos').select('id').limit(1);
        return !error;
    } catch {
        return false;
    }
}