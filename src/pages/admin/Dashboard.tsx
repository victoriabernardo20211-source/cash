import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { BadgeStatus, Botao, Cartao, IconeBusca, IconeCheck, IconeRelogio, IconeCaixa, SeletorCanal, SeletorContato, tempoAteAutoPronto, CANAL_COR } from '../../components/ui'
import { formatarData, mascaraCpf } from '../../lib/format'
import { api } from '../../lib/api'
import { useConfig } from '../../lib/config'
import { CANAL_LABEL, CONTATO_LABEL, STATUS_LABEL, type Canal, type ContatoStatus, type Order, type OrderStatus } from '../../lib/types'
import { Titulo } from './Layout'

interface Resumo {
  em_separacao: number
  pronto: number
  retirados_hoje: number
}

export default function Dashboard() {
  const [params, setParams] = useSearchParams()
  const busca = params.get('q') ?? ''
  const status = (params.get('status') ?? '') as OrderStatus | ''
  const pagina = Math.max(1, Number(params.get('p')) || 1)
  const contato = (params.get('contato') ?? '') as ContatoStatus | ''
  const canal = (params.get('canal') ?? '') as Canal | ''
  const { config } = useConfig()
  const [tique, setTique] = useState(0)
  const [salvandoContato, setSalvandoContato] = useState<string | null>(null)

  const [texto, setTexto] = useState(busca)
  const [resumo, setResumo] = useState<Resumo | null>(null)
  const [pedidos, setPedidos] = useState<Order[] | null>(null)
  const [total, setTotal] = useState(0)
  const [porPagina, setPorPagina] = useState(20)
  const [erro, setErro] = useState<string | null>(null)

  const atualizar = (mud: Record<string, string>) => {
    const novo = new URLSearchParams(params)
    Object.entries(mud).forEach(([k, v]) => (v ? novo.set(k, v) : novo.delete(k)))
    setParams(novo, { replace: true })
  }

  // Busca com debounce
  useEffect(() => {
    const t = setTimeout(() => texto !== busca && atualizar({ q: texto, p: '' }), 300)
    return () => clearTimeout(t)
  }, [texto]) // eslint-disable-line react-hooks/exhaustive-deps

  // Atualiza sozinho a cada 20s: outros atendentes veem as tarjas de contato e a retirada automática.
  useEffect(() => {
    const t = setInterval(() => document.visibilityState === 'visible' && setTique((n) => n + 1), 20_000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    api<Resumo>('dashboard.resumo').then(setResumo, () => {})
  }, [tique])

  const mudarCanal = async (p: Order, novo: Canal) => {
    const anterior = p.canal
    setPedidos((ls) => ls?.map((x) => (x.id === p.id ? { ...x, canal: novo } : x)) ?? null)
    try {
      await api('pedido.canal', { id: p.id, canal: novo })
    } catch (e) {
      setPedidos((ls) => ls?.map((x) => (x.id === p.id ? { ...x, canal: anterior } : x)) ?? null)
      setErro((e as Error).message)
    }
  }

  const mudarContato = async (p: Order, novo: ContatoStatus) => {
    const anterior = { contato: p.contato, contato_por_nome: p.contato_por_nome }
    const aplicar = (dados: Partial<Order>) => setPedidos((ls) => ls?.map((x) => (x.id === p.id ? { ...x, ...dados } : x)) ?? null)
    aplicar({ contato: novo })
    setSalvandoContato(p.id)
    try {
      aplicar(await api<Partial<Order>>('pedido.contato', { id: p.id, contato: novo }))
    } catch (e) {
      aplicar(anterior)
      setErro((e as Error).message)
    } finally {
      setSalvandoContato(null)
    }
  }

  useEffect(() => {
    let ativo = true
    api<{ pedidos: Order[]; total: number; porPagina: number }>('pedidos.listar', { q: busca, status, contato, canal, pagina }).then(
      (r) => {
        if (!ativo) return
        setErro(null)
        setPedidos(r.pedidos)
        setTotal(r.total)
        setPorPagina(r.porPagina)
      },
      (e) => ativo && setErro(e.message),
    )
    return () => {
      ativo = false
    }
  }, [busca, status, contato, canal, pagina, tique])

  const paginas = Math.max(1, Math.ceil(total / porPagina))

  return (
    <>
      <Titulo
        sub="Acompanhe e atualize os pedidos de retirada."
        acoes={
          <Link to="/admin/importar">
            <Botao tamanho="p">Importar pedidos</Botao>
          </Link>
        }
      >
        Pedidos
      </Titulo>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <CardResumo rotulo="Em separação" valor={resumo?.em_separacao} Icone={IconeRelogio} cor="bg-separacao-bg text-separacao-fg" onClick={() => atualizar({ status: 'em_separacao', p: '' })} />
        <CardResumo rotulo="Prontos para retirada" valor={resumo?.pronto} Icone={IconeCaixa} cor="bg-pronto-bg text-pronto-fg" onClick={() => atualizar({ status: 'pronto', p: '' })} />
        <CardResumo rotulo="Retirados hoje" valor={resumo?.retirados_hoje} Icone={IconeCheck} cor="bg-retirado-bg text-retirado-fg" onClick={() => atualizar({ status: 'retirado', p: '' })} />
      </div>

      <div className="mb-3 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filtrar por canal">
        {([['', 'Todos os canais'], ...Object.entries(CANAL_LABEL).filter(([c]) => c !== 'outro')] as [Canal | '', string][]).map(([c, rotulo]) => (
          <button
            key={c || 'todos'}
            onClick={() => atualizar({ canal: c, p: '' })}
            aria-pressed={canal === c}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm font-bold transition ${
              canal === c ? (c ? CANAL_COR[c] : 'border-texto bg-texto text-white') + ' ring-2 ring-offset-2 ring-azul/40' : 'border-borda bg-card text-secundario hover:bg-bg'
            }`}
          >
            {rotulo}
          </button>
        ))}
      </div>

      <Cartao>
        <div className="flex flex-col gap-3 border-b border-borda p-4 sm:flex-row">
          <div className="relative flex-1">
            <IconeBusca className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-secundario" />
            <input
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Buscar por CPF, nome ou nº do pedido"
              className="h-11 w-full rounded-campo border border-borda bg-card pr-3 pl-10 text-sm outline-none focus:border-azul focus:ring-4 focus:ring-azul/15"
            />
          </div>
          <select
            value={status}
            onChange={(e) => atualizar({ status: e.target.value, p: '' })}
            className="h-11 rounded-campo border border-borda bg-card px-3 text-sm outline-none focus:border-azul"
          >
            <option value="">Todos os status</option>
            {Object.entries(STATUS_LABEL).map(([v, r]) => (
              <option key={v} value={v}>{r}</option>
            ))}
          </select>
          <select
            value={contato}
            onChange={(e) => atualizar({ contato: e.target.value, p: '' })}
            className="h-11 rounded-campo border border-borda bg-card px-3 text-sm outline-none focus:border-azul"
          >
            <option value="">Todos os contatos</option>
            {Object.entries(CONTATO_LABEL).map(([v, r]) => (
              <option key={v} value={v}>{r}</option>
            ))}
          </select>
        </div>

        {erro && <p className="p-4 text-sm text-vermelho">{erro}</p>}
        {!pedidos && !erro && <p className="p-6 text-center text-sm text-secundario">Carregando…</p>}
        {pedidos?.length === 0 && <p className="p-8 text-center text-sm text-secundario">Nenhum pedido encontrado.</p>}

        {!!pedidos?.length && (
          <>
            {/* Mobile: lista de cards */}
            <ul className="divide-y divide-borda md:hidden">
              {pedidos.map((p) => (
                <li key={p.id}>
                  <Link to={`/admin/pedido/${p.id}`} className="block p-4 hover:bg-bg">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{p.cliente_nome}</p>
                        <p className="text-xs text-secundario">#{p.numero} · {mascaraCpf(p.cpf)}</p>
                      </div>
                      <BadgeStatus status={p.status} />
                    </div>
                    <p className="mt-1 text-xs text-secundario">Retirada {formatarData(p.data_retirada)}</p>
                  </Link>
                  <div className="flex flex-wrap items-center gap-2 px-4 pb-3 text-xs text-secundario">
                    <SeletorCanal valor={p.canal} onChange={(v) => mudarCanal(p, v)} />
                    <SeletorContato valor={p.contato} disabled={salvandoContato === p.id} onChange={(v) => mudarContato(p, v)} />
                    {p.contato !== 'pendente' && p.contato_por_nome && <span>por {p.contato_por_nome}</span>}
                    {p.status === 'em_separacao' && <span>{tempoAteAutoPronto(p.separacao_em, config.auto_pronto_min)}</span>}
                  </div>
                </li>
              ))}
            </ul>
            {/* Desktop: tabela */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="text-xs tracking-wide text-secundario uppercase">
                  <tr className="border-b border-borda">
                    {['Pedido', 'Cliente', 'CPF', 'Status', 'Canal', 'Contato', 'Retirada', ''].map((h) => (
                      <th key={h} className="px-4 py-3 font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-borda">
                  {pedidos.map((p) => (
                    <tr key={p.id} className="hover:bg-bg">
                      <td className="px-4 py-3 font-semibold">#{p.numero}</td>
                      <td className="px-4 py-3">{p.cliente_nome}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-secundario">{mascaraCpf(p.cpf)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <BadgeStatus status={p.status} />
                        {p.status === 'em_separacao' && (
                          <span className="mt-1 block text-[11px] text-secundario">{tempoAteAutoPronto(p.separacao_em, config.auto_pronto_min)}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <SeletorCanal valor={p.canal} onChange={(v) => mudarCanal(p, v)} />
                      </td>
                      <td className="px-4 py-3">
                        <SeletorContato valor={p.contato} disabled={salvandoContato === p.id} onChange={(v) => mudarContato(p, v)} />
                        {p.contato !== 'pendente' && p.contato_por_nome && (
                          <span className="mt-1 block text-[11px] text-secundario">por {p.contato_por_nome}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">{formatarData(p.data_retirada)}</td>
                      <td className="px-4 py-3 text-right">
                        <Link to={`/admin/pedido/${p.id}`} className="font-semibold text-azul hover:underline">Ver</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="flex items-center justify-between border-t border-borda p-4 text-sm text-secundario">
          <span>{total} pedido{total === 1 ? '' : 's'}</span>
          <div className="flex items-center gap-2">
            <Botao tamanho="p" variante="secundario" disabled={pagina <= 1} onClick={() => atualizar({ p: String(pagina - 1) })}>Anterior</Botao>
            <span>{pagina} / {paginas}</span>
            <Botao tamanho="p" variante="secundario" disabled={pagina >= paginas} onClick={() => atualizar({ p: String(pagina + 1) })}>Próxima</Botao>
          </div>
        </div>
      </Cartao>
    </>
  )
}

function CardResumo({ rotulo, valor, Icone, cor, onClick }: { rotulo: string; valor?: number; Icone: typeof IconeCheck; cor: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-left">
      <Cartao className="flex items-center gap-4 p-4 transition hover:border-azul/40">
        <span className={`grid size-11 place-items-center rounded-campo ${cor}`}>
          <Icone className="size-5" />
        </span>
        <span>
          <span className="block text-2xl font-extrabold">{valor ?? '–'}</span>
          <span className="text-sm text-secundario">{rotulo}</span>
        </span>
      </Cartao>
    </button>
  )
}
