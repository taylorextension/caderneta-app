'use client'

import { useEffect } from 'react'
import { initPostHog } from '@/lib/posthog'

/**
 * Client component that initializes PostHog on mount.
 * Placed in the root layout so it runs once on app load.
 */
export function PostHogInit() {
  useEffect(() => {
    initPostHog()
  }, [])

  return null
}
