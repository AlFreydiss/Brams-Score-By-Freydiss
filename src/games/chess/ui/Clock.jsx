// ── Clock : pendule d'un camp, ISOLÉE du board ──────────────────────────────
// S'abonne à useLocalClock.souscrire() et se rafraîchit SEULE (state interne).
// Aucun tic ne remonte à PlayTab → le board ne se re-render pas chaque 1/10 s.
import { useState, useEffect, useRef } from 'react'
import { ui, fonts } from '../../../features/games/neutralTheme.js'
import { formaterTemps } from './format.js'

const SEUIL_CRITIQUE = 10000

export default function Clock({ horloge, camp, actif, compact = false }) {
  const [ms, setMs] = useState(() => horloge.lire()[camp])
  const rafRef = useRef(0)

  useEffect(() => {
    // valeur initiale à la (re)monte
    setMs(horloge.lire()[camp])
    const desabonner = horloge.souscrire((etat) => {
      // throttle d'affichage au rAF pour rester fluide sans surcharger
      cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(() => setMs(etat[camp]))
    })
    return () => { desabonner(); cancelAnimationFrame(rafRef.current) }
  }, [horloge, camp])

  const critique = actif && ms !== Infinity && ms < SEUIL_CRITIQUE
  const couleur = critique ? ui.bad : (actif ? ui.text : ui.textDim)

  return (
    <div
      role="timer"
      aria-label={`Temps ${camp === 'w' ? 'blancs' : 'noirs'}`}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
        minWidth: compact ? 80 : 104, padding: compact ? '4px 10px' : '7px 14px',
        borderRadius: ui.radius.sm,
        background: actif ? ui.surfaceHi : ui.surface,
        border: `1px solid ${critique ? 'rgba(212,104,90,0.55)' : (actif ? ui.lineHi : ui.line)}`,
        boxShadow: actif ? 'inset 0 0 0 1px rgba(255,255,255,0.03)' : 'none',
        transition: 'background .18s, border-color .18s',
      }}
    >
      <span style={{
        font: `700 ${compact ? 17 : 21}px ${fonts.mono}`,
        fontVariantNumeric: 'tabular-nums',
        letterSpacing: '0.02em', color: couleur,
        fontFeatureSettings: '"tnum" 1',
      }}>
        {formaterTemps(ms)}
      </span>
    </div>
  )
}
