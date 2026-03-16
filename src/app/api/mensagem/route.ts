import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getGoogleAI } from '@/lib/ai'
import { hasAppAccess } from '@/lib/subscription'
import { z } from 'zod'

const MAX_MENSAGEM_PAYLOAD_BYTES = 64 * 1024

const mensagemRequestSchema = z.object({
  cliente_nome: z.string().min(1).max(120),
  cliente_apelido: z.string().max(120).nullable().optional(),
  lojista_nome: z.string().max(120).optional().default(''),
  nome_loja: z.string().max(120).optional().default(''),
  notas: z
    .array(
      z.object({
        descricao: z.string().max(200).nullable(),
        itens: z
          .array(
            z.object({
              descricao: z.string().max(200),
              quantidade: z.coerce.number().positive().max(999),
              valor_unitario: z.coerce.number().nonnegative().max(1_000_000),
            })
          )
          .max(100),
        valor: z.coerce.number().nonnegative().max(1_000_000),
        data_vencimento: z.string().nullable(),
        vezes_cobrado: z.coerce.number().int().nonnegative().max(9999),
      })
    )
    .min(1)
    .max(100),
  total: z.coerce.number().nonnegative().max(1_000_000),
})

type MensagemInput = z.infer<typeof mensagemRequestSchema>

// Detecta preposição correta para o nome do comércio (da/do)
function getRefLoja(nomeLoja: string): string {
  if (!nomeLoja) return ''
  const primeira = nomeLoja.split(' ')[0]?.toLowerCase() || ''
  const femininos = [
    'padaria', 'mercearia', 'loja', 'casa', 'distribuidora', 'doceria',
    'confeitaria', 'papelaria', 'farmácia', 'farmacia', 'quitanda',
    'barraca', 'feira', 'cantina', 'lanchonete', 'pizzaria', 'sorveteria',
    'tabacaria', 'drogaria', 'ótica', 'otica', 'floricultura', 'academia',
    'barbearia', 'oficina', 'borracharia',
  ]
  const masculinos = [
    'mercado', 'mercadinho', 'bar', 'super', 'supermercado', 'armazem',
    'armazém', 'atacado', 'atacadão', 'atacadao', 'empório', 'emporio',
    'restaurante', 'boteco', 'petshop', 'pet', 'açougue', 'acougue',
    'posto', 'salão', 'salao', 'estúdio', 'estudio', 'depósito', 'deposito',
  ]
  if (femininos.includes(primeira)) return `da ${nomeLoja}`
  if (masculinos.includes(primeira)) return `do ${nomeLoja}`
  if (/(?:ia|ria|ca|da|ça|sa)$/.test(primeira)) return `da ${nomeLoja}`
  return `do ${nomeLoja}`
}

// Determina o nível de urgência baseado em dias vencidos + vezes cobrado
function getUrgencyLevel(diasVencidos: number, vezesCobrado: number): 'leve' | 'moderado' | 'firme' | 'direto' {
  if (vezesCobrado >= 3 || diasVencidos > 60) return 'direto'
  if (vezesCobrado >= 2 || diasVencidos > 30) return 'firme'
  if (diasVencidos > 7 || vezesCobrado >= 1) return 'moderado'
  return 'leve'
}

