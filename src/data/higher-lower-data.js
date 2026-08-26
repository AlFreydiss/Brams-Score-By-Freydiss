import { OPENING_R2_CATALOG } from './opening-r2-catalog.js'
import { ANIME_YEARS } from './anime-years.js'

// ── Pool du jeu « Plus vieux / Plus récent » ────────────────────────────────
// Le catalogue R2 contient jusqu'à une dizaine d'openings pour un même animé
// (OP1, OP2, …) mais l'année connue est celle de la SAISON, pas celle de chaque
// opening. Comparer deux openings du même animé n'aurait donc pas de réponse
// juste : on ne garde qu'une entrée par animé — le premier opening — et la
// question porte sur l'année de diffusion de cet animé.
//
// `anime-years.js` est généré par scripts/gen-anime-years.mjs (API AniList).
// Un animé absent de ce fichier est simplement exclu du pool.

function openingRank(entry) {
  // "Opening 1" passe avant "Opening 7" ; le reste retombe en fin de liste.
  const n = /(\d+)/.exec(entry.episode || entry.title || '')
  return n ? Number(n[1]) : 99
}

const byAnime = new Map()

for (const entry of OPENING_R2_CATALOG) {
  const meta = ANIME_YEARS[entry.anime]
  if (!meta?.year) continue
  const current = byAnime.get(entry.anime)
  if (!current || openingRank(entry) < openingRank(current)) byAnime.set(entry.anime, entry)
}

export const HIGHER_LOWER_POOL = [...byAnime.entries()]
  .map(([anime, entry]) => ({
    id:       entry.id,
    anime,
    year:     ANIME_YEARS[anime].year,
    score:    ANIME_YEARS[anime].score,
    title:    entry.title,
    artist:   entry.artist || '',
    audioUrl: entry.audioUrl,
    color:    entry.color,
    emoji:    entry.emoji,
    endAt:    entry.endAt ?? null,
  }))
  .sort((a, b) => a.anime.localeCompare(b.anime))

// Deux animés de la même année n'ont pas de bonne réponse : la manche est
// comptée juste quoi qu'il arrive, mais autant limiter les cas d'égalité en
// tirant en priorité des années différentes (voir pickChallenger).
export const YEAR_RANGE = HIGHER_LOWER_POOL.length
  ? {
      min: Math.min(...HIGHER_LOWER_POOL.map(o => o.year)),
      max: Math.max(...HIGHER_LOWER_POOL.map(o => o.year)),
    }
  : { min: 0, max: 0 }
