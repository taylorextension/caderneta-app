'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { useTrial } from '@/hooks/use-trial'
import { BottomNav } from '@/components/layout/bottom-nav'
import { Sidebar } from '@/components/layout/sidebar'
import { PaywallModal } from '@/components/paywall/paywall-modal'
import { PwaUpdateNotification } from '@/components/pwa/pwa-update-notification'
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
    let active = true
    const supabase = createClient()
    let removeWindowListeners: (() => void) | undefined
    let profileChannel: ReturnType<typeof supabase.channel> | null = null

    async function loadProfile(userId: string, redirectOnMissing = true) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error || !data) {
        if (redirectOnMissing && active) {
          setProfile(null)
          router.push('/login')
        }
        return null
      }

      if (!active) return null

      if (!isOnboardingComplete(data) && pathname !== '/setup') {
        router.push('/setup')
        return null
      }

      setProfile(data as Profile)
      setReady(true)
      return data as Profile
    }

    async function init() {
      try {
        if (!useAuthStore.getState().profile) {
          setLoading(true)
        }

        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          if (!active) return
          setProfile(null)
          router.push('/login')
          return
        }

        const loadedProfile = await loadProfile(user.id)
        if (!loadedProfile || !active) {
          return
        }

        const refreshProfile = () => {
          void loadProfile(user.id, false)
        }
        const handleVisibilityChange = () => {
          if (document.visibilityState === 'visible') {
            refreshProfile()
          }
        }

        window.addEventListener('focus', refreshProfile)
        document.addEventListener('visibilitychange', handleVisibilityChange)
        removeWindowListeners = () => {
          window.removeEventListener('focus', refreshProfile)
          document.removeEventListener(
            'visibilitychange',
            handleVisibilityChange
          )
        }

        profileChannel = supabase
          .channel(`profile-${user.id}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'profiles',
              filter: `id=eq.${user.id}`,
            },
            (payload) => {
              if (!payload.new || !active) return

              const nextProfile = payload.new as Profile

              if (!isOnboardingComplete(nextProfile) && pathname !== '/setup') {
                router.push('/setup')
                return
              }

              setProfile(nextProfile)
              setReady(true)
            }
          )
          .subscribe()
      } catch {
        if (!active) return
        setProfile(null)
        router.push('/login')
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void init()

    return () => {
      active = false
      removeWindowListeners?.()
      if (profileChannel) {
        void supabase.removeChannel(profileChannel)
      }
    }
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
    <div className="min-h-screen bg-bg-app">
      <Sidebar />
      <div className={`lg:ml-[240px] ${pathname === '/ajustes/plano' ? '' : 'pb-20 lg:pb-0'}`}>
        <div className="lg:max-w-4xl lg:mx-auto lg:px-8">{children}</div>
      </div>
      {pathname !== '/ajustes/plano' && <BottomNav />}
      <PwaUpdateNotification />
    </div>
  )
}
