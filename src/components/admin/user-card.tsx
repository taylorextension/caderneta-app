'use client'

import { EllipsisVerticalIcon } from '@heroicons/react/24/outline'

interface User {
  id: string
  nome: string
  nome_loja: string
  telefone: string
  email: string
  plano: string
  assinatura_ativa: boolean
  trial_fim: string | null
  created_at: string
  status: 'ativo' | 'trial' | 'expirado'
  conta_teste?: boolean
}

interface UserCardProps {
  user: User
  onMenuOpen: (user: User) => void
}

const statusColor = (s: string) => {
  if (s === 'ativo') return 'bg-emerald-100 text-emerald-700'
  if (s === 'trial') return 'bg-amber-100 text-amber-700'
  return 'bg-red-100 text-red-700'
}

const statusLabel = (s: string) => {
  if (s === 'ativo') return 'Assinante'
  if (s === 'trial') return 'Trial'
  return 'Expirado'
}

export type { User }

export function UserCard({ user, onMenuOpen }: UserCardProps) {
  return (
    <div className="bg-white rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#02090A] truncate">
            {user.nome || 'Sem nome'}
          </p>
          <p className="text-xs text-[#6B7280] truncate">{user.email}</p>
          {user.nome_loja && (
            <p className="text-xs text-[#6B7280] truncate">{user.nome_loja}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {user.conta_teste && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-gray-100 text-gray-500">
              Teste
            </span>
          )}
          <span
            className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${statusColor(user.status)}`}
          >
            {statusLabel(user.status)}
          </span>
          <button
            onClick={() => onMenuOpen(user)}
            className="p-1 rounded-lg hover:bg-[#F5F7F5] transition-colors"
          >
            <EllipsisVerticalIcon className="h-5 w-5 text-[#6B7280]" />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-[#6B7280]">
        <div className="flex gap-3">
          <span>
            Plano:{' '}
            <strong className="text-[#02090A]">
              {user.plano || 'trial'}
            </strong>
          </span>
          <span>
            Criado: {new Date(user.created_at).toLocaleDateString('pt-BR')}
          </span>
        </div>
      </div>

      {user.trial_fim && !user.assinatura_ativa && (
        <p className="text-[11px] text-[#6B7280]">
          Trial até: {new Date(user.trial_fim).toLocaleDateString('pt-BR')}
        </p>
      )}
    </div>
  )
}
