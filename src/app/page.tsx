import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isOnboardingComplete } from '@/lib/onboarding'

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (!isOnboardingComplete(profile)) {
    redirect('/setup')
  }

  redirect('/inicio')
}
