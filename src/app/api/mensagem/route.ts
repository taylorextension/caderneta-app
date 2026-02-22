import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { geminiFlash } from '@/lib/ai'
import type { MensagemRequest } from '@/types/api'

function buildPrompt(data: MensagemRequest): string {
  if (!data.notas || data.notas.length === 0) {
    return 'Oi! Passando pra lembrar da continha. Dá pra acertar pelo Pix? Obrigado!'
  }

  // Sempre usa o NOME, não apelido
  const primeiroNome = (data.cliente_nome || 'Cliente').split(' ')[0]
  const nomeLoja = data.nome_loja || ''
  const nomeLojista = data.lojista_nome?.split(' ')[0] || ''
  const totalFormatado = Number(data.total || 0).toFixed(2).replace('.', ',')

  // Detecta preposição correta para o nome do comércio
  const primeiraParaLoja = nomeLoja.split(' ')[0]?.toLowerCase() || ''
  const femininos = ['padaria', 'mercearia', 'loja', 'casa', 'distribuidora', 'doceria', 'confeitaria', 'papelaria', 'farmácia', 'farmacia', 'quitanda', 'barraca', 'feira', 'cantina', 'lanchonete', 'pizzaria', 'sorveteria', 'tabacaria', 'drogaria', 'ótica', 'otica', 'floricultura', 'academia', 'barbearia', 'oficina', 'borracharia']
  const masculinos = ['mercado', 'mercadinho', 'bar', 'super', 'supermercado', 'armazem', 'armazém', 'atacado', 'atacadão', 'atacadao', 'empório', 'emporio', 'restaurante', 'boteco', 'petshop', 'pet', 'açougue', 'acougue', 'posto', 'salão', 'salao', 'estúdio', 'estudio', 'depósito', 'deposito']
  let refLoja = ''
  if (nomeLoja) {
    if (femininos.includes(primeiraParaLoja)) {
      refLoja = `da ${nomeLoja}`
    } else if (masculinos.includes(primeiraParaLoja)) {
      refLoja = `do ${nomeLoja}`
    } else {
      // Tenta inferir pelo final da primeira palavra
      if (primeiraParaLoja.endsWith('ia') || primeiraParaLoja.endsWith('ria') || primeiraParaLoja.endsWith('ca') || primeiraParaLoja.endsWith('da') || primeiraParaLoja.endsWith('ça') || primeiraParaLoja.endsWith('sa')) {
        refLoja = `da ${nomeLoja}`
      } else {
        refLoja = `do ${nomeLoja}`
      }
    }
  }

  // Calcula dias vencidos da nota mais antiga
  const diasVencidos = data.notas
    .filter(n => n.data_vencimento)
    .map(n => {
      const diff = Date.now() - new Date(n.data_vencimento!).getTime()
      return Math.floor(diff / (1000 * 60 * 60 * 24))
    })
    .filter(d => d > 0)
  const maiorAtraso = diasVencidos.length > 0 ? Math.max(...diasVencidos) : 0

  // Contexto de vencimento para o prompt
  let ctxVencimento = ''
  if (maiorAtraso > 0) {
    ctxVencimento = `\nDias desde o vencimento: ${maiorAtraso} dias`
  }

  // Monta lista de itens compacta
  const itensResumo = data.notas
    .flatMap((n) =>
      n.itens?.length > 0
        ? n.itens.map((i) => `${i.descricao} (${i.quantidade}x)`)
        : [n.descricao || 'Compra']
    )
    .join(', ')

  // Exemplos adaptados ao cenário (com ou sem vencimento)
  let exemploComVencimento = ''
  if (maiorAtraso > 0) {
    exemploComVencimento = `
3)
${primeiroNome}, tudo certo?

Aquela continha de *R$${totalFormatado}*${refLoja ? ` aqui ${refLoja}` : ''} já tem ${maiorAtraso} dias.

Quando der, manda um Pix pra gente acertar! 🙏`
  } else {
    exemploComVencimento = `
3)
${primeiroNome}, beleza?

Aquela continha de *R$${totalFormatado}* tá aberta ainda.

Me manda um Pix quando puder!${nomeLojista ? ` ${nomeLojista}` : ''} 🙏`
  }

  return `Você gera mensagens curtas de cobrança para WhatsApp de pequenos comércios brasileiros.

TAREFA: Gere UMA mensagem para lembrar ${primeiroNome} da continha de *R$${totalFormatado}*${refLoja ? ` ${refLoja}` : ''}.
${itensResumo ? `Itens: ${itensResumo}` : ''}${ctxVencimento}

FORMATAÇÃO WHATSAPP:
- Negrito = UM asterisco: *texto* (nunca **texto**)
- Máximo 2 emojis
- Separe a saudação, o corpo e a despedida com linhas em branco (dupla quebra de linha)
- Isso deixa a mensagem arejada e fácil de ler no celular

REGRAS:
- Tom: amigável e leve, como falar com vizinho
- Mencione Pix como pagamento
${maiorAtraso > 0 ? `- Mencione naturalmente que a continha já tem ${maiorAtraso} dias (sem usar a palavra "atraso")` : ''}
- NUNCA use: dívida, débito, inadimplente, pendência, atraso, cobrança, parcelamento, parcela
- USE: continha, comprinha, acertar, lembrar
- NÃO inclua link (é adicionado depois)
- Responda SÓ a mensagem, nada mais

EXEMPLOS:
1)
Oi ${primeiroNome}! 😊

Passando pra lembrar daquela continha de *R$${totalFormatado}*${refLoja ? ` aqui ${refLoja}` : ''}.

Quando puder, manda por Pix!
${nomeLojista ? `Abraço, ${nomeLojista}` : 'Valeu!'} 🙏

2)
E aí ${primeiroNome}, tudo bem?

Só lembrando da comprinha de *R$${totalFormatado}*${refLoja ? ` aqui ${refLoja}` : ''}.

Aceito Pix quando der pra você! 😊
${exemploComVencimento}

Gere uma mensagem DIFERENTE dos exemplos acima, variando estrutura e palavras. Mesma vibe, texto novo.

MENSAGEM:`
}

export async function POST(request: NextRequest) {
  try {
    const data: MensagemRequest = await request.json()

    const prompt = buildPrompt(data)

    try {
      const result = await generateText({
        model: geminiFlash(),
        prompt: prompt,
        temperature: 0.8,
        maxTokens: 200,
      })

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
