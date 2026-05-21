import { GoogleGenerativeAI } from '@google/generative-ai'

const SYSTEM = `Tu es Brams Score IA, l'assistant officiel du serveur Discord One Piece francophone "Brams Community".
Tu réponds en français avec passion pour One Piece.
Rangs du serveur : Pirate → Shichibukai → Amiral → Yonkou, attribués automatiquement selon l'activité vocale et messages des 7 derniers jours.
Réponds en 2-4 phrases max sauf si on te demande un détail approfondi.`

function isValidKey(k) {
  return typeof k === 'string' && /^AIzaSy[A-Za-z0-9_-]{30,}$/.test(k.trim())
}

function getKeys() {
  return Object.entries(process.env)
    .filter(([k]) => k === 'GEMINI_API_KEY' || k.startsWith('GEMINI_API_KEY_'))
    .map(([, v]) => v?.trim())
    .filter(isValidKey)
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

async function tryGroq(message, chatHistory) {
  const key = process.env.GROQ_API_KEY
  if (!key) throw new Error('no_groq_key')

  const messages = [
    { role: 'system', content: SYSTEM },
    ...chatHistory.map(m => ({ role: m.role === 'model' ? 'assistant' : 'user', content: m.parts[0].text })),
    { role: 'user', content: message },
  ]

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages,
      max_tokens: 300,
      temperature: 0.7,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`groq_${res.status}: ${err}`)
  }

  const data = await res.json()
  return data.choices[0].message.content
}

async function tryXAI(message, chatHistory) {
  const key = process.env.XAI_API_KEY
  if (!key) throw new Error('no_xai_key')

  const messages = [
    { role: 'system', content: SYSTEM },
    ...chatHistory.map(m => ({ role: m.role === 'model' ? 'assistant' : 'user', content: m.parts[0].text })),
    { role: 'user', content: message },
  ]

  const res = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'grok-code-fast-1',
      messages,
      max_tokens: 400,
      temperature: 0.7,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`xai_${res.status}: ${err}`)
  }

  const data = await res.json()
  return data.choices[0].message.content
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
    // Grok Codex Mode (Max Performance) - Priorité absolue
    const reply = await tryXAI(message.trim(), chatHistory)
    return res.status(200).json({ reply })
  } catch (xaiErr) {
    console.error('[chat] xai primary failed, falling back:', xaiErr?.message)

    try {
      const reply = await tryWithRotation(message.trim(), chatHistory)
      return res.status(200).json({ reply })
    } catch (err) {
      const isRateLimit = err?.status === 429
        || String(err?.message).includes('quota')
        || String(err?.message).includes('RESOURCE_EXHAUSTED')
        || err?.message === 'no_valid_keys'

      if (isRateLimit) {
        try {
          const reply = await tryGroq(message.trim(), chatHistory)
          return res.status(200).json({ reply })
        } catch (groqErr) {
          console.error('[chat] groq fallback failed:', groqErr?.message)
        }
      }

      console.error('[chat]', err?.message || err)
      if (isRateLimit) return res.status(429).json({ error: 'Je reçois trop de messages en ce moment, réessaie dans quelques secondes !' })
      return res.status(503).json({ error: 'Service unavailable' })
    }
  }
}
