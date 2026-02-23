import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export async function POST(request: NextRequest) {
  try {
    const { nota_id, cliente_id, user_id, tipo, metadata } = await request.json()

    if (!nota_id || !cliente_id || !user_id || !tipo) {
      return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 })
    }

    const supabase = getSupabase()
    const { error } = await supabase.from('eventos').insert({
      nota_id,
      cliente_id,
      user_id,
      tipo,
      metadata: metadata || {},
    })

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Evento error:', error)
    return NextResponse.json({ error: 'Erro ao registrar evento' }, { status: 500 })
  }
}
