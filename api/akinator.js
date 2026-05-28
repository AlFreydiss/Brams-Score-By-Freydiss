import { GoogleGenerativeAI } from '@google/generative-ai'

// ── Akinator IA — devine ce à quoi pense l'utilisateur, TOUS DOMAINES ──────────
// Personnages d'anime/manga, films, séries, jeux vidéo, célébrités réelles,
// personnages historiques, animaux, objets, concepts… Le modèle pose une
// question oui/non perspicace à la fois, ou devine quand il est confiant.

const SYSTEM = `Tu es un génie devin, façon Akinator, mais BEAUCOUP plus perspicace.
L'utilisateur pense à quelque chose ou quelqu'un — ça peut être de N'IMPORTE QUEL DOMAINE :
personnage d'anime/manga, film, série, jeu vidéo, célébrité réelle, sportif, musicien,
personnage historique, animal, objet, lieu, concept… Tu ne te limites pas à One Piece.

Règles :
- Pose UNE seule question fermée (oui/non) à la fois, en français, courte et naturelle.
- Sois STRATÉGIQUE : chaque question doit éliminer ~la moitié des possibilités. Commence large
  (réel ou fictif ? humain ? homme/femme ? vivant ? domaine ?) puis affine intelligemment.
- Tiens compte des réponses précédentes, ne te répète jamais, ne pose pas de question déjà tranchée.
- Réponses possibles de l'utilisateur : "oui", "non", "je ne sais pas", "probablement", "probablement pas".
- Quand tu es raisonnablement sûr (ou après ~20 questions), DEVINE un nom précis.
- Si une proposition est rejetée, continue à affiner avec de nouvelles questions, puis re-devine.

Tu réponds UNIQUEMENT par un objet JSON valide, sans texte autour, sans balises de code :
{"action":"question","text":"<la question>","confidence":<0..1>}
ou
{"action":"guess","text":"<le nom précis>","domain":"<domaine, ex: One Piece, Réel, Film...>","confidence":<0..1>}`

function buildUserPrompt(history, rejected) {
  const lines = history.map((h, i) => `Q${i + 1}: ${h.question}\nR${i + 1}: ${h.answer}`).join('\n')
  let p = history.length
    ? `Historique des questions/réponses :\n${lines}\n\n`
    : `Aucune question posée pour l'instant. Pose ta toute première question (la plus discriminante possible).\n\n`
  if (rejected?.length) {
    p += `Propositions DÉJÀ rejetées (ne les re-propose pas) : ${rejected.join(', ')}.\n\n`
  }
  p += `Donne le prochain coup (question ou guess) en JSON strict.`
  return p
}

function isValidGeminiKey(k) {
  return typeof k === 'string' && /^AIzaSy[A-Za-z0-9_-]{30,}$/.test(k.trim())
}

function geminiKeys() {
  return Object.entries(process.env)
    .filter(([k]) =>
      k === 'GEMINI_API_KEY' || k === 'GOOGLE_GEMINI_API_KEY' || k === 'GEMINI_KEY'
      || k === 'GOOGLE_API_KEY' || k.startsWith('GEMINI_API_KEY_')
      || k.startsWith('GOOGLE_GEMINI_API_KEY_') || k.startsWith('GEMINI_KEY_'))
    .map(([, v]) => v?.trim())
    .filter(isValidGeminiKey)
}

function parseJsonLoose(text) {
  if (!text) return null
  // Retire d'éventuelles balises ```json … ```
  const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim()
  const match = cleaned.match(/\{[\s\S]*\}/)
  if (!match) return null
  try { return JSON.parse(match[0]) } catch { return null }
}

async function tryGemini(userPrompt) {
  const keys = geminiKeys()
  if (!keys.length) throw new Error('no_gemini_key')
  const start = Math.floor(Math.random() * keys.length)
  for (let i = 0; i < keys.length; i++) {
    const key = keys[(start + i) % keys.length]
    try {
      const genAI = new GoogleGenerativeAI(key)
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
        systemInstruction: SYSTEM,
        generationConfig: { responseMimeType: 'application/json', temperature: 0.6 },
      })
      const result = await model.generateContent(userPrompt)
      return result.response.text()
    } catch (err) {
      const is429 = err?.status === 429 || /quota|RESOURCE_EXHAUSTED|429/.test(String(err?.message))
      if (is429 && i < keys.length - 1) continue
      throw err
    }
  }
}

async function tryOpenAICompatible(url, key, model, userPrompt) {
  if (!key) throw new Error('no_key')
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: userPrompt }],
      max_tokens: 300, temperature: 0.6,
      response_format: { type: 'json_object' },
    }),
  })
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`)
  const data = await res.json()
  return data.choices?.[0]?.message?.content
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  res.setHeader('Cache-Control', 'no-store')

  const { history = [], rejected = [] } = req.body || {}
  if (!Array.isArray(history) || history.length > 40) {
    return res.status(400).json({ error: 'Historique invalide' })
  }
  const userPrompt = buildUserPrompt(history.slice(-30), Array.isArray(rejected) ? rejected.slice(-20) : [])

  const providers = [
    () => tryGemini(userPrompt),
    () => tryOpenAICompatible('https://api.groq.com/openai/v1/chat/completions', process.env.GROQ_API_KEY, process.env.GROQ_MODEL || 'llama-3.3-70b-versatile', userPrompt),
    () => tryOpenAICompatible('https://api.x.ai/v1/chat/completions', process.env.XAI_API_KEY, process.env.XAI_MODEL || 'grok-2-1212', userPrompt),
  ]

  for (const fn of providers) {
    try {
      const raw = await fn()
      const parsed = parseJsonLoose(raw)
      if (parsed && (parsed.action === 'question' || parsed.action === 'guess') && typeof parsed.text === 'string' && parsed.text.trim()) {
        return res.status(200).json({
          action: parsed.action,
          text: parsed.text.trim().slice(0, 200),
          domain: typeof parsed.domain === 'string' ? parsed.domain.slice(0, 60) : null,
          confidence: typeof parsed.confidence === 'number' ? Math.max(0, Math.min(1, parsed.confidence)) : null,
        })
      }
    } catch (err) {
      console.error('[akinator] provider failed:', err?.message || err)
    }
  }

  return res.status(503).json({ error: "L'IA est indisponible (clé API manquante ou quota). Réessaie plus tard.", code: 'ai_unavailable' })
}
