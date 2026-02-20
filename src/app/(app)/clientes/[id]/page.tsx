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

        <div className="mt-8 space-y-6">
          {timeline.map((entry) => (
            <section key={entry.date}>
              <p className="text-xs text-text-muted mb-3">
                {formatRelativeDate(entry.date)}
              </p>
              <div className="space-y-3">
                {entry.items.map((item, i) => (
                  <TimelineItemComponent
                    key={i}
                    item={item}
                    onCobrar={(nota) => setCobrarNotas([notaToComCliente(nota)])}
                    onPago={(nota) => setConfirmPago(nota)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
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

function TimelineItemComponent({
  item,
  onCobrar,
  onPago,
}: {
  item: TimelineItem
  onCobrar: (nota: Nota) => void
  onPago: (nota: Nota) => void
}) {
  if (item.type === 'nota' && item.data.status !== 'pago') {
    const nota = item.data as Nota
    const vencido =
      nota.data_vencimento &&
      new Date(nota.data_vencimento + 'T00:00:00') < new Date()

    return (
      <div>
        <p className="text-sm font-medium text-text-primary">
          Comprou {formatCurrencyShort(Number(nota.valor))}
        </p>
        {nota.descricao && (
          <p className="text-sm text-text-secondary">{nota.descricao}</p>
        )}
        {nota.data_vencimento && (
          <p className={`text-xs ${vencido ? 'text-error' : 'text-text-muted'}`}>
            {vencido ? 'Venceu' : 'Vence'} {formatRelativeDate(nota.data_vencimento)}
          </p>
        )}
        <div className="flex gap-2 mt-2">
          <Button variant="secondary" className="h-9 text-xs" onClick={() => onCobrar(nota)}>
            Cobrar
          </Button>
          <Button variant="secondary" className="h-9 text-xs" onClick={() => onPago(nota)}>
            Pago ✓
          </Button>
        </div>
      </div>
    )
  }

  if (item.type === 'pagamento') {
    const nota = item.data as Nota
    return (
      <p className="text-sm text-success font-medium">
        Pagou {formatCurrencyShort(Number(nota.valor))} ✓
      </p>
    )
  }

  if (item.type === 'cobranca') {
    const cob = item.data as Cobranca
    return (
      <p className="text-sm text-text-secondary">
        Lembrete enviado · {formatEventTime(cob.enviado_em)}
      </p>
    )
  }

  if (item.type === 'evento') {
    const ev = item.data as Evento
    const labels: Record<string, string> = {
      link_aberto: 'Abriu o link',
      pix_copiado: 'Copiou o Pix',
      marcou_pago: 'Marcado como pago',
      desfez_pago: 'Pagamento desfeito',
    }

    return (
      <p className="text-sm text-text-secondary ml-4">
        {labels[ev.tipo] || ev.tipo} · {formatEventTime(ev.created_at)}
      </p>
    )
  }

  return null
}

import dynamic from 'next/dynamic'
const WizardVenda = dynamic(
  () => import('@/components/vendas/wizard-venda').then((mod) => mod.WizardVenda),
  { ssr: false }
)
