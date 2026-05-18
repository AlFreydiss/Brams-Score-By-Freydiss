import { useState, useRef, useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import { CHARACTERS, RELATIONS, TREE_CONFIGS, LINK_COLORS, HAKI_COLORS } from '../data/tree-data.js'

// ── Constants ─────────────────────────────────────────────────────────────────

const CANVAS_W = 5000
const CANVAS_H = 3000
const POSTER_W = 168
const POSTER_H = 252
const ROOT_S   = 1.28
const INNER_S  = 0.90
const OUTER_S  = 0.74
const H_SPACE  = 244
const V_SPACE  = 355

// ── Seeded tilt per poster ────────────────────────────────────────────────────

function posterTilt(id) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (Math.imul(31, h) + id.charCodeAt(i)) | 0
  const r = Math.abs(h * 1664525 + 1013904223) % 10000 / 10000
  return r * 14 - 7   // -7° … +7°
}

// ── 2D layout : tree ──────────────────────────────────────────────────────────

function computeTreeLayout2D(charIds, rels, rootId) {
  const children = {}
  charIds.forEach(id => { children[id] = [] })
  rels
    .filter(r => charIds.includes(r.from) && charIds.includes(r.to) &&
                 (r.type === 'parent' || r.type === 'hierarchy'))
    .forEach(r => children[r.from].push(r.to))

  const levels  = { [rootId]: 0 }
  const queue   = [rootId]
  const visited = new Set([rootId])
  while (queue.length) {
    const id = queue.shift()
    ;(children[id] || []).forEach(kid => {
      if (!visited.has(kid)) {
        visited.add(kid); levels[kid] = levels[id] + 1; queue.push(kid)
      }
    })
  }
  const maxLv = Math.max(...Object.values(levels), 0)
  charIds.forEach(id => { if (levels[id] === undefined) levels[id] = maxLv + 1 })

  const byLevel = {}
  charIds.forEach(id => {
    const lv = levels[id]
    ;(byLevel[lv] = byLevel[lv] || []).push(id)
  })

  const levelNums = Object.keys(byLevel).map(Number)
  const totalH    = Math.max(...levelNums) * V_SPACE

  const positions = {}
  levelNums.forEach(lv => {
    const ids    = byLevel[lv]
    const totalW = (ids.length - 1) * H_SPACE
    const sc     = lv === 0 ? ROOT_S : lv === 1 ? INNER_S : OUTER_S
    ids.forEach((id, i) => {
      positions[id] = {
        x: CANVAS_W / 2 + i * H_SPACE - totalW / 2,
        y: CANVAS_H / 2 - totalH / 2 + lv * V_SPACE,
        scale: sc,
      }
    })
  })
  return positions
}

// ── 2D layout : radial ────────────────────────────────────────────────────────

function computeRadialLayout2D(charIds, rels, rootId) {
  const others = charIds.filter(id => id !== rootId)
  if (!others.length) return { [rootId]: { x: CANVAS_W / 2, y: CANVAS_H / 2, scale: ROOT_S } }

  // BFS distances (undirected, all relations)
  const adj = {}
  charIds.forEach(id => { adj[id] = [] })
  rels.forEach(r => {
    if (charIds.includes(r.from) && charIds.includes(r.to)) {
      adj[r.from].push(r.to); adj[r.to].push(r.from)
    }
  })
  const dist    = { [rootId]: 0 }
  const q       = [rootId]
  const vis     = new Set([rootId])
  while (q.length) {
    const id = q.shift()
    ;(adj[id] || []).forEach(nid => {
      if (!vis.has(nid)) { vis.add(nid); dist[nid] = dist[id] + 1; q.push(nid) }
    })
  }
  others.forEach(id => { if (dist[id] === undefined) dist[id] = 2 })

  const byRing = {}
  others.forEach(id => {
    const d = Math.min(dist[id], 3)
    ;(byRing[d] = byRing[d] || []).push(id)
  })

  const maxInRing = Math.max(...Object.values(byRing).map(a => a.length), 1)
  const baseR     = Math.max(310, maxInRing * 50)
  const RADII     = [0, baseR, baseR * 1.72, baseR * 2.35]
  const SCALES    = [ROOT_S, INNER_S, OUTER_S, 0.60]

  const positions = { [rootId]: { x: CANVAS_W / 2, y: CANVAS_H / 2, scale: ROOT_S } }
  Object.entries(byRing).forEach(([ring, ids]) => {
    const r      = parseInt(ring)
    const radius = RADII[r] ?? RADII[3]
    const sc     = SCALES[r] ?? 0.60
    ids.forEach((id, i) => {
      const angle = (i / ids.length) * Math.PI * 2 - Math.PI / 2
      positions[id] = {
        x: CANVAS_W / 2 + Math.cos(angle) * radius,
        y: CANVAS_H / 2 + Math.sin(angle) * radius,
        scale: sc,
      }
    })
  })
  return positions
}

