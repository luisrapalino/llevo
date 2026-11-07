/**
 * Panel "en vivo": avisa cuando llegan solicitudes nuevas.
 * - Con el panel abierto: consulta cada 30 s, muestra un aviso con "Ver", suena una campanita
 *   y actualiza el contador del menú y el número del ícono de la app.
 * - Con el panel cerrado: notificaciones push (si la persona las activó en este dispositivo).
 */
import { toast } from '../lib/toast';
import { chimeNew, setSoundEnabled, soundEnabled } from '../lib/sounds';

const POLL_MS = 30_000;
const seen = new Set<string>();
let since: string | null = null;
let busy = false;

type Item = { id: string; code: string; customer_name: string; service: string };
type Nav = Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };

function setCount(n: number) {
  document.querySelectorAll<HTMLElement>('[data-nav-count]').forEach((el) => {
    el.textContent = n > 99 ? '99+' : String(n);
    el.classList.toggle('hidden', n === 0);
  });
  const nav = navigator as Nav;
  if (n > 0) nav.setAppBadge?.(n).catch(() => { });
  else nav.clearAppBadge?.().catch(() => { });
}

function announce(items: Item[]) {
  const fresh = items.filter((i) => !seen.has(i.id));
  fresh.forEach((i) => seen.add(i.id));
  if (!fresh.length) return;
  chimeNew();
  if (fresh.length > 2) {
    toast(`${fresh.length} solicitudes nuevas`, {
      description: fresh.map((i) => i.customer_name).join(', '),
      action: { label: 'Ver', onClick: () => location.assign('/panel/solicitudes?estado=nueva') },
      duration: 12000,
    });
    return;
  }
  fresh.forEach((i) =>
    toast(`Nueva solicitud · ${i.service}`, {
      description: `${i.customer_name} · ${i.code}`,
      action: { label: 'Ver', onClick: () => location.assign(`/panel/solicitudes/${i.id}`) },
      duration: 12000,
    }),
  );
}

async function check() {
  if (busy) return;
  busy = true;
  try {
    const res = await fetch(`/api/panel/novedades${since ? `?desde=${encodeURIComponent(since)}` : ''}`, { cache: 'no-store' });
    if (!res.ok) return;
    const data: { nuevas: number; items: Item[]; ahora: string } = await res.json();
    setCount(data.nuevas);
    if (since) announce(data.items);
    since = data.ahora; // hora del servidor: no depende del reloj del dispositivo
  } catch {
    /* sin conexión: se intenta en la siguiente vuelta */
  } finally {
    busy = false;
  }
}

check();
window.setInterval(() => document.visibilityState === 'visible' && check(), POLL_MS);
document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && check());
navigator.serviceWorker?.addEventListener('message', (e) => {
  if (e.data?.type === 'llevo:push') check();
});

/* ---------- Sonido ---------- */
const soundBtns = () => Array.from(document.querySelectorAll<HTMLButtonElement>('[data-sound-toggle]'));
function paintSound() {
  const on = soundEnabled();
  soundBtns().forEach((b) => {
    b.setAttribute('aria-pressed', String(on));
    b.querySelector('[data-state]')!.textContent = on ? 'Sonido activado' : 'Sonido apagado';
  });
}
soundBtns().forEach((b) =>
  b.addEventListener('click', () => {
    setSoundEnabled(!soundEnabled());
    paintSound();
    if (soundEnabled()) chimeNew(true);
  }),
);
paintSound();

/* ---------- Notificaciones push ---------- */
const pushBtns = () => Array.from(document.querySelectorAll<HTMLButtonElement>('[data-push-toggle]'));
const standalone = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
const ios = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const supported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
const CONFIRMED = 'llevo-aviso';

function b64ToBytes(b64: string) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

function confirmedEndpoint() {
  try {
    return localStorage.getItem(CONFIRMED);
  } catch {
    return null;
  }
}

