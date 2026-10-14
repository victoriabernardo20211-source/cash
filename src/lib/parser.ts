/**
 * Parser da importação de pedidos (SPEC §6).
 *
 * Aceita dois formatos, inclusive misturados no mesmo texto:
 *
 * 1. Formato da SPEC — blocos separados por uma linha só com `#`:
 *      Pedido: 10482 / Cliente: … / CPF: … / Telefone: … / Produtos: / - Nome | 2 un / Retirada: 15/10/2026
 *
 * 2. Export do Carrefour — cada bloco começa com `#<número>`:
 *      #576932179 / "Sobrenome, Nome" / CPF: 11122233396 / +5562999000000 /
 *      PRODUTOS: + tabela separada por TAB (EAN, Produto, Quantidade, Unidade) /
 *      data "Oct 14, 2026, 7:00:00 PM"
 */

export interface ParsedItem {
  ean: string | null
  nome: string
  quantidade: number
  unidade: string
}

export type Canal = 'click_retire' | '99food' | 'ifood' | 'outro'

export interface ParsedOrder {
  numero: string
  cliente_nome: string
  cpf: string
  telefone: string | null
  data_retirada: string | null // yyyy-mm-dd
  canal: Canal
  itens: ParsedItem[]
  erros: string[]
}

const MESES: Record<string, number> = {
  jan: 1, feb: 2, fev: 2, mar: 3, apr: 4, abr: 4, may: 5, mai: 5, jun: 6,
  jul: 7, aug: 8, ago: 8, sep: 9, set: 9, oct: 10, out: 10, nov: 11, dec: 12, dez: 12,
}

const SECOES = /^(ORIGEM|DESTINO|ENDERE[ÇC]O DE ENTREGA|TIPO DE ENTREGA)\b/i

export const soDigitos = (s: string) => s.replace(/\D/g, '')

const pad = (n: number) => String(n).padStart(2, '0')

export function parseData(texto: string): string | null {
  const t = texto.trim()
  let m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (m) return validaData(+m[3], +m[2], +m[1])
  m = t.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return validaData(+m[1], +m[2], +m[3])
  m = t.match(/^([A-Za-zç]{3})[a-zç]*\.?\s+(\d{1,2}),?\s+(\d{4})/i)
  if (m && MESES[m[1].toLowerCase()]) return validaData(+m[3], MESES[m[1].toLowerCase()], +m[2])
  return null
}

