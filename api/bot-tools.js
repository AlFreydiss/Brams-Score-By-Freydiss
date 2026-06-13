// Routeur multi-outils — regroupe plusieurs endpoints en UNE seule fonction
// serverless (limite Hobby Vercel = 12 fonctions). Chaque outil gère sa propre auth.
//   ?tool=seed-shop-backgrounds  (GET,  secret)
//   ?tool=sync-bot               (POST, Bearer BOT_SYNC_SECRET)
//   ?tool=akinator               (POST, public — devine IA)
//   ?tool=r2-presign             (POST, x-upload-secret — URL présignée R2)
//   ?tool=turn-credentials       (GET, public — ICE/TURN sans exposer les secrets)
//   ?tool=stripe-checkout        (POST, auth — crée une session Checkout)
//   ?tool=stripe-complete        (POST, auth — finalise un retour Checkout)
//   ?tool=stripe-webhook         (POST, Stripe — débloque après paiement)
import { createHmac, timingSafeEqual } from 'node:crypto'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { OPENING_BACKGROUNDS } from '../src/data/opening-backgrounds.js'
import { openingBgPriceCents } from '../src/lib/openingBgPricing.js'

const SUPABASE_URL = 'https://zeqetrmulqndxugfbojd.supabase.co'

const BACKGROUNDS = [
  { id:'bg-unravel',        name:'Fond : Unravel',                description:"Un fond sombre et fragmente. Porte uniquement par les nakamas qui ont tout compris.",         category:'Fonds', price:5000000, rarity:'Secret',     stock:null, limited:false, active:true, reward_type:'opening_background', reward_data:{ opTitle:'Unravel',               anime:'Tokyo Ghoul' } },
  { id:'bg-the-rumbling',   name:'Fond : The Rumbling',           description:"La fin du monde en fond. Reserve aux rares qui ont tenu jusqu'au bout.",                      category:'Fonds', price:6000000, rarity:'Secret',     stock:null, limited:false, active:true, reward_type:'opening_background', reward_data:{ opTitle:'The Rumbling',          anime:'Attack on Titan Final' } },
  { id:'bg-gurenge',        name:'Fond : Gurenge',                description:"Flammes et lames. L'ouverture qui a lance une ere nouvelle.",                                 category:'Fonds', price:2500000, rarity:'Mythique',   stock:null, limited:false, active:true, reward_type:'opening_background', reward_data:{ opTitle:'Gurenge',               anime:'Demon Slayer' } },
  { id:'bg-kaikai-kitan',   name:'Fond : Kaikai Kitan',           description:"Les maledictions comme decor. Une ambiance unique et redoutable.",                            category:'Fonds', price:2500000, rarity:'Mythique',   stock:null, limited:false, active:true, reward_type:'opening_background', reward_data:{ opTitle:'Kaikai Kitan',          anime:'Jujutsu Kaisen' } },
  { id:'bg-we-are',         name:"Fond : We Are!",                description:"Le grand voyage des nakamas. Fond culte pour les vrais fans de One Piece.",                   category:'Fonds', price:1500000, rarity:'Legendaire', stock:null, limited:false, active:true, reward_type:'opening_background', reward_data:{ opTitle:"We Are!",              anime:'One Piece' } },
  { id:'bg-again',          name:'Fond : Again',                  description:"Alchimie et metal. L'opening parfait d'une des meilleures series de tous les temps.",         category:'Fonds', price:1500000, rarity:'Legendaire', stock:null, limited:false, active:true, reward_type:'opening_background', reward_data:{ opTitle:'Again',                anime:'FMA: Brotherhood' } },
  { id:'bg-cruel-angel',    name:"Fond : A Cruel Angel's Thesis", description:"L'opening mythique. Un morceau de legende pour un fond qui force le respect.",                category:'Fonds', price:1500000, rarity:'Legendaire', stock:null, limited:false, active:true, reward_type:'opening_background', reward_data:{ opTitle:"A Cruel Angel's Thesis",anime:'Neon Genesis Evangelion' } },
  { id:'bg-hacking-gate',   name:'Fond : Hacking to the Gate',    description:"El Psy Kongroo. Pour les voyageurs du temps et les nostalgiques du futur.",                  category:'Fonds', price:1500000, rarity:'Legendaire', stock:null, limited:false, active:true, reward_type:'opening_background', reward_data:{ opTitle:'Hacking to the Gate',  anime:'Steins;Gate' } },
  { id:'bg-blue-bird',      name:'Fond : Blue Bird',              description:"L'oiseau bleu de Sasuke. Nostalgie garantie pour chaque fan de Naruto.",                     category:'Fonds', price: 900000, rarity:'Epique',     stock:null, limited:false, active:true, reward_type:'opening_background', reward_data:{ opTitle:'Blue Bird',            anime:'Naruto' } },
  { id:'bg-silhouette',     name:'Fond : Silhouette',             description:"La course vers un but. Silhouettes et ambiance chaude de Konoha.",                            category:'Fonds', price: 900000, rarity:'Epique',     stock:null, limited:false, active:true, reward_type:'opening_background', reward_data:{ opTitle:'Silhouette',           anime:'Naruto Shippuden' } },
  { id:'bg-haruka-mirai',   name:'Fond : Haruka Mirai',           description:"L'energie brute d'Asta. Pour ceux qui n'abandonnent jamais.",                                category:'Fonds', price: 900000, rarity:'Epique',     stock:null, limited:false, active:true, reward_type:'opening_background', reward_data:{ opTitle:'Haruka Mirai',         anime:'Black Clover' } },
  { id:'bg-colors',         name:'Fond : Colors',                 description:"L'echiquier de Lelouch. Strategie et trahison comme toile de fond.",                         category:'Fonds', price: 600000, rarity:'Rare',       stock:null, limited:false, active:true, reward_type:'opening_background', reward_data:{ opTitle:'Colors',              anime:'Code Geass' } },
  { id:'bg-connect',        name:'Fond : Connect',                description:"L'illusion de la magie. Derriere la douceur, quelque chose de bien plus sombre.",             category:'Fonds', price: 600000, rarity:'Rare',       stock:null, limited:false, active:true, reward_type:'opening_background', reward_data:{ opTitle:'Connect',             anime:'Puella Magi Madoka Magica' } },
  { id:'bg-99',             name:'Fond : 99',                     description:"100% - Une explosion d'energie psychique comme ambiance.",                                    category:'Fonds', price: 600000, rarity:'Rare',       stock:null, limited:false, active:true, reward_type:'opening_background', reward_data:{ opTitle:'99',                  anime:'Mob Psycho 100' } },
  { id:'bg-tank',           name:'Fond : Tank!',                  description:"Jazz, espace et melancolie. L'un des openings les plus cultes de l'histoire.",                category:'Fonds', price: 600000, rarity:'Rare',       stock:null, limited:false, active:true, reward_type:'opening_background', reward_data:{ opTitle:'Tank!',               anime:'Cowboy Bebop' } },
  { id:'bg-crossing-field', name:'Fond : crossing field',         description:"L'ouverture qui a lance une generation. Simple, efficace, memorable.",                        category:'Fonds', price: 400000, rarity:'Commun',     stock:null, limited:false, active:true, reward_type:'opening_background', reward_data:{ opTitle:'crossing field',      anime:'Sword Art Online' } },
]

function getServiceHeaders() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY manquant')
  return {
    'Content-Type': 'application/json',
    'apikey': key,
    'Authorization': `Bearer ${key}`,
    'Prefer': 'resolution=merge-duplicates,return=minimal',
  }
}

async function seedShopBackgrounds(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })
  const secret = process.env.SEED_SECRET || process.env.BOT_SYNC_SECRET
  if (!secret || req.query.secret !== secret) {
    return res.status(401).json({ error: 'Non autorise - ?secret=SEED_SECRET requis' })
  }
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/shop_items?on_conflict=id`, {
      method: 'POST', headers: getServiceHeaders(), body: JSON.stringify(BACKGROUNDS),
    })
    if (!r.ok) return res.status(502).json({ error: `Supabase: ${r.status} - ${await r.text()}` })
    return res.status(200).json({ ok: true, seeded: BACKGROUNDS.length })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}

async function syncBot(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  if (req.method === 'OPTIONS') { res.status(204).end(); return }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const secret = process.env.BOT_SYNC_SECRET
  if (!secret) return res.status(503).json({ error: 'BOT_SYNC_SECRET non configure' })
  if ((req.headers['authorization'] || '') !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Non autorise' })
  }
  const { users } = req.body || {}
  if (!Array.isArray(users) || users.length === 0) return res.status(400).json({ error: 'Payload invalide - users[] requis' })
  if (users.length > 500) return res.status(400).json({ error: 'Trop d utilisateurs par batch (max 500)' })

  const rows = users.map(u => ({
    uid: String(u.uid),
    data: {
      username: u.username || null, avatar_url: u.avatar_url || null,
      berrys: Number(u.berrys ?? 0), vocal_seconds_7d: Number(u.vocal_seconds_7d ?? 0),
      vocal_h: Number((u.vocal_seconds_7d ?? 0) / 3600).toFixed(2),
      messages_7d: Number(u.messages_7d ?? 0), rank: u.rank || null,
      synced_at: new Date().toISOString(),
    },
  }))
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/users?on_conflict=uid`, {
      method: 'POST', headers: getServiceHeaders(), body: JSON.stringify(rows),
    })
    if (!r.ok) { console.error('[sync-bot]', r.status, await r.text()); return res.status(502).json({ error: `Supabase: ${r.status}` }) }
    return res.status(200).json({ ok: true, synced: rows.length })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}

