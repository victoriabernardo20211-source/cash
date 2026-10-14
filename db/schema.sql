-- Click & Retire — esquema do banco (Neon / Postgres 15+)
-- Rode uma vez no SQL Editor do Neon. Todo acesso passa pela API (/api),
-- então não há RLS: o banco nunca é exposto ao navegador.

create extension if not exists pgcrypto;

create type order_status as enum ('em_separacao', 'pronto', 'retirado');

-- config (linha única) ---------------------------------------------------------
create table config (
  id               int primary key default 1 check (id = 1),
  app_name         text not null default 'Mercado Bom Dia',
  logo_url         text, -- data URL da imagem (até ~500 KB)
  cor_azul         text not null default '#254F9B' check (cor_azul ~* '^#[0-9a-f]{6}$'),
  cor_vermelho     text not null default '#C20016' check (cor_vermelho ~* '^#[0-9a-f]{6}$'),
  txt_saudacao     text not null default 'Olá! Vamos ao seu pedido',
  txt_instrucao    text not null default 'Digite o seu CPF para consultar o pedido e receber a palavra-chave de retirada.',
  txt_botao        text not null default 'Consultar meu pedido',
  txt_rodape       text not null default 'Dúvidas? Fale com o balcão.',
  txt_erro_vazio   text not null default 'Nenhum pedido encontrado para este CPF.',
  formato_chave    text not null default 'palavra' check (formato_chave in ('palavra', 'codigo')),
  mercado_cnpj     text,
  mercado_endereco text,
  mercado_telefone text,
  mercado_whatsapp text,
  mercado_email    text,
  mercado_horario  text,
  updated_at       timestamptz not null default now()
);

insert into config (id) values (1);

-- admin_users ------------------------------------------------------------------
create table admin_users (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null default '',
  email      text not null unique check (email = lower(email)),
  senha_hash text not null, -- bcrypt
  perfil     text not null default 'operador' check (perfil in ('admin', 'operador')),
  created_at timestamptz not null default now()
);

-- orders -----------------------------------------------------------------------
create table orders (
  id            uuid primary key default gen_random_uuid(),
  numero        text not null unique,
  cliente_nome  text not null,
  cpf           text not null check (cpf ~ '^[0-9]{11}$'),
  telefone      text,
  palavra_chave text not null unique,
  status        order_status not null default 'em_separacao',
  data_retirada date,
  retirado_em   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index orders_cpf_idx on orders (cpf);
create index orders_status_idx on orders (status);

create table order_items (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references orders (id) on delete cascade,
  ean        text,
  nome       text not null,
  quantidade numeric not null default 1,
  unidade    text not null default 'un',
  posicao    int not null default 0
);

create index order_items_order_idx on order_items (order_id);

create table order_events (
  id         bigint generated always as identity primary key,
  order_id   uuid not null references orders (id) on delete cascade,
  status     order_status not null,
  autor      uuid references admin_users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index order_events_order_idx on order_events (order_id, created_at);

-- Triggers ---------------------------------------------------------------------
create function tg_orders_before() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  if new.status = 'retirado' and (tg_op = 'INSERT' or old.status <> 'retirado') then
    new.retirado_em := now();
  elsif new.status <> 'retirado' then
    new.retirado_em := null;
  end if;
  return new;
end $$;

create trigger orders_before before insert or update on orders
  for each row execute function tg_orders_before();

create function tg_config_touch() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger config_touch before update on config
  for each row execute function tg_config_touch();

-- Histórico: o autor vem da sessão da API (set_config('app.usuario', ...)).
create function tg_order_status_event() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into order_events (order_id, status, autor)
    values (new.id, new.status, nullif(current_setting('app.usuario', true), '')::uuid);
  end if;
  return null;
end $$;

create trigger orders_status_event after insert or update of status on orders
  for each row execute function tg_order_status_event();
