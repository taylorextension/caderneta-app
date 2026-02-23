import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'

const OCR_PROMPT = `Extraia dados de uma nota, recibo ou comprovante brasileiro.
Responda APENAS com JSON válido (sem markdown).

{
  "descricao": "Resumo curto do conteúdo (ex: Compras de padaria, Material elétrico), máx 5 palavras",
  "data_vencimento": "YYYY-MM-DD ou null",
  "total": 0.00
}

Regras:
- "total": o valor total da nota. Use PONTO decimal, não vírgula. Se houver vários itens, some tudo.
- "data_vencimento": a data de vencimento/pagamento. Se só houver data de emissão/compra, use ela. null se não encontrar.
- "descricao": breve descrição humanizada dos itens, SEM valores ou preços individuais.
- Se a imagem for ilegível, retorne total 0 e descricao null.`

export async function POST(request: NextRequest) {
  try {
    const { image } = await request.json()

    if (!image) {
      return NextResponse.json({ error: 'Imagem necessária' }, { status: 400 })
    }

    const base64Data = image.replace(/^data:image\/\w+;base64,/, '')
    const mimeType = image.match(/^data:(image\/\w+);base64,/)?.[1] || 'image/jpeg'

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: OCR_PROMPT },
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType,
              },
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
      }
    })

    const text = response.text
    if (!text) {
      throw new Error("Resposta de texto vazia")
    }

    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(cleaned)

    return NextResponse.json(parsed)
  } catch (error) {
    console.error('OCR error:', error)
    return NextResponse.json(
      { error: 'Erro ao processar imagem', descricao: null, data_vencimento: null, total: 0 },
      { status: 200 }
    )
  }
}