// ── Akinator IA (devine tous domaines) ────────────────────────────────────────
const AK_SYSTEM = `Tu es un génie devin, façon Akinator, mais beaucoup plus perspicace.
L'utilisateur pense à quelque chose ou quelqu'un dans n'importe quel domaine :
anime/manga, film, série, jeu vidéo, célébrité réelle, sportif, musicien,
personnage historique, animal, objet, lieu, concept, marque, événement, etc.

Méthode obligatoire :
- Maintiens mentalement une liste d'hypothèses probables avec poids de confiance.
- Pose UNE seule question fermée oui/non à la fois, en français, courte et naturelle.
- Chaque question doit avoir un vrai gain d'information : elle doit couper l'espace des possibilités ou départager 2-5 candidats proches.
- Commence par le domaine et la nature de la cible, puis affine : univers, époque, rôle, apparence/capacité, détail distinctif.
- Interprète les réponses nuancées : "probablement oui" = indice positif faible, "probablement non" = indice négatif faible, "je ne sais pas" = information neutre.
- Ne répète jamais une question déjà posée, ni une reformulation de la même idée.
- N'utilise pas de questions trop vagues si une question discriminante existe ("est-ce connu/populaire" est faible).
- Avant 7 questions, ne devine que si une identité est quasi certaine.
- Après 12 questions, privilégie les questions qui séparent les meilleurs candidats restants.
- Après 18 questions, devine dès qu'un candidat domine nettement.
- Si une proposition est rejetée, ne la repropose pas : cherche le candidat voisin le plus compatible.
- Calibre confidence : 0.35-0.65 pour une question exploratoire, 0.70+ pour une question très discriminante, 0.82+ pour un guess solide.

RAISONNEMENT OBLIGATOIRE avant chaque coup, dans le champ "think" (jamais montré au joueur) :
1. Déduis les contraintes dures depuis TOUTES les réponses (pas seulement la dernière).
2. Liste tes 5 meilleurs candidats COMPATIBLES avec ces contraintes, chacun avec un poids (ex. "Zoro 0.30").
3. Vérifie chaque candidat contre l'historique : élimine ceux qui contredisent une réponse.
4. Choisis la question qui sépare le mieux tes candidats restants (idéalement ~50/50), ou devine si le n°1 domine (poids > 2× le n°2 et ≥ 0.6).
Une contradiction avec une réponse "oui/non" ferme est ÉLIMINATOIRE pour un candidat — ne propose jamais quelqu'un qui contredit l'historique.

Réponds UNIQUEMENT par un objet JSON valide, sans texte autour, sans balises :
{"think":"<contraintes + top 5 candidats pondérés + justification du coup>","action":"question","text":"<question>","confidence":<0..1>}
ou {"think":"<...>","action":"guess","text":"<nom précis>","domain":"<domaine>","confidence":<0..1>}`

function akNorm(s) {
  return String(s || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}
function akClean(s, max = 500) {
  return String(s || '').replace(/\s+/g, ' ').trim().slice(0, max)
}
function akSafeHistory(history) {
  return (Array.isArray(history) ? history : [])
    .map(h => ({ question: akClean(h?.question, 220), answer: akClean(h?.answer, 80) }))
    .filter(h => h.question && h.answer)
    .slice(-36)
}
function akSafeRejected(rejected) {
  const seen = new Set()
  return (Array.isArray(rejected) ? rejected : [])
    .map(x => akClean(x, 120))
    .filter(Boolean)
    .filter(x => { const n = akNorm(x); if (!n || seen.has(n)) return false; seen.add(n); return true })
    .slice(-24)
}
function akAskedSame(text, history) {
  const n = akNorm(text)
  if (!n) return false
  return history.some(h => {
    const q = akNorm(h.question)
    return q === n || (q.length > 18 && n.length > 18 && (q.includes(n) || n.includes(q)))
  })
}
function akRejectedGuess(text, rejected) {
  const n = akNorm(text)
  if (!n) return false
  return rejected.some(r => {
    const x = akNorm(r)
    return x === n || (x.length > 4 && n.length > 4 && (x.includes(n) || n.includes(x)))
  })
}
const AK_FALLBACK_QUESTIONS = [
  'Ce à quoi tu penses est-il une personne ou un personnage ?',
  'Est-ce un personnage de fiction ?',
  'Cela vient-il principalement d’un anime ou d’un manga ?',
  'Est-ce lié à un jeu vidéo ?',
  'Est-ce lié à un film ou une série occidentale ?',
  'Le personnage est-il plutôt un héros ou protagoniste ?',
  'Le personnage est-il plutôt un antagoniste ?',
  'Est-ce un homme ?',
  'Possède-t-il des pouvoirs ou capacités surnaturelles ?',
  'Est-il connu pour se battre ?',
  'Appartient-il à un groupe ou une équipe célèbre ?',
  'Son apparence est-elle très reconnaissable ?',
  'Est-il encore vivant dans son histoire ?',
  'Est-ce une personne réelle ?',
  'Cette personne est-elle surtout connue sur internet ou les réseaux ?',
]
function akFallbackQuestion(history) {
  return AK_FALLBACK_QUESTIONS.find(q => !akAskedSame(q, history)) || null
}
function akMode(historyLength) {
  if (historyLength < 3) return 'Phase 1 : découpe le domaine très large (fiction/réel, personne/objet, anime/jeu/film/sport).'
  if (historyLength < 8) return 'Phase 2 : identifie l’univers ou la catégorie précise sans deviner trop tôt.'
  if (historyLength < 14) return 'Phase 3 : sépare les candidats probables par rôle, faction, époque, pouvoir, apparence ou relation.'
  if (historyLength < 20) return 'Phase 4 : question chirurgicale pour départager 2-5 candidats, puis devine si un candidat domine.'
  return 'Phase 5 : fais une proposition précise, sauf contradiction majeure.'
}
function akBuildPrompt(history, rejected) {
  const lines = history.map((h, i) => `Q${i + 1}: ${h.question}\nR${i + 1}: ${h.answer}`).join('\n')
  const asked = history.map((h, i) => `${i + 1}. ${h.question}`).join('\n')
  const last = history[history.length - 1]
  let p = `Tour ${history.length + 1}. ${akMode(history.length)}\n\n`
  p += history.length ? `Historique complet :\n${lines}\n\n` : `Aucune question encore.\n\n`
  if (asked) p += `Questions déjà posées ou équivalentes à éviter :\n${asked}\n\n`
  if (last) p += `Dernier indice reçu : "${last.answer}" à "${last.question}". Utilise-le explicitement dans ton raisonnement interne.\n\n`
  if (rejected?.length) p += `Propositions DÉJÀ rejetées, interdites à reproposer : ${rejected.join(', ')}.\n\n`
  return p + `Choisis maintenant le meilleur coup.
D'abord le champ "think" : contraintes dures tirées de l'historique, puis ton top 5 de candidats pondérés et le coup qui les sépare le mieux.
Si une question peut éliminer beaucoup de candidats, pose-la.
Si tu as un candidat dominant, compatible avec TOUTES les réponses et non rejeté, devine.
JSON strict uniquement.`
}
function akValidKey(k) { return typeof k === 'string' && /^AIzaSy[A-Za-z0-9_-]{30,}$/.test(k.trim()) }
function akGeminiKeys() {
  return Object.entries(process.env)
    .filter(([k]) => k === 'GEMINI_API_KEY' || k === 'GOOGLE_GEMINI_API_KEY' || k === 'GEMINI_KEY' || k === 'GOOGLE_API_KEY' || k.startsWith('GEMINI_API_KEY_') || k.startsWith('GOOGLE_GEMINI_API_KEY_') || k.startsWith('GEMINI_KEY_'))
    .map(([, v]) => v?.trim()).filter(akValidKey)
}
function akParse(text) {
  if (!text) return null
  const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim()
  const m = cleaned.match(/\{[\s\S]*\}/)
  if (!m) return null
  try { return JSON.parse(m[0]) } catch { return null }
}
async function akGemini(prompt) {
  const keys = akGeminiKeys()
  if (!keys.length) throw new Error('no_gemini_key')
  const start = Math.floor(Math.random() * keys.length)
  for (let i = 0; i < keys.length; i++) {
    const key = keys[(start + i) % keys.length]
    try {
      const model = new GoogleGenerativeAI(key).getGenerativeModel({
        model: 'gemini-2.0-flash', systemInstruction: AK_SYSTEM,
        generationConfig: { responseMimeType: 'application/json', temperature: 0.35 },
      })
      return (await model.generateContent(prompt)).response.text()
    } catch (err) {
      const is429 = err?.status === 429 || /quota|RESOURCE_EXHAUSTED|429/.test(String(err?.message))
      if (is429 && i < keys.length - 1) continue
      throw err
    }
  }
}
async function akOpenAICompat(url, key, model, prompt) {
  if (!key) throw new Error('no_key')
  const r = await fetch(url, {
    method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages: [{ role: 'system', content: AK_SYSTEM }, { role: 'user', content: prompt }], max_tokens: 280, temperature: 0.35, response_format: { type: 'json_object' } }),
  })
  if (!r.ok) throw new Error(`${r.status}: ${await r.text()}`)
  return (await r.json()).choices?.[0]?.message?.content
}
async function akinator(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  res.setHeader('Cache-Control', 'no-store')
  const { history = [], rejected = [] } = req.body || {}
  if (!Array.isArray(history) || history.length > 44) return res.status(400).json({ error: 'Historique invalide' })
  const safeHistory = akSafeHistory(history)
  const safeRejected = akSafeRejected(rejected)
  const prompt = akBuildPrompt(safeHistory.slice(-32), safeRejected.slice(-20))
  const providers = [
    () => akGemini(prompt),
    () => akOpenAICompat('https://api.groq.com/openai/v1/chat/completions', process.env.GROQ_API_KEY, process.env.GROQ_MODEL || 'llama-3.3-70b-versatile', prompt),
    () => akOpenAICompat('https://api.x.ai/v1/chat/completions', process.env.XAI_API_KEY, process.env.XAI_MODEL || 'grok-2-1212', prompt),
  ]
  for (const fn of providers) {
    try {
      const parsed = akParse(await fn())
      if (parsed && (parsed.action === 'question' || parsed.action === 'guess') && typeof parsed.text === 'string' && parsed.text.trim()) {
        let text = akClean(parsed.text, 200)
        if (parsed.action === 'guess' && akRejectedGuess(text, safeRejected)) continue
        if (parsed.action === 'question') {
          if (akAskedSame(text, safeHistory)) continue
          if (!/[?？]\s*$/.test(text)) text += ' ?'
        }
        return res.status(200).json({
          action: parsed.action, text,
          domain: typeof parsed.domain === 'string' ? parsed.domain.slice(0, 60) : null,
          confidence: typeof parsed.confidence === 'number' ? Math.max(0, Math.min(1, parsed.confidence)) : null,
        })
      }
    } catch (err) { console.error('[akinator]', err?.message || err) }
  }
  const fallback = akFallbackQuestion(safeHistory)
  if (fallback) return res.status(200).json({ action: 'question', text: fallback, domain: null, confidence: 0.35 })
  return res.status(503).json({ error: "L'IA est indisponible (clé manquante ou quota).", code: 'ai_unavailable' })
}

