/**
 * Toda a API em um único endpoint: POST /api { op, ...args }.
 * Uma só função na Vercel (cabe no plano gratuito) e fácil de rodar no dev.
 */
import bcrypt from 'bcryptjs'
import { gerarPalavraChave, type FormatoChave } from '../src/lib/palavraChave.js'
import { db, transacao } from './db.js'
import { criarToken } from './sessao.js'

export class ErroApi extends Error {
  status: number
  constructor(status: number, mensagem: string) {
    super(mensagem)
    this.status = status
  }
}

interface Usuario {
  id: string
  nome: string
  email: string
  perfil: 'admin' | 'operador'
}

export interface Contexto {
  usuario: Usuario | null
  /** Define/limpa o cookie de sessão na resposta. */
  setSessao: (token: string | null) => void
}

type Args = Record<string, unknown>
type Rota = { acesso: 'publico' | 'equipe' | 'admin'; fn: (a: Args, ctx: Contexto) => Promise<unknown> }

const STATUS = ['em_separacao', 'pronto', 'retirado'] as const
const CONTATO = ['pendente', 'em_atendimento', 'ja_liguei', 'nao_atendeu'] as const
const HEX = /^#[0-9a-f]{6}$/i
const CAMPOS_CONFIG = [
  'app_name', 'logo_url', 'cor_azul', 'cor_vermelho', 'txt_saudacao', 'txt_instrucao', 'txt_botao', 'txt_rodape', 'txt_erro_vazio',
  'formato_chave', 'auto_retirada_min', 'mercado_cnpj', 'mercado_endereco', 'mercado_telefone', 'mercado_whatsapp', 'mercado_email', 'mercado_horario',
] as const

const texto = (v: unknown, nome: string, max = 500): string => {
  if (typeof v !== 'string') throw new ErroApi(400, `Campo inválido: ${nome}`)
  if (v.length > max) throw new ErroApi(400, `Campo muito longo: ${nome}`)
  return v
}
const opcional = (v: unknown, nome: string, max = 500) => (v == null || v === '' ? null : texto(v, nome, max))
const digitos = (v: unknown) => String(v ?? '').replace(/\D/g, '')
const uuid = (v: unknown, erro = 'Registro não encontrado.') => {
  if (typeof v !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)) throw new ErroApi(404, erro)
  return v
}

export async function buscarUsuario(id: string): Promise<Usuario | null> {
  const { rows } = await db().query('select id, nome, email, perfil from admin_users where id = $1', [id])
  return rows[0] ?? null
}

/**
 * Pedidos "pronto" há mais de `config.auto_retirada_min` minutos viram "retirado".
 * Roda sob demanda (a cada consulta/listagem), sem precisar de agendador.
 */
async function aplicarRetiradaAutomatica(): Promise<void> {
  await db().query(
    `update orders o set status = 'retirado'
       from config c
      where c.id = 1 and c.auto_retirada_min > 0
        and o.status = 'pronto' and o.pronto_em < now() - make_interval(mins => c.auto_retirada_min)`,
  )
}

async function contarAdmins(): Promise<number> {
  const { rows } = await db().query(`select count(*)::int n from admin_users where perfil = 'admin'`)
  return rows[0].n
}

