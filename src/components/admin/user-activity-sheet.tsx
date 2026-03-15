'use client'

import { useState, useEffect, useCallback } from 'react'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DocumentTextIcon,
  ChatBubbleLeftIcon,
  CurrencyDollarIcon,
  UserPlusIcon,
} from '@heroicons/react/24/outline'

interface UserActivitySheetProps {
  open: boolean
  onClose: () => void
  userId: string | null
  userName: string
}

interface ActivityItem {
  type: string
  description: string
  created_at: string
}

interface Summary {
  totalClientes: number
  totalNotas: number
  totalNotasPendentes: number
  totalNotasPagas: number
  totalCobrancas: number
  valorTotalPendente: number
  valorTotalRecebido: number
}

const typeIcon: Record<string, React.ReactNode> = {
  nota_criada: <DocumentTextIcon className="h-4 w-4 text-blue-500" />,
  cobranca_enviada: <ChatBubbleLeftIcon className="h-4 w-4 text-amber-500" />,
  pagamento_recebido: (
    <CurrencyDollarIcon className="h-4 w-4 text-emerald-500" />
  ),
  cliente_adicionado: <UserPlusIcon className="h-4 w-4 text-purple-500" />,
}

function SummaryItem({
  label,
  value,
}: {
  label: string
  value: number | string
}) {
  return (
    <div className="bg-[#F5F7F5] rounded-lg p-3">
      <p className="text-lg font-bold text-[#02090A]">{value}</p>
      <p className="text-xs text-[#6B7280]">{label}</p>
    </div>
  )
}

export function UserActivitySheet({
  open,
  onClose,
  userId,
  userName,
}: UserActivitySheetProps) {
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [activity, setActivity] = useState<ActivityItem[]>([])

  const fetchActivity = useCallback(async (id: string) => {
    setLoading(true)
    try {
      const r = await fetch(`/api/admin/users/${id}/activity`)
      const data = await r.json()
      setSummary(data.summary)
      setActivity(data.recentActivity || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open && userId) {
      fetchActivity(userId)
    }
  }, [open, userId, fetchActivity])

  return (
    <BottomSheet open={open} onClose={onClose}>
      <h3 className="text-base font-semibold text-[#02090A] mb-1">
        Atividade de {userName || 'Usuário'}
      </h3>
      <div className="h-px bg-divider my-3" />

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      ) : (
        <>
          {summary && (
            <div className="grid grid-cols-2 gap-3 mb-4">
              <SummaryItem label="Clientes" value={summary.totalClientes} />
              <SummaryItem label="Notas" value={summary.totalNotas} />
              <SummaryItem label="Cobranças" value={summary.totalCobrancas} />
              <SummaryItem
                label="Recebido"
                value={`R$ ${summary.valorTotalRecebido.toFixed(2)}`}
              />
            </div>
          )}

          <h4 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-2">
            Atividade Recente
          </h4>
          {activity.length === 0 ? (
            <p className="text-sm text-[#6B7280] text-center py-4">
              Nenhuma atividade registrada
            </p>
          ) : (
            <div className="space-y-2 max-h-[40vh] overflow-y-auto">
              {activity.map((item, i) => (
                <div key={i} className="flex items-start gap-3 py-2">
                  <div className="mt-0.5 shrink-0">
                    {typeIcon[item.type] || (
                      <DocumentTextIcon className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#02090A] truncate">
                      {item.description}
                    </p>
                    <p className="text-[11px] text-[#9CA3AF]">
                      {new Date(item.created_at).toLocaleDateString('pt-BR')} às{' '}
                      {new Date(item.created_at).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </BottomSheet>
  )
}
