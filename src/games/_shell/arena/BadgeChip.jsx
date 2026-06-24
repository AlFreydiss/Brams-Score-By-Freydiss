// ── BadgeChip : puce de badge sobre (inline styles, tokens neutralTheme) ─────
// Affiche un badge à côté du pseudo dans les classements. Couleur dérivée du
// palier (or/argent/bronze ← accent laiton). Glyph décoratif (aria-hidden) ;
// le libellé reste accessible via title + aria-label. Reduced-motion-safe :
// aucune animation. Variante `compact` = glyph seul (gain de place en tableau).
import { fonts } from '../../../features/games/neutralTheme.js'
import { badgeDef, paletteTier } from './badges.js'

export default function BadgeChip({ badgeId, compact = false }) {
  const def = badgeDef(badgeId)
  const pal = paletteTier(def.tier)
  const titre = def.description ? `${def.label} — ${def.description}` : def.label

  if (compact) {
    return (
      <span
        role="img"
        aria-label={def.label}
        title={titre}
        style={{
          display: 'inline-grid', placeItems: 'center', width: 18, height: 18,
          borderRadius: 5, flexShrink: 0,
          background: pal.fond, border: `1px solid ${pal.bord}`,
          color: pal.teinte, font: `700 11px ${fonts.body}`, lineHeight: 1,
        }}
      >
        <span aria-hidden>{def.glyph}</span>
      </span>
    )
  }

  return (
    <span
      title={titre}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '2px 8px 2px 6px', borderRadius: 999, flexShrink: 0,
        background: pal.fond, border: `1px solid ${pal.bord}`,
        color: pal.teinte, font: `700 10.5px ${fonts.body}`,
        letterSpacing: '.2px', whiteSpace: 'nowrap',
      }}
    >
      <span aria-hidden style={{ fontSize: 11, lineHeight: 1 }}>{def.glyph}</span>
      {def.label}
    </span>
  )
}
