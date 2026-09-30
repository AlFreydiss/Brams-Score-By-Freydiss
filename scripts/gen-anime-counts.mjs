#!/usr/bin/env node
// Génère src/data/anime-counts.js : nombre de vidéos par animé du hub.
// Le hub affiche « +N épisodes » quand une série en a gagné depuis la dernière
// visite, sans charger les *-videos.json (plusieurs centaines de Ko chacun).
//
//   node scripts/gen-anime-counts.mjs   (à relancer après chaque ajout)
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DATA = join(ROOT, 'src', 'data')
// Fichier → id du hub quand ils diffèrent.
const ALIAS = { kaiju: 'kaiju-no-8' }
const SKIP = new Set(['films'])

const counts = {}
// Films rangés dans la liste d'une série (kind: 'film', ex. HxH) : ils comptent
// pour « +N nouveautés » mais pas dans la progression « x/N épisodes ».
const films = {}
for (const f of readdirSync(DATA).filter(f => f.endsWith('-videos.json')).sort()) {
  const base = f.replace(/-videos\.json$/, '')
  if (SKIP.has(base)) continue
  try {
    const list = JSON.parse(readFileSync(join(DATA, f), 'utf8'))
    if (Array.isArray(list) && list.length) {
      const id = ALIAS[base] || base
      counts[id] = list.length
      const nFilms = list.filter(v => v?.kind === 'film').length
      if (nFilms) films[id] = nFilms
    }
  } catch {}
}
writeFileSync(join(DATA, 'anime-counts.js'), `// GÉNÉRÉ PAR scripts/gen-anime-counts.mjs — NE PAS ÉDITER À LA MAIN.
export const ANIME_COUNTS = ${JSON.stringify(counts, null, 2)}
export const ANIME_FILM_COUNTS = ${JSON.stringify(films, null, 2)}
`)
console.log(Object.keys(counts).length, 'animés')
