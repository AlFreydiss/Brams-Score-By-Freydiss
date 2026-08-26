// Génère src/data/doublage-data.js : les scènes jouables du tournoi
// « Guerre du Doublage » (VF vs VOSTFR).
//
//   node scripts/gen-doublage-catalog.mjs
//
// Source des vidéos : les épisodes déjà hébergés sur R2 qui existent vraiment
// dans les deux langues. Attention, `src` n'est PAS toujours la VF : pour les
// animés jamais doublés (Bunny Girl, Carole & Tuesday, JJK, Rent-a-Girlfriend)
// `src` est le master japonais et il n'y a aucune piste française. La règle est
// donc de partir du tableau `audio` et d'exiger une entrée `fr` ET une entrée
// `ja` menant à deux médias distincts. Aucun média à uploader.
//
// Choix des extraits : on NE tire PAS un timecode au hasard. Un instant pris à
// l'aveugle tombe une fois sur deux dans un générique, un plan muet ou un
// silence — inutilisable pour comparer deux doublages. À la place on lit le
// fichier de sous-titres français de l'épisode et on cherche les fenêtres où
// ça parle vraiment : beaucoup de répliques, rapprochées, sur ~28 secondes.
// Les meilleures fenêtres de chaque tiers de l'épisode sont retenues, ce qui
// donne des extraits variés (début / milieu / fin) et jamais un blanc.
//
// Le cache scripts/doublage-vtt-cache.json évite de retélécharger les
// sous-titres à chaque exécution.

import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { ANIME_META } from '../src/data/anime-meta.js'

const OUT       = 'src/data/doublage-data.js'
const OUT_COUNT = 'src/data/doublage-count.js'
const CACHE     = 'scripts/doublage-vtt-cache.json'

// Certains fichiers ne correspondent à aucune clé de ANIME_META.
const LABEL_OVERRIDES = { films: 'Films' }

const R2_BASE = 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/'

// Palette réutilisée pour l'accent des cartes.
const COLORS = ['#c62828', '#7c3aed', '#0e7490', '#b45309', '#15803d', '#be185d', '#1d4ed8', '#d97706']

// ── Réglages de découpe ─────────────────────────────────────────────────────
const WINDOW      = 28   // durée visée d'un extrait, en secondes
const STEP        = 2    // pas de la fenêtre glissante
const MAX_GAP     = 6    // au-delà, le dialogue est coupé : la fenêtre est écartée
const MIN_LINES   = 5    // en dessous, la scène est trop peu bavarde
const MAX_LINES   = 25   // au-delà sur 28s, ce sont des sous-titres animés, pas du dialogue
const CLIPS_PER_EP = 3   // un extrait par tiers d'épisode au maximum
const MIN_APART   = 90   // écart minimal entre deux extraits d'un même épisode

const sleep = ms => new Promise(r => setTimeout(r, ms))

// ── Sous-titres ─────────────────────────────────────────────────────────────
function parseTime(stamp) {
  // "00:13.800" ou "01:02:13.800"
  const parts = stamp.trim().split(':').map(Number)
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  return NaN
}

