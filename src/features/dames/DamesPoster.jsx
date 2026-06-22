// ─────────────────────────────────────────────────────────────────────────────
// DamesPoster — modale de fin de partie NEUTRE premium (façon site de dames sérieux).
// Plus de poster "Avis de recherche" / factions : carte sobre charcoal + accent or.
// Sert les 3 modes : Solo (IA), 2 joueurs (local) et Classé (prime ฿ + ELO animé).
// Bouton REVANCHE proéminent. Styles inline only + el.animate (repo inline-only).
//   props :
//     result   : 'P' | 'M' | 'draw'              (P = Foncé, M = Clair)
//     myColor  : 'P' | 'M' | null   (null = local → pas de "victoire/défaite" perso)
//     reason   : libellé de la cause (texte court)
//     stats    : [[label, valeur], …]
//     prime    : { text, label, emoji, color } | null   (mode classé)
//     eloDelta : number | null
//     promoted : booléen (palier franchi)
//     onRematch, onQuit, onAnalyse, rematchLabel
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useRef, useState } from 'react'
import { ui, fonts, damesPieces } from '../games/neutralTheme.js'

const SIDE = {
  P: { name: 'Foncé', col: damesPieces.fonce },
  M: { name: 'Clair', col: damesPieces.clair },
}

// compteur animé (delta ELO)
function DeltaElo({ delta }) {
  const [shown, setShown] = useState(0)
  useEffect(() => {
    if (delta == null) return
    const t0 = performance.now()
    let raf
    const tick = (now) => { const t = Math.min(1, (now - t0) / 850); setShown(Math.round(delta * (1 - Math.pow(1 - t, 3)))); if (t < 1) raf = requestAnimationFrame(tick) }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [delta])
  if (delta == null) return null
  const pos = delta >= 0
  return (
    <span style={{ fontFamily: fonts.mono, fontWeight: 700, fontSize: 24, color: pos ? ui.good : ui.bad, fontVariantNumeric: 'tabular-nums' }}>
      {pos ? '+' : ''}{shown} ELO
    </span>
  )
}

export default function DamesPoster({ result, myColor = null, reason, stats = [], prime = null, eloDelta = null, promoted = false, onRematch, onQuit, onAnalyse = null, rematchLabel = 'Revanche' }) {
  const cardRef = useRef(null)
  const draw = result === 'draw'
  const won = !draw && myColor && result === myColor
  const sd = !draw && result ? SIDE[result] : null

  const title = draw ? 'Partie nulle'
    : myColor ? (won ? 'Victoire' : 'Défaite')
      : (sd ? `${sd.name} l'emporte` : 'Fin de partie')
  const eyebrow = draw ? 'Match nul' : 'Résultat'

  useEffect(() => {
    const el = cardRef.current
    if (el && el.animate) el.animate(
      [{ opacity: 0, transform: 'translateY(22px) scale(.94)' }, { opacity: 1, transform: 'none' }],
      { duration: 420, easing: 'cubic-bezier(.2,1.3,.4,1)' },
    )
    const onKey = (e) => { if (e.key === 'Escape') onQuit?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onQuit])

  const btnGhost = { appearance: 'none', cursor: 'pointer', fontFamily: fonts.body, fontWeight: 700, fontSize: 14, padding: '12px 22px', borderRadius: ui.radius.pill, color: ui.text, background: 'transparent', border: `1px solid ${ui.lineHi}` }

  return (
    <div role="dialog" aria-modal="true" style={{
      position: 'absolute', inset: 0, zIndex: 30, display: 'grid', placeItems: 'center', padding: 16,
      background: 'radial-gradient(circle at 50% 36%, rgba(13,14,17,.7), rgba(6,7,10,.94))',
      backdropFilter: 'blur(8px)',
    }}>
      <div ref={cardRef} style={{
        width: 'min(420px, 100%)', textAlign: 'center', position: 'relative', overflow: 'hidden',
        padding: '30px 28px 26px', borderRadius: ui.radius.lg,
        background: `linear-gradient(168deg, ${ui.surfaceHi}, ${ui.bgElev})`,
        color: ui.text, border: `1px solid ${ui.lineHi}`,
        boxShadow: `${ui.shadow}, inset 0 0 60px rgba(200,164,92,.06)`,
      }}>
        {/* liseré accent haut */}
        <div aria-hidden style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: draw ? ui.textMute : ui.accent, opacity: .8 }} />

        <div style={{ fontFamily: fonts.body, fontWeight: 600, fontSize: 12, letterSpacing: '.2em', textTransform: 'uppercase', color: ui.accent, marginBottom: 10 }}>{eyebrow}</div>

        {/* médaillon du camp gagnant (neutre) ou égalité */}
        <div aria-hidden style={{ margin: '0 auto 10px', width: 56, height: 56, borderRadius: '50%',
          background: draw
            ? `conic-gradient(${damesPieces.fonce.base} 0 50%, ${damesPieces.clair.base} 50% 100%)`
            : `radial-gradient(circle at 36% 30%, ${sd.col.haut}, ${sd.col.base} 70%, ${sd.col.bord})`,
          boxShadow: `0 0 0 1px ${ui.lineHi}, 0 8px 20px rgba(0,0,0,.5), inset 0 -4px 8px rgba(0,0,0,.4)` }} />

        <h2 style={{ fontFamily: fonts.display, fontWeight: 800, letterSpacing: '-.01em', margin: '4px 0 2px', color: ui.text, fontSize: 'clamp(1.5rem,4vw,2rem)' }}>{title}</h2>
        {reason && <div style={{ fontFamily: fonts.body, fontSize: 13.5, color: ui.textDim, fontWeight: 500 }}>{reason}</div>}

        {/* prime ฿ (mode classé) */}
        {prime && (
          <div style={{ margin: '14px auto 4px', display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '10px 22px', borderRadius: ui.radius.md, background: ui.surface, border: `1px dashed ${ui.accent}66` }}>
            <span style={{ fontFamily: fonts.body, fontWeight: 600, fontSize: 11, letterSpacing: '.2em', textTransform: 'uppercase', color: ui.accent }}>Prime · {prime.label}</span>
            <span style={{ fontFamily: fonts.mono, fontWeight: 700, fontSize: 20, color: ui.accentHi }}>{prime.text}</span>
          </div>
        )}
        {eloDelta != null && <div style={{ marginTop: 8 }}><DeltaElo delta={eloDelta} /></div>}
        {promoted && (
          <div style={{ margin: '10px auto 0', display: 'inline-block', padding: '5px 14px', borderRadius: ui.radius.pill, background: ui.accent, color: ui.accentInk, fontFamily: fonts.display, fontWeight: 700, fontSize: 12.5, letterSpacing: '.04em', boxShadow: '0 0 0 1px rgba(200,164,92,.4), 0 6px 18px -6px rgba(200,164,92,.5)' }}>
            Nouveau palier atteint
          </div>
        )}

        {/* statistiques */}
        {stats.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 28, margin: '20px 0 22px', borderTop: `1px solid ${ui.line}`, borderBottom: `1px solid ${ui.line}`, padding: '14px 0' }}>
            {stats.map(([l, v]) => (
              <div key={l}>
                <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: 26, color: ui.accentHi, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{v}</div>
                <div style={{ fontFamily: fonts.body, fontWeight: 600, fontSize: 11, letterSpacing: '.18em', textTransform: 'uppercase', color: ui.textMute, marginTop: 5 }}>{l}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginTop: stats.length ? 0 : 22 }}>
          <button onClick={onRematch} style={{ appearance: 'none', border: 0, cursor: 'pointer', fontFamily: fonts.body, fontWeight: 800, fontSize: 15, padding: '12px 26px', borderRadius: ui.radius.pill, color: ui.accentInk, background: `linear-gradient(180deg, ${ui.accentHi}, ${ui.accent})`, boxShadow: '0 6px 18px -6px rgba(200,164,92,.5)' }}>{rematchLabel}</button>
          {onAnalyse && <button onClick={onAnalyse} style={btnGhost}>Analyser</button>}
          <button onClick={onQuit} style={btnGhost}>Quitter</button>
        </div>
      </div>
    </div>
  )
}
