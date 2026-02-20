'use client'

import { useAuthStore } from '@/stores/auth-store'

export function useTrial() {
  const profile = useAuthStore((s) => s.profile)

  if (!profile) {
    return { acesso: false, trialAtivo: false, diasRestantes: 0, assinaturaAtiva: false }
  }

  const trialFim = new Date(profile.trial_fim)
  const hoje = new Date()
  const diasRestantes = Math.ceil((trialFim.getTime() - hoje.getTime()) / 86400000)
  const trialAtivo = diasRestantes > 0
  const acesso = trialAtivo || profile.assinatura_ativa

  return { acesso, trialAtivo, diasRestantes, assinaturaAtiva: profile.assinatura_ativa }
}
