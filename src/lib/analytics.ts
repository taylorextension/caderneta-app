import * as fbq from '@/lib/fpixel'

/**
 * Track a product analytics event.
 *
 * Currently fires via Facebook Pixel.
 * Can be extended to log to a Supabase analytics_events table
 * or any other provider (Mixpanel, Amplitude, PostHog, etc.).
 */
export function trackEvent(
  name: string,
  properties?: Record<string, unknown>
) {
  // Facebook Pixel
  fbq.event(name, properties)

  // Console in dev for debugging
  if (process.env.NODE_ENV === 'development') {
    console.log(`[analytics] ${name}`, properties || '')
  }
}
