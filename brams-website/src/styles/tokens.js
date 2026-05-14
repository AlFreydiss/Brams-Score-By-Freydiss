// Design tokens centralisés — Brams Community
// Importer ce fichier partout à la place des valeurs hardcodées

export const colors = {
  bg:       '#111214',
  surface:  '#18191c',
  card:     '#1e2024',
  card2:    '#242629',
  border:   'rgba(255,255,255,0.06)',
  borderHover: 'rgba(255,255,255,0.12)',
  accent:   '#e0524a',
  accentHover: '#ea6a62',
  gold:     '#ffd700',
  purple:   '#9b59b6',
  teal:     '#00cec9',
  blue:     '#74b9ff',
  text:     '#e8e9ea',
  muted:    '#7c7f8a',
  success:  '#34d399',
  twitch:   '#9147ff',
  youtube:  '#ff0000',
  discord:  '#5865f2',
  overlay:  'rgba(14,14,16,0.80)',
}

export const fonts = {
  body:    "'Inter', sans-serif",
  display: "'Syne', sans-serif",
  pirate:  "'OnePiece', 'Pirata One', cursive",
}

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
}

export const space = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
  section: 110,
}

export const fontSizes = {
  xs:   11,
  sm:   13,
  md:   15,
  lg:   18,
  xl:   24,
  '2xl': 32,
  '3xl': 48,
}

export const shadows = {
  card:   '0 4px 24px rgba(0,0,0,0.3)',
  cardHover: '0 12px 40px rgba(0,0,0,0.4)',
  accent: '0 4px 24px rgba(224,82,74,0.3)',
  accentLg: '0 6px 32px rgba(224,82,74,0.5)',
  gold:   '0 0 30px rgba(255,215,0,0.3)',
  glow: (color, spread = 20) => `0 0 ${spread}px ${color}`,
}

export const transitions = {
  fast:   'all 0.15s ease',
  normal: 'all 0.25s ease',
  slow:   'all 0.4s ease',
  spring: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)',
}

// ── Style factories ────────────────────────────────────────────────

export const cardStyle = (hovered = false, extra = {}) => ({
  background: colors.card,
  border: `1px solid ${hovered ? colors.borderHover : colors.border}`,
  borderRadius: radius.lg,
  transition: transitions.normal,
  transform: hovered ? 'translateY(-3px)' : 'none',
  boxShadow: hovered ? shadows.cardHover : shadows.card,
  ...extra,
})

export const btnPrimary = (hovered = false) => ({
  display: 'inline-flex', alignItems: 'center', gap: space.sm,
  padding: '13px 26px', borderRadius: radius.md,
  background: colors.accent, color: '#fff', border: 'none',
  fontFamily: fonts.body, fontSize: fontSizes.md, fontWeight: 600,
  cursor: 'pointer',
  boxShadow: hovered ? shadows.accentLg : shadows.accent,
  transform: hovered ? 'translateY(-2px)' : 'none',
  transition: transitions.normal,
})

export const btnGhost = (hovered = false) => ({
  display: 'inline-flex', alignItems: 'center', gap: space.sm,
  padding: '13px 26px', borderRadius: radius.md,
  background: hovered ? colors.card : 'transparent',
  color: colors.text, border: `1px solid ${hovered ? colors.borderHover : colors.border}`,
  fontFamily: fonts.body, fontSize: fontSizes.md, fontWeight: 600,
  cursor: 'pointer', transition: transitions.normal,
  transform: hovered ? 'translateY(-2px)' : 'none',
})

export const labelStyle = {
  fontFamily: fonts.display, fontSize: fontSizes.xs, fontWeight: 700,
  letterSpacing: '0.15em', textTransform: 'uppercase', color: colors.accent,
  marginBottom: space.sm,
}

export const h2Style = {
  fontFamily: fonts.display, fontSize: 'clamp(30px,4vw,46px)',
  fontWeight: 800, color: '#fff', lineHeight: 1.1,
  marginBottom: space.md, letterSpacing: '-0.02em',
}

export const inputStyle = (focused = false) => ({
  width: '100%', padding: '13px 16px', borderRadius: radius.md,
  background: 'rgba(255,255,255,0.04)',
  border: `1px solid ${focused ? colors.accent : colors.border}`,
  color: colors.text, fontSize: fontSizes.md,
  fontFamily: fonts.body, outline: 'none',
  transition: transitions.fast,
})
