# Click & Retire — Brief de build para Claude Code

Sistema de **retirada de produtos** (estilo "Click & Retire" de supermercado).
O cliente consulta o pedido pelo CPF; quando está pronto, recebe uma **palavra-chave**
para apresentar no balcão. Há um **painel administrativo** completo.

> **Como usar:** cole o bloco "Prompt inicial" (no fim deste arquivo) no Claude Code
> dentro de um repositório vazio. Este documento inteiro serve de especificação —
> mantenha-o no repo como `SPEC.md`.

---

## 1. Stack recomendada

- **Frontend:** React + Vite + TypeScript + Tailwind CSS. Mobile-first.
- **Backend / dados:** Supabase (Postgres + Auth + Storage).
- **Deploy:** Vercel.
- **Roteamento:** React Router.
- Sem dependência de UI kit pesado — componentes próprios simples (cards, badges, inputs).

O app do cliente é **público** (consulta por CPF, sem login). O painel admin exige
login (Supabase Auth, e-mail + senha).

---

## 2. Identidade visual (tokens)

Definir como CSS variables / theme do Tailwind. **Todas editáveis em runtime** pela
tabela `config` (ver seção 4) — os valores abaixo são os defaults.

```
--azul:      #254F9B   /* cabeçalhos, botões primários, marca */
--vermelho:  #C20016   /* alertas e ações de atenção */
--verde:     #0E8A4F   /* status "Pronto para retirada" */
--bg:        #F4F6FA   /* fundo da tela */
--card:      #FFFFFF   /* cards */
--texto:     #1A1A1A   /* texto principal */
--secundario:#6B7280   /* texto secundário */
--borda:     #E6E9F0
```

- **Fonte:** Plus Jakarta Sans (400–800). A palavra-chave usa Space Grotesk 700 (bem legível à distância).
- Cantos arredondados 12–16px, sombras suaves, botões altos (≥52px), ícones lineares (stroke).
- Badges de status por cor:
  - **Em separação** → fundo `#EAF0FB`, texto `#254F9B`
  - **Pronto para retirada** → fundo `#E3F4EA`, texto `#0C7A44`
  - **Retirado** → fundo `#F0F2F7`, texto `#6B7280`

---

## 3. Status do pedido

Enum `order_status`: `em_separacao` | `pronto` | `retirado`.

- A **palavra-chave só aparece para o cliente quando o status é `pronto`**.
- Em `em_separacao`: tela mostra aviso "sendo separado", sem palavra-chave.
- Em `retirado`: badge cinza; palavra-chave não é mais destacada.

---

## 4. Modelo de dados (Supabase / Postgres)

### `config` (identidade do app — linha única, editável pelo admin)
| coluna | tipo | default |
|---|---|---|
| id | int PK | 1 |
| app_name | text | 'Mercado Bom Dia' |
| logo_url | text (Storage) | null |
| cor_azul | text | '#254F9B' |
| cor_vermelho | text | '#C20016' |
| txt_saudacao | text | 'Olá! Vamos ao seu pedido' |
| txt_instrucao | text | 'Digite o seu CPF para consultar o pedido...' |
| txt_botao | text | 'Consultar meu pedido' |
| txt_rodape | text | 'Dúvidas? Fale com o balcão.' |
| txt_erro_vazio | text | 'Nenhum pedido encontrado para este CPF.' |
| mercado_cnpj / endereco / telefone / whatsapp / email / horario | text | — |

### `orders`
| coluna | tipo |
|---|---|
| id | uuid PK |
| numero | text (ex.: "10482", único) |
| cliente_nome | text |
| cpf | text (somente dígitos, indexado) |
| telefone | text |
| palavra_chave | text (gerada automaticamente, única) |
| status | order_status (default `em_separacao`) |
| data_retirada | date |
| created_at / updated_at | timestamptz |

### `order_items`
| coluna | tipo |
|---|---|
| id | uuid PK |
| order_id | uuid FK → orders |
| nome | text |
| quantidade | numeric |
| unidade | text (ex.: "un", "kg") |

### `admin_users`
Gerenciados via Supabase Auth. Tabela de perfil: `id` (= auth.uid), `nome`, `email`, `perfil` (`admin` | `operador`).

### RLS (importante)
- `orders` / `order_items`: **leitura pública filtrada por CPF** (consulta do cliente),
  escrita só autenticado. A consulta do cliente deve ser feita por uma **RPC/Edge Function**
  que recebe o CPF e devolve só o pedido daquele CPF (evita listar a base toda).
- `config`: leitura pública (o app do cliente precisa dos textos/cores); escrita só admin.
- `admin_users` e importação: só autenticado.

---

## 5. Geração da palavra-chave

- Gerada **automaticamente ao importar** cada pedido; **única** na base.
- Formato: `PALAVRA + NÚMERO` (ex.: `GIRASSOL 42`, `PITANGA 88`) — fácil de falar no balcão.
- Usar lista fixa de ~60 palavras simples em pt-BR (frutas/plantas/cores) + número 10–99.
- Verificar colisão contra `orders.palavra_chave`; se colidir, re-sortear.
- (Alternativa configurável: código alfanumérico curto tipo `A7K3`. Deixar como opção.)

---

## 6. Importação de pedidos (TXT)

