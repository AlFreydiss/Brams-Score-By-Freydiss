import { GoogleGenerativeAI } from '@google/generative-ai'

const SYSTEM = `Tu es Brams Score IA, l'assistant officiel du serveur Discord One Piece francophone "Brams Community".
Tu réponds en français avec passion pour One Piece.
Rangs du serveur : Pirate → Shichibukai → Amiral → Yonkou, attribués automatiquement selon l'activité vocale et messages des 7 derniers jours.
Réponds en 2-4 phrases max sauf si on te demande un détail approfondi.`

// Gemini keys start with AIzaSy and are ~39 chars — reject anything malformed
function isValidKey(k) {
  return typeof k === 'string' && /^AIzaSy[A-Za-z0-9_-]{30,}$/.test(k.trim())
}

function getKeys() {
  const raw = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_1,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
    process.env.GEMINI_API_KEY_4,
    process.env.GEMINI_API_KEY_5,
    process.env.GEMINI_API_KEY_6,
    process.env.GEMINI_API_KEY_7,
    process.env.GEMINI_API_KEY_8,
  ]
  return raw.map(k => k?.trim()).filter(isValidKey)
}

async function tryWithRotation(message, chatHistory) {
  const keys = getKeys()
  if (keys.length === 0) throw new Error('no_valid_keys')

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
      const is429 = err?.status === 429
        || String(err?.message).includes('quota')
        || String(err?.message).includes('RESOURCE_EXHAUSTED')
        || String(err?.message).includes('429')
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
    console.error('[chat]', err?.message || err)
    const isRateLimit = err?.status === 429
      || String(err?.message).includes('quota')
      || String(err?.message).includes('RESOURCE_EXHAUSTED')
    if (isRateLimit) return res.status(429).json({ error: 'Rate limit' })
    return res.status(503).json({ error: 'Service unavailable' })
  }
}
