'use client'

import { useRouter } from 'next/navigation'
import { Avatar } from '@/components/ui/avatar'
import { formatCurrencyShort } from '@/lib/format'
import type { NotaComCliente } from '@/types/database'

interface NotaCardProps {
  nota: NotaComCliente
  variant: 'vencida' | 'vencendo'
  onCobrar: (nota: NotaComCliente) => void
}

export function NotaCard({ nota, variant, onCobrar }: NotaCardProps) {
  const router = useRouter()
  const displayName = nota.apelido || nota.cliente_nome

  const subtitleText =
    variant === 'vencida'
      ? `${nota.dias_atraso} dias atrás`
      : `em ${nota.dias_restantes} dias`

  return (
    <div
      className="flex items-center gap-3 py-3 cursor-pointer"
      onClick={() => router.push(`/clientes/${nota.cliente_id}`)}
    >
      <Avatar name={displayName} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">
          {displayName}
        </p>
        <p className="text-sm text-text-secondary">
          {formatCurrencyShort(nota.valor)} · {subtitleText}
        </p>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation()
          onCobrar(nota)
        }}
        className="text-sm font-medium text-text-primary shrink-0"
      >
        Cobrar →
      </button>
    </div>
  )
}
