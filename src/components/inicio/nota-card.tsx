'use client'

import { useRouter } from 'next/navigation'
import { Avatar } from '@/components/ui/avatar'
import { formatCurrencyShort, formatRelativeDate } from '@/lib/format'
import type { NotaComCliente } from '@/types/database'

interface NotaCardProps {
  nota: NotaComCliente
  variant: 'vencida' | 'vencendo'
  onCobrar: (nota: NotaComCliente) => void
  onMarcarPago?: (nota: NotaComCliente) => void
  ultimaAcao?: {
    tipo: 'lembrete_enviado' | 'link_aberto' | 'pix_copiado' | string
    created_at: string
  } | null
}

export function NotaCard({ nota, variant, onCobrar, onMarcarPago, ultimaAcao }: NotaCardProps) {
  const router = useRouter()
  const displayName = nota.apelido || nota.cliente_nome

  const subtitleText =
    variant === 'vencida'
      ? `${nota.dias_atraso} dias atrás`
      : `em ${nota.dias_restantes} dias`

  const getAcaoText = () => {
    if (!ultimaAcao) return null
    const labels: Record<string, string> = {
      lembrete_enviado: 'Cobrança enviada',
      link_aberto: 'Abriu o link',
      pix_copiado: 'Copiou o Pix',
      marcou_pago: 'Marcou como pago',
      desfez_pago: 'Pagamento desfeito',
    }
    return labels[ultimaAcao.tipo] || ultimaAcao.tipo
  }

  const acaoText = getAcaoText()

  return (
    <div
      className="py-3 cursor-pointer"
      onClick={() => router.push(`/clientes/${nota.cliente_id}`)}
    >
      <div className="flex items-start gap-3">
        <Avatar name={displayName} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">
            {displayName}
          </p>
          <p className="text-sm text-text-secondary">
            {formatCurrencyShort(nota.valor)} · {subtitleText}
          </p>
          {acaoText && (
            <p className="text-xs text-text-muted mt-1">
              {acaoText} · {formatRelativeDate(ultimaAcao!.created_at.split('T')[0])}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onCobrar(nota)
            }}
            className="text-sm font-medium text-text-primary shrink-0"
          >
            Cobrar →
          </button>
          {onMarcarPago && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onMarcarPago(nota)
              }}
              className="text-xs px-2 py-1 rounded-full border border-success text-success hover:bg-success hover:text-white transition-colors shrink-0"
            >
              Pago ✓
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
