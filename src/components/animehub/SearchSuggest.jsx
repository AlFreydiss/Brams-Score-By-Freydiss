// ── SearchSuggest — résultats instantanés sous la recherche du hub ───────────
// Dès la première lettre : affiches, type, progression, et le scan lié quand
// la série en a un. ↑/↓ pour choisir, Entrée pour ouvrir, Échap pour fermer.
// La grille filtrée sous la barre reste là pour qui veut tout voir.
import { motion } from 'framer-motion'
import { C, FONT_BODY } from './tokens.js'

const fmt = (n) => (Number.isInteger(n) ? String(n) : String(Math.floor(n)))

export default function SearchSuggest({ items, active, onHover, onPick, total }) {
  if (!items.length) return null
  return (
    <motion.div role="listbox" id="ah2-suggest" aria-label="Résultats"
      initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.16 }}
      onMouseDown={(e) => e.preventDefault() /* garde le focus dans le champ */}
      style={{
        position: 'absolute', top: 'calc(100% + 8px)', left: 0, zIndex: 8, width: 'min(420px, calc(100vw - 28px))',
        maxHeight: 'min(460px, 70vh)', overflowY: 'auto', padding: 6, borderRadius: 14, fontFamily: FONT_BODY,
        background: '#10141E', border: `1px solid ${C.hair2}`, boxShadow: '0 24px 60px -24px rgba(0,0,0,.9)',
      }}>
      {items.map((it, i) => {
        const on = i === active
        return (
          <div key={it.key} id={`ah2-sg-${i}`} role="option" aria-selected={on}
            onMouseEnter={() => onHover(i)} onClick={() => onPick(it)}
            style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: 8, borderRadius: 10, cursor: 'pointer',
              background: on ? 'rgba(255,255,255,0.07)' : 'transparent',
            }}>
            <span style={{ position: 'relative', width: 42, height: 60, flexShrink: 0, borderRadius: 7, overflow: 'hidden', background: 'rgba(255,255,255,.05)' }}>
              <img src={it.cover} alt="" loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              {it.pct > 0 && (
                <span aria-hidden style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, background: 'rgba(0,0,0,.5)' }}>
                  <span style={{ display: 'block', width: `${Math.min(100, it.pct)}%`, height: '100%', background: C.brass }} />
                </span>
              )}
            </span>
            <span style={{ minWidth: 0, flex: 1 }}>
              <span style={{ display: 'block', fontSize: 14, fontWeight: 650, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.title}</span>
              <span style={{ display: 'block', fontSize: 12, color: C.dim, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.meta}</span>
            </span>
            <span style={{
              flexShrink: 0, padding: '3px 8px', borderRadius: 6, fontSize: 10.5, fontWeight: 800, letterSpacing: '0.02em',
              background: it.kind === 'scan' ? 'rgba(215,164,74,.14)' : 'rgba(255,255,255,.08)', color: it.kind === 'scan' ? C.brass : C.dim,
            }}>{it.kind === 'scan' ? (it.resume != null ? `CH. ${fmt(it.resume)}` : 'SCAN') : it.pct > 0 ? 'REPRENDRE' : '▶'}</span>
          </div>
        )
      })}
      {total > items.length && (
        <div style={{ padding: '8px 10px 4px', fontSize: 12, color: C.faint }}>
          Entrée sans sélection : voir les {total} résultats
        </div>
      )}
    </motion.div>
  )
}
