'use client'

import { motion, AnimatePresence } from 'motion/react'
import { useUIStore } from '@/stores/ui-store'
import { useEffect, useRef } from 'react'

const icons: Record<string, string> = {
  success: '✓',
  warning: '⚠',
  error: '✕',
  info: 'ℹ',
}

const bgColors: Record<string, string> = {
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  error: 'bg-red-500',
  info: 'bg-zinc-500',
}

function ToastItem({ toast }: { toast: { id: string; message: string; type: 'success' | 'warning' | 'error' | 'info'; action?: { label: string; onClick: () => void } } }) {
  const removeToast = useUIStore((s) => s.removeToast)
  const progressRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (progressRef.current) {
      progressRef.current.style.transition = 'none'
      progressRef.current.style.width = '100%'
      requestAnimationFrame(() => {
        if (progressRef.current) {
          progressRef.current.style.transition = 'width 4s linear'
          progressRef.current.style.width = '0%'
        }
      })
    }
  }, [toast.id])

  return (
    <motion.div
      key={toast.id}
      layout
      initial={{ opacity: 0, y: -24, scale: 0.92, filter: 'blur(4px)' }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, y: -16, scale: 0.95, filter: 'blur(4px)' }}
      transition={{ type: 'spring', stiffness: 380, damping: 26 }}
      className="relative bg-zinc-900/95 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.28)] overflow-hidden"
    >
      <div className="flex items-center gap-3 px-4 py-3.5">
        <div className={`w-7 h-7 rounded-full ${bgColors[toast.type]} flex items-center justify-center shrink-0`}>
          <span className="text-white text-xs font-bold">{icons[toast.type]}</span>
        </div>
        <span className="text-[13px] text-zinc-100 font-medium flex-1 leading-snug">{toast.message}</span>
        {toast.action && (
          <button
            onClick={() => {
              toast.action?.onClick()
              removeToast(toast.id)
            }}
            className="ml-1 text-[13px] font-bold text-white bg-white/15 rounded-lg px-3 py-1.5 shrink-0 active:bg-white/25 transition-colors"
          >
            {toast.action.label}
          </button>
        )}
      </div>
      {/* progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/10">
        <div
          ref={progressRef}
          className={`h-full ${bgColors[toast.type]} opacity-60`}
          style={{ width: '100%' }}
        />
      </div>
    </motion.div>
  )
}

export function ToastContainer() {
  const toasts = useUIStore((s) => s.toasts)

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-full max-w-sm px-4">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </AnimatePresence>
    </div>
  )
}
