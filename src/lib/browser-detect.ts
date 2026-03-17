/**
 * In-app browser detection and redirect utilities.
 *
 * Instagram/Facebook in-app browsers don't persist cookies/session
 * reliably, causing users to lose access after closing the app.
 */

/** Detect if current browser is an in-app browser (Instagram, Facebook, etc.) */
export function isInAppBrowser(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  return /FBAN|FBAV|Instagram|Line|Snapchat|Twitter|LinkedInApp|MicroMessenger/i.test(ua)
}

/** Detect specific in-app browser source */
export function getInAppBrowserSource(): 'instagram' | 'facebook' | 'other' | null {
  if (typeof navigator === 'undefined') return null
  const ua = navigator.userAgent || ''
  if (/Instagram/i.test(ua)) return 'instagram'
  if (/FBAN|FBAV/i.test(ua)) return 'facebook'
  if (/Line|Snapchat|Twitter|LinkedInApp|MicroMessenger/i.test(ua)) return 'other'
  return null
}

/** Detect if running on iOS */
export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iPhone|iPad|iPod/i.test(navigator.userAgent)
}

/** Detect if running on Android */
export function isAndroid(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Android/i.test(navigator.userAgent)
}

/**
 * Try to open the current URL in the device's default browser.
 *
 * - Android: uses intent:// scheme which works reliably
 * - iOS: no reliable way to force open Safari from in-app browser,
 *   so we fall back to showing instructions to the user
 *
 * @returns true if redirect was attempted, false if fallback needed
 */
export function openInDefaultBrowser(url?: string): boolean {
  const targetUrl = url || window.location.href

  if (isAndroid()) {
    // Android intent:// scheme opens in default browser
    const intentUrl = `intent://${targetUrl.replace(/^https?:\/\//, '')}#Intent;scheme=https;end`
    window.location.href = intentUrl
    return true
  }

  // iOS: try x-safari-https scheme (works on some versions)
  if (isIOS()) {
    // Fallback: copy URL to clipboard and show instructions
    if (navigator.clipboard) {
      navigator.clipboard.writeText(targetUrl).catch(() => {
        // Clipboard API may fail in in-app browsers, ignore
      })
    }
    return false // Signal that we need to show manual instructions
  }

  // Desktop or unknown: just open in new tab
  window.open(targetUrl, '_blank')
  return true
}
