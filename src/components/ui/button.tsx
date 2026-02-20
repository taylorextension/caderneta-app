'use client'

import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

type ButtonVariant = 'primary' | 'secondary' | 'whatsapp' | 'ghost' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  loading?: boolean
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-black text-white hover:opacity-90 active:opacity-80',
  secondary:
    'bg-white text-black shadow-[inset_0_0_0_1px_rgb(212,212,216)] hover:bg-zinc-50',
  whatsapp: 'bg-[#25D366] text-white hover:opacity-90',
  ghost: 'bg-transparent text-text-secondary hover:bg-[#F1F1EF]',
  danger: 'bg-red-50 text-red-600 border border-red-200',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'h-12 rounded-full px-6 text-sm font-medium transition-all duration-150',
          'active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none',
          'flex items-center justify-center gap-2',
          variantStyles[variant],
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <svg
            className="h-4 w-4 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        ) : null}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
