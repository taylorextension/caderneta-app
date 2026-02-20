'use client'

import PhoneInputLib from 'react-phone-number-input'
import 'react-phone-number-input/style.css'
import { cn } from '@/lib/cn'

interface PhoneInputProps {
  label?: string
  value: string
  onChange: (value: string) => void
  error?: string
  placeholder?: string
}

export function PhoneInput({
  label,
  value,
  onChange,
  error,
  placeholder = '(11) 99999-9999',
}: PhoneInputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="mb-1 block text-xs font-medium text-text-secondary">
          {label}
        </label>
      )}
      <PhoneInputLib
        international
        defaultCountry="BR"
        value={value}
        onChange={(val) => onChange(val || '')}
        placeholder={placeholder}
        className={cn(
          'h-12 w-full border-b border-border',
          'focus-within:border-b-black transition-colors',
          error && 'border-b-red-600',
          '[&_.PhoneInputInput]:bg-transparent [&_.PhoneInputInput]:outline-none [&_.PhoneInputInput]:text-base [&_.PhoneInputInput]:h-full [&_.PhoneInputInput]:border-none',
          '[&_.PhoneInputCountry]:mr-2'
        )}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}
