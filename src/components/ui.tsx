import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SVGProps } from 'react'
import { CONTATO_LABEL, STATUS_LABEL, type ContatoStatus, type OrderStatus } from '../lib/types'

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

type Variante = 'primario' | 'secundario' | 'perigo' | 'fantasma'

const VARIANTES: Record<Variante, string> = {
  primario: 'bg-azul text-white hover:brightness-110',
  secundario: 'bg-card text-azul border border-borda hover:bg-bg',
  perigo: 'bg-vermelho text-white hover:brightness-110',
  fantasma: 'text-secundario hover:text-texto hover:bg-bg',
}

export function Botao({
  variante = 'primario',
  tamanho = 'g',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante; tamanho?: 'g' | 'p' }) {
  return (
    <button
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-campo font-bold transition disabled:cursor-not-allowed disabled:opacity-50',
        tamanho === 'g' ? 'min-h-[52px] px-5 text-base' : 'min-h-10 px-3.5 text-sm',
        VARIANTES[variante],
        className,
      )}
      {...props}
    />
  )
}

export function Campo({
  rotulo,
  dica,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { rotulo?: string; dica?: string }) {
  return (
    <label className="block">
      {rotulo && <span className="mb-1.5 block text-sm font-semibold text-texto">{rotulo}</span>}
      <input
        className={cx(
          'w-full rounded-campo border border-borda bg-card px-4 py-3 text-base outline-none transition placeholder:text-secundario/70 focus:border-azul focus:ring-4 focus:ring-azul/15',
          className,
        )}
        {...props}
      />
      {dica && <span className="mt-1 block text-xs text-secundario">{dica}</span>}
    </label>
  )
}

export function AreaTexto({
  rotulo,
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { rotulo?: string }) {
  return (
    <label className="block">
      {rotulo && <span className="mb-1.5 block text-sm font-semibold text-texto">{rotulo}</span>}
      <textarea
        className={cx(
          'w-full rounded-campo border border-borda bg-card px-4 py-3 text-sm outline-none transition focus:border-azul focus:ring-4 focus:ring-azul/15',
          className,
        )}
        {...props}
      />
    </label>
  )
}

export function Cartao({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx('rounded-card border border-borda bg-card shadow-suave', className)}>{children}</div>
}

const BADGE: Record<OrderStatus, string> = {
  em_separacao: 'bg-separacao-bg text-separacao-fg',
  pronto: 'bg-pronto-bg text-pronto-fg',
  retirado: 'bg-retirado-bg text-retirado-fg',
}

export function BadgeStatus({ status, className }: { status: OrderStatus; className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap', BADGE[status], className)}>
      <span className="size-1.5 rounded-full bg-current" />
      {STATUS_LABEL[status]}
    </span>
  )
}

const CONTATO_COR: Record<ContatoStatus, string> = {
  pendente: 'border-borda bg-card text-secundario',
  em_atendimento: 'border-amber-300 bg-amber-100 text-amber-800',
  ja_liguei: 'border-pronto-fg/30 bg-pronto-bg text-pronto-fg',
  nao_atendeu: 'border-vermelho/30 bg-vermelho/10 text-vermelho',
}

/** Tarja de contato selecionável: o atendente marca se está ligando / já ligou. */
export function SeletorContato({
  valor,
  onChange,
  disabled,
  className,
}: {
  valor: ContatoStatus
  onChange: (v: ContatoStatus) => void
  disabled?: boolean
  className?: string
}) {
  return (
    <span className={cx('relative inline-flex', className)}>
      {valor === 'em_atendimento' && <span className="absolute -top-0.5 -right-0.5 size-2 animate-ping rounded-full bg-amber-500" />}
      <select
        value={valor}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as ContatoStatus)}
        aria-label="Situação do contato com o cliente"
        className={cx(
          'cursor-pointer appearance-none rounded-full border py-1 pr-6 pl-2.5 text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-azul/30 disabled:cursor-wait disabled:opacity-60',
          "bg-[length:12px] bg-[right_6px_center] bg-no-repeat bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='3'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")]",
          CONTATO_COR[valor],
        )}
      >
        {(Object.keys(CONTATO_LABEL) as ContatoStatus[]).map((c) => (
          <option key={c} value={c}>{CONTATO_LABEL[c]}</option>
        ))}
      </select>
    </span>
  )
}

