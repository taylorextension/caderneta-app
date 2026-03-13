'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { usePwaInstall } from '@/hooks/use-pwa-install'
import { trackEvent } from '@/lib/analytics'
import { Button } from '@/components/ui/button'
import {
  DevicePhoneMobileIcon,
  ArrowUpOnSquareIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline'

export function PwaInstallButton() {
  const { canShowBanner, isIos, hasNativePrompt, triggerInstall } =
    usePwaInstall()
  const [showIosModal, setShowIosModal] = useState(false)

  if (!canShowBanner) return null

  return (
    <>
      <motion.button
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 22, delay: 0.4 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => {
          trackEvent('pwa_install_clicked')
          if (hasNativePrompt) {
            triggerInstall()
          } else if (isIos) {
            setShowIosModal(true)
          }
        }}
        className="flex items-center gap-2 px-3.5 py-2 bg-[#02090A] text-white rounded-full shadow-[0_2px_10px_rgba(0,0,0,0.15)]"
      >
        <ArrowDownTrayIcon className="h-4 w-4" />
        <span className="text-xs font-semibold whitespace-nowrap">
          Instalar app
        </span>
      </motion.button>

      {/* iOS instruction modal */}
      <AnimatePresence>
        {showIosModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-[#163300]/50 flex items-end justify-center p-4"
            onClick={() => setShowIosModal(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white rounded-2xl overflow-hidden"
            >
              <div className="px-6 pt-6 pb-4 text-center border-b border-divider">
                <div className="mx-auto h-12 w-12 rounded-2xl bg-[#F5F7F5] flex items-center justify-center mb-3">
                  <DevicePhoneMobileIcon className="h-6 w-6 text-[#02090A]" />
                </div>
                <h2 className="text-lg font-semibold text-[#02090A]">
                  Instalar Caderneta
                </h2>
                <p className="text-sm text-[#6B7280] mt-1">
                  Adicione à tela inicial em 3 passos
                </p>
              </div>

              <div className="px-6 py-5 space-y-5">
                <div className="flex items-start gap-4">
                  <div className="shrink-0 h-8 w-8 rounded-full bg-[#02090A] text-white flex items-center justify-center text-sm font-bold">
                    1
                  </div>
                  <div className="flex-1 pt-1">
                    <p className="text-sm text-[#02090A]">
                      Toque no ícone{' '}
                      <ArrowUpOnSquareIcon className="inline h-4 w-4 text-[#007AFF] -mt-0.5" />{' '}
                      <span className="font-semibold">Compartilhar</span> na
                      barra do navegador
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="shrink-0 h-8 w-8 rounded-full bg-[#02090A] text-white flex items-center justify-center text-sm font-bold">
                    2
                  </div>
                  <div className="flex-1 pt-1">
                    <p className="text-sm text-[#02090A]">
                      Role a lista e toque em{' '}
                      <span className="font-semibold">
                        &quot;Adicionar à Tela de Início&quot;
                      </span>
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="shrink-0 h-8 w-8 rounded-full bg-[#02090A] text-white flex items-center justify-center text-sm font-bold">
                    3
                  </div>
                  <div className="flex-1 pt-1">
                    <p className="text-sm text-[#02090A]">
                      Toque em{' '}
                      <span className="font-semibold">
                        &quot;Adicionar&quot;
                      </span>{' '}
                      no canto superior direito
                    </p>
                  </div>
                </div>
              </div>

              <div className="px-6 pb-6 pt-2">
                <Button
                  onClick={() => setShowIosModal(false)}
                  className="w-full"
                >
                  Entendi
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
