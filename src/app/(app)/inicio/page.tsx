'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { trackEvent } from '@/lib/analytics'
import { useAuthStore } from '@/stores/auth-store'
import { useUIStore } from '@/stores/ui-store'
import { useDataStore, type UltimaAcaoResumo } from '@/stores/data-store'
import { useTrial } from '@/hooks/use-trial'
import { PageTransition } from '@/components/layout/page-transition'
import { FAB } from '@/components/layout/fab'
import { PwaInstallButton } from '@/components/pwa/pwa-install-banner'
import { StatsBar } from '@/components/inicio/stats-bar'
import { NotaCard, type DadosPagamentoParcial } from '@/components/notas/nota-card'
import { CobrarSheet } from '@/components/cobrancas/cobrar-sheet'
import { WizardVenda } from '@/components/vendas/wizard-venda'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import {
  ShoppingBagIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline'
import type { InicioData, NotaComCliente } from '@/types/database'

export default function InicioPage() {
  const profile = useAuthStore((s) => s.profile)
  const addToast = useUIStore((s) => s.addToast)
  const cachedInicio = useDataStore((s) => s.inicioData)
  const cachedAcoes = useDataStore((s) => s.ultimasAcoes)
  const setCachedInicio = useDataStore((s) => s.setInicioData)
  const setCachedAcoes = useDataStore((s) => s.setUltimasAcoes)
  const { diasRestantes, assinaturaAtiva } = useTrial()
  const [data, setData] = useState<InicioData | null>(cachedInicio)
  const [ultimasAcoes, setUltimasAcoes] = useState<
    Map<string, UltimaAcaoResumo>
  >(new Map(Object.entries(cachedAcoes)))
  const [loading, setLoading] = useState(!cachedInicio)
  const [cobrarNotas, setCobrarNotas] = useState<NotaComCliente[]>([])
  const [showWizard, setShowWizard] = useState(false)
  const [parciaisMap, setParciaisMap] = useState<Map<string, number>>(new Map())
  const [autoOpenNovoCliente, setAutoOpenNovoCliente] = useState(false)

  const fetchData = useCallback(async () => {
    if (!profile) return
    try {
      setLoading(true)
      const supabase = createClient()

      type CobrancaResumo = {
        nota_id: string
        enviado_em: string
      }
      type EventoResumo = {
        nota_id: string
        tipo: string
        created_at: string
      }

      const carregarUltimasAcoes = async (notaIds: string[]) => {
        if (notaIds.length === 0) {
          setUltimasAcoes(new Map())
          setParciaisMap(new Map())
          return
        }

        const { data: cobrancasData } = await supabase
          .from('cobrancas')
          .select('nota_id, enviado_em')
          .in('nota_id', notaIds)
          .order('enviado_em', { ascending: false })

        const { data: eventosData } = await supabase
          .from('eventos')
          .select('nota_id, tipo, created_at, metadata')
          .in('nota_id', notaIds)
          .order('created_at', { ascending: false })

        const acoesMap = new Map<string, { tipo: string; created_at: string }>()
        const newParciaisMap = new Map<string, number>()

        cobrancasData?.forEach((cobranca) => {
          const c = cobranca as CobrancaResumo
          if (!acoesMap.has(c.nota_id)) {
            acoesMap.set(c.nota_id, {
              tipo: 'lembrete_enviado',
              created_at: c.enviado_em,
            })
          }
        })

        eventosData?.forEach((evento) => {
          const e = evento as EventoResumo & { metadata?: Record<string, unknown> }
          const existing = acoesMap.get(e.nota_id)
          if (
            !existing ||
            new Date(e.created_at) > new Date(existing.created_at)
          ) {
            acoesMap.set(e.nota_id, { tipo: e.tipo, created_at: e.created_at })
          }
          // Accumulate partial payment totals
          if (e.tipo === 'pagamento_parcial' && e.metadata) {
            const val = Number(e.metadata.valor || 0)
            newParciaisMap.set(e.nota_id, (newParciaisMap.get(e.nota_id) || 0) + val)
          }
        })

        setUltimasAcoes(acoesMap)
        setParciaisMap(newParciaisMap)
        setCachedAcoes(Object.fromEntries(acoesMap))
      }

      const { data: inicioResult, error: inicioError } =
        await supabase.rpc('get_inicio')

      if (!inicioError && inicioResult) {
        const inicioData = inicioResult as InicioData
        setData(inicioData)
        setCachedInicio(inicioData)

        const notaIds = [...inicioData.vencidas, ...inicioData.vencendo].map(
          (nota) => nota.id
        )
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

      const [pendentesRes, pagosHojeRes, pagosMesRes, parciaisRes] = await Promise.all([
        supabase
          .from('notas')
          .select(
            'id, valor, data_vencimento, itens, descricao, status, vezes_cobrado, cliente_id'
          )
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
        supabase
          .from('eventos')
          .select('id, nota_id, cliente_id, created_at, metadata')
          .eq('user_id', profile.id)
          .eq('tipo', 'pagamento_parcial')
      ])

      if (pendentesRes.error) throw pendentesRes.error
      if (pagosHojeRes.error) throw pagosHojeRes.error
      if (pagosMesRes.error) throw pagosMesRes.error

      const pendentes = (pendentesRes.data || []) as NotaBase[]
      const pagosHoje = (pagosHojeRes.data || []) as PagamentoBase[]
      const pagosMes = (pagosMesRes.data || []) as Array<{ valor: number | string }>
      
      const parciais = (parciaisRes.data || []) as Array<{
        id: string
        nota_id: string
        cliente_id: string
        created_at: string
        metadata: { valor: number }
      }>

      const clienteIds = Array.from(
        new Set([
          ...pendentes.map((n) => n.cliente_id),
          ...pagosHoje.map((n) => n.cliente_id),
          ...parciais.map((e) => e.cliente_id),
        ])
      )

      const clientesMap = new Map<string, ClienteBase>()
      if (clienteIds.length > 0) {
        const { data: clientesData, error: clientesError } = await supabase
          .from('clientes')
          .select('id, nome, apelido, telefone')
          .eq('user_id', profile.id)
          .in('id', clienteIds)

        if (clientesError) throw clientesError
        ;(clientesData || []).forEach((cliente) => {
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
          const diasAtraso = Math.floor(
            (today.getTime() - dueDate.getTime()) / 86400000
          )
          vencidas.push({ ...base, dias_atraso: diasAtraso })
          return
        }

        if (dueDate <= sevenDaysFromToday) {
          const diasRestantes = Math.floor(
            (dueDate.getTime() - today.getTime()) / 86400000
          )
          vencendo.push({ ...base, dias_restantes: diasRestantes })
        }
      })

      const parciaisHoje = parciais
        .filter(p => new Date(p.created_at) >= startOfToday && new Date(p.created_at) < endOfToday)
        .map(p => ({
          id: p.id,
          valor: Number(p.metadata.valor || 0),
          cliente_nome: clientesMap.get(p.cliente_id)?.nome || 'Cliente'
        }))

      const recebidosHoje = [
        ...pagosHoje.map((nota) => ({
          id: nota.id,
          valor: Number(nota.valor || 0),
          cliente_nome: clientesMap.get(nota.cliente_id)?.nome || 'Cliente',
        })),
        ...parciaisHoje
      ]

      const pendentesIds = new Set(pendentes.map(n => n.id))
      const totalParcialDePendentes = parciais
        .filter(p => pendentesIds.has(p.nota_id))
        .reduce((acc, p) => acc + Number(p.metadata.valor || 0), 0)

      const totalPendente = pendentes.reduce(
        (acc, n) => acc + Number(n.valor || 0),
        0
      ) - totalParcialDePendentes

      const parciaisMes = parciais
        .filter(p => new Date(p.created_at) >= startOfMonth)
        .reduce((acc, p) => acc + Number(p.metadata.valor || 0), 0)

      const recebidoMes = pagosMes.reduce(
        (acc, n) => acc + Number(n.valor || 0),
        0
      ) + parciaisMes


      const built: InicioData = {
        total_pendente: totalPendente,
        recebido_mes: recebidoMes,
        vencidas,
        vencendo,
        recebidos_hoje: recebidosHoje,
      }
      setData(built)
      setCachedInicio(built)

      const notaIds = [...vencidas, ...vencendo].map((nota) => nota.id)
      await carregarUltimasAcoes(notaIds)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erro ao carregar dados'
      addToast({ message, type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [profile, addToast, setCachedAcoes, setCachedInicio])

  useEffect(() => {
    trackEvent('inicio_view')
    if (window.location.search.includes('action=novo-cliente')) {
      setAutoOpenNovoCliente(true)
      setShowWizard(true)
      window.history.replaceState(null, '', '/inicio')
    }
  }, [])

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

  const handleMarcarPago = useCallback(
    async (nota: NotaComCliente, dados?: DadosPagamentoParcial) => {
      if (!profile) return
      try {
        const supabase = createClient()

        if (dados?.parcial) {
          const totalParcialAtual = parciaisMap.get(nota.id) || 0
          const novoTotalParcial = totalParcialAtual + dados.valorRecebido
          const valorNota = Number(nota.valor)

          await supabase.from('eventos').insert({
            nota_id: nota.id,
            cliente_id: nota.cliente_id,
            user_id: profile.id,
            tipo: 'pagamento_parcial',
            metadata: { valor: dados.valorRecebido },
          })

          if (dados.novaDataVencimento) {
            await supabase
              .from('notas')
              .update({ data_vencimento: dados.novaDataVencimento })
              .eq('id', nota.id)
          }

          if (novoTotalParcial >= valorNota) {
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
            addToast({ message: 'Nota quitada por completo!', type: 'success' })
          } else {
            addToast({
              message: `Parcial de ${dados.valorRecebido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} registrado!`,
              type: 'success',
            })
          }

          fetchData()
          return
        }

        // Full payment
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
    },
    [profile, addToast, fetchData, parciaisMap]
  )

  const handleEditNota = useCallback(
    async (
      notaId: string,
      data: { descricao: string; valor: string; data_vencimento: string }
    ) => {
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
    },
    [profile, addToast, fetchData]
  )

  const handleDeleteNota = useCallback(
    async (notaId: string) => {
      if (!profile) return
      try {
        const supabase = createClient()
        await supabase.from('notas').delete().eq('id', notaId)
        fetchData()
      } catch {
        addToast({ message: 'Erro ao excluir nota', type: 'error' })
      }
    },
    [profile, addToast, fetchData]
  )

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
      <div className="p-6 lg:px-0 lg:py-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl lg:text-2xl font-semibold text-text-primary">
              Olá, {profile?.nome.split(' ')[0]}
            </h1>
            <p className="text-sm text-text-secondary">{profile?.nome_loja}</p>
          </div>
          <PwaInstallButton />
        </div>

        {!assinaturaAtiva && (
          <Link href="/ajustes/plano" className="mt-5 block group">
            <div className="relative overflow-hidden rounded-2xl bg-[#163300] px-4 py-3.5 transition-transform active:scale-[0.98]">
              {/* Accent glow */}
              <div className="absolute -top-8 -right-8 h-24 w-24 rounded-full bg-[#9FE870] blur-2xl opacity-25" />

              <div className="relative flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#9FE870]/20 shrink-0">
                    <span className="text-lg">⚡</span>
                  </div>
                  <div>
                    <strong className="block text-sm font-semibold text-white">
                      Assinar Caderneta Pro
                    </strong>
                    <span className="text-xs text-white/55">
                      {diasRestantes > 0
                        ? `${diasRestantes} ${diasRestantes === 1 ? 'dia grátis restante' : 'dias grátis restantes'}`
                        : 'Seu período grátis acabou'}
                    </span>
                  </div>
                </div>
                <span className="text-xs font-semibold px-3.5 py-1.5 rounded-full bg-[#9FE870] text-[#163300] shrink-0 transition-transform group-hover:scale-105">
                  Assinar
                </span>
              </div>
            </div>
          </Link>
        )}

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
            <div className="lg:grid lg:grid-cols-2 lg:gap-6">
              {data && data.vencidas.length > 0 && (
                <div className="mt-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="h-2 w-2 rounded-full bg-dot-red" />
                    <h2 className="text-sm font-semibold text-text-primary">
                      Vencidas · {data.vencidas.length}
                    </h2>
                  </div>
                  <div className="space-y-3">
                    {data.vencidas.map((nota) => (
                      <Card key={nota.id}>
                        <NotaCard
                          nota={nota}
                          cliente={{
                            id: nota.cliente_id,
                            nome: nota.cliente_nome,
                            apelido: nota.apelido,
                            telefone: nota.cliente_telefone,
                          }}
                          ultimaAcao={ultimasAcoes.get(nota.id)}
                          totalParcial={parciaisMap.get(nota.id) || 0}
                          showAvatar={true}
                          onCobrar={() => setCobrarNotas([{
                            ...nota,
                            valor: Number(nota.valor) - (parciaisMap.get(nota.id) || 0),
                            valor_original: (parciaisMap.get(nota.id) || 0) > 0 ? Number(nota.valor) : undefined
                          }])}
                          onMarcarPago={(dados) => handleMarcarPago(nota, dados)}
                          onEdit={handleEditNota}
                          onDelete={handleDeleteNota}
                        />
                      </Card>
                    ))}
                  </div>
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
                  <div className="space-y-3">
                    {data.vencendo.map((nota) => (
                      <Card key={nota.id}>
                        <NotaCard
                          nota={nota}
                          cliente={{
                            id: nota.cliente_id,
                            nome: nota.cliente_nome,
                            apelido: nota.apelido,
                            telefone: nota.cliente_telefone,
                          }}
                          ultimaAcao={ultimasAcoes.get(nota.id)}
                          totalParcial={parciaisMap.get(nota.id) || 0}
                          showAvatar={true}
                          onCobrar={() => setCobrarNotas([{
                            ...nota,
                            valor: Number(nota.valor) - (parciaisMap.get(nota.id) || 0),
                            valor_original: (parciaisMap.get(nota.id) || 0) > 0 ? Number(nota.valor) : undefined
                          }])}
                          onMarcarPago={(dados) => handleMarcarPago(nota, dados)}
                          onEdit={handleEditNota}
                          onDelete={handleDeleteNota}
                        />
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {data && data.recebidos_hoje.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="h-2 w-2 rounded-full bg-success" />
                  <h2 className="text-sm font-semibold text-text-primary">
                    Recebidos hoje · {data.recebidos_hoje.length}
                  </h2>
                </div>
                <div className="space-y-3">
                  {data.recebidos_hoje.map((recebido) => (
                    <Card key={recebido.id}>
                      <div className="flex items-center gap-3 p-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/10 shrink-0">
                          <CheckCircleIcon className="h-5 w-5 text-success" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-primary truncate">
                            {recebido.cliente_nome}
                          </p>
                          <p className="text-xs text-text-secondary">
                            Pagamento registrado
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-success shrink-0">
                          +{recebido.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                      </div>
                    </Card>
                  ))}
                </div>
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
          defaultNovoCliente={autoOpenNovoCliente}
          onClose={() => {
            setShowWizard(false)
            setAutoOpenNovoCliente(false)
            fetchData()
          }}
        />
      )}
    </PageTransition>
  )
}

// WizardVenda now imported statically above
