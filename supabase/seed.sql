-- Promove um usuário já criado no Supabase Auth (Authentication → Users)
-- a administrador. Rode no SQL Editor trocando o e-mail.
insert into public.admin_users (id, nome, email, perfil)
select id, 'Administrador', email, 'admin'
from auth.users where email = 'admin@seumercado.com.br'
on conflict (id) do update set perfil = 'admin';
