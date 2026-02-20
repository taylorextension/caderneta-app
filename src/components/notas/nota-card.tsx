import { formatCurrencyShort, formatRelativeDate } from '@/lib/format'

interface NotaCardProps {
  nota: {
    id: string
    valor: number
    descricao?: string | null
    itens?: { descricao: string; quantidade: number; valor_unitario: number }[] | null
    data_vencimento?: string | null
    status: 'pendente' | 'pago'
    vezes_cobrado: number
  }
  cliente: {
    id: string
    nome: string
    apelido?: string | null
    telefone?: string | null
  }
  ultimaAcao?: {
    tipo: 'lembrete_enviado' | 'link_aberto' | 'pix_copiado' | string
    created_at: string
  } | null
  showAvatar?: boolean
  onCobrar: () => void
  onMarcarPago: () => void
}

export function NotaCard({
  nota,
  cliente,
  ultimaAcao,
  showAvatar = true,
  onCobrar,
  onMarcarPago,
}: NotaCardProps) {
  const hoje = new Date()
  const venc = nota.data_vencimento
    ? new Date(nota.data_vencimento + 'T00:00:00')
    : null
  const diasAtraso = venc
    ? Math.floor((hoje.getTime() - venc.getTime()) / 86400000)
    : 0
  const vencido = diasAtraso > 0

  const getStatusText = () => {
    if (nota.status === 'pago') {
      return 'Pago'
    }
    if (!nota.data_vencimento) return 'Sem vencimento'
    if (vencido) return `Venceu há ${diasAtraso} dias`
    const diasParaVencer = Math.abs(diasAtraso)
    if (diasParaVencer === 0) return 'Vence hoje'
    if (diasParaVencer === 1) return 'Vence amanhã'
    return `Vence em ${diasParaVencer} dias`
  }

  const getAcaoText = () => {
    if (!ultimaAcao) return null
    const labels: Record<string, string> = {
      lembrete_enviado: 'Lembrete enviado',
      link_aberto: 'Abriu o link',
      pix_copiado: 'Copiou o Pix',
    }
    return labels[ultimaAcao.tipo] || ultimaAcao.tipo
  }

  const acaoText = getAcaoText()

  return (
    <div className="bg-white border border-zinc-200 rounded-none p-4">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        {showAvatar && (
          <div className="h-10 w-10 rounded-full bg-black text-white flex items-center justify-center text-sm font-medium shrink-0">
            {(cliente.nome?.[0] || 'C').toUpperCase()}
          </div>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">
            {cliente.apelido || cliente.nome}
          </p>
          <p className="text-sm text-text-secondary">
            {formatCurrencyShort(Number(nota.valor))} · {getStatusText()}
          </p>
          
          {/* Indicador da última ação */}
          {acaoText && (
            <p className="text-xs text-text-muted mt-1">
              {acaoText} · {formatRelativeDate(ultimaAcao!.created_at.split('T')[0])}
            </p>
          )}
        </div>

        {/* Ações */}
        {nota.status !== 'pago' ? (
          <div className="flex flex-col items-end gap-2">
            <button
              onClick={onCobrar}
              className="text-sm font-medium text-text-primary hover:text-black transition-colors"
            >
              Cobrar →
            </button>
            <button
              onClick={onMarcarPago}
              className="text-xs px-2 py-1 rounded-full border border-success text-success hover:bg-success hover:text-white transition-colors"
            >
              Pago ✓
            </button>
          </div>
        ) : (
          <span className="text-sm text-success font-medium">✓</span>
        )}
      </div>
    </div>
  )
}
