/**
 * Feature flags via environment variables.
 * Toggle features without redeploy by changing env vars in Vercel/local.
 *
 * Usage:
 *   import { flags } from '@/lib/feature-flags'
 *   if (flags.OTP_LOGIN) { ... }
 */
export const flags = {
  /** Login por telefone com OTP */
  OTP_LOGIN: process.env.NEXT_PUBLIC_FF_OTP_LOGIN === 'true',

  /** Detecção e redirect de in-app browser */
  IN_APP_BROWSER_REDIRECT: process.env.NEXT_PUBLIC_FF_IAB_REDIRECT === 'true',

  /** PostHog analytics */
  POSTHOG: process.env.NEXT_PUBLIC_FF_POSTHOG === 'true',
}
