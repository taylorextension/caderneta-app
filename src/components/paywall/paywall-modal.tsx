'use client'

import { CheckIcon } from '@heroicons/react/24/solid'
import { Button } from '@/components/ui/button'

const features = [
  'Clientes ilimitados',
  'IA escreve cobranças',
  'Escaneia notas com câmera',
  'Pix automático',
  'Saiba se abriram sua cobrança',
]

export function PaywallModal() {
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

        <Button className="w-full">Assinar · R$ 29,90/mês</Button>

        <p className="mt-4 text-xs text-text-muted">
          Cancele quando quiser
        </p>
      </div>
    </div>
  )
}
