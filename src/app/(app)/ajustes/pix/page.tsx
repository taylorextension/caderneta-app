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

const pixTipos = [
  { value: 'cpf', label: 'CPF' },
  { value: 'cnpj', label: 'CNPJ' },
  { value: 'email', label: 'Email' },
  { value: 'telefone', label: 'Telefone' },
  { value: 'aleatoria', label: 'Chave aleatória' },
]

export default function PixPage() {
  const router = useRouter()
  const { profile, setProfile } = useAuthStore()
  const addToast = useUIStore((s) => s.addToast)
  const [pixTipo, setPixTipo] = useState<string>(profile?.pix_tipo || 'cpf')
  const [pixChave, setPixChave] = useState(profile?.pix_chave || '')
  const [pixNome, setPixNome] = useState(profile?.pix_nome || '')
  const [pixCidade, setPixCidade] = useState(profile?.pix_cidade || 'SAO PAULO')
  const [loading, setLoading] = useState(false)

  async function handleSave() {
    if (!profile) return
    try {
      setLoading(true)
      const supabase = createClient()
      const { error } = await supabase
        .from('profiles')
        .update({
          pix_tipo: pixTipo,
          pix_chave: pixChave || null,
          pix_nome: pixNome || null,
          pix_cidade: pixCidade,
        })
        .eq('id', profile.id)
      if (error) throw error
      setProfile({
        ...profile,
        pix_tipo: pixTipo as Profile['pix_tipo'],
        pix_chave: pixChave || null,
        pix_nome: pixNome || null,
        pix_cidade: pixCidade,
      })
      addToast({ message: 'Chave Pix salva', type: 'success' })
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

        <h1 className="text-xl font-semibold mb-6">Chave Pix</h1>

        <div className="space-y-6">
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">
              Tipo da chave
            </label>
            <select
              value={pixTipo}
              onChange={(e) => setPixTipo(e.target.value)}
              className="h-12 w-full bg-transparent border-b border-border text-base outline-none focus:border-b-black rounded-none"
            >
              {pixTipos.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Chave Pix"
            value={pixChave}
            onChange={(e) => setPixChave(e.target.value)}
            placeholder="Digite sua chave"
          />

          <Input
            label="Nome do beneficiário"
            value={pixNome}
            onChange={(e) => setPixNome(e.target.value)}
            placeholder="Nome que aparece no Pix"
          />

          <Input
            label="Cidade"
            value={pixCidade}
            onChange={(e) => setPixCidade(e.target.value)}
            placeholder="Sua cidade"
          />
        </div>

        <Button onClick={handleSave} loading={loading} className="w-full mt-8">
          Salvar
        </Button>
      </div>
    </PageTransition>
  )
}
