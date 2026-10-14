-- Click & Retire — vincular usuário do Auth à equipe (tela de Configurações)
--
-- O front não pode criar usuários no Auth sem a service key. Fluxo: o usuário é
-- criado/convidado em Authentication → Users e o admin o adiciona aqui pelo e-mail.

create function public.adicionar_membro(p_email text, p_nome text, p_perfil text)
returns public.admin_users
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_row public.admin_users;
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem adicionar usuários.' using errcode = '42501';
  end if;

  select id into v_id from auth.users where lower(email) = lower(trim(p_email));
  if v_id is null then
    raise exception 'Nenhum usuário com este e-mail no Supabase Auth. Convide-o primeiro em Authentication → Users.'
      using errcode = 'P0002';
  end if;

  insert into public.admin_users (id, nome, email, perfil)
  values (v_id, coalesce(p_nome, ''), lower(trim(p_email)), p_perfil)
  on conflict (id) do update set nome = excluded.nome, perfil = excluded.perfil
  returning * into v_row;
  return v_row;
end $$;

revoke all on function public.adicionar_membro(text, text, text) from public;
grant execute on function public.adicionar_membro(text, text, text) to authenticated;