function validaData(a: number, m: number, d: number): string | null {
  const dt = new Date(Date.UTC(a, m - 1, d))
  if (dt.getUTCFullYear() !== a || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null
  return `${a}-${pad(m)}-${pad(d)}`
}

/** "Souza Lima, Beatriz" → "Beatriz Souza Lima" */
export function normalizaNome(nome: string): string {
  const n = nome.trim().replace(/\s+/g, ' ')
  const partes = n.split(',').map((p) => p.trim()).filter(Boolean)
  const junto = partes.length === 2 ? `${partes[1]} ${partes[0]}` : n
  if (junto !== junto.toUpperCase()) return junto
  // Tudo maiúsculo → capitaliza mantendo preposições em minúsculo.
  return junto
    .toLowerCase()
    .split(' ')
    .map((w) => (/^(da|de|do|das|dos|e)$/.test(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ')
}

function parseQtdUnidade(s: string): { quantidade: number; unidade: string } | null {
  const m = s.trim().match(/^(\d+(?:[.,]\d+)?)\s*([A-Za-zÀ-ú]*)$/)
  if (!m) return null
  return { quantidade: Number(m[1].replace(',', '.')), unidade: (m[2] || 'un').toLowerCase() }
}

/**
 * Identifica o canal pelo texto do bloco (ex.: "TIPO DE ENTREGA").
 * iFood vem antes de Click & Retire porque o iFood aparece como
 * "MKTP OUT - IFOOD CLICK RETIRE".
 */
export function detectarCanal(texto: string): Canal {
  const t = texto.toUpperCase().replace(/\s+/g, ' ')
  if (/\bI ?FOOD\b/.test(t)) return 'ifood'
  if (/\b99 ?FOOD\b/.test(t)) return '99food'
  if (/CLICK ?(&|E)? ?RETIRE/.test(t)) return 'click_retire'
  return 'outro'
}

function parseItem(linha: string): ParsedItem | null {
  // Tabela separada por TAB: EAN, Produto, Quantidade, Unidade
  if (linha.includes('\t')) {
    const cols = linha.split('\t').map((c) => c.trim())
    if (cols.length >= 3) {
      const temEan = cols.length >= 4 && /^\d{1,14}$/.test(cols[0])
      const [ean, nome, qtd, un] = temEan ? cols : [null, ...cols]
      const q = parseQtdUnidade(`${qtd ?? ''} ${un ?? ''}`.trim())
      if (nome && q) return { ean: ean ?? null, nome, ...q }
    }
  }
  const sem = linha.replace(/^[-•*]\s*/, '').trim()
  if (!sem) return null
  // "Nome | 2 un"
  const pipe = sem.lastIndexOf('|')
  if (pipe >= 0) {
    const q = parseQtdUnidade(sem.slice(pipe + 1))
    const nome = sem.slice(0, pipe).trim()
    if (q && nome) return { ean: null, nome, ...q }
  }
  // "Nome x3"
  const x = sem.match(/^(.*?)\s+x\s*(\d+(?:[.,]\d+)?)\s*([A-Za-z]*)$/i)
  if (x) return { ean: null, nome: x[1].trim(), quantidade: Number(x[2].replace(',', '.')), unidade: (x[3] || 'un').toLowerCase() }
  return { ean: null, nome: sem, quantidade: 1, unidade: 'un' }
}

function dividirBlocos(texto: string): { numero: string | null; linhas: string[] }[] {
  const blocos: { numero: string | null; linhas: string[] }[] = []
  let atual: { numero: string | null; linhas: string[] } | null = null
  for (const bruta of texto.replace(/\r\n?/g, '\n').split('\n')) {
    const linha = bruta.replace(/ /g, ' ').trimEnd()
    const m = linha.trim().match(/^#\s*(\S*)$/)
    if (m) {
      atual = { numero: m[1] || null, linhas: [] }
      blocos.push(atual)
      continue
    }
    if (!atual) {
      atual = { numero: null, linhas: [] }
      blocos.push(atual)
    }
    atual.linhas.push(linha)
  }
  return blocos.filter((b) => b.numero || b.linhas.some((l) => l.trim()))
}

export function parsePedidos(texto: string): ParsedOrder[] {
  return dividirBlocos(texto).map(({ numero, linhas }) => {
    const p: ParsedOrder = {
      numero: numero ?? '',
      cliente_nome: '',
      cpf: '',
      telefone: null,
      data_retirada: null,
      canal: detectarCanal(linhas.join('\n')),
      itens: [],
      erros: [],
    }
    let emProdutos = false
    let nomeSolto: string | null = null

    for (const bruta of linhas) {
      const linha = bruta.trim()
      if (!linha) continue
      const campo = linha.match(/^([A-Za-zÀ-ú ]+):\s*(.*)$/)
      const chave = campo?.[1].trim().toLowerCase()
      const valor = campo?.[2].trim() ?? ''

      if (chave === 'produtos') { emProdutos = true; continue }
      if (chave === 'pedido') { p.numero = soDigitos(valor) || valor; emProdutos = false; continue }
      if (chave === 'cliente') { p.cliente_nome = normalizaNome(valor); emProdutos = false; continue }
      if (chave === 'cpf') { p.cpf = soDigitos(valor); emProdutos = false; continue }
      if (chave === 'telefone') { p.telefone = valor || null; emProdutos = false; continue }
      if (chave === 'canal') { const c = detectarCanal(valor); if (c !== 'outro') p.canal = c; continue }
      if (chave === 'retirada') { p.data_retirada = parseData(valor); if (!p.data_retirada) p.erros.push(`Data inválida: "${valor}"`); emProdutos = false; continue }
      if (SECOES.test(linha)) { emProdutos = false; continue }

      if (emProdutos) {
        if (/^EANs?\b/i.test(linha) || /^produto\s/i.test(linha)) continue // cabeçalho da tabela
        const item = parseItem(bruta)
        if (item) p.itens.push(item)
        continue
      }

      // Campos sem prefixo (formato Carrefour)
      if (!p.data_retirada && parseData(linha)) { p.data_retirada = parseData(linha); continue }
      if (!p.telefone && /^\+?[\d\s().-]{8,}$/.test(linha) && soDigitos(linha).length >= 8) { p.telefone = linha; continue }
      if (!nomeSolto && !p.cpf && /[A-Za-zÀ-ú]/.test(linha)) nomeSolto = linha
    }

    if (!p.cliente_nome && nomeSolto) p.cliente_nome = normalizaNome(nomeSolto)
    if (!p.numero) p.erros.push('Número do pedido ausente')
    if (!p.cliente_nome) p.erros.push('Nome do cliente ausente')
    if (p.cpf.length !== 11) p.erros.push(p.cpf ? `CPF inválido: ${p.cpf}` : 'CPF ausente')
    if (p.itens.length === 0) p.erros.push('Nenhum produto encontrado')
    return p
  })
}
