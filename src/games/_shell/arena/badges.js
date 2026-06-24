// ── Badges de jeu : définitions + lecture REST directe ──────────────────────
// Map id → définition visuelle (glyph aria-hidden, palier, couleur dérivée de
// l'accent laiton — jamais de RGB criard) + fetch des badges d'un joueur.
// DÉGRADE EN SILENCE : si la table game_badges n'existe pas encore (migration
// non lancée) ou si la requête échoue, badgesDe* renvoie [] → aucun badge
// affiché, zéro crash. Voir supabase/migrations/20260624_badges.sql.
import { ui } from '../../../features/games/neutralTheme.js'
import { SB_URL, SB_KEY, getAccessToken } from '../../../lib/supabaseRest.js'

// Paliers visuels dérivés de l'accent (or laiton). Sobre, cohérent avec neutralTheme.
const TIER = {
  or:      { teinte: ui.accentHi, fond: 'rgba(200,164,92,0.16)', bord: 'rgba(200,164,92,0.45)' },
  argent:  { teinte: '#cfd4dc',   fond: 'rgba(255,255,255,0.06)', bord: 'rgba(255,255,255,0.18)' },
  bronze:  { teinte: '#b88a63',   fond: 'rgba(184,138,99,0.13)',  bord: 'rgba(184,138,99,0.38)' },
}
export function paletteTier(tier) { return TIER[tier] || TIER.bronze }

// Catalogue front (doit rester aligné sur le seed de game_badge_defs).
// glyph = caractère décoratif (aria-hidden côté composant).
export const BADGE_DEFS = {
  champion_saison: { label: 'Champion de saison', glyph: '♛', tier: 'or',     description: '1ʳᵉ place à la clôture d\'une saison classée.' },
  pic_2000:        { label: 'Pic 2000',           glyph: '⮝', tier: 'or',     description: 'A atteint un pic de classement de 2000+.' },
  top10:           { label: 'Top 10',             glyph: '★', tier: 'argent', description: 'Classé dans le top 10.' },
  invaincu_10:     { label: 'Invaincu ×10',       glyph: '⚔', tier: 'argent', description: 'Série de 10 parties sans défaite.' },
  centurion:       { label: 'Centurion',          glyph: '✦', tier: 'bronze', description: '100 parties classées jouées.' },
}

// Définition d'un badge par id (fallback neutre si id inconnu → pas de crash).
export function badgeDef(badgeId) {
  return BADGE_DEFS[badgeId] || { label: badgeId, glyph: '•', tier: 'bronze', description: '' }
}

const enc = encodeURIComponent

async function rest(path, { timeout = 8000 } = {}) {
  if (!SB_URL || !SB_KEY) return null
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeout)
  try {
    const token = await getAccessToken().catch(() => null)
    const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
      signal: ctrl.signal,
      headers: { apikey: SB_KEY, Authorization: `Bearer ${token || SB_KEY}`, Accept: 'application/json' },
    })
    if (!res.ok) return null   // table absente / erreur → dégrade
    const text = await res.text()
    return text ? JSON.parse(text) : []
  } catch {
    return null
  } finally { clearTimeout(timer) }
}

// Badges d'un seul joueur (par discord_id). [] si rien / table absente.
export async function badgesDe(discordId, jeu = null) {
  if (!discordId) return []
  let path = `game_badges?discord_id=eq.${enc(String(discordId))}&order=granted_at.asc`
  if (jeu) path += `&or=(jeu.eq.${enc(jeu)},jeu.is.null)`
  const data = await rest(path)
  return Array.isArray(data) ? data : []
}

// Badges de PLUSIEURS joueurs en un seul appel (pour un classement).
// Renvoie une Map discord_id(string) → [badge_id, …]. Map vide si table absente.
export async function badgesPourJoueurs(discordIds = [], jeu = null) {
  const ids = [...new Set(discordIds.filter(Boolean).map(String))]
  if (!ids.length) return new Map()
  const inList = ids.map(id => `"${id}"`).join(',')
  let path = `game_badges?discord_id=in.(${enc(inList)})&order=granted_at.asc`
  if (jeu) path += `&or=(jeu.eq.${enc(jeu)},jeu.is.null)`
  const data = await rest(path)
  const map = new Map()
  if (!Array.isArray(data)) return map   // table absente → map vide (dégrade)
  for (const row of data) {
    const key = String(row.discord_id)
    if (!map.has(key)) map.set(key, [])
    if (!map.get(key).includes(row.badge_id)) map.get(key).push(row.badge_id)
  }
  return map
}
