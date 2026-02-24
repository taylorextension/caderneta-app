'use client'

import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useUIStore } from '@/stores/ui-store'
import { cn } from '@/lib/cn'

const typeIcons: Record<string, string> = {
  success: '✓',
  warning: '!',
  error: '✕',
  info: '→',
}

function ToastItem({ toast }: { toast: { id: string; message: string; type: 'success' | 'warning' | 'error' | 'info'; action?: { label: string; onClick: () => void } } }) {
  const removeToast = useUIStore((s) => s.removeToast)
  const progressRef = useRef<HTMLDivElement>(null)
  const duration = toast.action ? 5 : 3

  useEffect(() => {
    if (progressRef.current) {
      progressRef.current.style.transition = 'none'
      progressRef.current.style.width = '100%'
      requestAnimationFrame(() => {
        if (progressRef.current) {
          progressRef.current.style.transition = `width ${duration}s linear`
          progressRef.current.style.width = '0%'
        }
      })
    }
  }, [toast.id, duration])

  return (
    <motion.div
      key={toast.id}
      layout
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ type: 'spring', damping: 28, stiffness: 350 }}
      className="relative overflow-hidden rounded-xl bg-[#1A1A1A] shadow-[0_8px_32px_rgba(0,0,0,0.24)]"
    >
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Icon */}
        <div
          className={cn(
            'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold',
            toast.type === 'success' && 'bg-emerald-500/20 text-emerald-400',
            toast.type === 'warning' && 'bg-amber-500/20 text-amber-400',
            toast.type === 'error' && 'bg-red-500/20 text-red-400',
            toast.type === 'info' && 'bg-white/10 text-white/70'
          )}
        >
          {typeIcons[toast.type]}
        </div>

        {/* Message */}
        <span className="flex-1 text-sm font-medium text-white/90 leading-tight">
          {toast.message}
        </span>

        {/* Action button */}
        {toast.action && (
          <button
            onClick={() => {
              toast.action?.onClick()
              removeToast(toast.id)
            }}
            className="shrink-0 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white hover:bg-white/20 transition-colors"
          >
            {toast.action.label}
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-[2px] w-full bg-white/5">
        <div
          ref={progressRef}
          className={cn(
            'h-full',
            toast.type === 'success' && 'bg-emerald-400/60',
            toast.type === 'warning' && 'bg-amber-400/60',
            toast.type === 'error' && 'bg-red-400/60',
            toast.type === 'info' && 'bg-white/30'
          )}
        />
      </div>
    </motion.div>
  )
}

export function ToastContainer() {
  const toasts = useUIStore((s) => s.toasts)

  return (
    <div className="fixed bottom-20 lg:bottom-8 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-full max-w-sm lg:max-w-md px-4">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </AnimatePresence>
    </div>
  )
}