// ── R2 presign (upload direct Cloudflare R2) ──────────────────────────────────
const R2_PUBLIC_BASE = (process.env.R2_PUBLIC_BASE || 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev').replace(/\/+$/, '')
function r2SanitizeKey(name) {
  return String(name).replace(/\\/g, '/').split('/').map(s => s.replace(/[^a-zA-Z0-9._-]/g, '_')).filter(Boolean).join('/')
}
// Types autorisés pour les pièces jointes DM (uploads par utilisateur connecté)
const R2_DM_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'audio/webm', 'audio/mpeg', 'audio/ogg', 'audio/mp4', 'video/webm', 'video/mp4', 'video/quicktime', 'application/pdf']
const R2_ANON = process.env.SUPABASE_ANON_KEY
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplcWV0cm11bHFuZHh1Z2Zib2pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNzUxNzksImV4cCI6MjA5MTk1MTE3OX0.HQbMRJnT_FAFfA8kYi-DYgjOuPnGpQU5zkeRAGb8Qso'
function r2ResolveDiscord(user) {
  const d = user?.identities?.find(i => i.provider === 'discord')
  return d?.identity_data?.provider_id || d?.identity_data?.sub || user?.user_metadata?.provider_id || user?.id || 'anon'
}
async function r2Presign(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const ACCOUNT_ID = process.env.R2_ACCOUNT_ID, ACCESS_KEY = process.env.R2_ACCESS_KEY_ID
  const SECRET_KEY = process.env.R2_SECRET_ACCESS_KEY, BUCKET = process.env.R2_BUCKET
  const UPLOAD_SECRET = process.env.R2_UPLOAD_SECRET || process.env.UPLOAD_SECRET || ''
  if (!ACCOUNT_ID || !ACCESS_KEY || !SECRET_KEY || !BUCKET) {
    return res.status(500).json({ error: 'R2 non configuré — R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET manquants dans Vercel.' })
  }
  const { filename, contentType, series, size } = req.body || {}
  if (!filename || typeof filename !== 'string') return res.status(400).json({ error: 'filename requis' })

  // Deux modes d'autorisation :
  //  1) Admin : header x-upload-secret (page /blob-upload) → upload libre.
  //  2) Utilisateur connecté : JWT Supabase (Authorization Bearer) → pièce jointe
  //     DM, clé scopée dm/<discord_id>/, types restreints, max 30 Mo.
  let keyPrefix = ''
  const adminOk = UPLOAD_SECRET && req.headers['x-upload-secret'] === UPLOAD_SECRET
  if (adminOk) {
    keyPrefix = series ? r2SanitizeKey(series) + '/' : ''
    if (size && Number(size) > 5 * 1024 * 1024 * 1024) return res.status(400).json({ error: 'Fichier trop volumineux (max 5 Go)' })
  } else {
    const token = (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '').trim()
    if (!token) return res.status(403).json({ error: 'Authentification requise.' })
    let user
    try {
      const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { Authorization: `Bearer ${token}`, apikey: R2_ANON } })
      if (!r.ok) return res.status(401).json({ error: 'Session invalide.' })
      user = await r.json()
    } catch { return res.status(500).json({ error: 'Vérification auth impossible.' }) }
    if (contentType && !R2_DM_TYPES.includes(contentType)) return res.status(400).json({ error: 'Type de fichier non autorisé.' })
    // Vidéos (stories) : plafond plus haut — l'egress R2 est gratuit, seul le stockage compte.
    const isVideoUpload = String(contentType || '').startsWith('video/')
    const maxBytes = isVideoUpload ? 5 * 1024 * 1024 * 1024 : 30 * 1024 * 1024
    if (size && Number(size) > maxBytes) return res.status(400).json({ error: isVideoUpload ? 'Vidéo trop volumineuse (max 5 Go).' : 'Fichier trop volumineux (max 30 Mo).' })
    keyPrefix = `dm/${r2SanitizeKey(String(r2ResolveDiscord(user)))}/`
  }
  const key = keyPrefix + Date.now() + '-' + r2SanitizeKey(filename)
  const client = new S3Client({
    region: 'auto', endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY },
  })
  try {
    const uploadUrl = await getSignedUrl(client, new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType || 'application/octet-stream' }), { expiresIn: 3600 })
    return res.status(200).json({ uploadUrl, publicUrl: `${R2_PUBLIC_BASE}/${key}`, key })
  } catch (err) {
    console.error('[r2-presign]', err?.message || err)
    return res.status(500).json({ error: err?.message || 'presign_failed' })
  }
}

// ── Aperçu de lien (OpenGraph) ────────────────────────────────────────────────
function ogMeta(html, prop) {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*>`, 'i')
  const tag = html.match(re)?.[0]
  return tag ? (tag.match(/content=["']([^"']*)["']/i)?.[1] || null) : null
}
function decodeEntities(s) {
  if (!s) return s
  return s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
          .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').trim()
}
function isUnsafeHost(host) {
  const h = (host || '').toLowerCase()
  return !h || h === 'localhost' || h.endsWith('.local') || h === '0.0.0.0'
    || /^127\./.test(h) || /^10\./.test(h) || /^192\.168\./.test(h)
    || /^169\.254\./.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h) || h === '::1'
}
async function ogPreview(req, res) {
  const raw = String(req.query.url || '')
  let u
  try { u = new URL(raw) } catch { return res.status(400).json({ error: 'URL invalide' }) }
  if (!/^https?:$/.test(u.protocol) || isUnsafeHost(u.hostname)) {
    return res.status(400).json({ error: 'URL non autorisée' })
  }
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 6000)
    const r = await fetch(u.toString(), {
      signal: ctrl.signal, redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BramsBot/1.0; +https://brams.community)', 'Accept': 'text/html' },
    })
    clearTimeout(t)
    if (!r.ok || !String(r.headers.get('content-type') || '').includes('text/html')) {
      return res.status(200).json({ ok: false })
    }
    const html = (await r.text()).slice(0, 600_000)
    const title = decodeEntities(ogMeta(html, 'og:title') || ogMeta(html, 'twitter:title') || html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] || '')
    const description = decodeEntities(ogMeta(html, 'og:description') || ogMeta(html, 'twitter:description') || ogMeta(html, 'description') || '')
    let image = ogMeta(html, 'og:image') || ogMeta(html, 'twitter:image') || null
    if (image && image.startsWith('/')) { try { image = new URL(image, u.origin).toString() } catch { image = null } }
    const site = decodeEntities(ogMeta(html, 'og:site_name') || u.hostname.replace(/^www\./, ''))
    if (!title && !image) return res.status(200).json({ ok: false })
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800')
    return res.status(200).json({ ok: true, title, description, image, site, url: u.toString() })
  } catch {
    return res.status(200).json({ ok: false })
  }
}

function splitTurnUrls(value) {
  return String(value || '')
    .split(',')
    .map(v => v.trim())
    .filter(Boolean)
    .filter(v => /^(stun|turn|turns):/i.test(v))
}

function turnCredentials(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'GET only' })
  res.setHeader('Cache-Control', 'no-store, max-age=0')

  const urls = splitTurnUrls(process.env.TURN_URLS || process.env.TURN_URL)
  const username = process.env.TURN_USERNAME || process.env.TURN_USER || ''
  const credential = process.env.TURN_CREDENTIAL || process.env.TURN_PASSWORD || process.env.TURN_PASS || ''

  if (urls.length === 0) return res.status(200).json({ ok: true, iceServers: [] })

  const iceServers = urls.map(url => {
    if (/^stun:/i.test(url)) return { urls: url }
    if (!username || !credential) return null
    return { urls: url, username, credential }
  }).filter(Boolean)

  return res.status(200).json({ ok: true, iceServers })
}

// ── Stripe Checkout : fonds d'opening payés en euros ─────────────────────────
const STRIPE_MIN_EUR_CHARGE_CENTS = 50
const SUPABASE_ANON_ENV = () => process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''

function setStripeCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Stripe-Signature')
}

function getBearerToken(req) {
  const h = String(req.headers.authorization || req.headers.Authorization || '')
  return h.toLowerCase().startsWith('bearer ') ? h.slice(7).trim() : ''
}

function getSiteOrigin(req) {
  const configured = process.env.SITE_URL || process.env.PUBLIC_SITE_URL || process.env.VITE_SITE_URL || ''
  if (configured) return configured.replace(/\/+$/, '')
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || 'brams.community')
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0]
  return `${proto}://${host}`.replace(/\/+$/, '')
}

function readJsonBody(req) {
  if (!req.body) return {}
  if (typeof req.body === 'object') return req.body
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body) } catch { return {} }
  }
  return {}
}

async function readRawBody(req) {
  if (Buffer.isBuffer(req.body)) return req.body.toString('utf8')
  if (typeof req.body === 'string') return req.body
  if (req.body && typeof req.body === 'object') return JSON.stringify(req.body)
  return await new Promise((resolve, reject) => {
    let raw = ''
    req.setEncoding('utf8')
    req.on('data', chunk => { raw += chunk })
    req.on('end', () => resolve(raw))
    req.on('error', reject)
  })
}

function resolveDiscordIdFromUser(user) {
  const discordIdentity = user?.identities?.find(identity => identity.provider === 'discord')
  return user?.user_metadata?.provider_id
    ?? user?.user_metadata?.custom_claims?.provider_id
    ?? discordIdentity?.identity_data?.provider_id
    ?? discordIdentity?.identity_data?.sub
    ?? discordIdentity?.id
    ?? user?.user_metadata?.sub
    ?? null
}

async function getAuthedSupabaseUser(req) {
  const anon = SUPABASE_ANON_ENV()
  if (!anon) throw new Error('SUPABASE_ANON_KEY manquant')
  const token = getBearerToken(req)
  if (!token) {
    const e = new Error('Connexion requise')
    e.status = 401
    throw e
  }
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: anon, Authorization: `Bearer ${token}` },
  })
  if (!r.ok) {
    const e = new Error('Session invalide')
    e.status = 401
    throw e
  }
  const user = await r.json()
  const discordId = resolveDiscordIdFromUser(user)
  if (!discordId) {
    const e = new Error('Connexion Discord requise pour acheter un fond.')
    e.status = 403
    throw e
  }
  return { user, discordId }
}

function serviceRestHeaders(prefer = 'return=representation') {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY manquant')
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    Prefer: prefer,
  }
}

