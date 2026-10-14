export type OrderStatus = 'em_separacao' | 'pronto' | 'retirado'

export const STATUS_LABEL: Record<OrderStatus, string> = {
  em_separacao: 'Em separação',
  pronto: 'Pronto para retirada',
  retirado: 'Retirado',
}

export interface AppConfig {
  id: number
  app_name: string
  logo_url: string | null
  cor_azul: string
  cor_vermelho: string
  txt_saudacao: string
  txt_instrucao: string
  txt_botao: string
  txt_rodape: string
  txt_erro_vazio: string
  formato_chave: 'palavra' | 'codigo'
  mercado_cnpj: string | null
  mercado_endereco: string | null
  mercado_telefone: string | null
  mercado_whatsapp: string | null
  mercado_email: string | null
  mercado_horario: string | null
}

export interface OrderItem {
  id?: string
  order_id?: string
  ean?: string | null
  nome: string
  quantidade: number
  unidade: string
}

export interface Order {
  id: string
  numero: string
  cliente_nome: string
  cpf: string
  telefone: string | null
  palavra_chave: string
  status: OrderStatus
  data_retirada: string | null
  created_at: string
  updated_at: string
}
