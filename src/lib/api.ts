/** Cliente da API (POST /api { op, ...args }). Lança Error com a mensagem do servidor. */
export class ErroApi extends Error {
  status: number
  constructor(status: number, mensagem: string) {
    super(mensagem)
    this.status = status
  }
}

export async function api<T = unknown>(op: string, args: Record<string, unknown> = {}): Promise<T> {
  let resp: Response
  try {
    resp = await fetch('/api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ op, ...args }),
    })
  } catch {
    throw new ErroApi(0, 'Sem conexão. Verifique a internet e tente de novo.')
  }
  const corpo = await resp.json().catch(() => ({}))
  if (!resp.ok) {
    if (resp.status === 401 && op !== 'auth.entrar') window.dispatchEvent(new Event('sessao-expirada'))
    throw new ErroApi(resp.status, corpo.erro ?? 'Erro inesperado.')
  }
  return corpo.dados as T
}
