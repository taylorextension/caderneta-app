import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params
    const supabase = getAdmin()

    const [clientesRes, notasRes, cobrancasRes] = await Promise.all([
      supabase
        .from('clientes')
        .select('id, nome, created_at')
        .eq('user_id', userId),
      supabase
        .from('notas')
        .select('id, valor, status, descricao, data_pagamento, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      supabase
        .from('cobrancas')
        .select('id, enviado_em')
        .eq('user_id', userId)
        .order('enviado_em', { ascending: false }),
    ])

    const clientes = clientesRes.data || []
    const notas = notasRes.data || []
    const cobrancas = cobrancasRes.data || []

    const notasPendentes = notas.filter((n) => n.status === 'pendente')
    const notasPagas = notas.filter((n) => n.status === 'pago')

    const summary = {
      totalClientes: clientes.length,
      totalNotas: notas.length,
      totalNotasPendentes: notasPendentes.length,
      totalNotasPagas: notasPagas.length,
      totalCobrancas: cobrancas.length,
      valorTotalPendente: notasPendentes.reduce(
        (acc, n) => acc + Number(n.valor),
        0
      ),
      valorTotalRecebido: notasPagas.reduce(
        (acc, n) => acc + Number(n.valor),
        0
      ),
    }

    const recentActivity: Array<{
      type: string
      description: string
      created_at: string
    }> = []

    notas.slice(0, 10).forEach((n) => {
      if (n.status === 'pago' && n.data_pagamento) {
        recentActivity.push({
          type: 'pagamento_recebido',
          description: `Pagamento de R$ ${Number(n.valor).toFixed(2)} recebido`,
          created_at: n.data_pagamento,
        })
      }
      recentActivity.push({
        type: 'nota_criada',
        description: `Nota de R$ ${Number(n.valor).toFixed(2)} criada${n.descricao ? `: ${n.descricao}` : ''}`,
        created_at: n.created_at,
      })
    })

    cobrancas.slice(0, 10).forEach((c) => {
      recentActivity.push({
        type: 'cobranca_enviada',
        description: 'Cobrança enviada via WhatsApp',
        created_at: c.enviado_em,
      })
    })

    clientes.slice(0, 5).forEach((c) => {
      recentActivity.push({
        type: 'cliente_adicionado',
        description: `Cliente "${c.nome}" adicionado`,
        created_at: c.created_at,
      })
    })

    recentActivity.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    return NextResponse.json({
      summary,
      recentActivity: recentActivity.slice(0, 20),
    })
  } catch (error) {
    console.error('Admin user activity error:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar atividade' },
      { status: 500 }
    )
  }
}
