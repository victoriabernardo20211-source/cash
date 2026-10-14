-- Click & Retire — RLS (SPEC §4)
--
-- Cliente (anon): lê só `config`. Pedidos NUNCA são lidos direto da tabela;
-- a consulta pública passa pela RPC `consultar_pedido_por_cpf`, que devolve
-- só os pedidos daquele CPF (ver migration 3).
-- Equipe (admin_users): operador gerencia pedidos; admin também edita
-- config e usuários.

create function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admin_users where id = auth.uid());
$$;

create function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admin_users where id = auth.uid() and perfil = 'admin');
$$;

alter table public.config       enable row level security;
alter table public.admin_users  enable row level security;
alter table public.orders       enable row level security;
alter table public.order_items  enable row level security;
alter table public.order_events enable row level security;

-- config
create policy config_leitura_publica on public.config
  for select to anon, authenticated using (true);
create policy config_admin_update on public.config
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- admin_users
create policy admin_users_leitura on public.admin_users
  for select to authenticated using (public.is_staff());
create policy admin_users_admin_insert on public.admin_users
  for insert to authenticated with check (public.is_admin());
create policy admin_users_admin_update on public.admin_users
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_users_admin_delete on public.admin_users
  for delete to authenticated using (public.is_admin() and id <> auth.uid());

-- orders / order_items / order_events: só equipe
create policy orders_staff on public.orders
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy order_items_staff on public.order_items
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy order_events_staff_leitura on public.order_events
  for select to authenticated using (public.is_staff());

-- Storage: bucket público para a logo; escrita só admin
insert into storage.buckets (id, name, public)
values ('branding', 'branding', true)
on conflict (id) do nothing;

create policy branding_admin_insert on storage.objects
  for insert to authenticated with check (bucket_id = 'branding' and public.is_admin());
create policy branding_admin_update on storage.objects
  for update to authenticated using (bucket_id = 'branding' and public.is_admin());
create policy branding_admin_delete on storage.objects
  for delete to authenticated using (bucket_id = 'branding' and public.is_admin());
