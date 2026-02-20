export interface OcrResponse {
  itens: {
    descricao: string
    quantidade: number
    valor_unitario: number
  }[]
  total_detectado: number
  confianca: 'alta' | 'media' | 'baixa'
  observacoes: string | null
}

export interface MensagemRequest {
  cliente_nome: string
  cliente_apelido: string | null
  lojista_nome: string
  nome_loja: string
  notas: {
    descricao: string | null
    itens: { descricao: string; quantidade: number; valor_unitario: number }[]
    valor: number
    data_vencimento: string | null
    vezes_cobrado: number
  }[]
  total: number
}

export interface MensagemResponse {
  mensagem: string
}
