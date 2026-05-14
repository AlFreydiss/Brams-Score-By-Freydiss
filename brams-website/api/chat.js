import { GoogleGenerativeAI } from '@google/generative-ai'

const SYSTEM = `Tu es Brams Score, l'assistant IA officiel de la communauté Discord Brams Community — un serveur One Piece français.
Tu réponds en français, avec un ton décontracté et fun, comme un nakama (compagnon).
Tu peux parler de :
- One Piece (personnages, arcs, théories, combats, fruits du démon)
- Animes en général (Naruto, Dragon Ball, Demon Slayer, etc.)
- Le serveur Brams Community (rangs, vocal, Berrys, bot Brams Score)
- Jeux vidéo, culture pop japonaise
Tu ne réinventes jamais des informations. Si tu ne sais pas, tu le dis avec humour.
Garde tes réponses courtes et percutantes (max 3-4 phrases sauf si on te demande plus).`

function getKeys() {
  const keys = []
  // GEMINI_API_KEY, GEMINI_API_KEY_2, GEMINI_API_KEY_3, ... jusqu'à 10
  if (process.env.GEMINI_API_KEY) keys.push(process.env.GEMINI_API_KEY)
  for (let i = 2; i <= 10; i++) {
    const k = process.env[`GEMINI_API_KEY_${i}`]
    if (k) keys.push(k)
  }
  return keys
}

function pickKey(keys) {
  return keys[Math.floor(Math.random() * keys.length)]
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { message, history = [] } = req.body
  if (!message || typeof message !== 'string' || message.length > 500) {
    return res.status(400).json({ error: 'Message invalide' })
  }

  const keys = getKeys()
  if (!keys.length) {
    return res.status(500).json({ error: 'Aucune clé API configurée' })
  }

  // Essaie jusqu'à toutes les clés disponibles en cas de rate limit
  const shuffled = [...keys].sort(() => Math.random() - 0.5)
  let lastError = null

  for (const apiKey of shuffled) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey)
      const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        systemInstruction: SYSTEM,
      })

      const chat = model.startChat({
        history: history.slice(-10).map(m => ({
          role: m.role,
          parts: [{ text: m.text }],
        })),
      })

      const result = await chat.sendMessage(message)
      const reply = result.response.text()
      return res.status(200).json({ reply })
    } catch (e) {
      // 429 = rate limit → on essaie la clé suivante
      const isRateLimit = e?.status === 429 || e?.message?.includes('429') || e?.message?.includes('quota')
      if (isRateLimit) {
        lastError = e
        continue
      }
      // Autre erreur → on arrête
      console.error('[chat]', e)
      return res.status(500).json({ error: 'Erreur IA' })
    }
  }

  console.error('[chat] Toutes les clés sont en rate limit', lastError)
  return res.status(429).json({ error: 'Trop de requêtes, réessaie dans quelques secondes.' })
}
