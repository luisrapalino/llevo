-- Notificaciones push para el equipo del panel.

-- Suscripciones de cada navegador o celular donde alguien activó las notificaciones
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

create policy "cada uno ve sus suscripciones" on public.push_subscriptions
  for select to authenticated using (user_id = auth.uid());
create policy "cada uno crea sus suscripciones" on public.push_subscriptions
  for insert to authenticated with check (user_id = auth.uid() and public.is_staff());
create policy "cada uno borra sus suscripciones" on public.push_subscriptions
  for delete to authenticated using (user_id = auth.uid());

-- Valores privados del servidor (p. ej. las claves VAPID). Sin políticas: solo el service role los lee.
create table public.private_settings (
  key text primary key,
  value jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.private_settings enable row level security;
