import * as fbq from '@/lib/fpixel'
import { captureEvent, identifyUser as phIdentify } from '@/lib/posthog'

/**
 * Track a product analytics event.
 *
 * Dual-fires to Facebook Pixel + PostHog (when enabled).
 */
export function trackEvent(
  name: string,
  properties?: Record<string, unknown>
) {
  // Facebook Pixel
  fbq.event(name, properties)

  // PostHog
  captureEvent(name, properties)

  // Console in dev for debugging
  if (process.env.NODE_ENV === 'development') {
    console.log(`[analytics] ${name}`, properties || '')
  }
}

/**
 * Identify a user after login/signup for PostHog.
 */
export function identifyUser(userId: string, properties?: Record<string, unknown>) {
  phIdentify(userId, properties)
}

