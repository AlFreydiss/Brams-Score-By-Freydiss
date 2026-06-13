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
// Densité calibrée : le sprite HQ (cœur lumineux + gros halo) porte le rendu, donc
// MOINS de particules suffisent pour un trait riche → moins de drawImage/frame.
export const TRAIL_DEFAULTS = {
  maxParts: 420, maxEmit: 13, emitDivisor: 5.6, minDist: 3.4, dpr: 1.75,
  speed: 0.32, drift: 0.19, gravity: 0.02, sizeBase: 1.45, sizeRand: 1.9,
  decay: 0.045, shadow: 7, alpha: 0.85, composite: 'lighter', hueCycle: 0, twinkle: 0,
}

export const TRAILS = [
  // ════ LÉGENDE — pièce maîtresse, prix fixe 9,99 € (mode orbit exclusif) ════
  { id: 'trail-galaxie', nom: 'Galaxie de Freydiss', rarete: 'INTERDIT', emoji: '🌌',
    nouveaute: true, legend: true, priceCents: 999,
    // Mode galaxie : chaque étincelle SPIRALE autour du curseur en arc-en-ciel
    // scintillant qui s'ouvre — rien à voir avec les traînées linéaires.
    config: {
      orbit: 0.17, orbitExpand: 0.55, hueCycle: 6, twinkle: 1, colors: ['#ffffff'],
      speed: 0.1, drift: 0.22, gravity: -0.01,
      sizeBase: 1.3, sizeRand: 2.2, decay: 0.016, shadow: 17, alpha: 0.96,
      maxParts: 460, maxEmit: 11, emitDivisor: 4.2, minDist: 2.2,
    } },

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
    config: { colors: ['#fff7d6', '#ffe066', '#bfd9ff', '#ffffff'], gravity: 0, speed: 0.14, drift: 0.18, sizeBase: 1.0, sizeRand: 1.4, decay: 0.02, shadow: 14, alpha: 0.95, twinkle: 1 } },

  // ════ NOUVEAUTÉS — pack premium (moteur HQ : cœur lumineux + halo doux) ════
  { id: 'trail-neige', nom: 'Première Neige', rarete: 'COMMUN', emoji: '❄️', nouveaute: true,
    config: { colors: ['#ffffff', '#eaf4ff', '#cfe4ff', '#f7fbff'], composite: 'source-over', gravity: 0.05, speed: 0.16, drift: 0.55, sizeBase: 2.0, sizeRand: 2.4, decay: 0.022, shadow: 5, alpha: 0.55 } },
  { id: 'trail-bourrasque', nom: 'Bourrasque', rarete: 'COMMUN', emoji: '🌬️', nouveaute: true,
    config: { colors: ['#eaf2f7', '#c6d6e0', '#ffffff', '#aebfcc'], composite: 'source-over', gravity: 0, speed: 0.9, drift: 0.2, sizeBase: 1.3, sizeRand: 1.6, decay: 0.05, shadow: 4, alpha: 0.5 } },

  { id: 'trail-givre', nom: 'Givre Polaire', rarete: 'RARE', emoji: '🧊', nouveaute: true,
    config: { colors: ['#bfefff', '#7fd4ff', '#ffffff', '#4fb6e6'], speed: 0.36, drift: 0.35, gravity: 0.02, sizeBase: 1.3, sizeRand: 1.8, decay: 0.04, shadow: 12, alpha: 0.9 } },
  { id: 'trail-toxic', nom: 'Brume Toxique', rarete: 'RARE', emoji: '☠️', nouveaute: true,
    config: { colors: ['#9bff6a', '#3fae2e', '#c8a6ff', '#1f6e12'], composite: 'source-over', gravity: -0.02, speed: 0.26, drift: 0.55, sizeBase: 2.4, sizeRand: 2.6, decay: 0.03, shadow: 9, alpha: 0.55 } },
  { id: 'trail-or-rose', nom: 'Or Rose', rarete: 'RARE', emoji: '🌹', nouveaute: true,
    config: { colors: ['#ffd9c2', '#ff9eb0', '#ffe7a8', '#f4b6c0'], speed: 0.34, drift: 0.4, gravity: 0.01, sizeBase: 1.3, sizeRand: 1.9, decay: 0.04, shadow: 12, alpha: 0.92, twinkle: 1 } },
  { id: 'trail-onyx', nom: "Éclats d'Onyx", rarete: 'RARE', emoji: '⬛', nouveaute: true,
    config: { colors: ['#d4a017', '#1a1a22', '#f6d98a', '#0c0c12'], speed: 0.46, drift: 0.3, gravity: 0.03, sizeBase: 1.4, sizeRand: 2.0, decay: 0.05, shadow: 10, alpha: 0.9 } },

  { id: 'trail-celeste', nom: 'Foudre Céleste', rarete: 'EPIQUE', emoji: '⚡', nouveaute: true,
    config: { colors: ['#ffffff', '#ffe98a', '#fff4cf', '#ffd24a'], speed: 0.85, drift: 0.2, gravity: 0, sizeBase: 1.3, sizeRand: 1.7, decay: 0.07, shadow: 15, alpha: 0.97 } },
  { id: 'trail-ecarlate', nom: 'Lame Écarlate', rarete: 'EPIQUE', emoji: '🩸', nouveaute: true,
    config: { colors: ['#ff3b3b', '#8a0f1a', '#ff8a8a', '#23060a'], speed: 0.8, drift: 0.16, gravity: -0.02, sizeBase: 1.5, sizeRand: 2.0, decay: 0.072, shadow: 13, alpha: 0.95 } },
  { id: 'trail-emeraude-feu', nom: "Flammes d'Émeraude", rarete: 'EPIQUE', emoji: '💚', nouveaute: true,
    config: { colors: ['#aaffc0', '#2fc46a', '#e6fff0', '#127a3e'], gravity: -0.06, speed: 0.5, drift: 0.3, sizeBase: 1.7, sizeRand: 2.3, decay: 0.05, shadow: 14, alpha: 0.93 } },
  { id: 'trail-lave', nom: 'Coulée de Lave', rarete: 'EPIQUE', emoji: '🌋', nouveaute: true,
    config: { colors: ['#ffd24a', '#ff6a1f', '#ff3b0f', '#7a1e08'], gravity: 0.1, speed: 0.34, drift: 0.4, sizeBase: 2.2, sizeRand: 2.6, decay: 0.034, shadow: 14, alpha: 0.95 } },

  { id: 'trail-nebuleuse', nom: 'Nébuleuse', rarete: 'MYTHIQUE', emoji: '🌌', nouveaute: true,
    config: { colors: ['#b06cff', '#ff6ec7', '#6cb8ff', '#fff0ff'], speed: 0.3, drift: 0.5, gravity: 0, sizeBase: 1.8, sizeRand: 2.8, decay: 0.03, shadow: 16, alpha: 0.9, twinkle: 1 } },
  { id: 'trail-aurore', nom: 'Aurore Boréale', rarete: 'MYTHIQUE', emoji: '🌠', nouveaute: true,
    config: { colors: ['#5fffc4', '#5ad1ff', '#b06cff', '#d9ffe9'], gravity: -0.04, speed: 0.3, drift: 0.6, sizeBase: 2.0, sizeRand: 3.0, decay: 0.026, shadow: 18, alpha: 0.9 } },
  { id: 'trail-supernova', nom: 'Supernova', rarete: 'MYTHIQUE', emoji: '💥', nouveaute: true,
    config: { colors: ['#ffffff', '#ffe9a8', '#ffd24a', '#ff8a3d'], speed: 1.0, drift: 0.5, gravity: 0, sizeBase: 1.6, sizeRand: 2.6, decay: 0.06, shadow: 18, alpha: 0.98 } },

  { id: 'trail-spectre', nom: 'Flamme Spectrale', rarete: 'INTERDIT', emoji: '🔥', nouveaute: true,
    config: { colors: ['#bafff5', '#5fe6d4', '#ffffff', '#2f9f9f'], gravity: -0.08, speed: 0.6, drift: 0.35, sizeBase: 1.8, sizeRand: 2.6, decay: 0.05, shadow: 18, alpha: 0.96 } },
  { id: 'trail-cosmos', nom: 'Poussière Cosmique', rarete: 'INTERDIT', emoji: '✨', nouveaute: true,
    config: { colors: ['#fff3c0', '#9ec5ff', '#ffffff', '#d4a017'], gravity: 0, speed: 0.22, drift: 0.45, sizeBase: 1.1, sizeRand: 1.8, decay: 0.022, shadow: 16, alpha: 0.96, twinkle: 1 } },
]

export function findTrail(id) { return TRAILS.find(t => t.id === id) || null }
export function trailSkin(id) {
  const t = findTrail(id)
  return t ? { ...TRAIL_DEFAULTS, ...t.config } : null
}
