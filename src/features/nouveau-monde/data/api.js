// src/features/nouveau-monde/data/api.js
// Couche d'accès du Nouveau Monde. Chaque fonction tente l'RPC Supabase migrée
// (nm_leaderboard, nm_player_log, nm_global_bounty, nm_report_match) puis RETOMBE
// sur des données mock cohérentes si le backend n'est pas encore migré — l'UI
// tourne tout de suite. Quand les RPC existent, rien à changer côté pages.
//
// Réutilise le client supabase déjà exporté par le repo (src/lib/supabase.js) :
// on NE recrée PAS de client.

import { supabase } from '@/lib/supabase'
import { ISLANDS, islandById } from './islands'

// ── Garde-fou anti-hang : le client supabase-js peut se figer (verrou refresh).
// On borne chaque appel et on bascule sur le mock à la moindre anomalie.
function withTimeout(promise, ms = 6000) {
  return Promise.race([
    Promise.resolve(promise),
    new Promise((resolve) => setTimeout(() => resolve({ data: null, error: { message: 'timeout' } }), ms)),
  ])
}

async function rpc(name, params) {
  if (!supabase) return { data: null, error: { message: 'no-client' } }
  try {
    return await withTimeout(supabase.rpc(name, params))
  } catch (e) {
    return { data: null, error: { message: e?.message || 'rpc-fail' } }
  }
}

// ── Mock deterministe ───────────────────────────────────────────────────────
// Pseudos d'équipage pour peupler l'UI tant que le backend dort.
const CREW = [
  { uid: '873117504367648798', name: 'Al Freydiss',  avatar: null },
  { uid: '100000000000000001', name: 'Nakama Roronoa', avatar: null },
  { uid: '100000000000000002', name: 'Nami la Voleuse', avatar: null },
  { uid: '100000000000000003', name: 'Sanji Vinsmoke',  avatar: null },
  { uid: '100000000000000004', name: 'Usopp le Sniper', avatar: null },
  { uid: '100000000000000005', name: 'Chopper',         avatar: null },
  { uid: '100000000000000006', name: 'Nico Robin',      avatar: null },
  { uid: '100000000000000007', name: 'Franky',          avatar: null },
  { uid: '100000000000000008', name: 'Brook',           avatar: null },
  { uid: '100000000000000009', name: 'Jinbe',           avatar: null },
]

// Hash stable → bounty pseudo-aléatoire mais reproductible par (game, uid).
function seedNum(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) }
  return Math.abs(h)
}

function mockLeaderboard(game, period = 'week') {
  const base = seedNum(`${game}:${period}`)
  return CREW
    .map((p, i) => {
      const s = seedNum(`${game}:${period}:${p.uid}`)
      const bounty = 30_000_000 + (s % 1_500_000_000)
      return {
        uid: p.uid,
        name: p.name,
        avatar: p.avatar,
        bounty,
        elo: 900 + (s % 1100),
        wins: 3 + (s % 60),
        losses: 1 + ((s >> 3) % 40),
        game,
      }
    })
    .sort((a, b) => b.bounty - a.bounty)
    .map((r, i) => ({ ...r, rank: i + 1 }))
}

function mockPlayerLog(userId) {
  const games = ISLANDS.filter((i) => i.status === 'live')
  const perGame = games.map((isl) => {
    const s = seedNum(`${isl.ratingKey}:${userId}`)
    return {
      game: isl.ratingKey,
      island: isl.id,
      title: isl.title,
      accent: isl.accent,
      bounty: 5_000_000 + (s % 600_000_000),
      elo: 900 + (s % 900),
      wins: 2 + (s % 50),
      losses: 1 + ((s >> 2) % 30),
      rank: 1 + (s % 40),
    }
  })
  const total = perGame.reduce((sum, g) => sum + g.bounty, 0)
  const known = CREW.find((c) => c.uid === String(userId))
  return {
    uid: String(userId),
    name: known?.name || `Pirate #${String(userId).slice(-5)}`,
    avatar: known?.avatar || null,
    totalBounty: total,
    perGame,
    badges: [
      { id: 'first-blood', label: 'Première Prime', hint: 'Premier match classé joué' },
      { id: 'navigator',   label: 'Navigateur',     hint: '5 îles explorées' },
      { id: 'emperor',     label: 'Empereur',       hint: 'Top 3 cross-jeux' },
    ].slice(0, 1 + (seedNum(userId) % 3)),
    history: Array.from({ length: 8 }).map((_, i) => {
      const isl = games[(seedNum(`${userId}:${i}`)) % games.length]
      const won = (seedNum(`${userId}:res:${i}`) % 2) === 0
      return {
        id: `${userId}-${i}`,
        game: isl.ratingKey,
        island: isl.id,
        title: isl.title,
        accent: isl.accent,
        result: won ? 'win' : 'loss',
        delta: won ? `+${1 + (i % 9)},${(i * 7) % 9}M ฿` : `-${1 + (i % 5)},${(i * 3) % 9}M ฿`,
        opponent: CREW[(i + 1) % CREW.length].name,
        when: `il y a ${i + 1} h`,
      }
    }),
  }
}

