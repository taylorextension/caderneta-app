'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { useUIStore } from '@/stores/ui-store'
import { PageTransition } from '@/components/layout/page-transition'
import { FAB } from '@/components/layout/fab'
import { StatsBar } from '@/components/inicio/stats-bar'
import { NotaCard } from '@/components/notas/nota-card'
import { CobrarSheet } from '@/components/cobrancas/cobrar-sheet'
import { WizardVenda } from '@/components/vendas/wizard-venda'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { formatCurrencyShort } from '@/lib/format'
import { ShoppingBagIcon } from '@heroicons/react/24/outline'
import type { InicioData, NotaComCliente } from '@/types/database'

export default function InicioPage() {
  const profile = useAuthStore((s) => s.profile)
  const addToast = useUIStore((s) => s.addToast)
  const [data, setData] = useState<InicioData | null>(null)
  const [ultimasAcoes, setUltimasAcoes] = useState<Map<string, { tipo: string; created_at: string }>>(new Map())
  const [loading, setLoading] = useState(true)
  const [cobrarNotas, setCobrarNotas] = useState<NotaComCliente[]>([])
  const [showWizard, setShowWizard] = useState(false)

  const fetchData = useCallback(async () => {
    if (!profile) return
    try {
      setLoading(true)
      const supabase = createClient()

      const carregarUltimasAcoes = async (notaIds: string[]) => {
        if (notaIds.length === 0) {
          setUltimasAcoes(new Map())
          return
        }

        const { data: cobrancasData } = await supabase
          .from('cobrancas')
          .select('nota_id, enviado_em')
          .in('nota_id', notaIds)
          .order('enviado_em', { ascending: false })

        const { data: eventosData } = await supabase
          .from('eventos')
          .select('nota_id, tipo, created_at')
          .in('nota_id', notaIds)
          .order('created_at', { ascending: false })

        const acoesMap = new Map<string, { tipo: string; created_at: string }>()

        cobrancasData?.forEach((c: any) => {
          if (!acoesMap.has(c.nota_id)) {
            acoesMap.set(c.nota_id, {
              tipo: 'lembrete_enviado',
              created_at: c.created_at,
            })
          }
        })

        eventosData?.forEach((e: any) => {
          const existing = acoesMap.get(e.nota_id)
          if (!existing || new Date(e.created_at) > new Date(existing.created_at)) {
            acoesMap.set(e.nota_id, { tipo: e.tipo, created_at: e.created_at })
          }
        })

        setUltimasAcoes(acoesMap)
      }

      const { data: inicioResult, error: inicioError } = await supabase.rpc(
        'get_inicio',
        {
          p_user_id: profile.id,
        }
      )

      if (!inicioError && inicioResult) {
        const inicioData = inicioResult as InicioData
        setData(inicioData)

        const notaIds = [...inicioData.vencidas, ...inicioData.vencendo].map((nota) => nota.id)
        await carregarUltimasAcoes(notaIds)
        return
      }

      // Compat fallback for older DBs / RPC issues: build dashboard from table queries
      type NotaBase = {
        id: string
        valor: number | string
        data_vencimento: string | null
        itens: unknown
        descricao: string | null
        status: string
        vezes_cobrado: number | null
        cliente_id: string
      }
      type PagamentoBase = {
        id: string
        valor: number | string
        data_pagamento: string | null
        cliente_id: string
      }
      type ClienteBase = {
        id: string
        nome: string
        apelido: string | null
        telefone: string
      }

      const now = new Date()
      const startOfToday = new Date(now)
      startOfToday.setHours(0, 0, 0, 0)
      const endOfToday = new Date(startOfToday)
      endOfToday.setDate(endOfToday.getDate() + 1)
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

      const [pendentesRes, pagosHojeRes, pagosMesRes] = await Promise.all([
        supabase
          .from('notas')
          .select('id, valor, data_vencimento, itens, descricao, status, vezes_cobrado, cliente_id')
          .eq('user_id', profile.id)
          .eq('status', 'pendente'),
        supabase
          .from('notas')
          .select('id, valor, data_pagamento, cliente_id')
          .eq('user_id', profile.id)
          .eq('status', 'pago')
          .gte('data_pagamento', startOfToday.toISOString())
          .lt('data_pagamento', endOfToday.toISOString()),
        supabase
          .from('notas')
          .select('valor')
          .eq('user_id', profile.id)
          .eq('status', 'pago')
          .gte('data_pagamento', startOfMonth.toISOString()),
      ])

      if (pendentesRes.error) throw pendentesRes.error
      if (pagosHojeRes.error) throw pagosHojeRes.error
      if (pagosMesRes.error) throw pagosMesRes.error

      const pendentes = (pendentesRes.data || []) as NotaBase[]
      const pagosHoje = (pagosHojeRes.data || []) as PagamentoBase[]
      const pagosMes = (pagosMesRes.data || []) as Array<{ valor: number | string }>

      const clienteIds = Array.from(
        new Set([...pendentes.map((n) => n.cliente_id), ...pagosHoje.map((n) => n.cliente_id)])
      )

      const clientesMap = new Map<string, ClienteBase>()
      if (clienteIds.length > 0) {
        const { data: clientesData, error: clientesError } = await supabase
          .from('clientes')
          .select('id, nome, apelido, telefone')
          .eq('user_id', profile.id)
          .in('id', clienteIds)

        if (clientesError) throw clientesError

          ; (clientesData || []).forEach((cliente) => {
            const c = cliente as ClienteBase
            clientesMap.set(c.id, c)
          })
      }

      const today = new Date(startOfToday)
      const sevenDaysFromToday = new Date(today)
      sevenDaysFromToday.setDate(sevenDaysFromToday.getDate() + 7)

      const vencidas: NotaComCliente[] = []
      const vencendo: NotaComCliente[] = []

      pendentes.forEach((nota) => {
        if (!nota.data_vencimento) return

        const dueDate = new Date(`${nota.data_vencimento}T00:00:00`)
        const cliente = clientesMap.get(nota.cliente_id)
        const itemList = Array.isArray(nota.itens)
          ? (nota.itens as NotaComCliente['itens'])
          : []

        const base: NotaComCliente = {
          id: nota.id,
          valor: Number(nota.valor || 0),
          data_vencimento: nota.data_vencimento,
          itens: itemList,
          descricao: nota.descricao,
          status: nota.status as 'pendente' | 'pago',
          vezes_cobrado: nota.vezes_cobrado || 0,
          cliente_id: nota.cliente_id,
          cliente_nome: cliente?.nome || 'Cliente',
          apelido: cliente?.apelido || null,
          cliente_telefone: cliente?.telefone || '',
        }

        if (dueDate < today) {
          const diasAtraso = Math.floor((today.getTime() - dueDate.getTime()) / 86400000)
          vencidas.push({ ...base, dias_atraso: diasAtraso })
          return
        }

        if (dueDate <= sevenDaysFromToday) {
          const diasRestantes = Math.floor((dueDate.getTime() - today.getTime()) / 86400000)
          vencendo.push({ ...base, dias_restantes: diasRestantes })
        }
      })

      const recebidosHoje = pagosHoje.map((nota) => ({
        id: nota.id,
        valor: Number(nota.valor || 0),
        cliente_nome: clientesMap.get(nota.cliente_id)?.nome || 'Cliente',
      }))

      const totalPendente = pendentes.reduce((acc, n) => acc + Number(n.valor || 0), 0)
      const recebidoMes = pagosMes.reduce((acc, n) => acc + Number(n.valor || 0), 0)

      setData({
        total_pendente: totalPendente,
        recebido_mes: recebidoMes,
        vencidas,
        vencendo,
        recebidos_hoje: recebidosHoje,
      })

      const notaIds = [...vencidas, ...vencendo].map((nota) => nota.id)
      await carregarUltimasAcoes(notaIds)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar dados'
      addToast({ message, type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [profile, addToast])

  useEffect(() => {
    fetchData()

    // Realtime subscription
    if (!profile) return
    const supabase = createClient()

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notas',
          filter: `user_id=eq.${profile.id}`,
        },
        () => fetchData()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clientes',
          filter: `user_id=eq.${profile.id}`,
        },
        () => fetchData()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cobrancas',
          filter: `user_id=eq.${profile.id}`,
        },
        () => fetchData()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'eventos',
          filter: `user_id=eq.${profile.id}`,
        },
        () => fetchData()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchData, profile])

  const handleMarcarPago = useCallback(async (nota: NotaComCliente) => {
    if (!profile) return
    try {
      const supabase = createClient()
      await supabase
        .from('notas')
        .update({ status: 'pago', data_pagamento: new Date().toISOString() })
        .eq('id', nota.id)

      await supabase.from('eventos').insert({
        nota_id: nota.id,
        cliente_id: nota.cliente_id,
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
              cliente_id: nota.cliente_id,
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
  }, [profile, addToast, fetchData])

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-20 w-full mt-4" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  const isEmpty =
    !data ||
    (data.total_pendente === 0 &&
      data.recebido_mes === 0 &&
      data.vencidas.length === 0 &&
      data.vencendo.length === 0 &&
      data.recebidos_hoje.length === 0)

  return (
    <PageTransition>
      <div className="p-6">
        <h1 className="text-xl font-semibold text-text-primary">
          Olá, {profile?.nome.split(' ')[0]}
        </h1>
        <p className="text-sm text-text-secondary">{profile?.nome_loja}</p>

        <div className="mt-6">
          <StatsBar
            totalPendente={data?.total_pendente || 0}
            recebidoMes={data?.recebido_mes || 0}
          />
        </div>

        {isEmpty ? (
          <div className="mt-8">
            <EmptyState
              icon={<ShoppingBagIcon className="h-12 w-12" />}
              title="Nenhuma venda pendente"
              description="Comece anotando a primeira venda no fiado."
              actionLabel="Nova venda"
              onAction={() => setShowWizard(true)}
            />
          </div>
        ) : (
          <>

            {data && data.vencidas.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="h-2 w-2 rounded-full bg-dot-red" />
                  <h2 className="text-sm font-semibold text-text-primary">
                    Vencidas · {data.vencidas.length}
                  </h2>
                </div>
                <Card className="divide-y divide-divider">
                  {data.vencidas.map((nota) => (
                    <NotaCard
                      key={nota.id}
                      nota={nota}
                      cliente={{
                        id: nota.cliente_id,
                        nome: nota.cliente_nome,
                        apelido: nota.apelido,
                        telefone: nota.cliente_telefone,
                      }}
                      ultimaAcao={ultimasAcoes.get(nota.id)}
                      showAvatar={true}
                      onCobrar={() => setCobrarNotas([nota])}
                      onMarcarPago={() => handleMarcarPago(nota)}
                    />
                  ))}
                </Card>
              </div>
            )}

            {data && data.vencendo.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="h-2 w-2 rounded-full bg-dot-yellow" />
                  <h2 className="text-sm font-semibold text-text-primary">
                    Vence em breve · {data.vencendo.length}
                  </h2>
                </div>
                <Card className="divide-y divide-divider">
                  {data.vencendo.map((nota) => (
                    <NotaCard
                      key={nota.id}
                      nota={nota}
                      cliente={{
                        id: nota.cliente_id,
                        nome: nota.cliente_nome,
                        apelido: nota.apelido,
                        telefone: nota.cliente_telefone,
                      }}
                      ultimaAcao={ultimasAcoes.get(nota.id)}
                      showAvatar={true}
                      onCobrar={() => setCobrarNotas([nota])}
                      onMarcarPago={() => handleMarcarPago(nota)}
                    />
                  ))}
                </Card>
              </div>
            )}

            {data && data.recebidos_hoje.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="h-2 w-2 rounded-full bg-dot-green" />
                  <h2 className="text-sm font-semibold text-text-primary">
                    Recebido
                  </h2>
                </div>
                <Card className="divide-y divide-divider">
                  {data.recebidos_hoje.map((item) => (
                    <div key={item.id} className="py-3">
                      <p className="text-sm text-text-primary">
                        {item.cliente_nome} pagou{' '}
                        {formatCurrencyShort(item.valor)}
                      </p>
                    </div>
                  ))}
                </Card>
              </div>
            )}
          </>
        )}
      </div>

      <FAB onClick={() => setShowWizard(true)} />

      <CobrarSheet
        open={cobrarNotas.length > 0}
        onClose={() => setCobrarNotas([])}
        notas={cobrarNotas}
      />

      {showWizard && (
        <WizardVenda
          open={showWizard}
          onClose={() => {
            setShowWizard(false)
            fetchData()
          }}
        />
      )}
    </PageTransition>
  )
}

// WizardVenda now imported statically above
