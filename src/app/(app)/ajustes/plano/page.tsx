'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTrial } from '@/hooks/use-trial'
import { useAuthStore } from '@/stores/auth-store'
import { createClient } from '@/lib/supabase/client'
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
  'Escaneia notas com câmera',
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

  // Calcular progresso (14 dias de trial)
  const DIAS_TRIAL = 14
  const diasUsados = Math.max(0, DIAS_TRIAL - diasRestantes)
  const progresso = Math.min(100, (diasUsados / DIAS_TRIAL) * 100)
  const trialAcabando =
    !assinaturaAtiva && diasRestantes <= 3 && diasRestantes > 0

  return (
    <PageTransition>
      <div className="p-6 lg:px-0 lg:py-8 lg:max-w-lg lg:mx-auto">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-sm text-[#6B7280] mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Ajustes
        </button>

        <h1 className="text-xl font-semibold text-[#02090A] mb-6">Meu plano</h1>

        {/* Card do trial */}
        <Card>
          {assinaturaAtiva ? (
            <>
              <p className="text-base font-semibold text-[#02090A] mb-2">
                Assinatura ativa
              </p>
              <p className="text-sm text-[#6B7280]">
                Seu acesso está liberado. O app não vai mais exibir contagem do
                período grátis enquanto a assinatura estiver ativa.
              </p>
            </>
          ) : (
            <>
              <p className="text-base font-semibold text-[#02090A] mb-4">
                Período grátis
              </p>

              <div className="h-2 bg-zinc-200 rounded-full w-full mb-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    trialAcabando ? 'bg-red-500' : 'bg-black'
                  }`}
                  style={{ width: `${progresso}%` }}
                />
              </div>

              <p className="text-xs text-[#6B7280] mb-4">
                {diasRestantes} dias restantes
              </p>

              <p className="text-sm text-[#6B7280]">
                Todos os recursos estão liberados durante o período grátis.
              </p>
            </>
          )}
        </Card>

        {/* O que está incluso */}
        <div className="mt-6">
          <p className="text-sm font-semibold text-[#02090A] mb-3">
            O que está incluso:
          </p>
          <Card>
            <div className="space-y-3">
              {FEATURES.map((feature) => (
                <div key={feature} className="flex items-center gap-3">
                  <CheckCircleIcon className="h-5 w-5 text-black shrink-0" />
                  <span className="text-sm text-[#02090A]">{feature}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Card de preço */}
        {!assinaturaAtiva && (
          <Card className="mt-6">
            <div className="text-center py-2">
              <p className="text-2xl font-bold text-[#02090A]">R$ 29,90/mês</p>
              <p className="text-xs text-[#9CA3AF] mt-1">
                Cancele quando quiser.
              </p>

              <Button
                onClick={() => {
                  window.location.href = buildCheckoutUrl(profile, email)
                }}
                className="w-full mt-4"
              >
                Assinar agora
              </Button>
            </div>
          </Card>
        )}
      </div>
    </PageTransition>
  )
}
