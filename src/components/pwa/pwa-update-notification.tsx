'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ArrowPathIcon, XMarkIcon } from '@heroicons/react/24/outline'

export function PwaUpdateNotification() {
    const [updateAvailable, setUpdateAvailable] = useState(false)

    useEffect(() => {
        if (!('serviceWorker' in navigator)) return

        async function checkForUpdates() {
            try {
                const registration = await navigator.serviceWorker.getRegistration()
                if (!registration) return

                // Check for waiting worker (update already downloaded)
                if (registration.waiting) {
                    setUpdateAvailable(true)
                    return
                }

                // Listen for new worker installations
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing
                    if (!newWorker) return

                    newWorker.addEventListener('statechange', () => {
                        if (
                            newWorker.state === 'installed' &&
                            navigator.serviceWorker.controller
                        ) {
                            // New content available
                            setUpdateAvailable(true)
                        }
                    })
                })

                // Also listen for controller change (update activated)
                let refreshing = false
                navigator.serviceWorker.addEventListener('controllerchange', () => {
                    if (!refreshing) {
                        refreshing = true
                        window.location.reload()
                    }
                })
            } catch {
                // Silently fail
            }
        }

        checkForUpdates()
    }, [])

    function handleUpdate() {
        navigator.serviceWorker.getRegistration().then((registration) => {
            if (registration?.waiting) {
                registration.waiting.postMessage({ type: 'SKIP_WAITING' })
            }
        })
    }

    return (
        <AnimatePresence>
            {updateAvailable && (
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 50 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="fixed bottom-24 left-4 right-4 z-[150] lg:left-auto lg:right-8 lg:bottom-8 lg:max-w-sm"
                >
                    <div className="bg-[#02090A] text-white rounded-2xl p-4 flex items-center gap-3 shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
                        <div className="shrink-0 h-9 w-9 rounded-xl bg-white/10 flex items-center justify-center">
                            <ArrowPathIcon className="h-4 w-4" />
                        </div>

                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold">Nova versão disponível</p>
                            <p className="text-xs text-white/60 mt-0.5">
                                Toque para atualizar o app
                            </p>
                        </div>

                        <button
                            onClick={handleUpdate}
                            className="shrink-0 bg-white text-[#02090A] text-xs font-semibold px-4 py-2 rounded-full hover:bg-white/90 transition-colors"
                        >
                            Atualizar
                        </button>

                        <button
                            onClick={() => setUpdateAvailable(false)}
                            className="shrink-0 p-1 rounded-full hover:bg-white/10 transition-colors"
                            aria-label="Fechar"
                        >
                            <XMarkIcon className="h-4 w-4 text-white/60" />
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
