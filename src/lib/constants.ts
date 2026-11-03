export const SERVICE_TYPES = [
  { value: 'Trasteo / mudanza', icon: 'heroicons:home-modern', text: 'Casa, apto o habitación' },
  { value: 'Acarreo puntual', icon: 'heroicons:archive-box', text: 'Uno o pocos objetos' },
  { value: 'Recoger una compra', icon: 'heroicons:shopping-bag', text: 'Tienda o Marketplace' },
  { value: 'Negocio / oficina', icon: 'heroicons:building-storefront', text: 'Mercancía o equipos' },
] as const;

export const LOAD_SIZES = [
  { value: 'Pocas cosas', text: '1 a 5 objetos o cajas' },
  { value: 'Media carga', text: 'Habitación o apartaestudio' },
  { value: 'Carga completa', text: 'Apartamento pequeño' },
] as const;

export const TIME_SLOTS = [
  { value: 'Temprano (6–9 a.m.)', short: 'Temprano', icon: 'heroicons:sun' },
  { value: 'Mañana (9 a.m.–12 m.)', short: 'Mañana', icon: 'heroicons:sun' },
  { value: 'Tarde (12–4 p.m.)', short: 'Tarde', icon: 'heroicons:cloud' },
  { value: 'Final de tarde (4–8 p.m.)', short: 'Final tarde', icon: 'heroicons:moon' },
] as const;

export const FLOORS = ['Primer piso', '2', '3', '4', '5', '6+'] as const;
export const HELPERS = ['0', '1', '2', '3+'] as const;
export const EXTRAS = ['Desarme y armado', 'Material de embalaje'] as const;
export const CONTACT_PREFS = ['WhatsApp', 'Llamada', 'Correo'] as const;
export const COMMON_ITEMS = [
  'Nevera', 'Lavadora', 'Cama', 'Colchón', 'Sofá', 'Comedor', 'Escritorio', 'Closet / armario',
  'Televisor', 'Cajas', 'Bicicleta', 'Electrodomésticos',
];

export const STATUSES = {
  nueva: { label: 'Nueva', badge: 'bg-sky-50 text-sky-700 ring-sky-200', dot: 'bg-sky-500' },
  cotizada: { label: 'Cotizada', badge: 'bg-amber-50 text-amber-700 ring-amber-200', dot: 'bg-amber-500' },
  agendada: { label: 'Agendada', badge: 'bg-violet-50 text-violet-700 ring-violet-200', dot: 'bg-violet-500' },
  completada: { label: 'Completada', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500' },
  cancelada: { label: 'Cancelada', badge: 'bg-sand text-ink-3 ring-line-strong', dot: 'bg-ink-3' },
} as const;

export type Status = keyof typeof STATUSES;
export const STATUS_KEYS = Object.keys(STATUSES) as Status[];

/** Iconos que se pueden elegir para los servicios desde el panel. */
export const ICON_CHOICES = [
  'heroicons:home-modern', 'heroicons:archive-box', 'heroicons:shopping-bag', 'heroicons:building-storefront',
  'heroicons:truck', 'heroicons:cube', 'heroicons:gift', 'heroicons:wrench-screwdriver', 'heroicons:computer-desktop',
  'heroicons:tv', 'heroicons:user-group', 'heroicons:map', 'heroicons:sparkles', 'heroicons:briefcase',
  'heroicons:building-office-2', 'heroicons:academic-cap', 'heroicons:heart', 'heroicons:star',
];
