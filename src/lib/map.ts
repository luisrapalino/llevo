/**
 * Mapa minimalista de Llevo: MapLibre + OpenFreeMap (estilo Positron) teñido con la marca,
 * pines propios (aro = recogida, bandera = entrega) y la línea de ruta punteada.
 * Búsqueda de direcciones con Photon (OpenStreetMap), limitada a Valledupar.
 * Todo se carga bajo demanda para no pesar en la portada.
 */
import type { Map as MLMap, Marker } from 'maplibre-gl';

export type LngLat = { lng: number; lat: number };

/** Zona de servicio: Valledupar (con un margen alrededor del casco urbano). */
export const SERVICE_AREA = {
  center: { lng: -73.2532, lat: 10.4631 } as LngLat,
  bbox: [-73.34, 10.39, -73.17, 10.54] as [number, number, number, number],
};

const STYLE = 'https://tiles.openfreemap.org/styles/positron';
const PHOTON = 'https://photon.komoot.io';

const C = {
  cream: '#FFFAF1',
  land: '#F6F1E7',
  park: '#E9F0DF',
  water: '#D6E2FF',
  building: '#EFE9DD',
  road: '#FFFFFF',
  roadCasing: '#E6DFD2',
  text: '#4A5470',
  ink: '#14213D',
  blue: '#2F5BEA',
};

let maplibre: typeof import('maplibre-gl') | null = null;
async function lib() {
  if (!maplibre) {
    const [m] = await Promise.all([import('maplibre-gl'), import('maplibre-gl/dist/maplibre-gl.css')]);
    maplibre = (m as any).default ?? m;
  }
  return maplibre!;
}

/** Tiñe el estilo Positron con los colores de la marca (ignora capas que no existan). */
function recolor(map: MLMap) {
  const paint: [string, string, unknown][] = [
    ['background', 'background-color', C.cream],
    ['landuse_residential', 'fill-color', C.land],
    ['park', 'fill-color', C.park],
    ['landcover_wood', 'fill-color', C.park],
    ['water', 'fill-color', C.water],
    ['waterway', 'line-color', C.water],
    ['building', 'fill-color', C.building],
    ['building', 'fill-outline-color', C.roadCasing],
    ['highway_minor', 'line-color', C.road],
    ['highway_major_casing', 'line-color', C.roadCasing],
    ['highway_major_inner', 'line-color', C.road],
    ['highway_motorway_casing', 'line-color', C.roadCasing],
    ['highway_motorway_inner', 'line-color', C.road],
  ];
  for (const [layer, prop, value] of paint) {
    try {
      if (map.getLayer(layer)) map.setPaintProperty(layer, prop as any, value);
    } catch {
      /* capa o propiedad no disponible en esta versión del estilo */
    }
  }
  for (const layer of map.getStyle().layers ?? []) {
    if (layer.type !== 'symbol') continue;
    try {
      map.setPaintProperty(layer.id, 'text-color', C.text);
      map.setPaintProperty(layer.id, 'text-halo-color', C.cream);
    } catch {
      /* sin texto */
    }
  }
}

/** Pin de recogida (aro) o de entrega (bandera azul), con una sombra suave. */
function pin(kind: 'origen' | 'destino') {
  const el = document.createElement('div');
  el.className = 'llevo-pin';
  el.setAttribute('aria-label', kind === 'origen' ? 'Punto de recogida' : 'Punto de entrega');
  el.innerHTML =
    kind === 'origen'
      ? `<svg width="30" height="30" viewBox="0 0 30 30"><circle cx="15" cy="15" r="10" fill="#fff" stroke="${C.ink}" stroke-width="5"/></svg>`
      : `<svg width="34" height="42" viewBox="0 0 34 42"><path d="M17 41c-1-6-14-14-14-25a14 14 0 1 1 28 0c0 11-13 19-14 25z" fill="${C.blue}"/><path d="M12 10h1.8v14H12zM13.8 10.5h9l-2.2 3 2.2 3h-9z" fill="#fff"/></svg>`;
  return el;
}

const ICON_EXPAND = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.75 9V5.25A1.5 1.5 0 015.25 3.75H9M15 3.75h3.75a1.5 1.5 0 011.5 1.5V9M20.25 15v3.75a1.5 1.5 0 01-1.5 1.5H15M9 20.25H5.25a1.5 1.5 0 01-1.5-1.5V15"/></svg>';
const ICON_CLOSE = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 18L18 6M6 6l12 12"/></svg>';

/**
 * Botón "Ampliar": abre el mapa en una ventana grande bajo la barra del logo (se mueve y acerca con un dedo);
 * se cierra con la X, con Esc o tocando fuera.
 * El mapa se mueve al <body> mientras está ampliado, así ningún contenedor con transform o overflow lo recorta.
 */
