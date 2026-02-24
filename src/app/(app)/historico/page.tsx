'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { PageTransition } from '@/components/layout/page-transition'
import { Card } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { formatCurrencyShort } from '@/lib/format'
import { ClockIcon } from '@heroicons/react/24/outline'

interface NotaPaga {
    id: string
    valor: number
    descricao: string | null
    data_pagamento: string | null
    data_compra: string
    cliente_id: string
    cliente_nome: string
    cliente_apelido: string | null
}

function formatDate(dateStr: string | null) {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    })
}

function formatRelativeDate(dateStr: string | null) {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Hoje'
    if (diffDays === 1) return 'Ontem'
    if (diffDays < 7) return `${diffDays} dias atrás`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} sem. atrás`
    return formatDate(dateStr)
}

function groupByMonth(notas: NotaPaga[]) {
    const groups = new Map<string, NotaPaga[]>()

    notas.forEach((nota) => {
        const dateStr = nota.data_pagamento || nota.data_compra
        const date = new Date(dateStr)
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

        if (!groups.has(key)) {
            groups.set(key, [])
        }
        groups.get(key)!.push(nota)
    })

    return Array.from(groups.entries())
        .sort((a, b) => b[0].localeCompare(a[0]))
        .map(([key, notas]) => {
            const date = new Date(notas[0].data_pagamento || notas[0].data_compra)
            const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
            const total = notas.reduce((acc, n) => acc + Number(n.valor), 0)
            return { key, label, notas, total }
        })
}

export default function HistoricoPage() {
    const profile = useAuthStore((s) => s.profile)
    const router = useRouter()
    const [notas, setNotas] = useState<NotaPaga[]>([])
    const [loading, setLoading] = useState(true)

    const fetchData = useCallback(async () => {
        if (!profile) return
        try {
            setLoading(true)
            const supabase = createClient()

            const { data: notasData, error } = await supabase
                .from('notas')
                .select('id, valor, descricao, data_pagamento, data_compra, cliente_id')
                .eq('user_id', profile.id)
                .eq('status', 'pago')
                .order('data_pagamento', { ascending: false, nullsFirst: false })

            if (error) throw error

            // Fetch client names
            const clienteIds = Array.from(new Set((notasData || []).map((n: any) => n.cliente_id)))

            let clientesMap = new Map<string, { nome: string; apelido: string | null }>()
            if (clienteIds.length > 0) {
                const { data: clientesData } = await supabase
                    .from('clientes')
                    .select('id, nome, apelido')
                    .in('id', clienteIds)

                    ; (clientesData || []).forEach((c: any) => {
                        clientesMap.set(c.id, { nome: c.nome, apelido: c.apelido })
                    })
            }

            const formattedNotas: NotaPaga[] = (notasData || []).map((n: any) => {
                const cliente = clientesMap.get(n.cliente_id)
                return {
                    id: n.id,
                    valor: Number(n.valor),
                    descricao: n.descricao,
                    data_pagamento: n.data_pagamento,
                    data_compra: n.data_compra,
                    cliente_id: n.cliente_id,
                    cliente_nome: cliente?.nome || 'Cliente',
                    cliente_apelido: cliente?.apelido || null,
                }
            })

            setNotas(formattedNotas)
        } catch (err) {
            console.error('Erro ao carregar histórico:', err)
        } finally {
            setLoading(false)
        }
    }, [profile])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    const totalRecebido = notas.reduce((acc, n) => acc + n.valor, 0)
    const groups = groupByMonth(notas)

    return (
        <PageTransition>
            <div className="p-6 lg:px-0 lg:py-8">
                <h1 className="text-xl lg:text-2xl font-semibold text-text-primary">
                    Histórico
                </h1>
                <p className="text-sm text-text-secondary mt-1">
                    Todos os pagamentos recebidos
                </p>

                {loading ? (
                    <div className="mt-6 space-y-4">
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                    </div>
                ) : notas.length === 0 ? (
                    <EmptyState
                        icon={<ClockIcon className="h-12 w-12" />}
                        title="Nenhum pagamento recebido"
                        description="Quando seus clientes pagarem, o histórico aparecerá aqui."
                    />
                ) : (
                    <>
                        {/* Total Card */}
                        <Card className="mt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-text-secondary">Total recebido</p>
                                    <p className="text-2xl font-bold text-text-primary mt-1">
                                        {formatCurrencyShort(totalRecebido)}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-text-secondary">{notas.length} pagamentos</p>
                                </div>
                            </div>
                        </Card>

                        {/* Grouped by month */}
                        <div className="mt-6 space-y-6 lg:grid lg:grid-cols-2 lg:gap-6 lg:space-y-0">
                            {groups.map((group) => (
                                <div key={group.key}>
                                    <div className="flex items-center justify-between mb-3">
                                        <h2 className="text-sm font-semibold text-text-primary capitalize">
                                            {group.label}
                                        </h2>
                                        <span className="text-xs text-text-secondary">
                                            {formatCurrencyShort(group.total)}
                                        </span>
                                    </div>
                                    <Card className="divide-y divide-divider !p-0">
                                        {group.notas.map((nota) => (
                                            <button
                                                key={nota.id}
                                                onClick={() => router.push(`/clientes/${nota.cliente_id}`)}
                                                className="w-full flex items-center gap-3 p-4 text-left hover:bg-black/[0.02] transition-colors"
                                            >
                                                <Avatar name={nota.cliente_apelido || nota.cliente_nome} />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-text-primary truncate">
                                                        {nota.cliente_apelido || nota.cliente_nome}
                                                    </p>
                                                    <p className="text-xs text-text-secondary">
                                                        {nota.descricao || 'Pagamento'} · {formatRelativeDate(nota.data_pagamento)}
                                                    </p>
                                                </div>
                                                <p className="text-sm font-semibold text-success shrink-0">
                                                    +{formatCurrencyShort(nota.valor)}
                                                </p>
                                            </button>
                                        ))}
                                    </Card>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </PageTransition>
    )
}
