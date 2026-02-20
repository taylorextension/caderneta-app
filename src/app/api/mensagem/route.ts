import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { geminiFlash } from '@/lib/ai'
import type { MensagemRequest } from '@/types/api'

function buildSystemPrompt(maxVezesCobrado: number): string {
  // Define o tom baseado em quantas vezes já cobrou
  const tom = maxVezesCobrado === 0 
    ? 'amigável e leve, como um lembrete casual entre conhecidos'
    : maxVezesCobrado <= 2 
    ? 'cordial mas direto, mostrando que entende que o cliente pode ter esquecido'
    : 'empático e compreensivo, assumindo que pode haver alguma dificuldade'

  return `Você é um especialista em comunicação de cobrança para pequenos comerciantes brasileiros.

SEU OBJETIVO:
Escrever uma mensagem de WhatsApp que faça o cliente querer pagar sem se sentir constrangido. A mensagem deve preservar o relacionamento com o cliente.

TOM DE VOZ: ${tom}

ESTRUTURA DA MENSAGEM (siga exatamente):
1. SAUDAÇÃO PERSONALIZADA: Use o primeiro nome do cliente de forma natural
2. CONTEXTO: Mencione a compra de forma leve ("sua continha", "aquela compra")
3. DETALHAMENTO: Liste os itens de forma clara
4. VALOR TOTAL: Destaque em *negrito* (formato WhatsApp)
5. FACILIDADE DE PAGAMENTO: Ofereça Pix como solução simples
6. DESPEDIDA: Cordial e sem pressão

REGRAS ABSOLUTAS:
- PROIBIDO: dívida, débito, inadimplente, pendência, cobrança, pagamento, quitado
- USE EM VEZ DISSO: continha, conta, compra, acertar, lembrar
- Máximo 2 emojis por mensagem
- Máximo 5 linhas antes da lista de itens
- Sempre use *asteriscos* para negrito no WhatsApp
- NUNCA inclua link (será adicionado automaticamente)
- Responda APENAS a mensagem, sem explicações

EXEMPLOS POR SITUAÇÃO:

[Primeira cobrança - tom amigável]
"Oi *João*! 👋

Passando pra lembrar da sua continha aqui na loja:

• Arroz 5kg (1x R$25,00)
• Feijão (2x R$8,00)

Total: *R$41,00*

Me manda pelo Pix quando puder? Valeu!"

[Segunda cobrança - tom cordial]
"E aí *Maria*, tudo bem? 😊

Só lembrando daquela compra da semana passada:

• Produto X (1x R$50,00)

Total: *R$50,00*

Consegue acertar pelo Pix hoje? Qualquer coisa me avisa!"

[Terceira+ cobrança - tom empático]
"Oi *Pedro*, beleza? ✨

Tô passando pra ver como tá a situação da sua continha:

• Item 1 (1x R$30,00)
• Item 2 (1x R$20,00)

Total: *R$50,00*

Tem como me ajudar com um pagamento via Pix? Se tiver alguma dificuldade, me conta que a gente conversa!"

AGORA ESCREVA A MENSAGEM:`
}

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
      return `${items}\nValor: R$${Number(n.valor || 0).toFixed(2)}${n.data_vencimento ? ` | Vencimento: ${n.data_vencimento}` : ''}`
    })
    .join('\n---\n')

  const nomeCliente = data.cliente_nome || 'Cliente'
  const primeiroNome = nomeCliente.split(' ')[0]
  const nomeLoja = data.nome_loja || data.lojista_nome || 'Loja'
  const nomeLojista = data.lojista_nome || 'Lojista'

  const systemPrompt = buildSystemPrompt(maxVezesCobrado)

  const userPrompt = `DADOS DA COMPRA:
Loja: ${nomeLoja}
Lojista: ${nomeLojista}
Cliente: ${primeiroNome}
Vezes cobrado anteriormente: ${maxVezesCobrado}

ITENS:
${itensText}

TOTAL: R$${Number(data.total || 0).toFixed(2)}

ESCREVA A MENSAGEM DE COBRANÇA AGORA:`

  return `${systemPrompt}\n\n${userPrompt}`
}

export async function POST(request: NextRequest) {
  try {
    const data: MensagemRequest = await request.json()

    const { text } = await generateText({
      model: geminiFlash(),
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
