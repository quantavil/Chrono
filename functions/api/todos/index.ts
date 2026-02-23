import { getAuth, type Env } from '../shared/auth';
import type { PagesFunction } from '@cloudflare/workers-types';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../../db/schema';
import { eq } from 'drizzle-orm';

export const onRequestGet: PagesFunction<Env> = async (context) => {
    const auth = getAuth(context.env);
    const session = await auth.api.getSession({
        headers: context.request.headers as any
    });

    if (!session) {
        return new Response('Unauthorized', { status: 401 }) as any;
    }

    const db = drizzle(context.env.DB, { schema });

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

    const db = drizzle(context.env.DB, { schema });

    try {
        const body = await context.request.json() as any;

        const [newTodo] = await db.insert(schema.todos).values({
            ...body,
            user_id: session.user.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }).returning();

        return Response.json({ data: newTodo }) as any;
    } catch (err: any) {
        return Response.json({ error: err.message }, { status: 500 }) as any;
    }
};

export const onRequestPatch: PagesFunction<Env> = async (context) => {
    // For batch updating
    const auth = getAuth(context.env);
    const session = await auth.api.getSession({
        headers: context.request.headers as any
    });

    if (!session) {
        return new Response('Unauthorized', { status: 401 }) as any;
    }

    const db = drizzle(context.env.DB, { schema });

    try {
        const updates = await context.request.json() as Array<{ id: string; updates: any }>;

        await db.batch(
            updates.map((update) =>
                db.update(schema.todos)
                    .set({ ...update.updates, updated_at: new Date().toISOString() })
                    .where(eq(schema.todos.id, update.id))
            ) as any
        );

        return Response.json({ success: true }) as any;
    } catch (err: any) {
        return Response.json({ error: err.message }, { status: 500 }) as any;
    }
};
