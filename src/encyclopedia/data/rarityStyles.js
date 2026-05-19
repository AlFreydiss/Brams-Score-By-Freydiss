export const rarityLabels = {
  common: 'Commun',
  rare: 'Rare',
  epic: 'Epique',
  legendary: 'Legendaire',
  mythic: 'Mythique',
  secret: 'Secret',
  forbidden: 'Interdit',
}

export const rarityConfig = {
  common:    { accent:'#a8b0bd', glow:'rgba(168,176,189,0.22)', gradient:'linear-gradient(135deg,#8c939e,#a8b0bd)', icon:'·',  chance:50  },
  rare:      { accent:'#4ea8ff', glow:'rgba(78,168,255,0.30)',  gradient:'linear-gradient(135deg,#1d7fe8,#4ea8ff)', icon:'◇',  chance:25  },
  epic:      { accent:'#a855f7', glow:'rgba(168,85,247,0.32)',  gradient:'linear-gradient(135deg,#7e22ce,#a855f7)', icon:'◆',  chance:15  },
  legendary: { accent:'#f8c14a', glow:'rgba(248,193,74,0.38)', gradient:'linear-gradient(135deg,#d97706,#f8c14a)', icon:'★',  chance:7   },
  mythic:    { accent:'#d8a7ff', glow:'rgba(216,167,255,0.36)',gradient:'linear-gradient(135deg,#9d4edd,#d8a7ff)', icon:'✦',  chance:2   },
  secret:    { accent:'#c94bff', glow:'rgba(201,75,255,0.38)', gradient:'linear-gradient(135deg,#7c3aed,#c94bff)', icon:'👁', chance:0.8 },
  forbidden: { accent:'#ff3d4d', glow:'rgba(255,61,77,0.40)',  gradient:'linear-gradient(135deg,#b91c1c,#ff3d4d)', icon:'⛔', chance:0.2 },
}

export const rarityStyles = Object.fromEntries(
  Object.entries(rarityConfig).map(([k, v]) => [k, { accent: v.accent, chance: v.chance }])
)
