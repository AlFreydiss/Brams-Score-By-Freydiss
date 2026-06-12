// ── Accès données échecs : REST direct (anti-hang) + RPC ────────────────────
// Même pattern que undercoverRooms.js : fetch REST direct pour lire/écrire
// (le client supabase-js peut bloquer sur le verrou d'auth), client supabase
// gardé UNIQUEMENT pour le Realtime (canaux) dans useRealtimeGame.
import { SB_URL, SB_KEY, getAccessToken, sbRpc } from '../../../lib/supabaseRest.js'

async function rest(path, { method = 'GET', body, prefer } = {}) {
  if (!SB_URL || !SB_KEY) return { data: null, error: 'supabase_non_configure' }
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 10_000)
  try {
    const token = await getAccessToken().catch(() => null)
    const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
      method, signal: ctrl.signal,
      headers: {
        apikey: SB_KEY, Authorization: `Bearer ${token || SB_KEY}`,
        'Content-Type': 'application/json', Accept: 'application/json',
        ...(prefer ? { Prefer: prefer } : {}),
      },
      body: body != null ? JSON.stringify(body) : undefined,
    })
    const text = await res.text()
    if (!res.ok) {
      let msg = `http_${res.status}`
      try { const j = JSON.parse(text); msg = j.message || j.error || msg } catch {}
      return { data: null, error: msg }
    }
    return { data: text ? JSON.parse(text) : null, error: null }
  } catch (e) {
    return { data: null, error: e?.name === 'AbortError' ? 'timeout' : (e?.message || 'fail') }
  } finally { clearTimeout(timer) }
}
const enc = encodeURIComponent

// ── Profils ──────────────────────────────────────────────────────────────────
// Crée/rafraîchit mon profil échecs (pseudo + avatar) — security definer.
export function assurerProfil(pseudo, avatar) {
  return sbRpc('echecs_assurer_profil', { p_pseudo: pseudo || 'Pirate', p_avatar: avatar || null }, { tag: 'echecs' })
}

export async function getProfil(userId) {
  if (!userId) return null
  const { data } = await rest(`echecs_profils?user_id=eq.${enc(userId)}&limit=1`)
  return data?.[0] || null
}

export async function getLeaderboard(limit = 10) {
  const { data } = await rest(`echecs_profils?order=elo.desc&limit=${limit}&parties=gt.0`)
  return data || []
}

// ── Parties ──────────────────────────────────────────────────────────────────
export async function getPartie(id) {
  if (!id) return { data: null, error: 'id_manquant' }
  const { data, error } = await rest(`echecs_parties?id=eq.${enc(id)}&limit=1`)
  return { data: data?.[0] || null, error }
}

// Ma partie encore en cours (reprise après refresh / navigation)
export async function getPartieEnCours(userId) {
  if (!userId) return null
  const { data } = await rest(`echecs_parties?statut=eq.en_cours&or=(blanc_id.eq.${enc(userId)},noir_id.eq.${enc(userId)})&order=created_at.desc&limit=1`)
  return data?.[0] || null
}

// ── RPC parties (autorité serveur : horloges via now() postgres) ────────────
export function rpcApparier({ cadence, elo, pseudo, avatar }) {
  return sbRpc('echecs_apparier_ou_attendre', {
    p_cadence: cadence, p_elo: elo ?? 1200, p_pseudo: pseudo || 'Pirate', p_avatar: avatar || null,
  }, { tag: 'echecs' })
}

export function rpcQuitterFile() {
  return sbRpc('echecs_quitter_file', {}, { tag: 'echecs' })
}

export function rpcJouerCoup({ partieId, fen, pgn, san }) {
  return sbRpc('echecs_jouer_coup', { p_partie_id: partieId, p_fen: fen, p_pgn: pgn, p_san: san }, { tag: 'echecs' })
}

// Fin de partie détectée côté client (mat/pat/nulle) — resultat: blanc|noir|nulle
export function rpcTerminer({ partieId, resultat, cause, fen, pgn }) {
  return sbRpc('echecs_terminer', { p_partie_id: partieId, p_resultat: resultat, p_cause: cause, p_fen: fen || null, p_pgn: pgn || null }, { tag: 'echecs' })
}

export function rpcAbandonner(partieId) {
  return sbRpc('echecs_abandonner', { p_partie_id: partieId }, { tag: 'echecs' })
}

export function rpcNulleAccord(partieId) {
  return sbRpc('echecs_nulle_accord', { p_partie_id: partieId }, { tag: 'echecs' })
}

// Drapeau : le serveur vérifie lui-même que le temps du joueur au trait est écoulé
export function rpcReclamerTemps(partieId) {
  return sbRpc('echecs_reclamer_temps', { p_partie_id: partieId }, { tag: 'echecs' })
}

export function rpcRevanche(partieId) {
  return sbRpc('echecs_revanche', { p_partie_id: partieId }, { tag: 'echecs' })
}

// Applique l'ELO (idempotent côté serveur) → { delta_blanc, delta_noir, ... }
export function rpcFinaliser(partieId) {
  return sbRpc('echecs_finaliser_partie', { p_partie_id: partieId }, { tag: 'echecs' })
}
