import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { InicioView } from '../../components/cliente'
import { useConfig } from '../../lib/config'
import { cpfValido, soDigitos } from '../../lib/format'

export default function Inicio() {
  const { config } = useConfig()
  const navegar = useNavigate()
  const [cpf, setCpf] = useState('')
  const [erro, setErro] = useState<string | null>(null)

  const enviar = () => {
    if (!cpfValido(cpf)) {
      setErro('Confira o CPF digitado.')
      return
    }
    // CPF vai no state (não na URL) para não ficar no histórico/logs.
    navegar('/pedido', { state: { cpf: soDigitos(cpf) } })
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <InicioView config={config} cpf={cpf} onCpf={(v) => { setCpf(v); setErro(null) }} onEnviar={enviar} erro={erro} />
    </div>
  )
}
