# Click & Retire

Retirada de produtos por CPF + palavra-chave. Especificação completa em [`SPEC.md`](SPEC.md).

## Rodando localmente

```bash
cp .env.example .env   # preencha com URL e anon key do Supabase
npm install
npm run dev
npm test               # parser de importação + palavra-chave
```

## Banco (Supabase)

1. Aplique as 4 migrations de `supabase/migrations/` em ordem (SQL Editor ou `supabase db push`).
2. Em **Authentication → Providers → Email**, desative "Allow new users to sign up"
   (só a equipe entra no painel; novos usuários são convidados).
3. Crie seu usuário em **Authentication → Users → Add user** e promova-o a admin com `supabase/seed.sql`.
4. Demais membros: convide em Authentication → Users e depois adicione pelo e-mail em
   **/admin/configuracoes**.

Perfis: **operador** gerencia pedidos e importação; **admin** também edita personalização,
dados do mercado e usuários.

## Rotas

| Rota | Tela |
|---|---|
| `/` | Início (CPF) |
| `/pedido` | Resultado: pronto / em separação / retirado / nada encontrado |
| `/admin/login` | Login |
| `/admin` | Dashboard com resumo, busca e paginação |
| `/admin/importar` | Importação de TXT com pré-visualização |
| `/admin/pedido/:id` | Detalhe, status e histórico |
| `/admin/personalizacao` | Logo, cores, textos, formato da palavra-chave, preview ao vivo |
| `/admin/configuracoes` | Dados do mercado e usuários |

## Importação

Aceita o formato da SPEC §6 e o export do Carrefour (`#<número>`, tabela de produtos com EAN).
Exemplo fictício em `docs/exemplos/pedidos-carrefour.txt`.

## Deploy

Vercel: framework Vite, variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
`vercel.json` já faz o fallback das rotas da SPA.
