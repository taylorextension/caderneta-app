'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { useUIStore } from '@/stores/ui-store'
import type { Cliente } from '@/types/database'

export function useClientes() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const profile = useAuthStore((s) => s.profile)
  const addToast = useUIStore((s) => s.addToast)

  const fetch = useCallback(async () => {
    if (!profile) return
    try {
      setLoading(true)
      const supabase = createClient()
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('user_id', profile.id)
        .eq('ativo', true)
        .order('created_at', { ascending: false })
      if (error) throw error
      setClientes(data || [])
    } catch {
      addToast({ message: 'Erro ao carregar clientes', type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [profile, addToast])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { clientes, loading, refetch: fetch }
}
