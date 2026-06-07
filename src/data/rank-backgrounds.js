// ── Fonds de profil premium selon le rang ───────────────────────────────────
// Images générées (Flux 2 Pro) et servies depuis R2. Chaque rang a un décor qui
// monte en intensité (Pirate → Roi des Pirates). 'Moussaillon' n'a volontairement
// pas de fond : le décor se DÉBLOQUE en atteignant le rang Pirate (gamification).
const R2 = 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/ranks'

export const RANK_BACKGROUNDS = {
  'Pirate':          `${R2}/pirate_bg.png`,
  'Shichibukai':     `${R2}/shichibukai_bg.png`,
  'Amiral':          `${R2}/amiral_bg.png`,
  'Yonkou':          `${R2}/yonkou_bg.png`,
  'Roi des Pirates': `${R2}/roi_des_pirates_bg.png`,
}

export function getRankBg(rang) {
  return rang ? (RANK_BACKGROUNDS[rang] || null) : null
}
