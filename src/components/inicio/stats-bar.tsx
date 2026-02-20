'use client'

import { Card } from '@/components/ui/card'
import { formatCurrencyShort } from '@/lib/format'

interface StatsBarProps {
  totalPendente: number
  recebidoMes: number
}

export function StatsBar({ totalPendente, recebidoMes }: StatsBarProps) {
  return (
    <Card className="flex">
      <div className="flex-1 pr-4 border-r border-divider">
        <p className="text-xs text-text-muted">Pendente</p>
        <p className="text-2xl font-bold text-text-primary mt-0.5">
          {formatCurrencyShort(totalPendente)}
        </p>
      </div>
      <div className="flex-1 pl-4">
        <p className="text-xs text-text-muted">Recebido/mês</p>
        <p className="text-2xl font-bold text-text-primary mt-0.5">
          {formatCurrencyShort(recebidoMes)}
        </p>
      </div>
    </Card>
  )
}
