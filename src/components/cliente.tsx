/**
 * Telas do app do cliente como componentes de apresentação puros, para que o
 * preview ao vivo da Personalização renderize exatamente o mesmo visual.
 */
import type { FormEvent, ReactNode } from 'react'
import { formatarData, formatarQtd, mascaraCpf } from '../lib/format'
import type { AppConfig, OrderStatus } from '../lib/types'
import { BadgeStatus, Botao, Cartao, IconeBusca, IconeCalendario, IconeCaixa, IconeCheck, IconeRelogio, IconeVoltar, Marca } from './ui'

export interface PedidoPublico {
  numero: string
  cliente_nome: string
  status: OrderStatus
  data_retirada: string | null
  palavra_chave: string | null
  itens: { nome: string; quantidade: number; unidade: string }[]
}

type Cfg = Pick<AppConfig, 'app_name' | 'logo_url' | 'txt_saudacao' | 'txt_instrucao' | 'txt_botao' | 'txt_rodape' | 'txt_erro_vazio'>

function Topo({ config, onVoltar }: { config: Cfg; onVoltar?: () => void }) {
  return (
    <header className="bg-azul px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-16 text-white">
      <div className="mx-auto flex max-w-md items-center gap-2">
        {onVoltar && (
          <button onClick={onVoltar} aria-label="Voltar" className="-ml-2 grid size-10 place-items-center rounded-full hover:bg-white/10">
            <IconeVoltar className="size-5" />
          </button>
        )}
        <Marca nome={config.app_name} logo={config.logo_url} claro />
      </div>
    </header>
  )
}

function Moldura({ config, onVoltar, children }: { config: Cfg; onVoltar?: () => void; children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-bg">
      <Topo config={config} onVoltar={onVoltar} />
      <main className="mx-auto -mt-10 w-full max-w-md flex-1 space-y-4 px-4 pb-8">{children}</main>
      <footer className="px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-center text-sm text-secundario">{config.txt_rodape}</footer>
    </div>
  )
}

export function InicioView({
  config,
  cpf,
  onCpf,
  onEnviar,
  erro,
  enviando,
}: {
  config: Cfg
  cpf: string
  onCpf: (v: string) => void
  onEnviar: () => void
  erro?: string | null
  enviando?: boolean
}) {
  const submit = (e: FormEvent) => {
    e.preventDefault()
    onEnviar()
  }
  return (
    <Moldura config={config}>
      <Cartao className="p-6">
        <div className="mb-4 grid size-12 place-items-center rounded-full bg-separacao-bg text-azul">
          <IconeSacola />
        </div>
        <h1 className="text-2xl leading-tight font-extrabold">{config.txt_saudacao}</h1>
        <p className="mt-2 text-secundario">{config.txt_instrucao}</p>
        <form onSubmit={submit} className="mt-6 space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">CPF</span>
            <input
              inputMode="numeric"
              autoComplete="off"
              placeholder="000.000.000-00"
              value={cpf}
              onChange={(e) => onCpf(mascaraCpf(e.target.value))}
              className="h-16 w-full rounded-campo border-2 border-borda bg-card px-4 text-center text-2xl font-bold tracking-wider outline-none focus:border-azul focus:ring-4 focus:ring-azul/15"
            />
          </label>
          {erro && <p className="text-sm font-medium text-vermelho">{erro}</p>}
          <Botao type="submit" className="w-full" disabled={enviando}>
            <IconeBusca className="size-5" />
            {enviando ? 'Consultando…' : config.txt_botao}
          </Botao>
        </form>
      </Cartao>
      <ul className="grid grid-cols-3 gap-2 text-center text-xs text-secundario">
        {[
          ['1', 'Digite seu CPF'],
          ['2', 'Aguarde ficar pronto'],
          ['3', 'Diga a palavra-chave no balcão'],
        ].map(([n, t]) => (
          <li key={n} className="rounded-campo bg-card p-3 shadow-suave">
            <span className="mx-auto mb-1 grid size-6 place-items-center rounded-full bg-azul text-xs font-bold text-white">{n}</span>
            {t}
          </li>
        ))}
      </ul>
    </Moldura>
  )
}

function IconeSacola() {
  return <IconeCaixa className="size-6" />
}

const ETAPAS = ['Recebido', 'Em separação', 'Pronto']

function LinhaDoTempo({ status }: { status: OrderStatus }) {
  const atual = status === 'em_separacao' ? 1 : 2
  return (
    <ol className="flex items-start">
      {ETAPAS.map((rotulo, i) => {
        const feito = i < atual
        const ativo = i === atual
        return (
          <li key={rotulo} className="relative flex flex-1 flex-col items-center text-center">
            {i > 0 && <span className={`absolute top-4 right-1/2 h-0.5 w-full ${i <= atual ? 'bg-azul' : 'bg-borda'}`} />}
            <span
              className={`relative z-10 grid size-8 place-items-center rounded-full border-2 ${
                feito ? 'border-azul bg-azul text-white' : ativo ? 'border-azul bg-card text-azul' : 'border-borda bg-card text-secundario'
              }`}
            >
              {feito ? <IconeCheck className="size-4" /> : ativo ? <span className="size-2.5 animate-pulse rounded-full bg-azul" /> : null}
            </span>
            <span className={`mt-2 text-xs font-semibold ${feito || ativo ? 'text-texto' : 'text-secundario'}`}>{rotulo}</span>
          </li>
        )
      })}
    </ol>
  )
}

