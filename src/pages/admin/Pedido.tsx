import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Aviso, BadgeStatus, Botao, Cartao, IconeCheck, IconeCopiar, IconeVoltar } from '../../components/ui'
import { formatarData, formatarDataHora, formatarQtd, mascaraCpf } from '../../lib/format'
import { supabase } from '../../lib/supabase'
import { STATUS_LABEL, type Order, type OrderItem, type OrderStatus } from '../../lib/types'

interface Evento {
  id: number
  status: OrderStatus
  created_at: string
}

export default function Pedido() {
  const { id } = useParams()
  const [pedido, setPedido] = useState<Order | null>(null)
  const [itens, setItens] = useState<OrderItem[]>([])
  const [eventos, setEventos] = useState<Evento[]>([])
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [copiado, setCopiado] = useState(false)

  const carregar = useCallback(async () => {
    const [o, i, e] = await Promise.all([
      supabase.from('orders').select('*').eq('id', id).maybeSingle(),
      supabase.from('order_items').select('*').eq('order_id', id).order('posicao'),
      supabase.from('order_events').select('id, status, created_at').eq('order_id', id).order('created_at', { ascending: false }),
    ])
    if (o.error || !o.data) setErro(o.error?.message ?? 'Pedido não encontrado.')
    setPedido(o.data as Order | null)
    setItens((i.data as OrderItem[]) ?? [])
    setEventos((e.data as Evento[]) ?? [])
  }, [id])

  useEffect(() => {
    carregar()
  }, [carregar])

  const mudarStatus = async (status: OrderStatus) => {
    if (!pedido || status === pedido.status) return
    setSalvando(true)
    const { error } = await supabase.from('orders').update({ status }).eq('id', pedido.id)
    setSalvando(false)
    if (error) setErro(error.message)
    else carregar()
  }

  const copiar = async () => {
    if (!pedido) return
    await navigator.clipboard.writeText(pedido.palavra_chave)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 1500)
  }

  if (!pedido)
    return erro ? <Aviso>{erro}</Aviso> : <p className="text-secundario">Carregando…</p>

  return (
    <div className="mx-auto max-w-4xl">
      <Link to="/admin" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-secundario hover:text-azul">
        <IconeVoltar className="size-4" /> Pedidos
      </Link>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-extrabold">Pedido #{pedido.numero}</h1>
        <BadgeStatus status={pedido.status} />
      </div>
      {erro && <div className="mb-4"><Aviso>{erro}</Aviso></div>}

      <div className="grid gap-4 md:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Cartao className="p-5">
            <h2 className="mb-3 font-bold">Cliente</h2>
            <dl className="grid grid-cols-[100px_1fr] gap-y-2 text-sm">
              <dt className="text-secundario">Nome</dt><dd className="font-semibold">{pedido.cliente_nome}</dd>
              <dt className="text-secundario">CPF</dt><dd>{mascaraCpf(pedido.cpf)}</dd>
              <dt className="text-secundario">Telefone</dt>
              <dd>{pedido.telefone ? <a className="text-azul hover:underline" href={`tel:${pedido.telefone.replace(/[^\d+]/g, '')}`}>{pedido.telefone}</a> : '—'}</dd>
              <dt className="text-secundario">Retirada</dt><dd>{formatarData(pedido.data_retirada)}</dd>
            </dl>
          </Cartao>

          <Cartao className="p-5">
            <h2 className="mb-3 font-bold">Produtos ({itens.length})</h2>
            <ul className="divide-y divide-borda text-sm">
              {itens.map((it) => (
                <li key={it.id} className="flex items-start justify-between gap-3 py-2.5">
                  <span>
                    {it.nome}
                    {it.ean && <span className="block text-xs text-secundario">EAN {it.ean}</span>}
                  </span>
                  <span className="shrink-0 font-semibold">{formatarQtd(it.quantidade)} {it.unidade}</span>
                </li>
              ))}
            </ul>
          </Cartao>
        </div>

        <div className="space-y-4">
          <div className="rounded-card bg-azul p-5 text-white shadow-suave">
            <p className="text-xs font-semibold tracking-wide text-white/80 uppercase">Palavra-chave</p>
            <p className="my-2 font-chave text-3xl font-bold">{pedido.palavra_chave}</p>
            <button onClick={copiar} className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1.5 text-sm font-semibold hover:bg-white/25">
              {copiado ? <IconeCheck className="size-4" /> : <IconeCopiar className="size-4" />}
              {copiado ? 'Copiado' : 'Copiar'}
            </button>
            {pedido.status !== 'pronto' && <p className="mt-3 text-xs text-white/80">O cliente só vê a palavra-chave quando o pedido está pronto.</p>}
          </div>

          <Cartao className="space-y-3 p-5">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold">Status</span>
              <select
                value={pedido.status}
                disabled={salvando}
                onChange={(e) => mudarStatus(e.target.value as OrderStatus)}
                className="h-12 w-full rounded-campo border border-borda bg-card px-3 outline-none focus:border-azul"
              >
                {Object.entries(STATUS_LABEL).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
              </select>
            </label>
            {pedido.status === 'em_separacao' && (
              <Botao className="w-full bg-verde" disabled={salvando} onClick={() => mudarStatus('pronto')}>Marcar como pronto</Botao>
            )}
            {pedido.status === 'pronto' && (
              <Botao className="w-full" disabled={salvando} onClick={() => mudarStatus('retirado')}>
                <IconeCheck className="size-5" /> Marcar como retirado
              </Botao>
            )}
          </Cartao>

          <Cartao className="p-5">
            <h2 className="mb-3 font-bold">Histórico</h2>
            <ol className="space-y-3 border-l-2 border-borda pl-4 text-sm">
              {eventos.map((ev) => (
                <li key={ev.id} className="relative">
                  <span className="absolute top-1.5 -left-[21px] size-2.5 rounded-full bg-azul" />
                  <p className="font-semibold">{STATUS_LABEL[ev.status]}</p>
                  <p className="text-xs text-secundario">{formatarDataHora(ev.created_at)}</p>
                </li>
              ))}
              <li className="relative">
                <span className="absolute top-1.5 -left-[21px] size-2.5 rounded-full bg-borda" />
                <p className="font-semibold">Importado</p>
                <p className="text-xs text-secundario">{formatarDataHora(pedido.created_at)}</p>
              </li>
            </ol>
          </Cartao>
        </div>
      </div>
    </div>
  )
}
