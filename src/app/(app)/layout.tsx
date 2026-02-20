'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { useTrial } from '@/hooks/use-trial'
import { BottomNav } from '@/components/layout/bottom-nav'
import { PaywallModal } from '@/components/paywall/paywall-modal'
import { Skeleton } from '@/components/ui/skeleton'
import { isOnboardingComplete } from '@/lib/onboarding'
import type { Profile } from '@/types/database'

export default function AppLayout({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { setProfile, setLoading, profile, loading } = useAuthStore()
  const { acesso } = useTrial()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    async function init() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          router.push('/login')
          return
        }

        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (!data) {
          router.push('/login')
          return
        }

        if (!isOnboardingComplete(data) && pathname !== '/setup') {
          router.push('/setup')
          return
        }

        setProfile(data as Profile)
        setReady(true)
      } catch {
        router.push('/login')
      }
    }

    init()
  }, [router, pathname, setProfile, setLoading])

  if (!ready || loading || !profile) {
    return (
      <div className="min-h-screen bg-bg-app p-6 space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-20 w-full mt-6" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (!acesso) {
    return <PaywallModal />
  }

  return (
    <div className="min-h-screen bg-bg-app pb-[72px]">
      {children}
      <BottomNav />
    </div>
  )
}