O admin **cola o texto** ou **envia um arquivo .txt**. O conteúdo tem vários pedidos
**separados por uma linha com `#`**. Cada bloco segue este formato:

```
#
Pedido: 10482
Cliente: Maria Oliveira
CPF: 123.456.789-00
Telefone: (11) 98888-7777
Produtos:
- Arroz branco 5kg | 2 un
- Leite integral 1L | 6 un
- Detergente neutro 500ml | 3 un
Retirada: 15/10/2026
#
Pedido: 10483
Cliente: João Santos
CPF: 987.654.321-00
Telefone: (11) 97777-6666
Produtos:
- Café torrado 500g | 4 un
- Açúcar refinado 1kg | 2 un
Retirada: 15/10/2026
```

**Regras do parser:**
1. Dividir o texto pelos marcadores `#` (ignorar blocos vazios).
2. Em cada bloco, ler os campos por prefixo (`Pedido:`, `Cliente:`, `CPF:`, `Telefone:`, `Retirada:`).
3. Linhas sob `Produtos:` começando com `-` → item. Separar por `|`: lado esquerdo = nome,
   lado direito = `quantidade unidade` (ex.: `2 un`). Se não houver `|`, tentar `nome xQTD`.
4. Normalizar CPF para só dígitos; data `dd/mm/aaaa` → `date`.
5. Gerar `palavra_chave` única; status inicial = `em_separacao`.
6. **Pré-visualização obrigatória** antes de gravar: mostrar nº, cliente, CPF, nº de itens,
   data e a palavra-chave gerada. Só grava ao confirmar.
7. Upsert por `numero` (reimportar não duplica).

---

## 7. Rotas e telas

### Cliente (público, mobile-first)
- `/` — **Início:** logo + nome (da `config`), saudação, campo grande de CPF, botão consultar.
- `/pedido?cpf=` (ou estado) — **Resultado:**
  - cabeçalho com nome do cliente + nº do pedido;
  - badge de status;
  - se `pronto`: **card azul com a palavra-chave em fonte grande** + "Apresente esta palavra-chave no balcão para retirar";
  - se `em_separacao`: aviso + linha do tempo (Recebido → Em separação → Pronto), sem palavra-chave;
  - lista de produtos (nome, quantidade, unidade);
  - data de retirada.
- **Estado vazio:** CPF sem pedido → mensagem amigável (`config.txt_erro_vazio`) + "Tentar outro CPF".

### Admin (autenticado)
- `/admin/login` — e-mail + senha, marca no topo.
- `/admin` — **Dashboard:** 3 cards de resumo (Em separação / Prontos para retirada / Retirados hoje)
  + tabela de pedidos com **busca por CPF ou nome** + paginação. Colunas: Pedido, Cliente, CPF, Status (badge), Retirada, Ações.
- `/admin/importar` — colar TXT / enviar arquivo + pré-visualização com palavras-chave geradas + "Processar pedidos".
- `/admin/pedido/:id` — **Detalhe:** dados do cliente, produtos, palavra-chave (com copiar),
  **dropdown de status editável**, botão "Marcar como retirado", histórico.
- `/admin/personalizacao` — upload de **logo**, nome do app, seletor de **cores**, editor de **todos os textos**, com **preview ao vivo** do app do cliente. Salva na `config`.
- `/admin/configuracoes` — dados do mercado, contato, usuários admin (listar/adicionar/editar).

---

## 8. Referência visual

O layout exato de cada tela está no design (Claude Design / canvas deste projeto).
Para anexar ao repo: no canvas, use **Compartilhar › Exportar › PDF** (ou PNG) e
salve como `docs/design.pdf`. As telas já trazem espaçamentos, tamanhos de fonte,
badges e a hierarquia da palavra-chave prontos para reproduzir.

---

## 9. Prompt inicial (colar no Claude Code)

```
Leia o arquivo SPEC.md na raiz. Construa o sistema "Click & Retire" descrito nele:

Stack: React + Vite + TypeScript + Tailwind + Supabase (Postgres, Auth, Storage), deploy Vercel.

Passos:
1. Scaffold do projeto Vite + Tailwind + React Router. Configure os tokens de cor e as
   fontes (Plus Jakarta Sans; Space Grotesk para a palavra-chave).
2. Crie as migrations do Supabase para as tabelas config, orders, order_items, admin_users,
   o enum order_status e as políticas RLS descritas na seção 4. Inclua uma RPC
   `consultar_pedido_por_cpf(cpf text)` para a consulta pública segura.
3. Implemente o app do cliente (seção 7): Início, Resultado (com os 3 estados de status),
   e estado vazio. A palavra-chave só aparece quando status = 'pronto'.
4. Implemente o painel admin: login, dashboard com busca, importação de TXT com o parser
   e as regras da seção 6 (com pré-visualização antes de gravar e geração de palavra-chave
   única da seção 5), detalhe do pedido com status editável, personalização (com preview
   ao vivo) e configurações.
5. Todos os textos/cores/logo do app do cliente vêm da tabela config e são editáveis no admin.
6. Mobile-first, seguindo os tokens visuais da seção 2. Deixe .env.example com as chaves do Supabase.

Comece pelo scaffold e pelas migrations. Me mostre o plano antes de gerar muitos arquivos.
```
