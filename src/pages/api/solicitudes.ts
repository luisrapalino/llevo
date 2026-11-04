import type { APIRoute } from 'astro';
import { CONTACT_PREFS, EXTRAS, FLOORS, HELPERS, LOAD_SIZES, SERVICE_TYPES, TIME_SLOTS } from '../../lib/constants';
import { estimate } from '../../lib/pricing';
import { getSettings } from '../../lib/settings';
import { createAdminClient, PHOTOS_BUCKET } from '../../lib/supabase';

export const prerender = false;

const MAX_PHOTOS = 10;
const EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'image/gif': 'gif',
};

const mapLink = (v: string) => (/^https:\/\/maps\.google\.com\/\?q=-?[\d.]+,-?[\d.]+$/.test(v) ? v : null);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export const POST: APIRoute = async ({ request }) => {
  const admin = createAdminClient();
  if (!admin) return json({ error: 'El servicio no está configurado.' }, 503);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: 'Solicitud inválida.' }, 400);
  }
  if (form.get('_gotcha')) return json({ code: 'OK', uploads: [] }); // bot

  const str = (k: string, max = 300) => String(form.get(k) ?? '').trim().slice(0, max);
  const oneOf = <T extends string>(v: string, list: readonly T[], fallback?: T) =>
    (list as readonly string[]).includes(v) ? (v as T) : fallback;

  const service = oneOf(str('servicio'), SERVICE_TYPES.map((s) => s.value));
  const loadSize = oneOf(str('tamano'), LOAD_SIZES.map((s) => s.value));
  const timeSlot = oneOf(str('franja'), TIME_SLOTS.map((s) => s.value));
  const date = str('fecha', 10);
  const origin = str('origen_direccion');
  const destination = str('destino_direccion');
  const description = str('descripcion', 3000);
  const name = str('nombre', 120);
  const phone = str('telefono', 30);
  const email = str('email', 200);

  const errors: string[] = [];
  if (!service) errors.push('servicio');
  if (!loadSize) errors.push('tamaño de carga');
  if (!timeSlot) errors.push('franja horaria');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) errors.push('fecha');
  if (!origin) errors.push('dirección de recogida');
  if (!destination) errors.push('dirección de entrega');
  if (description.length < 10) errors.push('descripción');
  if (!name) errors.push('nombre');
  if (phone.replace(/\D/g, '').length < 7) errors.push('celular');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('correo');
  if (form.get('acepta_datos') !== 'Sí') errors.push('autorización de datos');
  if (errors.length) return json({ error: `Revisa estos campos: ${errors.join(', ')}.` }, 400);

  if (date < new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)) {
    return json({ error: 'La fecha ya pasó. Elige otra.' }, 400);
  }

  const { data: blocks } = await admin.from('blocked_slots').select('time_slot').eq('date', date);
  if (blocks?.some((b) => !b.time_slot || b.time_slot === timeSlot)) {
    return json({ error: 'Ese día u horario ya no está disponible. Elige otro, por favor.' }, 409);
  }

  let photoTypes: string[] = [];
  try {
    const parsed = JSON.parse(str('fotos_tipos', 2000) || '[]');
    if (Array.isArray(parsed)) photoTypes = parsed.map(String).slice(0, MAX_PHOTOS);
  } catch {
    /* sin fotos */
  }

  const record = {
    service: service!,
    load_size: loadSize!,
    origin_address: origin,
    origin_reference: str('origen_referencia') || null,
    origin_floor: oneOf(str('origen_piso'), FLOORS, 'Primer piso'),
    origin_elevator: str('origen_ascensor') === 'Sí',
    origin_location: mapLink(str('origen_ubicacion')),
    destination_address: destination,
    destination_reference: str('destino_referencia') || null,
    destination_floor: oneOf(str('destino_piso'), FLOORS, 'Primer piso'),
    destination_location: mapLink(str('destino_ubicacion')),
    destination_elevator: str('destino_ascensor') === 'Sí',
    description,
    items: form.getAll('objetos').map(String).slice(0, 30),
    extras: form.getAll('extras').map(String).filter((e) => (EXTRAS as readonly string[]).includes(e)),
    helpers: oneOf(str('ayudantes'), HELPERS, '0')!,
    service_date: date,
    time_slot: timeSlot!,
    exact_time: /^\d{2}:\d{2}$/.test(str('hora')) ? str('hora') : null,
    flexible: str('flexible') === 'Sí',
    customer_name: name,
    customer_phone: phone,
    customer_email: email || null,
    contact_preference: oneOf(str('contacto_preferido'), CONTACT_PREFS, 'WhatsApp'),
    customer_notes: str('notas', 2000) || null,
    estimated_price: null as number | null,
  };

  const settings = await getSettings(admin);
  record.estimated_price = estimate(record, settings.pricing);

  const { data: created, error } = await admin.from('requests').insert(record).select('id, code').single();
  if (error || !created) {
    console.error('insert request', error);
    return json({ error: 'No pudimos guardar tu solicitud. Intenta de nuevo.' }, 500);
  }

  // URLs firmadas para que el navegador suba las fotos directo al almacenamiento.
  const uploads: string[] = [];
  const paths: string[] = [];
  for (let i = 0; i < photoTypes.length; i++) {
    const path = `${created.id}/${i + 1}.${EXT[photoTypes[i]] ?? 'jpg'}`;
    const { data } = await admin.storage.from(PHOTOS_BUCKET).createSignedUploadUrl(path);
    if (data?.signedUrl) {
      uploads.push(data.signedUrl);
      paths.push(path);
    }
  }
  if (paths.length) await admin.from('requests').update({ photos: paths }).eq('id', created.id);

  return json({ code: created.code, uploads });
};
