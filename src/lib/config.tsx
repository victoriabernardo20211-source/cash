import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { api } from './api'
import type { AppConfig } from './types'

export const DEFAULT_CONFIG: AppConfig = {
  id: 1,
  app_name: 'Mercado Bom Dia',
  logo_url: null,
  cor_azul: '#254F9B',
  cor_vermelho: '#C20016',
  txt_saudacao: 'Olá! Vamos ao seu pedido',
  txt_instrucao: 'Digite o seu CPF para consultar o pedido e receber a palavra-chave de retirada.',
  txt_botao: 'Consultar meu pedido',
  txt_rodape: 'Dúvidas? Fale com o balcão.',
  txt_erro_vazio: 'Nenhum pedido encontrado para este CPF.',
  formato_chave: 'palavra',
  auto_retirada_min: 30,
  mercado_cnpj: null,
  mercado_endereco: null,
  mercado_telefone: null,
  mercado_whatsapp: null,
  mercado_email: null,
  mercado_horario: null,
}

interface Ctx {
  config: AppConfig
  carregando: boolean
  recarregar: () => Promise<void>
}

const ConfigContext = createContext<Ctx>({ config: DEFAULT_CONFIG, carregando: true, recarregar: async () => {} })

/** Variáveis CSS que tornam as cores da `config` válidas em todas as classes Tailwind. */
export function varsDeCor(c: Pick<AppConfig, 'cor_azul' | 'cor_vermelho'>) {
  return { '--azul': c.cor_azul, '--vermelho': c.cor_vermelho } as React.CSSProperties
}

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG)
  const [carregando, setCarregando] = useState(true)

  const recarregar = useCallback(async () => {
    try {
      const data = await api<AppConfig | null>('config.obter')
      if (data) setConfig({ ...DEFAULT_CONFIG, ...data })
    } catch {
      // Sem API (ex.: banco fora do ar): segue com os defaults.
    }
    setCarregando(false)
  }, [])

  useEffect(() => {
    recarregar()
  }, [recarregar])

  useEffect(() => {
    const raiz = document.documentElement.style
    raiz.setProperty('--azul', config.cor_azul)
    raiz.setProperty('--vermelho', config.cor_vermelho)
    document.title = `${config.app_name} · Click & Retire`
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', config.cor_azul)
  }, [config])

  return <ConfigContext.Provider value={{ config, carregando, recarregar }}>{children}</ConfigContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useConfig = () => useContext(ConfigContext)
