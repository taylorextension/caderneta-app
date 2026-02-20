'use client'

import { forwardRef, type HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  pressable?: boolean
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, pressable = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'bg-bg-card border border-divider rounded-none p-4',
          pressable && 'active:scale-[0.98] transition-transform duration-150 cursor-pointer',
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'