async function supabaseRest(path, { method = 'GET', body, prefer } = {}) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: serviceRestHeaders(prefer),
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await r.text()
  if (!r.ok) {
    const e = new Error(`Supabase ${r.status}: ${text.slice(0, 180)}`)
    e.status = 502
    throw e
  }
  return text ? JSON.parse(text) : null
}

function findOpeningBg(itemId) {
  const id = String(itemId || '').trim()
  return OPENING_BACKGROUNDS.find(bg => bg.id === id || bg.shopItemId === id) || null
}

async function hasOwnedOpeningBg(discordId, itemId) {
  const rows = await supabaseRest(
    `user_inventory?discord_id=eq.${encodeURIComponent(discordId)}&item_id=eq.${encodeURIComponent(itemId)}&select=item_id&limit=1`
  )
  return Array.isArray(rows) && rows.length > 0
}

// Le destinataire d'un cadeau doit être un membre RÉEL (sinon : argent encaissé,
// cadeau perdu dans le vide). On valide côté serveur, pas seulement côté client.
async function memberExists(discordId) {
  try {
    const rows = await supabaseRest(`users?uid=eq.${encodeURIComponent(discordId)}&select=uid&limit=1`)
    return Array.isArray(rows) && rows.length > 0
  } catch { return false }
}

async function ensureOpeningBgShopItem(bg) {
  const itemId = bg.shopItemId || bg.id
  await supabaseRest('shop_items?on_conflict=id', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates,return=minimal',
    body: [{
      id: itemId,
      name: `Fond : ${bg.opTitle}`,
      description: bg.description || '',
      category: 'Fonds',
      price: openingBgPriceCents(bg),
      rarity: bg.rarity || 'Commun',
      stock: null,
      limited: false,
      active: true,
      reward_type: 'opening_background',
      reward_data: { opTitle: bg.opTitle, anime: bg.anime },
    }],
  })
}

async function grantOpeningBg({ bg, discordId, amountCents, status = 'stripe_paid' }) {
  const itemId = bg.shopItemId || bg.id
  await ensureOpeningBgShopItem(bg)
  if (await hasOwnedOpeningBg(discordId, itemId)) {
    return { alreadyOwned: true, item: { id: itemId, opTitle: bg.opTitle } }
  }

  const inserted = await supabaseRest('user_inventory?on_conflict=discord_id,item_id', {
    method: 'POST',
    prefer: 'resolution=ignore-duplicates,return=representation',
    body: [{ discord_id: discordId, item_id: itemId, quantity: 1, equipped: false }],
  })
  const created = Array.isArray(inserted) && inserted.length > 0
  if (created) {
    await supabaseRest('shop_transactions', {
      method: 'POST',
      prefer: 'return=minimal',
      body: [{ discord_id: discordId, item_id: itemId, price: amountCents, status }],
    })
  }
  return { alreadyOwned: !created, item: { id: itemId, opTitle: bg.opTitle } }
}

// ── Curseurs custom payants en € (0,50–2,00 selon rareté) ─────────────────────
const CURSOR_PRICE_CENTS = { COMMUN: 50, RARE: 79, EPIQUE: 119, MYTHIQUE: 159, INTERDIT: 200 }
const CURSORS = [
  { id:'cur-berry',       nom:'Pièce de Berry',     rarete:'COMMUN',   emoji:'🪙',  animated:false },
  { id:'cur-logpose',     nom:'Log Pose',           rarete:'COMMUN',   emoji:'🧭',  animated:false },
  { id:'cur-sake',        nom:'Coupe de Saké',      rarete:'COMMUN',   emoji:'🍶',  animated:false },
  { id:'cur-map',         nom:'Carte au Trésor',    rarete:'COMMUN',   emoji:'🗺️',  animated:false },
  { id:'cur-strawhat',    nom:'Chapeau de Paille',  rarete:'RARE',     emoji:'👒',  animated:false },
  { id:'cur-dendenmushi', nom:'Den Den Mushi',      rarete:'RARE',     emoji:'🐌',  animated:false },
  { id:'cur-marine',      nom:'Casquette Marine',   rarete:'RARE',     emoji:'🧢',  animated:false },
  { id:'cur-anchor',      nom:'Ancre du Navire',    rarete:'RARE',     emoji:'⚓',  animated:false },
  { id:'cur-devilfruit',  nom:'Fruit du Démon',     rarete:'EPIQUE',   emoji:'🍈',  animated:false },
  { id:'cur-sunny',       nom:'Thousand Sunny',     rarete:'EPIQUE',   emoji:'⛵',  animated:false },
  { id:'cur-wanted',      nom:'Avis de Recherche',  rarete:'EPIQUE',   emoji:'📜',  animated:false },
  { id:'cur-sword',       nom:'Sandai Kitetsu',     rarete:'EPIQUE',   emoji:'⚔️',  animated:false },
  { id:'cur-mera',        nom:'Mera Mera no Mi',    rarete:'MYTHIQUE', emoji:'🔥',  animated:true  },
  { id:'cur-gomu',        nom:'Gomu Gomu no Pistol',rarete:'MYTHIQUE', emoji:'🥊',  animated:true  },
  { id:'cur-yonko',       nom:'Couronne de Yonko',  rarete:'MYTHIQUE', emoji:'👑',  animated:true  },
  { id:'cur-onepiece',    nom:'Pavillon One Piece', rarete:'MYTHIQUE', emoji:'🏴‍☠️', animated:true },
  { id:'cur-gear5',       nom:'Gear 5 — Nika',      rarete:'INTERDIT', emoji:'☀️',  animated:true  },
  { id:'cur-haki',        nom:'Haoshoku Haki',      rarete:'INTERDIT', emoji:'⚡',  animated:true  },
  { id:'cur-akuma',       nom:'Akuma no Mi Interdit',rarete:'INTERDIT',emoji:'😈',  animated:true  },
  { id:'cur-im',          nom:"Œil d'Im-sama",      rarete:'INTERDIT', emoji:'👁️',  animated:true  },
  // ── BRAMS · Grand Line (nouveaux) ──
  { id:'cur-bottle',      nom:'Bouteille à la Mer', rarete:'COMMUN',   emoji:'🍾', animated:false },
  { id:'cur-island',      nom:'Île au Trésor',      rarete:'COMMUN',   emoji:'🏝️', animated:false },
  { id:'cur-spyglass',    nom:'Longue-vue',         rarete:'RARE',     emoji:'🔭', animated:false },
  { id:'cur-northstar',   nom:'Étoile du Nord',     rarete:'RARE',     emoji:'🌟', animated:true  },
  { id:'cur-parrot',      nom:'Perroquet du Capitaine', rarete:'RARE', emoji:'🦜', animated:false },
  { id:'cur-jollyroger',  nom:'Jolly Roger',        rarete:'EPIQUE',   emoji:'☠️', animated:true  },
  { id:'cur-trident',     nom:'Trident des Mers',   rarete:'EPIQUE',   emoji:'🔱', animated:false },
  { id:'cur-mermaid',     nom:'Sirène des Abysses', rarete:'MYTHIQUE', emoji:'🧜‍♀️', animated:true },
]
function findCursor(itemId) { const id = String(itemId || '').trim(); return CURSORS.find(c => c.id === id) || null }
function cursorPriceCents(cur) { return CURSOR_PRICE_CENTS[cur.rarete] || 50 }
async function ensureCursorShopItem(cur) {
  // merge-duplicates : ne touche QUE les colonnes fournies (garde le stock/prix Berry existant).
  await supabaseRest('shop_items?on_conflict=id', {
    method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal',
    body: [{ id: cur.id, name: `Curseur : ${cur.nom}`, category: 'Curseurs', rarity: cur.rarete, active: true, reward_type: 'cursor', reward_data: { emoji: cur.emoji, animated: cur.animated } }],
  })
}

// ── Traînées de curseur payantes en € (mêmes paliers que les curseurs) ────────
const TRAIL_PRICE_CENTS = { COMMUN: 50, RARE: 79, EPIQUE: 119, MYTHIQUE: 159, INTERDIT: 200 }
const TRAILS = [
  { id:'trail-midas',   nom:"Toucher d'Or",       rarete:'INTERDIT', priceCents:999 },
  { id:'trail-gold',    nom:"Poussière d'Or",     rarete:'COMMUN'   },
  { id:'trail-bubble',  nom:'Bulles de Saké',      rarete:'COMMUN'   },
  { id:'trail-corbeau', nom:'Plumes du Corbeau',   rarete:'COMMUN'   },
  { id:'trail-ember',   nom:'Mera Mera',           rarete:'RARE'     },
  { id:'trail-aqua',    nom:'Vague Azur',          rarete:'RARE'     },
  { id:'trail-konoha',  nom:'Feuilles de Konoha',  rarete:'RARE'     },
  { id:'trail-lucioles',nom:"Lucioles d'Esprit",   rarete:'RARE'     },
  { id:'trail-haki',    nom:'Haki des Rois',       rarete:'EPIQUE'   },
  { id:'trail-sakura',  nom:'Pétales de Sakura',   rarete:'EPIQUE'   },
  { id:'trail-domaine', nom:'Énergie Occulte',     rarete:'EPIQUE'   },
  { id:'trail-getsuga', nom:'Croissant Noir',      rarete:'EPIQUE'   },
  { id:'trail-rainbow', nom:'Prisme',              rarete:'MYTHIQUE' },
  { id:'trail-thunder', nom:'Goro Goro',           rarete:'MYTHIQUE' },
  { id:'trail-cloud',   nom:'Nuage Magique',       rarete:'MYTHIQUE' },
  { id:'trail-star',    nom:'Poussière d\'Étoiles',rarete:'MYTHIQUE' },
  { id:'trail-void',    nom:'Œil du Néant',        rarete:'INTERDIT' },
  { id:'trail-dragon',  nom:'Aura de Combat',      rarete:'INTERDIT' },
  { id:'trail-soleil',  nom:'Tambours de la Libération', rarete:'INTERDIT' },
  // ── BRAMS · Grand Line ──
  { id:'trail-embruns',       nom:'Embruns Salés',                rarete:'COMMUN'   },
  { id:'trail-phare',         nom:'Brume du Phare',               rarete:'COMMUN'   },
  { id:'trail-galion',        nom:'Sillage du Galion',            rarete:'RARE'     },
  { id:'trail-sarcelle',      nom:'Lueur Sarcelle',               rarete:'RARE'     },
  { id:'trail-soufre',        nom:'Cendres de Soufre',            rarete:'RARE'     },
  { id:'trail-corail',        nom:'Braises de Corail',            rarete:'EPIQUE'   },
  { id:'trail-abysse',        nom:'Or des Abysses',               rarete:'EPIQUE'   },
  { id:'trail-maelstrom',     nom:'Maelström Doré',               rarete:'MYTHIQUE' },
  { id:'trail-constellation', nom:'Constellation de Navigation',  rarete:'MYTHIQUE' },
  // ── Nouveautés (pack premium) ──
  { id:'trail-neige',         nom:'Première Neige',     rarete:'COMMUN'   },
  { id:'trail-bourrasque',    nom:'Bourrasque',         rarete:'COMMUN'   },
  { id:'trail-givre',         nom:'Givre Polaire',      rarete:'RARE'     },
  { id:'trail-toxic',         nom:'Brume Toxique',      rarete:'RARE'     },
  { id:'trail-or-rose',       nom:'Or Rose',            rarete:'RARE'     },
  { id:'trail-onyx',          nom:"Éclats d'Onyx",      rarete:'RARE'     },
  { id:'trail-celeste',       nom:'Foudre Céleste',     rarete:'EPIQUE'   },
  { id:'trail-ecarlate',      nom:'Lame Écarlate',      rarete:'EPIQUE'   },
  { id:'trail-emeraude-feu',  nom:"Flammes d'Émeraude", rarete:'EPIQUE'   },
  { id:'trail-lave',          nom:'Coulée de Lave',     rarete:'EPIQUE'   },
  { id:'trail-nebuleuse',     nom:'Nébuleuse',          rarete:'MYTHIQUE' },
  { id:'trail-aurore',        nom:'Aurore Boréale',     rarete:'MYTHIQUE' },
  { id:'trail-supernova',     nom:'Supernova',          rarete:'MYTHIQUE' },
  { id:'trail-spectre',       nom:'Flamme Spectrale',   rarete:'INTERDIT' },
  { id:'trail-cosmos',        nom:'Poussière Cosmique', rarete:'INTERDIT' },
]
function findTrail(itemId) { const id = String(itemId || '').trim(); return TRAILS.find(t => t.id === id) || null }
function trailPriceCents(t) { return t.priceCents || TRAIL_PRICE_CENTS[t.rarete] || 50 }
async function ensureTrailShopItem(t) {
  await supabaseRest('shop_items?on_conflict=id', {
    method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal',
    body: [{ id: t.id, name: `Traînée : ${t.nom}`, category: 'Traînées', rarity: t.rarete, active: true, reward_type: 'cursor_trail' }],
  })
}