// ── Poster visual ─────────────────────────────────────────────────────────────

function PosterCard({ char, sc, selected, hovered }) {
  const hc = char.color || '#8b0000'
  const W  = POSTER_W * sc
  const H  = POSTER_H * sc

  return (
    <div style={{
      width: W, height: H, position: 'relative',
      background: 'linear-gradient(175deg,#FAF0DC 0%,#F2E4B8 38%,#E8D49E 72%,#DEC882 100%)',
      borderRadius: 3 * sc,
      border: selected
        ? `${2 * sc}px solid ${hc}`
        : `${1.5 * sc}px solid rgba(55,28,6,0.52)`,
      boxShadow: selected
        ? `0 0 0 ${2.5 * sc}px ${hc}44, ${6 * sc}px ${10 * sc}px ${22 * sc}px rgba(0,0,0,0.65)`
        : hovered
        ? `${5 * sc}px ${7 * sc}px ${18 * sc}px rgba(0,0,0,0.52)`
        : `${3 * sc}px ${5 * sc}px ${11 * sc}px rgba(0,0,0,0.38)`,
      overflow: 'hidden',
      fontFamily: "'Georgia', serif",
    }}>

      {/* Conqueror haki glow */}
      {char.haki.includes('conqueror') && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 6,
          boxShadow: `inset 0 0 ${14 * sc}px ${5 * sc}px rgba(212,160,23,${selected ? 0.24 : 0.09})`,
          borderRadius: 3 * sc,
        }} />
      )}

      {/* Corner burns */}
      {[[0, 0], [1, 0], [0, 1], [1, 1]].map(([cx, cy], i) => (
        <div key={i} style={{
          position: 'absolute',
          [cy ? 'bottom' : 'top']: 0,
          [cx ? 'right' : 'left']: 0,
          width: 28 * sc, height: 28 * sc,
          background: `radial-gradient(circle at ${cx ? '100%' : '0%'} ${cy ? '100%' : '0%'}, rgba(60,25,5,0.28) 0%, transparent 70%)`,
          pointerEvents: 'none', zIndex: 2,
        }} />
      ))}

      {/* Header */}
      <div style={{
        background: hc + 'e0',
        padding: `${5 * sc}px 0 ${4 * sc}px`,
        textAlign: 'center', lineHeight: 1,
        position: 'relative', zIndex: 3,
      }}>
        <div style={{
          fontFamily: "'Cinzel','Georgia',serif",
          fontSize: 13.5 * sc, fontWeight: 900,
          color: '#FAF0DC', letterSpacing: '0.16em',
          textShadow: `0 1px ${3 * sc}px rgba(0,0,0,0.9)`,
        }}>WANTED</div>
        <div style={{
          fontFamily: "'IM Fell English',serif", fontStyle: 'italic',
          fontSize: 6.5 * sc, color: 'rgba(250,240,220,0.8)', letterSpacing: '0.12em',
          marginTop: 1 * sc,
        }}>DEAD OR ALIVE</div>
      </div>

      {/* Gold rule */}
      <div style={{ height: 1, background: 'rgba(212,168,50,0.45)', position: 'relative', zIndex: 3 }} />

      {/* Photo frame */}
      <div style={{
        margin: `${3 * sc}px ${6 * sc}px ${2 * sc}px`,
        height: POSTER_H * sc * 0.43,
        background: 'rgba(0,0,0,0.1)',
        border: `${1.5 * sc}px solid ${hc}70`,
        borderRadius: 2 * sc,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden', zIndex: 3,
      }}>
        <span style={{ fontSize: 42 * sc, lineHeight: 1, userSelect: 'none' }}>{char.emoji || '?'}</span>
        {char.status === 'dead' && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none',
          }}>
            <div style={{
              color: 'rgba(65,30,6,0.48)',
              fontFamily: "'Cinzel',serif", fontSize: 10 * sc, fontWeight: 900,
              transform: 'rotate(-18deg)',
              border: `${1.5 * sc}px solid rgba(65,30,6,0.28)`,
              padding: `${1 * sc}px ${5 * sc}px`,
              letterSpacing: '0.08em',
            }}>DÉCÉDÉ</div>
          </div>
        )}
      </div>

      {/* Name */}
      <div style={{
        textAlign: 'center', padding: `${2 * sc}px ${5 * sc}px 0`,
        fontFamily: "'Cinzel','Georgia',serif",
        fontSize: 8 * sc, fontWeight: 700,
        color: '#1A0800', letterSpacing: '0.03em', lineHeight: 1.25,
        position: 'relative', zIndex: 3,
      }}>
        {char.name.length > 19 ? char.name.slice(0, 17) + '…' : char.name}
      </div>

      {/* Alias */}
      {char.alias && (
        <div style={{
          textAlign: 'center', fontSize: 5.8 * sc,
          fontFamily: "'IM Fell English',serif", fontStyle: 'italic',
          color: '#5C3A1A', padding: `${1 * sc}px ${5 * sc}px`,
          lineHeight: 1.2, position: 'relative', zIndex: 3,
        }}>
          "{char.alias.length > 22 ? char.alias.slice(0, 20) + '…' : char.alias}"
        </div>
      )}

      {/* Divider */}
      <div style={{
        height: 0.5, background: 'rgba(74,44,16,0.24)',
        margin: `${2 * sc}px ${9 * sc}px`, position: 'relative', zIndex: 3,
      }} />

      {/* Bounty */}
      {char.bounty && (
        <div style={{ position: 'relative', zIndex: 3 }}>
          <div style={{ textAlign: 'center', fontSize: 5.5 * sc, color: '#8A5A20', fontStyle: 'italic' }}>
            — PRIME —
          </div>
          <div style={{
            textAlign: 'center', fontSize: 7 * sc, fontWeight: 700,
            color: '#1A0800', letterSpacing: '0.02em',
          }}>
            {char.bounty}
          </div>
        </div>
      )}

      {/* Haki dots */}
      {char.haki.length > 0 && (
        <div style={{
          display: 'flex', justifyContent: 'center', gap: 4 * sc,
          padding: `${3 * sc}px 0 ${2 * sc}px`,
          position: 'relative', zIndex: 3,
        }}>
          {char.haki.map(h => (
            <div key={h} style={{
              width: 7 * sc, height: 7 * sc, borderRadius: '50%',
              background: HAKI_COLORS[h],
              boxShadow: `0 0 ${4 * sc}px ${HAKI_COLORS[h]}aa`,
            }} />
          ))}
        </div>
      )}

      {/* Inner gold border */}
      <div style={{
        position: 'absolute', inset: `${4 * sc}px`,
        border: '0.5px solid rgba(212,168,50,0.16)',
        borderRadius: 2 * sc, pointerEvents: 'none', zIndex: 5,
      }} />
    </div>
  )
}

