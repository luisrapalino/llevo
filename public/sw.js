// Service worker de Llevo: hace la web instalable, la acelera y muestra una página sin conexión.
// Nunca guarda en caché el panel ni la API (información privada y siempre al día).
const VERSION = 'llevo-v1';
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
