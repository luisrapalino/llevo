// Service worker de Llevo: hace la web instalable, la acelera y muestra una página sin conexión.
// Nunca guarda en caché el panel ni la API (información privada y siempre al día).
const VERSION = 'llevo-v10';
const STATIC = `${VERSION}-static`;
const PAGES = `${VERSION}-pages`;
const PRECACHE = ['/offline.html', '/brand/llevo-logo.svg', '/favicon.svg', '/icons/icon-192.png', '/icons/panel-192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(STATIC).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const isAsset = (url) =>
  url.pathname.startsWith('/_astro/') ||
  url.pathname.startsWith('/brand/') ||
  url.pathname.startsWith('/icons/') ||
  /\.(woff2?|png|svg|webp|jpg)$/.test(url.pathname);

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // mapas, búsqueda y Supabase van directo
  if (url.pathname.startsWith('/api/')) return;

  // Archivos con huella (no cambian): primero la caché
  if (isAsset(url)) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            if (res.ok) caches.open(STATIC).then((c) => c.put(request, res.clone()));
            return res;
          }),
      ),
    );
    return;
  }

  // Páginas: primero la red; sin conexión, la última copia de la web pública o la página sin conexión
  if (request.mode === 'navigate') {
    const isPanel = url.pathname.startsWith('/panel');
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok && !isPanel) caches.open(PAGES).then((c) => c.put(url.pathname, res.clone()));
          return res;
        })
        .catch(async () => (!isPanel && (await caches.match(url.pathname))) || caches.match('/offline.html')),
    );
  }
});

// Notificaciones del panel: llega una solicitud nueva → aviso en el celular o el computador.
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'Llevo', body: event.data ? event.data.text() : '' };
  }
  const title = data.title || 'Nueva solicitud';
  const url = data.url || '/panel/solicitudes';
  event.waitUntil(
    (async () => {
      // Primero avisar al panel abierto (actualiza contador y lista), luego la notificación
      const open = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      open.forEach((c) => c.postMessage({ type: 'llevo:push', payload: data }));
      if (typeof data.count === 'number' && self.navigator.setAppBadge) {
        await self.navigator.setAppBadge(data.count).catch(() => {});
      }
      await self.registration.showNotification(title, {
        body: data.body || 'Tienes una solicitud nueva en Llevo.',
        icon: '/icons/panel-192.png',
        badge: '/icons/badge-96.png',
        tag: data.tag || 'llevo',
        renotify: true,
        data: { url },
      });
    })(),
  );
});

// Tocar la notificación abre (o enfoca) el panel en esa solicitud.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/panel', self.location.origin).href;
  event.waitUntil(
    (async () => {
      const open = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const panel = open.find((c) => new URL(c.url).pathname.startsWith('/panel')) || open[0];
      if (panel) {
        await panel.focus();
        return panel.navigate ? panel.navigate(target) : undefined;
      }
      return self.clients.openWindow(target);
    })(),
  );
});
