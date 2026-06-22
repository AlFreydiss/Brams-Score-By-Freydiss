// ── Modale de fin : POSTER « AVIS DE RECHERCHE » (One Piece) ─────────────────
// DA pilotée par les tokens nm (or champagne, Cinzel gravé, parchemin). L'ELO
// s'affiche en prime ฿ et sa variation est animée. Bouton REMATCH proéminent.
// API INCHANGÉE (mêmes props que la version v4) → les 3 modes restent compatibles.
import { useEffect, useState, useRef } from 'react'
import { rangPourElo } from '../lib/elo.js'
import { nm } from '../../nouveau-monde/theme/tokens.js'

// Charge la police Cinzel une seule fois (poster gravé) — idempotent.
function useCinzel() {
  useEffect(() => {
    if (typeof document === 'undefined') return
    if (document.querySelector('link[data-echecs-cinzel]')) return
    const l = document.createElement('link')
    l.rel = 'stylesheet'; l.href = nm.FONT_HREF; l.setAttribute('data-echecs-cinzel', '1')
    document.head.appendChild(l)
  }, [])
}

// Confettis « pièces d'or » (canvas, zéro dépendance) — joués uniquement sur victoire.
// Respecte prefers-reduced-motion (rendu statique discret) et se nettoie au démontage.
function ConfettisOr({ actif }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!actif) return
    const cv = ref.current; if (!cv) return
    let reduit = false
    try { reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches } catch {}
    const ctx = cv.getContext('2d'); if (!ctx) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const W = cv.clientWidth, H = cv.clientHeight
    cv.width = W * dpr; cv.height = H * dpr; ctx.scale(dpr, dpr)
    const teintes = ['#e9c878', '#d4a64b', '#a87a2c', '#f0d79a']
    const N = reduit ? 26 : 90
    const parts = Array.from({ length: N }, () => ({
      x: W / 2 + (Math.random() - 0.5) * W * 0.4,
      y: H * 0.42 + (Math.random() - 0.5) * 30,
      vx: (Math.random() - 0.5) * 5,
      vy: -4 - Math.random() * 6,
      a: Math.random() * Math.PI,
      va: (Math.random() - 0.5) * 0.3,
      r: 3 + Math.random() * 4,
      c: teintes[(Math.random() * teintes.length) | 0],
    }))
    let raf, prev = performance.now(), vivant = true
    const dessine = () => {
      ctx.clearRect(0, 0, W, H)
      for (const p of parts) {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a)
        ctx.fillStyle = p.c
        ctx.beginPath(); ctx.ellipse(0, 0, p.r, p.r * 0.55, 0, 0, Math.PI * 2); ctx.fill()
        ctx.restore()
      }
    }
    const tick = (now) => {
      if (!vivant) return
      const dt = Math.min(0.05, (now - prev) / 1000); prev = now
      for (const p of parts) {
        p.vy += 14 * dt; p.x += p.vx * 60 * dt; p.y += p.vy * 60 * dt; p.a += p.va
      }
      dessine()
      raf = requestAnimationFrame(tick)
    }
    if (reduit) { dessine() }
    else { raf = requestAnimationFrame(tick) }
    const stop = setTimeout(() => { vivant = false; cancelAnimationFrame(raf) }, 3500)
    return () => { vivant = false; cancelAnimationFrame(raf); clearTimeout(stop) }
  }, [actif])
  if (!actif) return null
  return <canvas ref={ref} style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1001 }} />
}

const LIBELLES_CAUSE = {
  mat: 'Échec et mat', pat: 'Pat', abandon: 'Abandon', temps: 'Au temps',
  nulle_accord: 'Nulle sur accord', repetition: 'Triple répétition',
  materiel: 'Matériel insuffisant', cinquante_coups: 'Règle des 50 coups',
  deconnexion: 'Déconnexion',
}

