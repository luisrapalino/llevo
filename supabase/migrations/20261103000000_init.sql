-- =========================================================
-- Llevo · esquema inicial
-- =========================================================

-- ---------- Perfiles (usuarios del panel) ----------
create type public.user_role as enum ('admin', 'staff');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null default '',
  role public.user_role not null default 'staff',
  created_at timestamptz not null default now()
);

-- El primer usuario que se cree es administrador; los demás, staff.
-- Para cuentas creadas desde el panel se puede indicar el rol en user_metadata.role.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  assigned public.user_role;
begin
  if not exists (select 1 from public.profiles) then
    assigned := 'admin';
  elsif new.raw_user_meta_data ->> 'role' in ('admin', 'staff') then
    assigned := (new.raw_user_meta_data ->> 'role')::public.user_role;
  else
    assigned := 'staff';
  end if;

  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', ''), assigned);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles where id = auth.uid());
$$;

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- ---------- Configuración del sitio (clave/valor JSON) ----------
create table public.settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);

-- ---------- Solicitudes ----------
create type public.request_status as enum ('nueva', 'cotizada', 'agendada', 'completada', 'cancelada');

create table public.requests (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.request_status not null default 'nueva',

  -- servicio
  service text not null,
  load_size text not null,

  -- ruta
  origin_address text not null,
  origin_reference text,
  origin_floor text,
  origin_elevator boolean not null default false,
  origin_location text,
  destination_address text not null,
  destination_reference text,
  destination_floor text,
  destination_elevator boolean not null default false,

  -- carga
  description text not null,
  items text[] not null default '{}',
  extras text[] not null default '{}',
  helpers text not null default '0',
  photos text[] not null default '{}',

  -- fecha
  service_date date not null,
  time_slot text not null,
  exact_time time,
  flexible boolean not null default false,

  -- contacto
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  contact_preference text,
  customer_notes text,

  -- gestión interna
  estimated_price integer,
  quoted_price integer,
  internal_notes text,
  assigned_to uuid references public.profiles (id) on delete set null
);

create index requests_status_idx on public.requests (status);
create index requests_service_date_idx on public.requests (service_date);
create index requests_created_at_idx on public.requests (created_at desc);

create function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger requests_touch before update on public.requests
  for each row execute function public.touch_updated_at();

-- ---------- Fechas / franjas bloqueadas ----------
create table public.blocked_slots (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  time_slot text, -- null = todo el día
  reason text,
  created_at timestamptz not null default now(),
  unique nulls not distinct (date, time_slot)
);

create index blocked_slots_date_idx on public.blocked_slots (date);

-- ---------- Seguridad (RLS) ----------
-- Las inserciones públicas pasan por la API del servidor (service role),
-- por eso el rol anónimo solo puede leer configuración y bloqueos.
alter table public.profiles enable row level security;
alter table public.settings enable row level security;
alter table public.requests enable row level security;
alter table public.blocked_slots enable row level security;

create policy "staff ve perfiles" on public.profiles
  for select to authenticated using (public.is_staff());
create policy "cada uno edita su perfil" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Solo un admin puede cambiar roles (también evita que alguien se suba de rol).
create function public.guard_profile_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role is distinct from old.role and auth.role() = 'authenticated' and not public.is_admin() then
    raise exception 'Solo un administrador puede cambiar roles';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_role before update on public.profiles
  for each row execute function public.guard_profile_role();
create policy "admin gestiona perfiles" on public.profiles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "todos leen configuración" on public.settings
  for select to anon, authenticated using (true);
create policy "admin edita configuración" on public.settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "staff gestiona solicitudes" on public.requests
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "todos leen bloqueos" on public.blocked_slots
  for select to anon, authenticated using (true);
create policy "staff gestiona bloqueos" on public.blocked_slots
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- ---------- Almacenamiento de fotos ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('request-photos', 'request-photos', false, 8388608, array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/gif'])
on conflict (id) do nothing;

create policy "staff ve fotos" on storage.objects
  for select to authenticated using (bucket_id = 'request-photos' and public.is_staff());
create policy "staff borra fotos" on storage.objects
  for delete to authenticated using (bucket_id = 'request-photos' and public.is_staff());
