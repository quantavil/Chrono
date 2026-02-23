import { getAuth, type Env } from '../shared/auth';
import type { PagesFunction } from '@cloudflare/workers-types';

export const onRequest: PagesFunction<Env> = async (context) => {
    const auth = getAuth(context.env);
    return auth.handler(context.request as any) as any;
};