function rememberEndpoint(endpoint: string | null) {
  try {
    if (endpoint) localStorage.setItem(CONFIRMED, endpoint);
    else localStorage.removeItem(CONFIRMED);
  } catch {
    /* modo privado: el botón igual dice la verdad en esta visita */
  }
}

async function registration() {
  if (!supported()) return null;
  return navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).catch(() => null);
}

async function currentSub() {
  const reg = (await registration()) ?? (await navigator.serviceWorker?.getRegistration());
  return (await reg?.pushManager.getSubscription()) ?? null;
}

type PushState = 'on' | 'off' | 'confirm' | 'unsynced' | 'denied' | 'install' | 'unsupported';
async function pushState(): Promise<PushState> {
  if (!supported()) return ios() && !standalone() ? 'install' : 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  const sub = await currentSub();
  if (Notification.permission === 'granted' && !sub) return 'confirm';
  if (sub && sub.endpoint === confirmedEndpoint()) return 'on';
  if (sub) return 'unsynced';
  return 'off';
}

const LABELS: Record<PushState, string> = {
  on: 'Avisos activados',
  off: 'Activar avisos',
  confirm: 'Confirmar avisos',
  unsynced: 'Reintentar avisos',
  denied: 'Avisos bloqueados',
  install: 'Activar avisos',
  unsupported: 'Avisos no disponibles',
};

const HINTS: Partial<Record<PushState, string>> = {
  confirm: 'El teléfono permitió los avisos, falta confirmarlos aquí',
  unsynced: 'Este celular no está recibiendo avisos',
  denied: 'Los avisos están bloqueados en el teléfono',
  install: 'Instala la app del panel para recibir avisos',
};

async function paintPush() {
  const state = await pushState();
  const hint = HINTS[state] ?? null;
  pushBtns().forEach((b) => {
    b.dataset.pushState = state;
    b.setAttribute('aria-pressed', String(state === 'on'));
    const label = b.querySelector('[data-state]');
    if (!label) return;
    if (b.hasAttribute('data-push-hint')) {
      b.hidden = !hint;
      if (hint) label.textContent = hint;
      return;
    }
    label.textContent = LABELS[state];
  });
  return state;
}

/** Brave bloquea por defecto el servicio de avisos push (usa el de Google y viene apagado). */
async function isBrave() {
  try {
    return !!(await (navigator as unknown as { brave?: { isBrave?: () => Promise<boolean> } }).brave?.isBrave?.());
  } catch {
    return false;
  }
}
const BRAVE_HELP = {
  description:
    'En Brave abre Configuración → Privacidad y seguridad y activa "Usar los servicios de Google para la mensajería push". Luego desactiva y vuelve a activar los avisos aquí. En Chrome funcionan sin cambiar nada.',
  duration: 20000,
};

async function postSub(sub: PushSubscription) {
  const save = await fetch('/api/push/subscribe', {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscription: sub.toJSON() }),
  });
  if (!save.ok) {
    const body = await save.json().catch(() => ({}));
    throw new Error(body.error || 'No se guardó la suscripción');
  }
}

async function subscribeTo(reg: ServiceWorkerRegistration, publicKey: string, fresh: boolean) {
  let sub = await reg.pushManager.getSubscription();
  if (fresh && sub) {
    await fetch('/api/push/subscribe', {
      method: 'DELETE',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    }).catch(() => { });
    await sub.unsubscribe().catch(() => { });
    sub = null;
  }
  if (sub) return sub;
  try {
    return await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(publicKey) });
  } catch (err) {
    if (await isBrave()) {
      toast.error('Brave tiene bloqueados los avisos', BRAVE_HELP);
      return null;
    }
    if (err instanceof Error && /push service not available/i.test(err.message)) {
      toast.error('Este navegador no puede enviar avisos', {
        description: 'Actívalos desde Chrome o desde la app del panel instalada en el celular.',
        duration: 10000,
      });
      return null;
    }
    throw err;
  }
}

