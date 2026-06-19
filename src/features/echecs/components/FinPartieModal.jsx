// ── Modale de fin : résultat, variation d'ELO animée, revanche ───────────────
import { useEffect, useState, useRef } from 'react'
import { THEME } from '../constants.js'
import { rangPourElo } from '../lib/elo.js'

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
    const teintes = ['#ffd700', '#ffe98a', '#e8b800', '#c9971f']
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
    if (reduit) { dessine() }            // rendu statique : une seule gerbe, pas d'animation
    else { raf = requestAnimationFrame(tick) }
    const stop = setTimeout(() => { vivant = false; cancelAnimationFrame(raf) }, 3500)
    return () => { vivant = false; cancelAnimationFrame(raf); clearTimeout(stop) }
  }, [actif])
  if (!actif) return null
  return <canvas ref={ref} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }} />
}

const LIBELLES_CAUSE = {
  mat: 'Échec et mat', pat: 'Pat', abandon: 'Abandon', temps: 'Au temps',
  nulle_accord: 'Nulle sur accord', repetition: 'Triple répétition',
  materiel: 'Matériel insuffisant', cinquante_coups: 'Règle des 50 coups',
  deconnexion: 'Déconnexion',
}

// Compteur animé pour le delta ELO
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
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 10, marginTop: 6 }}>
      <span style={{
        fontFamily: THEME.fontDisplay, fontWeight: 800, fontSize: 34,
        color: pos ? THEME.success : THEME.accent, fontVariantNumeric: 'tabular-nums',
      }}>
        {pos ? '+' : ''}{affiche}
      </span>
      {eloFinal != null && (
        <span style={{ fontSize: 15, color: THEME.muted }}>
          → <b style={{ color: THEME.gold }}>{eloFinal}</b> ELO
        </span>
      )}
    </div>
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
  const gagne = maCouleur && resultat !== 'nulle' && ((resultat === 'blanc') === (maCouleur === 'w'))
  const titre = resultat === 'nulle' ? 'Partie nulle'
    : maCouleur ? (gagne ? 'Victoire !' : 'Défaite')
    : (resultat === 'blanc' ? 'Les Blancs gagnent' : 'Les Noirs gagnent')
  const emoji = resultat === 'nulle' ? '🤝' : gagne ? '🏆' : maCouleur ? '💀' : '⚔️'
  const couleurTitre = resultat === 'nulle' ? THEME.blue : gagne || !maCouleur ? THEME.gold : THEME.accent
  const rang = eloFinal != null ? rangPourElo(eloFinal) : null

  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape') onFermer?.() }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onFermer])

  return (
    <div role="dialog" aria-modal="true" onClick={onFermer} style={{
      position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(8,9,11,0.72)', backdropFilter: 'blur(6px)', animation: 'echecsFadeIn .25s ease',
    }}>
      <style>{`
        @keyframes echecsFadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes echecsPop { from { opacity: 0; transform: translateY(18px) scale(.96) } to { opacity: 1; transform: none } }
      `}</style>
      <ConfettisOr actif={!!gagne} />
      <div onClick={(e) => e.stopPropagation()} style={{
        position: 'relative', zIndex: 2,
        width: 'min(400px, calc(100vw - 40px))', padding: '30px 28px 24px', textAlign: 'center',
        background: 'linear-gradient(160deg, rgba(36,38,42,0.96), rgba(24,25,28,0.96))',
        border: `1px solid ${THEME.cardBorderHover}`, borderRadius: 22,
        boxShadow: '0 40px 90px -30px rgba(0,0,0,.9)', animation: 'echecsPop .35s cubic-bezier(.34,1.56,.64,1)',
      }}>
        <div style={{ fontSize: 54, lineHeight: 1 }}>{emoji}</div>
        <h2 style={{ margin: '12px 0 2px', fontFamily: THEME.fontDisplay, fontWeight: 800, fontSize: 30, color: couleurTitre, letterSpacing: '-0.01em' }}>
          {titre}
        </h2>
        <div style={{ fontSize: 14, color: THEME.muted, fontWeight: 600 }}>{LIBELLES_CAUSE[cause] || cause || ''}</div>

        <DeltaElo delta={deltaElo} eloFinal={eloFinal} />
        {rang && (
          <div style={{ marginTop: 4, fontSize: 12.5, color: rang.couleur, fontWeight: 700 }}>
            {rang.emoji} {rang.label} · {rang.zone}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          {onRevanche && (
            <button
              onClick={onRevanche} disabled={revancheEnAttente}
              style={{
                flex: 1, padding: '12px 14px', borderRadius: 12, cursor: revancheEnAttente ? 'default' : 'pointer',
                fontFamily: THEME.fontBody, fontWeight: 800, fontSize: 14,
                background: revancheEnAttente ? 'rgba(255,215,0,0.12)' : `linear-gradient(135deg, ${THEME.gold}, #e8b800)`,
                color: revancheEnAttente ? THEME.gold : '#1a1500', border: 'none',
              }}
            >
              {revancheEnAttente ? '⏳ En attente…' : '🔄 Revanche'}
            </button>
          )}
          {onNouvellePartie && (
            <button
              onClick={onNouvellePartie}
              style={{
                flex: 1, padding: '12px 14px', borderRadius: 12, cursor: 'pointer',
                fontFamily: THEME.fontBody, fontWeight: 800, fontSize: 14,
                background: 'rgba(255,255,255,0.08)', color: THEME.text, border: `1px solid ${THEME.cardBorderHover}`,
              }}
            >
              ♟ Nouvelle partie
            </button>
          )}
          <button
            onClick={onFermer}
            style={{
              flex: onRevanche || onNouvellePartie ? 0.6 : 1, padding: '12px 14px', borderRadius: 12, cursor: 'pointer',
              fontFamily: THEME.fontBody, fontWeight: 700, fontSize: 14,
              background: 'transparent', color: THEME.muted, border: `1px solid ${THEME.cardBorder}`,
            }}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}
