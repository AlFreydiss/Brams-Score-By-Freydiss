// ─────────────────────────────────────────────────────────────────────────────
// DamesPoster — modale de fin de partie en POSTER « Avis de recherche » (One Piece).
// DA pilotée par les tokens nm (or champagne, Cinzel gravé, parchemin). Sert les 3
// modes : Solo (IA), Ami (local 2J) et Classé (prime ฿ + variation ELO animée).
// Bouton REVANCHE proéminent. Styles inline only + el.animate (repo inline-only).
//   props :
//     result   : 'P' | 'M' | 'draw'
//     myColor  : 'P' | 'M' | null   (null = local/hotseat → pas de "victoire/défaite" perso)
//     reason   : libellé de la cause (texte court)
//     stats    : [[label, valeur], …]  (coups, prises…)
//     prime    : { text, label, emoji, color } | null   (mode classé)
//     eloDelta : number | null         (variation ELO, mode classé)
//     promoted : booléen (palier franchi) — affiche un ruban
//     onRematch, onQuit, rematchLabel
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useRef, useState } from 'react'
import { nm } from '../nouveau-monde/theme/tokens.js'

const FACTION = {
  P: { name: 'Les Pirates', emoji: '☠️', accent: '#ff8a5a', glow: 'rgba(255,120,60,.4)', deep: 'rgba(120,30,12,.55)' },
  M: { name: 'La Marine', emoji: '⚓', accent: '#7fb6ff', glow: 'rgba(90,160,255,.4)', deep: 'rgba(14,46,92,.55)' },
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
    <span style={{ fontFamily: nm.fonts.poster, fontWeight: 700, fontSize: 26, color: pos ? nm.color.win : nm.color.danger, fontVariantNumeric: 'tabular-nums' }}>
      {pos ? '+' : ''}{shown} ELO
    </span>
  )
}

