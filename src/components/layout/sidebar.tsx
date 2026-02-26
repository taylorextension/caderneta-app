'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'motion/react'
import {
  HomeIcon as HomeOutline,
  UsersIcon as UsersOutline,
  ClockIcon as ClockOutline,
  Cog6ToothIcon as CogOutline,
} from '@heroicons/react/24/outline'
import {
  HomeIcon as HomeSolid,
  UsersIcon as UsersSolid,
  ClockIcon as ClockSolid,
  Cog6ToothIcon as CogSolid,
} from '@heroicons/react/24/solid'
import { cn } from '@/lib/cn'
import { useAuthStore } from '@/stores/auth-store'

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
    href: '/historico',
    label: 'Histórico',
    icon: ClockOutline,
    activeIcon: ClockSolid,
  },
  {
    href: '/ajustes',
    label: 'Ajustes',
    icon: CogOutline,
    activeIcon: CogSolid,
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const profile = useAuthStore((s) => s.profile)

  return (
    <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-[240px] z-[100] flex-col bg-white border-r border-divider">
      {/* Logo / Store name */}
      <div className="px-6 pt-8 pb-6 border-b border-divider">
        {profile?.nome_loja ? (
          <p className="text-base font-bold text-text-primary truncate">
            {profile.nome_loja}
          </p>
        ) : (
          <img src="/logo.png" alt="Caderneta" className="h-8 w-auto object-contain" />
        )}
        <p className="text-xs text-text-muted mt-0.5 truncate">
          {profile?.nome || ''}
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {items.map((item) => {
          const active = pathname.startsWith(item.href)
          const Icon = active ? item.activeIcon : item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150',
                active
                  ? 'text-black bg-black/5'
                  : 'text-text-secondary hover:bg-black/[0.03] hover:text-text-primary'
              )}
            >
              {active && (
                <motion.div
                  layoutId="sidebar-indicator"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-black rounded-full"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <Icon className="h-5 w-5 shrink-0" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-divider">
        <p className="text-[10px] text-text-muted">Caderneta © 2026</p>
      </div>
    </aside>
  )
}
