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
}

const floorsAbove = (floor?: string | null) => {
  if (!floor || floor === 'Primer piso') return 0;
  const n = parseInt(floor, 10);
  return Number.isFinite(n) ? Math.max(0, n - 1) : 0;
};

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
  if (input.service_date) {
    const day = new Date(`${input.service_date}T12:00:00`).getDay();
    if (day === 0 || day === 6) total += Math.round((total * p.weekendPct) / 100);
  }
  return Math.round(total / 1000) * 1000;
}
