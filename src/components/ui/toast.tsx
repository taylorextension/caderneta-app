'use client'

import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { CheckCircleIcon, ExclamationTriangleIcon, XCircleIcon, InformationCircleIcon } from '@heroicons/react/24/solid'
import { useUIStore } from '@/stores/ui-store'
import { cn } from '@/lib/cn'

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
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className={cn(
        "relative bg-white border border-zinc-200 rounded-lg p-3 flex items-center gap-3 overflow-hidden",
        "shadow-[0_4px_12px_rgba(0,0,0,0.1)]",
        "before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[3px]",
        toast.type === 'success' && 'before:bg-green-500',
        toast.type === 'warning' && 'before:bg-amber-500',
        toast.type === 'error' && 'before:bg-red-500',
        toast.type === 'info' && 'before:bg-black'
      )}
    >
      <div className="flex-1 min-w-0 pr-2">
        <span className="block text-sm text-text-primary font-medium truncate">{toast.message}</span>
      </div>

      {toast.action && (
        <button
          onClick={() => {
            toast.action?.onClick()
            removeToast(toast.id)
          }}
          className="shrink-0 text-sm font-semibold text-black hover:underline transition-colors"
        >
          {toast.action.label}
        </button>
      )}
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
