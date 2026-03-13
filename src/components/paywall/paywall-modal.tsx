'use client'

import { useEffect, useState } from 'react'
import { CheckIcon } from '@heroicons/react/24/solid'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth-store'
import { createClient } from '@/lib/supabase/client'
import { trackEvent } from '@/lib/analytics'
import type { Profile } from '@/types/database'

const CHECKOUT_URL = 'https://pay.cakto.com.br/qvw9jmk_792944'

const features = [
  'Clientes ilimitados',
  'IA escreve cobranças personalizadas',
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
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user?.email) setEmail(user.email)
    }
    getEmail()
    trackEvent('paywall_view')
  }, [])

  function handleAssinar() {
    trackEvent('checkout_started')
    window.location.href = buildCheckoutUrl(profile, email)
  }

  return (
    <div className="fixed inset-0 z-[100] bg-bg-app flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">
        <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-[#9FE870]/15 mb-4">
          <svg className="h-6 w-6 text-[#163300]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </div>

        <h1 className="text-xl font-semibold text-text-primary mb-1.5">
          Seu período grátis acabou
        </h1>
        <p className="text-sm text-text-secondary mb-5">
          Suas notas e clientes estão salvos e seguros.
        </p>

        <div className="bg-bg-card rounded-xl border border-divider p-4 mb-5">
          <ul className="space-y-2.5 text-left">
            {features.map((feature) => (
              <li key={feature} className="flex items-center gap-2.5">
                <div className="h-5 w-5 rounded-full bg-[#9FE870]/15 flex items-center justify-center shrink-0">
                  <CheckIcon className="h-3 w-3 text-[#2F5711]" />
                </div>
                <span className="text-sm text-text-primary">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        <Button onClick={handleAssinar} className="w-full">
          Assinar Pro · R$ 29,90/mês
        </Button>

        <p className="mt-3 text-xs text-text-muted">Cancele quando quiser</p>
      </div>
    </div>
  )
}