function parseVtt(text) {
  const cues = []
  for (const block of text.split(/\r?\n\r?\n/)) {
    const lines = block.split(/\r?\n/).filter(Boolean)
    const arrow = lines.find(l => l.includes('-->'))
    if (!arrow) continue
    const [rawStart, rawEnd] = arrow.split('-->')
    const start = parseTime(rawStart)
    // La borne de fin peut être suivie de réglages de position
    // ("00:16.140 align:start line:90%") : on ne garde que le timecode.
    const end   = parseTime((rawEnd || '').trim().split(/\s+/)[0] || '')
    if (!Number.isFinite(start) || !Number.isFinite(end)) continue

    const body = lines.slice(lines.indexOf(arrow) + 1).join(' ')
      .replace(/<[^>]+>/g, '')   // balises <b>, <i>…
      .replace(/\s+/g, ' ')
      .trim()
    if (!body) continue

    // Paroles de générique (♪) et cartons de titre (tout en majuscules) : ce
    // n'est pas du doublage de dialogue, on les jette.
    if (/[♪♫]/.test(body)) continue
    const letters = body.replace(/[^A-Za-zÀ-ÿ]/g, '')
    if (letters.length > 3 && letters === letters.toUpperCase()) continue

    // Certains fichiers (les films) contiennent des sous-titres animés
    // caractère par caractère : des centaines de cues d'une seule lettre au
    // même timecode. Ce n'est pas du dialogue, ça fausse la densité.
    if (body.length < 3) continue

    cues.push({ start, end, text: body })
  }

  // Même timecode = même réplique éclatée : on ne garde que la version la plus
  // complète.
  const byStamp = new Map()
  for (const cue of cues) {
    const key = `${cue.start}|${cue.end}`
    const kept = byStamp.get(key)
    if (!kept || cue.text.length > kept.text.length) byStamp.set(key, cue)
  }

  return [...byStamp.values()].sort((a, b) => a.start - b.start)
}

// Meilleures fenêtres de dialogue continu, réparties sur l'épisode.
function findScenes(cues) {
  if (cues.length < MIN_LINES) return []

  const last = cues[cues.length - 1].end
  const candidates = []

  for (let t = 0; t + WINDOW <= last; t += STEP) {
    const inside = cues.filter(c => c.start >= t && c.end <= t + WINDOW)
    if (inside.length < MIN_LINES) continue
    if (inside.length > MAX_LINES) continue

    // Un trou franc au milieu = deux bouts de scènes sans rapport.
    let gap = 0
    for (let i = 1; i < inside.length; i++) {
      gap = Math.max(gap, inside[i].start - inside[i - 1].end)
    }
    if (gap > MAX_GAP) continue

    const chars = inside.reduce((n, c) => n + c.text.length, 0)
    // Des répliques trop courtes en moyenne (onomatopées, cris) ne donnent pas
    // de quoi juger un doublage.
    if (chars / inside.length < 10) continue

    candidates.push({
      // On démarre juste avant la première réplique : pas de blanc à l'ouverture.
      start: Math.max(0, inside[0].start - 1.2),
      end:   Math.min(inside[0].start - 1.2 + WINDOW + 4, inside[inside.length - 1].end + 1.5),
      lines: inside.length,
      score: inside.length * 10 + chars / 20 - gap * 3,
    })
  }

  if (!candidates.length) return []

  // Un extrait par tiers d'épisode : sinon les trois meilleurs se collent tous
  // au même moment fort et l'épisode ne donne qu'une seule ambiance.
  const thirds = [[0, last / 3], [last / 3, (last * 2) / 3], [(last * 2) / 3, last]]
  const picked = []

  for (const [from, to] of thirds) {
    const pool = candidates
      .filter(c => c.start >= from && c.start < to)
      .filter(c => picked.every(p => Math.abs(p.start - c.start) >= MIN_APART))
      .sort((a, b) => b.score - a.score)
    if (pool[0]) picked.push(pool[0])
    if (picked.length >= CLIPS_PER_EP) break
  }

  return picked
    .sort((a, b) => a.start - b.start)
    .map(c => ({
      startAt: Math.round(c.start * 10) / 10,
      endAt:   Math.round(c.end * 10) / 10,
      lines:   c.lines,
    }))
}

// ── Pistes VF / VOSTFR ──────────────────────────────────────────────────────
// Une entrée `audio` sans `mediaSrc` ni `src` désigne la piste par défaut du
// fichier `src` de l'épisode (cas AoT, DBS, films). Une entrée avec `src` seul
// est une piste audio séparée (un .m4a sans image, cas Violet Evergarden) :
// elle demanderait de synchroniser un <audio> avec la vidéo, donc on la laisse
// de côté.
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

// ── Collecte ────────────────────────────────────────────────────────────────
const cache = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, 'utf8')) : {}

const episodes = []
let colorIdx = 0

