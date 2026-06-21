// ── Ma Liste + reprise unifiée (animés ET scans) ─────────────────────────────
// Statut explicite posé par l'utilisateur (à voir / en cours / vu) sur un média,
// anime OU scan. localStorage = source de vérité instantanée ; miroir Supabase
// best-effort via RPC (pattern sbRpc anti-hang) : si la migration my_list.sql
// n'est pas appliquée (RPC absente) ou si déconnecté, on reste 100 % local et
// rien ne casse. Voir docs/sql/my_list.sql pour le schéma serveur.
import { sbRpc, sbAccessToken } from './supabaseRest.js'
import CHAPTERS_DATA from '../data/chapters-data.json'

const LIST_KEY = 'my_list_v1' // { [mediaKey]: { status, ts } }

// Statuts canoniques — alignés sur les segments existants du hub (avoir/encours/
// termine) pour que le filtrage marche sans table de correspondance.
export const STATUS = { TODO: 'avoir', DOING: 'encours', DONE: 'termine' }
export const STATUS_LABEL = { avoir: 'À voir', encours: 'En cours', termine: 'Vu' }
export const STATUS_ORDER = ['avoir', 'encours', 'termine']

// Clé média : 'anime:onepiece' | 'scan:onepiece'. Préfixe = type de média pour
// qu'un anime et son scan homonyme ne partagent pas le même statut.
export function mediaKey(kind, id) { return `${kind}:${id}` }

function load() { try { return JSON.parse(localStorage.getItem(LIST_KEY) || '{}') } catch { return {} } }
function save(o) { try { localStorage.setItem(LIST_KEY, JSON.stringify(o)) } catch {} }

export function getList() { return load() }
export function getStatus(key) { return load()[key]?.status || null }

// Pose (ou retire si status falsy) un statut. Écrit local immédiat + push
// serveur fire-and-forget. Émet 'mylist:change' pour rafraîchir l'UI ouverte.
export function setStatus(key, status) {
  const o = load()
  if (!status) delete o[key]
  else o[key] = { status, ts: Date.now() }
  save(o)
  if (sbAccessToken()) {
    sbRpc('set_my_list', { p_key: key, p_status: status || null }, { tag: 'mylist' }).catch(() => {})
  }
  try { window.dispatchEvent(new CustomEvent('mylist:change')) } catch {}
  return o
}

// Cycle pour un bouton unique : rien → à voir → en cours → vu → rien.
export function cycleStatus(key) {
  const cur = getStatus(key)
  const i = STATUS_ORDER.indexOf(cur)
  const next = i === -1 ? STATUS_ORDER[0] : STATUS_ORDER[i + 1] || null
  setStatus(key, next)
  return next
}

// Fusionne la liste serveur dans le local (au login). Best-effort : RPC absente
// ou erreur → no-op. Le serveur gagne sur les entrées plus récentes (ts).
export async function syncMyList() {
  if (!sbAccessToken()) return load()
  try {
    const rows = await sbRpc('get_my_list', {}, { tag: 'mylist' })
    if (!Array.isArray(rows)) return load()
    const o = load()
    for (const r of rows) {
      if (!r?.key || !r?.status) continue
      const ts = r.ts ? new Date(r.ts).getTime() : 0
      if (!o[r.key] || ts >= (o[r.key].ts || 0)) o[r.key] = { status: r.status, ts }
    }
    save(o)
    try { window.dispatchEvent(new CustomEvent('mylist:change')) } catch {}
    return o
  } catch { return load() }
}

// ── Reprise scan One Piece (lecteur ScansPage, localStorage) ─────────────────
// manga_last_read = numéro du dernier chapitre ouvert ; on dérive un % de
// progression sur le total de chapitres connus. Null si jamais lu.
const TOTAL_OP_CHAPTERS = Array.isArray(CHAPTERS_DATA) ? CHAPTERS_DATA.length : 0
export function getScanContinue() {
  try {
    const last = parseInt(localStorage.getItem('manga_last_read') || '0', 10) || 0
    if (!last || !TOTAL_OP_CHAPTERS) return null
    const pct = Math.min(100, Math.max(0, Math.round((last / TOTAL_OP_CHAPTERS) * 100)))
    return { kind: 'scan', id: 'onepiece', chapter: last, total: TOTAL_OP_CHAPTERS, pct }
  } catch { return null }
}
