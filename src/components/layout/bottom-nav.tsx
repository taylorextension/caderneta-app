'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'motion/react'
import {
  HomeIcon as HomeOutline,
  UsersIcon as UsersOutline,
  Cog6ToothIcon as CogOutline,
} from '@heroicons/react/24/outline'
import {
  HomeIcon as HomeSolid,
  UsersIcon as UsersSolid,
  Cog6ToothIcon as CogSolid,
} from '@heroicons/react/24/solid'
import { cn } from '@/lib/cn'

const items = [
  {
    href: '/inicio',
    label: 'Início',
    icon: HomeOutline,
    activeIcon: HomeSolid,
  },
  {
    href: '/clientes',
    label: 'Clientes',
    icon: UsersOutline,
    activeIcon: UsersSolid,
  },
  {
    href: '/ajustes',
    label: 'Ajustes',
    icon: CogOutline,
    activeIcon: CogSolid,
  },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[100] bg-white/95 backdrop-blur-md border-t border-divider"
      style={{ position: 'fixed', bottom: 0, left: 0, right: 0 }}
    >
      <div className="flex items-center h-[72px]">
        {items.map((item) => {
          const active = pathname.startsWith(item.href)
          const Icon = active ? item.activeIcon : item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-1 relative transition-colors duration-200',
                active ? 'text-black' : 'text-text-muted'
              )}
            >
              <motion.div
                animate={{ scale: active ? 1.12 : 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              >
                <Icon className="h-5 w-5" />
              </motion.div>
              <span
                className={cn(
                  'text-[10px]',
                  active ? 'font-semibold' : 'font-medium'
                )}
              >
                {item.label}
              </span>
              {active && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute -top-[1px] left-1/2 -translate-x-1/2 w-8 h-[3px] bg-black rounded-full"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
