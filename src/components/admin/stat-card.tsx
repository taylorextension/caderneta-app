'use client'

import { type ReactNode } from 'react'

interface StatCardProps {
  icon: ReactNode
  label: string
  value: number
  sub?: string
  color: string
  format?: 'number' | 'currency' | 'percent'
}

export function StatCard({
  icon,
  label,
  value,
  sub,
  color,
  format = 'number',
}: StatCardProps) {
  const formatted = (() => {
    if (format === 'currency')
      return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    if (format === 'percent') return `${value}%`
    return value
  })()

  return (
    <div className="bg-white rounded-xl p-4">
      <div className={`inline-flex p-2 rounded-lg mb-2 ${color}`}>{icon}</div>
      <p className="text-2xl font-bold text-[#02090A]">{formatted}</p>
      <p className="text-xs text-[#6B7280] mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-[#9CA3AF] mt-0.5">{sub}</p>}
    </div>
  )
}
