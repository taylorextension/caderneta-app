export interface Profile {
  id: string
  nome: string
  nome_loja: string
  telefone: string
  pix_chave: string | null
  pix_tipo: 'cpf' | 'cnpj' | 'email' | 'telefone' | 'aleatoria' | null
  pix_nome: string | null
  pix_cidade: string
  trial_fim: string
  assinatura_ativa: boolean
  onboarding_completo?: boolean
  created_at: string
}

export interface Cliente {
  id: string
  user_id: string
  nome: string
  telefone: string
  apelido: string | null
  ativo: boolean
  created_at: string
}

export interface ItemNota {
  descricao: string
  quantidade: number
  valor_unitario: number
}

export interface Nota {
  id: string
  user_id: string
  cliente_id: string
  descricao: string | null
  itens: ItemNota[]
  valor: number
  data_compra: string
  data_vencimento: string | null
  status: 'pendente' | 'pago' | 'cancelado'
  data_pagamento: string | null
  foto_url: string | null
  ocr_confianca: 'alta' | 'media' | 'baixa' | null
  vezes_cobrado: number
  created_at: string
}

export interface Cobranca {
  id: string
  user_id: string
  nota_id: string | null
  cliente_id: string
  mensagem: string
  notas_ids: string[]
  enviado_em: string
}

export type EventoTipo = 'link_aberto' | 'pix_copiado' | 'tempo_pagina' | 'marcou_pago' | 'desfez_pago'

export interface Evento {
  id: string
  nota_id: string
  cliente_id: string
  user_id: string
  tipo: EventoTipo
  metadata: Record<string, unknown>
  created_at: string
}

export interface InicioData {
  total_pendente: number
  recebido_mes: number
  vencidas: NotaComCliente[]
  vencendo: NotaComCliente[]
  recebidos_hoje: { id: string; valor: number; cliente_nome: string }[]
}

export interface NotaComCliente {
  id: string
  valor: number
  data_vencimento: string
  itens: ItemNota[]
  descricao: string | null
  vezes_cobrado: number
  cliente_id: string
  cliente_nome: string
  apelido: string | null
  cliente_telefone: string
  dias_atraso?: number
  dias_restantes?: number
}
