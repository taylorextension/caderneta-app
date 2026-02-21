import { useState } from 'react'
import { formatCurrencyShort, formatRelativeDate } from '@/lib/format'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { useUIStore } from '@/stores/ui-store'

interface Evento {
  id: string
  tipo: string
  created_at: string
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
  eventos?: Evento[]
  showAvatar?: boolean
  onCobrar: () => void
  onMarcarPago: () => void
}

export function NotaCard({
  nota,
  cliente,
  eventos = [],
  showAvatar = true,
  onCobrar,
  onMarcarPago,
}: NotaCardProps) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [showHistorico, setShowHistorico] = useState(false)
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

  const getAcaoIcon = (tipo: string) => {
    const icons: Record<string, string> = {
      lembrete_enviado: '📤',
      link_aberto: '👀',
      pix_copiado: '📋',
      marcou_pago: '✓',
      desfez_pago: '↩',
    }
    return icons[tipo] || '📌'
  }

  const getAcaoText = (tipo: string) => {
    const labels: Record<string, string> = {
      lembrete_enviado: 'Lembrete enviado',
      link_aberto: 'Abriu o link',
      pix_copiado: 'Copiou o Pix',
      marcou_pago: 'Marcado como pago',
      desfez_pago: 'Pagamento desfeito',
    }
    return labels[tipo] || tipo
  }

  const formatEventoHora = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  // Agrupa eventos por dia
  const eventosPorDia = eventos.reduce((acc, evento) => {
    const data = evento.created_at.split('T')[0]
    if (!acc[data]) acc[data] = []
    acc[data].push(evento)
    return acc
  }, {} as Record<string, Evento[]>)

  // Ordena dias (mais recente primeiro)
  const diasOrdenados = Object.keys(eventosPorDia).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  )

  const handleConfirmarPago = () => {
    onMarcarPago()
    setShowConfirm(false)
    addToast({
      message: 'Pagamento registrado!',
      type: 'success',
    })
  }

  const displayName = cliente.apelido || cliente.nome

  return (
    <>
      <div className="bg-white border border-zinc-200 rounded-none p-4">
        {/* Linha 1: Avatar + Nome */}
        <div className="flex items-center gap-3">
          {showAvatar && (
            <div className="h-10 w-10 rounded-full bg-black text-white flex items-center justify-center text-sm font-semibold shrink-0">
              {(cliente.nome?.[0] || 'C').toUpperCase()}
            </div>
          )}
          <p className="text-sm font-semibold text-[#02090A] truncate">
            {displayName}
          </p>
        </div>

        {/* Linha 2: Valor + Status */}
        <p className="text-sm text-[#6B7280] mt-1">
          {formatCurrencyShort(Number(nota.valor))} · {getStatusText()}
        </p>

        {/* Linha 3: Botões lado a lado */}
        {nota.status !== 'pago' && (
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => setShowConfirm(true)}
              className="flex-1 h-10 rounded-full bg-white border border-zinc-300 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
            >
              Pago ✓
            </button>
            <button
              onClick={onCobrar}
              className="flex-1 h-10 rounded-full bg-black text-white text-sm font-medium hover:bg-zinc-800 transition-colors"
            >
              Cobrar →
            </button>
          </div>
        )}

        {/* Linha 4: Toggle histórico */}
        {eventos.length > 0 && (
          <button
            onClick={() => setShowHistorico(!showHistorico)}
            className="text-xs text-[#6B7280] mt-3 flex items-center gap-1 hover:text-[#02090A] transition-colors"
          >
            <span>{showHistorico ? '▲' : '▼'}</span>
            Histórico ({eventos.length})
          </button>
        )}

        {/* Histórico expandido */}
        {showHistorico && eventos.length > 0 && (
          <div className="mt-3 space-y-3">
            {diasOrdenados.map((dia) => (
              <div key={dia}>
                <p className="text-xs text-[#9CA3AF] mb-1">
                  {formatRelativeDate(dia)}
                </p>
                <div className="space-y-1">
                  {eventosPorDia[dia]
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .map((evento) => (
                      <p key={evento.id} className="text-xs text-[#6B7280] flex items-center gap-1">
                        <span>{getAcaoIcon(evento.tipo)}</span>
                        <span>{getAcaoText(evento.tipo)} · {formatEventoHora(evento.created_at)}</span>
                      </p>
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de confirmação */}
      <Modal open={showConfirm} onClose={() => setShowConfirm(false)}>
        <h3 className="text-lg font-semibold mb-2 text-[#02090A]">Confirmar pagamento?</h3>
        <p className="text-sm text-[#6B7280] mb-6">
          {displayName} · {formatCurrencyShort(Number(nota.valor))}
        </p>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            className="flex-1 h-10 rounded-full"
            onClick={() => setShowConfirm(false)}
          >
            Cancelar
          </Button>
          <Button
            className="flex-1 h-10 rounded-full bg-black text-white"
            onClick={handleConfirmarPago}
          >
            Confirmar ✓
          </Button>
        </div>
      </Modal>
    </>
  )
}
