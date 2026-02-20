import type { Profile } from '@/types/database'

type ProfileLike = Partial<Pick<Profile, 'nome_loja' | 'onboarding_completo'>>

export function isOnboardingComplete(profile: ProfileLike | null | undefined) {
  if (!profile) return false

  const hasStoreName = Boolean(profile.nome_loja && profile.nome_loja.trim().length > 0)

  if (typeof profile.onboarding_completo === 'boolean') {
    // Fallback: in case legacy rows were not updated yet
    return profile.onboarding_completo || hasStoreName
  }

  return hasStoreName
}