// ── Normalisation : la forme de retour des RPC (cf. data/backend.md) vers la
//    forme plate consommée par les pages (uid/name/avatar/bounty/elo/...).
function normRow(r, i, game) {
  return {
    uid: String(r.user_id ?? r.uid ?? ''),
    name: r.username || r.name || r.display_name || `Pirate #${String(r.user_id ?? r.uid ?? '').slice(-5)}`,
    avatar: r.avatar || r.avatar_url || null,
    bounty: Number(r.bounty ?? r.score ?? 0),
    elo: Number(r.elo ?? 0) || null,
    wins: Number(r.wins ?? 0),
    losses: Number(r.losses ?? 0),
    game: r.game || game,
    rank: Number(r.rang ?? r.rank ?? i + 1),
  }
}

// ── API publique ─────────────────────────────────────────────────────────────

// Classement d'un jeu sur une période. Backend : nm_leaderboard(p_game, p_period)
// → { ok, rows:[...] }. Le 'global' (cross-jeux) n'est PAS un jeu côté backend :
// on l'agrège côté client en sommant les bounty par joueur sur tous les jeux live.
export async function getLeaderboard(game = 'global', period = 'week') {
  const p_period = period === 'all' ? 'all' : period // backend ∈ all|week|month

  if (game === 'global') {
    const live = ISLANDS.filter((i) => i.status === 'live')
    const boards = await Promise.all(live.map((isl) => getLeaderboard(isl.ratingKey, period)))
    const byUid = new Map()
    boards.flat().forEach((r) => {
      const cur = byUid.get(r.uid) || { uid: r.uid, name: r.name, avatar: r.avatar, bounty: 0, wins: 0, losses: 0, elo: null, game: 'global' }
      cur.bounty += r.bounty; cur.wins += r.wins; cur.losses += r.losses
      cur.name = cur.name || r.name; cur.avatar = cur.avatar || r.avatar
      byUid.set(r.uid, cur)
    })
    return [...byUid.values()].sort((a, b) => b.bounty - a.bounty).map((r, i) => ({ ...r, rank: i + 1 }))
  }

  const { data, error } = await rpc('nm_leaderboard', { p_game: game, p_period })
  const rows = data?.rows ?? (Array.isArray(data) ? data : null)
  if (!error && Array.isArray(rows) && rows.length) {
    return rows.map((r, i) => normRow(r, i, game))
  }
  return mockLeaderboard(game, period)
}

// Leader (#1) d'une île précise — utilisé par les labels de la carte 3D.
export async function getIslandLeader(game) {
  const board = await getLeaderboard(game, 'week')
  return board[0] || null
}

