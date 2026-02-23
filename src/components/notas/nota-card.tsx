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
  SparklesIcon,
} from '@heroicons/react/24/outline'

// Inline WhatsApp SVG icon
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

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
    if (nota.status === 'pago') return 'Pago'
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
    if (date.toDateString() === hoje.toDateString()) return `Hoje às ${hora}`
    if (date.toDateString() === ontem.toDateString()) return `Ontem às ${hora}`
    return `${date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} · ${hora}`
  }

  const handleConfirmarPago = () => {
    onMarcarPago()
    setShowConfirm(false)
    addToast({ message: 'Pagamento registrado!', type: 'success' })
  }

  const handleSaveEdit = () => {
    if (!onEdit) return
    const valorNum = editValor.replace(',', '.')
    onEdit(nota.id, { descricao: editDescricao, valor: valorNum, data_vencimento: editVencimento })
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
      <div className="px-3 py-3">
        {/* Row 1: Avatar + Name + Edit pill */}
        <div className="flex items-center gap-2.5">
          {showAvatar && (
            <div className="h-9 w-9 rounded-full bg-black text-white flex items-center justify-center text-xs font-semibold shrink-0">
              {(cliente.nome?.[0] || 'C').toUpperCase()}
            </div>
          )}
          <p className="text-sm font-semibold text-text-primary truncate flex-1">
            {displayName}
          </p>
          {(onEdit || onDelete) && (
            <button
              onClick={() => setShowEditSheet(true)}
              className="shrink-0 px-2.5 py-1 rounded-full bg-black/5 text-[11px] font-medium text-text-secondary hover:bg-black/10 transition-colors"
            >
              Editar
            </button>
          )}
        </div>

        {/* Row 2: Value + Status */}
        <p className="text-sm text-text-secondary mt-1">
          {formatCurrencyShort(Number(nota.valor))} · {getStatusText()}
        </p>

        {/* Row 3: Last action */}
        {ultimaAcao && (
          <p className="text-xs text-text-secondary mt-1.5 flex items-center gap-1.5">
            {(() => {
              const AcaoIcon = getAcaoIcon(ultimaAcao.tipo)
              return <AcaoIcon className="h-3.5 w-3.5 shrink-0" />
            })()}
            <span>{getAcaoText(ultimaAcao.tipo)} · {formatAcaoTime(ultimaAcao.created_at)}</span>
          </p>
        )}

        {/* Row 4: Action buttons */}
        {nota.status !== 'pago' && (
          <div className="flex gap-2 mt-2.5">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowConfirm(true)}
              className="flex-1"
            >
              Marcar como pago
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={onCobrar}
              className="flex-1 gap-1.5"
            >
              <WhatsAppIcon className="h-3.5 w-3.5" />
              Cobrar
            </Button>
          </div>
        )}
      </div>

      {/* Payment confirmation modal */}
      <Modal open={showConfirm} onClose={() => setShowConfirm(false)}>
        <h3 className="text-lg font-semibold mb-2 text-text-primary">Confirmar pagamento?</h3>
        <p className="text-sm text-text-secondary mb-6">
          {displayName} · {formatCurrencyShort(Number(nota.valor))}
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => setShowConfirm(false)}>
            Cancelar
          </Button>
          <Button className="flex-1" onClick={handleConfirmarPago}>
            Confirmar
          </Button>
        </div>
      </Modal>

      {/* Edit BottomSheet */}
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

      {/* Delete confirmation modal */}
      <Modal open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)}>
        <h3 className="text-lg font-semibold mb-2 text-text-primary">Excluir nota?</h3>
        <p className="text-sm text-text-secondary mb-6">Esta ação não pode ser desfeita.</p>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => setShowDeleteConfirm(false)}>
            Cancelar
          </Button>
          <Button className="flex-1 !bg-red-500 !text-white" onClick={handleDeleteNota}>
            Excluir
          </Button>
        </div>
      </Modal>
    </>
  )
}
