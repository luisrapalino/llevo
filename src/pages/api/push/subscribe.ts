import type { APIRoute } from 'astro';
import { sendPush } from '../../../lib/push';
import { createAdminClient, createSessionClient } from '../../../lib/supabase';

export const prerender = false;

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

async function staff(ctx: Parameters<APIRoute>[0]) {
  const db = createSessionClient(ctx);
  if (!db) return null;
  const { data } = await db.auth.getUser();
  if (!data.user) return null;
  const { data: profile } = await db.from('profiles').select('id').eq('id', data.user.id).maybeSingle();
  return profile ? { db, userId: profile.id as string } : null;
}

/** Guarda la suscripción del navegador. Con { test: true } envía una notificación de prueba. */
export const POST: APIRoute = async (ctx) => {
  const who = await staff(ctx);
  if (!who) return json({ error: 'Sin sesión' }, 401);
  const body = await ctx.request.json().catch(() => ({}));

  if (body.test) {
    const admin = createAdminClient()!;
    const res = await sendPush(admin, { title: 'Notificaciones activadas', body: 'Así te avisaremos cuando llegue una solicitud nueva.', url: '/panel', tag: 'prueba' }, { userId: who.userId });
    return json(res);
  }

  const sub = body.subscription;
  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) return json({ error: 'Suscripción inválida' }, 400);
  const admin = createAdminClient()!;
  // Un mismo navegador puede haber estado suscrito con otra cuenta: se reasigna
  await admin.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
  const { error } = await who.db.from('push_subscriptions').insert({
    user_id: who.userId,
    endpoint: sub.endpoint,
    p256dh: sub.keys.p256dh,
    auth: sub.keys.auth,
    user_agent: ctx.request.headers.get('user-agent')?.slice(0, 200) ?? null,
  });
  return error ? json({ error: error.message }, 400) : json({ ok: true });
};

/** Borra la suscripción de este navegador. */
export const DELETE: APIRoute = async (ctx) => {
  const who = await staff(ctx);
  if (!who) return json({ error: 'Sin sesión' }, 401);
  const body = await ctx.request.json().catch(() => ({}));
  if (body.endpoint) await who.db.from('push_subscriptions').delete().eq('endpoint', body.endpoint);
  return json({ ok: true });
};
