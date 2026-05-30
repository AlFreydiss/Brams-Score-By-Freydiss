// ── Tokens & logique partagés de la page profil ─────────────────────────────
// Source unique pour les composants src/components/profile/*. Pas de duplication.

// Design tokens — dark premium Brams (zéro RGB, or = économie, violet = rang/rareté).
export const PF = {
  bg:          '#08090D',
  bg2:         '#0b0c0e',
  graphite:    '#111214',
  surface:     'rgba(255,255,255,0.035)',
  surface2:    'rgba(255,255,255,0.06)',
  border:      'rgba(255,255,255,0.08)',
  borderStrong:'rgba(255,255,255,0.14)',
  text:        '#e8e9ec',
  textDim:     'rgba(255,255,255,0.55)',
  textFaint:   'rgba(255,255,255,0.32)',
  gold:        '#d4a017',
  goldSoft:    '#bfa46a',
  violet:      '#a66cff',
  green:       '#2ecc71',
}

export const RANK_MAP = [
  { min: 150, rang: 'Roi des Pirates', emoji: '👑', color: '#FFD700', next: null },
  { min: 70,  rang: 'Yonkou',          emoji: '🌊', color: '#A66CFF', next: 150 },
  { min: 40,  rang: 'Amiral',          emoji: '🪖', color: '#F5C542', next: 70  },
  { min: 25,  rang: 'Shichibukai',     emoji: '⚔️', color: '#2ECC71', next: 40  },
  { min: 10,  rang: 'Pirate',          emoji: '🏴‍☠️', color: '#4F8CFF', next: 25  },
  { min: 0,   rang: 'Moussaillon',     emoji: '⚓',  color: '#8A8F9F', next: 10  },
]

export const RANK_QUOTES = {
  'Roi des Pirates': "Les mers du monde m'appartiennent.",
  'Yonkou':          'Les mers tremblent là où je marche.',
  'Amiral':          "La justice forgée dans l'acier ne faiblit jamais.",
  'Shichibukai':     'Entre ombre et lumière, je trace ma propre route.',
  'Pirate':          'La liberté se mérite par le sang et la sueur.',
  'Moussaillon':     'Chaque légende commence par un premier voyage.',
}

// Succès — `check(member, shopData, hours)` renvoie un booléen.
export const ACHIEVEMENTS = [
  { id: 'premier_million', label: 'Premier Million', desc: 'Atteindre 1 000 000 ฿',     icon: '💎', rarity: 'Rare',       check: (m)      => parseInt(m?.berrys || 0) >= 1_000_000 },
  { id: 'vocal_10',        label: 'Voix du Peuple',  desc: '10 heures en vocal',         icon: '🎙', rarity: 'Commun',     check: (m,s,h) => h >= 10 },
  { id: 'vocal_100',       label: 'Légende Vocale',  desc: '100 heures en vocal',        icon: '🎤', rarity: 'Épique',     check: (m,s,h) => h >= 100 },
  { id: 'top_100',         label: 'Top 100',         desc: 'Entrer dans le classement',  icon: '🏆', rarity: 'Rare',       check: (m)      => Number(m?.rank) <= 100 },
  { id: 'top_10',          label: 'Élite Nakama',    desc: 'Top 10 du serveur',          icon: '⭐', rarity: 'Légendaire', check: (m)      => Number(m?.rank) <= 10 },
  { id: 'collector',       label: 'Collectionneur',  desc: '5 objets en inventaire',     icon: '🗃', rarity: 'Rare',       check: (m,s)   => (s?.inventory?.length || 0) >= 5 },
  { id: 'shopper',         label: 'Grand Marchand',  desc: '3 achats effectués',         icon: '🛒', rarity: 'Commun',     check: (m,s)   => (s?.transactions?.length || 0) >= 3 },
  { id: 'yonkou',          label: 'Yonkou',          desc: 'Rang Yonkou atteint',        icon: '🌊', rarity: 'Épique',     check: (m,s,h) => h >= 70 },
  { id: 'roi',             label: 'Roi des Pirates', desc: 'Rang maximum atteint',       icon: '👑', rarity: 'Mythique',   check: (m,s,h) => h >= 150 },
]

// ── Utils ────────────────────────────────────────────────────────────────────
export function getRank(hours)    { return RANK_MAP.find(r => hours >= r.min) ?? RANK_MAP[RANK_MAP.length - 1] }
export function getNextRank(rank) { return rank.next != null ? RANK_MAP.find(r => r.min === rank.next) : null }

export function fmtNum(value) { return new Intl.NumberFormat('fr-FR').format(Number(value || 0)) }
export function fmtB(value) {
  const n = Number.parseInt(value || 0, 10)
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}
export function timeAgo(iso) {
  if (!iso) return ''
  const m = Math.floor((Date.now() - new Date(iso)) / 60000)
  if (m < 1)  return "à l'instant"
  if (m < 60) return `il y a ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `il y a ${h} h`
  return `il y a ${Math.floor(h / 24)} j`
}

// Aura Brams — score de prestige 0..100 dérivé des données existantes.
export function computeAura(member, shopData, hours, rank) {
  const vocal   = Math.min(hours / 2, 30)
  const berries = Math.min(parseInt(member?.berrys || 0) / 3_000_000, 25)
  const rankF   = Math.max(0, (RANK_MAP.length - 1 - RANK_MAP.indexOf(rank))) * 6
  const inv     = Math.min((shopData?.inventory?.length || 0) * 0.5, 5)
  const total   = Math.min(Math.round(vocal + berries + rankF + inv), 100)
  return { vocal, berries, rankF, inv, total }
}

export function getAuraTier(score) {
  if (score >= 85) return { label: 'Légende du serveur', color: '#FFD700' }
  if (score >= 70) return { label: 'Profil très actif',  color: '#d4a017' }
  if (score >= 50) return { label: 'Profil actif',       color: '#a88a30' }
  if (score >= 30) return { label: 'Présence modérée',   color: '#7c7f8a' }
  return             { label: 'Début du voyage',          color: '#5a5d6a' }
}
