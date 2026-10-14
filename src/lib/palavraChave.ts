/** Geração da palavra-chave de retirada (SPEC §5). */

export const PALAVRAS = [
  'ABACAXI', 'ACEROLA', 'AMORA', 'BANANA', 'CAJU', 'CEREJA', 'COCO', 'GOIABA', 'JABUTI',
  'KIWI', 'LARANJA', 'LIMA', 'LIMAO', 'MAMAO', 'MANGA', 'MARACUJA', 'MELANCIA', 'MELAO',
  'MORANGO', 'PERA', 'PESSEGO', 'PITANGA', 'UVA', 'CAQUI', 'FIGO', 'AMEIXA', 'JACA',
  'GIRASSOL', 'ROSA', 'TULIPA', 'LIRIO', 'ORQUIDEA', 'MARGARIDA', 'VIOLETA', 'CRAVO',
  'HORTELA', 'ALECRIM', 'MANJERICAO', 'CANELA', 'BAUNILHA', 'GENGIBRE', 'IPE', 'PALMEIRA',
  'BAMBU', 'CACTO', 'SAMAMBAIA', 'AZUL', 'VERDE', 'AMARELO', 'LARANJADO', 'LILAS', 'DOURADO',
  'PRATA', 'TURQUESA', 'CORAL', 'ANIL', 'CARAMELO', 'PIPOCA', 'BOLACHA', 'PAMONHA',
]

// Sem 0/O/1/I para não confundir no balcão.
const ALFABETO_CODIGO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export type FormatoChave = 'palavra' | 'codigo'

const sorteia = (n: number, rnd: () => number) => Math.floor(rnd() * n)

export function gerarCandidata(formato: FormatoChave, rnd: () => number = Math.random): string {
  if (formato === 'codigo') {
    return Array.from({ length: 4 }, () => ALFABETO_CODIGO[sorteia(ALFABETO_CODIGO.length, rnd)]).join('')
  }
  return `${PALAVRAS[sorteia(PALAVRAS.length, rnd)]} ${10 + sorteia(90, rnd)}`
}

/**
 * Gera uma palavra-chave que não está em `usadas` e a adiciona ao conjunto,
 * para que chamadas seguidas no mesmo lote também não colidam.
 */
export function gerarPalavraChave(
  usadas: Set<string>,
  formato: FormatoChave = 'palavra',
  rnd: () => number = Math.random,
): string {
  for (let i = 0; i < 1000; i++) {
    const c = gerarCandidata(formato, rnd)
    if (!usadas.has(c)) {
      usadas.add(c)
      return c
    }
  }
  throw new Error('Não foi possível gerar uma palavra-chave única — espaço esgotado.')
}
