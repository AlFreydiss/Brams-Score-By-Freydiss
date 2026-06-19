// ── BarreEval : barre d'évaluation façon lichess (dark premium) ──────────────
// Verticale en desktop, horizontale en mobile. Remplie selon `ratio` (0..1 =
// avantage blanc). Styles inline only. Fond #08090D, accents or/ivoire.
// `ratio` : 0..1 (part de l'avantage blanc). `texte` : '+1.4' / 'M3' / '–'.
// `orientation` : 'white' | 'black' — oriente la barre comme le plateau.
import { useEffect, useState } from 'react'

const OR = '#BFA46A'
const IVOIRE = '#ECE3CC'
const FOND = '#08090D'

export default function BarreEval({
  ratio = 0.5,
  texte = '–',
  enCours = false,
  orientation = 'white',
  horizontal = false,
  hauteur = 480,
}) {
  // Animation douce du remplissage (lerp via transition CSS sur la part blanche).
  const [r, setR] = useState(0.5)
  useEffect(() => {
    const v = Math.min(0.98, Math.max(0.02, ratio))
    const id = requestAnimationFrame(() => setR(v))
    return () => cancelAnimationFrame(id)
  }, [ratio])

  const partBlancPct = `${r * 100}%`
  const blancEnHaut = orientation === 'black'   // si on regarde côté noir, blanc en haut
  const blancDevant = r >= 0.5
  // Le label suit toujours le camp dominant ; couleur lisible sur le fond local.
  const labelColor = blancDevant ? '#0c0d10' : IVOIRE

  if (horizontal) {
    // ── Barre horizontale (mobile) : blanc à gauche ──
    return (
      <div
        data-testid="barre-eval"
        aria-label={`Évaluation ${texte}`}
        style={{
          position: 'relative', width: '100%', height: 22, borderRadius: 8,
          overflow: 'hidden', background: FOND,
          border: `1px solid rgba(191,164,106,0.30)`,
          boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.5)',
          opacity: enCours ? 0.85 : 1,
        }}
      >
        <div style={{
          position: 'absolute', inset: 0, width: partBlancPct,
          background: `linear-gradient(90deg, ${IVOIRE}, #f6efde)`,
          transition: 'width .45s cubic-bezier(.4,0,.2,1)',
        }} />
        <div style={{
          position: 'absolute', top: 0, bottom: 0, left: '50%', width: 1,
          background: 'rgba(191,164,106,0.55)',
        }} />
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
          justifyContent: blancDevant ? 'flex-start' : 'flex-end',
          padding: '0 8px', fontFamily: "'Syne', sans-serif",
          fontWeight: 800, fontSize: 12, letterSpacing: '0.02em',
          color: labelColor,
        }}>
          {texte}
        </div>
      </div>
    )
  }

  // ── Barre verticale (desktop) ──
  // Le bloc blanc occupe `partBlancPct` de la hauteur, positionné selon orientation.
  const blocBlancStyle = blancEnHaut
    ? { top: 0, height: partBlancPct }
    : { bottom: 0, height: partBlancPct }

  return (
    <div
      data-testid="barre-eval"
      aria-label={`Évaluation ${texte}`}
      style={{
        position: 'relative', width: 26, height: hauteur, borderRadius: 9,
        overflow: 'hidden', background: FOND,
        border: `1px solid rgba(191,164,106,0.30)`,
        boxShadow: 'inset 0 0 14px rgba(0,0,0,.6), 0 10px 30px -16px rgba(0,0,0,.8)',
        flex: '0 0 auto', opacity: enCours ? 0.9 : 1,
      }}
    >
      {/* part blanche */}
      <div style={{
        position: 'absolute', left: 0, right: 0, ...blocBlancStyle,
        background: `linear-gradient(${blancEnHaut ? 180 : 0}deg, ${IVOIRE}, #f6efde)`,
        transition: 'height .45s cubic-bezier(.4,0,.2,1)',
      }} />
      {/* ligne médiane or (égalité) */}
      <div style={{
        position: 'absolute', left: 0, right: 0, top: '50%', height: 1,
        background: 'rgba(191,164,106,0.55)',
      }} />
      {/* label vertical, du côté du camp dominant */}
      <div style={{
        position: 'absolute', left: 0, right: 0,
        ...(blancDevant === !blancEnHaut ? { bottom: 4 } : { top: 4 }),
        textAlign: 'center', fontFamily: "'Syne', sans-serif",
        fontWeight: 800, fontSize: 10.5, letterSpacing: '0.01em',
        color: blancDevant ? '#0c0d10' : OR,
        textShadow: blancDevant ? 'none' : '0 1px 2px rgba(0,0,0,.6)',
      }}>
        {texte}
      </div>
    </div>
  )
}
