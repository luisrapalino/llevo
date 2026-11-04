import type { APIRoute } from 'astro';
import { createSessionClient, PHOTOS_BUCKET } from '../../../lib/supabase';
import { thumbPath } from '../../../lib/thumbs';

export const prerender = false;

/**
 * Dirección estable para las fotos privadas del panel.
 * Supabase entrega enlaces firmados que cambian en cada visita, así el navegador nunca reutilizaba
 * lo descargado. Esta ruta siempre es la misma: redirige al enlace firmado y el navegador guarda
 * la redirección (y la foto) por casi una hora.
 *
 *   /api/foto/<id>/1.jpg            → esa foto
 *   /api/foto/miniatura/<id>?f=...  → la miniatura; si no existe, la foto `f`
 */
export const GET: APIRoute = async (ctx) => {
  const db = createSessionClient(ctx);
  if (!db) return new Response(null, { status: 503 });
  const { data } = await db.auth.getUser();
  if (!data.user) return new Response(null, { status: 401 });

  const path = ctx.params.path ?? '';
  const storage = db.storage.from(PHOTOS_BUCKET);
  let candidates: string[];
  const thumb = /^miniatura\/([0-9a-f-]{36})$/.exec(path);
  if (thumb) {
    const fallback = ctx.url.searchParams.get('f');
    candidates = [thumbPath(thumb[1]), ...(fallback?.startsWith(`${thumb[1]}/`) ? [fallback] : [])];
  } else {
    candidates = [path];
  }

  for (const p of candidates) {
    const { data: signed } = await storage.createSignedUrl(p, 3600);
    if (signed?.signedUrl) {
      return new Response(null, {
        status: 302,
        headers: { Location: signed.signedUrl, 'Cache-Control': 'private, max-age=3300' },
      });
    }
  }
  return new Response(null, { status: 404, headers: { 'Cache-Control': 'private, max-age=60' } });
};
