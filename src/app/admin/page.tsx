'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  UserGroupIcon,
  CheckBadgeIcon,
  ClockIcon,
  XCircleIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from '@heroicons/react/24/outline'

interface Stats {
  totalUsers: number
  activeSubscribers: number
  trialActive: number
  trialExpired: number
  newToday: number
  newLast30Days: number
  canceledLast30: number
  purchasesLast30: number
}

interface User {
  id: string
  nome: string
  nome_loja: string
  telefone: string
  email: string
  plano: string
  assinatura_ativa: boolean
  trial_fim: string | null
  created_at: string
  status: 'ativo' | 'trial' | 'expirado'
}

type Filter = 'all' | 'active' | 'trial' | 'expired'

export default function AdminPage() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [updating, setUpdating] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [statsRes, usersRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch(
          `/api/admin/users?filter=${filter}&search=${encodeURIComponent(search)}`
        ),
      ])
      const statsData = await statsRes.json()
      const usersData = await usersRes.json()
      setStats(statsData)
      setUsers(usersData.users || [])
    } catch {
      console.error('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }, [filter, search])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function toggleSubscription(user: User) {
    setUpdating(user.id)
    try {
      const newStatus = !user.assinatura_ativa
      await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          updates: {
            assinatura_ativa: newStatus,
            plano: newStatus ? 'basico' : 'trial',
          },
        }),
      })
      await fetchData()
    } finally {
      setUpdating(null)
    }
  }

  const statusColor = (s: string) => {
    if (s === 'ativo') return 'bg-emerald-100 text-emerald-700'
    if (s === 'trial') return 'bg-amber-100 text-amber-700'
    return 'bg-red-100 text-red-700'
  }

  const statusLabel = (s: string) => {
    if (s === 'ativo') return 'Assinante'
    if (s === 'trial') return 'Trial'
    return 'Expirado'
  }

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: 'Todos' },
    { key: 'active', label: 'Ativos' },
    { key: 'trial', label: 'Trial' },
    { key: 'expired', label: 'Expirados' },
  ]

  return (
    <div className="min-h-screen bg-[#F1F1EF]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-divider">
        <div className="px-4 py-3 flex items-center gap-3 max-w-2xl mx-auto">
          <button
            onClick={() => router.push('/inicio')}
            className="p-1.5 rounded-lg hover:bg-[#F1F1EF] transition-colors"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold flex-1">Painel Admin</h1>
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-1.5 rounded-lg hover:bg-[#F1F1EF] transition-colors"
          >
            <ArrowPathIcon
              className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`}
            />
          </button>
        </div>
      </div>

      <div className="px-4 py-5 max-w-2xl mx-auto space-y-5">
        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon={<UserGroupIcon className="h-5 w-5" />}
              label="Total de Usuários"
              value={stats.totalUsers}
              sub={`+${stats.newToday} hoje`}
              color="bg-blue-50 text-blue-600"
            />
            <StatCard
              icon={<CheckBadgeIcon className="h-5 w-5" />}
              label="Assinantes Ativos"
              value={stats.activeSubscribers}
              sub={`${stats.purchasesLast30} novos/30d`}
              color="bg-emerald-50 text-emerald-600"
            />
            <StatCard
              icon={<ClockIcon className="h-5 w-5" />}
              label="Em Trial"
              value={stats.trialActive}
              color="bg-amber-50 text-amber-600"
            />
            <StatCard
              icon={<XCircleIcon className="h-5 w-5" />}
              label="Trial Expirado"
              value={stats.trialExpired}
              sub={`${stats.canceledLast30} cancel/30d`}
              color="bg-red-50 text-red-600"
            />
            <div className="col-span-2 grid grid-cols-2 gap-3">
              <StatCard
                icon={<ArrowTrendingUpIcon className="h-5 w-5" />}
                label="Novos (30 dias)"
                value={stats.newLast30Days}
                color="bg-purple-50 text-purple-600"
              />
              <StatCard
                icon={<ArrowTrendingDownIcon className="h-5 w-5" />}
                label="Cancelamentos"
                value={stats.canceledLast30}
                sub="últimos 30 dias"
                color="bg-rose-50 text-rose-600"
              />
            </div>
          </div>
        )}

        {/* Search + Filters */}
        <div className="space-y-3">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, email ou loja..."
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-divider rounded-xl text-sm outline-none focus:ring-2 focus:ring-black/5"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  filter === f.key
                    ? 'bg-[#02090A] text-white'
                    : 'bg-white text-[#6B7280] border border-divider'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* User List */}
        <div className="space-y-2">
          <p className="text-xs text-[#6B7280] font-medium">
            {users.length} usuário{users.length !== 1 ? 's' : ''}
          </p>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
                  <div className="h-4 bg-[#F1F1EF] rounded w-1/3 mb-2" />
                  <div className="h-3 bg-[#F1F1EF] rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center">
              <p className="text-sm text-[#6B7280]">
                Nenhum usuário encontrado
              </p>
            </div>
          ) : (
            users.map((user) => (
              <div key={user.id} className="bg-white rounded-xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#02090A] truncate">
                      {user.nome || 'Sem nome'}
                    </p>
                    <p className="text-xs text-[#6B7280] truncate">
                      {user.email}
                    </p>
                    {user.nome_loja && (
                      <p className="text-xs text-[#6B7280] truncate">
                        {user.nome_loja}
                      </p>
                    )}
                  </div>
                  <span
                    className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${statusColor(user.status)}`}
                  >
                    {statusLabel(user.status)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-[#6B7280]">
                  <div className="flex gap-3">
                    <span>
                      Plano:{' '}
                      <strong className="text-[#02090A]">
                        {user.plano || 'trial'}
                      </strong>
                    </span>
                    <span>
                      Criado:{' '}
                      {new Date(user.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>

                {user.trial_fim && !user.assinatura_ativa && (
                  <p className="text-[11px] text-[#6B7280]">
                    Trial até:{' '}
                    {new Date(user.trial_fim).toLocaleDateString('pt-BR')}
                  </p>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => toggleSubscription(user)}
                    disabled={updating === user.id}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
                      user.assinatura_ativa
                        ? 'bg-red-50 text-red-600 hover:bg-red-100'
                        : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                    } disabled:opacity-50`}
                  >
                    {updating === user.id
                      ? '...'
                      : user.assinatura_ativa
                        ? 'Cancelar Assinatura'
                        : 'Ativar Assinatura'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: number
  sub?: string
  color: string
}) {
  return (
    <div className="bg-white rounded-xl p-4">
      <div className={`inline-flex p-2 rounded-lg mb-2 ${color}`}>{icon}</div>
      <p className="text-2xl font-bold text-[#02090A]">{value}</p>
      <p className="text-xs text-[#6B7280] mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-[#9CA3AF] mt-0.5">{sub}</p>}
    </div>
  )
}
