import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

const eventoSchema = z.object({
  nota_id: z.string().uuid(),
  tipo: z.enum(['link_aberto', 'pix_copiado', 'tempo_pagina']),
  metadata: z.record(z.unknown()).optional(),
})

const MAX_METADATA_BYTES = 2 * 1024

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

  if (!supabaseUrl || !serviceRoleKey) {
    return null
  }

  return createClient(
    supabaseUrl,
    serviceRoleKey
  )
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    if (!supabase) {
      console.error('Evento error: missing SUPABASE_URL or SERVICE_ROLE_KEY')
      return NextResponse.json({ error: 'Server config error' }, { status: 500 })
    }

    const body = await request.json()
    const parsed = eventoSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
    }

    const { nota_id, tipo } = parsed.data
    const metadata = parsed.data.metadata || {}
    const metadataSize = Buffer.byteLength(JSON.stringify(metadata), 'utf8')
    if (metadataSize > MAX_METADATA_BYTES) {
      return NextResponse.json({ error: 'Metadata muito grande' }, { status: 413 })
    }

    const { data: nota, error: notaError } = await supabase
      .from('notas')
      .select('id, cliente_id, user_id')
      .eq('id', nota_id)
      .maybeSingle()

    if (notaError || !nota) {
      return NextResponse.json({ error: 'Nota não encontrada' }, { status: 404 })
    }

    const { error } = await supabase.from('eventos').insert({
      nota_id: nota.id,
      cliente_id: nota.cliente_id,
      user_id: nota.user_id,
      tipo,
      metadata,
    })

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Evento error:', error)
    return NextResponse.json({ error: 'Erro ao registrar evento' }, { status: 500 })
  }
}
