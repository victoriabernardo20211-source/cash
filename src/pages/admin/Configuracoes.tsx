import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Aviso, Botao, Campo, Cartao } from '../../components/ui'
import { api } from '../../lib/api'
import { useAuth, type Perfil } from '../../lib/auth'
import { useConfig } from '../../lib/config'
import type { AppConfig } from '../../lib/types'
import { Titulo } from './Layout'

type CamposMercado = Pick<AppConfig, 'mercado_cnpj' | 'mercado_endereco' | 'mercado_telefone' | 'mercado_whatsapp' | 'mercado_email' | 'mercado_horario'>
type Msg = { tipo: 'ok' | 'erro'; texto: string } | null

const CAMPOS: { campo: keyof CamposMercado; rotulo: string; tipo?: string }[] = [
  { campo: 'mercado_cnpj', rotulo: 'CNPJ' },
  { campo: 'mercado_endereco', rotulo: 'Endereço' },
  { campo: 'mercado_telefone', rotulo: 'Telefone', tipo: 'tel' },
  { campo: 'mercado_whatsapp', rotulo: 'WhatsApp', tipo: 'tel' },
  { campo: 'mercado_email', rotulo: 'E-mail', tipo: 'email' },
  { campo: 'mercado_horario', rotulo: 'Horário de retirada' },
]

const erroMsg = (e: unknown): Msg => ({ tipo: 'erro', texto: (e as Error).message })

export default function Configuracoes() {
  return (
    <>
      <Titulo sub="Dados do mercado, usuários do painel e sua senha.">Configurações</Titulo>
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-6">
          <DadosMercado />
          <RetiradaAutomatica />
          <MinhaSenha />
        </div>
        <Usuarios />
      </div>
    </>
  )
}

function DadosMercado() {
  const { config, recarregar } = useConfig()
  const [form, setForm] = useState<CamposMercado>(config)
  const [msg, setMsg] = useState<Msg>(null)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => setForm(config), [config])

  const salvar = async (e: FormEvent) => {
    e.preventDefault()
    setSalvando(true)
    try {
      await api('config.salvar', Object.fromEntries(CAMPOS.map(({ campo }) => [campo, form[campo]?.trim() || null])))
      setMsg({ tipo: 'ok', texto: 'Dados salvos.' })
      recarregar()
    } catch (e) {
      setMsg(erroMsg(e))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Cartao className="p-5">
      <h2 className="mb-4 font-bold">Dados do mercado</h2>
      <form onSubmit={salvar} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {CAMPOS.map(({ campo, rotulo, tipo }) => (
            <Campo key={campo} rotulo={rotulo} type={tipo} value={form[campo] ?? ''} onChange={(e) => setForm((f) => ({ ...f, [campo]: e.target.value }))} />
          ))}
        </div>
        {msg && <Aviso tipo={msg.tipo}>{msg.texto}</Aviso>}
        <Botao type="submit" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar dados'}</Botao>
      </form>
    </Cartao>
  )
}

function RetiradaAutomatica() {
  const { config, recarregar } = useConfig()
  const [min, setMin] = useState(String(config.auto_retirada_min))
  const [msg, setMsg] = useState<Msg>(null)

  useEffect(() => setMin(String(config.auto_retirada_min)), [config.auto_retirada_min])

  const salvar = async (e: FormEvent) => {
    e.preventDefault()
    try {
      await api('config.salvar', { auto_retirada_min: Number(min) })
      setMsg({ tipo: 'ok', texto: Number(min) ? `Pedidos prontos viram "Retirado" após ${min} min.` : 'Retirada automática desligada.' })
      recarregar()
    } catch (e) {
      setMsg(erroMsg(e))
    }
  }

  return (
    <Cartao className="p-5">
      <h2 className="mb-1 font-bold">Retirada automática</h2>
      <p className="mb-4 text-sm text-secundario">Depois desse tempo como "Pronto", o pedido passa sozinho para "Retirado". Use 0 para desligar.</p>
      <form onSubmit={salvar} className="flex flex-wrap items-end gap-3">
        <Campo rotulo="Minutos" type="number" min={0} max={10080} required value={min} onChange={(e) => setMin(e.target.value)} className="w-32" />
        <Botao type="submit" variante="secundario">Salvar</Botao>
      </form>
      {msg && <div className="mt-3"><Aviso tipo={msg.tipo}>{msg.texto}</Aviso></div>}
    </Cartao>
  )
}

