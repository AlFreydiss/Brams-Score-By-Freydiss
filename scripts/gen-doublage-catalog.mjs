// Génère src/data/doublage-data.js : toutes les scènes jouables pour le
// tournoi "Guerre du Doublage" (VF vs VOSTFR).
//
//   node scripts/gen-doublage-catalog.mjs
//
// Source : les épisodes déjà hébergés sur R2 qui possèdent les deux pistes
// (badge MULTI) — `src` = VF, `audio[srclang=ja].mediaSrc` = VOSTFR.
// Aucun nouveau média à uploader.

import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { ANIME_META } from '../src/data/anime-meta.js'

// Certains fichiers ne correspondent a aucune cle de ANIME_META.
const LABEL_OVERRIDES = { films: 'Films' }

const OUT = 'src/data/doublage-data.js'
// Le hub des tournois n'affiche qu'un nombre : lui faire importer doublage-data
// tirerait 170 ko de scènes dans son bundle, d'où ce fichier séparé.
const OUT_COUNT = 'src/data/doublage-count.js'

// Palette réutilisée pour l'accent des cartes quand la jaquette ne charge pas.
const COLORS = ['#c62828','#7c3aed','#0e7490','#b45309','#15803d','#be185d','#1d4ed8','#d97706']

const scenes = []
let colorIdx = 0

for (const file of readdirSync('src/data').filter(f => f.endsWith('-videos.json')).sort()) {
  const key = file.replace('-videos.json', '')
  const raw = JSON.parse(readFileSync(`src/data/${file}`, 'utf8'))
  const list = Array.isArray(raw) ? raw : (raw.episodes || [])
  const anime = ANIME_META[key]?.title || LABEL_OVERRIDES[key] || key
  const color = COLORS[colorIdx++ % COLORS.length]

  for (const ep of list) {
    const ja = (ep.audio || []).find(a => a.srclang === 'ja' && a.mediaSrc)
    if (!ep.src || !ja) continue
    scenes.push({
      id: `${key}-${ep.season || 'S01'}-${ep.episode}`,
      animeKey: key,
      anime,
      season: ep.season || 'S01',
      episode: ep.episode,
      title: ep.title || `Épisode ${ep.episode}`,
      vf: ep.src,
      vostfr: ja.mediaSrc,
      thumbnail: ep.thumbnail || null,
      color,
    })
  }
}

const body = scenes.map(s => '  ' + JSON.stringify(s) + ',').join('\n')
const perAnime = [...new Set(scenes.map(s => s.anime))]

writeFileSync(OUT, `// Auto-généré par scripts/gen-doublage-catalog.mjs.
// ${scenes.length} scènes sur ${perAnime.length} animés — chaque entrée pointe la
// même vidéo en VF (\`vf\`) et en VOSTFR (\`vostfr\`), donc le même instant peut
// être comparé d'une piste à l'autre sans re-uploader quoi que ce soit.
// Ne pas éditer à la main — relancer le script.

export const DOUBLAGE_SCENES = [
${body}
]
`)

writeFileSync(OUT_COUNT, `// Auto-généré par scripts/gen-doublage-catalog.mjs.
// Nombre de scènes jouables, isolé pour que le hub des tournois n'ait pas à
// importer le catalogue complet.
export const DOUBLAGE_SCENE_COUNT = ${scenes.length}
`)

console.log(`${scenes.length} scènes (${perAnime.length} animés) → ${OUT}`)
console.log(perAnime.join(', '))
