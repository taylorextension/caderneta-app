const DAY_IN_MS = 86400000

export interface AccessProfile {
  assinatura_ativa: boolean
  trial_fim: string | null
}

export function getTrialTimeLeftMs(profile: AccessProfile | null | undefined, nowMs = Date.now()) {
  if (!profile || profile.assinatura_ativa || !profile.trial_fim) {
    return 0
  }

  const trialFimMs = new Date(profile.trial_fim).getTime()
  if (!Number.isFinite(trialFimMs)) {
    return 0
  }

  return Math.max(0, trialFimMs - nowMs)
}

export function getTrialDaysRemaining(profile: AccessProfile | null | undefined, nowMs = Date.now()) {
  const timeLeftMs = getTrialTimeLeftMs(profile, nowMs)

  if (timeLeftMs <= 0) {
    return 0
  }

  return Math.ceil(timeLeftMs / DAY_IN_MS)
}

export function hasAppAccess(profile: AccessProfile | null | undefined, nowMs = Date.now()) {
  if (!profile) {
    return false
  }

  return profile.assinatura_ativa || getTrialTimeLeftMs(profile, nowMs) > 0
}
