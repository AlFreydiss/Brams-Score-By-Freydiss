// ── EvalBar : barre d'évaluation verticale (winPct sigmoïde du spec) ────────
// 2D strict. Remplissage = part blanche selon winPct(cp) (ou mat → extrême).
// Accent laiton désaturé de l'univers (#81b64c). Label lisible +1.2 / M3.
import { useEffect, useState } from 'react'
import { ui, fonts } from '../../../features/games/neutralTheme.js'
import { winPct, texteEval } from './format.js'

const BRASS = '#81b64c'
const IVOIRE = '#ece3cc'
const FOND = '#0b0c0f'

// { cp, mate } (point de vue blanc) → part blanche 0..1.
function partBlanche({ cp, mate }) {
  if (mate != null) return mate > 0 ? 0.985 : 0.015
  const pct = winPct(cp) / 100
  return Math.min(0.985, Math.max(0.015, pct))
}

export default function EvalBar({ evaluation, enCours = false, orientation = 'white', hauteur = 480 }) {
  const cible = evaluation ? partBlanche(evaluation) : 0.5
  const [part, setPart] = useState(0.5)
  useEffect(() => {
    const id = requestAnimationFrame(() => setPart(cible))
    return () => cancelAnimationFrame(id)
  }, [cible])

  const blancEnHaut = orientation === 'black'
  const blancDevant = part >= 0.5
  const pct = `${part * 100}%`
  const blocBlanc = blancEnHaut ? { top: 0, height: pct } : { bottom: 0, height: pct }
  const labelEnBas = blancDevant === !blancEnHaut
  const texte = evaluation ? texteEval(evaluation) : '–'

  return (
    <div
      aria-label={`Évaluation ${texte}`}
      style={{
        position: 'relative', width: 24, height: hauteur, borderRadius: 8,
        overflow: 'hidden', background: FOND,
        border: `1px solid rgba(129,182,76,0.30)`,
        boxShadow: 'inset 0 0 14px rgba(0,0,0,.55)',
        flex: '0 0 auto', opacity: enCours ? 0.92 : 1,
        transition: 'opacity .2s',
      }}
    >
      <div style={{
        position: 'absolute', left: 0, right: 0, ...blocBlanc,
        background: `linear-gradient(${blancEnHaut ? 180 : 0}deg, ${IVOIRE}, #f4ecdb)`,
        transition: 'height .42s cubic-bezier(.4,0,.2,1)',
      }} />
      <div style={{
        position: 'absolute', left: 0, right: 0, top: '50%', height: 1,
        background: 'rgba(129,182,76,0.5)',
      }} />
      <div style={{
        position: 'absolute', left: 0, right: 0,
        ...(labelEnBas ? { bottom: 4 } : { top: 4 }),
        textAlign: 'center',
        font: `800 10px ${fonts.mono}`, fontVariantNumeric: 'tabular-nums',
        color: blancDevant ? '#15110a' : BRASS,
        textShadow: blancDevant ? 'none' : '0 1px 2px rgba(0,0,0,.6)',
      }}>
        {texte}
      </div>
    </div>
  )
}
