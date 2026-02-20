import { cn } from '@/lib/cn'

type BadgeVariant = 'pendente' | 'pago' | 'vencido'

interface BadgeProps {
  variant: BadgeVariant
  children: React.ReactNode
}

const variantStyles: Record<BadgeVariant, string> = {
  pendente: 'bg-amber-100 text-amber-800',
  pago: 'bg-green-100 text-green-800',
  vencido: 'bg-red-100 text-red-800',
}

export function Badge({ variant, children }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
        variantStyles[variant]
      )}
    >
      {children}
    </span>
  )
}
