'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { useUIStore } from '@/stores/ui-store'
import type { Nota } from '@/types/database'

export function useNotas(clienteId?: string) {
  const [notas, setNotas] = useState<Nota[]>([])
  const [loading, setLoading] = useState(true)
  const profile = useAuthStore((s) => s.profile)
  const addToast = useUIStore((s) => s.addToast)

  const fetch = useCallback(async () => {
    if (!profile) return
    try {
      setLoading(true)
      const supabase = createClient()
      let query = supabase
        .from('notas')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })

      if (clienteId) {
        query = query.eq('cliente_id', clienteId)
      }

      const { data, error } = await query
      if (error) throw error
      setNotas(data || [])
    } catch {
      addToast({ message: 'Erro ao carregar notas', type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [profile, clienteId, addToast])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { notas, loading, refetch: fetch }
}
