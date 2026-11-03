-- Solo las cuentas creadas desde el panel (o el primer administrador) obtienen acceso.
-- El rol viaja en app_metadata, que únicamente puede escribir el servidor (service role),
-- así que un registro público por la API de Auth no recibe perfil ni permisos.
-- Auth guarda app_metadata en un UPDATE posterior al INSERT, por eso el trigger escucha ambos.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  assigned public.user_role;
begin
  if exists (select 1 from public.profiles where id = new.id) then
    return new;
  end if;

  if tg_op = 'INSERT' and not exists (select 1 from public.profiles) then
    assigned := 'admin'; -- primer usuario del sistema
  elsif new.raw_app_meta_data ->> 'role' in ('admin', 'staff') then
    assigned := (new.raw_app_meta_data ->> 'role')::public.user_role;
  else
    return new; -- sin perfil = sin acceso al panel
  end if;

  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', ''), assigned);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert or update of raw_app_meta_data on auth.users
  for each row execute function public.handle_new_user();
