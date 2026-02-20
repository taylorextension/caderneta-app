'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { useUIStore } from '@/stores/ui-store'
import { PageTransition } from '@/components/layout/page-transition'
import { FAB } from '@/components/layout/fab'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { UsersIcon } from '@heroicons/react/24/outline'
import { formatCurrencyShort } from '@/lib/format'

interface ClienteComDivida {
  id: string
  nome: string
  apelido: string | null
  telefone: string
  total_pendente: number
  notas_pendentes: number
  dias_atraso_max: number | null
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

      const result: ClienteComDivida[] = (clientesData || []).map((c) => {
        const notasCliente = (notasData || []).filter((n) => n.cliente_id === c.id)
        const total = notasCliente.reduce((acc, n) => acc + Number(n.valor), 0)
        const hoje = new Date()
        const diasAtraso = notasCliente
          .filter((n) => n.data_vencimento)
          .map((n) => {
            const venc = new Date(n.data_vencimento + 'T00:00:00')
            return Math.floor((hoje.getTime() - venc.getTime()) / 86400000)
          })
          .filter((d) => d > 0)

        return {
          id: c.id,
          nome: c.nome,
          apelido: c.apelido,
          telefone: c.telefone,
          total_pendente: total,
          notas_pendentes: notasCliente.length,
          dias_atraso_max: diasAtraso.length > 0 ? Math.max(...diasAtraso) : null,
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

  function getStatusDot(c: ClienteComDivida) {
    if (c.dias_atraso_max && c.dias_atraso_max > 0) return 'bg-dot-red'
    if (c.total_pendente > 0) return 'bg-dot-yellow'
    return 'bg-dot-green'
  }

  function getStatusText(c: ClienteComDivida) {
    if (c.dias_atraso_max && c.dias_atraso_max > 0)
      return `Vencida há ${c.dias_atraso_max} dias`
    if (c.total_pendente > 0) return `${c.notas_pendentes} nota${c.notas_pendentes > 1 ? 's' : ''} pendente${c.notas_pendentes > 1 ? 's' : ''}`
    return 'Tudo pago'
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
        <h1 className="text-xl font-semibold text-text-primary mb-4">
          Clientes · {clientes.length}
        </h1>

        <Input
          placeholder="Buscar..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="flex items-center justify-between mt-4 mb-4">
          <span className="text-xs text-text-muted">Ordenar</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="text-xs font-medium text-text-primary bg-transparent outline-none"
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
          <Card className="divide-y divide-divider">
            {filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => router.push(`/clientes/${c.id}`)}
                className="w-full py-3 text-left"
              >
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${getStatusDot(c)}`} />
                  <p className="text-sm font-medium truncate">{c.nome}</p>
                  {c.total_pendente > 0 && (
                    <span className="text-sm text-text-secondary shrink-0">
                      · {formatCurrencyShort(c.total_pendente)}
                      {c.notas_pendentes > 0 ? ` · ${c.notas_pendentes} not` : ''}
                      {c.notas_pendentes > 1 ? 'as' : c.notas_pendentes === 1 ? 'a' : ''}
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-secondary mt-1">
                  {getStatusText(c)}
                </p>
              </button>
            ))}
          </Card>
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
