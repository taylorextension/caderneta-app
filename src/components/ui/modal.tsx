'use client'

import { type ReactNode, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'

interface ModalProps {
  open: boolean
  onClose?: () => void
  children: ReactNode
}

export function Modal({ open, onClose, children }: ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative bg-white rounded-xl p-6 w-full max-w-sm lg:max-w-md shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)]"
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
