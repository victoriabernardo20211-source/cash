import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { api } from './api'

export interface Perfil {
  id: string
  nome: string
  email: string
  perfil: 'admin' | 'operador'
}

interface Ctx {
  perfil: Perfil | null
  carregando: boolean
  entrar: (email: string, senha: string) => Promise<void>
  sair: () => Promise<void>
}

const AuthContext = createContext<Ctx>({ perfil: null, carregando: true, entrar: async () => {}, sair: async () => {} })

export function AuthProvider({ children }: { children: ReactNode }) {
  // undefined = ainda verificando a sessão (cookie HttpOnly, só o servidor lê).
  const [perfil, setPerfil] = useState<Perfil | null | undefined>(undefined)

  useEffect(() => {
    api<Perfil | null>('auth.eu').then(setPerfil, () => setPerfil(null))
    const expirou = () => setPerfil(null)
    window.addEventListener('sessao-expirada', expirou)
    return () => window.removeEventListener('sessao-expirada', expirou)
  }, [])

  const entrar = useCallback(async (email: string, senha: string) => {
    setPerfil(await api<Perfil>('auth.entrar', { email, senha }))
  }, [])

  const sair = useCallback(async () => {
    await api('auth.sair').catch(() => {})
    setPerfil(null)
  }, [])

  return (
    <AuthContext.Provider value={{ perfil: perfil ?? null, carregando: perfil === undefined, entrar, sair }}>{children}</AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext)

export function RequireStaff({ children, soAdmin = false }: { children: ReactNode; soAdmin?: boolean }) {
  const { perfil, carregando } = useAuth()
  const local = useLocation()
  if (carregando) return <div className="grid min-h-dvh place-items-center text-secundario">Carregando…</div>
  if (!perfil) return <Navigate to="/admin/login" replace state={{ de: local.pathname }} />
  if (soAdmin && perfil.perfil !== 'admin')
    return <p className="p-6 text-secundario">Apenas administradores podem acessar esta página.</p>
  return <>{children}</>
}
