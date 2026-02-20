'use client'

import { useRouter } from 'next/navigation'
import { useTrial } from '@/hooks/use-trial'
import { useAuthStore } from '@/stores/auth-store'
import { PageTransition } from '@/components/layout/page-transition'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { PaywallModal } from '@/components/paywall/paywall-modal'
import { ArrowLeftIcon, CheckIcon } from '@heroicons/react/24/outline'

export default function PlanoPage() {
  const router = useRouter()
  const profile = useAuthStore((s) => s.profile)
  const { trialAtivo, diasRestantes, assinaturaAtiva, acesso } = useTrial()

  if (!acesso) {
    return <PaywallModal />
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

        <h1 className="text-xl font-semibold mb-6">Meu plano</h1>

        <Card>
          {assinaturaAtiva ? (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <CheckIcon className="h-5 w-5 text-success" />
                <span className="text-sm font-semibold">Plano Pro ativo</span>
              </div>
              <p className="text-sm text-text-secondary">
                R$ 29,90/mês · Todos os recursos liberados
              </p>
            </div>
          ) : trialAtivo ? (
            <div>
              <p className="text-sm font-semibold mb-1">Período grátis</p>
              <p className="text-sm text-text-secondary">
                {diasRestantes} dias restantes · Todos os recursos liberados
              </p>
              <p className="text-xs text-text-muted mt-2">
                Após o período grátis: R$ 29,90/mês
              </p>
            </div>
          ) : (
            <div>
              <p className="text-sm font-semibold mb-1">Período grátis encerrado</p>
              <Button className="w-full mt-4">Assinar · R$ 29,90/mês</Button>
            </div>
          )}
        </Card>
      </div>
    </PageTransition>
  )
}
