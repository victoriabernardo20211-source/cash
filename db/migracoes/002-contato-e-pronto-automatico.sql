-- Click & Retire — tarja de contato e "pronto para retirada" automático.
-- Para bancos JÁ criados: rode este arquivo uma vez no SQL Editor do Neon.
-- (Instalações novas já recebem tudo pelo db/schema.sql.)

create type contato_status as enum ('pendente', 'em_atendimento', 'ja_liguei', 'nao_atendeu');

alter table orders
  add column contato     contato_status not null default 'pendente',
  add column contato_por uuid references admin_users (id) on delete set null,
  add column contato_em  timestamptz,
  add column separacao_em timestamptz;

-- Pedidos que já estão em separação começam a contar a partir de agora
-- (senão todos os antigos ficariam prontos de uma vez).
update orders set separacao_em = now() where status = 'em_separacao';

-- Minutos em separação até o pedido virar "pronto" sozinho (0 = desligado).
alter table config add column auto_pronto_min int not null default 30 check (auto_pronto_min between 0 and 10080);

create or replace function tg_orders_before() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  if new.status = 'retirado' and (tg_op = 'INSERT' or old.status <> 'retirado') then
    new.retirado_em := now();
  elsif new.status <> 'retirado' then
    new.retirado_em := null;
  end if;
  -- Início da separação: base do "pronto automático".
  if new.status = 'em_separacao' and (tg_op = 'INSERT' or old.status <> 'em_separacao') then
    new.separacao_em := now();
  end if;
  return new;
end $$;
