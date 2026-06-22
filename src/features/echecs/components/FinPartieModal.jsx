// ── Modale de fin de partie — NEUTRE PREMIUM (charcoal + un accent or) ───────
// Surface sombre, titre Bricolage, ELO + delta animé en mono, bouton revanche
// proéminent. Confettis or sur victoire (respecte prefers-reduced-motion).
// API INCHANGÉE (mêmes props) → les 3 modes restent compatibles.
import { useEffect, useState, useRef } from 'react'
import { rangPourElo } from '../lib/elo.js'
import { THEME } from '../constants.js'

// Confettis « pièces d'or » (canvas, zéro dépendance) — joués uniquement sur victoire.
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
    const teintes = ['#e0c074', '#c8a45c', '#a07f3a', '#efddb0']
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

// Compteur animé pour le delta ELO
function DeltaElo({ delta }) {
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
    <span style={{ fontFamily: THEME.fontMono, fontWeight: 700, fontSize: 18, color: pos ? THEME.success : THEME.accent, fontVariantNumeric: 'tabular-nums' }}>
      {pos ? '+' : ''}{affiche}
    </span>
  )
}

function Btn({ onClick, disabled, variant, children }) {
  const [hover, setHover] = useState(false)
  const primaire = variant === 'primaire'
  return (
    <button
      onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        appearance: 'none', cursor: disabled ? 'default' : 'pointer',
        fontFamily: THEME.fontDisplay, fontWeight: 800, fontSize: 14.5, padding: '12px 24px',
        borderRadius: THEME.radius.pill, transition: 'background .15s, border-color .15s, transform .12s',
        transform: hover && !disabled ? 'translateY(-1px)' : 'none',
        ...(primaire
          ? {
            color: THEME.accentInk, border: '1px solid transparent',
            background: disabled ? THEME.surfaceHi : `linear-gradient(135deg, ${THEME.goldHi}, ${THEME.gold})`,
            boxShadow: disabled ? 'none' : '0 14px 34px -16px rgba(200,164,92,.55)',
          }
          : {
            color: THEME.text, border: `1px solid ${hover ? THEME.cardBorderHover : THEME.cardBorder}`,
            background: hover ? THEME.surfaceHi : 'transparent',
          }),
        opacity: disabled ? 0.7 : 1,
      }}
    >{children}</button>
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
  onAnalyser,          // () => void (optionnel) — ouvre l'analyse post-partie
}) {
  const cardRef = useRef(null)
  const gagne = maCouleur && resultat !== 'nulle' && ((resultat === 'blanc') === (maCouleur === 'w'))
  const draw = resultat === 'nulle'

  const titre = draw ? 'Partie nulle'
    : maCouleur ? (gagne ? 'Victoire' : 'Défaite')
    : (resultat === 'blanc' ? 'Les Blancs gagnent' : 'Les Noirs gagnent')
  const accentTitre = draw ? THEME.text : gagne ? THEME.goldHi : THEME.accent
  const glow = draw ? 'rgba(154,160,170,.10)' : gagne ? 'rgba(200,164,92,.16)' : 'rgba(212,104,90,.14)'
  const rang = eloFinal != null ? rangPourElo(eloFinal) : null

  useEffect(() => {
    const el = cardRef.current
    if (el && el.animate) el.animate(
      [{ opacity: 0, transform: 'translateY(20px) scale(.95)' }, { opacity: 1, transform: 'none' }],
      { duration: 360, easing: 'cubic-bezier(.2,1.1,.4,1)' },
    )
    const k = (e) => { if (e.key === 'Escape') onFermer?.() }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onFermer])

  return (
    <div role="dialog" aria-modal="true" aria-label={titre} onClick={onFermer} style={{
      position: 'fixed', inset: 0, zIndex: 1000, display: 'grid', placeItems: 'center', padding: 16,
      background: 'rgba(6,8,12,.72)', backdropFilter: 'blur(7px)', WebkitBackdropFilter: 'blur(7px)',
    }}>
      <ConfettisOr actif={!!gagne} />
      <div ref={cardRef} onClick={(e) => e.stopPropagation()} style={{
        position: 'relative', zIndex: 1002, width: 'min(400px, calc(100vw - 32px))', textAlign: 'center', overflow: 'hidden',
        padding: '28px 26px 24px', borderRadius: THEME.radius.lg,
        background: THEME.bgElev, color: THEME.text,
        border: `1px solid ${THEME.cardBorderHover}`,
        boxShadow: `0 40px 110px -30px rgba(0,0,0,.85), inset 0 0 70px ${glow}`,
      }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: THEME.muted, marginBottom: 8 }}>
          {draw ? 'Match nul' : 'Fin de partie'}
        </div>
        <h2 style={{ margin: '0 0 4px', fontFamily: THEME.fontDisplay, fontWeight: 800, fontSize: 'clamp(1.7rem,5vw,2.2rem)', color: accentTitre, letterSpacing: '-0.02em' }}>{titre}</h2>
        <div style={{ fontSize: 13, color: THEME.textDim, fontWeight: 600 }}>{LIBELLES_CAUSE[cause] || cause || ''}</div>

        {/* ELO classé : valeur finale (mono) + variation animée */}
        {eloFinal != null && (
          <div style={{ margin: '18px auto 4px', display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '14px 28px', borderRadius: THEME.radius.md, background: THEME.surface, border: `1px solid ${THEME.cardBorder}` }}>
            <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: THEME.muted }}>Nouvel ELO{rang ? ` · ${rang.label}` : ''}</span>
            <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 10 }}>
              <span style={{ fontFamily: THEME.fontMono, fontWeight: 700, fontSize: 30, color: THEME.goldHi, fontVariantNumeric: 'tabular-nums' }}>{eloFinal}</span>
              {deltaElo != null && <DeltaElo delta={deltaElo} />}
            </span>
          </div>
        )}
        {eloFinal == null && deltaElo != null && (
          <div style={{ marginTop: 12 }}><DeltaElo delta={deltaElo} /> <span style={{ fontSize: 12, color: THEME.muted }}>ELO</span></div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginTop: 22 }}>
          {onRevanche && (
            <Btn variant="primaire" onClick={onRevanche} disabled={revancheEnAttente}>
              {revancheEnAttente ? 'En attente…' : 'Revanche'}
            </Btn>
          )}
          {onNouvellePartie && (
            <Btn variant="primaire" onClick={onNouvellePartie}>Nouvelle partie</Btn>
          )}
          {onAnalyser && <Btn onClick={onAnalyser}>Analyser</Btn>}
          <Btn onClick={onFermer}>Fermer</Btn>
        </div>
      </div>
    </div>
  )
}
