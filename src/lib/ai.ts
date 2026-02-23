import { GoogleGenAI } from '@google/genai'

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

let googleInstance: GoogleGenAI | null = null

export function getGoogleAI() {
  if (!googleInstance) {
    googleInstance = new GoogleGenAI({ apiKey: getApiKey() })
  }
  return googleInstance
}
