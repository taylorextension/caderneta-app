import { useState, type ComponentType } from 'react'
import { formatCurrencyShort } from '@/lib/format'
import { Modal } from '@/components/ui/modal'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useUIStore } from '@/stores/ui-store'
import {
  ClipboardDocumentCheckIcon,
  EyeIcon,
  PaperAirplaneIcon,
  PencilIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'

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
  onEdit?: (id: string, data: { descricao: string; valor: string; data_vencimento: string }) => void
  onDelete?: (id: string) => void
}

export function NotaCard({
  nota,
  cliente,
  ultimaAcao,
  showAvatar = true,
  onCobrar,
  onMarcarPago,
  onEdit,
  onDelete,
}: NotaCardProps) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [showEditSheet, setShowEditSheet] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [editDescricao, setEditDescricao] = useState(nota.descricao || '')
  const [editValor, setEditValor] = useState(String(Number(nota.valor).toFixed(2)).replace('.', ','))
  const [editVencimento, setEditVencimento] = useState(nota.data_vencimento || '')
  const addToast = useUIStore((s) => s.addToast)

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
    if (vencido) return `${diasAtraso} dias atrás`
    const diasParaVencer = Math.abs(diasAtraso)
    if (diasParaVencer === 0) return 'Vence hoje'
    if (diasParaVencer === 1) return 'Vence amanhã'
    return `em ${diasParaVencer} dias`
  }

  const getAcaoIcon = (tipo: string): ComponentType<{ className?: string }> => {
    const icons: Record<string, ComponentType<{ className?: string }>> = {
      lembrete_enviado: PaperAirplaneIcon,
      link_aberto: EyeIcon,
      pix_copiado: ClipboardDocumentCheckIcon,
    }
    return icons[tipo] || SparklesIcon
  }

  const getAcaoText = (tipo: string) => {
    const labels: Record<string, string> = {
      lembrete_enviado: 'Lembrete enviado',
      link_aberto: 'Abriu o link',
      pix_copiado: 'Copiou o Pix',
    }
    return labels[tipo] || tipo
  }

  const formatAcaoTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const hoje = new Date()
    const ontem = new Date(hoje)
    ontem.setDate(ontem.getDate() - 1)

    const hora = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

    if (date.toDateString() === hoje.toDateString()) {
      return `Hoje às ${hora}`
    }
    if (date.toDateString() === ontem.toDateString()) {
      return `Ontem às ${hora}`
    }
    return `${date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} · ${hora}`
  }

  const handleConfirmarPago = () => {
    onMarcarPago()
    setShowConfirm(false)
    addToast({
      message: 'Pagamento registrado!',
      type: 'success',
    })
  }

  const handleSaveEdit = () => {
    if (!onEdit) return
    const valorNum = editValor.replace(',', '.')
    onEdit(nota.id, {
      descricao: editDescricao,
      valor: valorNum,
      data_vencimento: editVencimento,
    })
    setShowEditSheet(false)
    addToast({ message: 'Nota atualizada', type: 'success' })
  }

  const handleDeleteNota = () => {
    if (!onDelete) return
    onDelete(nota.id)
    setShowDeleteConfirm(false)
    setShowEditSheet(false)
    addToast({ message: 'Nota excluída', type: 'info' })
  }

  const displayName = cliente.apelido || cliente.nome

  return (
    <>
      <div className="p-4">
        {/* Linha 1: Avatar + Nome + Edit */}
        <div className="flex items-center gap-3">
          {showAvatar && (
            <div className="h-10 w-10 rounded-full bg-black text-white flex items-center justify-center text-sm font-semibold shrink-0">
              {(cliente.nome?.[0] || 'C').toUpperCase()}
            </div>
          )}
          <p className="text-sm font-semibold text-text-primary truncate flex-1">
            {displayName}
          </p>
          {(onEdit || onDelete) && (
            <button
              onClick={() => setShowEditSheet(true)}
              className="shrink-0 h-8 w-8 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors"
            >
              <PencilIcon className="h-4 w-4 text-text-muted" />
            </button>
          )}
        </div>

        {/* Linha 2: Valor + Status */}
        <p className="text-sm text-text-secondary mt-1">
          {formatCurrencyShort(Number(nota.valor))} · {getStatusText()}
        </p>

        {/* Linha 3: Última ação (só se existir) */}
        {ultimaAcao && (
          <p className="text-xs text-text-secondary mt-2 flex items-center gap-1.5">
            {(() => {
              const AcaoIcon = getAcaoIcon(ultimaAcao.tipo)
              return <AcaoIcon className="h-3.5 w-3.5 shrink-0" />
            })()}
            <span>{getAcaoText(ultimaAcao.tipo)} · {formatAcaoTime(ultimaAcao.created_at)}</span>
          </p>
        )}

        {/* Linha 4: Botões lado a lado */}
        {nota.status !== 'pago' && (
          <div className="flex gap-2 mt-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowConfirm(true)}
              className="flex-1"
            >
              Pago ✓
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={onCobrar}
              className="flex-1"
            >
              Cobrar →
            </Button>
          </div>
        )}
      </div>

      {/* Modal de confirmação de pagamento */}
      <Modal open={showConfirm} onClose={() => setShowConfirm(false)}>
        <h3 className="text-lg font-semibold mb-2 text-text-primary">Confirmar pagamento?</h3>
        <p className="text-sm text-text-secondary mb-6">
          {displayName} · {formatCurrencyShort(Number(nota.valor))}
        </p>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => setShowConfirm(false)}
          >
            Cancelar
          </Button>
          <Button
            className="flex-1"
            onClick={handleConfirmarPago}
          >
            Confirmar ✓
          </Button>
        </div>
      </Modal>

      {/* BottomSheet de edição */}
      <BottomSheet open={showEditSheet} onClose={() => setShowEditSheet(false)}>
        <h3 className="text-lg font-semibold mb-4">Editar nota</h3>
        <div className="space-y-4">
          <Input
            label="Descrição"
            value={editDescricao}
            onChange={(e) => setEditDescricao(e.target.value)}
            placeholder="Ex: Compra da semana"
          />
          <Input
            label="Valor (R$)"
            inputMode="numeric"
            value={editValor}
            onChange={(e) => {
              const numbersOnly = e.target.value.replace(/\D/g, '')
              if (!numbersOnly) { setEditValor(''); return }
              const amount = (parseInt(numbersOnly, 10) / 100).toFixed(2)
              setEditValor(amount.replace('.', ','))
            }}
            placeholder="0,00"
          />
          <Input
            label="Data de vencimento"
            type="date"
            value={editVencimento}
            onChange={(e) => setEditVencimento(e.target.value)}
          />
        </div>
        <Button onClick={handleSaveEdit} className="w-full mt-6">
          Salvar alterações
        </Button>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="w-full mt-3 h-12 text-sm font-medium text-red-500"
        >
          Excluir nota
        </button>
      </BottomSheet>

      {/* Modal de confirmação de exclusão */}
      <Modal open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)}>
        <h3 className="text-lg font-semibold mb-2 text-text-primary">Excluir nota?</h3>
        <p className="text-sm text-text-secondary mb-6">
          Esta ação não pode ser desfeita.
        </p>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => setShowDeleteConfirm(false)}
          >
            Cancelar
          </Button>
          <Button
            className="flex-1 !bg-red-500 !text-white"
            onClick={handleDeleteNota}
          >
            Excluir
          </Button>
        </div>
      </Modal>
    </>
  )
}
