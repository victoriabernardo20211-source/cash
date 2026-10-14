-- Cria (ou redefine) o primeiro administrador.
-- Troque e-mail, nome e senha e rode no SQL Editor do Neon.
insert into admin_users (email, nome, perfil, senha_hash)
values ('admin@seumercado.com.br', 'Administrador', 'admin', crypt('TroqueEstaSenha123', gen_salt('bf', 10)))
on conflict (email) do update
  set perfil = 'admin', senha_hash = excluded.senha_hash;
