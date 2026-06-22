// src/features/nouveau-monde/game/SettingsDrawer.jsx
// Tiroir de réglages GÉNÉRIQUE piloté par un SCHÉMA DÉCLARATIF (le truc clé du socle).
// Chaque réglage : { key, label, type, options?, min?, max?, step?, group, hint? }
//   type ∈ toggle | select | segmented | slider | color
// → On ajoute autant de "réglages de fou" qu'on veut sur n'importe quel jeu SANS recoder l'UI.
// Inline styles only · framer-motion · accessible clavier (Échap ferme, focus visibles).

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo } from 'react'
import { nm } from '../theme/tokens'

function Row({ item, value, onChange }) {
  const v = value
  const ctl = (() => {
    switch (item.type) {
      case 'toggle':
        return (
          <button
            type="button" role="switch" aria-checked={!!v} aria-label={item.label}
            onClick={() => onChange(item.key, !v)}
            style={{
              width: 46, height: 26, borderRadius: 999, cursor: 'pointer', flexShrink: 0,
              border: `1px solid ${v ? nm.color.gold : nm.color.mist}`, padding: 2,
              background: v ? `linear-gradient(135deg, ${nm.color.goldHi}, ${nm.color.gold})` : 'rgba(6,20,31,0.6)',
              transition: 'background .2s, border-color .2s', position: 'relative',
            }}
          >
            <motion.span animate={{ x: v ? 20 : 0 }} transition={{ type: 'spring', stiffness: 500, damping: 32 }}
              style={{ display: 'block', width: 20, height: 20, borderRadius: '50%', background: v ? nm.color.abyss : nm.color.foamDim }} />
          </button>
        )
      case 'segmented':
        return (
          <div role="radiogroup" aria-label={item.label} style={{ display: 'inline-flex', gap: 3, padding: 3, borderRadius: nm.radius.pill, background: 'rgba(6,20,31,0.6)', border: `1px solid ${nm.color.mist}`, flexShrink: 0 }}>
            {item.options.map((o) => {
              const on = v === o.value
              return (
                <button key={o.value} type="button" role="radio" aria-checked={on} onClick={() => onChange(item.key, o.value)}
                  style={{ ...nm.type.small, cursor: 'pointer', padding: '5px 11px', minHeight: 24, borderRadius: nm.radius.pill, border: 'none',
                    color: on ? nm.color.abyss : nm.color.foam, fontWeight: on ? 700 : 500,
                    background: on ? `linear-gradient(135deg, ${nm.color.goldHi}, ${nm.color.gold})` : 'transparent', transition: 'background .2s,color .2s' }}>
                  {o.label}
                </button>
              )
            })}
          </div>
        )
      case 'select':
        return (
          <select value={v} onChange={(e) => onChange(item.key, e.target.value)} aria-label={item.label}
            style={{ ...nm.type.small, cursor: 'pointer', color: nm.color.foam, background: 'rgba(6,20,31,0.85)', border: `1px solid ${nm.color.mist}`, borderRadius: nm.radius.sm, padding: '7px 10px', minWidth: 150, maxWidth: 220 }}>
            {item.options.map((o) => <option key={o.value} value={o.value} style={{ background: nm.color.deepSea }}>{o.label}</option>)}
          </select>
        )
      case 'slider': {
        const min = item.min ?? 0, max = item.max ?? 1, step = item.step ?? 0.01
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <input type="range" min={min} max={max} step={step} value={v} aria-label={item.label}
              onChange={(e) => onChange(item.key, parseFloat(e.target.value))}
              style={{ width: 130, accentColor: nm.color.gold, cursor: 'pointer' }} />
            <span style={{ ...nm.type.small, color: nm.color.foamDim, minWidth: 34, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
              {item.format ? item.format(v) : v}
            </span>
          </div>
        )
      }
      case 'color':
        return (
          <input type="color" value={v} onChange={(e) => onChange(item.key, e.target.value)} aria-label={item.label}
            style={{ width: 40, height: 28, border: `1px solid ${nm.color.mist}`, borderRadius: nm.radius.sm, background: 'transparent', cursor: 'pointer', flexShrink: 0 }} />
        )
      default:
        return null
    }
  })()

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: nm.space.md, padding: '11px 0', borderBottom: `1px solid ${nm.color.mist}` }}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ ...nm.type.body, fontSize: '0.92rem', color: nm.color.foam }}>{item.label}</div>
        {item.hint && <div style={{ ...nm.type.small, fontSize: '0.78rem', color: nm.color.foamDim }}>{item.hint}</div>}
      </div>
      {ctl}
    </div>
  )
}

export default function SettingsDrawer({ open, onClose, schema = [], value = {}, onChange, title = 'Paramètres', onReset }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Regroupe par `group` en conservant l'ordre d'apparition.
  const groups = useMemo(() => {
    const order = []
    const map = {}
    for (const it of schema) {
      const g = it.group || 'Général'
      if (!map[g]) { map[g] = []; order.push(g) }
      map[g].push(it)
    }
    return order.map((g) => [g, map[g]])
  }, [schema])

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
            onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: nm.z.toast, background: 'rgba(3,10,18,0.55)', backdropFilter: 'blur(2px)' }} />
          <motion.aside
            role="dialog" aria-label={title} aria-modal="true"
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 36 }}
            style={{
              position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: nm.z.toast + 1,
              width: 'min(420px, 92vw)', display: 'flex', flexDirection: 'column',
              background: `linear-gradient(180deg, ${nm.color.deepSea}, ${nm.color.abyss})`,
              borderLeft: `1px solid ${nm.color.gold}44`, boxShadow: nm.shadow.island,
            }}
          >
            <header style={{ display: 'flex', alignItems: 'center', gap: nm.space.md, padding: `${nm.space.lg} ${nm.space.lg} ${nm.space.md}` }}>
              <div style={{ ...nm.type.posterTitle, fontSize: '1.2rem', color: nm.color.foam, marginRight: 'auto' }}>{title}</div>
              {onReset && (
                <button type="button" onClick={onReset} style={{ ...nm.type.small, cursor: 'pointer', color: nm.color.foamDim, background: 'none', border: `1px solid ${nm.color.mist}`, borderRadius: nm.radius.pill, padding: '6px 12px' }}>Réinitialiser</button>
              )}
              <button type="button" aria-label="Fermer" onClick={onClose} style={{ cursor: 'pointer', color: nm.color.foam, background: 'rgba(6,20,31,0.6)', border: `1px solid ${nm.color.mist}`, borderRadius: '50%', width: 34, height: 34, fontSize: 18, lineHeight: 1 }}>×</button>
            </header>
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: `0 ${nm.space.lg} ${nm.space.xl}` }}>
              {groups.map(([g, items]) => (
                <section key={g} style={{ marginTop: nm.space.lg }}>
                  <div style={{ ...nm.type.eyebrow, color: nm.color.goldHi, marginBottom: 4 }}>{g}</div>
                  {items.map((it) => <Row key={it.key} item={it} value={value[it.key]} onChange={onChange} />)}
                </section>
              ))}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
