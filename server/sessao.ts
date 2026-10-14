import { SignJWT, jwtVerify } from 'jose'

export const COOKIE = 'cr_sessao'
const DURACAO = 60 * 60 * 24 * 7 // 7 dias

function segredo() {
  const s = process.env.JWT_SECRET
  if (!s || s.length < 32) throw new Error('JWT_SECRET ausente ou curto (mínimo 32 caracteres).')
  return new TextEncoder().encode(s)
}

export async function criarToken(uid: string): Promise<string> {
  return new SignJWT({}).setProtectedHeader({ alg: 'HS256' }).setSubject(uid).setIssuedAt().setExpirationTime(`${DURACAO}s`).sign(segredo())
}

export async function lerToken(token: string | undefined): Promise<string | null> {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, segredo())
    return payload.sub ?? null
  } catch {
    return null
  }
}

export function cookieSessao(token: string | null, seguro: boolean): string {
  const base = `${COOKIE}=${token ?? ''}; Path=/; HttpOnly; SameSite=Lax${seguro ? '; Secure' : ''}`
  return token ? `${base}; Max-Age=${DURACAO}` : `${base}; Max-Age=0`
}

export function lerCookie(header: string | undefined, nome: string): string | undefined {
  return header
    ?.split(';')
    .map((p) => p.trim().split('='))
    .find(([k]) => k === nome)?.[1]
}
