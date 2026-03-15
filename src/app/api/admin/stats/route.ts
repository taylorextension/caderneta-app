import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET() {
  try {
    const supabase = getAdmin()

    // Get all profiles
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')

    if (error) throw error

    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const thirtyDaysAgo = new Date(
      now.getTime() - 30 * 24 * 60 * 60 * 1000
    ).toISOString()

    const totalUsers = profiles?.length || 0
    const activeSubscribers =
      profiles?.filter((p) => p.assinatura_ativa).length || 0
    const trialActive =
      profiles?.filter(
        (p) =>
          !p.assinatura_ativa && p.trial_fim && new Date(p.trial_fim) >= now
      ).length || 0
    const trialExpired =
      profiles?.filter(
        (p) => !p.assinatura_ativa && p.trial_fim && new Date(p.trial_fim) < now
      ).length || 0
    const newToday =
      profiles?.filter((p) => p.created_at && p.created_at.startsWith(today))
        .length || 0
    const newLast30Days =
      profiles?.filter((p) => p.created_at && p.created_at >= thirtyDaysAgo)
        .length || 0

    // Subscription events stats
    const { data: events } = await supabase
      .from('subscription_events')
      .select('event, created_at')
      .gte('created_at', thirtyDaysAgo)

    const canceledLast30 =
      events?.filter((e) => e.event === 'subscription_canceled').length || 0
    const purchasesLast30 =
      events?.filter((e) => e.event === 'purchase_approved').length || 0

    // Business metrics
    const usersWithTrial = profiles?.filter((p) => p.trial_fim) || []
    const convertedFromTrial = usersWithTrial.filter((p) => p.assinatura_ativa)
    const conversionRate =
      usersWithTrial.length > 0
        ? Math.round((convertedFromTrial.length / usersWithTrial.length) * 100)
        : 0

    const beginningSubscribers = activeSubscribers + canceledLast30
    const churnRate =
      beginningSubscribers > 0
        ? Math.round((canceledLast30 / beginningSubscribers) * 100)
        : 0

    const realSubscribers =
      profiles?.filter((p) => p.assinatura_ativa && !p.conta_teste).length || 0
    const mrr = realSubscribers * 29.9

    return NextResponse.json({
      totalUsers,
      activeSubscribers,
      trialActive,
      trialExpired,
      newToday,
      newLast30Days,
      canceledLast30,
      purchasesLast30,
      conversionRate,
      churnRate,
      mrr,
    })
  } catch (error) {
    console.error('Admin stats error:', error)
    return NextResponse.json({ error: 'Erro ao buscar stats' }, { status: 500 })
  }
}
