-- Click & Retire — consulta pública por CPF (SPEC §4 / §7)
--
-- Recebe o CPF (com ou sem máscara) e devolve um array JSON com os pedidos
-- daquele CPF, mais recentes primeiro. A palavra-chave só é incluída quando
-- status = 'pronto'. Retirados há mais de 7 dias não aparecem.

create function public.consultar_pedido_por_cpf(cpf text)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  digitos text := regexp_replace(coalesce(cpf, ''), '\D', '', 'g');
begin
  if length(digitos) <> 11 then
    return '[]'::jsonb;
  end if;

  return coalesce((
    select jsonb_agg(p order by p.ordem, p.created_at desc)
    from (
      select
        o.numero,
        o.cliente_nome,
        o.status,
        o.data_retirada,
        o.created_at,
        case o.status when 'pronto' then 0 when 'em_separacao' then 1 else 2 end as ordem,
        case when o.status = 'pronto' then o.palavra_chave end as palavra_chave,
        coalesce((
          select jsonb_agg(jsonb_build_object(
                   'nome', i.nome, 'quantidade', i.quantidade, 'unidade', i.unidade)
                 order by i.posicao)
          from public.order_items i where i.order_id = o.id
        ), '[]'::jsonb) as itens
      from public.orders o
      where o.cpf = digitos
        and (o.status <> 'retirado' or o.retirado_em > now() - interval '7 days')
      limit 10
    ) p
  ), '[]'::jsonb);
end $$;

revoke all on function public.consultar_pedido_por_cpf(text) from public;
grant execute on function public.consultar_pedido_por_cpf(text) to anon, authenticated;

-- Resumo do dashboard (3 cards)
create function public.resumo_dashboard()
returns jsonb
language sql stable security definer set search_path = public as $$
  select case when not public.is_staff() then null else jsonb_build_object(
    'em_separacao',   (select count(*) from orders where status = 'em_separacao'),
    'pronto',         (select count(*) from orders where status = 'pronto'),
    'retirados_hoje', (select count(*) from orders where status = 'retirado'
                         and retirado_em >= date_trunc('day', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo')
  ) end;
$$;

revoke all on function public.resumo_dashboard() from public;
grant execute on function public.resumo_dashboard() to authenticated;
