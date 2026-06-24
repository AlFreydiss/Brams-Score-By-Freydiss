// ─────────────────────────────────────────────────────────────────────────────
// arenaTokens — extension de neutralTheme pour les ARÈNES plein écran.
// Aucune nouvelle teinte : on dérive tout de l'accent or `ui.accent` (#c8a45c)
// et des neutres existants. Rails verre dépoli, glows sobres, gradients de lumière.
// Le "wow" vient du verre + lumière + mouvement, JAMAIS d'une couleur en plus.
// ─────────────────────────────────────────────────────────────────────────────
import { ui } from '../../../features/games/neutralTheme.js'

// Verre dépoli des rails flottants (gauche = infos, droite = coups).
export const glass = {
  bg:      'rgba(18,20,25,0.62)',           // bgElev translucide
  bgSolid: 'rgba(18,20,25,0.92)',           // fallback sans backdrop-filter
  border:  'rgba(255,255,255,0.10)',
  borderHi:'rgba(255,255,255,0.16)',
  blur:    'saturate(140%) blur(18px)',
  shadow:  '0 24px 70px -28px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.05)',
  radius:  20,
}

// Lumière d'ambiance de l'arène : vignette + halo qui bascule selon le trait.
// `warm` = camp clair actif (halo chaud or), `cool` = camp sombre (halo froid neutre).
export const light = {
  vignette: 'radial-gradient(120% 90% at 50% 32%, transparent 38%, rgba(0,0,0,0.55) 100%)',
  warm:     'radial-gradient(60% 50% at 50% 60%, rgba(200,164,92,0.10), transparent 70%)',
  cool:     'radial-gradient(60% 50% at 50% 40%, rgba(120,150,190,0.07), transparent 70%)',
  floor:    `linear-gradient(180deg, ${ui.bg} 0%, #0a0b0e 100%)`,
}

// Glows d'événements (échec, promotion, capture) — dérivés des marks existants.
export const glow = {
  echec:     '0 0 0 2px rgba(212,104,90,0.55), 0 0 32px 4px rgba(212,104,90,0.35)',
  promotion: '0 0 0 2px rgba(200,164,92,0.65), 0 0 40px 6px rgba(200,164,92,0.40)',
  win:       '0 0 60px 10px rgba(200,164,92,0.30)',
  accentRim: `0 0 0 1px ${ui.accent}, 0 0 24px -2px rgba(200,164,92,0.45)`,
}

// Anneau d'un rail flottant (réutilisable left/right).
export function railStyle({ side = 'left' } = {}) {
  return {
    background: glass.bg,
    backdropFilter: glass.blur,
    WebkitBackdropFilter: glass.blur,
    border: `1px solid ${glass.border}`,
    borderRadius: glass.radius,
    boxShadow: glass.shadow,
    padding: 14,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    minHeight: 0,
  }
}

// Particules de capture : couleur unique or, taille/vélocité bornées (perf mobile).
export const particles = {
  color:    'rgba(200,164,92,0.9)',
  colorDim: 'rgba(200,164,92,0.45)',
  count:    14,     // plafond par capture (perf)
  countLow: 6,      // reduced-motion / mobile
  life:     520,    // ms
  size:     [1.5, 3.5],
}

// Durées de juice (centralisées pour cohérence + override reduced-motion → 0).
export const timing = {
  lift: 120, drop: 180, snap: 90, shake: 240, pulse: 460, halo: 620,
}