// ── Comptes VIP : TOUT est gratuit en boutique pour ces Discord IDs. ─────────
// Le bypass est SERVEUR (pas seulement cosmétique) : l'item est accordé direct,
// transaction tracée en status vip_free_*, aucun passage par Stripe.
const VIP_FREE_ACCOUNTS = {
  '1094070545248694342': { status: 'vip_free_capitaine' }, // Freydiss
  '1495896013037113366': { status: 'vip_free_amel' },      // Amel 💛
}

// Résout un article payant (fond d'opening OU curseur OU traînée) en forme normalisée.
function resolvePaidItem(itemId) {
  const bg = findOpeningBg(itemId)
  if (bg) return {
    kind: 'bg', itemId: bg.shopItemId || bg.id, amountCents: openingBgPriceCents(bg), rarity: bg.rarity || 'Commun',
    productName: `Fond : ${bg.opTitle}`, productDesc: `${bg.anime} · ${bg.rarity}`,
    invoiceDesc: `Fond d'opening « ${bg.opTitle} » — Brams Community`, label: bg.opTitle, ensure: () => ensureOpeningBgShopItem(bg),
  }
  const cur = findCursor(itemId)
  if (cur) return {
    kind: 'cursor', itemId: cur.id, amountCents: cursorPriceCents(cur), rarity: cur.rarete,
    productName: `Curseur : ${cur.nom}`, productDesc: `Curseur custom · ${cur.rarete}`,
    invoiceDesc: `Curseur « ${cur.nom} » — Brams Community`, label: cur.nom, ensure: () => ensureCursorShopItem(cur),
  }
  const tr = findTrail(itemId)
  if (tr) return {
    kind: 'cursor_trail', itemId: tr.id, amountCents: trailPriceCents(tr), rarity: tr.rarete,
    productName: `Traînée : ${tr.nom}`, productDesc: `Traînée de curseur · ${tr.rarete}`,
    invoiceDesc: `Traînée « ${tr.nom} » — Brams Community`, label: tr.nom, ensure: () => ensureTrailShopItem(tr),
  }
  return null
}

async function grantItem({ item, discordId, amountCents, status = 'stripe_paid' }) {
  const itemId = item.itemId
  await item.ensure()
  if (await hasOwnedOpeningBg(discordId, itemId)) return { alreadyOwned: true, item: { id: itemId, label: item.label } }
  const inserted = await supabaseRest('user_inventory?on_conflict=discord_id,item_id', {
    method: 'POST', prefer: 'resolution=ignore-duplicates,return=representation',
    body: [{ discord_id: discordId, item_id: itemId, quantity: 1, equipped: false }],
  })
  const created = Array.isArray(inserted) && inserted.length > 0
  if (created) {
    await supabaseRest('shop_transactions', { method: 'POST', prefer: 'return=minimal', body: [{ discord_id: discordId, item_id: itemId, price: amountCents, status }] })
  }
  return { alreadyOwned: !created, item: { id: itemId, label: item.label } }
}

async function stripeApi(path, { method = 'GET', params } = {}) {
  const secret = process.env.STRIPE_SECRET_KEY || ''
  if (!secret) {
    const e = new Error('STRIPE_SECRET_KEY manquant dans Vercel')
    e.status = 503
    throw e
  }
  const r = await fetch(`https://api.stripe.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${secret}`,
      ...(params ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
    body: params ? params.toString() : undefined,
  })
  const data = await r.json().catch(() => ({}))
  if (!r.ok) {
    const e = new Error(data?.error?.message || `Stripe ${r.status}`)
    e.status = 502
    throw e
  }
  return data
}

function stripeSessionParams({ req, user, discordId, item, amountCents }) {
  const origin = getSiteOrigin(req)
  const itemId = item.itemId
  const params = new URLSearchParams()
  params.set('mode', 'payment')
  params.set('success_url', `${origin}/boutique?stripe=success&session_id={CHECKOUT_SESSION_ID}`)
  params.set('cancel_url', `${origin}/boutique?stripe=cancel`)
  params.set('client_reference_id', `${discordId}:${itemId}`)
  params.set('line_items[0][quantity]', '1')
  params.set('line_items[0][price_data][currency]', 'eur')
  params.set('line_items[0][price_data][unit_amount]', String(amountCents))
  params.set('line_items[0][price_data][product_data][name]', item.productName)
  params.set('line_items[0][price_data][product_data][description]', item.productDesc)
  params.set('metadata[item_id]', itemId)
  params.set('metadata[discord_id]', String(discordId))
  params.set('metadata[user_id]', String(user?.id || ''))
  params.set('metadata[rarity]', String(item.rarity))
  params.set('payment_intent_data[metadata][item_id]', itemId)
  params.set('payment_intent_data[metadata][discord_id]', String(discordId))
  if (user?.email) params.set('customer_email', user.email)
  // Génère une FACTURE Stripe (PDF) automatiquement envoyée par mail à l'acheteur
  // → sert de confirmation d'achat + facture téléchargeable.
  params.set('invoice_creation[enabled]', 'true')
  params.set('invoice_creation[invoice_data][description]', item.invoiceDesc)
  params.set('invoice_creation[invoice_data][metadata][item_id]', itemId)
  params.set('invoice_creation[invoice_data][footer]', 'Merci pour ton achat sur Brams Community 🏴‍☠️')
  return params
}

async function stripeCheckout(req, res) {
  setStripeCors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  try {
    const { user, discordId } = await getAuthedSupabaseUser(req)
    const { itemId } = readJsonBody(req)
    const item = resolvePaidItem(itemId)
    if (!item) return res.status(404).json({ error: 'Article introuvable.' })

    const amountCents = item.amountCents
    if (await hasOwnedOpeningBg(discordId, item.itemId)) {
      return res.status(409).json({ error: 'Tu possèdes déjà cet article.' })
    }

    // VIP : article accordé immédiatement, gratuit, sans Stripe.
    const vip = VIP_FREE_ACCOUNTS[String(discordId)]
    if (vip) {
      await grantItem({ item, discordId, amountCents: 0, status: vip.status })
      return res.status(200).json({ ok: true, vip: true, url: `${getSiteOrigin(req)}/boutique?stripe=vip` })
    }

    if (amountCents < STRIPE_MIN_EUR_CHARGE_CENTS) {
      return res.status(400).json({ error: 'Stripe refuse les paiements carte sous 0,50 €.' })
    }

    await item.ensure()
    const session = await stripeApi('/v1/checkout/sessions', {
      method: 'POST',
      params: stripeSessionParams({ req, user, discordId, item, amountCents }),
    })
    return res.status(200).json({ ok: true, id: session.id, url: session.url })
  } catch (e) {
    return res.status(e.status || 500).json({ error: e?.message || 'Erreur Checkout' })
  }
}

function extractPaidItem(session) {
  if (!session || session.payment_status !== 'paid') return null
  const item = resolvePaidItem(session.metadata?.item_id)
  if (!item) return null
  if (Number(session.amount_total) !== item.amountCents) return null
  return item
}

async function stripeComplete(req, res) {
  setStripeCors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  try {
    const { discordId } = await getAuthedSupabaseUser(req)
    const { sessionId } = readJsonBody(req)
    if (!sessionId) return res.status(400).json({ error: 'sessionId manquant' })

    const session = await stripeApi(`/v1/checkout/sessions/${encodeURIComponent(sessionId)}`)
    if (String(session.metadata?.discord_id || '') !== String(discordId)) {
      return res.status(403).json({ error: 'Ce paiement ne correspond pas à ton compte.' })
    }
    // Panier ou cadeau ? (flux multi/destinataire). Sinon → item simple ci-dessous.
    const multi = await settleCartOrGift(session)
    if (multi) return res.status(multi.ok ? 200 : 400).json(multi)
    const item = extractPaidItem(session)
    if (!item) return res.status(400).json({ error: 'Paiement non validé ou montant invalide.' })

    const result = await grantItem({
      item,
      discordId,
      amountCents: Number(session.amount_total),
      status: 'stripe_paid',
    })
    return res.status(200).json({ ok: true, ...result })
  } catch (e) {
    return res.status(e.status || 500).json({ error: e?.message || 'Erreur finalisation paiement' })
  }
}

