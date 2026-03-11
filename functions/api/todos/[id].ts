import { getAuth, getDb, type Env } from '../shared/auth';
import * as schema from '../../db/schema';
import { eq, and } from 'drizzle-orm';

/** Whitelist of fields a client is allowed to update on a todo. */
const ALLOWED_UPDATE_FIELDS = [
    'title', 'description', 'notes', 'priority', 'is_completed',
    'accumulated_time', 'last_start_time', 'position', 'due_at',
    'estimated_time', 'completed_at', 'recurrence', 'tags', 'subtasks', 'list_id',
] as const;

function pickAllowed(obj: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    for (const key of ALLOWED_UPDATE_FIELDS) {
        if (key in obj) result[key] = obj[key];
    }
    return result;
}

export const onRequestPatch: PagesFunction<Env, 'id'> = async (context) => {
    const auth = getAuth(context.env);
    const session = await auth.api.getSession({
        headers: context.request.headers
    });

    if (!session) {
        return new Response('Unauthorized', { status: 401 });
    }

    const todoId = context.params.id as string;
    const db = getDb(context.env);

    try {
        const body = await context.request.json() as any;
        const safe = pickAllowed(body);

        const [updatedTodo] = await db.update(schema.todos)
            .set({ ...safe, updated_at: new Date().toISOString() })
            .where(
                and(
                    eq(schema.todos.id, todoId),
                    eq(schema.todos.user_id, session.user.id)
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
    const db = getDb(context.env);

    try {
        await db.delete(schema.todos)
            .where(
                and(
                    eq(schema.todos.id, todoId),
                    eq(schema.todos.user_id, session.user.id)
                )
            );

        return Response.json({ success: true });
    } catch (err: any) {
        return Response.json({ error: err.message }, { status: 500 });
    }
};
