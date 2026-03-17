'use client'

import { useEffect, useState } from 'react'
import { isInAppBrowser, getInAppBrowserSource, isIOS, openInDefaultBrowser } from '@/lib/browser-detect'
import { trackEvent } from '@/lib/analytics'
import { flags } from '@/lib/feature-flags'

/**
 * Banner shown when user is in an in-app browser (Instagram/Facebook).
 * Offers to open in the default browser for better session persistence.
 */
export function InAppBrowserBanner() {
  const isIAB = typeof window !== 'undefined' && flags.IN_APP_BROWSER_REDIRECT && isInAppBrowser()
  const [show, setShow] = useState(isIAB)
  const [showIOSInstructions, setShowIOSInstructions] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!isIAB) return
    const source = getInAppBrowserSource()
    trackEvent('in_app_browser_detected', { source })
  }, [isIAB])

  if (!show) return null

  function handleOpenBrowser() {
    trackEvent('in_app_browser_redirect_click')
    const success = openInDefaultBrowser()
    if (!success && isIOS()) {
      setShowIOSInstructions(true)
      setCopied(true)
    }
  }

  function handleCopyLink() {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href).then(() => {
        setCopied(true)
        trackEvent('in_app_browser_link_copied')
      })
    }
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
      <div className="flex items-start gap-3">
        <span className="text-xl shrink-0">⚠️</span>
        <div className="flex-1 min-w-0">
          {!showIOSInstructions ? (
            <>
              <p className="text-sm font-semibold text-amber-900">
                Abra no navegador para melhor experiência
              </p>
              <p className="text-xs text-amber-700 mt-1">
                Você está no navegador do {getInAppBrowserSource() === 'instagram' ? 'Instagram' : 'Facebook'}. Abrindo no Safari/Chrome sua conta ficará salva.
              </p>
              <button
                onClick={handleOpenBrowser}
                className="mt-3 w-full text-center text-sm font-semibold bg-amber-600 text-white rounded-lg py-2.5 px-4 hover:bg-amber-700 transition-colors"
              >
                Abrir no navegador padrão
              </button>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-amber-900">
                {copied ? '✅ Link copiado!' : 'Cole no Safari'}
              </p>
              <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                1. Toque nos <strong>3 pontinhos</strong> (⋯) no canto inferior direito{'\n'}
                2. Selecione <strong>&quot;Abrir no Safari&quot;</strong>{'\n'}
                {'\n'}
                Ou copie o link abaixo e cole no Safari:
              </p>
              {!copied && (
                <button
                  onClick={handleCopyLink}
                  className="mt-2 w-full text-center text-xs font-medium bg-amber-100 text-amber-800 rounded-lg py-2 px-3 border border-amber-300"
                >
                  📋 Copiar link
                </button>
              )}
            </>
          )}
          <button
            onClick={() => {
              setShow(false)
              trackEvent('in_app_browser_banner_dismissed')
            }}
            className="mt-2 w-full text-center text-xs text-amber-600 py-1"
          >
            Continuar aqui mesmo
          </button>
        </div>
      </div>
    </div>
  )
}
