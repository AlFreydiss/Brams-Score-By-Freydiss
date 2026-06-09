// ─────────────────────────────────────────────────────────────────────────────
// Catalogue des TRAÎNÉES de curseur (skins de particules qui suivent la souris).
// Chaque traînée = une config passée au moteur <CursorTrail skin={config}/>.
// Achat en € via Stripe (même infra que les curseurs : resolvePaidItem côté
// api/bot-tools.js). reward_type: 'cursor_trail'. Une seule équipée à la fois.
// ─────────────────────────────────────────────────────────────────────────────

// Prix € (centimes) par rareté — DOIT matcher TRAIL_PRICE_CENTS dans api/bot-tools.js.
export const TRAIL_PRICE_CENTS = { COMMUN: 50, RARE: 79, EPIQUE: 119, MYTHIQUE: 159, INTERDIT: 200 }

// Réglages moteur par défaut (repris de l'ancien CursorTrail or). Chaque skin
// surcharge ce qu'il veut. composite 'lighter' = glow additif ; 'source-over' = solide.
export const TRAIL_DEFAULTS = {
  maxParts: 420, maxEmit: 14, emitDivisor: 5.5, minDist: 3.5, dpr: 1.35,
  speed: 0.32, drift: 0.19, gravity: 0.02, sizeBase: 1.35, sizeRand: 1.8,
  decay: 0.048, shadow: 6, alpha: 0.82, composite: 'lighter', hueCycle: 0,
}

export const TRAILS = [
  // ── COMMUN ──
  { id: 'trail-gold', nom: 'Poussière d\'Or', rarete: 'COMMUN', emoji: '✨',
    config: { colors: ['#e8c878', '#d4a017', '#bfa46a', '#f6d98a'] } },
  { id: 'trail-bubble', nom: 'Bulles de Saké', rarete: 'COMMUN', emoji: '🫧',
    config: { colors: ['#bfe3ff', '#9cc8f0', '#e6f4ff'], composite: 'source-over', gravity: -0.03, alpha: 0.5, sizeBase: 2.2, sizeRand: 2.6, decay: 0.035, shadow: 3 } },

  // ── RARE ──
  { id: 'trail-ember', nom: 'Mera Mera', rarete: 'RARE', emoji: '🔥',
    config: { colors: ['#ffd24a', '#ff7a18', '#ff3b1f', '#ffae3b'], gravity: -0.06, speed: 0.5, sizeBase: 1.8, sizeRand: 2.4, decay: 0.052, shadow: 10 } },
  { id: 'trail-aqua', nom: 'Vague Azur', rarete: 'RARE', emoji: '🌊',
    config: { colors: ['#39c7ff', '#5ad7ff', '#bfffff', '#1f8fff'], speed: 0.42, drift: 0.3, decay: 0.04, shadow: 9 } },

  // ── ÉPIQUE ──
  { id: 'trail-haki', nom: 'Haki des Rois', rarete: 'EPIQUE', emoji: '⚡',
    config: { colors: ['#b06cff', '#7a2dff', '#d8b4ff', '#3b1f6e'], speed: 0.6, sizeBase: 1.6, sizeRand: 2.2, decay: 0.06, shadow: 12 } },
  { id: 'trail-sakura', nom: 'Pétales de Sakura', rarete: 'EPIQUE', emoji: '🌸',
    config: { colors: ['#ffd3e6', '#ff9ec4', '#ffc1dd', '#ff7fb3'], composite: 'source-over', gravity: 0.05, speed: 0.28, drift: 0.45, sizeBase: 2.4, sizeRand: 2.2, decay: 0.03, shadow: 4, alpha: 0.7 } },

  // ── MYTHIQUE ──
  { id: 'trail-rainbow', nom: 'Prisme', rarete: 'MYTHIQUE', emoji: '🌈',
    config: { colors: ['#ff4d4d'], hueCycle: 2.2, speed: 0.5, sizeBase: 1.8, sizeRand: 2.4, decay: 0.05, shadow: 11 } },
  { id: 'trail-thunder', nom: 'Goro Goro', rarete: 'MYTHIQUE', emoji: '🌩️',
    config: { colors: ['#fff7a8', '#ffe23b', '#fffbe0', '#bda400'], speed: 0.8, sizeBase: 1.4, sizeRand: 1.6, decay: 0.08, shadow: 14, alpha: 0.95 } },

  // ── MYTHIQUE (suite) ──
  { id: 'trail-cloud', nom: 'Nuage Magique', rarete: 'MYTHIQUE', emoji: '☁️',
    // Kinto'un : gros flocons blancs/dorés qui flottent doucement vers le haut.
    config: { colors: ['#fffdf3', '#fff0c2', '#ffe49a', '#f7f7ff'], composite: 'source-over', gravity: -0.05, speed: 0.22, drift: 0.5, sizeBase: 3.2, sizeRand: 3.4, decay: 0.022, shadow: 8, alpha: 0.42 } },
  { id: 'trail-star', nom: 'Poussière d\'Étoiles', rarete: 'MYTHIQUE', emoji: '⭐',
    config: { colors: ['#fff7c2', '#ffe066', '#fffefb', '#bfa46a'], gravity: 0.01, speed: 0.4, drift: 0.6, sizeBase: 1.2, sizeRand: 2.0, decay: 0.045, shadow: 12, alpha: 0.9 } },

  // ── INTERDIT ──
  { id: 'trail-void', nom: 'Œil du Néant', rarete: 'INTERDIT', emoji: '👁️',
    config: { colors: ['#c0392b', '#7a0f12', '#ff5a4d', '#2a0608'], speed: 0.4, gravity: 0, drift: 0.4, sizeBase: 2.0, sizeRand: 2.8, decay: 0.04, shadow: 16, alpha: 0.9 } },
  { id: 'trail-dragon', nom: 'Aura de Combat', rarete: 'INTERDIT', emoji: '🐉',
    // Aura Dragon Ball : flammes bleu-blanc électriques qui montent.
    config: { colors: ['#bfe9ff', '#5ad1ff', '#ffffff', '#2f8fff'], gravity: -0.08, speed: 0.7, drift: 0.25, sizeBase: 1.8, sizeRand: 2.6, decay: 0.055, shadow: 16, alpha: 0.95 } },
]

export function findTrail(id) { return TRAILS.find(t => t.id === id) || null }
export function trailSkin(id) {
  const t = findTrail(id)
  return t ? { ...TRAIL_DEFAULTS, ...t.config } : null
}
