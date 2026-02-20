'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { useUIStore } from '@/stores/ui-store'
import { PageTransition } from '@/components/layout/page-transition'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PhoneInput } from '@/components/ui/phone-input'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import type { Profile } from '@/types/database'

export default function DadosPage() {
  const router = useRouter()
  const { profile, setProfile } = useAuthStore()
  const addToast = useUIStore((s) => s.addToast)
  const [nome, setNome] = useState(profile?.nome || '')
  const [telefone, setTelefone] = useState(profile?.telefone || '')
  const [loading, setLoading] = useState(false)

  async function handleSave() {
    if (!profile) return
    try {
      setLoading(true)
      const supabase = createClient()
      const { error } = await supabase
        .from('profiles')
        .update({ nome, telefone })
        .eq('id', profile.id)
      if (error) throw error
      setProfile({ ...profile, nome, telefone } as Profile)
      addToast({ message: 'Dados salvos', type: 'success' })
    } catch {
      addToast({ message: 'Erro ao salvar', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageTransition>
      <div className="p-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-sm text-text-secondary mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Ajustes
        </button>

        <h1 className="text-xl font-semibold mb-6">Meus dados</h1>

        <div className="space-y-6">
          <Input
            label="Nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
          <PhoneInput
            label="Telefone"
            value={telefone}
            onChange={setTelefone}
          />
        </div>

        <Button onClick={handleSave} loading={loading} className="w-full mt-8">
          Salvar
        </Button>
      </div>
    </PageTransition>
  )
}
