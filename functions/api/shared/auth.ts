import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../../db/schema';

// This env interface corresponds to wrangler.toml definitions
export interface Env {
    DB: D1Database;
}

// Function to construct the auth instance using the exact request environment
export function getAuth(env: Env) {
    const db = drizzle(env.DB, { schema });

    return betterAuth({
        database: drizzleAdapter(db, {
            provider: 'sqlite'
        }),
        emailAndPassword: {
            enabled: true
        }
    });
}
