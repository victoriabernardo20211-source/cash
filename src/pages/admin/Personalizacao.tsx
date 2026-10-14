import { useEffect, useState, type ChangeEvent } from 'react'
import { InicioView, ResultadoView, type PedidoPublico } from '../../components/cliente'
import { AreaTexto, Aviso, Botao, Campo, Cartao } from '../../components/ui'
import { useConfig, varsDeCor } from '../../lib/config'
import { api } from '../../lib/api'
import type { AppConfig } from '../../lib/types'
import { Titulo } from './Layout'

const EXEMPLO: Record<'em_separacao' | 'pronto', PedidoPublico> = {
  pronto: {
    numero: '10482', cliente_nome: 'Maria Oliveira', status: 'pronto', data_retirada: '2026-10-15', palavra_chave: 'GIRASSOL 42',
    itens: [{ nome: 'Arroz branco 5kg', quantidade: 2, unidade: 'un' }, { nome: 'Leite integral 1L', quantidade: 6, unidade: 'un' }],
  },
  em_separacao: {
    numero: '10483', cliente_nome: 'João Santos', status: 'em_separacao', data_retirada: '2026-10-15', palavra_chave: null,
    itens: [{ nome: 'Café torrado 500g', quantidade: 4, unidade: 'un' }],
  },
}

type Tela = 'inicio' | 'pronto' | 'em_separacao' | 'vazio'

const TEXTOS: { campo: keyof AppConfig; rotulo: string; longo?: boolean }[] = [
  { campo: 'txt_saudacao', rotulo: 'Saudação' },
  { campo: 'txt_instrucao', rotulo: 'Instrução', longo: true },
  { campo: 'txt_botao', rotulo: 'Texto do botão' },
  { campo: 'txt_erro_vazio', rotulo: 'Mensagem de CPF sem pedido', longo: true },
  { campo: 'txt_rodape', rotulo: 'Rodapé' },
]

const HEX = /^#[0-9a-f]{6}$/i