export const ROTAS: Record<string, Rota> = {
  // ---------- Público ----------
  'config.obter': {
    acesso: 'publico',
    fn: async () => (await db().query('select * from config where id = 1')).rows[0],
  },

  'pedido.consultar': {
    acesso: 'publico',
    fn: async (a) => {
      await aplicarRetiradaAutomatica()
      const cpf = digitos(a.cpf)
      if (cpf.length !== 11) return []
      // Palavra-chave só sai quando status = 'pronto'. Retirados há > 7 dias não aparecem.
      const { rows } = await db().query(
        `select o.numero, o.cliente_nome, o.status, to_char(o.data_retirada, 'YYYY-MM-DD') data_retirada,
                case when o.status = 'pronto' then o.palavra_chave end palavra_chave,
                coalesce((select json_agg(json_build_object('nome', i.nome, 'quantidade', i.quantidade, 'unidade', i.unidade) order by i.posicao)
                          from order_items i where i.order_id = o.id), '[]') itens
           from orders o
          where o.cpf = $1 and (o.status <> 'retirado' or o.retirado_em > now() - interval '7 days')
          order by case o.status when 'pronto' then 0 when 'em_separacao' then 1 else 2 end, o.created_at desc
          limit 10`,
        [cpf],
      )
      return rows.map((r) => ({ ...r, itens: r.itens.map((i: { quantidade: string }) => ({ ...i, quantidade: Number(i.quantidade) })) }))
    },
  },

  // ---------- Sessão ----------
  'auth.entrar': {
    acesso: 'publico',
    fn: async (a, ctx) => {
      const email = texto(a.email, 'email', 200).trim().toLowerCase()
      const senha = texto(a.senha, 'senha', 200)
      const { rows } = await db().query('select id, senha_hash from admin_users where email = $1', [email])
      // Compara mesmo sem usuário para não revelar quais e-mails existem pelo tempo de resposta.
      const ok = await bcrypt.compare(senha, rows[0]?.senha_hash ?? '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv')
      if (!rows[0] || !ok) throw new ErroApi(401, 'E-mail ou senha incorretos.')
      ctx.setSessao(await criarToken(rows[0].id))
      return buscarUsuario(rows[0].id)
    },
  },
  'auth.sair': { acesso: 'publico', fn: async (_a, ctx) => {
    ctx.setSessao(null)
  } },
  'auth.eu': { acesso: 'publico', fn: async (_a, ctx) => ctx.usuario },
  'auth.trocarSenha': {
    acesso: 'equipe',
    fn: async (a, ctx) => {
      const atual = texto(a.atual, 'atual', 200)
      const nova = texto(a.nova, 'nova', 200)
      if (nova.length < 8) throw new ErroApi(400, 'A nova senha precisa ter pelo menos 8 caracteres.')
      const { rows } = await db().query('select senha_hash from admin_users where id = $1', [ctx.usuario!.id])
      if (!(await bcrypt.compare(atual, rows[0].senha_hash))) throw new ErroApi(400, 'Senha atual incorreta.')
      await db().query('update admin_users set senha_hash = $2 where id = $1', [ctx.usuario!.id, await bcrypt.hash(nova, 10)])
      return true
    },
  },

  // ---------- Equipe: pedidos ----------
  'dashboard.resumo': {
    acesso: 'equipe',
    fn: async () => {
      await aplicarRetiradaAutomatica()
      return (
        await db().query(`select
          count(*) filter (where status = 'em_separacao')::int em_separacao,
          count(*) filter (where status = 'pronto')::int pronto,
          count(*) filter (where status = 'retirado'
            and retirado_em >= (date_trunc('day', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo'))::int retirados_hoje
          from orders`)
      ).rows[0]
    },
  },

  'pedidos.listar': {
    acesso: 'equipe',
    fn: async (a) => {
      await aplicarRetiradaAutomatica()
      const porPagina = 20
      const pagina = Math.max(1, Number(a.pagina) || 1)
      const filtros: string[] = []
      const params: unknown[] = []
      if (typeof a.status === 'string' && (STATUS as readonly string[]).includes(a.status)) {
        params.push(a.status)
        filtros.push(`o.status = $${params.length}`)
      }
      if (typeof a.contato === 'string' && (CONTATO as readonly string[]).includes(a.contato)) {
        params.push(a.contato)
        filtros.push(`o.contato = $${params.length}`)
      }
      const termo = typeof a.q === 'string' ? a.q.trim().slice(0, 100) : ''
      if (termo) {
        params.push(`%${termo}%`)
        const ors = [`o.cliente_nome ilike $${params.length}`]
        const d = digitos(termo)
        if (d.length >= 3) {
          params.push(`%${d}%`)
          ors.push(`o.cpf like $${params.length}`, `o.numero like $${params.length}`)
        }
        filtros.push(`(${ors.join(' or ')})`)
      }
      const where = filtros.length ? `where ${filtros.join(' and ')}` : ''
      const { rows } = await db().query(
        `select o.id, o.numero, o.cliente_nome, o.cpf, o.status, to_char(o.data_retirada, 'YYYY-MM-DD') data_retirada,
                o.pronto_em, o.contato, o.contato_em, coalesce(nullif(u.nome, ''), u.email) contato_por_nome, count(*) over()::int total
           from orders o left join admin_users u on u.id = o.contato_por ${where} order by o.created_at desc limit ${porPagina} offset ${(pagina - 1) * porPagina}`,
        params,
      )
      return { pedidos: rows.map(({ total: _t, ...r }) => r), total: rows[0]?.total ?? 0, porPagina }
    },
  },

  'pedido.obter': {
    acesso: 'equipe',
    fn: async (a) => {
      await aplicarRetiradaAutomatica()
      const id = uuid(a.id, 'Pedido não encontrado.')
      const { rows } = await db().query(
        `select o.*, to_char(o.data_retirada, 'YYYY-MM-DD') data_retirada, coalesce(nullif(u.nome, ''), u.email) contato_por_nome,
                (select auto_retirada_min from config where id = 1) auto_retirada_min
           from orders o left join admin_users u on u.id = o.contato_por where o.id = $1`,
        [id],
      )
      if (!rows[0]) throw new ErroApi(404, 'Pedido não encontrado.')
      const [itens, eventos] = await Promise.all([
        db().query('select id, ean, nome, quantidade::float quantidade, unidade from order_items where order_id = $1 order by posicao', [id]),
        db().query(
          `select e.id, e.status, e.created_at, u.nome autor_nome, u.email autor_email
             from order_events e left join admin_users u on u.id = e.autor where e.order_id = $1 order by e.created_at desc, e.id desc`,
          [id],
        ),
      ])
      return { pedido: rows[0], itens: itens.rows, eventos: eventos.rows }
    },
  },

  'pedido.status': {
    acesso: 'equipe',
    fn: async (a, ctx) => {
      const status = texto(a.status, 'status', 20)
      if (!(STATUS as readonly string[]).includes(status)) throw new ErroApi(400, 'Status inválido.')
      return transacao(async (c) => {
        await c.query(`select set_config('app.usuario', $1, true)`, [ctx.usuario!.id])
        const r = await c.query('update orders set status = $2 where id = $1', [uuid(a.id, 'Pedido não encontrado.'), status])
        if (!r.rowCount) throw new ErroApi(404, 'Pedido não encontrado.')
        return true
      })
    },
  },

  /** Tarja de contato com o cliente (quem ligou / está ligando). */
  'pedido.contato': {
    acesso: 'equipe',
    fn: async (a, ctx) => {
      const contato = texto(a.contato, 'contato', 20)
      if (!(CONTATO as readonly string[]).includes(contato)) throw new ErroApi(400, 'Situação de contato inválida.')
      const r = await db().query(
        `update orders set contato = $2, contato_por = $3, contato_em = now() where id = $1`,
        [uuid(a.id, 'Pedido não encontrado.'), contato, contato === 'pendente' ? null : ctx.usuario!.id],
      )
      if (!r.rowCount) throw new ErroApi(404, 'Pedido não encontrado.')
      return { contato, contato_por_nome: contato === 'pendente' ? null : ctx.usuario!.nome || ctx.usuario!.email }
    },
  },

  /** Atribui palavras-chave para a pré-visualização (SPEC §5). Não grava nada. */
  'importar.preparar': {
    acesso: 'equipe',
    fn: async (a) => {
      const numeros = Array.isArray(a.numeros) ? a.numeros.map(String).slice(0, 2000) : []
      const formato = ((await db().query('select formato_chave from config where id = 1')).rows[0]?.formato_chave ?? 'palavra') as FormatoChave
      const existentes = new Map<string, string>(
        (await db().query('select numero, palavra_chave from orders where numero = any($1)', [numeros])).rows.map((r) => [r.numero, r.palavra_chave]),
      )
      const usadas = new Set<string>((await db().query('select palavra_chave from orders')).rows.map((r) => r.palavra_chave))
      return numeros.map((n) => ({ numero: n, existente: existentes.has(n), palavra_chave: existentes.get(n) ?? gerarPalavraChave(usadas, formato) }))
    },
  },

  /** Grava tudo numa transação: ou entram todos os pedidos, ou nenhum. Upsert por `numero`. */
  'importar.gravar': {
    acesso: 'equipe',
    fn: async (a, ctx) => {
      if (!Array.isArray(a.pedidos) || a.pedidos.length === 0) throw new ErroApi(400, 'Nenhum pedido enviado.')
      if (a.pedidos.length > 2000) throw new ErroApi(400, 'Máximo de 2000 pedidos por importação.')
      const pedidos = a.pedidos.map((p: Args, i: number) => {
        const cpf = digitos(p.cpf)
        if (cpf.length !== 11) throw new ErroApi(400, `Pedido ${i + 1}: CPF inválido.`)
        if (!Array.isArray(p.itens) || p.itens.length === 0) throw new ErroApi(400, `Pedido ${i + 1}: sem produtos.`)
        return {
          numero: texto(p.numero, 'numero', 40).trim(),
          cliente_nome: texto(p.cliente_nome, 'cliente_nome', 200).trim(),
          cpf,
          telefone: opcional(p.telefone, 'telefone', 40),
          data_retirada: /^\d{4}-\d{2}-\d{2}$/.test(String(p.data_retirada)) ? String(p.data_retirada) : null,
          palavra_chave: texto(p.palavra_chave, 'palavra_chave', 40).trim(),
          itens: (p.itens as Args[]).slice(0, 500).map((it) => ({
            ean: opcional(it.ean, 'ean', 20),
            nome: texto(it.nome, 'nome', 300),
            quantidade: Number(it.quantidade) || 1,
            unidade: texto(it.unidade ?? 'un', 'unidade', 10),
          })),
        }
      })
      return transacao(async (c) => {
        await c.query(`select set_config('app.usuario', $1, true)`, [ctx.usuario!.id])
        for (const p of pedidos) {
          // status fica de fora do update: reimportar não regride o status.
          // Palavra-chave de pedido existente é mantida.
          const { rows } = await c.query(
            `insert into orders (numero, cliente_nome, cpf, telefone, data_retirada, palavra_chave)
             values ($1, $2, $3, $4, $5, $6)
             on conflict (numero) do update set cliente_nome = excluded.cliente_nome, cpf = excluded.cpf,
               telefone = excluded.telefone, data_retirada = excluded.data_retirada
             returning id`,
            [p.numero, p.cliente_nome, p.cpf, p.telefone, p.data_retirada, p.palavra_chave],
          )
          const id = rows[0].id
          await c.query('delete from order_items where order_id = $1', [id])
          await c.query(
            `insert into order_items (order_id, ean, nome, quantidade, unidade, posicao)
             select $1, x.ean, x.nome, x.quantidade, x.unidade, x.ord - 1
               from rows from (jsonb_to_recordset($2::jsonb) as (ean text, nome text, quantidade numeric, unidade text))
                    with ordinality as x(ean, nome, quantidade, unidade, ord)`,
            [id, JSON.stringify(p.itens)],
          )
        }
        return pedidos.length
      }).catch((e) => {
        if (e?.code === '23505' && String(e.constraint).includes('palavra_chave'))
          throw new ErroApi(409, 'Uma palavra-chave foi usada por outra importação ao mesmo tempo. Pré-visualize de novo.')
        throw e
      })
    },
  },

  // ---------- Admin: configuração e usuários ----------
  'config.salvar': {
    acesso: 'admin',
    fn: async (a) => {
      const sets: string[] = []
      const params: unknown[] = []
      for (const campo of CAMPOS_CONFIG) {
        if (!(campo in a)) continue
        if (campo === 'auto_retirada_min') {
          const n = Number(a[campo])
          if (!Number.isInteger(n) || n < 0 || n > 10080) throw new ErroApi(400, 'Tempo de retirada automática inválido.')
          params.push(n)
          sets.push(`${campo} = $${params.length}`)
          continue
        }
        let v: string | null = opcional(a[campo], campo, campo === 'logo_url' ? 700_000 : 500)
        if ((campo === 'cor_azul' || campo === 'cor_vermelho') && !HEX.test(v ?? '')) throw new ErroApi(400, 'Cor inválida.')
        if (campo === 'formato_chave' && v !== 'palavra' && v !== 'codigo') throw new ErroApi(400, 'Formato inválido.')
        if (campo === 'logo_url' && v && !/^data:image\/(png|jpeg|webp|svg\+xml);base64,/.test(v)) throw new ErroApi(400, 'Logo inválida.')
        if (['app_name', 'txt_saudacao', 'txt_instrucao', 'txt_botao', 'txt_rodape', 'txt_erro_vazio'].includes(campo) && !v)
          throw new ErroApi(400, `O campo ${campo} não pode ficar vazio.`)
        if (campo === 'cor_azul' || campo === 'cor_vermelho') v = v!.toUpperCase()
        params.push(v)
        sets.push(`${campo} = $${params.length}`)
      }
      if (!sets.length) return true
      await db().query(`update config set ${sets.join(', ')} where id = 1`, params)
      return true
    },
  },

  'usuarios.listar': {
    acesso: 'admin',
    fn: async () => (await db().query('select id, nome, email, perfil from admin_users order by nome, email')).rows,
  },

  'usuarios.salvar': {
    acesso: 'admin',
    fn: async (a, ctx) => {
      const perfil = a.perfil === 'admin' ? 'admin' : 'operador'
      const nome = opcional(a.nome, 'nome', 120) ?? ''
      const senha = opcional(a.senha, 'senha', 200)
      if (senha && senha.length < 8) throw new ErroApi(400, 'A senha precisa ter pelo menos 8 caracteres.')
      const hash = senha ? await bcrypt.hash(senha, 10) : null

      if (!a.id) {
        const email = texto(a.email, 'email', 200).trim().toLowerCase()
        if (!/^\S+@\S+\.\S+$/.test(email)) throw new ErroApi(400, 'E-mail inválido.')
        if (!hash) throw new ErroApi(400, 'Defina uma senha inicial.')
        try {
          await db().query('insert into admin_users (email, nome, perfil, senha_hash) values ($1, $2, $3, $4)', [email, nome, perfil, hash])
        } catch (e) {
          if ((e as { code?: string }).code === '23505') throw new ErroApi(409, 'Já existe um usuário com este e-mail.')
          throw e
        }
        return true
      }

      const id = uuid(a.id)
      if (id === ctx.usuario!.id && perfil !== 'admin') throw new ErroApi(400, 'Você não pode remover seu próprio perfil de admin.')
      await db().query(
        'update admin_users set nome = $2, perfil = $3, senha_hash = coalesce($4, senha_hash) where id = $1',
        [id, nome, perfil, hash],
      )
      return true
    },
  },

  'usuarios.remover': {
    acesso: 'admin',
    fn: async (a, ctx) => {
      const id = uuid(a.id)
      if (id === ctx.usuario!.id) throw new ErroApi(400, 'Você não pode remover a si mesmo.')
      const alvo = await buscarUsuario(id)
      if (alvo?.perfil === 'admin' && (await contarAdmins()) <= 1) throw new ErroApi(400, 'É preciso manter ao menos um admin.')
      await db().query('delete from admin_users where id = $1', [id])
      return true
    },
  },
}

export async function executar(op: string, args: Args, ctx: Contexto): Promise<unknown> {
  const rota = ROTAS[op]
  if (!rota) throw new ErroApi(404, 'Operação desconhecida.')
  if (rota.acesso !== 'publico' && !ctx.usuario) throw new ErroApi(401, 'Faça login novamente.')
  if (rota.acesso === 'admin' && ctx.usuario!.perfil !== 'admin') throw new ErroApi(403, 'Apenas administradores.')
  return rota.fn(args, ctx)
}
