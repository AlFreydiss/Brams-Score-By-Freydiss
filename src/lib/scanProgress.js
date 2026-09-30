// ── Progression des scans, lue depuis le hub ─────────────────────────────────
// GenericMangaPage écrit `<slug>_progress` = { [num]: 'reading' | 'read' } ; ce
// module le relit pour les cartes du hub. Il manquait l'ordre : rien ne disait
// quelle série on avait ouverte en dernier, donc « Reprendre » ne connaissait
// que One Piece. `manga_recent` = { [slug]: { num, ts } } comble ce trou.
const RECENT_KEY = 'manga_recent'
export const SCANS_EVENT = 'scans:change'

function readJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback } catch { return fallback }
}

export function recordScanOpen(slug, num) {
  const recent = readJSON(RECENT_KEY, {})
  recent[slug] = { num, ts: Date.now() }
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(recent)) } catch {}
  try { window.dispatchEvent(new CustomEvent(SCANS_EVENT)) } catch {}
}

// { read, current, pct, ts } pour une série du catalogue (chapters = total).
// current = le dernier chapitre ouvert, sinon le plus avancé déjà entamé.
export function readScanProgress(scan) {
  const prog = readJSON(`${scan.slug}_progress`, {})
  const entries = Object.entries(prog)
  const read = entries.filter(([, st]) => st === 'read').length
  const recent = readJSON(RECENT_KEY, {})[scan.slug]
  let current = recent?.num ?? null
  if (current == null && entries.length) current = Math.max(...entries.map(([n]) => Number(n)).filter(Number.isFinite))
  const pct = scan.chapters ? Math.min(100, Math.round((read / scan.chapters) * 100)) : 0
  // Page retenue par le lecteur dans ce chapitre (0 = début), pour « ch. 13 · p. 7 ».
  let page = 0
  if (current != null) { try { page = parseInt(localStorage.getItem(`${scan.slug}_page_${current}`) || '0', 10) || 0 } catch {} }
  return { read, current, page, pct, ts: recent?.ts || 0, started: entries.length > 0 }
}

// Chapitres vus à la dernière visite de la série : « +N nouveaux » quand le
// catalogue en a ajouté depuis. Rien tant que la série n'a jamais été ouverte.
const SEEN_KEY = 'manga_seen_count'
export function newChaptersSince(scan) {
  const seen = readJSON(SEEN_KEY, {})[scan.slug]
  return seen != null && scan.chapters > seen ? scan.chapters - seen : 0
}
export function markSeen(slug, count) {
  const all = readJSON(SEEN_KEY, {})
  all[slug] = count
  try { localStorage.setItem(SEEN_KEY, JSON.stringify(all)) } catch {}
}
export function seenCount(slug) {
  return readJSON(SEEN_KEY, {})[slug] ?? null
}

// Statut dérivé, mêmes valeurs que Ma Liste côté animés.
export const scanStatus = p => (!p.started ? 'avoir' : p.pct >= 100 ? 'termine' : 'encours')
