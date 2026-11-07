/**
 * Mapa tipo “delivery” (estilo muy limpio): MapLibre + OpenFreeMap Positron + ajustes propios.
 * Equilibrio: calles claras, edificios suaves, nombres de vías principales y ciudad/barrio;
 * sin POI, trenes, escudos ni agua etiquetada (eso sí ensucia en delivery).
 * Pines (recogida / entrega), ruta por calles (OSRM) y búsqueda Photon (solo Valledupar).
 * Todo se carga bajo demanda.
 */
import type { Map as MLMap, Marker } from 'maplibre-gl';

export type LngLat = { lng: number; lat: number };
export type RoutePath = { coords: [number, number][]; distanceKm: number; source: 'road' | 'straight' };

/** Zona de servicio: Valledupar (con un margen alrededor del casco urbano). */
export const SERVICE_AREA = {
  center: { lng: -73.2532, lat: 10.4631 } as LngLat,
  bbox: [-73.34, 10.39, -73.17, 10.54] as [number, number, number, number],
};

const STYLE = 'https://tiles.openfreemap.org/styles/positron';
const PHOTON = 'https://photon.komoot.io';
const OSRM = 'https://router.project-osrm.org';

const C = {
  cream: '#F8F7F4',
  land: '#F4F2ED',
  park: '#EEF1E8',
  water: '#E2E8F0',
  building: '#EDEAE3',
  road: '#FAFAF8',
  roadCasing: '#E8E4DC',
  text: 'rgb(20 33 61 / 0.42)',
  ink: '#14213D',
  blue: '#2F5BEA',
};

/** Solo lo que realmente ensucia; el resto (edificios, calles nombradas, ciudad) se ve. */
const MINIMAL_HIDE_LAYERS = [
  'ne2_shaded',
  'landcover_ice_shelf',
  'landcover_glacier',
  'highway_path',
  'tunnel_motorway_casing',
  'tunnel_motorway_inner',
  'aeroway-taxiway',
  'aeroway-runway-casing',
  'aeroway-area',
  'aeroway-runway',
  'railway_transit',
  'railway_transit_dashline',
  'railway_service',
  'railway_service_dashline',
  'railway',
  'railway_dashline',
  'highway_motorway_bridge_casing',
  'highway_motorway_bridge_inner',
  'boundary_disputed',
  'waterway_line_label',
  'water_name_point_label',
  'water_name_line_label',
  'highway-name-path',
  'highway-name-minor',
  'highway-shield-non-us',
  'highway-shield-us-interstate',
  'road_shield_us',
  'airport',
  'label_other',
  'label_village',
  'label_state',
  'label_country_3',
  'label_country_2',
  'label_country_1',
] as const;

let maplibre: typeof import('maplibre-gl') | null = null;
async function lib() {
  if (!maplibre) {
    const [m] = await Promise.all([import('maplibre-gl'), import('maplibre-gl/dist/maplibre-gl.css')]);
    maplibre = (m as any).default ?? m;
  }
  return maplibre!;
}

