// ── Pendule d'échecs : décompte mm:ss (+ dixièmes < 10 s) + drapeau ─────────
import { THEME, SEUIL_TEMPS_CRITIQUE } from '../constants.js'

export function formatTemps(ms) {
  const v = Math.max(0, ms | 0)
  const totalSec = Math.floor(v / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  if (v < SEUIL_TEMPS_CRITIQUE) {
    const dixiemes = Math.floor((v % 1000) / 100)
    return `${sec}.${dixiemes}`
  }
  return `${min}:${String(sec).padStart(2, '0')}`
}

export default function Horloge({ ms, actif, visible = true }) {
  if (!visible) return null
  const critique = ms < SEUIL_TEMPS_CRITIQUE
  const tombe = ms <= 0
  return (
    <div style={{
      minWidth: 86, padding: '8px 14px', borderRadius: 10, textAlign: 'center',
      fontFamily: THEME.fontDisplay, fontWeight: 700, fontSize: 22, letterSpacing: '0.04em',
      fontVariantNumeric: 'tabular-nums',
      color: tombe ? '#fff' : critique ? THEME.accent : actif ? THEME.text : THEME.muted,
      background: tombe ? THEME.accent : actif ? 'rgba(255,215,0,0.10)' : 'rgba(255,255,255,0.04)',
      border: `1px solid ${actif ? 'rgba(255,215,0,0.35)' : THEME.cardBorder}`,
      boxShadow: actif && critique ? `0 0 18px -4px ${THEME.accent}` : 'none',
      transition: 'background .2s, color .2s, border-color .2s',
    }}>
      {tombe ? '🏳 0.0' : formatTemps(ms)}
    </div>
  )
}
