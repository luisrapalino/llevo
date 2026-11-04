import type { SupabaseClient } from '@supabase/supabase-js';

export interface Business {
  name: string;
  tagline: string;
  description: string;
  whatsapp: string; // formato internacional sin "+"
  countryCode: string; // para normalizar celulares de clientes
  phoneDisplay: string;
  email: string;
  city: string;
  hours: string;
  heroBadge: string;
}

export interface Vehicle {
  name: string;
  capacity: string;
  size: string;
  fits: string[];
}

export interface Service {
  icon: string;
  title: string;
  text: string;
}

export interface Faq {
  q: string;
  a: string;
}

export interface Pricing {
  showEstimate: boolean;
  base: Record<string, number>; // por tamaño de carga
  perFloor: number; // por piso sin ascensor (en cada extremo)
  perHelper: number;
  assembly: number;
  packing: number;
  weekendPct: number;
}

export interface Settings {
  business: Business;
  vehicle: Vehicle;
  services: Service[];
  faqs: Faq[];
  pricing: Pricing;
}

export type SettingsKey = keyof Settings;

export const DEFAULT_SETTINGS: Settings = {
  business: {
    name: 'Llevo',
    tagline: 'Trasteos y acarreos en Valledupar',
    description:
      'Trasteos, mudanzas pequeñas y acarreos en Valledupar. Cuéntanos qué llevas, sube fotos y recibe tu cotización por WhatsApp.',
    whatsapp: '573000000000',
    countryCode: '57',
    phoneDisplay: '+57 300 000 0000',
    email: 'hola@llevo.co',
    city: 'Valledupar, Cesar',
    hours: 'Lun a Sáb · 6:00 a.m. – 8:00 p.m.',
    heroBadge: 'Disponible esta semana',
  },
  vehicle: {
    name: 'Furgón / camioneta de carga',
    capacity: 'Hasta 1.5 toneladas',
    size: 'Platón de 3 × 1.8 m aprox.',
    fits: ['Nevera', 'Lavadora', 'Cama doble', 'Sofá 3 puestos', 'Comedor 4 puestos', '20+ cajas'],
  },
  services: [
    {
      icon: 'heroicons:home-modern',
      title: 'Trasteos y mudanzas',
      text: 'Apartaestudios, habitaciones y apartamentos pequeños. Cargamos, transportamos y descargamos.',
    },
    {
      icon: 'heroicons:archive-box',
      title: 'Acarreos puntuales',
      text: 'Una nevera, una cama, un sofá o unas cajas. Lo llevamos de un punto a otro el mismo día.',
    },
    {
      icon: 'heroicons:shopping-bag',
      title: 'Compras y entregas',
      text: '¿Compraste algo grande en una tienda o por Marketplace? Lo recogemos y te lo llevamos.',
    },
    {
      icon: 'heroicons:building-storefront',
      title: 'Negocios y oficinas',
      text: 'Mercancía, mobiliario o equipos para tu local, bodega u oficina. Viajes únicos o recurrentes.',
    },
  ],
  faqs: [
    {
      q: '¿Cómo calculan el precio?',
      a: 'Depende de la distancia, el volumen de la carga, los pisos (y si hay ascensor) y si necesitas ayudantes. Con las fotos que subes te damos un precio cerrado antes de confirmar.',
    },
    {
      q: '¿En qué ciudades trabajan?',
      a: 'Por ahora solo en Valledupar, en cualquier barrio de la ciudad. Pronto llegaremos a más lugares.',
    },
    {
      q: '¿Con cuánta anticipación debo reservar?',
      a: 'Idealmente 1 o 2 días antes, sobre todo para fines de semana y fin de mes. Si es urgente, escríbenos: muchas veces podemos el mismo día.',
    },
    {
      q: '¿Ayudan a cargar y descargar?',
      a: 'Sí. El conductor ayuda con la carga y descarga. Para trasteos grandes o pisos altos sin ascensor puedes pedir ayudantes adicionales en el formulario.',
    },
    {
      q: '¿Qué pasa si mis cosas no caben en un viaje?',
      a: 'Con las fotos te avisamos antes si se necesitan dos viajes y te damos el precio total desde el principio.',
    },
    {
      q: '¿Qué cosas no transportan?',
      a: 'No llevamos sustancias peligrosas, inflamables, animales vivos ni artículos ilegales. Si tienes dudas sobre algo puntual, pregúntanos.',
    },
    {
      q: '¿Cómo se paga?',
      a: 'Puedes pagar en efectivo o por Nequi al terminar el servicio.',
    },
  ],
  pricing: {
    showEstimate: false,
    base: { 'Pocas cosas': 80000, 'Media carga': 150000, 'Carga completa': 250000 },
    perFloor: 10000,
    perHelper: 60000,
    assembly: 40000,
    packing: 30000,
    weekendPct: 10,
  },
};

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

/** Lee la configuración guardada y la mezcla con los valores por defecto. */
export async function getSettings(client: SupabaseClient | null): Promise<Settings> {
  const s: Settings = structuredClone(DEFAULT_SETTINGS);
  if (!client) return s;
  const { data, error } = await client.from('settings').select('key, value');
  if (error || !data) return s;
  for (const row of data as { key: SettingsKey; value: unknown }[]) {
    if (!(row.key in s)) continue;
    const def = s[row.key];
    if (Array.isArray(def)) {
      if (Array.isArray(row.value)) (s as any)[row.key] = row.value;
    } else if (isObj(row.value)) {
      const merged = { ...def, ...row.value } as any;
      if (row.key === 'pricing') merged.base = { ...(def as Pricing).base, ...((row.value as any).base ?? {}) };
      (s as any)[row.key] = merged;
    }
  }
  return s;
}

/** Número para WhatsApp en formato internacional: a un celular local de 10 dígitos le agrega el indicativo. */
export const waNumber = (phone: string, countryCode = '57') => {
  const digits = phone.replace(/\D/g, '');
  return !phone.trim().startsWith('+') && digits.length <= 10 ? `${countryCode}${digits.replace(/^0+/, '')}` : digits;
};

/**
 * Enlace para abrir un chat de WhatsApp con un mensaje.
 * Se usa api.whatsapp.com (no wa.me): la redirección de wa.me daña los emojis (🚚 llegaba como "�").
 */
export const whatsappLink = (phone: string, text = '¡Hola! Quiero cotizar un trasteo 🚚') =>
  `https://api.whatsapp.com/send?phone=${waNumber(phone)}&text=${encodeURIComponent(text)}`;

/** Convierte un celular local (ej. 300 123 4567) a formato internacional para wa.me */
export function normalizePhone(phone: string, countryCode: string) {
  const digits = phone.replace(/\D/g, '');
  if (phone.trim().startsWith('+') || digits.startsWith(countryCode) && digits.length > 10) return digits;
  return `${countryCode}${digits.replace(/^0+/, '')}`;
}

export const formatCOP = (n: number | null | undefined) =>
  n == null ? '—' : new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

/** Nombre corto de la ciudad (sin el departamento), por ejemplo "Valledupar". */
export const cityName = (b: Business) => (b.city || 'Valledupar').split(',')[0].trim();
