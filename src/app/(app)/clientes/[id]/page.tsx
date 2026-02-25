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
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Modal } from '@/components/ui/modal'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { CobrarSheet } from '@/components/cobrancas/cobrar-sheet'
import { NotaCard } from '@/components/notas/nota-card'
import { PhoneInput } from '@/components/ui/phone-input'
import { ArrowLeftIcon, CheckIcon, PencilIcon } from '@heroicons/react/24/solid'
import { formatCurrencyShort, formatRelativeDate } from '@/lib/format'
import type { Cliente, Nota, NotaComCliente } from '@/types/database'

interface NotaComUltimaAcao extends Nota {
  ultimaAcao?: {
    tipo: string
    created_at: string
  } | null
}

export default function ClienteDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const profile = useAuthStore((s) => s.profile)
  const addToast = useUIStore((s) => s.addToast)

  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [pendentes, setPendentes] = useState<NotaComUltimaAcao[]>([])
  const [pagas, setPagas] = useState<Nota[]>([])
  const [loading, setLoading] = useState(true)
  const [cobrarNotas, setCobrarNotas] = useState<NotaComCliente[]>([])
  const [showWizard, setShowWizard] = useState(false)

  // Client edit state
  const [showEditCliente, setShowEditCliente] = useState(false)
  const [editNome, setEditNome] = useState('')
  const [editApelido, setEditApelido] = useState('')
  const [editTelefone, setEditTelefone] = useState('')
  const [showDeleteCliente, setShowDeleteCliente] = useState(false)

  const totalPendente = pendentes.reduce((acc, n) => acc + Number(n.valor), 0)
  const totalPago = pagas.reduce((acc, n) => acc + Number(n.valor), 0)

  const fetchData = useCallback(async () => {
    if (!profile) return
    try {
      setLoading(true)
      const supabase = createClient()

      const { data: clienteData, error: clienteError } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', id)
        .single()

      if (clienteError) throw clienteError
      setCliente(clienteData)

      const { data: pendentesData } = await supabase
        .from('notas')
        .select(`
          *,
          eventos:eventos(tipo, created_at)
        `)
        .eq('cliente_id', id)
        .eq('status', 'pendente')
        .order('data_vencimento', { ascending: true })

      // Also fetch cobrancas for these notes
      const pendentesIds = (pendentesData || []).map((n: any) => n.id)
      let cobrancasMap = new Map<string, { tipo: string; created_at: string }>()
      if (pendentesIds.length > 0) {
        const { data: cobrancasData } = await supabase
          .from('cobrancas')
          .select('nota_id, enviado_em')
          .in('nota_id', pendentesIds)
          .order('enviado_em', { ascending: false })

          ; (cobrancasData || []).forEach((c: any) => {
            if (!cobrancasMap.has(c.nota_id)) {
              cobrancasMap.set(c.nota_id, {
                tipo: 'lembrete_enviado',
                created_at: c.enviado_em,
              })
            }
          })
      }

      const pendentesComAcao = (pendentesData || []).map((nota: any) => {
        const eventos = nota.eventos || []
        // Merge cobrancas as events
        const cobranca = cobrancasMap.get(nota.id)
        const allEvents = cobranca ? [...eventos, cobranca] : eventos
        const ultimaAcao = allEvents.length > 0
          ? allEvents.sort((a: any, b: any) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )[0]
          : null
        return { ...nota, ultimaAcao }
      })

      setPendentes(pendentesComAcao)

      const { data: pagasData } = await supabase
        .from('notas')
        .select('*')
        .eq('cliente_id', id)
        .eq('status', 'pago')
        .order('data_pagamento', { ascending: false })

      setPagas(pagasData || [])
    } catch {
      addToast({ message: 'Erro ao carregar cliente', type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [id, profile, addToast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Realtime subscription
  useEffect(() => {
    if (!profile) return
    const supabase = createClient()
    const channel = supabase
      .channel(`cliente-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notas', filter: `cliente_id=eq.${id}` }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'eventos', filter: `cliente_id=eq.${id}` }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cobrancas', filter: `cliente_id=eq.${id}` }, () => fetchData())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [profile, id, fetchData])

  const handleMarcarPago = useCallback(async (nota: Nota) => {
    if (!profile) return
    try {
      const supabase = createClient()
      await supabase
        .from('notas')
        .update({ status: 'pago', data_pagamento: new Date().toISOString() })
        .eq('id', nota.id)

      await supabase.from('eventos').insert({
        nota_id: nota.id,
        cliente_id: id,
        user_id: profile.id,
        tipo: 'marcou_pago',
      })

      addToast({
        message: 'Pagamento registrado!',
        type: 'success',
        action: {
          label: 'Desfazer',
          onClick: async () => {
            await supabase
              .from('notas')
              .update({ status: 'pendente', data_pagamento: null })
              .eq('id', nota.id)
            await supabase.from('eventos').insert({
              nota_id: nota.id,
              cliente_id: id,
              user_id: profile.id,
              tipo: 'desfez_pago',
            })
            fetchData()
          },
        },
      })

      fetchData()
    } catch {
      addToast({ message: 'Erro ao atualizar', type: 'error' })
    }
  }, [profile, id, addToast, fetchData])

  const handleEditNota = useCallback(async (notaId: string, data: { descricao: string; valor: string; data_vencimento: string }) => {
    if (!profile) return
    try {
      const supabase = createClient()
      await supabase
        .from('notas')
        .update({
          descricao: data.descricao || null,
          valor: parseFloat(data.valor) || 0,
          data_vencimento: data.data_vencimento || null,
        })
        .eq('id', notaId)
      fetchData()
    } catch {
      addToast({ message: 'Erro ao atualizar nota', type: 'error' })
    }
  }, [profile, addToast, fetchData])

  const handleDeleteNota = useCallback(async (notaId: string) => {
    if (!profile) return
    try {
      const supabase = createClient()
      await supabase.from('notas').delete().eq('id', notaId)
      fetchData()
    } catch {
      addToast({ message: 'Erro ao excluir nota', type: 'error' })
    }
  }, [profile, addToast, fetchData])

  const handleEditCliente = async () => {
    if (!profile || !cliente) return
    try {
      const supabase = createClient()
      await supabase
        .from('clientes')
        .update({
          nome: editNome,
          apelido: editApelido || null,
          telefone: editTelefone,
        })
        .eq('id', cliente.id)
      setShowEditCliente(false)
      addToast({ message: 'Cliente atualizado', type: 'success' })
      fetchData()
    } catch {
      addToast({ message: 'Erro ao atualizar cliente', type: 'error' })
    }
  }

  const handleDeleteCliente = async () => {
    if (!profile || !cliente) return
    try {
      const supabase = createClient()
      await supabase
        .from('clientes')
        .update({ ativo: false })
        .eq('id', cliente.id)
      setShowDeleteCliente(false)
      addToast({ message: 'Cliente excluído', type: 'info' })
      router.push('/clientes')
    } catch {
      addToast({ message: 'Erro ao excluir cliente', type: 'error' })
    }
  }

  const openEditCliente = () => {
    if (!cliente) return
    setEditNome(cliente.nome)
    setEditApelido(cliente.apelido || '')
    setEditTelefone(cliente.telefone)
    setShowEditCliente(true)
  }

  const notaToComCliente = useCallback((nota: Nota): NotaComCliente => {
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
      status: nota.status as 'pendente' | 'pago',
      vezes_cobrado: nota.vezes_cobrado,
      cliente_id: id,
      cliente_nome: cliente?.nome || '',
      apelido: cliente?.apelido || null,
      cliente_telefone: cliente?.telefone || '',
      dias_atraso: diasAtraso > 0 ? diasAtraso : undefined,
    }
  }, [cliente, id])

  const handleCobrarTudo = useCallback(() => {
    const notasPendentes = pendentes.map(notaToComCliente)
    if (notasPendentes.length > 0) {
      setCobrarNotas(notasPendentes)
    }
  }, [pendentes, notaToComCliente])

  const temVencida = pendentes.some(n => {
    if (!n.data_vencimento) return false
    return new Date(n.data_vencimento + 'T00:00:00') < new Date()
  })

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

  return (
    <PageTransition>
      <div className="p-6 lg:px-0 lg:py-8">
        {/* Header */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-sm text-[#6B7280] mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Clientes
        </button>

        <div className="flex items-center gap-2">
          <h1 className="text-xl lg:text-2xl font-semibold text-[#02090A] flex-1">{cliente.nome}</h1>
          <button
            onClick={openEditCliente}
            className="shrink-0 px-2.5 py-1 rounded-full bg-black/5 text-[11px] font-medium text-text-secondary hover:bg-black/10 transition-colors"
          >
            Editar
          </button>
        </div>
        {cliente.apelido && (
          <p className="text-sm text-[#6B7280]">{cliente.apelido}</p>
        )}

        {/* Totais */}
        <Card className="flex mt-4">
          <div className="flex-1 pr-4 border-r border-[#E5E5E5]">
            <p className="text-xs text-[#9CA3AF]">Deve</p>
            <p className="text-2xl font-bold text-[#02090A]">{formatCurrencyShort(totalPendente)}</p>
          </div>
          <div className="flex-1 pl-4">
            <p className="text-xs text-[#9CA3AF]">Já pagou</p>
            <p className="text-2xl font-bold text-[#02090A]">{formatCurrencyShort(totalPago)}</p>
          </div>
        </Card>

        {/* Botões */}
        <div className="flex gap-3 mt-4">
          <Button
            variant="secondary"
            className="flex-1 rounded-full"
            onClick={() => setShowWizard(true)}
          >
            Nova venda
          </Button>
          <Button
            variant="secondary"
            className="flex-1 rounded-full"
            onClick={handleCobrarTudo}
            disabled={pendentes.length === 0}
          >
            Cobrar tudo
          </Button>
        </div>

        <div className="lg:grid lg:grid-cols-3 lg:gap-8">

          {/* Seção Pendentes */}
          {pendentes.length > 0 && (
            <section className="mt-8">
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-2 h-2 rounded-full ${temVencida ? 'bg-[#EF4444]' : 'bg-[#EAB308]'}`} />
                <h3 className="text-sm font-semibold text-[#02090A]">
                  Pendentes · {pendentes.length}
                </h3>
              </div>
              <div className="space-y-3">
                {pendentes.map((nota: any) => (
                  <Card key={nota.id}>
                    <NotaCard
                      nota={{
                        ...nota,
                        status: nota.status as 'pendente' | 'pago',
                      }}
                      cliente={{
                        id: cliente.id,
                        nome: cliente.nome,
                        apelido: cliente.apelido,
                        telefone: cliente.telefone,
                      }}
                      ultimaAcao={nota.ultimaAcao}
                      showAvatar={false}
                      onCobrar={() => setCobrarNotas([notaToComCliente(nota)])}
                      onMarcarPago={() => handleMarcarPago(nota)}
                      onEdit={handleEditNota}
                      onDelete={handleDeleteNota}
                    />
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Seção Pagas */}
          {pagas.length > 0 && (
            <section className="mt-8">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-[#22C55E]" />
                <h3 className="text-sm font-semibold text-[#02090A]">
                  Pagas · {pagas.length}
                </h3>
              </div>
              <Card className="divide-y divide-[#E5E5E5]">
                {pagas.map((nota) => (
                  <div key={nota.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-[#02090A]">
                          {nota.descricao || 'Compra'}
                        </p>
                        <p className="text-sm text-[#6B7280]">
                          {formatCurrencyShort(Number(nota.valor))} · Pago {nota.data_pagamento ? formatRelativeDate(nota.data_pagamento.split('T')[0]) : ''}
                        </p>
                      </div>
                      <CheckIcon className="h-4 w-4 text-green-500" />
                    </div>
                  </div>
                ))}
              </Card>
            </section>
          )}
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

      {/* Edit Client BottomSheet */}
      <BottomSheet open={showEditCliente} onClose={() => setShowEditCliente(false)}>
        <h3 className="text-lg font-semibold mb-4">Editar cliente</h3>
        <div className="space-y-4">
          <Input
            label="Nome"
            value={editNome}
            onChange={(e) => setEditNome(e.target.value)}
            placeholder="Nome do cliente"
          />
          <Input
            label="Apelido (opcional)"
            value={editApelido}
            onChange={(e) => setEditApelido(e.target.value)}
            placeholder="Como você chama ele/a"
          />
          <PhoneInput
            label="Telefone"
            value={editTelefone}
            onChange={setEditTelefone}
          />
        </div>
        <Button onClick={handleEditCliente} className="w-full mt-6">
          Salvar alterações
        </Button>
        <button
          onClick={() => setShowDeleteCliente(true)}
          className="w-full mt-3 h-12 text-sm font-medium text-red-500"
        >
          Excluir cliente
        </button>
      </BottomSheet>

      {/* Delete Client Confirmation */}
      <Modal open={showDeleteCliente} onClose={() => setShowDeleteCliente(false)}>
        <h3 className="text-lg font-semibold mb-2 text-text-primary">Excluir cliente?</h3>
        <p className="text-sm text-text-secondary mb-6">
          O cliente será removido da sua lista. As notas serão mantidas.
        </p>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => setShowDeleteCliente(false)}
          >
            Cancelar
          </Button>
          <Button
            className="flex-1 !bg-red-500 !text-white"
            onClick={handleDeleteCliente}
          >
            Excluir
          </Button>
        </div>
      </Modal>
    </PageTransition>
  )
}

import dynamic from 'next/dynamic'
const WizardVenda = dynamic(
  () => import('@/components/vendas/wizard-venda').then((mod) => mod.WizardVenda),
  { ssr: false }
)
