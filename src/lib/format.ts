const TZ = 'America/Bogota';

/** Fecha de hoy (YYYY-MM-DD) en la zona horaria del negocio. */
export const todayISO = () => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());

export const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const fmtDate = (iso: string | null | undefined, opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' }) =>
  iso ? cap(new Intl.DateTimeFormat('es-CO', { ...opts, timeZone: 'UTC' }).format(new Date(`${iso.slice(0, 10)}T12:00:00Z`))) : '—';

export const fmtDateTime = (ts: string | null | undefined) =>
  ts
    ? new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: TZ }).format(new Date(ts))
    : '—';

export const timeAgo = (ts: string) => {
  const s = Math.round((Date.now() - new Date(ts).getTime()) / 1000);
  const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });
  if (s < 60) return 'hace un momento';
  if (s < 3600) return rtf.format(-Math.round(s / 60), 'minute');
  if (s < 86400) return rtf.format(-Math.round(s / 3600), 'hour');
  return rtf.format(-Math.round(s / 86400), 'day');
};

export const capitalize = cap;

export const shortSlot = (slot: string) => slot.replace(/\s*\(.*\)/, '');