// Compteur animé pour le delta ELO (prime ฿)
function DeltaElo({ delta, eloFinal }) {
  const [affiche, setAffiche] = useState(0)
  useEffect(() => {
    if (!delta) { setAffiche(0); return }
    const t0 = performance.now()
    let raf
    const anim = now => {
      const t = Math.min(1, (now - t0) / 900)
      setAffiche(Math.round(delta * (1 - Math.pow(1 - t, 3))))
      if (t < 1) raf = requestAnimationFrame(anim)
    }
    raf = requestAnimationFrame(anim)
    return () => cancelAnimationFrame(raf)
  }, [delta])
  if (delta == null) return null
  const pos = delta >= 0
  return (
    <span style={{ fontFamily: nm.fonts.poster, fontWeight: 700, fontSize: 24, color: pos ? nm.color.win : nm.color.danger, fontVariantNumeric: 'tabular-nums' }}>
      {pos ? '+' : ''}{affiche} ELO
    </span>
  )
}

export default function FinPartieModal({
  resultat,            // 'blanc' | 'noir' | 'nulle'
  cause,
  maCouleur,           // 'w' | 'b' | null (hotseat)
  deltaElo = null,     // variation pour MOI (null en solo)
  eloFinal = null,
  onRevanche, revancheEnAttente,
  onFermer, onNouvellePartie,
}) {
  useCinzel()
  const cardRef = useRef(null)
  const gagne = maCouleur && resultat !== 'nulle' && ((resultat === 'blanc') === (maCouleur === 'w'))
  const draw = resultat === 'nulle'

  const titre = draw ? 'Trêve en haute mer'
    : maCouleur ? (gagne ? 'Prime encaissée' : 'Capturé !')
    : (resultat === 'blanc' ? 'Les Blancs triomphent' : 'Les Noirs triomphent')
  const eyebrow = draw ? 'Avis · Match nul' : 'Avis de recherche'
  const emoji = draw ? '🏴' : gagne ? '👑' : maCouleur ? '⚓' : '⚔️'
  const accentGlow = draw ? 'rgba(122,135,148,.12)' : gagne ? 'rgba(212,166,75,.16)' : 'rgba(158,59,46,.16)'
  const deepGlow = draw ? 'rgba(40,46,54,.6)' : gagne ? 'rgba(40,34,22,.6)' : 'rgba(74,18,12,.55)'
  const rang = eloFinal != null ? rangPourElo(eloFinal) : null

  useEffect(() => {
    const el = cardRef.current
    if (el && el.animate) el.animate(
      [{ opacity: 0, transform: 'translateY(22px) scale(.94)' }, { opacity: 1, transform: 'none' }],
      { duration: 420, easing: 'cubic-bezier(.2,1.3,.4,1)' },
    )
    const k = (e) => { if (e.key === 'Escape') onFermer?.() }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onFermer])

  return (
    <div role="dialog" aria-modal="true" onClick={onFermer} style={{
      position: 'fixed', inset: 0, zIndex: 1000, display: 'grid', placeItems: 'center', padding: 16,
      background: `radial-gradient(circle at 50% 36%, ${deepGlow}, rgba(6,8,12,.94))`,
      backdropFilter: 'blur(7px)',
    }}>
      <ConfettisOr actif={!!gagne} />
      <div ref={cardRef} onClick={(e) => e.stopPropagation()} style={{
        position: 'relative', zIndex: 1002, width: 'min(420px, calc(100vw - 32px))', textAlign: 'center', overflow: 'hidden',
        padding: '30px 28px 26px', borderRadius: nm.radius.lg,
        background: `linear-gradient(168deg, ${nm.color.parchment}, ${nm.color.parchmentDim})`,
        color: nm.color.ink, border: `2px solid ${nm.color.goldDeep}`,
        boxShadow: `0 34px 90px rgba(3,10,18,.8), 0 0 0 1px rgba(0,0,0,.5), inset 0 0 60px ${accentGlow}`,
      }}>
        {/* coins gravés (cartographie) */}
        {[['top', 'left'], ['top', 'right'], ['bottom', 'left'], ['bottom', 'right']].map(([v, h], i) => (
          <span key={i} aria-hidden style={{ position: 'absolute', [v]: 8, [h]: 8, width: 18, height: 18, borderTop: v === 'top' ? `2px solid ${nm.color.goldDeep}` : 'none', borderBottom: v === 'bottom' ? `2px solid ${nm.color.goldDeep}` : 'none', borderLeft: h === 'left' ? `2px solid ${nm.color.goldDeep}` : 'none', borderRight: h === 'right' ? `2px solid ${nm.color.goldDeep}` : 'none', opacity: .7 }} />
        ))}

        <div style={{ ...nm.type.eyebrow, color: nm.color.danger, marginBottom: 6 }}>{eyebrow}</div>
        <div style={{ fontSize: 54, lineHeight: 1, marginBottom: 2, filter: 'drop-shadow(0 3px 8px rgba(0,0,0,.3))' }}>{emoji}</div>
        <h2 style={{ ...nm.type.posterTitle, margin: '4px 0 2px', color: nm.color.ink, fontSize: 'clamp(1.5rem,4vw,2rem)' }}>{titre}</h2>
        <div style={{ ...nm.type.small, color: nm.color.inkLine, fontWeight: 600 }}>{LIBELLES_CAUSE[cause] || cause || ''}</div>

        {/* prime ฿ (mode classé) : ELO final gravé + variation animée */}
        {eloFinal != null && (
          <div style={{ margin: '16px auto 4px', display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '12px 24px', borderRadius: nm.radius.md, background: 'rgba(42,32,20,.08)', border: `1px dashed ${nm.color.goldDeep}` }}>
            <span style={{ ...nm.type.eyebrow, color: nm.color.goldDeep }}>Prime{rang ? ` · ${rang.label}` : ''}</span>
            <span style={{ ...nm.type.bounty, color: nm.color.goldDeep }}>฿ {eloFinal.toLocaleString('fr-FR')}</span>
            {deltaElo != null && <DeltaElo delta={deltaElo} eloFinal={eloFinal} />}
          </div>
        )}
        {/* delta seul (cas sans eloFinal mais avec delta) */}
        {eloFinal == null && deltaElo != null && (
          <div style={{ marginTop: 10 }}><DeltaElo delta={deltaElo} /></div>
        )}
        {rang && eloFinal != null && (
          <div style={{ marginTop: 4, fontSize: 12.5, color: nm.color.ink, fontWeight: 700, fontFamily: nm.fonts.body }}>
            {rang.emoji} {rang.label} · {rang.zone}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginTop: 24 }}>
          {onRevanche && (
            <button
              onClick={onRevanche} disabled={revancheEnAttente}
              style={{
                appearance: 'none', border: 0, cursor: revancheEnAttente ? 'default' : 'pointer',
                fontFamily: nm.fonts.body, fontWeight: 800, fontSize: 15, padding: '12px 26px', borderRadius: nm.radius.pill,
                color: revancheEnAttente ? nm.color.goldDeep : '#1a1304',
                background: revancheEnAttente ? 'rgba(42,32,20,.10)' : `linear-gradient(180deg, ${nm.color.goldHi}, ${nm.color.gold})`,
                boxShadow: revancheEnAttente ? 'none' : nm.shadow.goldGlow,
              }}
            >
              {revancheEnAttente ? '⏳ En attente…' : '⚔️ Revanche'}
            </button>
          )}
          {onNouvellePartie && (
            <button
              onClick={onNouvellePartie}
              style={{
                appearance: 'none', border: 0, cursor: 'pointer',
                fontFamily: nm.fonts.body, fontWeight: 800, fontSize: 15, padding: '12px 26px', borderRadius: nm.radius.pill,
                color: '#1a1304', background: `linear-gradient(180deg, ${nm.color.goldHi}, ${nm.color.gold})`, boxShadow: nm.shadow.goldGlow,
              }}
            >
              ♟ Nouvelle partie
            </button>
          )}
          <button
            onClick={onFermer}
            style={{
              appearance: 'none', cursor: 'pointer', fontFamily: nm.fonts.body, fontWeight: 700, fontSize: 14,
              padding: '12px 22px', borderRadius: nm.radius.pill, color: nm.color.ink, background: 'transparent',
              border: `1px solid ${nm.color.goldDeep}`,
            }}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}
