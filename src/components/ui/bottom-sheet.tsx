'use client'

import { type ReactNode, useEffect, useRef, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence, useDragControls } from 'motion/react'

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  children: ReactNode
}

const DESKTOP_MEDIA_QUERY = '(min-width: 1024px)'

function subscribeToDesktopChange(onStoreChange: () => void) {
  if (typeof window === 'undefined') return () => {}

  const mql = window.matchMedia(DESKTOP_MEDIA_QUERY)
  mql.addEventListener('change', onStoreChange)

  return () => mql.removeEventListener('change', onStoreChange)
}

function getDesktopSnapshot() {
  if (typeof window === 'undefined') return false
  return window.matchMedia(DESKTOP_MEDIA_QUERY).matches
}

function useIsDesktop() {
  return useSyncExternalStore(
    subscribeToDesktopChange,
    getDesktopSnapshot,
    () => false
  )
}

export function BottomSheet({ open, onClose, children }: BottomSheetProps) {
  const dragControls = useDragControls()
  const sheetRef = useRef<HTMLDivElement>(null)
  const isDesktop = useIsDesktop()

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

  if (typeof document === 'undefined') return null

  // Desktop: render as centered modal
  if (isDesktop) {
    return createPortal(
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-[#163300]/40 backdrop-blur-sm"
              onClick={onClose}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative bg-white rounded-xl p-6 w-full max-w-md shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] max-h-[85vh] overflow-y-auto"
            >
              {children}
            </motion.div>
          </div>
        )}
      </AnimatePresence>,
      document.body
    )
  }

  // Mobile: original bottom sheet
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[300]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-[#163300]/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            ref={sheetRef}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            drag="y"
            dragControls={dragControls}
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100) onClose()
            }}
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-xl max-h-[90vh] overflow-y-auto"
          >
            <div
              className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing"
              onPointerDown={(e) => dragControls.start(e)}
            >
              <div className="w-10 h-1 bg-zinc-300 rounded-full" />
            </div>
            <div className="px-4 pb-8">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}
