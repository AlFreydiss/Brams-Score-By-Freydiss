// Rangées éditoriales du hub (logique PURE, testée dans rows.test.js).
// Avant : quatre rangées par genre qui se recouvraient — Chainsaw Man Reze Arc
// passait dans Action, Romance ET Drame. Ici chaque série n'apparaît que dans
// une seule rangée de genre, et des rangées « Films », « À binge » et
// « Parce que tu regardes X » varient l'accueil.

// Chaque série va dans le premier genre de `genres` qu'elle porte et qui n'a
// pas encore atteint `cap`. Une rangée de moins de `min` séries disparaît.
export function genreRows(animes, genres, { min = 3, cap = 12, skip = new Set() } = {}) {
  const used = new Set()
  const rows = genres.map(g => ({ genre: g, list: [] }))
  for (const a of animes) {
    if (skip.has(a.id)) continue
    for (const r of rows) {
      if (r.list.length >= cap) continue
      if ((a.genres || []).includes(r.genre) && !used.has(a.id)) { r.list.push(a); used.add(a.id); break }
    }
  }
  return rows.filter(r => r.list.length >= min)
}

export const films = (animes) => animes.filter(a => a.type === 'Film')

// Séries courtes : `episodes(id)` donne le nombre d'épisodes (0 = inconnu, exclu).
export function bingeable(animes, episodes, max = 25) {
  return animes
    .filter(a => a.type !== 'Film')
    .map(a => ({ a, n: episodes(a.id) }))
    .filter(x => x.n > 1 && x.n <= max)
    .sort((x, y) => x.n - y.n)
    .map(x => x.a)
}

// Les séries qui partagent le plus de genres avec `seed` (au moins un), sans
// les films en premier et sans la série elle-même. Égalité : ordre du catalogue.
export function similarTo(seed, animes, limit = 12) {
  if (!seed) return []
  const g = new Set(seed.genres || [])
  return animes
    .filter(a => a.id !== seed.id)
    .map((a, i) => ({ a, i, s: (a.genres || []).filter(x => g.has(x)).length }))
    .filter(x => x.s > 0)
    .sort((x, y) => y.s - x.s || x.i - y.i)
    .slice(0, limit)
    .map(x => x.a)
}