function buildPrompt(data: MensagemInput): string {
  if (!data.notas || data.notas.length === 0) {
    return 'Oi! Passando pra lembrar da continha. Dá pra acertar pelo Pix? Obrigado!'
  }

  const primeiroNome = (data.cliente_nome || 'Cliente').trim().split(' ')[0]
  const nomeLoja = (data.nome_loja || '').trim()
  const nomeLojista = (data.lojista_nome || '').trim().split(' ')[0]
  const totalFormatado = Number(data.total || 0).toFixed(2).replace('.', ',')
  const refLoja = getRefLoja(nomeLoja)

  // Calcula dias vencidos da nota mais antiga
  const diasVencidos = data.notas
    .filter((n) => n.data_vencimento)
    .map((n) => {
      const diff = Date.now() - new Date(n.data_vencimento!).getTime()
      return Math.floor(diff / (1000 * 60 * 60 * 24))
    })
    .filter((d) => d > 0)
  const maiorAtraso = diasVencidos.length > 0 ? Math.max(...diasVencidos) : 0

  // Maior número de cobranças entre as notas
  const maiorVezesCobrado = Math.max(...data.notas.map((n) => n.vezes_cobrado || 0), 0)

  const nivel = getUrgencyLevel(maiorAtraso, maiorVezesCobrado)

  // Monta lista de itens compacta
  const itensResumo = data.notas
    .flatMap((n) =>
      n.itens?.length > 0
        ? n.itens.map((i) => `${i.descricao} (${i.quantidade}x)`)
        : [n.descricao || 'Compra']
    )
    .join(', ')

  // Tom e instruções variam por nível
  const tomPorNivel = {
    leve: 'Lembrete leve e descontraído, como quem puxa assunto. Sem pressa.',
    moderado: 'Lembrete gentil mas claro. O cliente já sabe da conta — seja objetivo sem ser frio.',
    firme: 'Tom ainda educado, mas mais direto. Deixe claro que é importante acertar logo. Pode mencionar que já lembrou antes.',
    direto: 'Tom sério e respeitoso, sem rodeios. Transmita que precisa resolver. Pode dizer "preciso" ou "importante". Ainda sem ser agressivo.',
  }

  // Variação de abertura para evitar repetição
  const seed = Math.floor(Math.random() * 5)
  const aberturas = [
    `cumprimento casual (ex: "E aí", "Opa", "Fala")`,
    `pergunta sobre o dia (ex: "Tudo certo?", "Como tá?")`,
    `direto ao ponto sem saudação longa`,
    `referência ao tempo/dia (ex: "Boa tarde", "Bom dia")`,
    `tom de quem acabou de lembrar (ex: "Ah, ia esquecendo...")`,
  ]

  return `Você é o assistente de um pequeno comércio de bairro brasileiro. Gere UMA mensagem curta de WhatsApp para lembrar um cliente da continha aberta. O lojista e o cliente se conhecem pessoalmente — são vizinhos de bairro.

<dados>
Cliente: ${primeiroNome}
Valor: R$ ${totalFormatado}
${refLoja ? `Loja: ${refLoja}\n` : ''}${nomeLojista ? `Lojista: ${nomeLojista}\n` : ''}${itensResumo ? `Itens: ${itensResumo}\n` : ''}${maiorAtraso > 0 ? `Dias desde vencimento: ${maiorAtraso}\n` : ''}${maiorVezesCobrado > 0 ? `Vezes já lembrado: ${maiorVezesCobrado}\n` : ''}</dados>

<tom>
Nível: ${nivel.toUpperCase()}
${tomPorNivel[nivel]}
</tom>

<formato>
- WhatsApp: negrito com UM asterisco (*valor*). NUNCA use dois asteriscos (**texto**).
  CERTO: *R$ ${totalFormatado}*
  ERRADO: **R$ ${totalFormatado}**
- Máximo 2 emojis
- Separe saudação, corpo e despedida com uma linha em branco entre cada
- Máximo 4 linhas de conteúdo (sem contar linhas em branco)
- A ÚLTIMA linha da mensagem DEVE ser uma frase curta convidando a usar o link de pagamento Pix que será colado logo abaixo. Exemplos de última linha:
  "Segue o link pra acertar pelo Pix 👇"
  "Tem um link aqui pra facilitar o Pix:"
  "Deixei o link do Pix aqui embaixo 👇"
  "Pra acertar é só clicar aqui embaixo:"
  NÃO invente um link. Apenas mencione que tem um link logo abaixo.
</formato>

<regras>
${maiorAtraso > 0 ? `- Mencione naturalmente que a continha tem ${maiorAtraso} dias (sem usar a palavra "atraso" ou "atrasado")\n` : ''}- PROIBIDO: dívida, débito, inadimplente, pendência, atraso, atrasado, cobrança, parcelamento, parcela, devendo, "Clique aqui pra pagar", "clique aqui"
- PERMITIDO: continha, comprinha, acertar, lembrar, resolver, valor
- Comece com: ${aberturas[seed]}
- Responda APENAS a mensagem pronta, sem explicações
</regras>

MENSAGEM:`
}

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
    if (contentLength > MAX_MENSAGEM_PAYLOAD_BYTES) {
      return NextResponse.json(
        { error: 'Payload muito grande' },
        { status: 413 }
      )
    }

    const body = await request.json()
    const parsedBody = mensagemRequestSchema.safeParse(body)
    if (!parsedBody.success) {
      return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
    }

    const data = parsedBody.data

    const prompt = buildPrompt(data)

    try {
      const ai = getGoogleAI()

      const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash-lite',
        contents: prompt,
        config: {
          temperature: 0.8,
          maxOutputTokens: 200,
        },
      })

      const text = result.text

      if (!text || text.trim().length < 10) {
        throw new Error('Resposta vazia ou muito curta')
      }

      return NextResponse.json({ mensagem: text.trim() })
    } catch (aiError) {
      console.error('Erro da IA:', aiError)
      throw aiError
    }
  } catch (error) {
    console.error('Erro geral:', error)
    return NextResponse.json(
      {
        mensagem:
          'Oi! Passando pra lembrar da continha. Dá pra acertar pelo Pix? Obrigado!',
      },
      { status: 200 }
    )
  }
}
