/**
 * Miniaturas de las solicitudes para las listas del panel.
 * Al enviar el formulario se sube una miniatura de la primera foto (`<id>/miniatura.jpg`, 240 px).
 * Las solicitudes anteriores no la tienen: en ese caso se usa la primera foto.
 */
export const thumbPath = (id: string) => `${id}/miniatura.jpg`;

/** Dirección estable (cacheable) de una foto del panel. */
export const photoUrl = (path: string) => `/api/foto/${path}`;

/** Miniaturas para las listas: dirección estable que sirve la miniatura o, si no existe, la primera foto. */
export function thumbUrls(rows: { id: string; photos?: string[] | null }[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const r of rows) if (r.photos?.length) out[r.id] = `/api/foto/miniatura/${r.id}?f=${encodeURIComponent(r.photos[0])}`;
  return out;
}