export default function Personalizacao() {
  const { config, recarregar } = useConfig()
  const [form, setForm] = useState<AppConfig>(config)
  const [tela, setTela] = useState<Tela>('inicio')
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)

  useEffect(() => setForm(config), [config])

  const set = <K extends keyof AppConfig>(k: K, v: AppConfig[K]) => setForm((f) => ({ ...f, [k]: v }))
  const alterado = JSON.stringify(form) !== JSON.stringify(config)
  const coresValidas = HEX.test(form.cor_azul) && HEX.test(form.cor_vermelho)

  const enviarLogo = async (e: ChangeEvent<HTMLInputElement>) => {
    const arq = e.target.files?.[0]
    e.target.value = ''
    if (!arq) return
    try {
      set('logo_url', await logoParaDataUrl(arq))
    } catch (err) {
      setMsg({ tipo: 'erro', texto: (err as Error).message })
    }
  }

  const salvar = async () => {
    setSalvando(true)
    setMsg(null)
    try {
      await api('config.salvar', {
        app_name: form.app_name, logo_url: form.logo_url, cor_azul: form.cor_azul, cor_vermelho: form.cor_vermelho,
        txt_saudacao: form.txt_saudacao, txt_instrucao: form.txt_instrucao, txt_botao: form.txt_botao,
        txt_rodape: form.txt_rodape, txt_erro_vazio: form.txt_erro_vazio, formato_chave: form.formato_chave,
      })
      await recarregar()
      setMsg({ tipo: 'ok', texto: 'Personalização salva. O app do cliente já está atualizado.' })
    } catch (e) {
      setMsg({ tipo: 'erro', texto: (e as Error).message })
    } finally {
      setSalvando(false)
    }
  }

  const nada = () => {}

  return (
    <>
      <Titulo sub="Logo, nome, cores e textos do app do cliente." acoes={
        <div className="flex gap-2">
          <Botao tamanho="p" variante="fantasma" disabled={!alterado || salvando} onClick={() => setForm(config)}>Descartar</Botao>
          <Botao tamanho="p" disabled={!alterado || salvando || !coresValidas} onClick={salvar}>{salvando ? 'Salvando…' : 'Salvar'}</Botao>
        </div>
      }>
        Personalização
      </Titulo>
      {msg && <div className="mb-4"><Aviso tipo={msg.tipo}>{msg.texto}</Aviso></div>}

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          <Cartao className="space-y-4 p-5">
            <h2 className="font-bold">Marca</h2>
            <div className="flex items-center gap-4">
              <div className="grid size-16 place-items-center overflow-hidden rounded-card border border-borda bg-bg">
                {form.logo_url ? <img src={form.logo_url} alt="Logo" className="size-full object-contain" /> : <span className="text-xs text-secundario">Sem logo</span>}
              </div>
              <div className="flex flex-wrap gap-2">
                <label className="inline-flex min-h-10 cursor-pointer items-center rounded-campo border border-borda px-3.5 text-sm font-bold text-azul hover:bg-bg">
                  Enviar logo
                  <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="hidden" onChange={enviarLogo} />
                </label>
                {form.logo_url && <Botao tamanho="p" variante="fantasma" onClick={() => set('logo_url', null)}>Remover</Botao>}
              </div>
            </div>
            <Campo rotulo="Nome do app" value={form.app_name} onChange={(e) => set('app_name', e.target.value)} />
          </Cartao>

          <Cartao className="space-y-4 p-5">
            <h2 className="font-bold">Cores</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <SeletorCor rotulo="Cor principal (azul)" valor={form.cor_azul} onChange={(v) => set('cor_azul', v)} />
              <SeletorCor rotulo="Cor de alerta (vermelho)" valor={form.cor_vermelho} onChange={(v) => set('cor_vermelho', v)} />
            </div>
          </Cartao>

          <Cartao className="space-y-4 p-5">
            <h2 className="font-bold">Textos</h2>
            {TEXTOS.map(({ campo, rotulo, longo }) =>
              longo ? (
                <AreaTexto key={campo} rotulo={rotulo} rows={2} value={form[campo] as string} onChange={(e) => set(campo, e.target.value as never)} />
              ) : (
                <Campo key={campo} rotulo={rotulo} value={form[campo] as string} onChange={(e) => set(campo, e.target.value as never)} />
              ),
            )}
          </Cartao>

          <Cartao className="space-y-3 p-5">
            <h2 className="font-bold">Formato da palavra-chave</h2>
            {([['palavra', 'Palavra + número', 'GIRASSOL 42'], ['codigo', 'Código curto', 'A7K3']] as const).map(([v, r, ex]) => (
              <label key={v} className="flex cursor-pointer items-center gap-3 rounded-campo border border-borda p-3 has-checked:border-azul has-checked:bg-separacao-bg">
                <input type="radio" name="formato" checked={form.formato_chave === v} onChange={() => set('formato_chave', v)} className="accent-azul" />
                <span className="flex-1 text-sm font-semibold">{r}</span>
                <span className="font-chave font-bold text-azul">{ex}</span>
              </label>
            ))}
            <p className="text-xs text-secundario">Vale para os próximos pedidos importados.</p>
          </Cartao>
        </div>

        <div className="lg:sticky lg:top-8 lg:self-start">
          <div className="mb-3 flex flex-wrap gap-1 rounded-campo bg-card p-1 shadow-suave">
            {([['inicio', 'Início'], ['pronto', 'Pronto'], ['em_separacao', 'Separando'], ['vazio', 'Vazio']] as const).map(([v, r]) => (
              <button key={v} onClick={() => setTela(v)} className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-bold ${tela === v ? 'bg-azul text-white' : 'text-secundario'}`}>{r}</button>
            ))}
          </div>
          <div
            style={varsDeCor(coresValidas ? form : config)}
            className="mx-auto h-[640px] w-full max-w-[360px] overflow-y-auto rounded-[32px] border-8 border-texto bg-bg shadow-suave"
            aria-label="Pré-visualização do app do cliente"
          >
            {tela === 'inicio' && <InicioView config={form} cpf="" onCpf={nada} onEnviar={nada} />}
            {tela === 'vazio' && <ResultadoView config={form} pedidos={[]} onVoltar={nada} />}
            {(tela === 'pronto' || tela === 'em_separacao') && <ResultadoView config={form} pedidos={[EXEMPLO[tela]]} onVoltar={nada} />}
          </div>
        </div>
      </div>
    </>
  )
}

function SeletorCor({ rotulo, valor, onChange }: { rotulo: string; valor: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold">{rotulo}</span>
      <div className="flex items-center gap-2 rounded-campo border border-borda p-1.5 focus-within:border-azul">
        <input type="color" value={HEX.test(valor) ? valor : '#000000'} onChange={(e) => onChange(e.target.value.toUpperCase())} className="size-10 cursor-pointer rounded-lg border-0 bg-transparent" />
        <input value={valor} onChange={(e) => onChange(e.target.value)} maxLength={7} className={`w-full bg-transparent font-mono text-sm uppercase outline-none ${HEX.test(valor) ? '' : 'text-vermelho'}`} />
      </div>
    </label>
  )
}

/**
 * A logo fica guardada na própria tabela `config` como data URL. Imagens
 * grandes são reduzidas para no máximo 512px no navegador antes de salvar.
 */
async function logoParaDataUrl(arq: File): Promise<string> {
  if (!/^image\/(png|jpeg|webp|svg\+xml)$/.test(arq.type)) throw new Error('Use PNG, JPG, WEBP ou SVG.')
  const original = await new Promise<string>((ok, falha) => {
    const r = new FileReader()
    r.onload = () => ok(r.result as string)
    r.onerror = () => falha(new Error('Não foi possível ler a imagem.'))
    r.readAsDataURL(arq)
  })
  if (arq.type === 'image/svg+xml') {
    if (original.length > 400_000) throw new Error('SVG muito grande (máx. 300 KB).')
    return original
  }
  const img = new Image()
  img.src = original
  await img.decode()
  const escala = Math.min(1, 512 / Math.max(img.width, img.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.width * escala)
  canvas.height = Math.round(img.height * escala)
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
  const url = canvas.toDataURL('image/png')
  if (url.length > 650_000) return canvas.toDataURL('image/webp', 0.85)
  return url
}
