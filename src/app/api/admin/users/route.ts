import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getAdmin()
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const filter = searchParams.get('filter') || 'all'

    const { data: profiles, error } = await supabase
      .from('profiles')
      .select(
        'id, nome, nome_loja, telefone, plano, assinatura_ativa, trial_fim, created_at, conta_teste'
      )
      .order('created_at', { ascending: false })

    if (error) throw error

    // Fetch emails from auth
    const { data: authData } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    })

    const emailMap = new Map<string, string>()
    authData?.users?.forEach((u) => {
      if (u.email) emailMap.set(u.id, u.email)
    })

    const now = new Date()

    let users = (profiles || []).map((p) => ({
      ...p,
      email: emailMap.get(p.id) || '',
      conta_teste: p.conta_teste ?? false,
      status: p.assinatura_ativa
        ? 'ativo'
        : p.trial_fim && new Date(p.trial_fim) >= now
          ? 'trial'
          : 'expirado',
    }))

    // Filter
    if (filter === 'active') users = users.filter((u) => u.status === 'ativo')
    else if (filter === 'trial')
      users = users.filter((u) => u.status === 'trial')
    else if (filter === 'expired')
      users = users.filter((u) => u.status === 'expirado')

    // Search
    if (search) {
      const q = search.toLowerCase()
      users = users.filter(
        (u) =>
          u.nome?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          u.nome_loja?.toLowerCase().includes(q)
      )
    }

    return NextResponse.json({ users })
  } catch (error) {
    console.error('Admin users error:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar usuários' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = getAdmin()
    const { userId, updates } = await request.json()

    if (!userId || !updates) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }

    // Only allow specific fields to be updated
    const allowed: Record<string, unknown> = {}
    if ('assinatura_ativa' in updates)
      allowed.assinatura_ativa = updates.assinatura_ativa
    if ('plano' in updates) allowed.plano = updates.plano
    if ('trial_fim' in updates) allowed.trial_fim = updates.trial_fim
    if ('nome' in updates) allowed.nome = updates.nome
    if ('nome_loja' in updates) allowed.nome_loja = updates.nome_loja
    if ('telefone' in updates) allowed.telefone = updates.telefone
    if ('conta_teste' in updates) allowed.conta_teste = updates.conta_teste
    allowed.updated_at = new Date().toISOString()

    const { error } = await supabase
      .from('profiles')
      .update(allowed)
      .eq('id', userId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin user update error:', error)
    return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = getAdmin()
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: 'userId obrigatório' },
        { status: 400 }
      )
    }

    // Cascade delete: child tables first
    await supabase.from('eventos').delete().eq('user_id', userId)
    await supabase.from('cobrancas').delete().eq('user_id', userId)
    await supabase.from('notas').delete().eq('user_id', userId)
    await supabase.from('clientes').delete().eq('user_id', userId)
    await supabase.from('subscription_events').delete().eq('user_id', userId)
    await supabase.from('profiles').delete().eq('id', userId)

    // Delete auth user
    const { error: authError } = await supabase.auth.admin.deleteUser(userId)
    if (authError) console.error('Error deleting auth user:', authError)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin user delete error:', error)
    return NextResponse.json({ error: 'Erro ao deletar' }, { status: 500 })
  }
}
