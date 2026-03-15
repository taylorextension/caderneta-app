'use client'

import { useState, useEffect } from 'react'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PhoneInput } from '@/components/ui/phone-input'
import { useUIStore } from '@/stores/ui-store'
import type { User } from './user-card'

interface UserEditSheetProps {
  open: boolean
  onClose: () => void
  user: User | null
  onSaved: () => void
}

export function UserEditSheet({
  open,
  onClose,
  user,
  onSaved,
}: UserEditSheetProps) {
  const addToast = useUIStore((s) => s.addToast)
  const [nome, setNome] = useState('')
  const [nomeLoja, setNomeLoja] = useState('')
  const [telefone, setTelefone] = useState('')
  const [plano, setPlano] = useState('')
  const [trialFim, setTrialFim] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) {
      setNome(user.nome || '')
      setNomeLoja(user.nome_loja || '')
      setTelefone(user.telefone || '')
      setPlano(user.plano || '')
      setTrialFim(user.trial_fim ? user.trial_fim.split('T')[0] : '')
    }
  }, [user])

  async function handleSave() {
    if (!user) return
    try {
      setLoading(true)
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          updates: {
            nome,
            nome_loja: nomeLoja,
            telefone,
            plano,
            trial_fim: trialFim
              ? new Date(trialFim + 'T23:59:59').toISOString()
              : null,
          },
        }),
      })
      if (!res.ok) throw new Error()
      addToast({ message: 'Usuário atualizado', type: 'success' })
      onSaved()
      onClose()
    } catch {
      addToast({ message: 'Erro ao salvar', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose}>
      <h3 className="text-lg font-semibold text-[#02090A] mb-4">
        Editar Dados
      </h3>
      <div className="space-y-4">
        <Input
          label="Nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />
        <Input
          label="Nome da Loja"
          value={nomeLoja}
          onChange={(e) => setNomeLoja(e.target.value)}
        />
        <PhoneInput
          label="Telefone"
          value={telefone}
          onChange={setTelefone}
        />
        <Input
          label="Plano"
          value={plano}
          onChange={(e) => setPlano(e.target.value)}
          hint="trial, basico, pro"
        />
        <Input
          label="Fim do Trial"
          type="date"
          value={trialFim}
          onChange={(e) => setTrialFim(e.target.value)}
        />
      </div>
      <Button onClick={handleSave} loading={loading} className="w-full mt-6">
        Salvar alterações
      </Button>
    </BottomSheet>
  )
}
