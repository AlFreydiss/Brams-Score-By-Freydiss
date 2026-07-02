// ── BotPicker : sélecteur d'adversaire (carrousel horizontal de cartes bot) ──
// Remplace la grille « Niveau de l'IA » dans ConfigJeu. Cartes triées par ELO
// croissant : avatar emoji rond sur pastille dégradée, nom, chip ELO, tagline
// révélée au survol/sélection. Sélection = liseré vert cc.green + léger scale.
// Accessible : pattern radiogroup (roving tabindex), flèches clavier, Home/End,
// focus-visible net, prefers-reduced-motion respecté. Scroll-snap sur mobile.
// Props : { bots, selectedId, onSelect } — présentation pure, aucun état métier.
import { useState, useEffect, useRef, useMemo } from 'react'
import { ui, fonts } from '../../../features/games/neutralTheme.js'
import { cc } from '../ui/chesscom.js'

function useReducedMotion() {
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!mq) return undefined
    const on = () => setReduced(mq.matches)
    mq.addEventListener?.('change', on)
    return () => mq.removeEventListener?.('change', on)
  }, [])
  return reduced
}

export default function BotPicker({ bots, selectedId, onSelect }) {
  const tries = useMemo(() => [...bots].sort((a, b) => a.elo - b.elo), [bots])
  const [hoverId, setHoverId] = useState(null)
  const [focusId, setFocusId] = useState(null)     // focus clavier (:focus-visible) uniquement
  const refs = useRef({})
  const reduced = useReducedMotion()

  const idx = Math.max(0, tries.findIndex(b => b.id === selectedId))

  // La carte sélectionnée reste visible (retour sur la config, flèches clavier).
  useEffect(() => {
    const el = refs.current[selectedId]
    if (el?.scrollIntoView) {
      el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'nearest', inline: 'nearest' })
    }
  }, [selectedId, reduced])

  const onKeyDown = (e) => {
    let ni = null
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') ni = Math.min(tries.length - 1, idx + 1)
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') ni = Math.max(0, idx - 1)
    else if (e.key === 'Home') ni = 0
    else if (e.key === 'End') ni = tries.length - 1
    if (ni === null) return
    e.preventDefault()
    const b = tries[ni]
    if (b.id !== selectedId) onSelect(b.id)
    refs.current[b.id]?.focus({ preventScroll: true })
  }

  return (
    <div
      role="radiogroup"
      aria-label="Choisis ton adversaire"
      onKeyDown={onKeyDown}
      style={{
        display: 'flex', gap: 8, overflowX: 'auto', padding: '4px 2px 10px',
        scrollSnapType: 'x proximity', WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'thin', scrollbarColor: `${ui.lineHi} transparent`,
      }}
    >
      {tries.map(b => {
        const actif = b.id === selectedId
        const hover = hoverId === b.id
        const focus = focusId === b.id
        const accent = b.couleurAccent || cc.green
        const taglineVisible = actif || hover || focus
        return (
          <button
            key={b.id}
            ref={el => { refs.current[b.id] = el }}
            role="radio"
            aria-checked={actif}
            aria-label={`${b.nom}, ${b.elo} ELO — ${b.tagline}`}
            tabIndex={actif ? 0 : -1}
            onClick={() => onSelect(b.id)}
            onMouseEnter={() => setHoverId(b.id)}
            onMouseLeave={() => setHoverId(h => (h === b.id ? null : h))}
            onFocus={e => { if (e.currentTarget.matches?.(':focus-visible')) setFocusId(b.id) }}
            onBlur={() => setFocusId(f => (f === b.id ? null : f))}
            style={{
              flex: '0 0 auto', width: 150, padding: '14px 10px 10px', boxSizing: 'border-box',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
              borderRadius: ui.radius.md, cursor: 'pointer', textAlign: 'center',
              scrollSnapAlign: 'start',
              background: actif ? 'rgba(129,182,76,0.10)' : hover ? ui.surfaceHi : ui.surface,
              border: `1px solid ${actif ? cc.green : hover ? ui.lineHi : ui.line}`,
              boxShadow: actif
                ? `0 0 0 1px ${cc.green}, 0 12px 26px -16px rgba(129,182,76,0.55)`
                : 'none',
              outline: focus ? `2px solid ${cc.greenHi}` : 'none',
              outlineOffset: 2,
              transform: actif && !reduced ? 'scale(1.03)' : 'scale(1)',
              transition: reduced ? 'none' : 'transform .16s ease, background .15s, border-color .15s, box-shadow .18s',
            }}
          >
            <span aria-hidden style={{
              width: 52, height: 52, borderRadius: '50%', flex: '0 0 auto',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 26, lineHeight: 1,
              background: `linear-gradient(140deg, ${accent}52, ${accent}1A 62%, rgba(0,0,0,0.25))`,
              border: `1px solid ${actif ? cc.green : `${accent}66`}`,
              boxShadow: `inset 0 1px 0 rgba(255,255,255,0.08), 0 8px 18px -10px ${accent}88`,
            }}>{b.emoji}</span>

            <span style={{
              font: `700 12.5px ${fonts.body}`, color: actif ? '#e7d8b8' : ui.text,
              lineHeight: 1.25, minHeight: 31, display: 'flex', alignItems: 'center',
            }}>{b.nom}</span>

            <span style={{
              font: `700 10.5px ${fonts.mono}`, fontVariantNumeric: 'tabular-nums',
              color: actif ? cc.greenHi : ui.textMute,
              padding: '2px 8px', borderRadius: ui.radius.pill,
              background: actif ? 'rgba(129,182,76,0.12)' : 'rgba(0,0,0,0.22)',
              border: `1px solid ${actif ? 'rgba(129,182,76,0.5)' : ui.line}`,
            }}>{b.elo} ELO</span>

            {/* hauteur réservée : la tagline apparaît sans décaler la rangée */}
            <span aria-hidden style={{
              font: `400 10.5px ${fonts.body}`, color: ui.textDim, lineHeight: 1.35,
              height: 42, overflow: 'hidden', display: 'block',
              opacity: taglineVisible ? 1 : 0,
              transition: reduced ? 'none' : 'opacity .18s ease',
            }}>{b.tagline}</span>
          </button>
        )
      })}
    </div>
  )
}
