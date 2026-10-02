// Fusion des fiches media_additions avec les données livrées (fonctions
// pures, testées dans mediaMerge.test.js — pas d'import.meta ici).

const seasonOf = v => String(v?.season ?? 'S01')
const fmtNum = n => (Number.isInteger(Number(n)) ? String(Number(n)) : String(n))

// Fiche → entrée au format des *-videos.json (cf. jjk-videos.json).
export function rowToVideo(row) {
  const d = row.data || {}
  const season = row.season || 'S01'
  const lang = d.audioLang || 'ja'
  return {
    episode: Number(row.num),
    title: row.title || `Épisode ${fmtNum(row.num)}`,
    src: d.src,
    season,
    progressKey: `add-${season}-E${fmtNum(row.num)}`,
    episodeLabel: d.label || `Épisode ${fmtNum(row.num)}`,
    preferredAudioLang: lang,
    ...(d.thumbnail ? { thumbnail: d.thumbnail } : {}),
    ...(d.duration ? { duration: d.duration } : {}),
    // Même forme que les MP4 de kny-videos.json : une piste, pas de mediaSrc.
    audio: [{ label: d.audioLabel || (lang === 'fr' ? 'VF' : 'VOSTFR'), srclang: lang, default: true }],
    ...(d.subtitles ? { subtitles: [{ label: 'Français', srclang: 'fr', src: d.subtitles, default: true }] } : {}),
    badge: d.audioLabel || (lang === 'fr' ? 'VF' : 'VOSTFR'),
    addedId: row.id,
  }
}

// Insère sans réordonner les données existantes : après le dernier épisode de
// la même saison au numéro inférieur, avant les films / OAV sinon.
export function mergeVideos(list, rows) {
  if (!Array.isArray(list)) return list
  for (const row of rows) {
    const v = rowToVideo(row)
    if (!v.src) continue
    const existing = list.findIndex(x => (x.addedId && x.addedId === row.id) ||
      (!x.kind && seasonOf(x) === v.season && Number(x.episode) === v.episode))
    if (existing >= 0) {
      // Une fiche re-publiée (même numéro) remplace l'ajout précédent, jamais
      // un épisode livré avec le site.
      if (list[existing].addedId) list[existing] = v
      continue
    }
    let at = list.findIndex(x => !x.kind && seasonOf(x) === v.season && Number(x.episode) > v.episode)
    if (at < 0) {
      let last = -1
      list.forEach((x, i) => { if (!x.kind && seasonOf(x) === v.season) last = i })
      at = last >= 0 ? last + 1 : list.findIndex(x => x.kind)
    }
    if (at < 0) list.push(v)
    else list.splice(at, 0, v)
  }
  // Fiche supprimée côté staff : on la retire aussi d'une session déjà ouverte.
  const live = new Set(rows.map(r => r.id))
  for (let i = list.length - 1; i >= 0; i--) if (list[i].addedId && !live.has(list[i].addedId)) list.splice(i, 1)
  return list
}

// Chapitres ajoutés → format des src/data/manga/*.json, triés par numéro.
export function mergeChapters(list, rows) {
  const out = Array.isArray(list) ? [...list] : []
  for (const row of rows) {
    const pages = row.data?.pages
    if (!Array.isArray(pages) || !pages.length) continue
    const ch = { num: Number(row.num), title: row.title || `Chapitre ${fmtNum(row.num)}`, pages, addedId: row.id }
    const i = out.findIndex(c => Number(c.num) === ch.num)
    if (i >= 0) { if (out[i].addedId) out[i] = ch; continue }
    out.push(ch)
  }
  return out.sort((a, b) => Number(a.num) - Number(b.num))
}

