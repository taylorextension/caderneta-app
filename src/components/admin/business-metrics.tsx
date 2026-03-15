'use client'

import {
  ArrowsRightLeftIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline'

interface BusinessMetricsProps {
  conversionRate: number
  churnRate: number
  mrr: number
}

export function BusinessMetrics({
  conversionRate,
  churnRate,
  mrr,
}: BusinessMetricsProps) {
  return (
    <div className="bg-white rounded-xl p-4 space-y-3">
      <MetricRow
        icon={<ArrowsRightLeftIcon className="h-4 w-4 text-indigo-600" />}
        label="Conversão trial → pago"
        value={`${conversionRate}%`}
      />
      <div className="h-px bg-divider" />
      <MetricRow
        icon={<ChartBarIcon className="h-4 w-4 text-orange-600" />}
        label="Churn (últimos 30d)"
        value={`${churnRate}%`}
      />
      <div className="h-px bg-divider" />
      <MetricRow
        icon={<CurrencyDollarIcon className="h-4 w-4 text-teal-600" />}
        label="MRR"
        value={`R$ ${mrr.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
      />
    </div>
  )
}

function MetricRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm text-[#6B7280]">{label}</span>
      </div>
      <span className="text-sm font-semibold text-[#02090A]">{value}</span>
    </div>
  )
}
