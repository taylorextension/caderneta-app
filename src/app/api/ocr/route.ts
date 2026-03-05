import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getGoogleAI } from '@/lib/ai'
import { hasAppAccess } from '@/lib/subscription'
import { z } from 'zod'

const MAX_IMAGE_BYTES = 4 * 1024 * 1024
const MAX_BASE64_CHARS = 6_000_000

const ocrBodySchema = z.object({
  image: z.string().min(1).max(MAX_BASE64_CHARS),
})

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
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('assinatura_ativa, trial_fim')
      .eq('id', user.id)
      .single()

    if (!hasAppAccess(profile)) {
      return NextResponse.json(
        { error: 'Assinatura necessária' },
        { status: 403 }
      )
    }

    const contentLength = Number(request.headers.get('content-length') || '0')
    if (contentLength > MAX_IMAGE_BYTES * 2) {
      return NextResponse.json(
        { error: 'Imagem muito grande' },
        { status: 413 }
      )
    }

    const body = await request.json()
    const parsedBody = ocrBodySchema.safeParse(body)
    if (!parsedBody.success) {
      return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
    }

    const { image } = parsedBody.data
    if (!/^data:image\/(jpeg|jpg|png|webp);base64,/.test(image)) {
      return NextResponse.json(
        { error: 'Formato de imagem inválido' },
        { status: 400 }
      )
    }

    const base64Data = image.replace(/^data:image\/\w+;base64,/, '')
    const imageBytes = Buffer.byteLength(base64Data, 'base64')
    if (imageBytes > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: 'Imagem muito grande' },
        { status: 413 }
      )
    }

    const mimeType =
      image.match(/^data:(image\/\w+);base64,/)?.[1] || 'image/jpeg'

    const ai = getGoogleAI()

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite',
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
        responseMimeType: 'application/json',
      },
    })

    const text = response.text
    if (!text) {
      throw new Error('Resposta de texto vazia')
    }

    const cleaned = text
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()
    const parsed = JSON.parse(cleaned)

    return NextResponse.json(parsed)
  } catch (error: unknown) {
    console.error('OCR error:', error instanceof Error ? error.message : error)
    return NextResponse.json(
      {
        error: 'Erro ao processar imagem',
        descricao: null,
        data_vencimento: null,
        total: 0,
      },
      { status: 200 }
    )
  }
}
