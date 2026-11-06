import { defineMiddleware } from 'astro:middleware';
import { isPanelUserRole } from './lib/roles';
import { createSessionClient, panelStatus } from './lib/supabase';

const PUBLIC_PANEL = ['/panel/login', '/panel/bienvenida'];
const ADMIN_ONLY = ['/panel/configuracion', '/panel/usuarios'];

export const onRequest = defineMiddleware(async (ctx, next) => {
  ctx.locals.supabase = null;
  ctx.locals.user = null;
  ctx.locals.profile = null;

  const path = ctx.url.pathname.replace(/\/$/, '') || '/';
  if (!path.startsWith('/panel')) return next();

  const supabase = createSessionClient(ctx);
  ctx.locals.supabase = supabase;
  if (!supabase) {
    return path === '/panel/login' ? next() : ctx.redirect('/panel/login');
  }

  const { data } = await supabase.auth.getUser();
  if (data.user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email, full_name, role')
      .eq('id', data.user.id)
      .maybeSingle();
    ctx.locals.user = data.user;
    ctx.locals.profile = profile;
  }

  if (PUBLIC_PANEL.includes(path)) {
    if (ctx.locals.profile && isPanelUserRole(ctx.locals.profile.role)) return ctx.redirect('/panel');
    // Sin usuarios todavía: guía a crear el primer administrador.
    if (path === '/panel/login' && (await panelStatus()) === 'no-users') return ctx.redirect('/panel/bienvenida');
    return next();
  }
  if (!ctx.locals.profile) return ctx.redirect('/panel/login');
  if (!isPanelUserRole(ctx.locals.profile.role)) {
    return ctx.redirect(
      '/panel/login?error=' +
        encodeURIComponent('Esta cuenta no tiene acceso al panel de gestión. Usa la app o contacta a Llevo.'),
    );
  }
  if (ADMIN_ONLY.some((p) => path.startsWith(p)) && ctx.locals.profile.role !== 'admin') {
    return ctx.redirect('/panel?error=Solo%20un%20administrador%20puede%20entrar%20ah%C3%AD');
  }

  const res = await next();
  res.headers.set('Cache-Control', 'no-store');
  return res;
});
