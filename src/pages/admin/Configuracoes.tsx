import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Aviso, Botao, Campo, Cartao } from '../../components/ui'
import { useAuth, type Perfil } from '../../lib/auth'
import { useConfig } from '../../lib/config'
import { supabase } from '../../lib/supabase'
import type { AppConfig } from '../../lib/types'
import { Titulo } from './Layout'

type CamposMercado = Pick<AppConfig, 'mercado_cnpj' | 'mercado_endereco' | 'mercado_telefone' | 'mercado_whatsapp' | 'mercado_email' | 'mercado_horario'>

const CAMPOS: { campo: keyof CamposMercado; rotulo: string; tipo?: string }[] = [
  { campo: 'mercado_cnpj', rotulo: 'CNPJ' },
  { campo: 'mercado_endereco', rotulo: 'Endereço' },
  { campo: 'mercado_telefone', rotulo: 'Telefone', tipo: 'tel' },
  { campo: 'mercado_whatsapp', rotulo: 'WhatsApp', tipo: 'tel' },
  { campo: 'mercado_email', rotulo: 'E-mail', tipo: 'email' },
  { campo: 'mercado_horario', rotulo: 'Horário de retirada' },
]

export default function Configuracoes() {
  return (
    <>
      <Titulo sub="Dados do mercado e usuários do painel.">Configurações</Titulo>
      <div className="grid gap-6 xl:grid-cols-2">
        <DadosMercado />
        <Usuarios />
      </div>
    </>
  )
}

function DadosMercado() {
  const { config, recarregar } = useConfig()
  const [form, setForm] = useState<CamposMercado>(config)
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => setForm(config), [config])

  const salvar = async (e: FormEvent) => {
    e.preventDefault()
    setSalvando(true)
    const dados = Object.fromEntries(CAMPOS.map(({ campo }) => [campo, form[campo]?.trim() || null]))
    const { error } = await supabase.from('config').update(dados).eq('id', 1)
    setSalvando(false)
    if (error) setMsg({ tipo: 'erro', texto: error.message })
    else {
      setMsg({ tipo: 'ok', texto: 'Dados salvos.' })
      recarregar()
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

function Usuarios() {
  const { perfil: eu } = useAuth()
  const [lista, setLista] = useState<Perfil[]>([])
  const [novo, setNovo] = useState({ email: '', nome: '', perfil: 'operador' as Perfil['perfil'] })
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)

  const carregar = useCallback(async () => {
    const { data } = await supabase.from('admin_users').select('id, nome, email, perfil').order('nome')
    setLista((data as Perfil[]) ?? [])
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  const adicionar = async (e: FormEvent) => {
    e.preventDefault()
    const { error } = await supabase.rpc('adicionar_membro', { p_email: novo.email, p_nome: novo.nome, p_perfil: novo.perfil })
    if (error) return setMsg({ tipo: 'erro', texto: error.message })
    setMsg({ tipo: 'ok', texto: `${novo.email} adicionado.` })
    setNovo({ email: '', nome: '', perfil: 'operador' })
    carregar()
  }

  const atualizar = async (id: string, dados: Partial<Perfil>) => {
    const { error } = await supabase.from('admin_users').update(dados).eq('id', id)
    if (error) setMsg({ tipo: 'erro', texto: error.message })
    carregar()
  }

  const remover = async (u: Perfil) => {
    if (!confirm(`Remover o acesso de ${u.email} ao painel?`)) return
    const { error } = await supabase.from('admin_users').delete().eq('id', u.id)
    if (error) setMsg({ tipo: 'erro', texto: error.message })
    carregar()
  }

  return (
    <Cartao className="p-5">
      <h2 className="mb-4 font-bold">Usuários do painel</h2>
      <ul className="divide-y divide-borda">
        {lista.map((u) => (
          <li key={u.id} className="flex flex-wrap items-center gap-2 py-3">
            <div className="min-w-0 flex-1">
              <input
                defaultValue={u.nome}
                placeholder="Nome"
                onBlur={(e) => e.target.value !== u.nome && atualizar(u.id, { nome: e.target.value })}
                className="w-full bg-transparent font-semibold outline-none focus:underline"
              />
              <p className="truncate text-xs text-secundario">{u.email}</p>
            </div>
            <select
              value={u.perfil}
              disabled={u.id === eu?.id}
              onChange={(e) => atualizar(u.id, { perfil: e.target.value as Perfil['perfil'] })}
              className="h-9 rounded-lg border border-borda bg-card px-2 text-sm"
            >
              <option value="admin">Admin</option>
              <option value="operador">Operador</option>
            </select>
            {u.id !== eu?.id && (
              <Botao tamanho="p" variante="fantasma" className="text-vermelho" onClick={() => remover(u)}>Remover</Botao>
            )}
          </li>
        ))}
      </ul>

      <form onSubmit={adicionar} className="mt-4 space-y-3 border-t border-borda pt-4">
        <h3 className="text-sm font-bold">Adicionar usuário</h3>
        <p className="text-xs text-secundario">
          Primeiro convide a pessoa em Supabase → Authentication → Users. Depois informe o e-mail aqui para liberar o painel.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo rotulo="E-mail" type="email" required value={novo.email} onChange={(e) => setNovo({ ...novo, email: e.target.value })} />
          <Campo rotulo="Nome" value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} />
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">Perfil</span>
            <select value={novo.perfil} onChange={(e) => setNovo({ ...novo, perfil: e.target.value as Perfil['perfil'] })} className="h-[52px] rounded-campo border border-borda bg-card px-3">
              <option value="operador">Operador (pedidos)</option>
              <option value="admin">Admin (tudo)</option>
            </select>
          </label>
          <Botao type="submit">Adicionar</Botao>
        </div>
        {msg && <Aviso tipo={msg.tipo}>{msg.texto}</Aviso>}
      </form>
    </Cartao>
  )
}
