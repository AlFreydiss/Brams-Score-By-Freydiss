// Chargement et découpage des sous-titres .vtt hébergés sur R2.
//
// Le bucket R2 ne renvoie pas d'en-tête Access-Control-Allow-Origin : un fetch
// direct depuis le navigateur est bloqué, et un <track> l'est aussi. On passe
// donc par /api/subtitles/r2, le proxy qui existe déjà pour ça (il ajoute le
// CORS et met en cache 24 h côté CDN).

const cache = new Map()   // url → Promise<cue[]>

// "00:13.800" ou "01:02:13.800" → secondes
function parseTime(stamp) {
  const parts = String(stamp).trim().split(':').map(Number)
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  return NaN
}

export function parseVtt(text) {
  const cues = []
  for (const block of String(text || '').split(/\r?\n\r?\n/)) {
    const lines = block.split(/\r?\n/).filter(Boolean)
    const arrow = lines.find(l => l.includes('-->'))
    if (!arrow) continue
    const [rawStart, rawEnd] = arrow.split('-->')
    const start = parseTime(rawStart)
    // La borne de fin peut trainer des réglages de placement
    // ("00:16.140 align:start line:90%") : on ne garde que le timecode.
    const end = parseTime((rawEnd || '').trim().split(/\s+/)[0] || '')
    if (!Number.isFinite(start) || !Number.isFinite(end)) continue

    const body = lines.slice(lines.indexOf(arrow) + 1).join('\n')
      .replace(/<[^>]+>/g, '')     // <b>, <i>, <c.…>
      .replace(/[ \t]+/g, ' ')
      .trim()
    if (!body) continue

    cues.push({ start, end, text: body })
  }
  // Même timecode = réplique éclatée en plusieurs cues : on garde la plus
  // complète, sinon l'affichage clignote entre deux moitiés de phrase.
  const byStamp = new Map()
  for (const cue of cues) {
    const key = cue.start + '|' + cue.end
    const kept = byStamp.get(key)
    if (!kept || cue.text.length > kept.text.length) byStamp.set(key, cue)
  }
  return [...byStamp.values()].sort((a, b) => a.start - b.start)
}

// Renvoie toujours un tableau : un sous-titre indisponible ne doit jamais
// empêcher de jouer la manche.
export function loadCues(url) {
  if (!url) return Promise.resolve([])
  if (cache.has(url)) return cache.get(url)

  const p = fetch('/api/subtitles/r2?url=' + encodeURIComponent(url))
    .then(r => (r.ok ? r.text() : ''))
    .then(parseVtt)
    .catch(() => [])
  cache.set(url, p)
  return p
}

// Cue actif à l'instant t. Recherche dichotomique : appelée à chaque frame sur
// des fichiers de plusieurs centaines de répliques.
export function cueAt(cues, t) {
  let lo = 0, hi = cues.length - 1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    const c = cues[mid]
    if (t < c.start) hi = mid - 1
    else if (t > c.end) lo = mid + 1
    else return c
  }
  return null
}
