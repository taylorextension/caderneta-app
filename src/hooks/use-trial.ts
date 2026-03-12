'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { getTrialDaysRemaining } from '@/lib/subscription'

const REFRESH_INTERVAL_MS = 60000

export function useTrial() {
  const profile = useAuthStore((s) => s.profile)
  const profileId = profile?.id
  const assinaturaAtiva = profile?.assinatura_ativa
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    setNow(Date.now()) // Set immediately on client mount to bypass SSR warning
    if (!profileId || assinaturaAtiva) return

    const interval = window.setInterval(() => {
      setNow(Date.now())
    }, REFRESH_INTERVAL_MS)

    return () => window.clearInterval(interval)
  }, [profileId, assinaturaAtiva])

  if (!profile) {
    return {
      acesso: false,
      trialAtivo: false,
      trialExpirado: false,
      diasRestantes: 0,
      assinaturaAtiva: false,
    }
  }

  if (profile.assinatura_ativa) {
    return {
      acesso: true,
      trialAtivo: false,
      trialExpirado: false,
      diasRestantes: 0,
      assinaturaAtiva: true,
    }
  }

  const diasRestantes = now ? getTrialDaysRemaining(profile, now) : 7
  const trialAtivo = diasRestantes > 0

  return {
    acesso: trialAtivo,
    trialAtivo,
    trialExpirado: !trialAtivo,
    diasRestantes,
    assinaturaAtiva: false,
  }
}
