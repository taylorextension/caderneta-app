'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { useUIStore } from '@/stores/ui-store'
import { PageTransition } from '@/components/layout/page-transition'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import type { Profile } from '@/types/database'

export default function LojaPage() {
  const router = useRouter()
  const { profile, setProfile } = useAuthStore()
  const addToast = useUIStore((s) => s.addToast)
  const [nomeLoja, setNomeLoja] = useState(profile?.nome_loja || '')
  const [loading, setLoading] = useState(false)

  async function handleSave() {
    if (!profile) return
    try {
      setLoading(true)
      const supabase = createClient()
      const { error } = await supabase
        .from('profiles')
        .update({ nome_loja: nomeLoja })
        .eq('id', profile.id)
      if (error) throw error
      setProfile({ ...profile, nome_loja: nomeLoja } as Profile)
      addToast({ message: 'Loja atualizada', type: 'success' })
    } catch {
      addToast({ message: 'Erro ao salvar', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageTransition>
      <div className="p-6 lg:px-0 lg:py-8 lg:max-w-lg lg:mx-auto">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-sm text-text-secondary mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Ajustes
        </button>

        <h1 className="text-xl font-semibold mb-6">Minha loja</h1>

        <Input
          label="Nome da loja"
          value={nomeLoja}
          onChange={(e) => setNomeLoja(e.target.value)}
        />

        <Button onClick={handleSave} loading={loading} className="w-full mt-8">
          Salvar
        </Button>
      </div>
    </PageTransition>
  )
}
