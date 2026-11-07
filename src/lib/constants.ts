export const SERVICE_TYPES = [
  { value: 'Acarreo puntual', label: 'Acarreo', icon: 'heroicons:archive-box', text: 'Nevera, sofá, cartel…' },
  { value: 'Trasteo / mudanza', label: 'Mudanza pequeña', icon: 'heroicons:home-modern', text: 'Habitación o apartaestudio' },
  { value: 'Recoger una compra', label: 'Una compra', icon: 'heroicons:shopping-bag', text: 'Tienda o Marketplace' },
  { value: 'Negocio / oficina', label: 'Sonido o aviso', icon: 'heroicons:speaker-wave', text: 'Equipo, cartel, local' },
] as const;

export const LOAD_SIZES = [
  { value: 'Pocas cosas', text: '1 a 5 objetos o cajas' },
  { value: 'Media carga', text: 'Habitación o apartaestudio' },
  { value: 'Carga completa', text: 'Lo que quepa en la camioneta' },
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
  'Nevera', 'Lavadora', 'Somier', 'Colchón', 'Sofá', 'Cama', 'Equipo de sonido', 'Cartel / anuncio',
  'Televisor', 'Cajas', 'Escritorio', 'Electrodomésticos',
];

export const STATUSES = {
  nueva: {
    label: 'Nueva',
    icon: 'heroicons:inbox',
    badge: 'bg-sky-50 text-sky-700 ring-sky-200',
    dot: 'bg-sky-500',
    iconWrap: 'bg-sky-100 text-sky-700',
    filterOn: 'border-sky-500 bg-sky-50 text-sky-800',
    option: 'border-line bg-paper text-ink hover:border-sky-300 has-[:checked]:border-sky-500 has-[:checked]:bg-sky-50 has-[:checked]:text-sky-800',
  },
  cotizada: {
    label: 'Cotizada',
    icon: 'heroicons:currency-dollar',
    badge: 'bg-amber-50 text-amber-700 ring-amber-200',
    dot: 'bg-amber-500',
    iconWrap: 'bg-amber-100 text-amber-700',
    filterOn: 'border-amber-500 bg-amber-50 text-amber-800',
    option: 'border-line bg-paper text-ink hover:border-amber-300 has-[:checked]:border-amber-500 has-[:checked]:bg-amber-50 has-[:checked]:text-amber-800',
  },
  agendada: {
    label: 'Agendada',
    icon: 'heroicons:calendar-days',
    badge: 'bg-violet-50 text-violet-700 ring-violet-200',
    dot: 'bg-violet-500',
    iconWrap: 'bg-violet-100 text-violet-700',
    filterOn: 'border-violet-500 bg-violet-50 text-violet-800',
    option: 'border-line bg-paper text-ink hover:border-violet-300 has-[:checked]:border-violet-500 has-[:checked]:bg-violet-50 has-[:checked]:text-violet-800',
  },
  completada: {
    label: 'Completada',
    icon: 'heroicons:check-circle',
    badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    dot: 'bg-emerald-500',
    iconWrap: 'bg-emerald-100 text-emerald-700',
    filterOn: 'border-emerald-500 bg-emerald-50 text-emerald-800',
    option: 'border-line bg-paper text-ink hover:border-emerald-300 has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-50 has-[:checked]:text-emerald-800',
  },
  cancelada: {
    label: 'Cancelada',
    icon: 'heroicons:x-circle',
    badge: 'bg-sand text-ink-3 ring-line-strong',
    dot: 'bg-ink-3',
    iconWrap: 'bg-sand text-ink-2',
    filterOn: 'border-ink bg-sand text-ink',
    option: 'border-line bg-paper text-ink hover:border-line-strong has-[:checked]:border-ink has-[:checked]:bg-sand has-[:checked]:text-ink',
  },
} as const;

export type Status = keyof typeof STATUSES;
export const STATUS_KEYS = Object.keys(STATUSES) as Status[];

/** Iconos que se pueden elegir para los servicios desde el panel. */
export const ICON_CHOICES = [
  'heroicons:home-modern', 'heroicons:archive-box', 'heroicons:shopping-bag', 'heroicons:building-storefront',
  'heroicons:truck', 'heroicons:cube', 'heroicons:gift', 'heroicons:wrench-screwdriver', 'heroicons:computer-desktop',
  'heroicons:speaker-wave', 'heroicons:hand-raised',
  'heroicons:tv', 'heroicons:user-group', 'heroicons:map', 'heroicons:sparkles', 'heroicons:briefcase',
  'heroicons:building-office-2', 'heroicons:academic-cap', 'heroicons:heart', 'heroicons:star',
];
