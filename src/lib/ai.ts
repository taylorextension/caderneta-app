import { createGoogleGenerativeAI } from '@ai-sdk/google'

const apiKey =
  process.env.GEMINI_API_KEY ||
  process.env.GOOGLE_API_KEY ||
  process.env.GOOGLE_GENERATIVE_AI_API_KEY

if (!apiKey) {
  throw new Error(
    'Google Generative AI API key is missing. Set GEMINI_API_KEY or GOOGLE_API_KEY.'
  )
}

const google = createGoogleGenerativeAI({ apiKey })

export const geminiFlash = google('gemini-2.5-flash-lite')
