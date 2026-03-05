'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { getTrialDaysRemaining } from '@/lib/subscription'

const REFRESH_INTERVAL_MS = 60000

export function useTrial() {
  const profile = useAuthStore((s) => s.profile)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!profile || profile.assinatura_ativa) return

    const interval = window.setInterval(() => {
      setNow(Date.now())
    }, REFRESH_INTERVAL_MS)

    return () => window.clearInterval(interval)
  }, [profile?.id, profile?.assinatura_ativa])

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

  const diasRestantes = getTrialDaysRemaining(profile, now)
  const trialAtivo = diasRestantes > 0

  return {
    acesso: trialAtivo,
    trialAtivo,
    trialExpirado: !trialAtivo,
    diasRestantes,
    assinaturaAtiva: false,
  }
}
