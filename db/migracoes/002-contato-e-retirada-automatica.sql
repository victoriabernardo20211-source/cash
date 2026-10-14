-- Click & Retire — tarja de contato e retirada automática.
-- Para bancos JÁ criados: rode este arquivo uma vez no SQL Editor do Neon.
-- (Instalações novas já recebem tudo pelo db/schema.sql.)

create type contato_status as enum ('pendente', 'em_atendimento', 'ja_liguei', 'nao_atendeu');

alter table orders
  add column contato     contato_status not null default 'pendente',
  add column contato_por uuid references admin_users (id) on delete set null,
  add column contato_em  timestamptz,
  add column pronto_em   timestamptz;

-- Pedidos que já estão prontos contam a partir de agora.
update orders set pronto_em = now() where status = 'pronto';

-- Minutos até um pedido "pronto" virar "retirado" sozinho (0 = desligado).
alter table config add column auto_retirada_min int not null default 30 check (auto_retirada_min between 0 and 10080);

create or replace function tg_orders_before() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  if new.status = 'retirado' and (tg_op = 'INSERT' or old.status <> 'retirado') then
    new.retirado_em := now();
  elsif new.status <> 'retirado' then
    new.retirado_em := null;
  end if;
  if new.status = 'pronto' and (tg_op = 'INSERT' or old.status <> 'pronto') then
    new.pronto_em := now();
  elsif new.status = 'em_separacao' then
    new.pronto_em := null;
  end if;
  return new;
end $$;
