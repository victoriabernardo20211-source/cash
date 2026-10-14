import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { detectarCanal, normalizaNome, parseData, parsePedidos } from './parser'
import { gerarPalavraChave } from './palavraChave'

const SPEC = `#
Pedido: 10482
Cliente: Maria Oliveira
CPF: 123.456.789-00
Telefone: (11) 98888-7777
Produtos:
- Arroz branco 5kg | 2 un
- Leite integral 1L | 6 un
- Detergente neutro 500ml | 3 un
Retirada: 15/10/2026
#
Pedido: 10483
Cliente: João Santos
CPF: 987.654.321-00
Telefone: (11) 97777-6666
Produtos:
- Café torrado 500g | 4 un
- Banana x2 kg
Retirada: 15/10/2026
`

describe('parsePedidos — formato da SPEC', () => {
  const [a, b] = parsePedidos(SPEC)
  it('lê os campos', () => {
    expect(a).toMatchObject({ numero: '10482', cliente_nome: 'Maria Oliveira', cpf: '12345678900', telefone: '(11) 98888-7777', data_retirada: '2026-10-15', erros: [] })
    expect(a.itens).toHaveLength(3)
    expect(a.itens[1]).toEqual({ ean: null, nome: 'Leite integral 1L', quantidade: 6, unidade: 'un' })
  })
  it('aceita "nome xQTD"', () => {
    expect(b.itens[1]).toEqual({ ean: null, nome: 'Banana', quantidade: 2, unidade: 'kg' })
  })
})

describe('parsePedidos — export Carrefour', () => {
  const txt = readFileSync(new URL('../../docs/exemplos/pedidos-carrefour.txt', import.meta.url), 'utf8')
  const pedidos = parsePedidos(txt)
  it('encontra os 5 pedidos sem erros', () => {
    expect(pedidos).toHaveLength(5)
    expect(pedidos.flatMap((p) => p.erros)).toEqual([])
  })
  it('lê o primeiro pedido', () => {
    expect(pedidos[0]).toMatchObject({
      numero: '576932179',
      cliente_nome: 'Beatriz Souza Lima',
      cpf: '11122233396',
      telefone: '+5562999000000',
      data_retirada: '2026-10-14',
    })
    expect(pedidos[0].itens).toEqual([
      { ean: '7891000285091', nome: 'Composto Lácteo Instantâneo com Fibras Ninho Forti+ 750g', quantidade: 2, unidade: 'un' },
    ])
  })
  it('capitaliza nome em caixa alta', () => {
    expect(pedidos[1].cliente_nome).toBe('Rafael Pereira dos Santos')
  })
})

describe('validações', () => {
  it('aponta erros', () => {
    const [p] = parsePedidos('#\nCliente: X\nCPF: 123\nRetirada: 31/02/2026')
    expect(p.erros).toEqual(['Data inválida: "31/02/2026"', 'Número do pedido ausente', 'CPF inválido: 123', 'Nenhum produto encontrado'])
  })
  it('datas', () => {
    expect(parseData('Oct 16, 2026, 11:00:00 PM')).toBe('2026-10-16')
    expect(parseData('15/10/2026')).toBe('2026-10-15')
  })
  it('nomes', () => expect(normalizaNome('Martins, Joao')).toBe('Joao Martins'))
})

describe('gerarPalavraChave', () => {
  it('não repete dentro do lote nem contra a base', () => {
    const usadas = new Set(['GIRASSOL 42'])
    const geradas = Array.from({ length: 2000 }, () => gerarPalavraChave(usadas))
    expect(new Set(geradas).size).toBe(2000)
    expect(geradas).not.toContain('GIRASSOL 42')
    expect(geradas[0]).toMatch(/^\p{Lu}+ [1-9]\d$/u)
  })
  it('formato código', () => expect(gerarPalavraChave(new Set(), 'codigo')).toMatch(/^[A-Z2-9]{4}$/))
})

describe('canal e variações do export', () => {
  const bloco = (tipo: string, extra = '') => `#123
Silva, Ana

DESTINO
CPF: 11122233396

40202499

PRODUTOS:
EANs\tProduto\tQuantidade\tUnidade
7892012003000\tFrutas Prático Amora 400 g\t1\tun
8891\tManga Palmer Carrefour Aprox. 500g\t4\tkg${extra}
ENDEREÇO DE ENTREGA
Oct 12, 2026, 9:35:35 PM

TIPO DE ENTREGA
${tipo}
`
  it('detecta o canal pelo tipo de entrega', () => {
    expect(parsePedidos(bloco('Click & Retire (GOS)\n\nClick&Retire_GOS_NAL'))[0].canal).toBe('click_retire')
    expect(parsePedidos(bloco('vtex:fob_99_1896_marketplaceout_1\n\nMKTP OUT 99 FOOD DELIVERY HBT'))[0].canal).toBe('99food')
    expect(parsePedidos(bloco('vtex:fob_126RET_marketplaceout_1\n\nMKTP OUT - IFOOD CLICK RETIRE - RETIRADA TBE'))[0].canal).toBe('ifood')
    expect(detectarCanal('Entrega normal')).toBe('outro')
  })
  it('aceita EAN curto e quantidade em kg', () => {
    const [p] = parsePedidos(bloco('Click & Retire'))
    expect(p.itens[1]).toEqual({ ean: '8891', nome: 'Manga Palmer Carrefour Aprox. 500g', quantidade: 4, unidade: 'kg' })
    expect(p.erros).toEqual([])
  })
  it('aceita telefone de 8 dígitos', () => {
    expect(parsePedidos(bloco('Click & Retire'))[0].telefone).toBe('40202499')
  })
  it('exemplo existente é Click & Retire', () => {
    const txt = readFileSync(new URL('../../docs/exemplos/pedidos-carrefour.txt', import.meta.url), 'utf8')
    expect(parsePedidos(txt).map((p) => p.canal)).toEqual(Array(5).fill('click_retire'))
  })
})
