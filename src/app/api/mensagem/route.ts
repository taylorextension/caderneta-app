import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { geminiFlash } from '@/lib/ai'
import type { MensagemRequest } from '@/types/api'

function buildPrompt(data: MensagemRequest): string {
  const maxVezesCobrado = Math.max(...data.notas.map((n) => n.vezes_cobrado))

  const itensText = data.notas
    .map((n) => {
      const items = n.itens.length > 0
        ? n.itens.map((i) => `• ${i.descricao} (${i.quantidade}x R$${i.valor_unitario.toFixed(2)})`).join('\n')
        : n.descricao || 'Compra'
      return `${items}\nValor: R$${n.valor.toFixed(2)}${n.data_vencimento ? ` | Vencimento: ${n.data_vencimento}` : ''}`
    })
    .join('\n---\n')

  return `Gere UMA mensagem de lembrete via WhatsApp de ${data.lojista_nome} (${data.nome_loja}) para ${data.cliente_apelido || data.cliente_nome}.

REGRAS:
- PROIBIDO usar: dívida, débito, inadimplente, pendência, cobrança
- USE: continha, conta, lembrete, acertar
- Use 1-2 emojis no máximo
- Máximo 4-5 linhas antes dos itens
- Calibração de tom: vezes_cobrado=${maxVezesCobrado} (0=amigável, 1-2=casual, 3+=muito compreensivo). Quanto mais atraso, MAIS compreensivo.
- Liste itens com •
- Total em *negrito*
- Inclua uma frase sobre Pix
- Despedida cordial
- NÃO inclua link (será adicionado automaticamente)
- Responda APENAS a mensagem, sem explicações

DADOS:
${itensText}
Total: R$${data.total.toFixed(2)}
Vezes cobrado anteriormente: ${maxVezesCobrado}`
}

export async function POST(request: NextRequest) {
  try {
    const data: MensagemRequest = await request.json()

    const { text } = await generateText({
      model: geminiFlash,
      prompt: buildPrompt(data),
    })

    return NextResponse.json({ mensagem: text.trim() })
  } catch (error) {
    console.error('Mensagem error:', error)
    return NextResponse.json(
      { mensagem: 'Oi! Passando pra lembrar da continha. Dá pra acertar pelo Pix? Obrigado!' },
      { status: 200 }
    )
  }
}
