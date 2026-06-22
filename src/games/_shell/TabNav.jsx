// TabNav — navigation par onglets de l'univers (Jouer · Règles · Classement · Paramètres).
// Actif = accent + soulignement net ; hover subtil ; inactif muté. tabular-nums n/a ici.
// Accessibilité : pattern WAI-ARIA tabs (roving tabindex + flèches ←/→), focus-visible,
// scroll horizontal sur mobile pour éviter le débordement.
import { useRef } from 'react'
import { motion } from 'framer-motion'
import { ui, fonts } from '../../features/games/neutralTheme.js'

export default function TabNav({ tabs, active, accent, onSelect }) {
  const refs = useRef([])

  const onKeyDown = (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Home' && e.key !== 'End') return
    e.preventDefault()
    const idx = tabs.findIndex((t) => t.id === active)
    let next = idx
    if (e.key === 'ArrowLeft') next = (idx - 1 + tabs.length) % tabs.length
    else if (e.key === 'ArrowRight') next = (idx + 1) % tabs.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = tabs.length - 1
    const t = tabs[next]
    if (t) { onSelect(t.id); refs.current[next]?.focus() }
  }

  return (
    <nav
      role="tablist" aria-label="Sections du jeu" onKeyDown={onKeyDown}
      className="gu-tabnav"
      style={{ display: 'flex', alignItems: 'stretch', gap: 2, overflowX: 'auto', maxWidth: '100%' }}>
      {tabs.map((t, i) => {
        const on = t.id === active
        return (
          <button
            key={t.id} ref={(el) => { refs.current[i] = el }}
            role="tab" id={`tab-${t.id}`} aria-controls={`panel-${t.id}`} aria-selected={on}
            tabIndex={on ? 0 : -1} type="button"
            className="gu-tab"
            onClick={() => onSelect(t.id)}
            style={{
              position: 'relative', appearance: 'none', border: 0, background: 'transparent',
              cursor: 'pointer', padding: '0 14px', height: '100%', display: 'inline-flex',
              alignItems: 'center', gap: 7, font: `600 13.5px ${fonts.body}`, letterSpacing: '.01em',
              color: on ? ui.text : ui.textDim, transition: 'color .16s', whiteSpace: 'nowrap', flexShrink: 0,
            }}
            onMouseEnter={(e) => { if (!on) e.currentTarget.style.color = ui.text }}
            onMouseLeave={(e) => { if (!on) e.currentTarget.style.color = ui.textDim }}
          >
            {t.icon && <span aria-hidden style={{ opacity: on ? 1 : 0.7, display: 'inline-flex' }}>{t.icon}</span>}
            {t.label}
            {on && (
              <motion.span layoutId="tab-underline" aria-hidden
                style={{ position: 'absolute', left: 10, right: 10, bottom: -1, height: 2, borderRadius: 2, background: accent }} />
            )}
          </button>
        )
      })}
      <style>{`
        .gu-tabnav{ scrollbar-width:none; -ms-overflow-style:none; }
        .gu-tabnav::-webkit-scrollbar{ display:none; }
        .gu-tab:focus-visible{ outline:2px solid ${accent}; outline-offset:2px; border-radius:6px; }
      `}</style>
    </nav>
  )
}
