'use client'

import { useEffect, useState } from 'react'
import { CheckIcon } from '@heroicons/react/24/solid'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth-store'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types/database'

const CHECKOUT_URL = 'https://pay.cakto.com.br/qvw9jmk_792944'

const features = [
  'Clientes ilimitados',
  'IA escreve cobranças personalizadas',
  'Escaneia notas com câmera',
  'Histórico completo de pagamentos',
  'Saiba se abriram sua cobrança',
]

function buildCheckoutUrl(profile: Profile | null, email?: string | null) {
  const params = new URLSearchParams()

  // Nome completo
  if (profile?.nome) params.set('name', profile.nome)

  // Email
  if (email) params.set('email', email)

  // CPF — se a chave PIX for CPF, já preenche
  if (profile?.pix_tipo === 'cpf' && profile.pix_chave) {
    params.set('cpf', profile.pix_chave.replace(/\D/g, ''))
  }

  // Telefone — já vem em formato E.164 (ex: +5511999999999, +15551234567)
  if (profile?.telefone) {
    const digits = profile.telefone.replace(/\D/g, '')
    params.set('phone', digits)
  }

  const qs = params.toString()
  return qs ? `${CHECKOUT_URL}?${qs}` : CHECKOUT_URL
}

export function PaywallModal() {
  const profile = useAuthStore((s) => s.profile)
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    async function getEmail() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) setEmail(user.email)
    }
    getEmail()
  }, [])

  function handleAssinar() {
    window.location.href = buildCheckoutUrl(profile, email)
  }

  return (
    <div className="fixed inset-0 z-[60] bg-white flex items-center justify-center p-6">
      <div className="w-full max-w-sm lg:max-w-md text-center">
        <h1 className="text-xl font-semibold text-text-primary mb-3">
          Seu período grátis acabou
        </h1>
        <p className="text-sm text-text-secondary mb-8">
          Suas notas e clientes estão todos salvos e seguros.
        </p>

        <ul className="space-y-3 mb-8 text-left">
          {features.map((feature) => (
            <li key={feature} className="flex items-center gap-3">
              <CheckIcon className="h-5 w-5 text-success shrink-0" />
              <span className="text-sm text-text-primary">{feature}</span>
            </li>
          ))}
        </ul>

        <Button onClick={handleAssinar} className="w-full">
          Assinar · R$ 29,90/mês
        </Button>

        <p className="mt-4 text-xs text-text-muted">
          Cancele quando quiser
        </p>
      </div>
    </div>
  )
}
