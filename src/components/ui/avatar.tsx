import { cn } from '@/lib/cn'
import { getInitials } from '@/lib/format'

interface AvatarProps {
  name: string
  size?: 'sm' | 'md'
  className?: string
}

const sizeStyles = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
}

export function Avatar({ name, size = 'md', className }: AvatarProps) {
  return (
    <div
      className={cn(
        'bg-black text-white rounded-full flex items-center justify-center font-semibold shrink-0',
        sizeStyles[size],
        className
      )}
    >
      {getInitials(name)}
    </div>
  )
}
