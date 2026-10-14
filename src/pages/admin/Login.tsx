import { useState, type FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Aviso, Botao, Campo, Cartao, Marca } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { useConfig } from '../../lib/config'

export default function Login() {
  const { config } = useConfig()
  const { perfil, carregando, entrar: login } = useAuth()
  const { state } = useLocation()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  if (!carregando && perfil) return <Navigate to={(state as { de?: string } | null)?.de ?? '/admin'} replace />

  const entrar = async (e: FormEvent) => {
    e.preventDefault()
    setEnviando(true)
    setErro(null)
    try {
      await login(email.trim(), senha)
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-azul px-4 py-10">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Marca nome={config.app_name} logo={config.logo_url} claro />
        </div>
        <Cartao className="p-6">
          <h1 className="text-xl font-extrabold">Painel administrativo</h1>
          <p className="mt-1 text-sm text-secundario">Entre com seu e-mail e senha.</p>
          <form onSubmit={entrar} className="mt-6 space-y-4">
            <Campo rotulo="E-mail" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            <Campo rotulo="Senha" type="password" autoComplete="current-password" required value={senha} onChange={(e) => setSenha(e.target.value)} />
            {erro && <Aviso>{erro}</Aviso>}
            <Botao type="submit" className="w-full" disabled={enviando}>
              {enviando ? 'Entrando…' : 'Entrar'}
            </Botao>
          </form>
        </Cartao>
        <p className="mt-6 text-center text-xs text-white/70">Click &amp; Retire</p>
      </div>
    </div>
  )
}