function expandControl(map: MLMap, container: HTMLElement, refit: () => void) {
  // `container` es lo que se amplía: el mapa solo, o el mapa con sus controles (formulario)
  const box = document.createElement('div');
  box.className = 'maplibregl-ctrl maplibregl-ctrl-group';
  const btn = document.createElement('button');
  btn.type = 'button';
  box.append(btn);
  const marker = document.createComment('mapa');
  const backdrop = document.createElement('div');
  backdrop.className = 'llevo-map-backdrop';
  backdrop.addEventListener('click', () => toggle(false));
  let open = false;

  const paint = () => {
    btn.innerHTML = open ? ICON_CLOSE : ICON_EXPAND;
    btn.title = open ? 'Cerrar mapa' : 'Ampliar mapa';
    btn.setAttribute('aria-label', btn.title);
    btn.style.cssText = 'display:grid;place-items:center;color:#14213D';
  };
  const onKey = (e: KeyboardEvent) => e.key === 'Escape' && toggle(false);

  /** Cambia el DOM entre recuadro y ventana grande (sin animación). */
  function apply(on: boolean) {
    if (on) {
      container.before(marker);
      document.body.append(backdrop, container);
      document.addEventListener('keydown', onKey);
    } else {
      marker.replaceWith(container);
      backdrop.remove();
      document.removeEventListener('keydown', onKey);
    }
    container.classList.toggle('llevo-map-full', on);
    document.documentElement.classList.toggle('overflow-hidden', on);
    const coop = (map as any).cooperativeGestures;
    if (coop) on ? coop.disable() : coop.enable();
    paint();
    map.resize();
  }

  /**
   * Ampliar / cerrar con transición compartida: el recuadro crece hasta la ventana grande
   * (y vuelve). El mapa se ve a escala real mientras la caja se abre, como una ventana que se agranda.
   */
  async function toggle(on = !open) {
    if (on === open) return;
    open = on;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!('startViewTransition' in document) || reduce) {
      apply(on);
      requestAnimationFrame(refit);
      return;
    }
    const html = document.documentElement;
    html.classList.add('vt-mapa', on ? 'vt-mapa-open' : 'vt-mapa-close');
    // Si se amplía un bloque con el mapa y sus controles (formulario), cada parte viaja por separado:
    // la tarjeta (fondo), la barra de arriba y el mapa. Así la barra no se recorta ni aparece de golpe.
    const mapEl = map.getContainer();
    const named: HTMLElement[] = [];
    const name = (el: HTMLElement | null | undefined, n: string) => {
      if (!el) return;
      el.style.viewTransitionName = n;
      named.push(el);
    };
    if (container !== mapEl) {
      name(container, 'mapa-caja');
      const head = Array.from(container.children).find((c) => !c.contains(mapEl)) as HTMLElement | undefined;
      name(head, 'mapa-head');
      name(mapEl, 'mapa');
    } else {
      name(container, 'mapa');
    }
    const t = (document as any).startViewTransition(async () => {
      apply(on);
      // esperar a que el mapa se pinte con su nuevo tamaño antes de la foto final
      await new Promise<void>((r) => {
        map.once('render', () => r());
        map.triggerRepaint();
        setTimeout(r, 250);
      });
    });
    await t.finished.catch(() => {});
    named.forEach((el) => (el.style.viewTransitionName = ''));
    html.classList.remove('vt-mapa', 'vt-mapa-open', 'vt-mapa-close');
    refit();
  }

  btn.addEventListener('click', () => toggle());
  paint();
  return { onAdd: () => box, onRemove: () => box.remove() };
}

export interface RouteMap {
  map: MLMap;
  set(kind: 'origen' | 'destino', p: LngLat, opts?: { fly?: boolean }): void;
  get(kind: 'origen' | 'destino'): LngLat | null;
  onChange(cb: (kind: 'origen' | 'destino', p: LngLat) => void): void;
}

