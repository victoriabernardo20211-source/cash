-- Click & Retire — esquema base (SPEC §3 e §4)

create extension if not exists pgcrypto;

-- Status --------------------------------------------------------------------
create type public.order_status as enum ('em_separacao', 'pronto', 'retirado');

-- config (linha única) ---------------------------------------------------------
create table public.config (
  id               int primary key default 1 check (id = 1),
  app_name         text not null default 'Mercado Bom Dia',
  logo_url         text,
  cor_azul         text not null default '#254F9B' check (cor_azul ~* '^#[0-9a-f]{6}$'),
  cor_vermelho     text not null default '#C20016' check (cor_vermelho ~* '^#[0-9a-f]{6}$'),
  txt_saudacao     text not null default 'Olá! Vamos ao seu pedido',
  txt_instrucao    text not null default 'Digite o seu CPF para consultar o pedido e receber a palavra-chave de retirada.',
  txt_botao        text not null default 'Consultar meu pedido',
  txt_rodape       text not null default 'Dúvidas? Fale com o balcão.',
  txt_erro_vazio   text not null default 'Nenhum pedido encontrado para este CPF.',
  -- SPEC §5: 'palavra' = GIRASSOL 42 · 'codigo' = A7K3
  formato_chave    text not null default 'palavra' check (formato_chave in ('palavra', 'codigo')),
  mercado_cnpj     text,
  mercado_endereco text,
  mercado_telefone text,
  mercado_whatsapp text,
  mercado_email    text,
  mercado_horario  text,
  updated_at       timestamptz not null default now()
);

insert into public.config (id) values (1);

-- admin_users (perfil dos usuários do Supabase Auth) ---------------------------
create table public.admin_users (
  id         uuid primary key references auth.users (id) on delete cascade,
  nome       text not null default '',
  email      text not null,
  perfil     text not null default 'operador' check (perfil in ('admin', 'operador')),
  created_at timestamptz not null default now()
);

-- orders ------------------------------------------------------------------------
create table public.orders (
  id            uuid primary key default gen_random_uuid(),
  numero        text not null unique,
  cliente_nome  text not null,
  cpf           text not null check (cpf ~ '^[0-9]{11}$'),
  telefone      text,
  palavra_chave text not null unique,
  status        public.order_status not null default 'em_separacao',
  data_retirada date,
  retirado_em   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index orders_cpf_idx on public.orders (cpf);
create index orders_status_idx on public.orders (status);
create index orders_nome_idx on public.orders (lower(cliente_nome));

-- order_items ---------------------------------------------------------------
create table public.order_items (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders (id) on delete cascade,
  ean        text,
  nome       text not null,
  quantidade numeric not null default 1,
  unidade    text not null default 'un',
  posicao    int not null default 0
);

create index order_items_order_idx on public.order_items (order_id);

-- Histórico de status (tela de detalhe do admin) -------------------------------
create table public.order_events (
  id         bigint generated always as identity primary key,
  order_id   uuid not null references public.orders (id) on delete cascade,
  status     public.order_status not null,
  autor      uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index order_events_order_idx on public.order_events (order_id, created_at);

-- Triggers --------------------------------------------------------------------
create function public.tg_touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger orders_touch before update on public.orders
  for each row execute function public.tg_touch_updated_at();
create trigger config_touch before update on public.config
  for each row execute function public.tg_touch_updated_at();

create function public.tg_order_status_event() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    if new.status = 'retirado' and new.retirado_em is null then
      update public.orders set retirado_em = now() where id = new.id;
    end if;
    insert into public.order_events (order_id, status, autor)
    values (new.id, new.status, auth.uid());
  end if;
  return null;
end $$;

create trigger orders_status_event after insert or update of status on public.orders
  for each row execute function public.tg_order_status_event();
