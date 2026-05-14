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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { message, history = [] } = req.body
  if (!message || typeof message !== 'string' || message.length > 500) {
    return res.status(400).json({ error: 'Message invalide' })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'Clé API manquante' })
  }

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
    res.status(200).json({ reply })
  } catch (e) {
    console.error('[chat]', e)
    res.status(500).json({ error: 'Erreur IA' })
  }
}
