import { cn } from '@/lib/cn'

type BadgeVariant = 'pendente' | 'pago' | 'vencido'

interface BadgeProps {
  variant: BadgeVariant
  children: React.ReactNode
}

const variantStyles: Record<BadgeVariant, string> = {
  pendente: 'bg-[#EDC843]/15 text-[#3A341C]',
  pago: 'bg-[#9FE870]/15 text-[#2F5711]',
  vencido: 'bg-[#A8200D]/10 text-[#A8200D]',
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
