import type { APIRoute } from 'astro';
import { getVapid } from '../../../lib/push';
import { createAdminClient } from '../../../lib/supabase';

export const prerender = false;

/** Clave pública VAPID para que el navegador se suscriba. */
export const GET: APIRoute = async () => {
  const admin = createAdminClient();
  if (!admin) return new Response('No configurado', { status: 503 });
  const { publicKey } = await getVapid(admin);
  return new Response(JSON.stringify({ publicKey }), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
};
