import type { Pricing } from './settings';

export interface EstimateInput {
  load_size: string;
  origin_floor?: string | null;
  origin_elevator?: boolean;
  destination_floor?: string | null;
  destination_elevator?: boolean;
  helpers?: string | null;
  extras?: string[];
  service_date?: string | null; // YYYY-MM-DD
  /** Kilómetros del recorrido. Si no hay ruta, no se cobra distancia. */
  distance_km?: number | null;
}

const floorsAbove = (floor?: string | null) => {
  if (!floor || floor === 'Primer piso') return 0;
  const n = parseInt(floor, 10);
  return Number.isFinite(n) ? Math.max(0, n - 1) : 0;
};

/** Kilómetros que se cobran, por encima de los que ya trae la base. */
export function extraKm(km: number | null | undefined, p: Pricing): number {
  if (km == null || !Number.isFinite(km) || km < 0 || !(p.perKm > 0)) return 0;
  return Math.max(0, km - Math.max(0, p.includedKm || 0));
}

/** Precio estimado según las tarifas configuradas. Se usa en el servidor y en el navegador. */
export function estimate(input: EstimateInput, p: Pricing): number | null {
  const base = p.base[input.load_size];
  if (!base) return null;
  let total = base;
  if (!input.origin_elevator) total += floorsAbove(input.origin_floor) * p.perFloor;
  if (!input.destination_elevator) total += floorsAbove(input.destination_floor) * p.perFloor;
  total += (parseInt(input.helpers ?? '0', 10) || 0) * p.perHelper;
  if (input.extras?.includes('Desarme y armado')) total += p.assembly;
  if (input.extras?.includes('Material de embalaje')) total += p.packing;
  total += extraKm(input.distance_km, p) * p.perKm;
  if (input.service_date) {
    const day = new Date(`${input.service_date}T12:00:00`).getDay();
    if (day === 0 || day === 6) total += Math.round((total * p.weekendPct) / 100);
  }
  return Math.round(total / 1000) * 1000;
}

/** Una línea para el panel: cuántos kilómetros entraron y si hubo recorrido de más. */
export function routeNote(km: number | null | undefined, p: Pricing): string | null {
  if (km == null || !Number.isFinite(km) || km <= 0) return null;
  const shown = km.toLocaleString('es-CO', { maximumFractionDigits: 1 });
  const included = Math.max(0, p.includedKm || 0);
  const over = extraKm(km, p);
  if (over <= 0) return `${shown} km de recorrido, dentro de los ${included} km incluidos.`;
  const overShown = over.toLocaleString('es-CO', { maximumFractionDigits: 1 });
  return `${shown} km de recorrido. Los primeros ${included} van en la base; ${overShown} km de más.`;
}
