-- Roles ampliados para marketplace: cliente y conductor (además de admin y equipo).
-- is_staff() pasa a significar solo admin + staff con acceso al panel actual.

alter type public.user_role add value if not exists 'customer';
alter type public.user_role add value if not exists 'driver';

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'staff')
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  assigned public.user_role;
  meta_role text;
begin
  if exists (select 1 from public.profiles where id = new.id) then
    return new;
  end if;

  meta_role := new.raw_app_meta_data ->> 'role';

  if tg_op = 'INSERT' and not exists (select 1 from public.profiles) then
    assigned := 'admin'; -- primer usuario del sistema
  elsif meta_role in ('admin', 'staff', 'customer', 'driver') then
    assigned := meta_role::public.user_role;
  else
    return new; -- sin perfil = sin cuenta de aplicación
  end if;

  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', ''), assigned);
  return new;
end;
$$;
