import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { geminiFlash } from '@/lib/ai'

const OCR_PROMPT = `Você é um analista especialista em extração de dados de notas promissórias, recibos informais, notas fiscais e comprovantes brasileiros.
Aja extraindo os dados exatos contidos na imagem e respondendo APENAS com um objeto JSON válido, sem formatação markdown ou textos extras.

Estrutura EXATA do JSON esperado:
{
  "cliente_nome": "Nome explícito do cliente ou comprador, null se não encontrar",
  "data_emissao": "Data em que a compra ocorreu no formato YYYY-MM-DD, null se não encontrar",
  "data_vencimento": "Data em que o cliente deverá pagar/vencimento no formato YYYY-MM-DD, null se não encontrar",
  "descricao_resumida": "Uma breve descrição humanizada do que trata a nota (ex: 'Compras de padaria', 'Material de construção', 'Pizza'), máximo de 4 palavras",
  "total_detectado": 0.00,
  "itens": [
    { "descricao": "string", "quantidade": 1, "valor_unitario": 0.00 }
  ],
  "confianca": "alta"
}

Regras Cruciais:
1. Valores decimais usando PONTO (não vírgula). Ex: "total_detectado": 45.90
2. "total_detectado" é a prioridade. Se não estiver claro, some os itens. Se não houver itens, extraia apenas o total.
3. Se o número da quantidade estiver ausente num item, assuma 1.
4. "confianca" deve ser: "alta", "media" ou "baixa" dependendo da clareza da letra.
5. Em recibos escritos à mão, tente decifrar com cuidado.
Não quebre o formato JSON. Nulls onde não encontrar ou não conseguir inferir com boa precisão.`

export async function POST(request: NextRequest) {
  try {
    const { image } = await request.json()

    if (!image) {
      return NextResponse.json({ error: 'Imagem necessária' }, { status: 400 })
    }

    const base64Data = image.replace(/^data:image\/\w+;base64,/, '')

    const { text } = await generateText({
      model: geminiFlash(),
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: OCR_PROMPT },
            {
              type: 'image',
              image: base64Data,
            },
          ],
        },
      ],
    })

    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(cleaned)

    return NextResponse.json(parsed)
  } catch (error) {
    console.error('OCR error:', error)
    return NextResponse.json(
      { error: 'Erro ao processar imagem', itens: [], total_detectado: 0, confianca: 'baixa', observacoes: null },
      { status: 200 }
    )
  }
}
