import { getAuth, getDb, type Env } from '../shared/auth';
import type { PagesFunction } from '@cloudflare/workers-types';
import * as schema from '../../db/schema';
import { eq } from 'drizzle-orm';

/** Whitelist of fields a client is allowed to set on a todo. */
const ALLOWED_TODO_FIELDS = [
    'id', 'title', 'description', 'notes', 'priority', 'is_completed',
    'accumulated_time', 'last_start_time', 'position', 'due_at',
    'estimated_time', 'completed_at', 'recurrence', 'tags', 'subtasks', 'list_id',
] as const;

/** Pick only whitelisted keys from an object. */
function pickAllowed(obj: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    for (const key of ALLOWED_TODO_FIELDS) {
        if (key in obj) result[key] = obj[key];
    }
    return result;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
    const auth = getAuth(context.env);
    const session = await auth.api.getSession({
        headers: context.request.headers as any
    });

    if (!session) {
        return new Response('Unauthorized', { status: 401 }) as any;
    }

    const db = getDb(context.env);

    try {
        const allTodos = await db.query.todos.findMany({
            where: eq(schema.todos.user_id, session.user.id),
            orderBy: (todos, { asc }) => [asc(todos.position)]
        });

        return Response.json({ data: allTodos }) as any;
    } catch (err: any) {
        return Response.json({ error: err.message }, { status: 500 }) as any;
    }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
    const auth = getAuth(context.env);
    const session = await auth.api.getSession({
        headers: context.request.headers as any
    });

    if (!session) {
        return new Response('Unauthorized', { status: 401 }) as any;
    }

    const db = getDb(context.env);

    try {
        const body = await context.request.json() as any;
        const safe = pickAllowed(body);
        const now = new Date().toISOString();

        const [newTodo] = await db.insert(schema.todos).values({
            ...safe,
            user_id: session.user.id,
            created_at: now,
            updated_at: now,
        }).returning();

        return Response.json({ data: newTodo }) as any;
    } catch (err: any) {
        return Response.json({ error: err.message }, { status: 500 }) as any;
    }
};

export const onRequestPatch: PagesFunction<Env> = async (context) => {
    const auth = getAuth(context.env);
    const session = await auth.api.getSession({
        headers: context.request.headers as any
    });

    if (!session) {
        return new Response('Unauthorized', { status: 401 }) as any;
    }

    const db = getDb(context.env);

    try {
        const body = await context.request.json();

        if (!Array.isArray(body)) {
            return Response.json({ error: 'Invalid payload: expected an array of updates' }, { status: 400 }) as any;
        }

        const updates = body as Array<{ id: string; updates: any }>;
        const now = new Date().toISOString();

        await db.batch(
            updates.map((update) =>
                db.update(schema.todos)
                    .set({ ...pickAllowed(update.updates), updated_at: now })
                    .where(eq(schema.todos.id, update.id))
            ) as any
        );

        return Response.json({ success: true }) as any;
    } catch (err: any) {
        return Response.json({ error: err.message }, { status: 500 }) as any;
    }
};
