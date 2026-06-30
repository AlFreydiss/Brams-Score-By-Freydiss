// ── Saisons de jeu : helpers front (lecture REST directe) ───────────────────
// Lit game_seasons / game_season_standings en REST direct (anti-hang, même
// pattern que features/echecs/lib/api.js et voice_live). DÉGRADE EN SILENCE :
// si les tables n'existent pas encore (migration non lancée) ou si la requête
// échoue, on renvoie null / [] → les RankingTab retombent sur le classement
// all-time existant, zéro crash. Voir supabase/migrations/20260624_seasons.sql.
import { SB_URL, SB_KEY, getAccessToken } from '../../../lib/supabaseRest.js'

const enc = encodeURIComponent

// GET PostgREST direct. Renvoie data (array) ou null en cas d'échec/absence de table.
async function rest(path, { timeout = 8000 } = {}) {
  if (!SB_URL || !SB_KEY) return null
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeout)
  try {
    const token = await getAccessToken().catch(() => null)
    const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
      signal: ctrl.signal,
      headers: {
        apikey: SB_KEY, Authorization: `Bearer ${token || SB_KEY}`,
        Accept: 'application/json',
      },
    })
    if (!res.ok) return null   // 404 table absente, 400 colonne inconnue… → dégrade
    const text = await res.text()
    return text ? JSON.parse(text) : []
  } catch {
    return null                // timeout / réseau → dégrade
  } finally { clearTimeout(timer) }
}

// Saison active d'un jeu ('echecs' | 'dames'). null si aucune / table absente.
export async function saisonActive(jeu) {
  const data = await rest(`game_seasons?jeu=eq.${enc(jeu)}&active=is.true&order=started_at.desc&limit=1`)
  return Array.isArray(data) && data[0] ? data[0] : null
}

// Classement d'une saison (agrégat), trié par rating desc. [] si vide / absent.
export async function classementSaison(seasonId, limit = 50) {
  if (!seasonId) return []
  const data = await rest(`game_season_standings?season_id=eq.${enc(seasonId)}&order=rating.desc&limit=${limit}`)
  return Array.isArray(data) ? data : []
}

// ── Formatage du compte à rebours de fin de saison ──────────────────────────
// Renvoie null si pas de fin programmée. Sinon une chaîne discrète :
// « 12 j restants », « 5 h restantes », « Dernière heure », « Saison terminée ».
export function countdownFinSaison(saison, now = Date.now()) {
  const fin = saison?.ends_at ? Date.parse(saison.ends_at) : NaN
  if (!Number.isFinite(fin)) return null
  const ms = fin - now
  if (ms <= 0) return 'Saison terminée'
  const min = Math.floor(ms / 60000)
  const h = Math.floor(min / 60)
  const j = Math.floor(h / 24)
  if (j >= 1) return `${j} j restant${j > 1 ? 's' : ''}`
  if (h >= 1) return `${h} h restante${h > 1 ? 's' : ''}`
  if (min >= 1) return `${min} min restante${min > 1 ? 's' : ''}`
  return 'Dernière minute'
}

// true si la saison est encore ouverte (pas de fin, ou fin dans le futur).
export function saisonEnCours(saison, now = Date.now()) {
  if (!saison) return false
  const fin = saison.ends_at ? Date.parse(saison.ends_at) : NaN
  return !Number.isFinite(fin) || fin > now
}
