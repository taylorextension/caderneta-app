type FbqFunction = (
  action: 'track',
  eventName: string,
  options?: Record<string, unknown>
) => void

declare global {
  interface Window {
    fbq?: FbqFunction
  }
}

export const FB_PIXEL_ID = '939207998788541'

export const pageview = () => {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', 'PageView')
  }
}

// https://developers.facebook.com/docs/facebook-pixel/advanced/
export const event = (name: string, options: Record<string, unknown> = {}) => {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', name, options)
  }
}
