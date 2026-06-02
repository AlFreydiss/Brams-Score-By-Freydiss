// Routeur multi-outils — regroupe plusieurs endpoints en UNE seule fonction
// serverless (limite Hobby Vercel = 12 fonctions). Chaque outil gère sa propre auth.
//   ?tool=seed-shop-backgrounds  (GET,  secret)
//   ?tool=sync-bot               (POST, Bearer BOT_SYNC_SECRET)
//   ?tool=akinator               (POST, public — devine IA)
//   ?tool=r2-presign             (POST, x-upload-secret — URL présignée R2)
//   ?tool=turn-credentials       (GET, public — ICE/TURN sans exposer les secrets)
import { GoogleGenerativeAI } from '@google/generative-ai'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

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
const AK_SYSTEM = `Tu es un génie devin, façon Akinator, mais BEAUCOUP plus perspicace.
L'utilisateur pense à quelque chose ou quelqu'un — N'IMPORTE QUEL DOMAINE :
personnage d'anime/manga, film, série, jeu vidéo, célébrité réelle, sportif, musicien,
personnage historique, animal, objet, lieu, concept… Tu ne te limites pas à One Piece.
Règles :
- Pose UNE seule question fermée (oui/non) à la fois, en français, courte et naturelle.
- Sois STRATÉGIQUE : chaque question élimine ~la moitié des possibilités. Commence large puis affine.
- Tiens compte des réponses, ne te répète pas, ne re-pose pas une question tranchée.
- Réponses possibles : "oui", "non", "je ne sais pas", "probablement", "probablement pas".
- Quand tu es raisonnablement sûr (ou après ~20 questions), DEVINE un nom précis.
- Si une proposition est rejetée, affine puis re-devine.
Réponds UNIQUEMENT par un objet JSON valide, sans texte autour, sans balises :
{"action":"question","text":"<question>","confidence":<0..1>}
ou {"action":"guess","text":"<nom précis>","domain":"<domaine>","confidence":<0..1>}`

function akBuildPrompt(history, rejected) {
  const lines = history.map((h, i) => `Q${i + 1}: ${h.question}\nR${i + 1}: ${h.answer}`).join('\n')
  let p = history.length ? `Historique :\n${lines}\n\n` : `Aucune question encore. Pose ta toute première question (la plus discriminante).\n\n`
  if (rejected?.length) p += `Propositions DÉJÀ rejetées (ne pas re-proposer) : ${rejected.join(', ')}.\n\n`
  return p + `Donne le prochain coup (question ou guess) en JSON strict.`
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
        generationConfig: { responseMimeType: 'application/json', temperature: 0.6 },
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
    body: JSON.stringify({ model, messages: [{ role: 'system', content: AK_SYSTEM }, { role: 'user', content: prompt }], max_tokens: 300, temperature: 0.6, response_format: { type: 'json_object' } }),
  })
  if (!r.ok) throw new Error(`${r.status}: ${await r.text()}`)
  return (await r.json()).choices?.[0]?.message?.content
}
async function akinator(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  res.setHeader('Cache-Control', 'no-store')
  const { history = [], rejected = [] } = req.body || {}
  if (!Array.isArray(history) || history.length > 40) return res.status(400).json({ error: 'Historique invalide' })
  const prompt = akBuildPrompt(history.slice(-30), Array.isArray(rejected) ? rejected.slice(-20) : [])
  const providers = [
    () => akGemini(prompt),
    () => akOpenAICompat('https://api.groq.com/openai/v1/chat/completions', process.env.GROQ_API_KEY, process.env.GROQ_MODEL || 'llama-3.3-70b-versatile', prompt),
    () => akOpenAICompat('https://api.x.ai/v1/chat/completions', process.env.XAI_API_KEY, process.env.XAI_MODEL || 'grok-2-1212', prompt),
  ]
  for (const fn of providers) {
    try {
      const parsed = akParse(await fn())
      if (parsed && (parsed.action === 'question' || parsed.action === 'guess') && typeof parsed.text === 'string' && parsed.text.trim()) {
        return res.status(200).json({
          action: parsed.action, text: parsed.text.trim().slice(0, 200),
          domain: typeof parsed.domain === 'string' ? parsed.domain.slice(0, 60) : null,
          confidence: typeof parsed.confidence === 'number' ? Math.max(0, Math.min(1, parsed.confidence)) : null,
        })
      }
    } catch (err) { console.error('[akinator]', err?.message || err) }
  }
  return res.status(503).json({ error: "L'IA est indisponible (clé manquante ou quota).", code: 'ai_unavailable' })
}

// ── R2 presign (upload direct Cloudflare R2) ──────────────────────────────────
const R2_PUBLIC_BASE = (process.env.R2_PUBLIC_BASE || 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev').replace(/\/+$/, '')
function r2SanitizeKey(name) {
  return String(name).replace(/\\/g, '/').split('/').map(s => s.replace(/[^a-zA-Z0-9._-]/g, '_')).filter(Boolean).join('/')
}
// Types autorisés pour les pièces jointes DM (uploads par utilisateur connecté)
const R2_DM_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'audio/webm', 'audio/mpeg', 'audio/ogg', 'audio/mp4', 'video/webm', 'application/pdf']
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
    if (size && Number(size) > 30 * 1024 * 1024) return res.status(400).json({ error: 'Fichier trop volumineux (max 30 Mo).' })
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

export default async function handler(req, res) {
  const tool = String(req.query.tool || '')
  if (tool === 'seed-shop-backgrounds') return seedShopBackgrounds(req, res)
  if (tool === 'sync-bot')              return syncBot(req, res)
  if (tool === 'akinator')              return akinator(req, res)
  if (tool === 'r2-presign')            return r2Presign(req, res)
  if (tool === 'og')                    return ogPreview(req, res)
  if (tool === 'turn-credentials')      return turnCredentials(req, res)
  return res.status(404).json({ error: 'Unknown bot tool' })
}