/** Crea el mapa en un contenedor. `interactive=false` para vistas de solo lectura (panel). */
export async function createRouteMap(
  container: HTMLElement,
  { interactive = true, draggable = true, expandEl }: { interactive?: boolean; draggable?: boolean; expandEl?: HTMLElement } = {},
): Promise<RouteMap> {
  const ml = await lib();
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [w, s, e, n] = SERVICE_AREA.bbox;
  const map = new ml.Map({
    container,
    style: STYLE,
    center: [SERVICE_AREA.center.lng, SERVICE_AREA.center.lat],
    zoom: 12.6,
    minZoom: 11,
    maxZoom: 18,
    maxBounds: [
      [w - 0.08, s - 0.08],
      [e + 0.08, n + 0.08],
    ],
    attributionControl: { compact: true },
    interactive,
    cooperativeGestures: interactive,
    dragRotate: false,
    pitchWithRotate: false,
    locale: {
      'CooperativeGesturesHandler.WindowsHelpText': 'Usa Ctrl + rueda para acercar el mapa',
      'CooperativeGesturesHandler.MacHelpText': 'Usa ⌘ + rueda para acercar el mapa',
      'CooperativeGesturesHandler.MobileHelpText': 'Usa dos dedos para mover el mapa',
    },
  });
  if (interactive) map.addControl(new ml.NavigationControl({ showCompass: false }), 'bottom-right');
  if (interactive) map.addControl(expandControl(map, expandEl ?? container, () => fit()), 'top-right');

  const points: Record<'origen' | 'destino', LngLat | null> = { origen: null, destino: null };
  const markers: Partial<Record<'origen' | 'destino', Marker>> = {};
  const listeners: ((k: 'origen' | 'destino', p: LngLat) => void)[] = [];

  const drawRoute = () => {
    const src = map.getSource('ruta') as any;
    if (!src) return;
    const coords = points.origen && points.destino ? [[points.origen.lng, points.origen.lat], [points.destino.lng, points.destino.lat]] : [];
    src.setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } });
  };

  const fit = () => {
    const pts = [points.origen, points.destino].filter(Boolean) as LngLat[];
    if (pts.length === 2) {
      const b = new ml.LngLatBounds([pts[0].lng, pts[0].lat], [pts[0].lng, pts[0].lat]).extend([pts[1].lng, pts[1].lat]);
      map.fitBounds(b, { padding: 64, maxZoom: 15.5, duration: reduce ? 0 : 700 });
    } else if (pts.length === 1) {
      const target = { center: [pts[0].lng, pts[0].lat] as [number, number], zoom: Math.max(map.getZoom(), 15) };
      reduce ? map.jumpTo(target) : map.flyTo({ ...target, speed: 1.4 });
    }
  };

  const set: RouteMap['set'] = (kind, p, { fly = true } = {}) => {
    points[kind] = p;
    if (!markers[kind]) {
      markers[kind] = new ml.Marker({ element: pin(kind), draggable: interactive && draggable, anchor: kind === 'origen' ? 'center' : 'bottom' })
        .setLngLat([p.lng, p.lat])
        .addTo(map);
      markers[kind]!.on('dragend', () => {
        const ll = markers[kind]!.getLngLat();
        points[kind] = { lng: ll.lng, lat: ll.lat };
        drawRoute();
        listeners.forEach((cb) => cb(kind, points[kind]!));
      });
    } else {
      markers[kind]!.setLngLat([p.lng, p.lat]);
    }
    drawRoute();
    if (fly) fit();
  };

  await new Promise<void>((resolve) => map.once('load', () => resolve()));
  recolor(map);
  // El crédito del mapa queda como un botón de información, sin tapar el mapa
  container.querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show');
  map.addSource('ruta', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } } });
  map.addLayer({
    id: 'ruta',
    type: 'line',
    source: 'ruta',
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': C.blue, 'line-width': 3.5, 'line-dasharray': [0.1, 2.2] },
  });

  return {
    map,
    set,
    get: (k) => points[k],
    onChange: (cb) => listeners.push(cb),
  };
}

/** Distancia en línea recta (km) entre dos puntos. */
export function distanceKm(a: LngLat, b: LngLat) {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export interface Place {
  label: string;
  detail: string;
  point: LngLat;
}

/** OpenStreetMap trae algunos nombres en minúsculas ("manzana 13 novalito"). */
const nice = (raw: string) => {
  const s = (raw ?? '').replace(/_/g, ' ').trim();
  return s && s === s.toLowerCase() ? s.replace(/(^|\s)\p{L}/gu, (m) => m.toUpperCase()) : s;
};

const toPlace = (f: any): Place => {
  const p = f.properties ?? {};
  const street = [p.street, p.housenumber].filter(Boolean).join(' ');
  const main = nice(p.name && p.name !== street ? p.name : street || p.name || 'Punto en el mapa');
  // Sin repetir partes (p. ej. "Valledupar, Valledupar")
  const seen = new Set([main.toLowerCase()]);
  const detail = [p.name && street ? street : null, p.district || p.locality, p.city]
    .filter(Boolean)
    .map((x: string) => nice(x))
    .filter((x: string) => !seen.has(x.toLowerCase()) && seen.add(x.toLowerCase()))
    .join(', ');
  return { label: main, detail, point: { lng: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] } };
};

/** Busca direcciones y lugares solo dentro de la zona de servicio. */
export async function searchPlaces(q: string, signal?: AbortSignal): Promise<Place[]> {
  const { center, bbox } = SERVICE_AREA;
  const url = `${PHOTON}/api/?q=${encodeURIComponent(q)}&limit=5&lat=${center.lat}&lon=${center.lng}&bbox=${bbox.join(',')}`;
  const res = await fetch(url, { signal });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.features ?? []).map(toPlace);
}

/** Dirección aproximada de un punto (para llenar el campo al tocar el mapa). */
export async function reverseGeocode(p: LngLat): Promise<Place | null> {
  try {
    const res = await fetch(`${PHOTON}/reverse?lat=${p.lat}&lon=${p.lng}&limit=1`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.features?.[0] ? toPlace(data.features[0]) : null;
  } catch {
    return null;
  }
}

export const mapsLink = (p: LngLat) => `https://maps.google.com/?q=${p.lat.toFixed(6)},${p.lng.toFixed(6)}`;

/** Lee "lat,lng" de un enlace de Google Maps guardado. */
export function parseMapsLink(link?: string | null): LngLat | null {
  const m = /q=(-?[\d.]+),(-?[\d.]+)/.exec(link ?? '');
  return m ? { lat: Number(m[1]), lng: Number(m[2]) } : null;
}
