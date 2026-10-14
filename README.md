# Click & Retire

Retirada de produtos por CPF + palavra-chave. Especificação completa em [`SPEC.md`](SPEC.md).

**Stack:** React + Vite + Tailwind (front) · função Node na Vercel em `api/` (back) · Postgres no Neon (banco).

```
src/       app do cliente e painel admin (React)
server/    API: rotas, sessão (JWT em cookie HttpOnly), acesso ao banco
api/       entrada da função da Vercel (POST /api)
db/        schema.sql e criar-admin.sql
```

## Rodando localmente

```bash
cp .env.example .env   # DATABASE_URL do Neon + JWT_SECRET
npm install
npm run dev            # front + API em http://localhost:5173
npm test
```

## Banco (Neon)

1. No SQL Editor do Neon, rode `db/schema.sql` (uma vez).
2. Edite e rode `db/criar-admin.sql` para criar o primeiro administrador.
3. Os demais usuários são criados pelo painel em **/admin/configuracoes**.

Perfis: **operador** gerencia pedidos e importação; **admin** também edita personalização,
dados do mercado e usuários.

## Deploy (Vercel)

Importe o repositório na Vercel e defina as variáveis `DATABASE_URL` (connection string
**pooled** do Neon) e `JWT_SECRET` (32+ caracteres aleatórios).

## API

Um único endpoint `POST /api` com corpo `{ "op": "...", ...args }`. Operações em
`server/rotas.ts`, cada uma marcada como `publico`, `equipe` ou `admin`. A consulta pública
(`pedido.consultar`) só devolve a palavra-chave quando o status é `pronto`.

## Rotas do app

| Rota | Tela |
|---|---|
| `/` | Início (CPF) |
| `/pedido` | Resultado: pronto / em separação / retirado / nada encontrado |
| `/admin/login` | Login |
| `/admin` | Dashboard com resumo, busca e paginação |
| `/admin/importar` | Importação de TXT com pré-visualização |
| `/admin/pedido/:id` | Detalhe, status e histórico |
| `/admin/personalizacao` | Logo, cores, textos, formato da palavra-chave, preview ao vivo |
| `/admin/configuracoes` | Dados do mercado, usuários e troca de senha |

## Importação

Aceita o formato da SPEC §6 e o export do Carrefour (`#<número>`, tabela de produtos com EAN).
Exemplo fictício em `docs/exemplos/pedidos-carrefour.txt`. A gravação é feita numa transação:
ou entram todos os pedidos do lote, ou nenhum.
