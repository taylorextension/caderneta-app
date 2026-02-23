import { createGoogleGenerativeAI } from '@ai-sdk/google'

function getApiKey(): string {
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY

  if (!apiKey) {
    throw new Error(
      'Google Generative AI API key is missing. Set GEMINI_API_KEY or GOOGLE_API_KEY.'
    )
  }

  return apiKey
}

// Lazy initialization - só cria o cliente quando necessário
let googleInstance: ReturnType<typeof createGoogleGenerativeAI> | null = null

function getGoogleAI() {
  if (!googleInstance) {
    const google = createGoogleGenerativeAI({ apiKey: getApiKey() })
    googleInstance = google
  }
  return googleInstance
}

// Exporta uma função que retorna o modelo em vez do modelo diretamente
export function geminiFlash() {
  return getGoogleAI()('gemini-2.0-flash-lite')
}