/** Paleta suave + capas ocultas = mapa más limpio (similar a apps de entrega). */
function applyMinimalStyle(map: MLMap) {
  const paint: [string, string, unknown][] = [
    ['background', 'background-color', C.cream],
    ['landuse_residential', 'fill-color', C.land],
    ['park', 'fill-color', C.park],
    ['landcover_wood', 'fill-color', C.park],
    ['water', 'fill-color', C.water],
    ['waterway', 'line-color', C.water],
    ['highway_minor', 'line-color', C.road],
    ['highway_major_casing', 'line-color', C.roadCasing],
    ['highway_major_inner', 'line-color', C.road],
    ['highway_major_subtle', 'line-color', C.road],
    ['highway_motorway_casing', 'line-color', C.roadCasing],
    ['highway_motorway_inner', 'line-color', C.road],
    ['highway_motorway_subtle', 'line-color', C.road],
    ['road_area_pier', 'fill-color', C.cream],
    ['road_pier', 'line-color', C.cream],
    ['building', 'fill-color', C.building],
    ['building', 'fill-outline-color', C.roadCasing],
    ['building', 'fill-opacity', 0.55],
  ];
  for (const [layer, prop, value] of paint) {
    try {
      if (map.getLayer(layer)) map.setPaintProperty(layer, prop as any, value);
    } catch {
      /* capa o propiedad no disponible */
    }
  }
  for (const id of MINIMAL_HIDE_LAYERS) {
    try {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', 'none');
    } catch {
      /* id distinto en otra versión del estilo */
    }
  }
  for (const id of ['boundary_3', 'boundary_2'] as const) {
    try {
      if (map.getLayer(id)) {
        map.setPaintProperty(id, 'line-color', C.roadCasing);
        map.setPaintProperty(id, 'line-opacity', 0.4);
      }
    } catch {
      /* — */
    }
  }
  /** Texto suave: calles principales + ciudad / barrio (no aldeas ni país). */
  for (const id of ['highway-name-major', 'label_town', 'label_city', 'label_city_capital'] as const) {
    try {
      if (!map.getLayer(id)) continue;
      map.setPaintProperty(id, 'text-color', C.text);
      map.setPaintProperty(id, 'text-halo-color', C.cream);
      map.setPaintProperty(id, 'text-halo-width', 1.2);
    } catch {
      /* — */
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
    const root = document.documentElement;
    if (on) {
      const gap = window.innerWidth - root.clientWidth;
      if (gap > 0) root.style.paddingRight = `${gap}px`;
      root.classList.add('overflow-hidden');
    } else {
      root.classList.remove('overflow-hidden');
      root.style.paddingRight = '';
    }
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
    await t.finished.catch(() => { });
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
  /** Última ruta por calles (o null si falta un punto / aún no llegó). */
  getRoute(): RoutePath | null;
  onChange(cb: (kind: 'origen' | 'destino', p: LngLat) => void): void;
  onRoute(cb: (path: RoutePath | null) => void): void;
}

/** Camino en coche entre dos puntos (OSRM). Si falla, null → el mapa usa línea recta. */
export async function fetchDrivingRoute(a: LngLat, b: LngLat, signal?: AbortSignal): Promise<RoutePath | null> {
  const url = `${OSRM}/route/v1/driving/${a.lng},${a.lat};${b.lng},${b.lat}?overview=full&geometries=geojson`;
  try {
    const res = await fetch(url, { signal });
    if (!res.ok) return null;
    const data = await res.json();
    const route = data.routes?.[0];
    const coords = route?.geometry?.coordinates as [number, number][] | undefined;
    if (!coords?.length || typeof route.distance !== 'number') return null;
    return { coords, distanceKm: route.distance / 1000, source: 'road' };
  } catch {
    return null;
  }
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
  const routeListeners: ((path: RoutePath | null) => void)[] = [];
  let path: RoutePath | null = null;
  let routeAbort: AbortController | null = null;
  let fitAfterRoute = false;
  let advanceFrame = 0;

  const setLine = (id: 'ruta' | 'ruta-avance', coords: [number, number][]) => {
    const src = map.getSource(id) as any;
    if (!src) return;
    src.setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } });
  };

  /** La línea crece desde la recogida hasta la entrega. Con reducir movimiento aparece completa. */
  const playRoute = (coords: [number, number][]) => {
    cancelAnimationFrame(advanceFrame);
    setLine('ruta', coords);
    if (coords.length < 2 || reduce) {
      setLine('ruta-avance', coords);
      return;
    }
    const cum = [0];
    for (let i = 1; i < coords.length; i++) {
      cum.push(cum[i - 1] + Math.hypot(coords[i][0] - coords[i - 1][0], coords[i][1] - coords[i - 1][1]));
    }
    const total = cum[cum.length - 1] || 1;
    const started = performance.now();
    const frame = (now: number) => {
      const t = Math.min(1, (now - started) / 1700);
      const eased = 1 - (1 - t) ** 3;
      const target = total * eased;
      let i = 1;
      while (i < cum.length && cum[i] < target) i++;
      const span = (cum[i] ?? total) - cum[i - 1] || 1;
      const u = Math.min(1, (target - cum[i - 1]) / span);
      const a = coords[i - 1];
      const b = coords[Math.min(i, coords.length - 1)];
      const tip: [number, number] = [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
      setLine('ruta-avance', [...coords.slice(0, i), tip]);
      if (t < 1) advanceFrame = requestAnimationFrame(frame);
    };
    setLine('ruta-avance', [coords[0], coords[0]]);
    advanceFrame = requestAnimationFrame(frame);
  };

  const clearRoute = () => {
    cancelAnimationFrame(advanceFrame);
    setLine('ruta', []);
    setLine('ruta-avance', []);
  };

  const publishRoute = (next: RoutePath | null) => {
    path = next;
    routeListeners.forEach((cb) => cb(next));
  };

  /** Dibuja la ruta por calles. La recta solo aparece si el servicio no responde. */
  const drawRoute = () => {
    routeAbort?.abort();
    routeAbort = null;
    const a = points.origen;
    const b = points.destino;
    if (!a || !b) {
      clearRoute();
      publishRoute(null);
      return;
    }
    const key = routeKey(a, b);
    const cached = readRouteCache(key);
    if (cached) {
      playRoute(cached.coords);
      publishRoute(cached);
      fitAfterRoute = false;
      return;
    }
    // Sin línea mientras llega: la recta intermedia se veía y luego saltaba a las calles.
    clearRoute();
    publishRoute(null);

    const ctrl = new AbortController();
    routeAbort = ctrl;
    const wantFit = fitAfterRoute;
    fitAfterRoute = false;
    fetchDrivingRoute(a, b, ctrl.signal).then((road) => {
      if (ctrl.signal.aborted) return;
      if (points.origen !== a || points.destino !== b) return;
      const next: RoutePath = road ?? {
        coords: [
          [a.lng, a.lat],
          [b.lng, b.lat],
        ],
        distanceKm: distanceKm(a, b),
        source: 'straight',
      };
      if (road) writeRouteCache(key, road);
      playRoute(next.coords);
      publishRoute(next);
      if (wantFit) fit();
    });
  };

  const fit = () => {
    const pts = [points.origen, points.destino].filter(Boolean) as LngLat[];
    if (pts.length === 2) {
      const b = new ml.LngLatBounds([pts[0].lng, pts[0].lat], [pts[0].lng, pts[0].lat]).extend([pts[1].lng, pts[1].lat]);
      if (path?.coords.length) {
        for (const [lng, lat] of path.coords) b.extend([lng, lat]);
      }
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
    if (fly) fitAfterRoute = true;
    drawRoute();
    if (fly) fit();
  };

  await new Promise<void>((resolve) => {
    if (map.isStyleLoaded()) resolve();
    else map.once('load', () => resolve());
  });
  applyMinimalStyle(map);
  // El crédito del mapa queda como un botón de información, sin tapar el mapa
  container.querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show');
  const emptyLine = () => ({ type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: [] as [number, number][] } });
  map.addSource('ruta', { type: 'geojson', data: emptyLine() });
  map.addSource('ruta-avance', { type: 'geojson', data: emptyLine() });
  map.addLayer({
    id: 'ruta',
    type: 'line',
    source: 'ruta',
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': C.blue, 'line-width': 3, 'line-opacity': 0.28, 'line-dasharray': [0.1, 2.2] },
  });
  map.addLayer({
    id: 'ruta-avance',
    type: 'line',
    source: 'ruta-avance',
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': C.blue, 'line-width': 4.5 },
  });

  return {
    map,
    set,
    get: (k) => points[k],
    getRoute: () => path,
    onChange: (cb) => listeners.push(cb),
    onRoute: (cb) => routeListeners.push(cb),
  };
}

const ROUTE_CACHE_KEY = 'llevo-rutas';

function routeKey(a: LngLat, b: LngLat) {
  const r = (n: number) => n.toFixed(5);
  return `${r(a.lng)},${r(a.lat)};${r(b.lng)},${r(b.lat)}`;
}

/** La misma pareja de puntos no vuelve a pedir la ruta al entrar otra vez en esta pestaña. */
function readRouteCache(key: string): RoutePath | null {
  try {
    const all = JSON.parse(sessionStorage.getItem(ROUTE_CACHE_KEY) || '{}') as Record<string, RoutePath>;
    const hit = all[key];
    if (!hit?.coords?.length || hit.source !== 'road') return null;
    return hit;
  } catch {
    return null;
  }
}

function writeRouteCache(key: string, path: RoutePath) {
  try {
    const all = JSON.parse(sessionStorage.getItem(ROUTE_CACHE_KEY) || '{}') as Record<string, RoutePath>;
    delete all[key];
    all[key] = path;
    const keys = Object.keys(all);
    while (keys.length > 12) delete all[keys.shift()!];
    sessionStorage.setItem(ROUTE_CACHE_KEY, JSON.stringify(all));
  } catch {
    /* cuota llena o el navegador no guarda datos de la pestaña */
  }
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