async function enablePush(fresh = false) {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    toast.error('No diste permiso para los avisos', { description: 'Puedes activarlos luego desde la configuración del navegador.' });
    return;
  }
  const keyRes = await fetch('/api/push/key', { cache: 'no-store' });
  if (!keyRes.ok) throw new Error('Sin clave');
  const { publicKey } = await keyRes.json();
  await registration();
  const reg = await navigator.serviceWorker.ready;
  let sub = await subscribeTo(reg, publicKey, fresh);
  if (!sub) return;
  await postSub(sub);
  let test: { sent?: number; removed?: number } = await fetch('/api/push/subscribe', {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ test: true }),
  })
    .then((r) => r.json())
    .catch(() => ({ sent: 0 }));
  // La suscripción vieja del celular ya no existe en el servicio de avisos: se pide una nueva, una sola vez
  if (test.removed && !fresh) {
    sub = await subscribeTo(reg, publicKey, true);
    if (!sub) return;
    await postSub(sub);
    test = await fetch('/api/push/subscribe', {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: true }),
    })
      .then((r) => r.json())
      .catch(() => ({ sent: 0 }));
  }
  if (!test.sent) {
    if (test.removed) {
      await sub.unsubscribe().catch(() => { });
      rememberEndpoint(null);
    }
    toast.warning('El aviso de prueba no llegó', {
      description: 'La suscripción no quedó aceptada. Espera un momento y toca otra vez.',
      duration: 10000,
    });
    return;
  }
  rememberEndpoint(sub.endpoint);
  if (await isBrave()) {
    // En Brave la suscripción puede funcionar y aun así no llegar nada con la app cerrada
    toast('Avisos activados (Brave)', {
      description: `Si no te llega la notificación de prueba en unos segundos: ${BRAVE_HELP.description}`,
      duration: 20000,
    });
    return;
  }
  toast.success('Avisos activados', { description: 'Te tiene que llegar ahora una notificación de prueba. Si no aparece, el teléfono la está bloqueando.' });
}

async function disablePush() {
  const sub = await currentSub();
  if (sub) {
    await fetch('/api/push/subscribe', {
      method: 'DELETE',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    }).catch(() => { });
    await sub.unsubscribe();
  }
  rememberEndpoint(null);
  toast('Avisos desactivados en este dispositivo');
}

/** Si este aparato ya tiene suscripción, la vuelve a guardar. No manda prueba: eso solo pasa al tocar el botón. */
async function syncPush() {
  if (!supported() || Notification.permission !== 'granted') return;
  const sub = await currentSub();
  if (!sub) return;
  await postSub(sub).catch(() => { });
}

pushBtns().forEach((b) =>
  b.addEventListener('click', async () => {
    const state = b.dataset.pushState as PushState;
    if (state === 'install') {
      toast('Primero instala el panel', {
        description: 'En iPhone los avisos solo funcionan con la app instalada: en Safari toca Compartir y luego "Agregar a inicio". Ábrela desde ahí y activa los avisos.',
        duration: 10000,
      });
      return;
    }
    if (state === 'unsupported') {
      toast('Este navegador no permite avisos', { description: 'Prueba con Chrome, Edge, Firefox o Safari actualizado.' });
      return;
    }
    if (state === 'denied') {
      toast('Los avisos están bloqueados', {
        description: 'Toca el candado junto a la dirección de la página y permite las notificaciones. Luego vuelve a intentarlo.',
        duration: 10000,
      });
      return;
    }
    pushBtns().forEach((x) => (x.disabled = true));
    try {
      if (state === 'on') await disablePush();
      else await enablePush(state === 'unsynced');
    } catch (err) {
      const description = err instanceof Error && err.message !== 'Sin clave' ? err.message : 'Revisa tu conexión e inténtalo de nuevo.';
      toast.error('No pudimos activar los avisos', { description });
    } finally {
      pushBtns().forEach((x) => (x.disabled = false));
      paintPush();
    }
  }),
);
syncPush().finally(() => paintPush());