function verifyStripeSignature(rawBody, signatureHeader, secret) {
  const parts = String(signatureHeader || '').split(',').map(p => p.trim())
  const timestamp = parts.find(p => p.startsWith('t='))?.slice(2)
  const signatures = parts.filter(p => p.startsWith('v1=')).map(p => p.slice(3))
  if (!timestamp || signatures.length === 0) return false
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false
  const expected = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`, 'utf8').digest('hex')
  const expectedBuf = Buffer.from(expected, 'hex')
  return signatures.some(sig => {
    const got = Buffer.from(sig, 'hex')
    return got.length === expectedBuf.length && timingSafeEqual(got, expectedBuf)
  })
}

async function stripeWebhook(req, res) {
  setStripeCors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ''
  if (!webhookSecret) return res.status(503).json({ error: 'STRIPE_WEBHOOK_SECRET manquant' })

  try {
    const rawBody = await readRawBody(req)
    const signature = req.headers['stripe-signature']
    if (!verifyStripeSignature(rawBody, signature, webhookSecret)) {
      return res.status(400).json({ error: 'Signature Stripe invalide' })
    }
    const event = JSON.parse(rawBody)
    if (!['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event?.type)) {
      return res.status(200).json({ ok: true, ignored: true })
    }
    const session = event.data?.object
    // Panier ou cadeau ? (grant multi / au destinataire). Sinon → item simple.
    const multi = await settleCartOrGift(session)
    if (multi) return res.status(200).json(multi)
    const item = extractPaidItem(session)
    const discordId = session?.metadata?.discord_id
    if (!item || !discordId) return res.status(200).json({ ok: true, ignored: true })

    const result = await grantItem({
      item,
      discordId,
      amountCents: Number(session.amount_total),
      status: 'stripe_paid',
    })
    return res.status(200).json({ ok: true, ...result })
  } catch (e) {
    return res.status(e.status || 500).json({ error: e?.message || 'Erreur webhook Stripe' })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PANIER (multi-items + promo BOGO) & CADEAUX (item offert à un membre)
// Promo "1 acheté = 1 offert" calculée 100% serveur (jamais le client) : sur le
// panier trié par prix décroissant, 1 item sur 2 (le moins cher de chaque paire)
// est offert. Le total est revalidé à la finalisation.
// ─────────────────────────────────────────────────────────────────────────────
function cartPricing(items) {
  // items = [{ itemId, amountCents, label }] (déjà filtrés des possédés)
  const sorted = [...items].sort((a, b) => b.amountCents - a.amountCents)
  const freeIds = new Set()
  for (let i = 1; i < sorted.length; i += 2) freeIds.add(sorted[i].itemId) // 1 sur 2 = offert
  const paidTotal = sorted.reduce((s, it) => s + (freeIds.has(it.itemId) ? 0 : it.amountCents), 0)
  return { freeIds, paidTotal, sorted }
}

async function resolveCartItems(itemIds, discordId, { skipOwned = true } = {}) {
  const seen = new Set(); const items = []
  for (const raw of (Array.isArray(itemIds) ? itemIds : [])) {
    const it = resolvePaidItem(raw)
    if (!it || seen.has(it.itemId)) continue
    seen.add(it.itemId)
    if (skipOwned && await hasOwnedOpeningBg(discordId, it.itemId)) continue
    items.push(it)
  }
  return items
}

async function grantMany(items, discordId, status = 'stripe_paid', freeIds = new Set()) {
  const granted = []
  for (const item of items) {
    // Item offert (BOGO) → enregistré à 0 € dans shop_transactions (compta correcte).
    const amountCents = freeIds.has(item.itemId) ? 0 : item.amountCents
    const r = await grantItem({ item, discordId, amountCents, status })
    granted.push({ id: item.itemId, label: item.label, alreadyOwned: r.alreadyOwned })
  }
  return granted
}

async function stripeCart(req, res) {
  setStripeCors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  try {
    const { user, discordId } = await getAuthedSupabaseUser(req)
    const { itemIds } = readJsonBody(req)
    const items = await resolveCartItems(itemIds, discordId)
    if (!items.length) return res.status(400).json({ error: 'Panier vide (ou tu possèdes déjà tout).' })

    // VIP : tout le panier est accordé immédiatement, gratuit, sans Stripe.
    const cartVip = VIP_FREE_ACCOUNTS[String(discordId)]
    if (cartVip) {
      for (const it of items) await grantItem({ item: it, discordId, amountCents: 0, status: cartVip.status })
      return res.status(200).json({ ok: true, vip: true, url: `${getSiteOrigin(req)}/boutique?stripe=vip` })
    }

    const { freeIds, paidTotal } = cartPricing(items)
    if (paidTotal < STRIPE_MIN_EUR_CHARGE_CENTS) return res.status(400).json({ error: 'Total trop bas (min 0,50 €).' })

    await Promise.all(items.map(it => it.ensure()))
    const origin = getSiteOrigin(req)
    const params = new URLSearchParams()
    params.set('mode', 'payment')
    params.set('success_url', `${origin}/boutique?stripe=success&session_id={CHECKOUT_SESSION_ID}`)
    params.set('cancel_url', `${origin}/boutique?stripe=cancel`)
    params.set('client_reference_id', `${discordId}:cart`)
    items.forEach((it, i) => {
      const free = freeIds.has(it.itemId)
      params.set(`line_items[${i}][quantity]`, '1')
      params.set(`line_items[${i}][price_data][currency]`, 'eur')
      params.set(`line_items[${i}][price_data][unit_amount]`, String(free ? 0 : it.amountCents))
      params.set(`line_items[${i}][price_data][product_data][name]`, free ? `${it.productName} (OFFERT 🎁)` : it.productName)
      params.set(`line_items[${i}][price_data][product_data][description]`, it.productDesc)
    })
    params.set('metadata[kind]', 'cart')
    params.set('metadata[cart_items]', items.map(it => it.itemId).join(','))
    params.set('metadata[discord_id]', String(discordId))
    if (user?.email) params.set('customer_email', user.email)
    params.set('invoice_creation[enabled]', 'true')
    params.set('invoice_creation[invoice_data][description]', `Panier Brams (${items.length} articles, 1 offert sur 2) — Brams Community`)
    params.set('invoice_creation[invoice_data][footer]', 'Merci pour ton achat sur Brams Community 🏴‍☠️')

    const session = await stripeApi('/v1/checkout/sessions', { method: 'POST', params })
    return res.status(200).json({ ok: true, id: session.id, url: session.url, paidTotal, freeCount: freeIds.size })
  } catch (e) {
    return res.status(e.status || 500).json({ error: e?.message || 'Erreur panier' })
  }
}

async function stripeGift(req, res) {
  setStripeCors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  try {
    const { user, discordId } = await getAuthedSupabaseUser(req)
    const { itemId, recipientId, message, gifterName } = readJsonBody(req)
    const item = resolvePaidItem(itemId)
    if (!item) return res.status(404).json({ error: 'Article introuvable.' })
    const recipient = String(recipientId || '').trim()
    if (!recipient || !/^\d+$/.test(recipient)) return res.status(400).json({ error: 'Destinataire invalide.' })
    if (recipient === String(discordId)) return res.status(400).json({ error: 'Tu ne peux pas t\'offrir un cadeau à toi-même.' })
    if (!(await memberExists(recipient))) return res.status(404).json({ error: 'Destinataire introuvable — vérifie le pseudo.' })
    if (item.amountCents < STRIPE_MIN_EUR_CHARGE_CENTS) return res.status(400).json({ error: 'Stripe refuse les paiements sous 0,50 €.' })
    // Bloque le doublon en amont (pas de paiement inutile) ; un filet de sécurité
    // rembourse aussi à la finalisation en cas de course.
    if (await hasOwnedOpeningBg(recipient, item.itemId)) return res.status(409).json({ error: 'Ce membre possède déjà cet article.' })

    const msg = String(message || '').slice(0, 280)
    // Le CRÉATEUR offre gratuitement (pas de Stripe) : grant direct + notif.
    if (String(discordId) === '1094070545248694342') {
      await grantItem({ item, discordId: recipient, amountCents: 0, status: 'admin_gift' })
      await supabaseRest('gifts', {
        method: 'POST', prefer: 'return=minimal',
        body: [{ from_id: discordId, to_id: recipient, item_id: item.itemId, item_label: item.label,
                 message: msg || null, gifter_name: gifterName || 'Al Freydiss' }],
      })
      return res.status(200).json({ ok: true, free: true, item: { id: item.itemId, label: item.label } })
    }

    await item.ensure()
    const origin = getSiteOrigin(req)
    const params = new URLSearchParams()
    params.set('mode', 'payment')
    params.set('success_url', `${origin}/boutique?stripe=gift_sent&session_id={CHECKOUT_SESSION_ID}`)
    params.set('cancel_url', `${origin}/boutique?stripe=cancel`)
    params.set('client_reference_id', `${discordId}:gift:${recipient}`)
    params.set('line_items[0][quantity]', '1')
    params.set('line_items[0][price_data][currency]', 'eur')
    params.set('line_items[0][price_data][unit_amount]', String(item.amountCents))
    params.set('line_items[0][price_data][product_data][name]', `🎁 Cadeau : ${item.productName}`)
    params.set('line_items[0][price_data][product_data][description]', `Offert à un nakama · ${item.rarity}`)
    params.set('metadata[kind]', 'gift')
    params.set('metadata[item_id]', item.itemId)
    params.set('metadata[discord_id]', String(discordId))       // acheteur (pour la vérif de propriété de session)
    params.set('metadata[gifter_id]', String(discordId))
    params.set('metadata[recipient_id]', recipient)
    params.set('metadata[gift_message]', msg)
    // Nom affiché fourni par le client (display_name/global_name « Al Freydiss »),
    // sinon repli sur les métadonnées Discord. Jamais le username brut en priorité.
    const gName = String(gifterName || user?.user_metadata?.global_name || user?.user_metadata?.custom_claims?.global_name || user?.user_metadata?.full_name || user?.user_metadata?.name || '').slice(0, 80)
    params.set('metadata[gifter_name]', gName)
    if (user?.email) params.set('customer_email', user.email)
    params.set('invoice_creation[enabled]', 'true')
    params.set('invoice_creation[invoice_data][description]', `Cadeau « ${item.label} » offert — Brams Community`)
    params.set('invoice_creation[invoice_data][footer]', 'Merci pour ton cadeau sur Brams Community 🎁')

    const session = await stripeApi('/v1/checkout/sessions', { method: 'POST', params })
    return res.status(200).json({ ok: true, id: session.id, url: session.url })
  } catch (e) {
    return res.status(e.status || 500).json({ error: e?.message || 'Erreur cadeau' })
  }
}

// Don libre (cagnotte) — PUBLIC, montant choisi. Alimente la table donors → la
// cagnotte + le feed se mettent à jour tout seuls après paiement.
async function stripeDonate(req, res) {
  setStripeCors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  try {
    const { amount, name, message } = readJsonBody(req)
    const cents = Math.round((Number(amount) || 0) * 100)
    if (!Number.isFinite(cents) || cents < STRIPE_MIN_EUR_CHARGE_CENTS) return res.status(400).json({ error: 'Montant minimum 0,50 €.' })
    if (cents > 100000) return res.status(400).json({ error: 'Montant maximum 1000 €.' })
    const donorName = String(name || '').trim().slice(0, 40) || 'Anonyme'
    const donorMsg = String(message || '').trim().slice(0, 200)
    const origin = getSiteOrigin(req)
    const params = new URLSearchParams()
    params.set('mode', 'payment')
    params.set('success_url', `${origin}/soutenir?stripe=donated&session_id={CHECKOUT_SESSION_ID}`)
    params.set('cancel_url', `${origin}/soutenir?stripe=cancel`)
    params.set('line_items[0][quantity]', '1')
    params.set('line_items[0][price_data][currency]', 'eur')
    params.set('line_items[0][price_data][unit_amount]', String(cents))
    params.set('line_items[0][price_data][product_data][name]', '💛 Soutien à Brams Community')
    params.set('line_items[0][price_data][product_data][description]', 'Merci de soutenir le projet 🏴‍☠️')
    params.set('metadata[kind]', 'donation')
    params.set('metadata[donor_name]', donorName)
    params.set('metadata[donor_message]', donorMsg)
    params.set('invoice_creation[enabled]', 'true')
    params.set('invoice_creation[invoice_data][description]', 'Soutien à Brams Community')
    params.set('invoice_creation[invoice_data][footer]', 'Merci pour ton soutien 💛 — Brams Community')
    const session = await stripeApi('/v1/checkout/sessions', { method: 'POST', params })
    return res.status(200).json({ ok: true, url: session.url })
  } catch (e) {
    return res.status(e.status || 500).json({ error: e?.message || 'Erreur don' })
  }
}

// Finalisation PUBLIQUE d'un don au retour Stripe (pas d'auth — un don peut être
// anonyme). Idempotent via stripe_session. Filet en plus du webhook.
async function stripeDonateComplete(req, res) {
  setStripeCors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  try {
    const { sessionId } = readJsonBody(req)
    if (!sessionId) return res.status(400).json({ error: 'sessionId manquant' })
    const session = await stripeApi(`/v1/checkout/sessions/${encodeURIComponent(sessionId)}`)
    if (session.metadata?.kind !== 'donation') return res.status(400).json({ error: 'Session non-don.' })
    const r = await settleCartOrGift(session)
    return res.status(r?.ok ? 200 : 400).json(r || { ok: false })
  } catch (e) {
    return res.status(e.status || 500).json({ error: e?.message || 'Erreur' })
  }
}

// ── Recharge de Berrys en euros (top-up de la monnaie du serveur) ─────────────
// La monnaie vit dans users.data.berrys (source partagée bot Discord ⇄ site). Le crédit
// passe par la RPC credit_berries_topup : ATOMIQUE + IDEMPOTENT (1 session Stripe = 1
// crédit) + notifie le bot via berry_sync. Le montant de berrys vient TOUJOURS du serveur
// (jamais du client) ; le total Stripe est revalidé à la finalisation.
const BERRY_PACKS = [
  { id: 'berry-2m',  berries: 2_000_000,  priceCents: 199 },
  { id: 'berry-6m',  berries: 6_000_000,  priceCents: 499 },
  { id: 'berry-14m', berries: 14_000_000, priceCents: 999 },
  { id: 'berry-32m', berries: 32_000_000, priceCents: 1999 },
]
function findBerryPack(id) { const s = String(id || '').trim(); return BERRY_PACKS.find(p => p.id === s) || null }
function berryPackLabel(pack) { return `${pack.berries.toLocaleString('fr-FR')} ฿` }

async function creditBerriesTopup({ discordId, pack, stripeSession }) {
  return await supabaseRest('rpc/credit_berries_topup', {
    method: 'POST',
    body: { p_discord_id: String(discordId), p_amount: pack.berries, p_stripe_session: String(stripeSession), p_pack_id: pack.id },
  })
}

async function stripeBerries(req, res) {
  setStripeCors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  try {
    const { user, discordId } = await getAuthedSupabaseUser(req)
    const { packId } = readJsonBody(req)
    const pack = findBerryPack(packId)
    if (!pack) return res.status(404).json({ error: 'Pack de Berrys introuvable.' })

    // VIP (Capitaine / Amel) : crédit immédiat gratuit, sans Stripe.
    const vip = VIP_FREE_ACCOUNTS[String(discordId)]
    if (vip) {
      const r = await creditBerriesTopup({ discordId, pack, stripeSession: `vip:${discordId}:${pack.id}:${Date.now()}` })
      return res.status(200).json({ ok: true, vip: true, url: `${getSiteOrigin(req)}/boutique?stripe=berries_vip`, balance: r?.balance })
    }

    if (pack.priceCents < STRIPE_MIN_EUR_CHARGE_CENTS) return res.status(400).json({ error: 'Stripe refuse les paiements carte sous 0,50 €.' })

    const origin = getSiteOrigin(req)
    const params = new URLSearchParams()
    params.set('mode', 'payment')
    params.set('success_url', `${origin}/boutique?stripe=berries&session_id={CHECKOUT_SESSION_ID}`)
    params.set('cancel_url', `${origin}/boutique?stripe=cancel`)
    params.set('client_reference_id', `${discordId}:berries:${pack.id}`)
    params.set('line_items[0][quantity]', '1')
    params.set('line_items[0][price_data][currency]', 'eur')
    params.set('line_items[0][price_data][unit_amount]', String(pack.priceCents))
    params.set('line_items[0][price_data][product_data][name]', `${berryPackLabel(pack)} — Recharge Berrys`)
    params.set('line_items[0][price_data][product_data][description]', 'Berrys crédités sur ton compte Brams Community')
    params.set('metadata[kind]', 'berries')
    params.set('metadata[pack_id]', pack.id)
    params.set('metadata[discord_id]', String(discordId))
    params.set('metadata[user_id]', String(user?.id || ''))
    if (user?.email) params.set('customer_email', user.email)
    params.set('invoice_creation[enabled]', 'true')
    params.set('invoice_creation[invoice_data][description]', `Recharge ${berryPackLabel(pack)} — Brams Community`)
    params.set('invoice_creation[invoice_data][footer]', 'Merci pour ton achat sur Brams Community 🏴‍☠️')

    const session = await stripeApi('/v1/checkout/sessions', { method: 'POST', params })
    return res.status(200).json({ ok: true, id: session.id, url: session.url })
  } catch (e) {
    return res.status(e.status || 500).json({ error: e?.message || 'Erreur recharge Berrys' })
  }
}

// Revenus Stripe (temps réel) — réservé aux ADMINS (créateur + Brams + Berat).
const REVENUE_ADMINS = ['1094070545248694342', '1079054995917381672', '999607813334638692']
async function stripeRevenue(req, res) {
  setStripeCors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  try {
    const { discordId } = await getAuthedSupabaseUser(req)
    if (!REVENUE_ADMINS.includes(String(discordId))) return res.status(403).json({ error: 'Réservé aux admins.' })
    const [balance, charges] = await Promise.all([
      stripeApi('/v1/balance'),
      stripeApi('/v1/charges?limit=15'),
    ])
    const sum = (arr) => (arr || []).reduce((s, b) => s + (b.amount || 0), 0)
    const recent = (charges.data || []).map(c => ({
      amount: c.amount, currency: c.currency, paid: c.paid, refunded: c.refunded, status: c.status,
      created: c.created, desc: c.description || c.calculated_statement_descriptor || '',
      email: c.billing_details?.email || c.receipt_email || null,
    }))
    const totalPaid = recent.filter(c => c.paid && !c.refunded).reduce((s, c) => s + c.amount, 0)
    return res.status(200).json({
      ok: true, currency: 'eur',
      available: sum(balance.available), pending: sum(balance.pending),
      recentTotal: totalPaid, recentCount: recent.filter(c => c.paid).length, recent,
    })
  } catch (e) {
    return res.status(e.status || 500).json({ error: e?.message || 'Erreur revenus' })
  }
}

async function stripeRefund(paymentIntentId) {
  if (!paymentIntentId) return
  try { await stripeApi('/v1/refunds', { method: 'POST', params: new URLSearchParams({ payment_intent: String(paymentIntentId) }) }) } catch {}
}

// Finalise une session panier OU cadeau (appelée par complete ET webhook).
// Retourne null si la session n'est pas un panier/cadeau (→ flux item simple).
async function settleCartOrGift(session) {
  if (!session || session.payment_status !== 'paid') return null
  const kind = session.metadata?.kind
  if (kind === 'cart') {
    const ids = String(session.metadata?.cart_items || '').split(',').map(s => s.trim()).filter(Boolean)
    const items = ids.map(resolvePaidItem).filter(Boolean)
    if (!items.length) return { ok: true, kind, granted: [] }
    const { paidTotal, freeIds } = cartPricing(items)
    if (Number(session.amount_total) !== paidTotal) return { ok: false, error: 'Montant panier invalide.' }
    const gifter = session.metadata?.discord_id
    const granted = await grantMany(items, gifter, 'stripe_paid', freeIds)
    return { ok: true, kind, granted }
  }
  if (kind === 'gift') {
    const item = resolvePaidItem(session.metadata?.item_id)
    const recipient = session.metadata?.recipient_id
    const gifter = session.metadata?.gifter_id
    if (!item || !recipient) return { ok: false, error: 'Cadeau invalide.' }
    if (Number(session.amount_total) !== item.amountCents) return { ok: false, error: 'Montant cadeau invalide.' }
    // grantItem est idempotent (ignore-duplicates) → alreadyOwned=true au 2e passage.
    // On n'enregistre le cadeau (popup) QUE si l'attribution est nouvelle : évite la
    // double popup quand webhook ET complete traitent la même session, ET évite de
    // rembourser à tort un cadeau valide au 2e passage (le doublon réel est déjà
    // bloqué en amont au checkout, 409).
    const granted = await grantItem({ item, discordId: recipient, amountCents: item.amountCents, status: 'stripe_gift' })
    if (!granted.alreadyOwned) await supabaseRest('gifts', {
      method: 'POST', prefer: 'return=minimal',
      body: [{ from_id: gifter, to_id: recipient, item_id: item.itemId, item_label: item.label,
               message: session.metadata?.gift_message || null, gifter_name: session.metadata?.gifter_name || null, seen: false }],
    })
    return { ok: true, kind, item: { id: item.itemId, label: item.label } }
  }
  if (kind === 'donation') {
    const cents = Number(session.amount_total)
    if (!Number.isFinite(cents) || cents < STRIPE_MIN_EUR_CHARGE_CENTS) return { ok: false, error: 'Montant don invalide.' }
    // on_conflict sur stripe_session → idempotent (webhook + complete ne créent qu'1 ligne).
    await supabaseRest('donors?on_conflict=stripe_session', {
      method: 'POST', prefer: 'resolution=ignore-duplicates,return=minimal',
      body: [{ name: session.metadata?.donor_name || 'Anonyme', amount: cents / 100,
               message: session.metadata?.donor_message || null, stripe_session: session.id }],
    })
    return { ok: true, kind, amount: cents }
  }
  if (kind === 'berries') {
    const pack = findBerryPack(session.metadata?.pack_id)
    if (!pack) return { ok: false, error: 'Pack de Berrys invalide.' }
    if (Number(session.amount_total) !== pack.priceCents) return { ok: false, error: 'Montant recharge invalide.' }
    const discordId = session.metadata?.discord_id
    if (!discordId) return { ok: false, error: 'Acheteur inconnu.' }
    // Idempotent : la RPC ne crédite qu'une fois par session (complete + webhook OK).
    const r = await creditBerriesTopup({ discordId, pack, stripeSession: session.id })
    return { ok: true, kind, credited: r?.credited !== false, berries: pack.berries, balance: r?.balance }
  }
  return null
}

// ── @BramsScore — mascotte IA du Fil ─────────────────────────────────────────
// Déclenché par un trigger Supabase (pg_net) à chaque post qui mentionne
// @BramsScore ou répond à un de ses posts. Pas de secret partagé : la requête
// ne porte qu'un post_id, et TOUTES les conditions sont re-vérifiées depuis la
// DB (post réel, récent, mention/réponse au bot, pas déjà répondu) — appeler
// l'endpoint à la main ne produit rien de plus que ce que le trigger ferait.
const BRAMS_BOT_UID = '1000000000000000001'
const BRAMS_PERSONA = `Tu es BramsScore, la mascotte IA pirate du serveur Discord "Brams Community" (communauté d'anime et de One Piece, langue française).
Ton style : chaleureux, taquin, direct, ambiance pirate (nakama, trésor, mer) sans en faire des tonnes. Tu tutoies tout le monde.
Règles STRICTES :
- Réponds en 1 à 3 phrases MAXIMUM (jamais plus de 280 caractères).
- Français uniquement. Pas de hashtags, pas de liens, pas de listes.
- 1 emoji max par réponse (🏴‍☠️ ⚓ 💥 😄 …), pas obligatoire.
- Tu peux parler d'anime/manga avec de vraies connaissances, donner ton avis tranché, chambrer gentiment.
- Jamais d'insultes, jamais de spoil majeur sans prévenir.`

function getGeminiKeys() {
  return Object.entries(process.env)
    .filter(([k]) => k === 'GEMINI_API_KEY' || k === 'GOOGLE_GEMINI_API_KEY' || k === 'GEMINI_KEY'
      || k === 'GOOGLE_API_KEY' || k.startsWith('GEMINI_API_KEY_') || k.startsWith('GOOGLE_GEMINI_API_KEY_') || k.startsWith('GEMINI_KEY_'))
    .map(([, v]) => v?.trim())
    .filter(v => typeof v === 'string' && v.length > 20)
}

async function generateBramsReply(username, content, parentContent) {
  const prompt = parentContent
    ? `Contexte : tu avais posté « ${String(parentContent).slice(0, 400)} ». ${username} te répond : « ${String(content || '').slice(0, 400)} ». Réponds-lui.`
    : `${username} t'a mentionné dans ce post du Fil : « ${String(content || '').slice(0, 400)} ». Réponds-lui.`

  // 1) Gemini (rotation de clés), 2) Groq, 3) xAI — même chaîne que api/chat.js
  // (en prod les clés Gemini peuvent être absentes : le quiz tourne déjà sur Groq).
  const keys = getGeminiKeys()
  const start = keys.length ? Math.floor(Math.random() * keys.length) : 0
  let lastErr
  for (let i = 0; i < keys.length; i++) {
    try {
      const genAI = new GoogleGenerativeAI(keys[(start + i) % keys.length])
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash', systemInstruction: BRAMS_PERSONA })
      const out = (await model.generateContent(prompt)).response.text().trim()
      if (out) return out.slice(0, 480)
    } catch (e) { lastErr = e }
  }

  const openaiLike = async (apiUrl, key, model) => {
    const r = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: BRAMS_PERSONA }, { role: 'user', content: prompt }],
        max_tokens: 160, temperature: 0.8,
      }),
    })
    if (!r.ok) throw new Error(`${apiUrl.includes('groq') ? 'groq' : 'xai'}_${r.status}`)
    const d = await r.json()
    return String(d.choices?.[0]?.message?.content || '').trim().slice(0, 480)
  }
  if (process.env.GROQ_API_KEY) {
    try {
      const out = await openaiLike('https://api.groq.com/openai/v1/chat/completions', process.env.GROQ_API_KEY, process.env.GROQ_MODEL || 'llama-3.3-70b-versatile')
      if (out) return out
    } catch (e) { lastErr = e }
  }
  if (process.env.XAI_API_KEY) {
    try {
      const out = await openaiLike('https://api.x.ai/v1/chat/completions', process.env.XAI_API_KEY, process.env.XAI_MODEL || 'grok-code-fast-1')
      if (out) return out
    } catch (e) { lastErr = e }
  }
  throw lastErr || new Error('no_ai_provider')
}

