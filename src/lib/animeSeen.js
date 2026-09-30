// ── « +N nouveaux » sur les cartes animé du hub ──────────────────────────────
// On retient le nombre de vidéos vues à la dernière ouverture de chaque série
// (anime_seen_count) et on le compare au catalogue (anime-counts.js).
import { ANIME_COUNTS } from '../data/anime-counts.js'

// Nombre « d'avant » des séries tout juste enrichies : sans lui, quelqu'un qui
// n'avait jamais ouvert Kimetsu ne verrait jamais les 30 épisodes ajoutés.
const BASELINE = { kny: 33, hxh: 148 }
const KEY = 'anime_seen_count'

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {} } catch { return {} }
}

export function newEpisodes(id) {
  const total = ANIME_COUNTS[id]
  if (!total) return 0
  const seen = load()[id] ?? BASELINE[id]
  return seen != null && total > seen ? total - seen : 0
}

export function markAnimeSeen(id) {
  if (!ANIME_COUNTS[id]) return
  const all = load()
  all[id] = ANIME_COUNTS[id]
  try { localStorage.setItem(KEY, JSON.stringify(all)) } catch {}
}
