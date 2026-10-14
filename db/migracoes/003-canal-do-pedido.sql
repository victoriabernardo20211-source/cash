-- Click & Retire — canal de origem do pedido (Click & Retire / 99Food / iFood).
-- Para bancos JÁ criados: rode este arquivo uma vez no SQL Editor do Neon.

create type canal_pedido as enum ('click_retire', '99food', 'ifood', 'outro');

alter table orders add column canal canal_pedido not null default 'outro';

create index orders_canal_idx on orders (canal);
