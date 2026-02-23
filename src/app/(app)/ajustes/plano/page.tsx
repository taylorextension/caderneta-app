'use client'

import { useRouter } from 'next/navigation'
import { useTrial } from '@/hooks/use-trial'
import { useAuthStore } from '@/stores/auth-store'
import { useUIStore } from '@/stores/ui-store'
import { PageTransition } from '@/components/layout/page-transition'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PaywallModal } from '@/components/paywall/paywall-modal'
import { ArrowLeftIcon, CheckCircleIcon } from '@heroicons/react/24/solid'

const FEATURES = [
  'Clientes ilimitados',
  'IA escreve cobranças',
  'Escaneia notas com câmera',
  'Pix automático com QR Code',
  'Saiba se abriram sua cobrança',
  'Suporte via WhatsApp',
]

export default function PlanoPage() {
  const router = useRouter()
  const addToast = useUIStore((s) => s.addToast)
  const { trialAtivo, diasRestantes, assinaturaAtiva, acesso } = useTrial()

  if (!acesso) {
    return <PaywallModal />
  }

  // Calcular progresso (14 dias de trial)
  const DIAS_TRIAL = 14
  const diasUsados = Math.max(0, DIAS_TRIAL - diasRestantes)
  const progresso = Math.min(100, (diasUsados / DIAS_TRIAL) * 100)
  const trialAcabando = diasRestantes <= 3 && diasRestantes > 0
  const trialVencido = diasRestantes <= 0

  return (
    <PageTransition>
      <div className="p-6">
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
          <p className="text-base font-semibold text-[#02090A] mb-4">
            {trialVencido ? 'Período grátis encerrado' : 'Período grátis'}
          </p>

          {/* Progress bar */}
          <div className="h-2 bg-zinc-200 rounded-full w-full mb-2">
            <div
              className={`h-2 rounded-full transition-all ${trialVencido || trialAcabando ? 'bg-red-500' : 'bg-black'
                }`}
              style={{ width: `${trialVencido ? 100 : progresso}%` }}
            />
          </div>

          <p className="text-xs text-[#6B7280] mb-4">
            {trialVencido
              ? 'Seu período grátis acabou'
              : `${diasRestantes} dias restantes`}
          </p>

          <p className="text-sm text-[#6B7280]">
            Todos os recursos estão liberados durante o período grátis.
          </p>
        </Card>

        {/* O que está incluso */}
        <div className="mt-6">
          <p className="text-sm font-semibold text-[#02090A] mb-3">O que está incluso:</p>
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
        <Card className={trialVencido ? 'mt-8' : 'mt-6'}>
          <div className="text-center py-2">
            <p className="text-2xl font-bold text-[#02090A]">R$ 29,90/mês</p>
            <p className="text-xs text-[#9CA3AF] mt-1">Cancele quando quiser.</p>

            <Button
              onClick={() =>
                addToast({
                  message: 'Em breve! Pagamento em implementação.',
                  type: 'info',
                })
              }
              className="w-full mt-4"
            >
              Assinar agora
            </Button>
          </div>
        </Card>
      </div>
    </PageTransition>
  )
}
