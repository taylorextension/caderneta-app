'use client'

import { motion, AnimatePresence } from 'motion/react'
import { useUIStore } from '@/stores/ui-store'

const accentColor = {
  success: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-error',
  info: 'bg-black',
}

export function ToastContainer() {
  const toasts = useUIStore((s) => s.toasts)
  const removeToast = useUIStore((s) => s.removeToast)

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-full max-w-sm px-4">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="bg-white border border-divider rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.1)] flex overflow-hidden"
          >
            <div className={`w-[3px] shrink-0 ${accentColor[toast.type]}`} />
            <div className="flex-1 flex items-center justify-between px-3 py-3">
              <span className="text-sm text-text-primary">{toast.message}</span>
              {toast.action && (
                <button
                  onClick={() => {
                    toast.action?.onClick()
                    removeToast(toast.id)
                  }}
                  className="ml-3 text-sm font-semibold text-black shrink-0"
                >
                  {toast.action.label}
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
