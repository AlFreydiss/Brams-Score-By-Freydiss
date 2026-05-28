// ── Tokens de design partagés du système social ────────────────────────────
// Dark premium sobre — cohérent avec le reste de Brams Community.
// #08090D bg · #BFA46A / #d4a017 gold · bordures rgba(255,255,255,0.08)
export const T = {
  bg:        '#08090D',
  surface:   'rgba(255,255,255,0.03)',
  surface2:  'rgba(255,255,255,0.05)',
  border:    'rgba(255,255,255,0.08)',
  borderHi:  'rgba(212,160,23,0.30)',
  gold:      '#d4a017',
  goldSoft:  '#BFA46A',
  text:      '#f3f4f6',
  textDim:   'rgba(255,255,255,0.55)',
  textFaint: 'rgba(255,255,255,0.35)',
  green:     '#34d399',
  red:       '#e0524a',
  blue:      '#5b8def',
  radius:    12,
}

export const btn = (variant = 'default') => {
  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
    padding: '9px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700,
    cursor: 'pointer', transition: 'all .15s', border: '1px solid', whiteSpace: 'nowrap',
    fontFamily: 'inherit',
  }
  const variants = {
    default: { background: T.surface2, border: `1px solid ${T.border}`, color: T.text },
    gold:    { background: 'rgba(212,160,23,0.14)', border: `1px solid ${T.borderHi}`, color: T.gold },
    green:   { background: 'rgba(52,211,153,0.10)', border: '1px solid rgba(52,211,153,0.35)', color: T.green },
    red:     { background: 'rgba(224,82,74,0.08)', border: '1px solid rgba(224,82,74,0.35)', color: T.red },
    ghost:   { background: 'transparent', border: `1px solid ${T.border}`, color: T.textDim },
  }
  return { ...base, ...variants[variant] }
}

export const avatar = (size = 40) => ({
  width: size, height: size, borderRadius: '50%', objectFit: 'cover',
  background: 'rgba(255,255,255,0.06)', flexShrink: 0,
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  fontSize: size * 0.4, fontWeight: 800, color: T.goldSoft, overflow: 'hidden',
})
