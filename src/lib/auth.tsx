import type { Session } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { supabase } from './supabase'

export interface Perfil {
  id: string
  nome: string
  email: string
  perfil: 'admin' | 'operador'
}

interface Ctx {
  session: Session | null
  perfil: Perfil | null
  carregando: boolean
  sair: () => Promise<void>
}

const AuthContext = createContext<Ctx>({ session: null, perfil: null, carregando: true, sair: async () => {} })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [perfil, setPerfil] = useState<Perfil | null | undefined>(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const uid = session?.user.id
  useEffect(() => {
    if (session === undefined) return
    if (!uid) {
      setPerfil(null)
      return
    }
    let ativo = true
    setPerfil(undefined)
    supabase
      .from('admin_users')
      .select('id, nome, email, perfil')
      .eq('id', uid)
      .maybeSingle()
      .then(({ data }) => ativo && setPerfil((data as Perfil | null) ?? null))
    return () => {
      ativo = false
    }
  }, [uid, session === undefined]) // eslint-disable-line react-hooks/exhaustive-deps

  const carregando = session === undefined || perfil === undefined

  const sair = async () => {
    await supabase.auth.signOut()
  }

  return <AuthContext.Provider value={{ session: session ?? null, perfil: perfil ?? null, carregando, sair }}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext)

export function RequireStaff({ children, soAdmin = false }: { children: ReactNode; soAdmin?: boolean }) {
  const { session, perfil, carregando } = useAuth()
  const local = useLocation()
  if (carregando) return <div className="grid min-h-dvh place-items-center text-secundario">Carregando…</div>
  if (!session || !perfil) return <Navigate to="/admin/login" replace state={{ de: local.pathname }} />
  if (soAdmin && perfil.perfil !== 'admin')
    return <p className="p-6 text-secundario">Apenas administradores podem acessar esta página.</p>
  return <>{children}</>
}
