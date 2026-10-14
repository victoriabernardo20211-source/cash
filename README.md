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

1. Aplique as migrations de `supabase/migrations/` em ordem (SQL Editor ou `supabase db push`).
2. Crie um usuário em **Authentication → Users** e promova-o com `supabase/seed.sql`.

## Deploy

Vercel: framework Vite, variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
`vercel.json` já faz o fallback das rotas da SPA.
