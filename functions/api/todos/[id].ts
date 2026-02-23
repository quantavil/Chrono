import { getAuth, type Env } from '../shared/auth';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../../db/schema';
import { eq, and } from 'drizzle-orm';

export const onRequestPatch: PagesFunction<Env, 'id'> = async (context) => {
    const auth = getAuth(context.env);
    const session = await auth.api.getSession({
        headers: context.request.headers
    });

    if (!session) {
        return new Response('Unauthorized', { status: 401 });
    }

    const todoId = context.params.id as string;
    const db = drizzle(context.env.DB, { schema });

    try {
        const body = await context.request.json() as any;

        const [updatedTodo] = await db.update(schema.todos)
            .set({ ...body, updated_at: new Date().toISOString() })
            .where(
                and(
                    eq(schema.todos.id, todoId),
                    eq(schema.todos.user_id, session.user.id) // Security check
                )
            )
            .returning();

        if (!updatedTodo) {
            return new Response('Not Found or Unauthorized', { status: 404 });
        }

        return Response.json({ data: updatedTodo });
    } catch (err: any) {
        return Response.json({ error: err.message }, { status: 500 });
    }
};

export const onRequestDelete: PagesFunction<Env, 'id'> = async (context) => {
    const auth = getAuth(context.env);
    const session = await auth.api.getSession({
        headers: context.request.headers
    });

    if (!session) {
        return new Response('Unauthorized', { status: 401 });
    }

    const todoId = context.params.id as string;
    const db = drizzle(context.env.DB, { schema });

    try {
        await db.delete(schema.todos)
            .where(
                and(
                    eq(schema.todos.id, todoId),
                    eq(schema.todos.user_id, session.user.id) // Security check
                )
            );

        return Response.json({ success: true });
    } catch (err: any) {
        return Response.json({ error: err.message }, { status: 500 });
    }
};
