import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

const SYSTEM = `Tu es Brams Score IA, l'assistant officiel du serveur Discord One Piece francophone "Brams Community".
Tu réponds en français avec passion pour One Piece.
Rangs du serveur : Pirate → Shichibukai → Amiral → Yonkou, attribués automatiquement selon l'activité vocale et messages des 7 derniers jours.
Réponds en 2-4 phrases max sauf si on te demande un détail approfondi.`

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { message, history = [] } = req.body || {}
  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'Message requis' })
  }
  if (message.length > 500) return res.status(400).json({ error: 'Message trop long' })

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: SYSTEM,
    })

    const chat = model.startChat({
      history: history
        .filter(m => m.role && m.text)
        .slice(-10)
        .map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.text }] })),
    })

    const result = await chat.sendMessage(message.trim())
    return res.status(200).json({ reply: result.response.text() })
  } catch (err) {
    console.error('[chat]', err)
    if (err?.status === 429 || err?.message?.includes('quota')) {
      return res.status(429).json({ error: 'Rate limit' })
    }
    return res.status(503).json({ error: 'Service unavailable' })
  }
}
