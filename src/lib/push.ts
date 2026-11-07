/**
 * Notificaciones push (Web Push) para el equipo del panel.
 * Las claves VAPID se generan la primera vez y se guardan en `private_settings`,
 * una tabla que solo puede leer el servidor (service role).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import webpush from 'web-push';

interface Vapid {
  publicKey: string;
  privateKey: string;
}

let cached: Vapid | null = null;

export async function getVapid(admin: SupabaseClient): Promise<Vapid> {
  if (cached) return cached;
  const { data } = await admin.from('private_settings').select('value').eq('key', 'vapid').maybeSingle();
  if (data?.value?.publicKey && data?.value?.privateKey) {
    cached = data.value as Vapid;
    return cached;
  }
  const keys = webpush.generateVAPIDKeys();
  // Si dos solicitudes llegan a la vez, gana la primera que se guardó
  await admin.from('private_settings').upsert({ key: 'vapid', value: keys }, { onConflict: 'key', ignoreDuplicates: true });
  const { data: saved } = await admin.from('private_settings').select('value').eq('key', 'vapid').single();
  cached = saved!.value as Vapid;
  return cached;
}

export interface PushPayload {
  title: string;
  body: string;
  url: string;
  tag?: string;
  count?: number;
}

/** Envía una notificación a todas las suscripciones (o solo a las de un usuario). Nunca lanza errores. */
export async function sendPush(admin: SupabaseClient, payload: PushPayload, opts: { userId?: string } = {}) {
  try {
    const vapid = await getVapid(admin);
    webpush.setVapidDetails('mailto:hola@llevo.co', vapid.publicKey, vapid.privateKey);
    let q = admin.from('push_subscriptions').select('id, endpoint, p256dh, auth');
    if (opts.userId) q = q.eq('user_id', opts.userId);
    const { data: subs } = await q;
    let sent = 0;
    let removed = 0;
    let status: number | null = null;
    await Promise.all(
      (subs ?? []).map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            JSON.stringify(payload),
            { TTL: 60 * 60 * 12, urgency: 'high' },
          );
          sent++;
        } catch (err: any) {
          status = err?.statusCode ?? status;
          // Suscripción vencida o revocada: se borra para no seguir intentando con un celular que ya no escucha
          if (err?.statusCode === 404 || err?.statusCode === 410) {
            removed++;
            await admin.from('push_subscriptions').delete().eq('id', s.id);
          } else console.error('push', err?.statusCode, err?.body ?? err?.message);
        }
      }),
    );
    return { sent, total: subs?.length ?? 0, removed, status };
  } catch (err) {
    console.error('push', err);
    return { sent: 0, total: 0, removed: 0, status: null as number | null };
  }
}
