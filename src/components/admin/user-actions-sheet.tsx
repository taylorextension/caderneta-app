'use client'

import { BottomSheet } from '@/components/ui/bottom-sheet'
import {
  CheckCircleIcon,
  XCircleIcon,
  NoSymbolIcon,
  TrashIcon,
  PencilSquareIcon,
  EyeIcon,
  BeakerIcon,
  ChatBubbleLeftIcon,
} from '@heroicons/react/24/outline'
import type { User } from './user-card'
import { openWhatsApp } from '@/lib/whatsapp'

interface UserActionsSheetProps {
  open: boolean
  onClose: () => void
  user: User | null
  onToggleSubscription: () => void
  onCancelSubscription: () => void
  onToggleTest: () => void
  onDelete: () => void
  onEdit: () => void
  onViewActivity: () => void
  onWhatsAppSent: () => void
}

export function UserActionsSheet({
  open,
  onClose,
  user,
  onToggleSubscription,
  onCancelSubscription,
  onToggleTest,
  onDelete,
  onEdit,
  onViewActivity,
  onWhatsAppSent,
}: UserActionsSheetProps) {
  if (!user) return null

  const adminWhatsAppMessage = `Oi, *${user.nome || 'você'}*! Aqui é o Junio do Caderneta.\n\nSeu acesso já está *ativo* e pronto para usar.\n\nAcesse agora:\nhttps://caderneta.app/inicio\n\nQualquer dúvida é só me chamar aqui!`

  const actions = [
    ...(user.telefone
      ? [
          {
            label: user.whatsapp_admin_em ? 'Reenviar WhatsApp' : 'Enviar WhatsApp',
            icon: <ChatBubbleLeftIcon className="h-5 w-5" />,
            onClick: () => {
              openWhatsApp(user.telefone, adminWhatsAppMessage)
              onWhatsAppSent()
            },
            color: 'text-emerald-600',
          },
        ]
      : []),
    {
      label: user.assinatura_ativa ? 'Desativar Conta' : 'Ativar Conta',
      icon: user.assinatura_ativa ? (
        <XCircleIcon className="h-5 w-5" />
      ) : (
        <CheckCircleIcon className="h-5 w-5" />
      ),
      onClick: onToggleSubscription,
      color: user.assinatura_ativa ? 'text-amber-600' : 'text-emerald-600',
    },
    ...(user.assinatura_ativa
      ? [
          {
            label: 'Cancelar Assinatura',
            icon: <NoSymbolIcon className="h-5 w-5" />,
            onClick: onCancelSubscription,
            color: 'text-orange-600',
          },
        ]
      : []),
    {
      label: user.conta_teste ? 'Remover marca de teste' : 'Marcar como teste',
      icon: <BeakerIcon className="h-5 w-5" />,
      onClick: onToggleTest,
      color: user.conta_teste ? 'text-purple-600' : 'text-[#6B7280]',
    },
    {
      label: 'Editar Dados',
      icon: <PencilSquareIcon className="h-5 w-5" />,
      onClick: onEdit,
      color: 'text-[#6B7280]',
    },
    {
      label: 'Visualizar Atividade',
      icon: <EyeIcon className="h-5 w-5" />,
      onClick: onViewActivity,
      color: 'text-[#6B7280]',
    },
    {
      label: 'Deletar Conta',
      icon: <TrashIcon className="h-5 w-5" />,
      onClick: onDelete,
      color: 'text-red-500',
    },
  ]

  return (
    <BottomSheet open={open} onClose={onClose}>
      <h3 className="text-base font-semibold text-[#02090A] mb-1">
        {user.nome || 'Sem nome'}
      </h3>
      <p className="text-xs text-[#6B7280]">{user.email}</p>
      <div className="h-px bg-divider my-3" />
      <div className="space-y-1">
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={() => {
              onClose()
              action.onClick()
            }}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium hover:bg-[#F5F7F5] transition-colors ${action.color}`}
          >
            {action.icon}
            {action.label}
          </button>
        ))}
      </div>
    </BottomSheet>
  )
}
