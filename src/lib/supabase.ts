import { createServerClient, parseCookieHeader } from '@supabase/ssr';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { AstroCookies } from 'astro';

// Acepta los nombres propios del proyecto y los que crea la integración de Supabase en Vercel.
const pick = (...values: (string | undefined)[]) => values.find((v) => v && v.trim()) || undefined;
const penv = (typeof process !== 'undefined' ? process.env : {}) as Record<string, string | undefined>;

const url = pick(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.SUPABASE_URL,
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL,
  penv.PUBLIC_SUPABASE_URL,
  penv.SUPABASE_URL,
  penv.NEXT_PUBLIC_SUPABASE_URL,
);
const anonKey = pick(
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
  import.meta.env.SUPABASE_ANON_KEY,
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  penv.PUBLIC_SUPABASE_ANON_KEY,
  penv.SUPABASE_ANON_KEY,
  penv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);
const serviceKey = pick(import.meta.env.SUPABASE_SERVICE_ROLE_KEY, penv.SUPABASE_SERVICE_ROLE_KEY);

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
