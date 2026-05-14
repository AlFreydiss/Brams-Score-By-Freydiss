const SYSTEM = `Tu es Brams Score, l'assistant IA officiel de la communauté Discord Brams Community — un serveur One Piece français.
Tu réponds en français, avec un ton décontracté et fun, comme un compagnon.
Tu peux parler de :
- One Piece (personnages, arcs, théories, combats, fruits du démon)
- Animes en général (Naruto, Dragon Ball, Demon Slayer, etc.)
- Le serveur Brams Community (rangs, vocal, Berrys, bot Brams Score)
- Jeux vidéo, culture pop japonaise
Tu ne réinventes jamais des informations. Si tu ne sais pas, tu le dis avec humour.
Garde tes réponses courtes et percutantes (max 3-4 phrases sauf si on te demande plus).`

function getKeys() {
  const keys = []
  if (process.env.GEMINI_API_KEY) keys.push(process.env.GEMINI_API_KEY)
  for (let i = 1; i <= 10; i++) {
    const k = process.env[`GEMINI_API_KEY_${i}`]
    if (k) keys.push(k)
  }
  return keys
}

const MODELS = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-flash-8b']

async function callGemini(apiKey, message, history) {
  const contents = [
    ...history.slice(-10).map(m => ({
      role: m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.text }],
    })),
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
        }
      )

      if (res.status === 429) throw Object.assign(new Error('rate_limit'), { rateLimit: true })
      if (res.status === 404) continue
      if (!res.ok) continue

      const data = await res.json()
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
      if (text) return text
    } catch (e) {
      if (e.rateLimit) throw e
      // erreur réseau ou modèle indispo → essaie le modèle suivant
    }
  }

  throw Object.assign(new Error('rate_limit'), { rateLimit: true })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { message, history = [] } = req.body || {}
  if (!message || typeof message !== 'string' || message.length > 500) {
    return res.status(400).json({ error: 'Message invalide' })
  }

  const keys = getKeys()
  if (!keys.length) return res.status(500).json({ error: 'Service indisponible' })

  const shuffled = [...keys].sort(() => Math.random() - 0.5)

  for (let pass = 0; pass < 2; pass++) {
    if (pass === 1) await new Promise(r => setTimeout(r, 1500))
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

  return res.status(429).json({ error: 'Trop de requêtes en ce moment, réessaie dans une minute.' })
}
