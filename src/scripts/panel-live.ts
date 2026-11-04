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
  if (n > 0) nav.setAppBadge?.(n).catch(() => {});
  else nav.clearAppBadge?.().catch(() => {});
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

function b64ToBytes(b64: string) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function currentSub() {
  if (!supported()) return null;
  const reg = await navigator.serviceWorker.getRegistration('/');
  return (await reg?.pushManager.getSubscription()) ?? null;
}

type PushState = 'on' | 'off' | 'denied' | 'install' | 'unsupported';
async function pushState(): Promise<PushState> {
  if (!supported()) return ios() && !standalone() ? 'install' : 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  return (await currentSub()) && Notification.permission === 'granted' ? 'on' : 'off';
}

const LABELS: Record<PushState, string> = {
  on: 'Avisos activados',
  off: 'Activar avisos',
  denied: 'Avisos bloqueados',
  install: 'Activar avisos',
  unsupported: 'Avisos no disponibles',
};

async function paintPush() {
  const state = await pushState();
  pushBtns().forEach((b) => {
    b.dataset.pushState = state;
    b.setAttribute('aria-pressed', String(state === 'on'));
    b.querySelector('[data-state]')!.textContent = LABELS[state];
  });
  return state;
}

async function enablePush() {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    toast.error('No diste permiso para los avisos', { description: 'Puedes activarlos luego desde la configuración del navegador.' });
    return;
  }
  const keyRes = await fetch('/api/push/key');
  if (!keyRes.ok) throw new Error('Sin clave');
  const { publicKey } = await keyRes.json();
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(publicKey) });
  const save = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscription: sub.toJSON() }),
  });
  if (!save.ok) {
    await sub.unsubscribe();
    throw new Error('No se guardó');
  }
  await fetch('/api/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ test: true }) });
  toast.success('Avisos activados', { description: 'Te llegará una notificación cada vez que entre una solicitud, aunque el panel esté cerrado.' });
}

async function disablePush() {
  const sub = await currentSub();
  if (sub) {
    await fetch('/api/push/subscribe', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    }).catch(() => {});
    await sub.unsubscribe();
  }
  toast('Avisos desactivados en este dispositivo');
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
    b.disabled = true;
    try {
      if (state === 'on') await disablePush();
      else await enablePush();
    } catch {
      toast.error('No pudimos activar los avisos', { description: 'Revisa tu conexión e inténtalo de nuevo.' });
    } finally {
      b.disabled = false;
      paintPush();
    }
  }),
);
paintPush();
