/**
 * Drain des feedbacks de recommandation (Supabase) → batch pour Ruflo.
 *
 * Un script Node ne peut pas appeler le serveur MCP Ruflo directement (c'est Claude
 * qui l'appelle). Ce script lit la table `recommendation_feedback`, l'agrège par
 * utilisateur, et écrit `reco-feedback-batch.json`. Claude lit ce fichier et pousse
 * dans Ruflo via memory_store (clés `reco_feedback:{user}` / `user_profile:{user}`).
 *
 * Usage : node scripts/sync-reco-feedback-ruflo.mjs [--since=ISO]
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
function loadEnv() {
  const env = { ...process.env }
  for (const p of [path.join(root, '.env.local'), path.join(root, '.env')]) {
    if (!fs.existsSync(p)) continue
    for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([^#=]+)=(.*)$/); if (m) env[m[1].trim()] = m[2].trim()
    }
  }
  return env
}
const env = loadEnv()
const SUPABASE_URL = env.SUPABASE_REST_URL || env.VITE_SUPABASE_URL || 'https://zeqetrmulqndxugfbojd.supabase.co'
const KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY
if (!KEY) throw new Error('Clé Supabase manquante (.env.local)')

const sinceArg = (process.argv.find(a => a.startsWith('--since=')) || '').split('=')[1]

async function main() {
  const flt = sinceArg ? `&created_at=gt.${encodeURIComponent(sinceArg)}` : ''
  const r = await fetch(`${SUPABASE_URL}/rest/v1/recommendation_feedback?select=*&order=created_at.desc&limit=2000${flt}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  })
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${await r.text()}`)
  const rows = await r.json()

  // Agrégation : dernier feedback par (user, anime), puis profil par user.
  const latest = new Map()                       // `${user}|${anime}` → row (le + récent)
  for (const row of rows) {
    const k = `${row.user_id || 'anon'}|${row.anime_id}`
    if (!latest.has(k)) latest.set(k, row)        // rows déjà triées desc
  }
  const byUser = {}
  for (const row of latest.values()) {
    const u = row.user_id || 'anon'
    ;(byUser[u] ||= { likes: [], dislikes: [] })[row.action === 'like' ? 'likes' : 'dislikes'].push(row.anime_id)
  }

  const batch = {
    generated_at: new Date().toISOString(),
    total_events: rows.length,
    users: Object.entries(byUser).map(([user_id, v]) => ({ user_id, ...v })),
  }
  const out = path.join(root, 'reco-feedback-batch.json')
  fs.writeFileSync(out, JSON.stringify(batch, null, 2), 'utf8')
  console.log(`✓ ${rows.length} events → ${batch.users.length} profils écrits dans ${out}`)
  console.log('→ Claude pousse ensuite dans Ruflo : memory_store reco_feedback:{user} (namespace brams)')
}
main().catch(e => { console.error(e); process.exit(1) })
