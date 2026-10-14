import type { IncomingMessage, ServerResponse } from 'node:http'
import { ErroApi, buscarUsuario, executar } from './rotas.js'
import { COOKIE, cookieSessao, lerCookie, lerToken } from './sessao.js'

const LIMITE = 2_000_000 // 2 MB (logo em base64 + lotes grandes de importação)

async function lerCorpo(req: IncomingMessage & { body?: unknown }): Promise<unknown> {
  if (req.body !== undefined) return typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  let tam = 0
  const partes: Buffer[] = []
  for await (const p of req) {
    tam += p.length
    if (tam > LIMITE) throw new ErroApi(413, 'Requisição muito grande.')
    partes.push(p)
  }
  return partes.length ? JSON.parse(Buffer.concat(partes).toString('utf8')) : {}
}

/** Adaptador Node (Vercel Functions e middleware do Vite em dev). */
export async function tratar(req: IncomingMessage & { body?: unknown }, res: ServerResponse): Promise<void> {
  const responder = (status: number, corpo: unknown) => {
    res.statusCode = status
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store')
    res.end(JSON.stringify(corpo))
  }

  if (req.method !== 'POST') return responder(405, { erro: 'Use POST.' })
  // Exige JSON: formulários de outros sites não conseguem enviar este content-type sem preflight (CSRF).
  if (!String(req.headers['content-type']).startsWith('application/json')) return responder(415, { erro: 'Envie JSON.' })

  const seguro = req.headers['x-forwarded-proto'] === 'https'
  try {
    const corpo = (await lerCorpo(req)) as { op?: unknown }
    const { op, ...args } = corpo ?? {}
    const uid = await lerToken(lerCookie(req.headers.cookie, COOKIE))
    const usuario = uid ? await buscarUsuario(uid) : null
    const dados = await executar(String(op), args, {
      usuario,
      setSessao: (token) => {
        res.setHeader('Set-Cookie', cookieSessao(token, seguro))
      },
    })
    responder(200, { dados: dados ?? null })
  } catch (e) {
    if (e instanceof ErroApi) return responder(e.status, { erro: e.message })
    if (e instanceof SyntaxError) return responder(400, { erro: 'JSON inválido.' })
    console.error(e)
    responder(500, { erro: 'Erro interno. Tente novamente.' })
  }
}