// Profil joueur agrégé. Backend : nm_player_log(p_user) →
//   { ok, user_id, display:{discord_id,username,avatar}, total_bounty,
//     per_game:[{game,elo,bounty,wins,losses,draws,games}],
//     recent:[{id,game,mode,created_at,is_player_a,opponent,won,elo_delta,bounty_delta}] }
export async function getPlayerLog(userId) {
  if (!userId) return null
  const { data, error } = await rpc('nm_player_log', { p_user: String(userId) })
  if (!error && data && (data.per_game || data.perGame)) {
    const display = data.display || {}
    const perGame = (data.per_game || data.perGame || []).map((g) => {
      const isl = ISLANDS.find((i) => i.ratingKey === (g.game || g.ratingKey)) || {}
      return {
        game: g.game || g.ratingKey,
        island: isl.id || null,
        title: isl.title || g.title || g.game,
        accent: isl.accent || '#d4a64b',
        bounty: Number(g.bounty ?? 0),
        elo: Number(g.elo ?? 0) || null,
        wins: Number(g.wins ?? 0),
        losses: Number(g.losses ?? 0),
        rank: Number(g.rank ?? 0) || null,
      }
    })
    const history = (data.recent || data.history || []).map((m, i) => {
      const isl = ISLANDS.find((x) => x.ratingKey === m.game) || {}
      const won = m.won === true
      const lost = m.won === false
      const delta = m.bounty_delta != null
        ? `${m.bounty_delta >= 0 ? '+' : ''}${formatDelta(m.bounty_delta)}`
        : (won ? '+ ฿' : '—')
      return {
        id: String(m.id ?? `${userId}-${i}`),
        game: m.game, island: isl.id || null, title: isl.title || m.game, accent: isl.accent || '#d4a64b',
        result: won ? 'win' : (lost ? 'loss' : 'draw'),
        delta, opponent: m.opponent || 'Inconnu',
        when: m.created_at ? new Date(m.created_at).toLocaleDateString('fr-FR') : '',
      }
    })
    return {
      uid: String(data.user_id ?? userId),
      name: display.username || data.username || `Pirate #${String(userId).slice(-5)}`,
      avatar: display.avatar || data.avatar || null,
      totalBounty: Number(data.total_bounty ?? data.totalBounty ?? perGame.reduce((s, g) => s + g.bounty, 0)),
      perGame, history,
      badges: data.badges || [],
    }
  }
  return mockPlayerLog(userId)
}

function formatDelta(n) {
  const v = Math.abs(Number(n) || 0)
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)} M ฿`
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)} k ฿`
  return `${v} ฿`
}

// Prime globale (cross-jeux). Backend : nm_global_bounty(p_user) → { ok, bounty }.
export async function getGlobalBounty(userId) {
  if (!userId) return 0
  const { data, error } = await rpc('nm_global_bounty', { p_user: String(userId) })
  if (!error && data != null) {
    const val = typeof data === 'number' ? data : Number(data.bounty ?? data.total_bounty ?? 0)
    if (!Number.isNaN(val) && val > 0) return val
  }
  const log = await getPlayerLog(userId)
  return log?.totalBounty || 0
}

// Rapport de match (écriture). Backend : nm_report_match(p_game, p_opponent, p_result, p_mode).
// p_result ∈ a_win|b_win|draw (du point de vue de l'appelant). Best-effort.
export async function reportMatch({ game, opponent = null, result, mode = 'classe' } = {}) {
  const { data, error } = await rpc('nm_report_match', {
    p_game: game, p_opponent: opponent, p_result: result, p_mode: mode,
  })
  if (error) return { ok: false, error: error.message }
  return { ok: true, data }
}

// Feed du Journal — nouveautés/events. Mock pour l'instant (pas d'RPC dédiée).
export async function getJournal() {
  return [
    { id: 'j1', kind: 'release', icon: '🗺️', title: 'Le Nouveau Monde ouvre ses eaux', body: 'La carte arcade est en ligne : embarque et trace ta route.', when: "Aujourd'hui" },
    { id: 'j2', kind: 'island', icon: '♟️', title: 'Île des Échecs — saison classée', body: 'Les primes ELO sont actives. Le #1 décroche la couronne.', when: 'il y a 2 j' },
    { id: 'j3', kind: 'island', icon: '🎵', title: "Fred'isu rejoint l'archipel", body: 'Rythme et précision : grimpe au classement des virtuoses.', when: 'il y a 4 j' },
    { id: 'j4', kind: 'event', icon: '🏴‍☠️', title: 'Chasse aux primes du week-end', body: 'Double prime sur tous les matchs classés ce samedi.', when: 'il y a 6 j' },
  ]
}

export const ISLAND_LIST = ISLANDS
export { islandById }
