'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'motion/react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { useUIStore } from '@/stores/ui-store'
import { PageTransition } from '@/components/layout/page-transition'
import { FAB } from '@/components/layout/fab'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { UsersIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { formatCurrencyShort } from '@/lib/format'
import { cn } from '@/lib/cn'

interface ClienteComDivida {
  id: string
  nome: string
  apelido: string | null
  telefone: string
  total_pendente: number
  notas_pendentes: number
  dias_atraso_max: number | null
  dias_para_vencer: number | null
}

type SortOption = 'divida' | 'atraso' | 'nome'

export default function ClientesPage() {
  const router = useRouter()
  const profile = useAuthStore((s) => s.profile)
  const addToast = useUIStore((s) => s.addToast)
  const [clientes, setClientes] = useState<ClienteComDivida[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortOption>('divida')
  const [showWizard, setShowWizard] = useState(false)

  const fetchClientes = useCallback(async () => {
    if (!profile) return
    try {
      setLoading(true)
      const supabase = createClient()

      const { data: clientesData, error: cError } = await supabase
        .from('clientes')
        .select('id, nome, apelido, telefone')
        .eq('user_id', profile.id)
        .eq('ativo', true)

      if (cError) throw cError

      const { data: notasData, error: nError } = await supabase
        .from('notas')
        .select('cliente_id, valor, data_vencimento, status')
        .eq('user_id', profile.id)
        .eq('status', 'pendente')

      if (nError) throw nError

      const hoje = new Date()
      const result: ClienteComDivida[] = (clientesData || []).map((c) => {
        const notasCliente = (notasData || []).filter((n) => n.cliente_id === c.id)
        const total = notasCliente.reduce((acc, n) => acc + Number(n.valor), 0)

        const diasAtraso = notasCliente
          .filter((n) => n.data_vencimento)
          .map((n) => {
            const venc = new Date(n.data_vencimento + 'T00:00:00')
            return Math.floor((hoje.getTime() - venc.getTime()) / 86400000)
          })
          .filter((d) => d > 0)

        const diasParaVencer = notasCliente
          .filter((n) => n.data_vencimento)
          .map((n) => {
            const venc = new Date(n.data_vencimento + 'T00:00:00')
            return Math.floor((venc.getTime() - hoje.getTime()) / 86400000)
          })
          .filter((d) => d >= 0 && d <= 7)

        return {
          id: c.id,
          nome: c.nome,
          apelido: c.apelido,
          telefone: c.telefone,
          total_pendente: total,
          notas_pendentes: notasCliente.length,
          dias_atraso_max: diasAtraso.length > 0 ? Math.max(...diasAtraso) : null,
          dias_para_vencer: diasParaVencer.length > 0 ? Math.min(...diasParaVencer) : null,
        }
      })

      setClientes(result)
    } catch {
      addToast({ message: 'Erro ao carregar clientes', type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [profile, addToast])

  useEffect(() => {
    fetchClientes()
  }, [fetchClientes])

  const filtered = clientes
    .filter(
      (c) =>
        c.nome.toLowerCase().includes(search.toLowerCase()) ||
        (c.apelido && c.apelido.toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => {
      if (sort === 'divida') return b.total_pendente - a.total_pendente
      if (sort === 'atraso')
        return (b.dias_atraso_max || 0) - (a.dias_atraso_max || 0)
      return a.nome.localeCompare(b.nome)
    })

  function getStatusDot(c: ClienteComDivida): string {
    if (c.dias_atraso_max && c.dias_atraso_max > 0) return 'bg-dot-red'
    if (c.dias_para_vencer !== null) return 'bg-dot-yellow'
    if (c.total_pendente > 0) return 'bg-dot-yellow'
    return 'bg-dot-green'
  }

  function getStatusSubtext(c: ClienteComDivida): { text: string; className: string } {
    if (c.dias_atraso_max && c.dias_atraso_max > 0) {
      return { text: `Vencida há ${c.dias_atraso_max} dia${c.dias_atraso_max > 1 ? 's' : ''}`, className: 'text-red-500' }
    }
    if (c.dias_para_vencer !== null) {
      return { text: `Vence em ${c.dias_para_vencer} dia${c.dias_para_vencer > 1 ? 's' : ''}`, className: 'text-amber-600' }
    }
    if (c.total_pendente > 0) {
      return { text: `${c.notas_pendentes} nota${c.notas_pendentes > 1 ? 's' : ''} pendente${c.notas_pendentes > 1 ? 's' : ''}`, className: 'text-[#6B7280]' }
    }
    return { text: 'Tudo pago', className: 'text-[#6B7280]' }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    )
  }

  return (
    <PageTransition>
      <div className="p-6">
        <h1 className="text-xl font-semibold text-[#02090A] mb-4">
          Clientes · {clientes.length}
        </h1>

        {/* Busca estilizada */}
        <div className="relative mb-4">
          <MagnifyingGlassIcon className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
          <input
            type="text"
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent border-b border-zinc-300 rounded-none py-2 pl-6 text-sm text-[#02090A] placeholder:text-[#9CA3AF] focus:outline-none focus:border-b-black transition-colors"
          />
        </div>

        {/* Sort dropdown */}
        <div className="flex items-center justify-between mt-4 mb-4">
          <span className="text-xs text-[#9CA3AF]">Ordenar</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="text-sm font-medium text-[#02090A] bg-transparent outline-none cursor-pointer"
          >
            <option value="divida">Maior dívida ▾</option>
            <option value="atraso">Mais atrasado ▾</option>
            <option value="nome">Nome A-Z ▾</option>
          </select>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={<UsersIcon className="h-12 w-12" />}
            title="Nenhum cliente"
            description="Cadastre seu primeiro cliente."
            actionLabel="Novo cliente"
            onAction={() => setShowWizard(true)}
          />
        ) : (
          <div className="space-y-3">
            {filtered.map((c) => {
              const status = getStatusSubtext(c)
              return (
                <Card key={c.id}>
                  <motion.button
                    onClick={() => router.push(`/clientes/${c.id}`)}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-1 text-left"
                  >
                    <div className="flex items-center gap-2">
                      {/* Dot de status */}
                      <span className={cn('h-2 w-2 rounded-full shrink-0', getStatusDot(c))} />

                      {/* Avatar */}
                      <div className="h-9 w-9 rounded-full bg-black text-white flex items-center justify-center text-xs font-semibold shrink-0">
                        {(c.nome?.[0] || 'C').toUpperCase()}
                      </div>

                      {/* Nome e info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#02090A] truncate">
                          {c.nome}
                        </p>
                        <p className="text-sm text-[#6B7280]">
                          {formatCurrencyShort(c.total_pendente)} · {c.notas_pendentes} nota{c.notas_pendentes > 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>

                    {/* Subtexto contextual */}
                    <p className={cn('text-xs mt-1 pl-11', status.className)}>
                      {status.text}
                    </p>
                  </motion.button>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      <FAB onClick={() => setShowWizard(true)} />

      {showWizard && (
        <WizardVenda
          open={showWizard}
          onClose={() => {
            setShowWizard(false)
            fetchClientes()
          }}
        />
      )}
    </PageTransition>
  )
}

import dynamic from 'next/dynamic'
const WizardVenda = dynamic(
  () => import('@/components/vendas/wizard-venda').then((mod) => mod.WizardVenda),
  { ssr: false }
)
