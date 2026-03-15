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
import { useUIStore } from '@/stores/ui-store'
import { StatCard } from '@/components/admin/stat-card'
import { BusinessMetrics } from '@/components/admin/business-metrics'
import { UserCard, type User } from '@/components/admin/user-card'
import { UserActionsSheet } from '@/components/admin/user-actions-sheet'
import { UserEditSheet } from '@/components/admin/user-edit-sheet'
import { UserDeleteModal } from '@/components/admin/user-delete-modal'
import { UserActivitySheet } from '@/components/admin/user-activity-sheet'

interface Stats {
  totalUsers: number
  activeSubscribers: number
  trialActive: number
  trialExpired: number
  newToday: number
  newLast30Days: number
  canceledLast30: number
  purchasesLast30: number
  conversionRate: number
  churnRate: number
  mrr: number
}

type Filter = 'all' | 'active' | 'trial' | 'expired'

export default function AdminPage() {
  const router = useRouter()
  const addToast = useUIStore((s) => s.addToast)
  const [stats, setStats] = useState<Stats | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  // Sheet/modal state
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showActions, setShowActions] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [showActivity, setShowActivity] = useState(false)

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

  function handleMenuOpen(user: User) {
    setSelectedUser(user)
    setShowActions(true)
  }

  async function handleToggleSubscription() {
    if (!selectedUser) return
    try {
      const newStatus = !selectedUser.assinatura_ativa
      await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.id,
          updates: {
            assinatura_ativa: newStatus,
            plano: newStatus ? 'basico' : 'trial',
          },
        }),
      })
      await fetchData()
      addToast({
        message: newStatus ? 'Conta ativada' : 'Conta desativada',
        type: 'success',
      })
    } catch {
      addToast({ message: 'Erro ao atualizar', type: 'error' })
    }
  }

  async function handleToggleTest() {
    if (!selectedUser) return
    try {
      const newValue = !selectedUser.conta_teste
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.id,
          updates: { conta_teste: newValue },
        }),
      })
      if (!res.ok) throw new Error('Falha ao atualizar')
      await fetchData()
      addToast({
        message: newValue ? 'Marcado como teste' : 'Marca de teste removida',
        type: 'success',
      })
    } catch {
      addToast({ message: 'Erro ao atualizar', type: 'error' })
    }
  }

  async function handleCancelSubscription() {
    if (!selectedUser) return
    try {
      await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.id,
          updates: { assinatura_ativa: false, plano: 'trial' },
        }),
      })
      await fetchData()
      addToast({ message: 'Assinatura cancelada', type: 'success' })
    } catch {
      addToast({ message: 'Erro ao cancelar', type: 'error' })
    }
  }

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: 'Todos' },
    { key: 'active', label: 'Ativos' },
    { key: 'trial', label: 'Trial' },
    { key: 'expired', label: 'Expirados' },
  ]

  return (
    <div className="min-h-screen bg-[#F5F7F5]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-divider">
        <div className="px-4 py-3 flex items-center gap-3 max-w-2xl mx-auto">
          <button
            onClick={() => router.push('/inicio')}
            className="p-1.5 rounded-lg hover:bg-[#F5F7F5] transition-colors"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold flex-1">Painel Admin</h1>
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-1.5 rounded-lg hover:bg-[#F5F7F5] transition-colors"
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
          <>
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

            {/* Business Metrics */}
            <BusinessMetrics
              conversionRate={stats.conversionRate}
              churnRate={stats.churnRate}
              mrr={stats.mrr}
            />
          </>
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
                  <div className="h-4 bg-[#F5F7F5] rounded w-1/3 mb-2" />
                  <div className="h-3 bg-[#F5F7F5] rounded w-2/3" />
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
              <UserCard
                key={user.id}
                user={user}
                onMenuOpen={handleMenuOpen}
              />
            ))
          )}
        </div>
      </div>

      {/* Overlays */}
      <UserActionsSheet
        open={showActions}
        onClose={() => setShowActions(false)}
        user={selectedUser}
        onToggleSubscription={handleToggleSubscription}
        onCancelSubscription={handleCancelSubscription}
        onToggleTest={handleToggleTest}
        onDelete={() => {
          setShowActions(false)
          setShowDelete(true)
        }}
        onEdit={() => {
          setShowActions(false)
          setShowEdit(true)
        }}
        onViewActivity={() => {
          setShowActions(false)
          setShowActivity(true)
        }}
      />

      <UserEditSheet
        open={showEdit}
        onClose={() => setShowEdit(false)}
        user={selectedUser}
        onSaved={fetchData}
      />

      <UserDeleteModal
        open={showDelete}
        onClose={() => setShowDelete(false)}
        userId={selectedUser?.id || null}
        userName={selectedUser?.nome || ''}
        onDeleted={fetchData}
      />

      <UserActivitySheet
        open={showActivity}
        onClose={() => setShowActivity(false)}
        userId={selectedUser?.id || null}
        userName={selectedUser?.nome || ''}
      />
    </div>
  )
}
