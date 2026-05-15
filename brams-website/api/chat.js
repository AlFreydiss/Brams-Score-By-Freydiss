import { checkRateLimit, getClientIp } from './_ratelimit.js'

const SYSTEM = `Tu es Brams Score, l'assistant IA officiel de la communauté Discord Brams Community — un serveur One Piece français.
Tu réponds en français, avec un ton décontracté et fun, comme un compagnon.
Tu peux parler de :
- One Piece (personnages, arcs, théories, combats, fruits du démon)
- Animes en général (Naruto, Dragon Ball, Demon Slayer, etc.)
- Le serveur Brams Community (rangs, vocal, Berrys, bot Brams Score)
- Jeux vidéo, culture pop japonaise
Tu ne réinventes jamais des informations. Si tu ne sais pas, tu le dis avec humour.
Garde tes réponses courtes et percutantes (max 3-4 phrases sauf si on te demande plus).`

// ── Clés API ──────────────────────────────────────────────────────────────────

function getKeys() {
  const keys = []
  if (process.env.GEMINI_API_KEY) keys.push(process.env.GEMINI_API_KEY)
  for (let i = 1; i <= 10; i++) {
    const k = process.env[`GEMINI_API_KEY_${i}`]
    if (k) keys.push(k)
  }
  return keys
}

// flash-8b en premier : quota plus généreux sur le free tier
const MODELS = ['gemini-1.5-flash-8b', 'gemini-2.0-flash', 'gemini-1.5-flash']

// ── Sanitisation ──────────────────────────────────────────────────────────────

function sanitizeText(str) {
  if (typeof str !== 'string') return ''
  return str
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '') // control chars
    .replace(/<[^>]*>/g, '')                             // balises HTML
    .trim()
}

function validateHistory(history) {
  if (!Array.isArray(history)) return []
  return history
    .slice(-10)
    .filter(m => m && typeof m === 'object' && typeof m.text === 'string' && typeof m.role === 'string')
    .map(m => ({
      role: m.role === 'model' ? 'model' : 'user',
      text: sanitizeText(m.text).slice(0, 500),
    }))
}

// ── Appel Gemini ──────────────────────────────────────────────────────────────

async function callGemini(apiKey, message, history) {
  const contents = [
    ...history.map(m => ({ role: m.role, parts: [{ text: m.text }] })),
    { role: 'user', parts: [{ text: message }] },
  ]

  for (const model of MODELS) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: SYSTEM }] },
            contents,
            generationConfig: { maxOutputTokens: 512, temperature: 0.8 },
          }),
          signal: AbortSignal.timeout(10_000),
        }
      )

      if (!res.ok) continue

      const data = await res.json()
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
      if (text) return text
    } catch {
      // timeout ou erreur réseau, essaie le modèle suivant
    }
  }

  throw Object.assign(new Error('rate_limit'), { rateLimit: true })
}

// ── Handler ───────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  // CORS preflight
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Rate limiting
  const ip = getClientIp(req)
  const rl = checkRateLimit(ip, 15, 60_000) // 15 req/min par IP
  if (!rl.allowed) {
    res.setHeader('Retry-After', String(rl.retryAfter))
    return res.status(429).json({ error: 'Trop de messages, patiente 1 minute.' })
  }

  // Validation du body
  const body = req.body || {}
  if (typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({ error: 'Requête invalide.' })
  }

  const rawMessage = body.message
  if (!rawMessage || typeof rawMessage !== 'string') {
    return res.status(400).json({ error: 'Message manquant.' })
  }

  const message = sanitizeText(rawMessage)
  if (message.length < 1 || message.length > 500) {
    return res.status(400).json({ error: 'Message invalide (1–500 caractères).' })
  }

  // Anti-spam : rejette les messages sans contenu utile
  if (/^(.)\1{15,}$/.test(message)) {
    return res.status(400).json({ error: 'Message invalide.' })
  }

  const history = validateHistory(body.history)

  const keys = getKeys()
  if (!keys.length) return res.status(503).json({ error: 'Service temporairement indisponible.' })

  const shuffled = [...keys].sort(() => Math.random() - 0.5)

  const DELAYS = [0, 1200, 3000]
  for (let pass = 0; pass < DELAYS.length; pass++) {
    if (DELAYS[pass] > 0) await new Promise(r => setTimeout(r, DELAYS[pass]))
    for (const key of shuffled) {
      try {
        const reply = await callGemini(key, message, history)
        return res.status(200).json({ reply })
      } catch (e) {
        if (e.rateLimit) continue
        console.error('[chat]', e.message)
        continue
      }
    }
  }

  return res.status(503).json({ error: "L'IA est occupée, réessaie dans quelques secondes." })
}
