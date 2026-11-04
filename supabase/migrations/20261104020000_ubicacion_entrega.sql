-- Ubicación marcada en el mapa para el punto de entrega (enlace de Google Maps con coordenadas).
alter table public.requests add column if not exists destination_location text;
