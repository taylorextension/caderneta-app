'use client'

import { PlusIcon } from '@heroicons/react/24/solid'
import { motion } from 'motion/react'
import { cn } from '@/lib/cn'

interface FABProps {
  onClick: () => void
  className?: string
}

export function FAB({ onClick, className }: FABProps) {
  return (
    <motion.button
      onClick={onClick}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.3 }}
      whileTap={{ scale: 0.95 }}
      whileHover={{ scale: 1.05 }}
      className={cn(
        'fixed bottom-[88px] right-4 z-30',
        'h-14 w-14 rounded-full bg-black text-white',
        'flex items-center justify-center',
        'shadow-[0_4px_12px_rgba(0,0,0,0.15)]',
        className
      )}
    >
      <PlusIcon className="h-6 w-6" />
    </motion.button>
  )
}
