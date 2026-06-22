// TabNav — navigation par onglets de l'univers (Jouer · Règles · Classement · Paramètres).
// Actif = accent + soulignement net ; hover subtil ; inactif muté. tabular-nums n/a ici.
import { motion } from 'framer-motion'
import { ui, fonts } from '../../features/games/neutralTheme.js'

export default function TabNav({ tabs, active, accent, onSelect }) {
  return (
    <nav role="tablist" aria-label="Sections du jeu" style={{ display: 'flex', alignItems: 'stretch', gap: 2 }}>
      {tabs.map((t) => {
        const on = t.id === active
        return (
          <button
            key={t.id} role="tab" aria-selected={on} type="button"
            onClick={() => onSelect(t.id)}
            style={{
              position: 'relative', appearance: 'none', border: 0, background: 'transparent',
              cursor: 'pointer', padding: '0 14px', height: '100%', display: 'inline-flex',
              alignItems: 'center', gap: 7, font: `600 13.5px ${fonts.body}`, letterSpacing: '.01em',
              color: on ? ui.text : ui.textDim, transition: 'color .16s',
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
    </nav>
  )
}
