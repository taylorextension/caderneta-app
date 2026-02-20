import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { geminiFlash } from '@/lib/ai'

const OCR_PROMPT = `Extraia dados de notas/recibos brasileiros. Responda APENAS JSON válido, sem markdown:
{ "itens": [{"descricao":"str","quantidade":1,"valor_unitario":0.00}], "total_detectado":0.00, "confianca":"alta"|"media"|"baixa", "observacoes":null }
null se ilegível. Quantidade 1 se ausente. Use decimais com ponto. Não invente dados.`

export async function POST(request: NextRequest) {
  try {
    const { image } = await request.json()

    if (!image) {
      return NextResponse.json({ error: 'Imagem necessária' }, { status: 400 })
    }

    const base64Data = image.replace(/^data:image\/\w+;base64,/, '')

    const { text } = await generateText({
      model: geminiFlash,
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
