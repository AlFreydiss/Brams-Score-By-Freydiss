// ─────────────────────────────────────────────────────────────────────────────
// DamesEvalBar — barre d'évaluation verticale, dark premium (façon moteur d'échecs).
// Reçoit un score en "centipions" du point de vue BLANC (Pirates = positif).
// Le remplissage ivoire monte = avantage Pirates ; noir = avantage Marine.
// Styles inline only. Aucune dépendance.
// ─────────────────────────────────────────────────────────────────────────────
const INK = '#08090D', GOLD = '#BFA46A', IVORY = '#ece3cf'

// score (centipions, POV blanc) → fraction d'avantage Pirates dans [0,1] (sigmoïde douce).
function toFill(score) {
  if (score == null) return 0.5
  if (score >= 90000) return 1
  if (score <= -90000) return 0
  // 1 pion ≈ 100 → un avantage de ~3 pions remplit fortement la barre.
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
  const fill = toFill(ev ? score : null)          // part Pirates (bas = blanc/ivoire)
  const pirAhead = score >= 0
  const txt = label(ev)

  return (
    <div aria-label="Barre d'évaluation" role="img"
      style={{ position: 'relative', width: 22, minWidth: 22, height, borderRadius: 11, overflow: 'hidden',
        background: '#05060a', border: `1px solid ${GOLD}28`, boxShadow: 'inset 0 0 14px rgba(0,0,0,.7)',
        display: 'flex', flexDirection: 'column-reverse' }}>
      {/* part Pirates (ivoire) en bas, le reste (noir) au-dessus */}
      <div style={{ height: `${(fill * 100).toFixed(2)}%`, background: `linear-gradient(180deg, ${IVORY}, #cdbf9b)`,
        transition: 'height .55s cubic-bezier(.4,0,.2,1)' }} />
      <div style={{ flex: 1, background: `linear-gradient(180deg, ${INK}, #0d0f16)` }} />
      {/* ligne médiane (équilibre) */}
      <div aria-hidden style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 1, background: `${GOLD}55` }} />
      {/* badge score */}
      <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)',
        [pirAhead ? 'bottom' : 'top']: 5, fontFamily: "'Inter',system-ui,sans-serif", fontSize: 9.5, fontWeight: 800,
        letterSpacing: '.3px', color: pirAhead ? '#231703' : IVORY, padding: '2px 4px', borderRadius: 5,
        background: pirAhead ? GOLD : 'rgba(0,0,0,.55)', boxShadow: '0 1px 4px rgba(0,0,0,.5)', whiteSpace: 'nowrap' }}>{txt}</div>
    </div>
  )
}
