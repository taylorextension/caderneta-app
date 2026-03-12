'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'motion/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { useTutorialStore } from '@/stores/tutorial-store'
import { trackEvent } from '@/lib/analytics'

export type TutorialStep = {
  targetId: string
  title: string
  description: string
  placement: 'top' | 'bottom' | 'left' | 'right'
}

interface TutorialOverlayProps {
  steps: TutorialStep[]
}

export function TutorialOverlay({ steps }: TutorialOverlayProps) {
  const { isActive, currentStep, nextStep, dismiss, complete } = useTutorialStore()
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!isActive || currentStep >= steps.length) {
      setTargetRect(null)
      return
    }

    const step = steps[currentStep]
    const checkElement = () => {
      const el = document.getElementById(step.targetId)
      if (el) {
        setTargetRect(el.getBoundingClientRect())
      } else {
        setTargetRect(null)
      }
    }

    // Check immediately and then poll every 500ms (handles modals/animations)
    checkElement()
    const interval = setInterval(checkElement, 500)
    window.addEventListener('scroll', checkElement, true)
    window.addEventListener('resize', checkElement)

    return () => {
      clearInterval(interval)
      window.removeEventListener('scroll', checkElement, true)
      window.removeEventListener('resize', checkElement)
    }
  }, [isActive, currentStep, steps])

  // If tutorial is finished or disabled, render nothing
  if (!mounted || !isActive || currentStep >= steps.length) return null

  const step = steps[currentStep]

  // Calculate position based on placement
  let top: number | string | undefined = undefined
  let bottom: number | string | undefined = undefined
  let left: number | string | undefined = undefined
  let right: number | string | undefined = undefined
  let arrowStyle: React.CSSProperties = { display: 'none' }
  const SPACING = 12 // distance from element

  if (targetRect) {
    const anchorX = targetRect.left + targetRect.width / 2
    const anchorY = targetRect.top + targetRect.height / 2

    if (step.placement === 'top' || step.placement === 'bottom') {
      const tooltipWidth = 288 // w-72 approx 288px
      const minLeft = 16
      const maxLeft = window.innerWidth - tooltipWidth - 16
      
      let computedLeft = anchorX - tooltipWidth / 2
      if (computedLeft < minLeft) computedLeft = minLeft
      if (computedLeft > maxLeft) computedLeft = maxLeft
      
      left = computedLeft
      
      if (step.placement === 'top') {
        bottom = window.innerHeight - targetRect.top + SPACING
      } else {
        top = targetRect.bottom + SPACING
      }

      let arrowLeft = anchorX - left - 8 // center arrow on anchorX
      if (arrowLeft < 16) arrowLeft = 16
      if (arrowLeft > tooltipWidth - 32) arrowLeft = tooltipWidth - 32

      arrowStyle = {
        display: 'block',
        bottom: step.placement === 'top' ? -6 : undefined,
        top: step.placement === 'bottom' ? -6 : undefined,
        left: arrowLeft,
      }
    } else {
      // left/right fallback
      if (step.placement === 'left') {
        right = window.innerWidth - targetRect.left + SPACING
      } else {
        left = targetRect.right + SPACING
      }
      top = anchorY - 80 // approximate halfway height
      
      arrowStyle = {
        display: 'block',
        right: step.placement === 'left' ? -6 : undefined,
        left: step.placement === 'right' ? -6 : undefined,
        top: 'calc(50% - 8px)',
      }
    }
  } else {
    // If element not found on screen yet, center it
    top = window.innerHeight / 2 - 80
    left = window.innerWidth / 2 - 144
  }

  const isLast = currentStep === steps.length - 1

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] pointer-events-none">
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="absolute pointer-events-auto w-72 bg-[#02090A] text-white rounded-2xl p-4 shadow-2xl"
          style={{
            top,
            left,
            bottom,
            right,
          }}
        >
          {/* Arrow pointing to target */}
          {targetRect && (
            <div
              className="absolute w-4 h-4 bg-[#02090A] transform rotate-45"
              style={arrowStyle}
            />
          )}

          <div className="relative z-10">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Passo {currentStep + 1} de {steps.length}
              </span>
              <button
                onClick={dismiss}
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="Pular tutorial"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <h3 className="text-base font-semibold mb-1">{step.title}</h3>
            <p className="text-sm text-gray-300 mb-4">{step.description}</p>

            <div className="flex justify-between items-center">
              <button
                onClick={dismiss}
                className="text-xs text-gray-400 font-medium hover:text-white"
              >
                Pular
              </button>
              <Button
                size="sm"
                className="bg-white text-black hover:bg-gray-200 h-8 text-xs px-4"
                onClick={() => {
                  trackEvent('tooltip_step_completed', { step: currentStep + 1 })
                  if (isLast) {
                    complete()
                  } else {
                    nextStep()
                  }
                }}
              >
                {isLast ? 'Concluir' : 'Próximo'}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  )
}
