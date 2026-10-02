// Chapitres des scans, chargés à la demande (kingdom.json pèse 1,3 Mo :
// import.meta.glob en fait des chunks séparés, rien n'entre dans le bundle).
// Partagé entre la route /manga/:slug et le hub : survoler une carte lance le
// téléchargement, la série s'ouvre ensuite sans attendre le réseau.
import { chapterAdditions, mergeChapters } from './mediaAdditions.js'

const MANGA_CHAPTERS = import.meta.glob('../data/manga/*.json')

// Chapitres livrés avec le site + chapitres ajoutés par le staff (table
// media_additions, cf. lib/mediaAdditions.js). Une série sans fichier JSON peut
// donc exister uniquement par ses ajouts.
export function loadManga(slug) {
  const load = MANGA_CHAPTERS[`../data/manga/${slug}.json`]
  const base = load ? load().then(mod => (Array.isArray(mod.default) ? mod.default : [])) : Promise.resolve([])
  return Promise.all([base, chapterAdditions(slug).catch(() => [])])
    .then(([list, rows]) => (rows.length ? mergeChapters(list, rows) : list))
}

const warmed = new Set()
export function prefetchManga(slug) {
  if (warmed.has(slug)) return
  warmed.add(slug)
  loadManga(slug).catch(() => warmed.delete(slug))
}
