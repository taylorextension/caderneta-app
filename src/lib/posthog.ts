'use client'

import posthog from 'posthog-js'
import { flags } from '@/lib/feature-flags'

let initialized = false

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY || ''
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'

/**
 * Initialize PostHog. Safe to call multiple times — only initializes once.
 */
export function initPostHog() {
  if (!flags.POSTHOG || initialized || !POSTHOG_KEY || typeof window === 'undefined') return

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    person_profiles: 'identified_only',
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: false,        // Disable to reduce noise; we track manually
    persistence: 'localStorage', // More reliable than cookies in in-app browsers
    loaded: () => {
      initialized = true
    },
  })
}

/**
 * Identify a user after login/signup.
 */
export function identifyUser(userId: string, properties?: Record<string, unknown>) {
  if (!flags.POSTHOG || !initialized) return
  posthog.identify(userId, properties)
}

/**
 * Track a product event.
 */
export function captureEvent(eventName: string, properties?: Record<string, unknown>) {
  if (!flags.POSTHOG || !initialized) return
  posthog.capture(eventName, properties)
}

/**
 * Reset user identity (on logout).
 */
export function resetPostHog() {
  if (!flags.POSTHOG || !initialized) return
  posthog.reset()
}
