// Primitives UI sobres et partagées des onglets Dames. Inline styles only.
// Accent = bleu-acier de l'univers (passé en prop). Focus visible, états hover/
// actif/désactivé travaillés. Zéro emoji déco, zéro hairline gris systématique.
import { useState } from 'react'
import { ui, fonts } from '../../../features/games/neutralTheme.js'

// Bouton segmenté (onglet de mode / niveau).
export function Segment({ items, value, onChange, accent = ui.accent, size = 'md' }) {
  const pad = size === 'sm' ? '6px 11px' : '8px 15px'
  const fs = size === 'sm' ? 12 : 13
  return (
    <div role="tablist" style={{ display: 'inline-flex', background: ui.surface, border: `1px solid ${ui.line}`, borderRadius: ui.radius.pill, padding: 4, gap: 3 }}>
      <style>{`.dc-seg:focus-visible{ outline:2px solid ${accent}; outline-offset:2px; border-radius:${ui.radius.pill}px; }`}</style>
      {items.map(([id, label]) => {
        const on = value === id
        return (
          <button key={id} role="tab" aria-selected={on} onClick={() => onChange(id)}
            className="dc-seg"
            style={{
              appearance: 'none', border: 0, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600,
              fontSize: fs, letterSpacing: '.2px', padding: pad, borderRadius: ui.radius.pill,
              background: on ? accent : 'transparent', color: on ? '#0c1115' : ui.textDim,
              boxShadow: on ? `0 2px 10px ${accent}44` : 'none', transition: 'background .16s, color .16s',
            }}>{label}</button>
        )
      })}
    </div>
  )
}

// Bouton d'action (label) avec variante.
export function Btn({ children, onClick, accent = ui.accent, variant = 'ghost', disabled, title, danger, full, type = 'button' }) {
  const [h, setH] = useState(false)
  const primary = variant === 'primary'
  const base = {
    appearance: 'none', cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: fonts.body,
    fontWeight: 600, fontSize: 13.5, letterSpacing: '.2px', padding: '9px 16px', borderRadius: ui.radius.md,
    width: full ? '100%' : undefined, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    gap: 8, transition: 'background .15s, border-color .15s, transform .08s', opacity: disabled ? 0.4 : 1,
  }
  let style
  if (primary) style = { ...base, border: `1px solid ${accent}`, background: h && !disabled ? accent : `${accent}d8`, color: '#0c1115' }
  else if (danger) style = { ...base, border: `1px solid ${h && !disabled ? ui.bad : ui.line}`, background: h && !disabled ? `${ui.bad}1f` : ui.surface, color: h && !disabled ? '#f0a99e' : ui.textDim }
  else style = { ...base, border: `1px solid ${h && !disabled ? ui.lineHi : ui.line}`, background: h && !disabled ? ui.surfaceHi : ui.surface, color: ui.text }
  return (
    <>
      <style>{`.dc-btn:focus-visible{ outline:2px solid ${accent}; outline-offset:2px; }`}</style>
      <button type={type} onClick={disabled ? undefined : onClick} disabled={disabled} title={title}
        className="dc-btn"
        onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
        onMouseDown={(e) => { if (!disabled) e.currentTarget.style.transform = 'translateY(1px)' }}
        onMouseUp={(e) => { e.currentTarget.style.transform = 'none' }}
        style={style}>{children}</button>
    </>
  )
}

// Panneau / carte.
export function Panel({ children, style, pad = 18 }) {
  return <div style={{ background: ui.surface, border: `1px solid ${ui.line}`, borderRadius: ui.radius.lg, padding: pad, ...style }}>{children}</div>
}

// En-tête de section (titre + sous-titre).
export function SectionTitle({ children, hint, accent = ui.accent }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span aria-hidden style={{ width: 4, height: 16, borderRadius: 2, background: accent }} />
        <h3 style={{ margin: 0, fontFamily: fonts.display, fontWeight: 700, fontSize: 17, color: ui.text, letterSpacing: '.2px' }}>{children}</h3>
      </div>
      {hint && <p style={{ margin: '6px 0 0 14px', fontFamily: fonts.body, fontSize: 13, lineHeight: 1.55, color: ui.textDim }}>{hint}</p>}
    </div>
  )
}

// Interrupteur (toggle) accessible.
export function Toggle({ checked, onChange, accent = ui.accent, label, id }) {
  return (
    <>
      <style>{`.dc-toggle:focus-visible{ outline:2px solid ${accent}; outline-offset:2px; }`}</style>
      <button role="switch" aria-checked={checked} aria-label={label} id={id} onClick={() => onChange(!checked)}
        className="dc-toggle"
        style={{ appearance: 'none', cursor: 'pointer', border: 0, padding: 0, width: 44, height: 26, borderRadius: 999, position: 'relative', background: checked ? accent : ui.surfaceHi, transition: 'background .18s', flexShrink: 0 }}>
        <span aria-hidden style={{ position: 'absolute', top: 3, left: checked ? 21 : 3, width: 20, height: 20, borderRadius: '50%', background: checked ? '#0c1115' : ui.textDim, transition: 'left .18s', boxShadow: '0 1px 3px rgba(0,0,0,.4)' }} />
      </button>
    </>
  )
}

// Ligne de réglage (label + contrôle à droite).
export function SettingRow({ title, desc, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18, padding: '12px 0', borderTop: `1px solid ${ui.line}` }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: fonts.body, fontWeight: 600, fontSize: 14, color: ui.text }}>{title}</div>
        {desc && <div style={{ fontFamily: fonts.body, fontSize: 12.5, lineHeight: 1.5, color: ui.textMute, marginTop: 3 }}>{desc}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  )
}
