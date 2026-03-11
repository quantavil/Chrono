import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../../db/schema';

// This env interface corresponds to wrangler.toml definitions
export interface Env {
    DB: D1Database;
}

// Cached instances per worker isolate
let cachedEnv: Env | null = null;
let cachedAuth: ReturnType<typeof betterAuth> | null = null;
let cachedDb: ReturnType<typeof drizzle> | null = null;

export function getDb(env: Env) {
    if (cachedDb && cachedEnv === env) return cachedDb;
    cachedEnv = env;
    cachedDb = drizzle(env.DB, { schema });
    return cachedDb;
}

export function getAuth(env: Env) {
    if (cachedAuth && cachedEnv === env) return cachedAuth;
    const db = getDb(env);

    cachedAuth = betterAuth({
        database: drizzleAdapter(db, {
            provider: 'sqlite'
        }),
        emailAndPassword: {
            enabled: true
        }
    });

    return cachedAuth;
}