async function bramsScore(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  let postId = null
  try { postId = String((req.body?.post_id) || '') } catch { /* body absent */ }
  if (!postId || !/^[0-9a-f-]{36}$/i.test(postId)) return res.status(400).json({ error: 'post_id invalide' })

  try {
    const h = getServiceHeaders()
    const get = async (path) => {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: h })
      if (!r.ok) throw new Error(`supabase ${r.status}`)
      return r.json()
    }

    const [post] = await get(`posts?id=eq.${postId}&select=id,author_id,content,reply_to,created_at,deleted_at`)
    if (!post || post.deleted_at) return res.status(200).json({ ok: true, skip: 'post absent/supprime' })
    if (post.author_id === BRAMS_BOT_UID) return res.status(200).json({ ok: true, skip: 'post du bot' })
    // Fenêtre courte : empêche de faire répondre le bot sur de vieux posts à la main
    if (Date.now() - new Date(post.created_at).getTime() > 10 * 60 * 1000) {
      return res.status(200).json({ ok: true, skip: 'post trop ancien' })
    }

    let parent = null
    if (post.reply_to) [parent] = await get(`posts?id=eq.${post.reply_to}&select=id,author_id,content`)
    const mentioned = /@bramsscore/i.test(post.content || '')
    const replyToBot = parent?.author_id === BRAMS_BOT_UID
    if (!mentioned && !replyToBot) return res.status(200).json({ ok: true, skip: 'ni mention ni reponse au bot' })

    // Une seule réponse du bot par post (idempotent face aux retries pg_net)
    const dupes = await get(`posts?reply_to=eq.${postId}&author_id=eq.${BRAMS_BOT_UID}&select=id&limit=1`)
    if (dupes.length) return res.status(200).json({ ok: true, skip: 'deja repondu' })

    const [author] = await get(`users?uid=eq.${post.author_id}&select=data`)
    const username = author?.data?.username || 'nakama'

    const text = await generateBramsReply(username, post.content, replyToBot ? parent?.content : null)
    // RPC dédiée : insère la réponse ET notifie l'auteur (insert direct = pas de notif)
    const ins = await fetch(`${SUPABASE_URL}/rest/v1/rpc/brams_bot_reply`, {
      method: 'POST', headers: getServiceHeaders(),
      body: JSON.stringify({ p_post: post.id, p_content: text }),
    })
    if (!ins.ok) return res.status(502).json({ error: `rpc: ${ins.status} ${await ins.text()}` })
    return res.status(200).json({ ok: true })
  } catch (e) {
    return res.status(500).json({ error: e?.message || 'brams_score_failed' })
  }
}

