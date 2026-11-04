/**
 * Convierte la web en app instalable (PWA): registra el service worker y maneja el botón "Instalar app".
 * - Android y computador (Chrome, Edge): usa el aviso nativo de instalación.
 * - iPhone y iPad (Safari): no hay aviso automático, así que se explica cómo agregarla al inicio.
 */
import { toast } from '../lib/toast';

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };

const standalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
const ios = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* sin service worker la web funciona igual */
    });
  });
}

const buttons = () => Array.from(document.querySelectorAll<HTMLElement>('[data-install]'));
const show = (visible: boolean) => buttons().forEach((b) => b.classList.toggle('hidden', !visible));

let deferred: InstallPrompt | null = null;

// Ya instalada: no mostrar el botón. En iPhone se muestra siempre (no hay aviso automático).
if (!standalone() && ios()) show(true);

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferred = e as InstallPrompt;
  if (!standalone()) show(true);
});

window.addEventListener('appinstalled', () => {
  deferred = null;
  show(false);
  toast.success('App instalada', { description: 'Ya la tienes en tu pantalla de inicio.' });
});

document.addEventListener('click', async (e) => {
  const btn = (e.target as Element).closest?.('[data-install]');
  if (!btn) return;
  e.preventDefault();
  if (deferred) {
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === 'accepted') show(false);
    deferred = null;
    return;
  }
  if (ios()) {
    toast('Instálala en tu iPhone', {
      description: 'En Safari toca el botón Compartir (el cuadrado con la flecha) y luego "Agregar a inicio".',
      duration: 9000,
    });
    return;
  }
  toast('Instala la app desde tu navegador', {
    description: 'Abre el menú del navegador (⋮) y elige "Instalar app" o "Agregar a la pantalla de inicio".',
    duration: 9000,
  });
});
