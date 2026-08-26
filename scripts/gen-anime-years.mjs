// Génère src/data/anime-years.js : année de sortie + note pour chaque animé
// présent dans le catalogue d'openings R2 (source: API AniList).
//
//   node scripts/gen-anime-years.mjs
//
// Le script garde un cache dans scripts/anime-years-cache.json et ne relance
// que les animés encore introuvables : une seconde exécution est donc rapide.
//
// AniList plafonne à 30 requêtes/minute (limite dégradée en vigueur) : dépasser
// ce seuil renvoie des 429 en rafale et le script ne ramène plus rien. D'où
// DELAY à 2.1s + pause automatique quand le quota restant devient faible.

import { readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { OPENING_R2_CATALOG } from '../src/data/opening-r2-catalog.js'

const CACHE = 'scripts/anime-years-cache.json'
const OUT   = 'src/data/anime-years.js'
const DELAY = 2100

const sleep = ms => new Promise(r => setTimeout(r, ms))

const QUERY = `query ($s: String) {
  Media(search: $s, type: ANIME) {
    id
    title { romaji english }
    startDate { year }
    averageScore
  }
}`

// La recherche AniList retombe parfois sur un film, un special ou un homonyme.
// Ces années-là sont corrigées à la main (vérifiées une par une) et écrasent le
// résultat de l'API au moment d'écrire le fichier.
const MANUAL_YEARS = {
  'Demon Slayer':                2019, // l'API tombe sur "Onigiri"
  'Demon Slayer S3':             2023, // introuvable côté API
  'Kuroshitsuji':                2008, // l'API renvoie le film de 2017
  "Natsume's Book of Friends":   2008, // l'API renvoie un special de 2021
  'The Ancient Magus':           2017, // l'API renvoie les specials de 2018
  'Tokyo Ghoul S2':              2015, // √A, pas :re 2
}

// Titres trop ambigus pour être datés de façon fiable : exclus du pool plutôt
// que datés au hasard.
const DROP = new Set([
  'Konoyo', // l'API renvoie un film Dragon Ball Z
])

// "Attack on Titan S2" → "Attack on Titan Season 2" : AniList ne comprend pas "S2".
function searchTitle(anime) {
  return anime
    .replace(/\bS(\d)\b/g, 'Season $1')
    .replace(/\bFinal\b/, 'Final Season')
    .trim()
}

async function lookup(anime, attempt = 0) {
  let res
  try {
    res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: QUERY, variables: { s: searchTitle(anime) } }),
    })
  } catch (err) {
    if (attempt >= 3) throw err
    await sleep(5000)
    return lookup(anime, attempt + 1)
  }

  // 429 (quota dépassé) ou 5xx (AniList qui tousse) : on attend et on retente.
  if ((res.status === 429 || res.status >= 500) && attempt < 4) {
    const wait = Number(res.headers.get('retry-after') || 62) * 1000
    console.log(`   ${res.status} → pause ${Math.round(wait / 1000)}s`)
    await sleep(wait)
    return lookup(anime, attempt + 1)
  }
  if (!res.ok) return { failed: true }

  // Quota presque épuisé : on souffle avant la requête suivante.
  const left = Number(res.headers.get('x-ratelimit-remaining') ?? 99)
  if (left <= 2) await sleep(30000)

  const json = await res.json()
  const hit = json?.data?.Media
  const year = hit?.startDate?.year
  if (!year) return null // vraiment introuvable : inutile de réessayer plus tard

  return {
    year,
    // AniList note sur 100 → ramenée sur 10 comme le reste du site.
    score: hit.averageScore ? Math.round(hit.averageScore) / 10 : null,
    anilistId: hit.id,
    matched: hit.title?.english || hit.title?.romaji || null,
  }
}

const animes = [...new Set(OPENING_R2_CATALOG.map(o => o.anime))].sort()
const cache = existsSync(CACHE) ? JSON.parse(await readFile(CACHE, 'utf8')) : {}

// Les entrées ratées à cause du quota repassent en « à faire ».
for (const [anime, v] of Object.entries(cache)) {
  if (!v || v.failed) delete cache[anime]
}

const todo = animes.filter(a => cache[a] === undefined)
console.log(`${animes.length} animés · ${animes.length - todo.length} en cache · ${todo.length} à récupérer`)
console.log(`~${Math.ceil((todo.length * DELAY) / 60000)} min estimées\n`)

let done = 0
for (const anime of todo) {
  done++
  try {
    const found = await lookup(anime)
    cache[anime] = found
    console.log(`${done}/${todo.length} ${anime} → ${found?.year ?? (found?.failed ? 'échec' : 'introuvable')}`)
  } catch (err) {
    console.log(`${done}/${todo.length} ${anime} → erreur ${err.message}`)
    cache[anime] = { failed: true }
  }
  await writeFile(CACHE, JSON.stringify(cache, null, 2))
  await sleep(DELAY)
}

// Les corrections manuelles priment sur l'API, y compris pour un animé qu'elle
// n'a pas su trouver du tout.
const merged = { ...cache }
for (const [anime, year] of Object.entries(MANUAL_YEARS)) {
  merged[anime] = { ...(merged[anime] || {}), year, manual: true }
}

const found = Object.entries(merged).filter(([anime, v]) => v?.year && !DROP.has(anime))
found.sort(([a], [b]) => a.localeCompare(b))

const body = found
  .map(([anime, v]) => `  ${JSON.stringify(anime)}: { year: ${v.year}, score: ${v.score ?? 'null'}, anilistId: ${v.anilistId ?? 'null'} },`)
  .join('\n')

await writeFile(OUT, `// Auto-généré par scripts/gen-anime-years.mjs (source: API AniList).
// year  : année de première diffusion de la saison
// score : note AniList ramenée sur 10 (null si non notée)
// Ne pas éditer à la main — relancer le script.
export const ANIME_YEARS = {
${body}
}
`)

console.log(`\n${found.length}/${animes.length} animés datés → ${OUT}`)
