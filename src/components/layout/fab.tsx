'use client'

import { PlusIcon } from '@heroicons/react/24/solid'
import { cn } from '@/lib/cn'

interface FABProps {
  onClick: () => void
  className?: string
}

export function FAB({ onClick, className }: FABProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'fixed bottom-[88px] right-4 z-30',
        'h-14 w-14 rounded-full bg-black text-white',
        'flex items-center justify-center',
        'shadow-[0_4px_12px_rgba(0,0,0,0.15)]',
        'active:scale-95 transition-transform duration-150',
        className
      )}
    >
      <PlusIcon className="h-6 w-6" />
    </button>
  )
}
