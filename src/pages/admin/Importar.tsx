import { useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { AreaTexto, Aviso, BadgeCanal, Botao, Cartao, IconeUpload } from '../../components/ui'
import { formatarData, mascaraCpf } from '../../lib/format'
import { gravarPedidos, prepararImportacao, type PedidoPreview } from '../../lib/importar'
import { parsePedidos } from '../../lib/parser'
import { Titulo } from './Layout'

export default function Importar() {
  const navegar = useNavigate()
  const [texto, setTexto] = useState('')
  const [preview, setPreview] = useState<PedidoPreview[] | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState<number | null>(null)

  const lerArquivo = async (e: ChangeEvent<HTMLInputElement>) => {
    const arq = e.target.files?.[0]
    if (!arq) return
    setTexto(await arq.text())
    setPreview(null)
    e.target.value = ''
  }

  const preVisualizar = async () => {
    setErro(null)
    setSucesso(null)
    const pedidos = parsePedidos(texto)
    if (pedidos.length === 0) {
      setErro('Nenhum pedido encontrado no texto.')
      return
    }
    setOcupado(true)
    try {
      setPreview(await prepararImportacao(pedidos))
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setOcupado(false)
    }
  }

  const processar = async () => {
    if (!preview) return
    setOcupado(true)
    setErro(null)
    try {
      const n = await gravarPedidos(preview)
      setSucesso(n)
      setPreview(null)
      setTexto('')
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setOcupado(false)
    }
  }

  const validos = preview?.filter((p) => p.erros.length === 0) ?? []
  const comErro = (preview?.length ?? 0) - validos.length

  return (
    <>
      <Titulo sub="Cole o texto exportado ou envie um arquivo .txt. Nada é gravado antes da confirmação.">Importar pedidos</Titulo>

      {sucesso !== null && (
        <div className="mb-4">
          <Aviso tipo="ok">
            {sucesso} pedido{sucesso === 1 ? '' : 's'} gravado{sucesso === 1 ? '' : 's'}.{' '}
            <button className="font-bold underline" onClick={() => navegar('/admin')}>Ver pedidos</button>
          </Aviso>
        </div>
      )}

      {!preview && (
        <Cartao className="space-y-4 p-4 md:p-6">
          <AreaTexto
            rotulo="Texto dos pedidos"
            rows={14}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={'#\nPedido: 10482\nCliente: Maria Oliveira\nCPF: 123.456.789-00\nProdutos:\n- Arroz branco 5kg | 2 un\nRetirada: 15/10/2026'}
            className="font-mono"
          />
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="inline-flex min-h-[52px] cursor-pointer items-center justify-center gap-2 rounded-campo border border-borda bg-card px-5 font-bold text-azul hover:bg-bg">
              <IconeUpload className="size-5" /> Enviar arquivo .txt
              <input type="file" accept=".txt,text/plain" className="hidden" onChange={lerArquivo} />
            </label>
            <Botao className="sm:ml-auto" disabled={!texto.trim() || ocupado} onClick={preVisualizar}>
              {ocupado ? 'Lendo…' : 'Pré-visualizar'}
            </Botao>
          </div>
          {erro && <Aviso>{erro}</Aviso>}
        </Cartao>
      )}

      {preview && (
        <Cartao>
          <div className="flex flex-wrap items-center gap-2 border-b border-borda p-4 text-sm">
            <span className="font-bold">{preview.length} pedidos lidos</span>
            <span className="rounded-full bg-pronto-bg px-2 py-0.5 font-semibold text-pronto-fg">{validos.length} válidos</span>
            {comErro > 0 && <span className="rounded-full bg-vermelho/10 px-2 py-0.5 font-semibold text-vermelho">{comErro} com erro (serão ignorados)</span>}
          </div>
          <ul className="divide-y divide-borda">
            {preview.map((p, i) => (
              <li key={i} className={`grid gap-1 p-4 text-sm md:grid-cols-[110px_1fr_130px_70px_95px_150px] md:items-center md:gap-3 ${p.erros.length ? 'bg-vermelho/5' : ''}`}>
                <span className="font-semibold">#{p.numero || '—'}{p.existente && <span className="ml-1 text-xs font-normal text-secundario">(atualiza)</span>}</span>
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate">{p.cliente_nome || '—'}</span>
                  <BadgeCanal canal={p.canal} />
                </span>
                <span className="text-secundario">{p.cpf.length === 11 ? mascaraCpf(p.cpf) : p.cpf || '—'}</span>
                <span className="text-secundario">{p.itens.length} {p.itens.length === 1 ? 'item' : 'itens'}</span>
                <span>{formatarData(p.data_retirada)}</span>
                {p.erros.length ? (
                  <span className="font-medium text-vermelho">{p.erros.join(' · ')}</span>
                ) : (
                  <span className="justify-self-start rounded-md bg-azul px-2 py-1 font-chave font-bold text-white">{p.palavra_chave}</span>
                )}
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-3 border-t border-borda p-4 sm:flex-row sm:justify-end">
            {erro && <Aviso>{erro}</Aviso>}
            <Botao variante="secundario" onClick={() => setPreview(null)} disabled={ocupado}>Voltar e editar</Botao>
            <Botao onClick={processar} disabled={ocupado || validos.length === 0}>
              {ocupado ? 'Gravando…' : `Processar ${validos.length} pedido${validos.length === 1 ? '' : 's'}`}
            </Botao>
          </div>
        </Cartao>
      )}
    </>
  )
}
