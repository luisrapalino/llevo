-- Kilómetros del recorrido guardados con la solicitud, para explicar el estimado.
alter table public.requests add column if not exists distance_km numeric(6,1);
