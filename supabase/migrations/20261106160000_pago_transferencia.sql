-- Medios de pago: transferencia o efectivo (ya no se menciona Nequi).
update public.settings
set value = replace(value::text,
  'Puedes pagar en efectivo o por Nequi al terminar el servicio.',
  'Puedes pagar por transferencia o en efectivo al terminar el servicio.')::jsonb,
  updated_at = now()
where key = 'faqs' and value::text like '%por Nequi%';
