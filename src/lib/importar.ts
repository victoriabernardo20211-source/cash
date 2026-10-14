import { gerarPalavraChave, type FormatoChave } from './palavraChave'
import type { ParsedOrder } from './parser'
import { supabase } from './supabase'

export interface PedidoPreview extends ParsedOrder {
  palavra_chave: string
  existente: boolean
}

/**
 * Atribui palavra-chave a cada pedido válido (SPEC §5). Pedidos já existentes
 * (mesmo `numero`) mantêm a palavra-chave atual; novos recebem uma inédita,
 * verificada contra o banco.
 */
export async function prepararImportacao(pedidos: ParsedOrder[], formato: FormatoChave): Promise<PedidoPreview[]> {
  const numeros = [...new Set(pedidos.map((p) => p.numero).filter(Boolean))]
  const existentes = new Map<string, string>()
  for (let i = 0; i < numeros.length; i += 200) {
    const { data, error } = await supabase.from('orders').select('numero, palavra_chave').in('numero', numeros.slice(i, i + 200))
    if (error) throw error
    data.forEach((o) => existentes.set(o.numero, o.palavra_chave))
  }

  const usadas = new Set(existentes.values())
  const resultado: PedidoPreview[] = pedidos.map((p) => ({
    ...p,
    existente: existentes.has(p.numero),
    palavra_chave: existentes.get(p.numero) ?? gerarPalavraChave(usadas, formato),
  }))

  // Verifica colisão das novas contra a base; re-sorteia até não colidir.
  for (let tentativa = 0; tentativa < 10; tentativa++) {
    const novas = resultado.filter((p) => !p.existente).map((p) => p.palavra_chave)
    if (novas.length === 0) break
    const colidem = new Set<string>()
    for (let i = 0; i < novas.length; i += 200) {
      const { data, error } = await supabase.from('orders').select('palavra_chave').in('palavra_chave', novas.slice(i, i + 200))
      if (error) throw error
      data.forEach((o) => colidem.add(o.palavra_chave))
    }
    if (colidem.size === 0) break
    colidem.forEach((c) => usadas.add(c))
    resultado.forEach((p) => {
      if (!p.existente && colidem.has(p.palavra_chave)) p.palavra_chave = gerarPalavraChave(usadas, formato)
    })
  }
  return resultado
}

/** Grava os pedidos (upsert por `numero`, SPEC §6.7) e substitui os itens. */
export async function gravarPedidos(pedidos: PedidoPreview[]): Promise<number> {
  const validos = pedidos.filter((p) => p.erros.length === 0)
  if (validos.length === 0) return 0

  // `status` fica de fora: pedido novo nasce em_separacao (default); reimportar não regride status.
  const { data: gravados, error } = await supabase
    .from('orders')
    .upsert(
      validos.map((p) => ({
        numero: p.numero,
        cliente_nome: p.cliente_nome,
        cpf: p.cpf,
        telefone: p.telefone,
        data_retirada: p.data_retirada,
        palavra_chave: p.palavra_chave,
      })),
      { onConflict: 'numero' },
    )
    .select('id, numero')
  if (error) throw error

  const idPorNumero = new Map(gravados.map((o) => [o.numero, o.id]))
  const ids = [...idPorNumero.values()]
  const { error: errDel } = await supabase.from('order_items').delete().in('order_id', ids)
  if (errDel) throw errDel

  const itens = validos.flatMap((p) =>
    p.itens.map((it, posicao) => ({ order_id: idPorNumero.get(p.numero)!, ean: it.ean, nome: it.nome, quantidade: it.quantidade, unidade: it.unidade, posicao })),
  )
  if (itens.length) {
    const { error: errIns } = await supabase.from('order_items').insert(itens)
    if (errIns) throw errIns
  }
  return validos.length
}
