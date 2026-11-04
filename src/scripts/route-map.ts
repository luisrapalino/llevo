/**
 * Mapa del paso "Ruta" del formulario: marcar recogida y entrega tocando el mapa,
 * arrastrando los pines o eligiendo una dirección sugerida (solo Valledupar).
 * El mapa (MapLibre) se descarga cuando el paso aparece en pantalla.
 */
import type { LngLat, Place, RouteMap } from '../lib/map';

type Kind = 'origen' | 'destino';

const wrap = document.querySelector<HTMLElement>('[data-route-map-wrap]');
const container = document.querySelector<HTMLElement>('[data-route-map]');

if (wrap && container) {
  const hint = wrap.querySelector<HTMLElement>('[data-map-hint]')!;
  const distance = wrap.querySelector<HTMLElement>('[data-map-distance]')!;
  const targetBtns = Array.from(wrap.querySelectorAll<HTMLButtonElement>('[data-map-target]'));
  const hidden: Record<Kind, HTMLInputElement> = {
    origen: document.querySelector('[data-geo-value]')!,
    destino: document.querySelector('[data-dest-value]')!,
  };
  const inputs: Record<Kind, HTMLInputElement> = {
    origen: document.querySelector('input[data-place="origen"]')!,
    destino: document.querySelector('input[data-place="destino"]')!,
  };
  const filledByMap: Record<Kind, boolean> = { origen: false, destino: false };
  let active: Kind = 'origen';
  let route: RouteMap | null = null;
  let mapLib: typeof import('../lib/map') | null = null;
  const pending: [Kind, LngLat][] = [];

  const label = (k: Kind) => (k === 'origen' ? 'la recogida' : 'la entrega');
  const setActive = (k: Kind) => {
    active = k;
    targetBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mapTarget === k)));
    hint.textContent = `Toca el mapa para marcar ${label(k)}, o escribe la dirección abajo`;
  };
  targetBtns.forEach((b) => b.addEventListener('click', () => setActive(b.dataset.mapTarget as Kind)));

  const updateDistance = () => {
    const a = route?.get('origen');
    const b = route?.get('destino');
    if (!a || !b || !mapLib) return;
    const km = mapLib.distanceKm(a, b);
    distance.querySelector('span')!.textContent = `≈ ${km.toLocaleString('es-CO', { maximumFractionDigits: 1 })} km en línea recta entre los dos puntos`;
    distance.classList.replace('hidden', 'flex');
  };

  /** Guarda el punto, mueve el pin y, si el campo está vacío, escribe la dirección aproximada. */
  async function place(kind: Kind, p: LngLat, opts: { fly?: boolean; fill?: boolean } = {}) {
    if (!route || !mapLib) {
      pending.push([kind, p]);
      return;
    }
    route.set(kind, p, { fly: opts.fly ?? true });
    hidden[kind].value = mapLib.mapsLink(p);
    updateDistance();
    if (opts.fill !== false && (!inputs[kind].value.trim() || filledByMap[kind])) {
      const found = await mapLib.reverseGeocode(p);
      if (found) {
        inputs[kind].value = [found.label, found.detail].filter(Boolean).join(', ');
        inputs[kind].removeAttribute('aria-invalid');
        filledByMap[kind] = true;
      }
    }
    if (kind === 'origen' && !route.get('destino')) setActive('destino');
  }

  async function init() {
    try {
      mapLib = await import('../lib/map');
      route = await mapLib.createRouteMap(container!, { expandEl: wrap! });
      wrap!.querySelector('[data-map-loading]')?.remove();
      route.map.on('click', (e) => place(active, { lng: e.lngLat.lng, lat: e.lngLat.lat }));
      route.onChange((kind, p) => place(kind, p, { fly: false }));
      pending.splice(0).forEach(([k, p]) => place(k, p));
    } catch {
      const loading = wrap!.querySelector('[data-map-loading]');
      if (loading) loading.textContent = 'No pudimos cargar el mapa. Puedes escribir la dirección abajo.';
    }
  }

  // Cargar el mapa solo cuando el paso de ruta se ve en pantalla
  const io = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) {
      io.disconnect();
      init();
    }
  });
  io.observe(container);

  // "Usar mi ubicación" también marca la recogida
  window.addEventListener('llevo:geo', (e) => {
    const { lat, lng } = (e as CustomEvent<LngLat>).detail;
    place('origen', { lat, lng });
  });

  // Sugerencias de dirección mientras escribes
  (Object.keys(inputs) as Kind[]).forEach((kind) => {
    const input = inputs[kind];
    const list = document.querySelector<HTMLUListElement>(`[data-suggest="${kind}"]`)!;
    let results: Place[] = [];
    let index = -1;
    let timer = 0;
    let ctrl: AbortController | null = null;

    const close = () => {
      list.classList.add('hidden');
      input.setAttribute('aria-expanded', 'false');
      index = -1;
    };
    const choose = (i: number) => {
      const r = results[i];
      if (!r) return;
      input.value = [r.label, r.detail].filter(Boolean).join(', ');
      filledByMap[kind] = false;
      close();
      setActive(kind);
      place(kind, r.point, { fill: false });
    };
    const paint = () => {
      list.innerHTML = '';
      results.forEach((r, i) => {
        const li = document.createElement('li');
        li.id = `${kind}-opcion-${i}`;
        li.setAttribute('role', 'option');
        li.setAttribute('aria-selected', String(i === index));
        li.className = 'flex cursor-pointer items-start gap-2.5 px-3 py-2 text-sm aria-selected:bg-brand-50 hover:bg-sand/60';
        li.innerHTML = `<svg viewBox="0 0 20 20" class="mt-0.5 size-4 shrink-0 text-ink-3" fill="currentColor"><path fill-rule="evenodd" d="M9.69 18.93l.03.01a.73.73 0 00.56 0l.03-.01a14 14 0 002.06-1.36c1.86-1.5 3.88-3.8 3.88-6.82a6.25 6.25 0 10-12.5 0c0 3.02 2.02 5.32 3.88 6.82a14 14 0 002.06 1.36zM10 13a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z"/></svg><span><span class="block font-semibold text-ink"></span><span class="block text-xs text-ink-3"></span></span>`;
        const [main, detail] = li.querySelectorAll('span > span');
        main.textContent = r.label;
        detail.textContent = r.detail;
        li.addEventListener('mousedown', (ev) => {
          ev.preventDefault();
          choose(i);
        });
        list.append(li);
      });
      const open = results.length > 0;
      list.classList.toggle('hidden', !open);
      input.setAttribute('aria-expanded', String(open));
      if (index >= 0) input.setAttribute('aria-activedescendant', `${kind}-opcion-${index}`);
      else input.removeAttribute('aria-activedescendant');
    };

    input.addEventListener('input', () => {
      filledByMap[kind] = false;
      window.clearTimeout(timer);
      const q = input.value.trim();
      if (q.length < 3) return close();
      timer = window.setTimeout(async () => {
        ctrl?.abort();
        ctrl = new AbortController();
        try {
          const lib = mapLib ?? (await import('../lib/map'));
          results = await lib.searchPlaces(`${q}, Valledupar`, ctrl.signal);
          index = -1;
          paint();
        } catch {
          /* búsqueda cancelada o sin conexión */
        }
      }, 300);
    });
    input.addEventListener('keydown', (e) => {
      if (list.classList.contains('hidden')) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        index = (index + (e.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length;
        paint();
      } else if (e.key === 'Enter' && index >= 0) {
        e.preventDefault();
        e.stopPropagation();
        choose(index);
      } else if (e.key === 'Escape') {
        close();
      }
    });
    input.addEventListener('blur', () => window.setTimeout(close, 120));
  });
}
