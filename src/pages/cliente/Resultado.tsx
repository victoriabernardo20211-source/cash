import { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { ResultadoView, type PedidoPublico } from '../../components/cliente'
import { useConfig } from '../../lib/config'
import { soDigitos } from '../../lib/format'
import { supabase } from '../../lib/supabase'

export default function Resultado() {
  const { config } = useConfig()
  const navegar = useNavigate()
  const { state } = useLocation()
  const [params] = useSearchParams()
  const cpf = soDigitos((state as { cpf?: string } | null)?.cpf ?? params.get('cpf') ?? '')
  const [pedidos, setPedidos] = useState<PedidoPublico[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (cpf.length !== 11) return
    let ativo = true
    supabase.rpc('consultar_pedido_por_cpf', { cpf }).then(({ data, error }) => {
      if (!ativo) return
      if (error) setErro('Não foi possível consultar agora. Tente novamente em instantes.')
      else setPedidos((data as PedidoPublico[]) ?? [])
    })
    return () => {
      ativo = false
    }
  }, [cpf])

  if (cpf.length !== 11) return <Navigate to="/" replace />
  const voltar = () => navegar('/')

  if (erro)
    return (
      <div className="grid min-h-dvh place-items-center p-6 text-center">
        <div>
          <p className="text-vermelho">{erro}</p>
          <button className="mt-4 font-bold text-azul" onClick={voltar}>Voltar</button>
        </div>
      </div>
    )
  if (!pedidos) return <div className="grid min-h-dvh place-items-center text-secundario">Consultando…</div>

  return (
    <div className="flex min-h-dvh flex-col">
      <ResultadoView config={config} pedidos={pedidos} onVoltar={voltar} />
    </div>
  )
}