// ── SVG connection lines ──────────────────────────────────────────────────────

function ConnectionLines({ rels, positions, hoveredId, selectedId }) {
  return (
    <svg style={{
      position: 'absolute', left: 0, top: 0,
      width: CANVAS_W, height: CANVAS_H,
      pointerEvents: 'none', overflow: 'visible',
    }}>
      {rels.map(rel => {
        const from = positions[rel.from]
        const to   = positions[rel.to]
        if (!from || !to) return null

        const x1 = from.x, y1 = from.y
        const x2 = to.x,   y2 = to.y
        const dx  = x2 - x1, dy = y2 - y1
        const len = Math.sqrt(dx * dx + dy * dy) || 1
        const nx  = -dy / len, ny = dx / len
        const cv  = len * 0.18 * (rel.type === 'enemy' ? -1 : 1)
        const qx  = (x1 + x2) / 2 + nx * cv
        const qy  = (y1 + y2) / 2 + ny * cv

        const color    = LINK_COLORS[rel.type] || '#d4a017'
        const isActive = rel.from === hoveredId || rel.to === hoveredId ||
                         rel.from === selectedId || rel.to === selectedId
        const isBg     = (hoveredId || selectedId) && !isActive

        return (
          <g key={rel.id}>
            <path
              d={`M ${x1} ${y1} Q ${qx} ${qy} ${x2} ${y2}`}
              fill="none"
              stroke={color}
              strokeWidth={isActive ? 2.8 : 1.6}
              strokeOpacity={isBg ? 0.07 : isActive ? 0.92 : 0.40}
              strokeDasharray={rel.type === 'enemy' ? '8 5' : undefined}
            />
            {isActive && rel.label && (
              <text
                x={qx} y={qy - 7}
                textAnchor="middle" dominantBaseline="middle"
                fill={color} fontSize={11} opacity={0.88}
                fontFamily="'IM Fell English',serif" fontStyle="italic"
                style={{ userSelect: 'none' }}
              >
                {rel.label}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

// ── Character detail ──────────────────────────────────────────────────────────

function CharDetail({ char, onClose, mangaMode }) {
  if (!char) return null
  const txt = mangaMode ? '#1a0800' : '#fff'
  const sub = mangaMode ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)'

  return (
    <div style={{ background: `${char.color}18`, border: `1px solid ${char.color}50`, borderRadius: 14, padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
        <div>
          <div style={{ fontFamily: "'Cinzel',serif", fontSize: 14, fontWeight: 700, color: txt, lineHeight: 1.3, letterSpacing: '0.04em' }}>
            {char.emoji} {char.name}
          </div>
          {char.alias && (
            <div style={{ fontSize: 12, color: char.color, fontStyle: 'italic', marginTop: 3 }}>"{char.alias}"</div>
          )}
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: sub, cursor: 'pointer', fontSize: 16, padding: 2 }}>✕</button>
      </div>

      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
        {char.haki.map(h => (
          <span key={h} style={{ fontSize: 10, fontWeight: 700, background: HAKI_COLORS[h] + '22', color: h === 'armament' ? '#94a3b8' : HAKI_COLORS[h], border: `1px solid ${HAKI_COLORS[h]}44`, borderRadius: 100, padding: '2px 9px' }}>
            {h === 'conqueror' ? '⚡ Conquérant' : h === 'armament' ? '⚫ Armement' : '👁 Observation'}
          </span>
        ))}
      </div>

      {char.devilFruit && (
        <div style={{ fontSize: 12, color: sub, marginBottom: 4 }}>🍎 <b style={{ color: txt }}>{char.devilFruit}</b></div>
      )}
      {char.bounty && (
        <div style={{ fontSize: 13, color: '#d4a017', fontWeight: 800, marginBottom: 4 }}>💰 {char.bounty}</div>
      )}
      <div style={{ fontSize: 11, fontWeight: 700, color: char.status === 'alive' ? '#34d399' : '#9ca3af', marginTop: 4 }}>
        {char.status === 'alive' ? '✅ Vivant' : '💀 Décédé'}
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function FamilyTree3D({ onClose }) {
  const [activeTree,   setActiveTree]   = useState('straw_hats')
  const [selectedChar, setSelectedChar] = useState(null)
  const [hoveredId,    setHoveredId]    = useState(null)
  const [mangaMode,    setMangaMode]    = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterHaki,   setFilterHaki]   = useState(null)
  const [panelOpen,    setPanelOpen]    = useState(true)
  const [transform,    setTransform]    = useState({ x: 0, y: 0, scale: 0.85 })
  const [dragging,     setDragging]     = useState(false)

  const containerRef = useRef(null)
  const dragRef      = useRef(null)
  const txRef        = useRef(transform)
  const wasDragged   = useRef(false)

  const cfg    = TREE_CONFIGS[activeTree]
  const bg     = mangaMode ? '#F5F0E8' : '#0D0804'
  const panel  = mangaMode ? 'rgba(250,244,228,0.98)' : 'rgba(16,10,3,0.97)'
  const txt    = mangaMode ? '#1A0800' : 'rgba(230,200,140,0.92)'
  const muted  = mangaMode ? 'rgba(26,8,0,0.48)'  : 'rgba(195,155,70,0.5)'
  const border = mangaMode ? 'rgba(26,8,0,0.12)'  : 'rgba(140,100,40,0.22)'

  const chars = useMemo(() => {
    let list = CHARACTERS.filter(cfg.charFilter)
    if (filterStatus !== 'all') list = list.filter(c => c.status === filterStatus)
    if (filterHaki)             list = list.filter(c => c.haki.includes(filterHaki))
    return list
  }, [cfg, filterStatus, filterHaki])

  const rels = useMemo(() =>
    RELATIONS.filter(r =>
      chars.find(c => c.id === r.from) &&
      chars.find(c => c.id === r.to)   &&
      cfg.relFilter(r)
    ), [chars, cfg])

  const positions = useMemo(() => {
    const ids  = chars.map(c => c.id)
    const root = ids.includes(cfg.root) ? cfg.root : ids[0]
    if (!root || !ids.length) return {}
    return cfg.layout === 'radial'
      ? computeRadialLayout2D(ids, rels, root)
      : computeTreeLayout2D(ids, rels, root)
  }, [chars, rels, cfg])

  // Center on mount
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const sc   = 0.85
    const t    = { x: rect.width / 2 - (CANVAS_W / 2) * sc, y: rect.height / 2 - (CANVAS_H / 2) * sc, scale: sc }
    txRef.current = t
    setTransform(t)
  }, [])

  // Re-center on tree change
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const sc   = 0.85
    const t    = { x: rect.width / 2 - (CANVAS_W / 2) * sc, y: rect.height / 2 - (CANVAS_H / 2) * sc, scale: sc }
    txRef.current = t
    setTransform(t)
    setSelectedChar(null)
    setHoveredId(null)
  }, [activeTree])

  // Wheel zoom (non-passive)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onWheel = e => {
      e.preventDefault()
      const rect   = el.getBoundingClientRect()
      const mx     = e.clientX - rect.left
      const my     = e.clientY - rect.top
      const factor = e.deltaY < 0 ? 1.10 : 1 / 1.10
      setTransform(prev => {
        const newScale = Math.max(0.12, Math.min(3.5, prev.scale * factor))
        const ratio    = newScale / prev.scale
        const next     = { scale: newScale, x: mx + (prev.x - mx) * ratio, y: my + (prev.y - my) * ratio }
        txRef.current  = next
        return next
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  // Global mouse events for drag
  useEffect(() => {
    const onMove = e => {
      if (!dragRef.current) return
      const dx = e.clientX - dragRef.current.startX
      const dy = e.clientY - dragRef.current.startY
      if (Math.abs(dx) + Math.abs(dy) > 4) wasDragged.current = true
      setTransform(prev => {
        const next    = { ...prev, x: dragRef.current.startTx + dx, y: dragRef.current.startTy + dy }
        txRef.current = next
        return next
      })
    }
    const onUp = () => { dragRef.current = null; setDragging(false) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup',   onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [])

  // Body overflow lock
  useEffect(() => {
    document.title      = 'Arbre — Brams'
    document.body.style.overflow = 'hidden'
    return () => { document.title = 'Brams Community'; document.body.style.overflow = '' }
  }, [])

  const onMouseDown = e => {
    if (e.button !== 0) return
    wasDragged.current = false
    dragRef.current    = { startX: e.clientX, startY: e.clientY, startTx: txRef.current.x, startTy: txRef.current.y }
    setDragging(true)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 600, background: bg, display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ flexShrink: 0, height: 58, display: 'flex', alignItems: 'center', gap: 12, padding: '0 18px', background: panel, backdropFilter: 'blur(22px)', borderBottom: `1px solid ${border}`, zIndex: 10 }}>
        <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.07)', border: `1px solid ${border}`, borderRadius: 9, color: txt, cursor: 'pointer', padding: '7px 14px', fontSize: 13, fontWeight: 700 }}>
          ← Retour
        </button>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <span style={{ fontFamily: "'Cinzel','Trajan Pro',serif", fontSize: 18, fontWeight: 700, letterSpacing: '0.12em', color: txt }}>
            ARBRE DES PERSONNAGES
          </span>
          <span style={{ fontFamily: "'IM Fell English',serif", fontStyle: 'italic', fontSize: 11, color: muted, marginLeft: 12 }}>
            {cfg.emoji} {cfg.label}
          </span>
        </div>
        <button onClick={() => setMangaMode(m => !m)} style={{ background: mangaMode ? '#1a0800' : 'rgba(212,160,23,0.15)', border: `1px solid ${mangaMode ? 'transparent' : 'rgba(212,160,23,0.35)'}`, borderRadius: 9, color: mangaMode ? '#fff' : '#d4a017', cursor: 'pointer', padding: '7px 14px', fontSize: 12, fontWeight: 700 }}>
          {mangaMode ? '🌙 Sombre' : '📖 Manga'}
        </button>
        <button onClick={() => setPanelOpen(p => !p)} style={{ background: 'rgba(255,255,255,0.07)', border: `1px solid ${border}`, borderRadius: 9, color: txt, cursor: 'pointer', padding: '7px 10px', fontSize: 15 }}>
          {panelOpen ? '◀' : '▶'}
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Side panel */}
        <div style={{ width: panelOpen ? 270 : 0, overflow: 'hidden', transition: 'width 0.28s cubic-bezier(.4,0,.2,1)', flexShrink: 0, background: panel, backdropFilter: 'blur(22px)', borderRight: `1px solid ${border}`, display: 'flex', flexDirection: 'column' }}>
          <div style={{ width: 270, flex: 1, overflowY: 'auto' }}>

            <div style={{ padding: '14px 14px 6px' }}>
              <div style={{ fontFamily: "'Cinzel',serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', color: muted, marginBottom: 8 }}>ARBRES</div>
              {Object.values(TREE_CONFIGS).map(c => (
                <button key={c.id} onClick={() => setActiveTree(c.id)} style={{ width: '100%', textAlign: 'left', padding: '9px 12px', borderRadius: 10, border: `1px solid ${activeTree === c.id ? c.color + '55' : border}`, background: activeTree === c.id ? `${c.color}15` : 'transparent', color: activeTree === c.id ? c.color : muted, cursor: 'pointer', marginBottom: 5, fontSize: 13, fontWeight: activeTree === c.id ? 700 : 500, display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.15s' }}>
                  <span style={{ fontSize: 17 }}>{c.emoji}</span>
                  <span>{c.label}</span>
                  {activeTree === c.id && <span style={{ marginLeft: 'auto', fontSize: 9, background: c.color, color: '#fff', borderRadius: 100, padding: '2px 7px', fontWeight: 800 }}>ACTIF</span>}
                </button>
              ))}
            </div>

            <div style={{ padding: '12px 14px', borderTop: `1px solid ${border}` }}>
              <div style={{ fontFamily: "'Cinzel',serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', color: muted, marginBottom: 8 }}>FILTRES</div>
              <div style={{ fontSize: 11, color: muted, marginBottom: 5 }}>Statut</div>
              <div style={{ display: 'flex', gap: 5, marginBottom: 12 }}>
                {[['all', 'Tous'], ['alive', '✅ Vivant'], ['dead', '💀 Mort']].map(([v, l]) => (
                  <button key={v} onClick={() => setFilterStatus(v)} style={{ flex: 1, padding: '6px 2px', borderRadius: 7, border: `1px solid ${filterStatus === v ? '#34d399' : border}`, background: filterStatus === v ? 'rgba(52,211,153,0.14)' : 'transparent', color: filterStatus === v ? '#34d399' : muted, cursor: 'pointer', fontSize: 10, fontWeight: 600 }}>{l}</button>
                ))}
              </div>
              <div style={{ fontSize: 11, color: muted, marginBottom: 5 }}>Haki</div>
              {[[null, '🌊 Tous'], ['conqueror', '⚡ Conquérant'], ['armament', '⚫ Armement'], ['observation', '👁 Observation']].map(([v, l]) => (
                <button key={String(v)} onClick={() => setFilterHaki(v)} style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: `1px solid ${filterHaki === v ? '#d4a017' : border}`, background: filterHaki === v ? 'rgba(212,160,23,0.13)' : 'transparent', color: filterHaki === v ? '#d4a017' : muted, cursor: 'pointer', fontSize: 11, fontWeight: filterHaki === v ? 700 : 500, textAlign: 'left', marginBottom: 4 }}>{l}</button>
              ))}
            </div>

            <div style={{ padding: '12px 14px', borderTop: `1px solid ${border}` }}>
              <div style={{ fontFamily: "'Cinzel',serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', color: muted, marginBottom: 8 }}>LIENS</div>
              {Object.entries(LINK_COLORS).map(([type, color]) => (
                <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                  <div style={{ width: 22, height: 3, background: color, borderRadius: 2, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: muted }}>
                    {({ parent: 'Parent', sibling: 'Frères', crew: 'Équipage', ally: 'Allié', enemy: 'Ennemi', hierarchy: 'Hiérarchie', rival: 'Rival' })[type]}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ padding: '12px 14px', borderTop: `1px solid ${border}` }}>
              <div style={{ fontFamily: "'Cinzel',serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', color: muted, marginBottom: 8 }}>HAKI</div>
              {[['conqueror', '⚡ Conquérant', '#d4a017'], ['armament', '⚫ Armement', '#64748b'], ['observation', '👁 Observation', '#60a5fa']].map(([k, l, c]) => (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: c, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: muted }}>{l}</span>
                </div>
              ))}
              <div style={{ fontSize: 10, color: muted, marginTop: 6, lineHeight: 1.5 }}>Aura dorée = Haki du Conquérant</div>
            </div>

            {selectedChar && (
              <div style={{ padding: '12px 14px', borderTop: `1px solid ${border}` }}>
                <CharDetail char={selectedChar} onClose={() => setSelectedChar(null)} mangaMode={mangaMode} />
              </div>
            )}
          </div>
        </div>

        {/* Canvas viewport */}
        <div
          ref={containerRef}
          style={{ flex: 1, position: 'relative', overflow: 'hidden', minWidth: 0, minHeight: 0, cursor: dragging ? 'grabbing' : 'grab' }}
          onMouseDown={onMouseDown}
          onClick={() => { if (!wasDragged.current) setSelectedChar(null) }}
        >
          {/* Transformed canvas */}
          <div style={{
            position: 'absolute',
            width: CANVAS_W, height: CANVAS_H,
            transformOrigin: '0 0',
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
            willChange: 'transform',
          }}>
            {/* Background */}
            <div style={{
              position: 'absolute', inset: 0,
              background: mangaMode
                ? 'radial-gradient(ellipse at 50% 50%, #F5EDD6 0%, #EDE0BC 55%, #E2D3A5 100%)'
                : 'radial-gradient(ellipse at 50% 40%, #1C0E07 0%, #0D0804 45%, #060301 100%)',
            }} />

            <ConnectionLines
              rels={rels}
              positions={positions}
              hoveredId={hoveredId}
              selectedId={selectedChar?.id ?? null}
            />

            {chars.map(char => {
              const pos = positions[char.id]
              if (!pos) return null
              const sc    = pos.scale
              const W     = POSTER_W * sc
              const H     = POSTER_H * sc
              const tilt  = posterTilt(char.id)
              const isHov = hoveredId === char.id
              const isSel = selectedChar?.id === char.id
              const isDim = !!(hoveredId || selectedChar) && !isHov && !isSel

              return (
                <motion.div
                  key={char.id}
                  style={{
                    position: 'absolute',
                    left: pos.x - W / 2,
                    top:  pos.y - H / 2,
                    width: W, height: H,
                    zIndex: isSel ? 10 : isHov ? 8 : 1,
                    transformOrigin: '50% 5%',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                  initial={{ rotate: tilt, scale: 0.88, opacity: 0 }}
                  animate={{
                    rotate:  tilt,
                    scale:   isSel ? 1.11 : isHov ? 1.06 : 1,
                    opacity: isDim ? 0.25 : 1,
                    y:       isSel ? -16 : isHov ? -9 : 0,
                  }}
                  transition={{
                    scale:   { type: 'spring', stiffness: 340, damping: 26 },
                    y:       { type: 'spring', stiffness: 340, damping: 26 },
                    opacity: { duration: 0.22 },
                    rotate:  { duration: 0 },
                  }}
                  onMouseEnter={e => { e.stopPropagation(); setHoveredId(char.id) }}
                  onMouseLeave={e => { e.stopPropagation(); setHoveredId(null) }}
                  onClick={e => {
                    e.stopPropagation()
                    if (wasDragged.current) return
                    setSelectedChar(prev => prev?.id === char.id ? null : char)
                  }}
                >
                  <PosterCard char={char} sc={sc} selected={isSel} hovered={isHov} />
                </motion.div>
              )
            })}
          </div>

          {/* Controls hint */}
          <div style={{ position: 'absolute', bottom: 16, right: 16, fontFamily: "'IM Fell English',serif", fontStyle: 'italic', fontSize: 11, color: mangaMode ? 'rgba(26,8,0,0.28)' : 'rgba(195,155,70,0.32)', textAlign: 'right', pointerEvents: 'none', lineHeight: 1.8 }}>
            Glisser : déplacer · Molette : zoomer<br />
            Clic sur un poster : détails
          </div>

          {/* Selected name badge */}
          {selectedChar && (
            <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', background: 'rgba(14,9,2,0.92)', border: `1px solid ${selectedChar.color}99`, color: 'rgba(230,200,140,0.95)', borderRadius: 100, padding: '6px 22px', fontFamily: "'Cinzel',serif", fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', pointerEvents: 'none', backdropFilter: 'blur(14px)', boxShadow: `0 4px 24px rgba(0,0,0,0.55), 0 0 22px ${selectedChar.color}44`, whiteSpace: 'nowrap' }}>
              {selectedChar.emoji} {selectedChar.name}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
