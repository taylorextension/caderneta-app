import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params

        if (!id) {
            return NextResponse.json({ error: 'ID da nota não fornecido' }, { status: 400 })
        }

        const supabase = getSupabase()

        const { data, error } = await supabase
            .from('notas')
            .select('*, profiles!notas_user_id_fkey(nome_loja, pix_chave, pix_tipo, pix_nome, pix_cidade)')
            .eq('id', id)
            .single()

        if (error || !data) {
            return NextResponse.json({ error: 'Nota não encontrada' }, { status: 404 })
        }

        return NextResponse.json(data)
    } catch (error) {
        console.error('API /nota/[id] error:', error)
        return NextResponse.json({ error: 'Erro ao buscar nota' }, { status: 500 })
    }
}
