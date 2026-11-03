import { createServerClient, parseCookieHeader } from '@supabase/ssr';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { AstroCookies } from 'astro';

const url = import.meta.env.PUBLIC_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string | undefined;
const serviceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && anonKey && serviceKey);

export const PHOTOS_BUCKET = 'request-photos';

/** Cliente con la sesión del usuario (cookies). Respeta RLS. */
export function createSessionClient(ctx: { request: Request; cookies: AstroCookies }): SupabaseClient | null {
  if (!url || !anonKey) return null;
  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () =>
        parseCookieHeader(ctx.request.headers.get('Cookie') ?? '').map((c) => ({ name: c.name, value: c.value ?? '' })),
      setAll: (list) => list.forEach(({ name, value, options }) => ctx.cookies.set(name, value, options)),
    },
  });
}

/** Cliente con permisos totales. SOLO en el servidor (API pública y tareas de admin). */
export function createAdminClient(): SupabaseClient | null {
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}
