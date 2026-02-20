import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { geminiFlash } from '@/lib/ai'
import type { MensagemRequest } from '@/types/api'

function buildPrompt(data: MensagemRequest): string {
  // Validações de segurança
  if (!data.notas || data.notas.length === 0) {
    return 'Oi! Passando pra lembrar da continha. Dá pra acertar pelo Pix? Obrigado!'
  }

  const maxVezesCobrado = Math.max(...data.notas.map((n) => n.vezes_cobrado || 0))

  const itensText = data.notas
    .map((n) => {
      const items = n.itens?.length > 0
        ? n.itens.map((i) => `• ${i.descricao} (${i.quantidade}x R$${i.valor_unitario.toFixed(2)})`).join('\n')
        : n.descricao || 'Compra'
      return `${items}\nValor: R$${Number(n.valor || 0).toFixed(2)}`
    })
    .join('\n---\n')

  const nomeCliente = data.cliente_nome || 'Cliente'
  const primeiroNome = nomeCliente.split(' ')[0]

  // Define tom baseado em quantas vezes cobrou
  let tom = ''
  if (maxVezesCobrado === 0) {
    tom = 'amigável e casual, como lembrar um amigo'
  } else if (maxVezesCobrado <= 2) {
    tom = 'cordial mas direto'
  } else {
    tom = 'empático e compreensivo'
  }

  return `Escreva uma mensagem de WhatsApp para cobrar ${primeiroNome}.

TOM: ${tom}

REGRAS:
- Use linguagem simples e direta
- Máximo 2 emojis
- Destaque o total em *negrito* (use asteriscos)
- NÃO use: dívida, débito, inadimplente, pendência
- USE: continha, compra, acertar, lembrar
- Ofereça Pix como forma de pagamento
- Seja cordial na despedida
- Responda SÓ a mensagem, sem explicações

DADOS:
${itensText}
Total: R$${Number(data.total || 0).toFixed(2)}

MENSAGEM:`
}

export async function POST(request: NextRequest) {
  try {
    const data: MensagemRequest = await request.json()
    
    console.log('=== API MENSAGEM ===')
    console.log('Cliente:', data.cliente_nome)
    console.log('Notas:', data.notas?.length)
    console.log('GEMINI_API_KEY exists:', !!process.env.GEMINI_API_KEY)
    console.log('GOOGLE_API_KEY exists:', !!process.env.GOOGLE_API_KEY)

    const prompt = buildPrompt(data)
    console.log('Prompt:', prompt.substring(0, 200))

    try {
      const result = await generateText({
        model: geminiFlash(),
        prompt: prompt,
        temperature: 0.7,
        maxTokens: 500,
      })
      
      console.log('Resultado:', result)
      console.log('Texto gerado:', result?.text?.substring(0, 100))

      if (!result.text || result.text.trim().length < 10) {
        throw new Error('Resposta vazia ou muito curta')
      }

      return NextResponse.json({ mensagem: result.text.trim() })
    } catch (aiError) {
      console.error('Erro da IA:', aiError)
      throw aiError
    }
  } catch (error) {
    console.error('Erro geral:', error)
    return NextResponse.json(
      { mensagem: 'Oi! Passando pra lembrar da continha. Dá pra acertar pelo Pix? Obrigado!' },
      { status: 200 }
    )
  }
}
