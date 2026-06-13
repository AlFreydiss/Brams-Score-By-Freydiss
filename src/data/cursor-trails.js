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

  { id: 'trail-corbeau', nom: 'Plumes du Corbeau', rarete: 'COMMUN', emoji: '🪶',
    // Genjutsu d'Itachi : plumes sombres qui tombent en tourbillonnant.
    config: { colors: ['#3a3f55', '#1c1f2e', '#6a7090', '#11131f'], composite: 'source-over', gravity: 0.06, speed: 0.2, drift: 0.8, sizeBase: 2.8, sizeRand: 2.6, decay: 0.026, shadow: 5, alpha: 0.6 } },

  // ── RARE ──
  { id: 'trail-konoha', nom: 'Feuilles de Konoha', rarete: 'RARE', emoji: '🍃',
    // Tourbillon de feuilles vertes façon shunshin de ninja.
    config: { colors: ['#7ad17a', '#3f9d4b', '#bfe8a8', '#1f5e2c'], composite: 'source-over', gravity: 0.03, speed: 0.34, drift: 0.85, sizeBase: 2.5, sizeRand: 2.4, decay: 0.032, shadow: 5, alpha: 0.72 } },
  { id: 'trail-lucioles', nom: "Lucioles d'Esprit", rarete: 'RARE', emoji: '🌿',
    // Forêt de Mononoké : lucioles pâles qui montent lentement, presque irréelles.
    config: { colors: ['#d8ffe8', '#9af2c0', '#f4fff8', '#5fd49a'], gravity: -0.045, speed: 0.18, drift: 0.4, sizeBase: 1.5, sizeRand: 1.8, decay: 0.024, shadow: 10, alpha: 0.85 } },

  { id: 'trail-ember', nom: 'Mera Mera', rarete: 'RARE', emoji: '🔥',
    config: { colors: ['#ffd24a', '#ff7a18', '#ff3b1f', '#ffae3b'], gravity: -0.06, speed: 0.5, sizeBase: 1.8, sizeRand: 2.4, decay: 0.052, shadow: 10 } },
  { id: 'trail-aqua', nom: 'Vague Azur', rarete: 'RARE', emoji: '🌊',
    config: { colors: ['#39c7ff', '#5ad7ff', '#bfffff', '#1f8fff'], speed: 0.42, drift: 0.3, decay: 0.04, shadow: 9 } },

  // ── ÉPIQUE ──
  { id: 'trail-haki', nom: 'Haki des Rois', rarete: 'EPIQUE', emoji: '⚡',
    config: { colors: ['#b06cff', '#7a2dff', '#d8b4ff', '#3b1f6e'], speed: 0.6, sizeBase: 1.6, sizeRand: 2.2, decay: 0.06, shadow: 12 } },
  { id: 'trail-sakura', nom: 'Pétales de Sakura', rarete: 'EPIQUE', emoji: '🌸',
    config: { colors: ['#ffd3e6', '#ff9ec4', '#ffc1dd', '#ff7fb3'], composite: 'source-over', gravity: 0.05, speed: 0.28, drift: 0.45, sizeBase: 2.4, sizeRand: 2.2, decay: 0.03, shadow: 4, alpha: 0.7 } },

  { id: 'trail-domaine', nom: 'Énergie Occulte', rarete: 'EPIQUE', emoji: '🩸',
    // Extension du domaine : énergie maudite cramoisie striée de noir.
    config: { colors: ['#ff2e63', '#8a0f2e', '#2b0610', '#ff7a9e'], speed: 0.66, drift: 0.3, sizeBase: 1.7, sizeRand: 2.3, decay: 0.058, shadow: 14, alpha: 0.92 } },
  { id: 'trail-getsuga', nom: 'Croissant Noir', rarete: 'EPIQUE', emoji: '🌙',
    // Getsuga : lame d'énergie noire ourlée de rouge qui fend l'écran.
    config: { colors: ['#d22b4a', '#5a0f1f', '#ff4d6d', '#15060c'], speed: 0.78, drift: 0.18, gravity: -0.02, sizeBase: 1.5, sizeRand: 2.0, decay: 0.07, shadow: 13, alpha: 0.95 } },

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
  { id: 'trail-soleil', nom: 'Tambours de la Libération', rarete: 'INTERDIT', emoji: '☀️',
    // Gear 5 : éclats blanc-chauds, cartoon, qui pulsent comme un rire.
    config: { colors: ['#ffffff', '#ffe9b0', '#ffd24a', '#fff7e6'], gravity: -0.04, speed: 0.5, drift: 0.55, sizeBase: 2.6, sizeRand: 3.0, decay: 0.045, shadow: 18, alpha: 0.96 } },

  // ════ BRAMS · Grand Line (DA or champagne / braise-corail / sarcelle) ════
  { id: 'trail-embruns', nom: 'Embruns Salés', rarete: 'COMMUN', emoji: '💧',
    // Gouttes d'eau de mer qui retombent — fines, fraîches, source-over.
    config: { colors: ['#cfeeff', '#9cc8f0', '#eaf7ff', '#7fb6e6'], composite: 'source-over', gravity: 0.12, speed: 0.3, drift: 0.5, sizeBase: 1.6, sizeRand: 2.0, decay: 0.04, shadow: 3, alpha: 0.6 } },
  { id: 'trail-phare', nom: 'Brume du Phare', rarete: 'COMMUN', emoji: '🕯️',
    // Halo ambré doux et brumeux qui s'étale — chaleureux, lent.
    config: { colors: ['#ffe9bf', '#f3d27a', '#fff4dd', '#e0b25e'], composite: 'source-over', gravity: -0.02, speed: 0.18, drift: 0.4, sizeBase: 3.0, sizeRand: 3.2, decay: 0.026, shadow: 7, alpha: 0.4 } },

  { id: 'trail-galion', nom: 'Sillage du Galion', rarete: 'RARE', emoji: '⛵',
    // Écume dorée du sillage — éclats champagne projetés vers le bas.
    config: { colors: ['#f6d98a', '#d4a017', '#fff3cf', '#bfa46a'], gravity: 0.06, speed: 0.46, drift: 0.6, sizeBase: 1.6, sizeRand: 2.2, decay: 0.046, shadow: 10, alpha: 0.9 } },
  { id: 'trail-sarcelle', nom: 'Lueur Sarcelle', rarete: 'RARE', emoji: '🪸',
    // Bioluminescence des abysses : particules sarcelle qui montent doucement.
    config: { colors: ['#5fe6d4', '#1f8f86', '#bafff5', '#39c7b8'], gravity: -0.05, speed: 0.2, drift: 0.4, sizeBase: 1.5, sizeRand: 1.9, decay: 0.026, shadow: 13, alpha: 0.85 } },
  { id: 'trail-soufre', nom: 'Cendres de Soufre', rarete: 'RARE', emoji: '🌋',
    // Archipel volcanique : cendres sombres + braises qui retombent.
    config: { colors: ['#ff7a3d', '#7a2410', '#ffae3b', '#2a1410'], composite: 'source-over', gravity: 0.09, speed: 0.36, drift: 0.7, sizeBase: 2.2, sizeRand: 2.4, decay: 0.03, shadow: 6, alpha: 0.66 } },

  { id: 'trail-corail', nom: 'Braises de Corail', rarete: 'EPIQUE', emoji: '🪼',
    // Braise-corail signature Brams : tisons chauds qui s'élèvent en glow.
    config: { colors: ['#ff8a5c', '#ff4d3d', '#ffd2a0', '#c9341f'], gravity: -0.06, speed: 0.5, drift: 0.3, sizeBase: 1.7, sizeRand: 2.3, decay: 0.05, shadow: 13, alpha: 0.92 } },
  { id: 'trail-abysse', nom: 'Or des Abysses', rarete: 'EPIQUE', emoji: '🪙',
    // Trésor englouti : pièces d'or qui scintillent et coulent lentement.
    config: { colors: ['#ffe066', '#d4a017', '#fffaf0', '#9a7b1e'], gravity: 0.04, speed: 0.3, drift: 0.45, sizeBase: 1.4, sizeRand: 2.2, decay: 0.034, shadow: 12, alpha: 0.9 } },

  { id: 'trail-maelstrom', nom: 'Maelström Doré', rarete: 'MYTHIQUE', emoji: '🌀',
    // Tourbillon : éclats d'or rapides à fort drift, comme aspirés en spirale.
    config: { colors: ['#ffe9a8', '#d4a017', '#ffffff', '#c98a2a'], speed: 0.85, drift: 0.9, gravity: 0, sizeBase: 1.3, sizeRand: 1.8, decay: 0.06, shadow: 13, alpha: 0.95 } },
  { id: 'trail-constellation', nom: 'Constellation de Navigation', rarete: 'MYTHIQUE', emoji: '✦',
    // Carte du ciel : points d'or fins et lents qui scintillent (peu de drift).
    config: { colors: ['#fff7d6', '#ffe066', '#bfd9ff', '#ffffff'], gravity: 0, speed: 0.14, drift: 0.18, sizeBase: 1.0, sizeRand: 1.4, decay: 0.02, shadow: 14, alpha: 0.95 } },
]

export function findTrail(id) { return TRAILS.find(t => t.id === id) || null }
export function trailSkin(id) {
  const t = findTrail(id)
  return t ? { ...TRAIL_DEFAULTS, ...t.config } : null
}