for (const file of readdirSync('src/data').filter(f => f.endsWith('-videos.json')).sort()) {
  const key = file.replace('-videos.json', '')
  const raw = JSON.parse(readFileSync(`src/data/${file}`, 'utf8'))
  const list = Array.isArray(raw) ? raw : (raw.episodes || [])
  const anime = ANIME_META[key]?.title || LABEL_OVERRIDES[key] || key
  const color = COLORS[colorIdx++ % COLORS.length]

  for (const ep of list) {
    if (!ep.src) continue
    const tracks = resolveTracks(ep)
    if (!tracks) continue
    const vtt = (ep.subtitles || []).find(s => s.src)
    if (!vtt) continue   // sans sous-titres, impossible de repérer les dialogues
    episodes.push({
      key, anime, color,
      season:  ep.season || 'S01',
      episode: ep.episode,
      title:   ep.title || `Épisode ${ep.episode}`,
      vf:      tracks.vf,
      vostfr:  tracks.vostfr,
      vttUrl:  vtt.src,
    })
  }
}

console.log(`${episodes.length} épisodes VF+VOSTFR avec sous-titres`)

let fetched = 0, fromCache = 0, failed = 0
for (const ep of episodes) {
  if (cache[ep.vttUrl] !== undefined) { fromCache++; continue }
  try {
    const res = await fetch(ep.vttUrl)
    cache[ep.vttUrl] = res.ok ? await res.text() : null
    if (!res.ok) failed++
  } catch {
    cache[ep.vttUrl] = null
    failed++
  }
  fetched++
  if (fetched % 25 === 0) {
    writeFileSync(CACHE, JSON.stringify(cache))
    console.log(`  ${fetched} sous-titres téléchargés…`)
    await sleep(200)
  }
}
writeFileSync(CACHE, JSON.stringify(cache))
console.log(`sous-titres : ${fromCache} en cache, ${fetched} téléchargés, ${failed} en échec`)

// ── Découpe ─────────────────────────────────────────────────────────────────
const scenes = []
let clipCount = 0

for (const ep of episodes) {
  const vtt = cache[ep.vttUrl]
  if (!vtt) continue
  const clips = findScenes(parseVtt(vtt))
  if (!clips.length) continue
  clipCount += clips.length
  scenes.push({
    id:      `${ep.key}-${ep.season}-${ep.episode}`,
    animeKey: ep.key,
    anime:   ep.anime,
    season:  ep.season,
    episode: ep.episode,
    title:   ep.title,
    // Chemins relatifs à R2_BASE : répéter l'hôte 400 fois pèse pour rien.
    vf:      ep.vf.replace(R2_BASE, ''),
    vostfr:  ep.vostfr.replace(R2_BASE, ''),
    color:   ep.color,
    clips,
  })
}

const perAnime = [...new Set(scenes.map(s => s.anime))]
const body = scenes.map(s => '  ' + JSON.stringify(s) + ',').join('\n')

writeFileSync(OUT, `// Auto-généré par scripts/gen-doublage-catalog.mjs.
// ${scenes.length} épisodes · ${clipCount} extraits sur ${perAnime.length} animés.
//
// Chaque entrée pointe le même épisode en VF (\`vf\`) et en VOSTFR (\`vostfr\`),
// et \`clips\` liste des fenêtres de dialogue repérées dans les sous-titres
// français : du vrai texte parlé, jamais un générique ni un silence.
// Ne pas éditer à la main — relancer le script.

const R2 = '${R2_BASE}'

const RAW = [
${body}
]

export const DOUBLAGE_SCENES = RAW.map(s => ({
  ...s,
  vf:     R2 + s.vf,
  vostfr: R2 + s.vostfr,
}))
`)

writeFileSync(OUT_COUNT, `// Auto-généré par scripts/gen-doublage-catalog.mjs.
// Nombre d'extraits jouables, isolé pour que le hub des tournois n'ait pas à
// importer le catalogue complet.
export const DOUBLAGE_SCENE_COUNT = ${clipCount}
`)

console.log(`${scenes.length} épisodes · ${clipCount} extraits (${perAnime.length} animés) → ${OUT}`)
console.log(perAnime.join(', '))
