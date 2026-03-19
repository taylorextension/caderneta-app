'use client'

import { Button } from '@/components/ui/button'

export default function Error({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <h2 className="text-lg font-semibold text-text-primary mb-2">
        Algo deu errado
      </h2>
      <p className="text-sm text-text-secondary mb-6">
        Ocorreu um erro inesperado. Tente novamente.
      </p>
      <Button onClick={() => reset()}>
        Tentar novamente
      </Button>
    </div>
  )
}
