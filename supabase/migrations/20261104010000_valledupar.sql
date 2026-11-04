-- Llevo atiende por ahora solo en Valledupar.
-- Actualiza la configuración guardada SOLO donde aún estén los textos de ejemplo,
-- para no pisar lo que el administrador ya haya escrito en el panel.

update public.settings
set value = value || jsonb_build_object('city', 'Valledupar, Cesar'), updated_at = now()
where key = 'business' and coalesce(value ->> 'city', '') in ('', 'Tu ciudad');

update public.settings
set value = value || jsonb_build_object('tagline', 'Trasteos y acarreos en Valledupar'), updated_at = now()
where key = 'business' and value ->> 'tagline' = 'Trasteos y acarreos sin complicaciones';

update public.settings
set value = value || jsonb_build_object('description',
  'Trasteos, mudanzas pequeñas y acarreos en Valledupar. Cuéntanos qué llevas, sube fotos y recibe tu cotización por WhatsApp.'),
  updated_at = now()
where key = 'business'
  and value ->> 'description' = 'Trasteos, mudanzas pequeñas y acarreos en tu ciudad. Cuéntanos qué llevas, sube fotos y recibe tu cotización por WhatsApp.';

-- Preguntas frecuentes guardadas: medios de pago reales y la zona de servicio
update public.settings
set value = replace(value::text,
  'Puedes pagar en efectivo o por transferencia (Nequi, Daviplata o Bancolombia) al terminar el servicio.',
  'Puedes pagar en efectivo o por Nequi al terminar el servicio.')::jsonb,
  updated_at = now()
where key = 'faqs' and value::text like '%Daviplata o Bancolombia%';

update public.settings
set value = jsonb_build_array(jsonb_build_object(
    'q', '¿En qué ciudades trabajan?',
    'a', 'Por ahora solo en Valledupar, en cualquier barrio de la ciudad. Pronto llegaremos a más lugares.'))
  || value,
  updated_at = now()
where key = 'faqs' and jsonb_typeof(value) = 'array' and value::text not like '%Valledupar%';
