import type { APIRoute } from 'astro';
import { createSessionClient } from '../../../lib/supabase';

export const prerender = false;

/** Solicitudes nuevas desde una fecha, para avisar en el panel abierto. */
export const GET: APIRoute = async (ctx) => {
  const db = createSessionClient(ctx);
  const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
  if (!db) return new Response('{}', { status: 503, headers });
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) return new Response('{}', { status: 401, headers });

  const since = ctx.url.searchParams.get('desde');
  const [{ count }, recent] = await Promise.all([
    db.from('requests').select('id', { count: 'exact', head: true }).eq('status', 'nueva'),
    since && !Number.isNaN(Date.parse(since))
      ? db.from('requests').select('id, code, customer_name, service, created_at').gt('created_at', since).order('created_at').limit(10)
      : Promise.resolve({ data: [] as any[] }),
  ]);
  return new Response(JSON.stringify({ nuevas: count ?? 0, items: recent.data ?? [], ahora: new Date().toISOString() }), { headers });
};
