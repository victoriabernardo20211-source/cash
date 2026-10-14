import { api } from './api'
import type { ParsedOrder } from './parser'

export interface PedidoPreview extends ParsedOrder {
  palavra_chave: string
  existente: boolean
}

/**
 * Pede ao servidor as palavras-chave da pré-visualização (SPEC §5). Pedidos já
 * existentes (mesmo `numero`) mantêm a palavra-chave atual. Nada é gravado aqui.
 */
export async function prepararImportacao(pedidos: ParsedOrder[]): Promise<PedidoPreview[]> {
  const numeros = [...new Set(pedidos.filter((p) => p.erros.length === 0).map((p) => p.numero))]
  const r = await api<{ numero: string; existente: boolean; palavra_chave: string }[]>('importar.preparar', { numeros })
  const porNumero = new Map(r.map((x) => [x.numero, x]))
  return pedidos.map((p) => ({ ...p, palavra_chave: '', existente: false, ...porNumero.get(p.numero) }))
}

/** Grava os pedidos válidos numa única transação (upsert por `numero`, SPEC §6.7). */
export async function gravarPedidos(pedidos: PedidoPreview[]): Promise<number> {
  const validos = pedidos.filter((p) => p.erros.length === 0)
  if (validos.length === 0) return 0
  return api<number>('importar.gravar', {
    pedidos: validos.map(({ erros: _e, existente: _x, ...p }) => p),
  })
}
