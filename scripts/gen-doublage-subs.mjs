// Génère src/data/doublage-subs.js : l'URL du fichier de sous-titres français
// de chaque épisode jouable de la « Guerre du Doublage ».
//
//   node scripts/gen-doublage-subs.mjs
//
// Pourquoi un fichier séparé plutôt qu'un champ de plus dans doublage-data.js :
// ce dernier est régénéré par gen-doublage-catalog.mjs, qui redécoupe les 735
// extraits. Ajouter l'URL là-bas obligerait à tout recalculer pour une donnée
// qui ne dépend pas du découpage. Ici on relit les mêmes sources et on ne sort
// que la table id → URL, sans toucher au catalogue.
//
// L'URL n'est PAS déductible du chemin de la vidéo : selon les animés on trouve
// « S03E01-fr.vtt » à côté de l'épisode, « Ep009.fr.vtt » dans un dossier
// -subtitles, ou « the-movie.fr.vtt ». Seules les métadonnées la donnent.

import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { ANIME_META } from '../src/data/anime-meta.js'

const OUT = 'src/data/doublage-subs.js'
const LABEL_OVERRIDES = { films: 'Films' }

// Même règle que le générateur du catalogue : il faut une piste fr ET une
// piste ja menant à deux médias distincts, sinon l'épisode n'est pas jouable.
function resolveTracks(ep) {
  const audio = ep.audio || []
  const fr = audio.find(a => a.srclang === 'fr')
  const ja = audio.find(a => a.srclang === 'ja')
  if (!fr || !ja) return null
  const vf     = fr.mediaSrc || (fr.src ? null : ep.src)
  const vostfr = ja.mediaSrc || (ja.src ? null : ep.src)
  if (!vf || !vostfr || vf === vostfr) return null
  return { vf, vostfr }
}

const subs = {}
let scanned = 0

for (const file of readdirSync('src/data').filter(f => f.endsWith('-videos.json')).sort()) {
  const key = file.replace('-videos.json', '')
  const raw = JSON.parse(readFileSync(`src/data/${file}`, 'utf8'))
  const list = Array.isArray(raw) ? raw : (raw.episodes || [])

  for (const ep of list) {
    if (!ep.src) continue
    if (!resolveTracks(ep)) continue
    const vtt = (ep.subtitles || []).find(s => s.src)
    if (!vtt) continue
    // Même identifiant que dans doublage-data.js : clé-saison-épisode.
    const id = `${key}-${ep.season || 'S01'}-${ep.episode}`
    subs[id] = vtt.src
    scanned++
  }
}

const body = Object.keys(subs).sort()
  .map(id => `  ${JSON.stringify(id)}: ${JSON.stringify(subs[id])},`)
  .join('\n')

writeFileSync(OUT, `// Auto-généré par scripts/gen-doublage-subs.mjs.
// ${scanned} épisodes · URL du sous-titre français, indexée par id de scène.
// Ne pas éditer à la main — relancer le script.

export const DOUBLAGE_SUBS = {
${body}
}
`, 'utf8')

console.log(`${scanned} sous-titres écrits dans ${OUT}`)
