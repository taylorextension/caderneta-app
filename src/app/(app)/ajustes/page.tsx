'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { useUIStore } from '@/stores/ui-store'
import { useTrial } from '@/hooks/use-trial'
import { PageTransition } from '@/components/layout/page-transition'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import {
  UserIcon,
  BuildingStorefrontIcon,
  QrCodeIcon,
  CreditCardIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline'

const menuItems = [
  { href: '/ajustes/dados', icon: UserIcon, label: 'Meus dados' },
  { href: '/ajustes/loja', icon: BuildingStorefrontIcon, label: 'Minha loja' },
  { href: '/ajustes/pix', icon: QrCodeIcon, label: 'Chave Pix' },
  { href: '/ajustes/plano', icon: CreditCardIcon, label: 'Meu plano' },
]

export default function AjustesPage() {
  const router = useRouter()
  const { setProfile } = useAuthStore()
  const addToast = useUIStore((s) => s.addToast)
  const { trialAtivo, diasRestantes } = useTrial()
  const [showLogout, setShowLogout] = useState(false)

  async function handleLogout() {
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      setProfile(null)
      router.push('/login')
    } catch {
      addToast({ message: 'Erro ao sair', type: 'error' })
    }
  }

  return (
    <PageTransition>
      <div className="p-6">
        <h1 className="text-xl font-semibold mb-6">Ajustes</h1>

        {trialAtivo && (
          <p className="text-xs text-text-secondary mb-4">
            {diasRestantes} dias restantes no período grátis
          </p>
        )}

        <Card className="divide-y divide-divider">
          {menuItems.map((item) => (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className="w-full flex items-center gap-3 py-3"
            >
              <item.icon className="h-5 w-5 text-text-secondary" />
              <span className="flex-1 text-sm font-medium text-left">
                {item.label}
              </span>
              <ChevronRightIcon className="h-4 w-4 text-text-muted" />
            </button>
          ))}
        </Card>

        <Button
          variant="danger"
          onClick={() => setShowLogout(true)}
          className="w-full mt-8"
        >
          Sair da conta
        </Button>
      </div>

      <Modal open={showLogout} onClose={() => setShowLogout(false)}>
        <h3 className="text-lg font-semibold mb-2">Sair da conta</h3>
        <p className="text-sm text-text-secondary mb-6">
          Tem certeza que deseja sair?
        </p>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => setShowLogout(false)}
          >
            Cancelar
          </Button>
          <Button variant="danger" className="flex-1" onClick={handleLogout}>
            Sair
          </Button>
        </div>
      </Modal>
    </PageTransition>
  )
}
