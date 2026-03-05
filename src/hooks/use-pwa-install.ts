'use client'

import { useCallback, useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean
}

interface WindowWithMSStream extends Window {
  MSStream?: unknown
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(() => {
    if (typeof window === 'undefined') return false

    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as NavigatorWithStandalone).standalone === true
    )
  })
  const [isIos] = useState(() => {
    if (typeof window === 'undefined') return false

    const ua = navigator.userAgent
    return (
      /iPad|iPhone|iPod/.test(ua) && !(window as WindowWithMSStream).MSStream
    )
  })

  useEffect(() => {
    // Listen for the native install prompt (Chrome / Edge / Samsung on Android)
    const displayMode = window.matchMedia('(display-mode: standalone)')
    const displayModeHandler = (event: MediaQueryListEvent) => {
      if (event.matches) {
        setIsInstalled(true)
      }
    }
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    displayMode.addEventListener('change', displayModeHandler)
    window.addEventListener('beforeinstallprompt', handler)

    // Detect when installed
    const installedHandler = () => {
      setIsInstalled(true)
      setDeferredPrompt(null)
    }
    window.addEventListener('appinstalled', installedHandler)

    return () => {
      displayMode.removeEventListener('change', displayModeHandler)
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', installedHandler)
    }
  }, [])

  const triggerInstall = useCallback(async () => {
    if (!deferredPrompt) return false
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setIsInstalled(true)
      setDeferredPrompt(null)
      return true
    }
    return false
  }, [deferredPrompt])

  const canShowBanner = !isInstalled && (!!deferredPrompt || isIos)

  return {
    canShowBanner,
    isIos,
    isInstalled,
    hasNativePrompt: !!deferredPrompt,
    triggerInstall,
  }
}
