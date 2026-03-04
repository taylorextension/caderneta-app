'use client'

import { useCallback, useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function usePwaInstall() {
    const [deferredPrompt, setDeferredPrompt] =
        useState<BeforeInstallPromptEvent | null>(null)
    const [isInstalled, setIsInstalled] = useState(false)
    const [isIos, setIsIos] = useState(false)

    useEffect(() => {
        // Check if already installed as PWA
        const isStandalone =
            window.matchMedia('(display-mode: standalone)').matches ||
            (navigator as any).standalone === true

        if (isStandalone) {
            setIsInstalled(true)
            return
        }

        // Detect iOS
        const ua = navigator.userAgent
        const iosDevice = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream
        setIsIos(iosDevice)

        // Listen for the native install prompt (Chrome / Edge / Samsung on Android)
        const handler = (e: Event) => {
            e.preventDefault()
            setDeferredPrompt(e as BeforeInstallPromptEvent)
        }

        window.addEventListener('beforeinstallprompt', handler)

        // Detect when installed
        const installedHandler = () => setIsInstalled(true)
        window.addEventListener('appinstalled', installedHandler)

        return () => {
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