/** "faltam 12 min" para a retirada automática de um pedido pronto. */
export function tempoAteAutoRetirada(prontoEm: string | null, minutos: number, agora = Date.now()): string | null {
  if (!prontoEm || minutos <= 0) return null
  const resta = Math.ceil((new Date(prontoEm).getTime() + minutos * 60_000 - agora) / 60_000)
  return resta > 0 ? `retirada automática em ${resta} min` : 'retirando automaticamente…'
}

export function Marca({ nome, logo, claro = false }: { nome: string; logo: string | null; claro?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      {logo ? (
        <img src={logo} alt="" className="size-10 rounded-campo bg-white object-contain p-1" />
      ) : (
        <div className={cx('grid size-10 place-items-center rounded-campo', claro ? 'bg-white/15 text-white' : 'bg-azul text-white')}>
          <IconeSacola className="size-5" />
        </div>
      )}
      <span className={cx('text-lg font-extrabold tracking-tight', claro ? 'text-white' : 'text-texto')}>{nome}</span>
    </div>
  )
}

export function Aviso({ tipo = 'erro', children }: { tipo?: 'erro' | 'ok' | 'info'; children: ReactNode }) {
  const cor = { erro: 'bg-vermelho/10 text-vermelho', ok: 'bg-pronto-bg text-pronto-fg', info: 'bg-separacao-bg text-separacao-fg' }[tipo]
  return <div className={cx('rounded-campo px-4 py-3 text-sm font-medium', cor)}>{children}</div>
}

/* Ícones lineares (stroke) */
function Icone({ children, ...p }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...p}>
      {children}
    </svg>
  )
}
export const IconeSacola = (p: SVGProps<SVGSVGElement>) => <Icone {...p}><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" /></Icone>
export const IconeBusca = (p: SVGProps<SVGSVGElement>) => <Icone {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Icone>
export const IconeCaixa = (p: SVGProps<SVGSVGElement>) => <Icone {...p}><path d="M21 8 12 3 3 8v8l9 5 9-5z" /><path d="m3 8 9 5 9-5" /><path d="M12 13v8" /></Icone>
export const IconeCheck = (p: SVGProps<SVGSVGElement>) => <Icone {...p}><path d="M20 6 9 17l-5-5" /></Icone>
export const IconeRelogio = (p: SVGProps<SVGSVGElement>) => <Icone {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Icone>
export const IconeCalendario = (p: SVGProps<SVGSVGElement>) => <Icone {...p}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></Icone>
export const IconeVoltar = (p: SVGProps<SVGSVGElement>) => <Icone {...p}><path d="m15 18-6-6 6-6" /></Icone>
export const IconeCopiar = (p: SVGProps<SVGSVGElement>) => <Icone {...p}><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></Icone>
export const IconeUpload = (p: SVGProps<SVGSVGElement>) => <Icone {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m17 8-5-5-5 5" /><path d="M12 3v12" /></Icone>
export const IconePainel = (p: SVGProps<SVGSVGElement>) => <Icone {...p}><rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" /></Icone>
export const IconePincel = (p: SVGProps<SVGSVGElement>) => <Icone {...p}><circle cx="13.5" cy="6.5" r="1" /><circle cx="17.5" cy="10.5" r="1" /><circle cx="8.5" cy="7.5" r="1" /><circle cx="6.5" cy="12.5" r="1" /><path d="M12 2a10 10 0 0 0 0 20c1 0 1.5-.8 1.5-1.7 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-.9.8-1.7 1.7-1.7H16a6 6 0 0 0 6-6c0-4.4-4.5-8.4-10-8.4" /></Icone>
export const IconeEngrenagem = (p: SVGProps<SVGSVGElement>) => <Icone {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1" /></Icone>
export const IconeSair = (p: SVGProps<SVGSVGElement>) => <Icone {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /></Icone>
