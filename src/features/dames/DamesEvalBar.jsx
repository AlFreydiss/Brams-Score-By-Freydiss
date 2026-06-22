// ─────────────────────────────────────────────────────────────────────────────
// DamesEvalBar — barre d'évaluation verticale, NEUTRE premium (façon moteur d'échecs).
// Reçoit un score en "centipions" du point de vue de Foncé (P) = positif.
// Le remplissage clair (ivoire) monte = avantage Foncé ; le foncé au-dessus = Clair.
// Styles inline only. Tokens = neutralTheme (source unique). Aucune dépendance.
// ─────────────────────────────────────────────────────────────────────────────
import { ui, fonts, damesPieces } from '../games/neutralTheme.js'

const IVORY = damesPieces.clair.haut, GRAPHITE = damesPieces.fonce.base

// score (centipions, POV Foncé) → fraction d'avantage Foncé dans [0,1] (sigmoïde douce).
function toFill(score) {
  if (score == null) return 0.5
  if (score >= 90000) return 1
  if (score <= -90000) return 0
  return 1 / (1 + Math.exp(-score / 350))
}

// Libellé compact : "+1.8", "M" (mat/gagné), "=" (nulle).
function label(ev) {
  if (!ev) return '0.0'
  if (ev.draw) return '='
  if (ev.mate || Math.abs(ev.score) >= 90000) return ev.score > 0 ? 'M' : '-M'
  const v = ev.score / 100
  return (v >= 0 ? '+' : '') + v.toFixed(1)
}

export default function DamesEvalBar({ ev, height = 'min(74vh, 720px)' }) {
  const score = ev && typeof ev.score === 'number' ? ev.score : 0
  const fill = toFill(ev ? score : null)          // part Foncé (bas = clair/ivoire monte)
  const foncAhead = score >= 0
  const txt = label(ev)

  return (
    <div aria-label="Barre d'évaluation" role="img"
      style={{ position: 'relative', width: 22, minWidth: 22, height, borderRadius: 11, overflow: 'hidden',
        background: GRAPHITE, border: `1px solid ${ui.lineHi}`, boxShadow: 'inset 0 0 14px rgba(0,0,0,.6)',
        display: 'flex', flexDirection: 'column-reverse' }}>
      {/* part Foncé : barre ivoire en bas, le reste (graphite) au-dessus */}
      <div style={{ height: `${(fill * 100).toFixed(2)}%`, background: `linear-gradient(180deg, ${IVORY}, ${damesPieces.clair.bord})`,
        transition: 'height .55s cubic-bezier(.4,0,.2,1)' }} />
      <div style={{ flex: 1, background: `linear-gradient(180deg, ${damesPieces.fonce.bord}, ${GRAPHITE})` }} />
      {/* ligne médiane (équilibre) */}
      <div aria-hidden style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 1, background: `${ui.accent}55` }} />
      {/* badge score */}
      <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)',
        [foncAhead ? 'bottom' : 'top']: 5, fontFamily: fonts.mono, fontSize: 9.5, fontWeight: 800,
        letterSpacing: '.2px', color: foncAhead ? '#1a1a1a' : IVORY, padding: '2px 4px', borderRadius: 5,
        background: foncAhead ? IVORY : 'rgba(0,0,0,.5)', boxShadow: '0 1px 4px rgba(0,0,0,.5)', whiteSpace: 'nowrap' }}>{txt}</div>
    </div>
  )
}