function MinhaSenha() {
  const [atual, setAtual] = useState('')
  const [nova, setNova] = useState('')
  const [msg, setMsg] = useState<Msg>(null)

  const salvar = async (e: FormEvent) => {
    e.preventDefault()
    try {
      await api('auth.trocarSenha', { atual, nova })
      setAtual('')
      setNova('')
      setMsg({ tipo: 'ok', texto: 'Senha alterada.' })
    } catch (e) {
      setMsg(erroMsg(e))
    }
  }

  return (
    <Cartao className="p-5">
      <h2 className="mb-4 font-bold">Minha senha</h2>
      <form onSubmit={salvar} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo rotulo="Senha atual" type="password" autoComplete="current-password" required value={atual} onChange={(e) => setAtual(e.target.value)} />
          <Campo rotulo="Nova senha" type="password" autoComplete="new-password" minLength={8} required value={nova} onChange={(e) => setNova(e.target.value)} dica="Mínimo 8 caracteres" />
        </div>
        {msg && <Aviso tipo={msg.tipo}>{msg.texto}</Aviso>}
        <Botao type="submit" variante="secundario">Alterar senha</Botao>
      </form>
    </Cartao>
  )
}

function Usuarios() {
  const { perfil: eu } = useAuth()
  const [lista, setLista] = useState<Perfil[]>([])
  const [novo, setNovo] = useState({ email: '', nome: '', senha: '', perfil: 'operador' as Perfil['perfil'] })
  const [msg, setMsg] = useState<Msg>(null)

  const carregar = useCallback(async () => {
    try {
      setLista(await api<Perfil[]>('usuarios.listar'))
    } catch (e) {
      setMsg(erroMsg(e))
    }
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  const executar = async (op: string, args: Record<string, unknown>, ok?: string) => {
    try {
      await api(op, args)
      if (ok) setMsg({ tipo: 'ok', texto: ok })
      await carregar()
      return true
    } catch (e) {
      setMsg(erroMsg(e))
      await carregar()
      return false
    }
  }

  const adicionar = async (e: FormEvent) => {
    e.preventDefault()
    if (await executar('usuarios.salvar', novo, `${novo.email} adicionado. Passe a senha para a pessoa por um canal seguro.`))
      setNovo({ email: '', nome: '', senha: '', perfil: 'operador' })
  }

  const redefinirSenha = (u: Perfil) => {
    const senha = prompt(`Nova senha para ${u.email} (mínimo 8 caracteres):`)
    if (senha) executar('usuarios.salvar', { ...u, senha }, `Senha de ${u.email} redefinida.`)
  }

  const remover = (u: Perfil) => {
    if (confirm(`Remover o acesso de ${u.email} ao painel?`)) executar('usuarios.remover', { id: u.id }, `${u.email} removido.`)
  }

  return (
    <Cartao className="self-start p-5">
      <h2 className="mb-4 font-bold">Usuários do painel</h2>
      <ul className="divide-y divide-borda">
        {lista.map((u) => (
          <li key={u.id} className="flex flex-wrap items-center gap-2 py-3">
            <div className="min-w-0 flex-1">
              <input
                defaultValue={u.nome}
                placeholder="Nome"
                onBlur={(e) => e.target.value !== u.nome && executar('usuarios.salvar', { ...u, nome: e.target.value })}
                className="w-full bg-transparent font-semibold outline-none focus:underline"
              />
              <p className="truncate text-xs text-secundario">{u.email}{u.id === eu?.id && ' (você)'}</p>
            </div>
            <select
              value={u.perfil}
              disabled={u.id === eu?.id}
              onChange={(e) => executar('usuarios.salvar', { ...u, perfil: e.target.value })}
              className="h-9 rounded-lg border border-borda bg-card px-2 text-sm"
            >
              <option value="admin">Admin</option>
              <option value="operador">Operador</option>
            </select>
            {u.id !== eu?.id && (
              <>
                <Botao tamanho="p" variante="fantasma" onClick={() => redefinirSenha(u)}>Senha</Botao>
                <Botao tamanho="p" variante="fantasma" className="text-vermelho" onClick={() => remover(u)}>Remover</Botao>
              </>
            )}
          </li>
        ))}
      </ul>

      <form onSubmit={adicionar} className="mt-4 space-y-3 border-t border-borda pt-4">
        <h3 className="text-sm font-bold">Adicionar usuário</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo rotulo="E-mail" type="email" required value={novo.email} onChange={(e) => setNovo({ ...novo, email: e.target.value })} />
          <Campo rotulo="Nome" value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} />
          <Campo rotulo="Senha inicial" type="text" autoComplete="off" minLength={8} required value={novo.senha} onChange={(e) => setNovo({ ...novo, senha: e.target.value })} dica="Mínimo 8 caracteres" />
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">Perfil</span>
            <select value={novo.perfil} onChange={(e) => setNovo({ ...novo, perfil: e.target.value as Perfil['perfil'] })} className="h-[50px] w-full rounded-campo border border-borda bg-card px-3">
              <option value="operador">Operador (pedidos)</option>
              <option value="admin">Admin (tudo)</option>
            </select>
          </label>
        </div>
        <Botao type="submit">Adicionar</Botao>
        {msg && <Aviso tipo={msg.tipo}>{msg.texto}</Aviso>}
      </form>
    </Cartao>
  )
}
