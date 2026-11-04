/**
 * Miniaturas de las solicitudes para las listas del panel.
 * Al enviar el formulario se sube una miniatura de la primera foto (`<id>/miniatura.jpg`, 240 px).
 * Las solicitudes anteriores no la tienen: en ese caso se usa la primera foto.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { PHOTOS_BUCKET } from './supabase';

export const thumbPath = (id: string) => `${id}/miniatura.jpg`;

export async function thumbUrls(db: SupabaseClient, rows: { id: string; photos?: string[] | null }[]): Promise<Record<string, string>> {
  const withPhotos = rows.filter((r) => r.photos?.length);
  if (!withPhotos.length) return {};
  const paths = withPhotos.flatMap((r) => [thumbPath(r.id), r.photos![0]]);
  const { data } = await db.storage.from(PHOTOS_BUCKET).createSignedUrls(paths, 3600);
  const ok = new Map((data ?? []).filter((d) => d.signedUrl && !d.error).map((d) => [d.path, d.signedUrl]));
  const out: Record<string, string> = {};
  for (const r of withPhotos) {
    const url = ok.get(thumbPath(r.id)) ?? ok.get(r.photos![0]);
    if (url) out[r.id] = url;
  }
  return out;
}