export default async function handler(req, res) {
  const tool = String(req.query.tool || '')
  if (tool === 'brams-score')           return bramsScore(req, res)
  if (tool === 'seed-shop-backgrounds') return seedShopBackgrounds(req, res)
  if (tool === 'sync-bot')              return syncBot(req, res)
  if (tool === 'akinator')              return akinator(req, res)
  if (tool === 'r2-presign')            return r2Presign(req, res)
  if (tool === 'og')                    return ogPreview(req, res)
  if (tool === 'turn-credentials')      return turnCredentials(req, res)
  if (tool === 'stripe-checkout')       return stripeCheckout(req, res)
  if (tool === 'stripe-complete')       return stripeComplete(req, res)
  if (tool === 'stripe-webhook')        return stripeWebhook(req, res)
  if (tool === 'stripe-cart')           return stripeCart(req, res)
  if (tool === 'stripe-gift')           return stripeGift(req, res)
  if (tool === 'stripe-donate')         return stripeDonate(req, res)
  if (tool === 'stripe-donate-complete') return stripeDonateComplete(req, res)
  if (tool === 'stripe-berries')        return stripeBerries(req, res)
  if (tool === 'stripe-revenue')        return stripeRevenue(req, res)
  return res.status(404).json({ error: 'Unknown bot tool' })
}
