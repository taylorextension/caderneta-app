'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { useUIStore } from '@/stores/ui-store'
import { PageTransition } from '@/components/layout/page-transition'
import { FAB } from '@/components/layout/fab'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Skeleton } from '@/components/ui/skeleton'
import { CobrarSheet } from '@/components/cobrancas/cobrar-sheet'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { formatCurrencyShort, formatRelativeDate } from '@/lib/format'
import type { Cliente, Nota, Cobranca, Evento, NotaComCliente } from '@/types/database'

interface TimelineEntry {
  date: string
  items: TimelineItem[]
}

type TimelineItem =
  | { type: 'nota'; data: Nota }
  | { type: 'cobranca'; data: Cobranca }
  | { type: 'evento'; data: Evento }
  | { type: 'pagamento'; data: Nota }

export default function ClienteDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const profile = useAuthStore((s) => s.profile)
  const addToast = useUIStore((s) => s.addToast)

  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [notas, setNotas] = useState<Nota[]>([])
  const [cobrancas, setCobrancas] = useState<Cobranca[]>([])
  const [eventos, setEventos] = useState<Evento[]>([])
  const [loading, setLoading] = useState(true)
  const [cobrarNotas, setCobrarNotas] = useState<NotaComCliente[]>([])
  const [showWizard, setShowWizard] = useState(false)
  const [confirmPago, setConfirmPago] = useState<Nota | null>(null)

  const totalPendente = notas
    .filter((n) => n.status === 'pendente')
    .reduce((acc, n) => acc + Number(n.valor), 0)
  const totalPago = notas
    .filter((n) => n.status === 'pago')
    .reduce((acc, n) => acc + Number(n.valor), 0)

  const fetchData = useCallback(async () => {
    if (!profile) return
    try {
      setLoading(true)
      const supabase = createClient()

      const [clienteRes, notasRes, cobrancasRes, eventosRes] = await Promise.all([
        supabase.from('clientes').select('*').eq('id', id).single(),
        supabase
          .from('notas')
          .select('*')
          .eq('cliente_id', id)
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('cobrancas')
          .select('*')
          .eq('cliente_id', id)
          .eq('user_id', profile.id)
          .order('enviado_em', { ascending: false }),
        supabase
          .from('eventos')
          .select('*')
          .eq('cliente_id', id)
          .order('created_at', { ascending: false }),
      ])

      if (clienteRes.error) throw clienteRes.error
      setCliente(clienteRes.data)
      setNotas(notasRes.data || [])
      setCobrancas(cobrancasRes.data || [])
      setEventos(eventosRes.data || [])
    } catch {
      addToast({ message: 'Erro ao carregar cliente', type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [id, profile, addToast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  function buildTimeline(): TimelineEntry[] {
    const all: { date: string; timestamp: number; item: TimelineItem }[] = []

    notas.forEach((n) => {
      all.push({
        date: n.created_at.split('T')[0],
        timestamp: new Date(n.created_at).getTime(),
        item: { type: 'nota', data: n },
      })

      if (n.status === 'pago' && n.data_pagamento) {
        all.push({
          date: n.data_pagamento.split('T')[0],
          timestamp: new Date(n.data_pagamento).getTime(),
          item: { type: 'pagamento', data: n },
        })
      }
    })

    cobrancas.forEach((c) => {
      all.push({
        date: c.enviado_em.split('T')[0],
        timestamp: new Date(c.enviado_em).getTime(),
        item: { type: 'cobranca', data: c },
      })
    })

    eventos.forEach((e) => {
      all.push({
        date: e.created_at.split('T')[0],
        timestamp: new Date(e.created_at).getTime(),
        item: { type: 'evento', data: e },
      })
    })

    all.sort((a, b) => b.timestamp - a.timestamp)

    const grouped = new Map<string, TimelineItem[]>()
    all.forEach(({ date, item }) => {
      const items = grouped.get(date) || []
      items.push(item)
      grouped.set(date, items)
    })

    return Array.from(grouped.entries()).map(([date, items]) => ({ date, items }))
  }

  async function handleMarcarPago(nota: Nota) {
    try {
      const supabase = createClient()
      await supabase
        .from('notas')
        .update({ status: 'pago', data_pagamento: new Date().toISOString() })
        .eq('id', nota.id)

      if (profile) {
        await supabase.from('eventos').insert({
          nota_id: nota.id,
          cliente_id: id,
          user_id: profile.id,
          tipo: 'marcou_pago',
        })
      }

      setConfirmPago(null)
      addToast({
        message: 'Marcado como pago',
        type: 'success',
        action: {
          label: 'Desfazer',
          onClick: async () => {
            await supabase
              .from('notas')
              .update({ status: 'pendente', data_pagamento: null })
              .eq('id', nota.id)
            if (profile) {
              await supabase.from('eventos').insert({
                nota_id: nota.id,
                cliente_id: id,
                user_id: profile.id,
                tipo: 'desfez_pago',
              })
            }
            fetchData()
          },
        },
      })
      fetchData()
    } catch {
      addToast({ message: 'Erro ao atualizar', type: 'error' })
    }
  }

  function notaToComCliente(nota: Nota): NotaComCliente {
    const hoje = new Date()
    const venc = nota.data_vencimento
      ? new Date(nota.data_vencimento + 'T00:00:00')
      : null
    const diasAtraso = venc
      ? Math.floor((hoje.getTime() - venc.getTime()) / 86400000)
      : 0

    return {
      id: nota.id,
      valor: Number(nota.valor),
      data_vencimento: nota.data_vencimento || '',
      itens: nota.itens,
      descricao: nota.descricao,
      vezes_cobrado: nota.vezes_cobrado,
      cliente_id: id,
      cliente_nome: cliente?.nome || '',
      apelido: cliente?.apelido || null,
      cliente_telefone: cliente?.telefone || '',
      dias_atraso: diasAtraso > 0 ? diasAtraso : undefined,
    }
  }

  function handleCobrarTudo() {
    const pendentes = notas
      .filter((n) => n.status === 'pendente')
      .map(notaToComCliente)
    if (pendentes.length > 0) {
      setCobrarNotas(pendentes)
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-20 w-full mt-4" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (!cliente) return null

  const timeline = buildTimeline()

  return (
    <PageTransition>
      <div className="p-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-sm text-text-secondary mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Clientes
        </button>

        <h1 className="text-xl font-semibold">{cliente.nome}</h1>
        {cliente.apelido && (
          <p className="text-sm text-text-secondary">{cliente.apelido}</p>
        )}

        <Card className="flex mt-4">
          <div className="flex-1 pr-4 border-r border-divider">
            <p className="text-xs text-text-muted">Deve</p>
            <p className="text-2xl font-bold">{formatCurrencyShort(totalPendente)}</p>
          </div>
          <div className="flex-1 pl-4">
            <p className="text-xs text-text-muted">Já pagou</p>
            <p className="text-2xl font-bold">{formatCurrencyShort(totalPago)}</p>
          </div>
        </Card>

        <div className="flex gap-3 mt-4">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => setShowWizard(true)}
          >
            Nova venda
          </Button>
          <Button
            variant="secondary"
            className="flex-1"
            onClick={handleCobrarTudo}
            disabled={totalPendente === 0}
          >
            Cobrar tudo
          </Button>
        </div>

        {/* Lista de notas organizada por status */}
        <div className="mt-8 space-y-6">
          <NotasList
            notas={notas}
            cliente={cliente}
            onCobrar={(nota) => setCobrarNotas([notaToComCliente(nota)])}
            onPago={(nota) => setConfirmPago(nota)}
          />
        </div>

        {/* Timeline de eventos (opcional, colapsada) */}
        <EventosTimeline eventos={eventos} cobrancas={cobrancas} />
      </div>

      <FAB onClick={() => setShowWizard(true)} />

      <CobrarSheet
        open={cobrarNotas.length > 0}
        onClose={() => {
          setCobrarNotas([])
          fetchData()
        }}
        notas={cobrarNotas}
      />

      <Modal open={!!confirmPago} onClose={() => setConfirmPago(null)}>
        <h3 className="text-lg font-semibold mb-2">Confirmar pagamento</h3>
        <p className="text-sm text-text-secondary mb-6">
          Marcar {confirmPago ? formatCurrencyShort(Number(confirmPago.valor)) : ''} como
          pago?
        </p>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => setConfirmPago(null)}
          >
            Cancelar
          </Button>
          <Button
            className="flex-1"
            onClick={() => confirmPago && handleMarcarPago(confirmPago)}
          >
            Confirmar
          </Button>
        </div>
      </Modal>

      {showWizard && (
        <WizardVenda
          open={showWizard}
          onClose={() => {
            setShowWizard(false)
            fetchData()
          }}
          preselectedClienteId={id}
        />
      )}
    </PageTransition>
  )
}

function formatEventTime(dateTime?: string | null) {
  if (!dateTime) return ''
  return new Date(dateTime).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Novos componentes de UI

interface NotasListProps {
  notas: Nota[]
  cliente: Cliente | null
  onCobrar: (nota: Nota) => void
  onPago: (nota: Nota) => void
}

function NotasList({ notas, cliente, onCobrar, onPago }: NotasListProps) {
  const hoje = new Date()
  
  // Separa notas por status
  const vencidas = notas.filter(n => {
    if (n.status === 'pago') return false
    if (!n.data_vencimento) return false
    return new Date(n.data_vencimento + 'T00:00:00') < hoje
  })
  
  const venceEmBreve = notas.filter(n => {
    if (n.status === 'pago') return false
    if (!n.data_vencimento) return true // Sem vencimento = vence em breve
    const venc = new Date(n.data_vencimento + 'T00:00:00')
    const diff = Math.floor((venc.getTime() - hoje.getTime()) / 86400000)
    return diff >= 0 && diff <= 7
  })
  
  const pagas = notas.filter(n => n.status === 'pago')
  const semVencimento = notas.filter(n => {
    if (n.status === 'pago') return false
    return !n.data_vencimento
  })

  return (
    <div className="space-y-6">
      {/* Vencidas */}
      {vencidas.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-error" />
            <h3 className="text-sm font-semibold text-text-primary">
              Vencidas · {vencidas.length}
            </h3>
          </div>
          <Card className="divide-y divide-divider">
            {vencidas.map((nota) => (
              <NotaItem
                key={nota.id}
                nota={nota}
                cliente={cliente}
                status="vencida"
                onCobrar={() => onCobrar(nota)}
                onPago={() => onPago(nota)}
              />
            ))}
          </Card>
        </section>
      )}

      {/* Vence em breve */}
      {venceEmBreve.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-warning" />
            <h3 className="text-sm font-semibold text-text-primary">
              Vence em breve · {venceEmBreve.length}
            </h3>
          </div>
          <Card className="divide-y divide-divider">
            {venceEmBreve.map((nota) => (
              <NotaItem
                key={nota.id}
                nota={nota}
                cliente={cliente}
                status="breve"
                onCobrar={() => onCobrar(nota)}
                onPago={() => onPago(nota)}
              />
            ))}
          </Card>
        </section>
      )}

      {/* Pagas */}
      {pagas.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-success" />
            <h3 className="text-sm font-semibold text-text-primary">
              Pagas · {pagas.length}
            </h3>
          </div>
          <Card className="divide-y divide-divider">
            {pagas.map((nota) => (
              <NotaItem
                key={nota.id}
                nota={nota}
                cliente={cliente}
                status="paga"
                onCobrar={() => {}}
                onPago={() => {}}
              />
            ))}
          </Card>
        </section>
      )}
    </div>
  )
}

interface NotaItemProps {
  nota: Nota
  cliente: Cliente | null
  status: 'vencida' | 'breve' | 'paga'
  onCobrar: () => void
  onPago: () => void
}

function NotaItem({ nota, cliente, status, onCobrar, onPago }: NotaItemProps) {
  const getDataText = () => {
    if (status === 'paga') {
      return 'Pago' + (nota.data_pagamento ? ` · ${formatRelativeDate(nota.data_pagamento.split('T')[0])}` : '')
    }
    if (!nota.data_vencimento) return 'Sem vencimento'
    return formatRelativeDate(nota.data_vencimento)
  }

  return (
    <div className="flex items-center gap-3 p-4">
      {/* Avatar */}
      <div className="h-10 w-10 rounded-full bg-black text-white flex items-center justify-center text-sm font-medium shrink-0">
        {(cliente?.nome?.[0] || 'C').toUpperCase()}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">
          {nota.descricao || 'Compra'}
        </p>
        <p className="text-sm text-text-secondary">
          {formatCurrencyShort(Number(nota.valor))} · {getDataText()}
        </p>
      </div>

      {/* Ações */}
      {status !== 'paga' ? (
        <div className="flex items-center gap-2">
          <button
            onClick={onCobrar}
            className="text-sm font-medium text-text-primary hover:text-black transition-colors"
          >
            Cobrar →
          </button>
        </div>
      ) : (
        <span className="text-sm text-success font-medium">✓</span>
      )}
    </div>
  )
}

interface EventosTimelineProps {
  eventos: Evento[]
  cobrancas: Cobranca[]
}

function EventosTimeline({ eventos, cobrancas }: EventosTimelineProps) {
  const [expandido, setExpandido] = useState(false)
  
  if (eventos.length === 0 && cobrancas.length === 0) return null

  const labels: Record<string, string> = {
    link_aberto: 'Abriu o link',
    pix_copiado: 'Copiou o Pix',
    marcou_pago: 'Marcado como pago',
    desfez_pago: 'Pagamento desfeito',
  }

  return (
    <div className="mt-8">
      <button
        onClick={() => setExpandido(!expandido)}
        className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
      >
        <span>{expandido ? '▼' : '▶'}</span>
        Histórico de eventos ({eventos.length + cobrancas.length})
      </button>
      
      {expandido && (
        <div className="mt-3 space-y-2 pl-4">
          {cobrancas.map((cob) => (
            <p key={cob.id} className="text-xs text-text-muted">
              Lembrete enviado · {formatEventTime(cob.enviado_em)}
            </p>
          ))}
          {eventos.map((ev) => (
            <p key={ev.id} className="text-xs text-text-muted">
              {labels[ev.tipo] || ev.tipo} · {formatEventTime(ev.created_at)}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}

import dynamic from 'next/dynamic'
const WizardVenda = dynamic(
  () => import('@/components/vendas/wizard-venda').then((mod) => mod.WizardVenda),
  { ssr: false }
)
