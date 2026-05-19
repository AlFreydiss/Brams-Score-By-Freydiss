import { GoogleGenerativeAI } from '@google/generative-ai'

const SYSTEM = `Tu es Brams Score IA, l'assistant officiel du serveur Discord One Piece francophone "Brams Community".
Tu réponds en français avec passion pour One Piece.
Rangs du serveur : Pirate → Shichibukai → Amiral → Yonkou, attribués automatiquement selon l'activité vocale et messages des 7 derniers jours.
Réponds en 2-4 phrases max sauf si on te demande un détail approfondi.`

function getKeys() {
  const keys = []
  const base = process.env.GEMINI_API_KEY
  if (base) keys.push(base)
  for (let i = 1; i <= 8; i++) {
    const k = process.env[`GEMINI_API_KEY_${i}`]
    if (k) keys.push(k)
  }
  return keys
}

async function tryWithRotation(message, chatHistory) {
  const keys = getKeys()
  if (keys.length === 0) throw new Error('no_keys')

  // Start from a random key to distribute load
  const start = Math.floor(Math.random() * keys.length)

  for (let i = 0; i < keys.length; i++) {
    const key = keys[(start + i) % keys.length]
    try {
      const genAI = new GoogleGenerativeAI(key)
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
        systemInstruction: SYSTEM,
      })
      const chat = model.startChat({ history: chatHistory })
      const result = await chat.sendMessage(message)
      return result.response.text()
    } catch (err) {
      const is429 = err?.status === 429 || err?.message?.includes('quota') || err?.message?.includes('RESOURCE_EXHAUSTED')
      if (is429 && i < keys.length - 1) continue
      throw err
    }
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { message, history = [] } = req.body || {}
  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'Message requis' })
  }
  if (message.length > 500) return res.status(400).json({ error: 'Message trop long' })

  const chatHistory = history
    .filter(m => m.role && m.text)
    .slice(-10)
    .map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.text }] }))

  try {
    const reply = await tryWithRotation(message.trim(), chatHistory)
    return res.status(200).json({ reply })
  } catch (err) {
    console.error('[chat]', err)
    if (err?.status === 429 || err?.message?.includes('quota') || err?.message?.includes('RESOURCE_EXHAUSTED')) {
      return res.status(429).json({ error: 'Rate limit' })
    }
    return res.status(503).json({ error: 'Service unavailable' })
  }
}
