'use client'

import { useEffect, useSyncExternalStore } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { getTrialDaysRemaining } from '@/lib/subscription'

const REFRESH_INTERVAL_MS = 60000

let clientTimestamp = Date.now()

function subscribe(cb: () => void) {
  const id = window.setInterval(() => {
    clientTimestamp = Date.now()
    cb()
  }, REFRESH_INTERVAL_MS)
  return () => window.clearInterval(id)
}

function getSnapshot() {
  return clientTimestamp
}

function getServerSnapshot() {
  return 0
}

export function useTrial() {
  const profile = useAuthStore((s) => s.profile)
  const profileId = profile?.id
  const assinaturaAtiva = profile?.assinatura_ativa
  const now = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  useEffect(() => {
    clientTimestamp = Date.now()
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

  const diasRestantes = now > 0 ? getTrialDaysRemaining(profile, now) : 7
  const trialAtivo = diasRestantes > 0

  return {
    acesso: trialAtivo,
    trialAtivo,
    trialExpirado: !trialAtivo,
    diasRestantes,
    assinaturaAtiva: false,
  }
}
