'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTrial } from '@/hooks/use-trial'
import { useAuthStore } from '@/stores/auth-store'
import { createClient } from '@/lib/supabase/client'
import { trackEvent } from '@/lib/analytics'
import { PageTransition } from '@/components/layout/page-transition'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PaywallModal } from '@/components/paywall/paywall-modal'
import { ArrowLeftIcon, CheckCircleIcon } from '@heroicons/react/24/solid'
import type { Profile } from '@/types/database'

const CHECKOUT_URL = 'https://pay.cakto.com.br/qvw9jmk_792944'

const FEATURES = [
  'Clientes ilimitados',
  'IA escreve cobranças personalizadas',
  'Histórico completo de pagamentos',
  'Saiba se abriram sua cobrança',
]

function buildCheckoutUrl(profile: Profile | null, email?: string | null) {
  const params = new URLSearchParams()

  if (profile?.nome) params.set('name', profile.nome)
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

export default function PlanoPage() {
  const router = useRouter()
  const { diasRestantes, assinaturaAtiva, acesso } = useTrial()
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
  }, [])

  if (!acesso) {
    return <PaywallModal />
  }

  // Calcular progresso (7 dias de trial)
  const DIAS_TRIAL = 7
  const diasUsados = Math.max(0, DIAS_TRIAL - diasRestantes)
  const progresso = Math.min(100, (diasUsados / DIAS_TRIAL) * 100)
  const trialAcabando =
    !assinaturaAtiva && diasRestantes <= 3 && diasRestantes > 0

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

        <h1 className="text-xl font-semibold text-text-primary mb-5">Meu plano</h1>

        {/* Card do trial / assinatura */}
        <Card>
          {assinaturaAtiva ? (
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-full bg-[#9FE870]/15 flex items-center justify-center shrink-0">
                <CheckCircleIcon className="h-5 w-5 text-[#2F5711]" />
              </div>
              <div>
                <p className="text-base font-semibold text-text-primary">
                  Plano Pro ativo
                </p>
                <p className="text-sm text-text-secondary mt-1">
                  Seu acesso está liberado. Aproveite todos os recursos.
                </p>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm font-semibold text-text-primary mb-3">
                Período grátis
              </p>

              <div className="h-1.5 bg-[#D6D8D6] rounded-full w-full mb-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all ${
                    trialAcabando ? 'bg-[#A8200D]' : 'bg-[#9FE870]'
                  }`}
                  style={{ width: `${progresso}%` }}
                />
              </div>

              <p className="text-xs text-text-muted">
                {diasRestantes} {diasRestantes === 1 ? 'dia restante' : 'dias restantes'}
              </p>
            </>
          )}
        </Card>

        {/* O que está incluso */}
        <div className="mt-5">
          <p className="text-sm font-semibold text-text-primary mb-2.5">
            O que está incluso:
          </p>
          <Card>
            <div className="space-y-2.5">
              {FEATURES.map((feature) => (
                <div key={feature} className="flex items-center gap-2.5">
                  <div className="h-5 w-5 rounded-full bg-[#9FE870]/15 flex items-center justify-center shrink-0">
                    <CheckCircleIcon className="h-3 w-3 text-[#2F5711]" />
                  </div>
                  <span className="text-sm text-text-primary">{feature}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Card de preço */}
        {!assinaturaAtiva && (
          <Card className="mt-5">
            <div className="text-center py-1">
              <p className="text-2xl font-bold text-text-primary">
                R$ 29,90<span className="text-sm font-medium text-text-muted">/mês</span>
              </p>
              <p className="text-xs text-text-muted mt-1">
                Cancele quando quiser.
              </p>

              <Button
                onClick={() => {
                  trackEvent('upgrade_cta_clicked')
                  window.location.href = buildCheckoutUrl(profile, email)
                }}
                className="w-full mt-4"
              >
                Assinar Pro
              </Button>
            </div>
          </Card>
        )}
      </div>
    </PageTransition>
  )
}