export default function DamesPoster({ result, myColor = null, reason, stats = [], prime = null, eloDelta = null, promoted = false, onRematch, onQuit, onAnalyse = null, rematchLabel = '⚔️ Revanche' }) {
  const cardRef = useRef(null)
  const draw = result === 'draw'
  const won = !draw && myColor && result === myColor
  const fac = !draw && result ? FACTION[result] : null
  const accent = draw ? nm.color.draw : fac?.accent || nm.color.gold

  // titre selon le contexte (perso vs spectateur/local)
  const title = draw ? 'Trêve en haute mer'
    : myColor ? (won ? 'Prime encaissée' : 'Capturé !')
      : (result === 'P' ? 'Les Pirates triomphent' : 'La Marine triomphe')
  const eyebrow = draw ? 'Avis · Match nul' : 'Avis de recherche'

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

  return (
    <div role="dialog" aria-modal="true" style={{
      position: 'absolute', inset: 0, zIndex: 30, display: 'grid', placeItems: 'center', padding: 16,
      background: `radial-gradient(circle at 50% 36%, ${draw ? 'rgba(40,46,54,.6)' : fac?.deep || 'rgba(40,34,22,.6)'}, rgba(6,8,12,.94))`,
      backdropFilter: 'blur(8px)',
    }}>
      <div ref={cardRef} style={{
        width: 'min(420px, 100%)', textAlign: 'center', position: 'relative', overflow: 'hidden',
        padding: '30px 28px 26px', borderRadius: nm.radius.lg,
        background: `linear-gradient(168deg, ${nm.color.parchment}, ${nm.color.parchmentDim})`,
        color: nm.color.ink,
        border: `2px solid ${nm.color.goldDeep}`,
        boxShadow: `0 34px 90px rgba(3,10,18,.8), 0 0 0 1px rgba(0,0,0,.5), inset 0 0 60px ${draw ? 'rgba(122,135,148,.12)' : fac?.glow || 'rgba(212,166,75,.12)'}`,
      }}>
        {/* coins gravés (cartographie) */}
        {[['top', 'left'], ['top', 'right'], ['bottom', 'left'], ['bottom', 'right']].map(([v, h], i) => (
          <span key={i} aria-hidden style={{ position: 'absolute', [v]: 8, [h]: 8, width: 18, height: 18, borderTop: v === 'top' ? `2px solid ${nm.color.goldDeep}` : 'none', borderBottom: v === 'bottom' ? `2px solid ${nm.color.goldDeep}` : 'none', borderLeft: h === 'left' ? `2px solid ${nm.color.goldDeep}` : 'none', borderRight: h === 'right' ? `2px solid ${nm.color.goldDeep}` : 'none', opacity: .7 }} />
        ))}

        <div style={{ ...nm.type.eyebrow, color: nm.color.danger, marginBottom: 6 }}>{eyebrow}</div>
        <div style={{ fontSize: 56, lineHeight: 1, marginBottom: 2, filter: `drop-shadow(0 3px 8px rgba(0,0,0,.3))` }}>{draw ? '🏴' : fac?.emoji}</div>
        <h2 style={{ ...nm.type.posterTitle, margin: '4px 0 2px', color: nm.color.ink, fontSize: 'clamp(1.5rem,4vw,2rem)' }}>{title}</h2>
        {reason && <div style={{ ...nm.type.small, color: nm.color.inkLine, fontWeight: 600 }}>{reason}</div>}

        {/* prime ฿ (mode classé) */}
        {prime && (
          <div style={{ margin: '14px auto 4px', display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '10px 22px', borderRadius: nm.radius.md, background: 'rgba(42,32,20,.08)', border: `1px dashed ${nm.color.goldDeep}` }}>
            <span style={{ ...nm.type.eyebrow, color: nm.color.goldDeep }}>Prime · {prime.label}</span>
            <span style={{ ...nm.type.bounty, color: nm.color.goldDeep }}>{prime.emoji} {prime.text}</span>
          </div>
        )}
        {eloDelta != null && <div style={{ marginTop: 8 }}><DeltaElo delta={eloDelta} /></div>}
        {promoted && (
          <div style={{ margin: '10px auto 0', display: 'inline-block', padding: '5px 14px', borderRadius: nm.radius.pill, background: nm.color.goldDeep, color: nm.color.parchment, fontFamily: nm.fonts.poster, fontWeight: 700, fontSize: 12.5, letterSpacing: '.06em', boxShadow: nm.shadow.goldGlow }}>
            ⭐ Nouveau palier atteint
          </div>
        )}

        {/* statistiques de la chasse */}
        {stats.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 28, margin: '20px 0 22px', borderTop: `1px solid ${nm.color.inkLine}`, borderBottom: `1px solid ${nm.color.inkLine}`, padding: '14px 0' }}>
            {stats.map(([l, v]) => (
              <div key={l}>
                <div style={{ fontFamily: nm.fonts.poster, fontWeight: 700, fontSize: 28, color: nm.color.goldDeep, lineHeight: 1 }}>{v}</div>
                <div style={{ ...nm.type.eyebrow, color: nm.color.inkLine, marginTop: 4 }}>{l}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginTop: stats.length ? 0 : 22 }}>
          <button onClick={onRematch} style={{ appearance: 'none', border: 0, cursor: 'pointer', fontFamily: nm.fonts.body, fontWeight: 800, fontSize: 15, padding: '12px 26px', borderRadius: nm.radius.pill, color: '#1a1304', background: `linear-gradient(180deg, ${nm.color.goldHi}, ${nm.color.gold})`, boxShadow: nm.shadow.goldGlow }}>{rematchLabel}</button>
          {onAnalyse && <button onClick={onAnalyse} style={{ appearance: 'none', cursor: 'pointer', fontFamily: nm.fonts.body, fontWeight: 700, fontSize: 14, padding: '12px 22px', borderRadius: nm.radius.pill, color: nm.color.ink, background: 'transparent', border: `1px solid ${nm.color.goldDeep}` }}>🔍 Analyser</button>}
          <button onClick={onQuit} style={{ appearance: 'none', cursor: 'pointer', fontFamily: nm.fonts.body, fontWeight: 700, fontSize: 14, padding: '12px 22px', borderRadius: nm.radius.pill, color: nm.color.ink, background: 'transparent', border: `1px solid ${nm.color.goldDeep}` }}>Quitter</button>
        </div>
      </div>
    </div>
  )
}
