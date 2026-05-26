import { GoogleGenerativeAI } from '@google/generative-ai'

const SYSTEM = `Tu es Brams Score IA, l'assistant officiel du serveur Discord One Piece francophone "Brams Community".
Tu réponds en français avec passion pour One Piece.
Rangs du serveur : Pirate → Shichibukai → Amiral → Yonkou, attribués automatiquement selon l'activité vocale et messages des 7 derniers jours.
Réponds en 2-4 phrases max sauf si on te demande un détail approfondi.`

const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'
const XAI_MODEL = process.env.XAI_MODEL || 'grok-code-fast-1'

function isValidKey(k) {
  return typeof k === 'string' && /^AIzaSy[A-Za-z0-9_-]{30,}$/.test(k.trim())
}

function getKeys() {
  return Object.entries(process.env)
    .filter(([k]) =>
      k === 'GEMINI_API_KEY'
      || k === 'GOOGLE_GEMINI_API_KEY'
      || k === 'GEMINI_KEY'
      || k === 'GOOGLE_API_KEY'
      || k.startsWith('GEMINI_API_KEY_')
      || k.startsWith('GOOGLE_GEMINI_API_KEY_')
      || k.startsWith('GEMINI_KEY_')
    )
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
      model: GROQ_MODEL,
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
      model: XAI_MODEL,
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

function classifyError(err) {
  const msg = String(err?.message || err || '').toLowerCase()
  if (
    msg.includes('no_valid_keys')
    || msg.includes('no_groq_key')
    || msg.includes('no_xai_key')
    || msg.includes('api key not valid')
    || msg.includes('invalid api key')
    || msg.includes('401')
    || msg.includes('403')
  ) return 'config'

  if (
    err?.status === 429
    || msg.includes('429')
    || msg.includes('quota')
    || msg.includes('resource_exhausted')
    || msg.includes('rate limit')
    || msg.includes('rate_limit')
    || msg.includes('too many requests')
  ) return 'rate_limit'

  return 'provider_error'
}

async function runProvider(name, fn, errors) {
  try {
    const reply = await fn()
    return { reply, provider: name }
  } catch (err) {
    errors.push({ provider: name, kind: classifyError(err), message: err?.message || String(err) })
    console.error(`[chat] ${name} failed:`, err?.message || err)
    return null
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  res.setHeader('Cache-Control', 'no-store')

  const { message, history = [] } = req.body || {}
  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'Message requis' })
  }
  if (message.length > 500) return res.status(400).json({ error: 'Message trop long' })

  const chatHistory = history
    .filter(m => m.role && m.text)
    .slice(-10)
    .map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.text }] }))

  const trimmed = message.trim()
  const errors = []
  const providers = [
    ['gemini', () => tryWithRotation(trimmed, chatHistory)],
    ['groq', () => tryGroq(trimmed, chatHistory)],
    ['xai', () => tryXAI(trimmed, chatHistory)],
  ]

  for (const [name, fn] of providers) {
    const result = await runProvider(name, fn, errors)
    if (result?.reply) return res.status(200).json(result)
  }

  const kinds = new Set(errors.map(e => e.kind))
  const allConfig = errors.length > 0 && [...kinds].every(k => k === 'config')
  const hasRateLimit = kinds.has('rate_limit')

  if (allConfig) {
    return res.status(503).json({
      error: "L'IA du site n'a pas de clé API valide configurée. Ajoute GEMINI_API_KEY ou GROQ_API_KEY dans les variables du déploiement.",
      code: 'ai_not_configured',
    })
  }

  if (hasRateLimit) {
    return res.status(429).json({
      error: 'Je reçois trop de messages en ce moment, réessaie dans quelques secondes !',
      code: 'ai_rate_limited',
    })
  }

  return res.status(503).json({
    error: "L'IA est temporairement indisponible. Réessaie dans un instant.",
    code: 'ai_unavailable',
  })
}
