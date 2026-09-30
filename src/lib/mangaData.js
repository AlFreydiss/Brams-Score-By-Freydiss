// Chapitres des scans, chargés à la demande (kingdom.json pèse 1,3 Mo :
// import.meta.glob en fait des chunks séparés, rien n'entre dans le bundle).
// Partagé entre la route /manga/:slug et le hub : survoler une carte lance le
// téléchargement, la série s'ouvre ensuite sans attendre le réseau.
const MANGA_CHAPTERS = import.meta.glob('../data/manga/*.json')

export function loadManga(slug) {
  const load = MANGA_CHAPTERS[`../data/manga/${slug}.json`]
  return load ? load().then(mod => (Array.isArray(mod.default) ? mod.default : [])) : Promise.resolve([])
}

const warmed = new Set()
export function prefetchManga(slug) {
  if (warmed.has(slug)) return
  warmed.add(slug)
  loadManga(slug).catch(() => warmed.delete(slug))
}