export function PedidoView({ pedido }: { pedido: PedidoPublico }) {
  const total = pedido.itens.reduce((s, i) => s + (i.unidade === 'un' ? i.quantidade : 1), 0)
  return (
    <>
      <Cartao className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-secundario">Olá,</p>
            <h1 className="truncate text-xl font-extrabold">{pedido.cliente_nome.split(' ')[0]}</h1>
            <p className="mt-0.5 text-sm text-secundario">Pedido nº {pedido.numero}</p>
          </div>
          <BadgeStatus status={pedido.status} />
        </div>
      </Cartao>

      {pedido.status === 'pronto' && pedido.palavra_chave && (
        <div className="rounded-card bg-azul p-6 text-center text-white shadow-suave">
          <p className="text-sm font-semibold tracking-wide text-white/80 uppercase">Sua palavra-chave</p>
          <p className={`my-3 font-chave leading-tight font-bold tracking-wide ${pedido.palavra_chave.length > 10 ? 'text-4xl' : 'text-5xl'}`}>
            {pedido.palavra_chave}
          </p>
          <p className="text-sm text-white/90">Apresente esta palavra-chave no balcão para retirar</p>
        </div>
      )}

      {pedido.status === 'em_separacao' && (
        <Cartao className="space-y-5 p-5">
          <div className="flex gap-3 rounded-campo bg-separacao-bg p-4 text-separacao-fg">
            <IconeRelogio className="size-6 shrink-0" />
            <div>
              <p className="font-bold">Seu pedido está sendo separado</p>
              <p className="text-sm">Quando estiver pronto, a palavra-chave de retirada aparecerá aqui.</p>
            </div>
          </div>
          <LinhaDoTempo status={pedido.status} />
        </Cartao>
      )}

      {pedido.status === 'retirado' && (
        <Cartao className="flex gap-3 p-5 text-secundario">
          <IconeCheck className="size-6 shrink-0 text-verde" />
          <p>Este pedido já foi retirado. Obrigado pela preferência!</p>
        </Cartao>
      )}

      <Cartao className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold">Produtos</h2>
          <span className="text-sm text-secundario">
            {pedido.itens.length} {pedido.itens.length === 1 ? 'item' : 'itens'}
            {total > pedido.itens.length && ` · ${total} un`}
          </span>
        </div>
        <ul className="divide-y divide-borda">
          {pedido.itens.map((it, i) => (
            <li key={i} className="flex items-start justify-between gap-3 py-2.5">
              <span className="text-sm">{it.nome}</span>
              <span className="shrink-0 rounded-md bg-bg px-2 py-0.5 text-sm font-semibold">
                {formatarQtd(it.quantidade)} {it.unidade}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex items-center gap-2 border-t border-borda pt-3 text-sm">
          <IconeCalendario className="size-4 text-azul" />
          <span className="text-secundario">Retirada:</span>
          <span className="font-semibold">{formatarData(pedido.data_retirada)}</span>
        </div>
      </Cartao>
    </>
  )
}

export function ResultadoView({
  config,
  pedidos,
  onVoltar,
}: {
  config: Cfg
  pedidos: PedidoPublico[]
  onVoltar: () => void
}) {
  if (pedidos.length === 0) {
    return (
      <Moldura config={config} onVoltar={onVoltar}>
        <Cartao className="p-6 text-center">
          <div className="mx-auto mb-4 grid size-16 place-items-center rounded-full bg-bg text-secundario">
            <IconeBusca className="size-8" />
          </div>
          <h1 className="text-xl font-extrabold">Nada por aqui</h1>
          <p className="mt-2 text-secundario">{config.txt_erro_vazio}</p>
          <Botao className="mt-6 w-full" onClick={onVoltar}>
            Tentar outro CPF
          </Botao>
        </Cartao>
      </Moldura>
    )
  }
  return (
    <Moldura config={config} onVoltar={onVoltar}>
      {pedidos.map((p, i) => (
        <section key={p.numero} className="space-y-4">
          {i > 0 && <h2 className="pt-4 text-sm font-bold tracking-wide text-secundario uppercase">Outro pedido</h2>}
          <PedidoView pedido={p} />
        </section>
      ))}
      <Botao variante="secundario" className="w-full" onClick={onVoltar}>
        Consultar outro CPF
      </Botao>
    </Moldura>
  )
}
