// Brams Phone — moteur de dessin canvas. Pointer events (souris + tactile fluide),
// 4 tailles de pinceau, palette 16 couleurs + sélecteur, gomme, pot de peinture
// (flood fill), pipette, annuler/refaire/effacer (pile de snapshots). Fond blanc
// (PNG non transparent). Le canvas est exposé au parent via canvasRef.
import { useEffect, useRef, useState, useCallback } from 'react'
import { type, fonts } from '../../styles/typography.js'
import { C, alpha } from './theme.js'

const W = 900, H = 620 // résolution interne fixe (le PNG sort à cette taille)

const PALETTE = [
  '#1b1b1b', '#5a5a5a', '#9b9b9b', '#ffffff',
  '#e0524a', '#e8743b', '#e7b416', '#3fb964',
  '#2f9e8c', '#2f7d8c', '#3a6fd4', '#7a52d4',
  '#c84fb0', '#8b5a2b', '#f2b8c6', '#0a2540',
]
const SIZES = [3, 7, 14, 28]

function hexToRgba(hex) {
  const n = parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255]
}

export default function DrawCanvas({ canvasRef, disabled }) {
  const localRef = useRef(null)
  const ctxRef = useRef(null)
  const drawingRef = useRef(false)
  const lastRef = useRef(null)

  const [color, setColor] = useState('#1b1b1b')
  const [size, setSize] = useState(7)
  const [tool, setTool] = useState('brush') // brush | eraser | fill | eyedropper
  const undoRef = useRef([])
  const redoRef = useRef([])
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  // Init : fond blanc + premier snapshot.
  useEffect(() => {
    const cv = localRef.current
    if (!cv) return
    cv.width = W; cv.height = H
    const ctx = cv.getContext('2d', { willReadFrequently: true })
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H)
    ctxRef.current = ctx
    if (canvasRef) canvasRef.current = cv
    snapshot()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const snapshot = useCallback(() => {
    const ctx = ctxRef.current; if (!ctx) return
    try {
      undoRef.current.push(ctx.getImageData(0, 0, W, H))
      if (undoRef.current.length > 25) undoRef.current.shift()
      redoRef.current = []
      setCanUndo(undoRef.current.length > 1); setCanRedo(false)
    } catch {}
  }, [])

  const restore = useCallback((img) => {
    const ctx = ctxRef.current; if (!ctx || !img) return
    ctx.putImageData(img, 0, 0)
  }, [])

  const undo = useCallback(() => {
    if (undoRef.current.length <= 1) return
    const cur = undoRef.current.pop()
    redoRef.current.push(cur)
    restore(undoRef.current[undoRef.current.length - 1])
    setCanUndo(undoRef.current.length > 1); setCanRedo(true)
  }, [restore])

  const redo = useCallback(() => {
    if (!redoRef.current.length) return
    const img = redoRef.current.pop()
    undoRef.current.push(img); restore(img)
    setCanUndo(undoRef.current.length > 1); setCanRedo(redoRef.current.length > 0)
  }, [restore])

  const clearAll = useCallback(() => {
    const ctx = ctxRef.current; if (!ctx) return
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H)
    snapshot()
  }, [snapshot])

  // Coordonnées canvas depuis un pointer event.
  const pos = (e) => {
    const cv = localRef.current
    const rect = cv.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * W,
      y: ((e.clientY - rect.top) / rect.height) * H,
    }
  }

  // Flood fill (scanline simple).
  const floodFill = (sx, sy, fillHex) => {
    const ctx = ctxRef.current
    const img = ctx.getImageData(0, 0, W, H)
    const data = img.data
    const ix = (x, y) => (y * W + x) * 4
    const start = ix(Math.floor(sx), Math.floor(sy))
    const tgt = [data[start], data[start + 1], data[start + 2], data[start + 3]]
    const fill = hexToRgba(fillHex)
    if (tgt[0] === fill[0] && tgt[1] === fill[1] && tgt[2] === fill[2] && tgt[3] === fill[3]) return
    const match = (i) => Math.abs(data[i] - tgt[0]) < 16 && Math.abs(data[i + 1] - tgt[1]) < 16 && Math.abs(data[i + 2] - tgt[2]) < 16 && Math.abs(data[i + 3] - tgt[3]) < 16
    const stack = [[Math.floor(sx), Math.floor(sy)]]
    while (stack.length) {
      const [x, y] = stack.pop()
      if (x < 0 || y < 0 || x >= W || y >= H) continue
      const i = ix(x, y)
      if (!match(i)) continue
      data[i] = fill[0]; data[i + 1] = fill[1]; data[i + 2] = fill[2]; data[i + 3] = fill[3]
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1])
    }
    ctx.putImageData(img, 0, 0)
  }

  const pickColor = (x, y) => {
    const ctx = ctxRef.current
    const d = ctx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data
    const hex = '#' + [d[0], d[1], d[2]].map((v) => v.toString(16).padStart(2, '0')).join('')
    setColor(hex); setTool('brush')
  }

  const onDown = (e) => {
    if (disabled) return
    e.preventDefault()
    const p = pos(e)
    if (tool === 'fill') { floodFill(p.x, p.y, color); snapshot(); return }
    if (tool === 'eyedropper') { pickColor(p.x, p.y); return }
    const ctx = ctxRef.current
    drawingRef.current = true
    lastRef.current = p
    try { localRef.current.setPointerCapture?.(e.pointerId) } catch {}
    // point isolé
    ctx.beginPath()
    ctx.fillStyle = tool === 'eraser' ? '#ffffff' : color
    ctx.arc(p.x, p.y, size / 2, 0, Math.PI * 2)
    ctx.fill()
  }

  const onMove = (e) => {
    if (!drawingRef.current || disabled) return
    e.preventDefault()
    const ctx = ctxRef.current
    const p = pos(e)
    const last = lastRef.current
    ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color
    ctx.lineWidth = size
    ctx.beginPath()
    ctx.moveTo(last.x, last.y)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
    lastRef.current = p
  }

  const onUp = () => {
    if (!drawingRef.current) return
    drawingRef.current = false
    lastRef.current = null
    snapshot()
  }

  // Clavier : Ctrl+Z / Ctrl+Y.
  useEffect(() => {
    const onKey = (e) => {
      if (!(e.ctrlKey || e.metaKey)) return
      if (e.key === 'z') { e.preventDefault(); undo() }
      if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) { e.preventDefault(); redo() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo])

  const toolBtn = (id, label, title) => {
    const active = tool === id
    return (
      <button title={title} onClick={() => setTool(id)} style={{
        width: 42, height: 42, borderRadius: 11, cursor: 'pointer', fontSize: 18,
        border: `1px solid ${active ? alpha(C.gold, 0.5) : C.hairSoft}`,
        background: active ? alpha(C.gold, 0.16) : 'rgba(255,255,255,0.04)',
        color: C.text, display: 'grid', placeItems: 'center',
      }}>{label}</button>
    )
  }

  return (
    <div style={{ display: 'grid', gap: 14, opacity: disabled ? 0.7 : 1 }}>
      {/* Toile */}
      <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', border: `1px solid ${C.hairTop}`, boxShadow: '0 20px 50px rgba(0,0,0,0.4)', background: '#fff' }}>
        <canvas
          ref={localRef}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerLeave={onUp}
          onPointerCancel={onUp}
          style={{ display: 'block', width: '100%', height: 'auto', aspectRatio: `${W} / ${H}`, touchAction: 'none', cursor: tool === 'fill' ? 'cell' : tool === 'eyedropper' ? 'crosshair' : 'crosshair' }}
        />
      </div>

      {/* Barre d'outils */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Couleurs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 22px)', gap: 5 }}>
          {PALETTE.map((c) => (
            <button key={c} onClick={() => { setColor(c); setTool('brush') }} title={c} style={{
              width: 22, height: 22, borderRadius: 6, cursor: 'pointer', background: c,
              border: color === c ? `2px solid ${C.gold}` : '1px solid rgba(0,0,0,0.25)',
              boxShadow: color === c ? `0 0 0 2px ${alpha(C.gold, 0.3)}` : 'none',
            }} />
          ))}
        </div>
        <label style={{ width: 34, height: 34, borderRadius: 9, overflow: 'hidden', cursor: 'pointer', border: `1px solid ${C.hairTop}`, display: 'grid', placeItems: 'center', background: color, position: 'relative' }} title="Couleur perso">
          <input type="color" value={color} onChange={(e) => { setColor(e.target.value); setTool('brush') }} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
          <span style={{ fontSize: 13, mixBlendMode: 'difference', color: '#fff' }}>🎨</span>
        </label>

        {/* Tailles */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {SIZES.map((s) => (
            <button key={s} onClick={() => setSize(s)} title={`${s}px`} style={{
              width: 38, height: 38, borderRadius: 10, cursor: 'pointer', display: 'grid', placeItems: 'center',
              border: `1px solid ${size === s ? alpha(C.gold, 0.5) : C.hairSoft}`,
              background: size === s ? alpha(C.gold, 0.16) : 'rgba(255,255,255,0.04)',
            }}>
              <span style={{ width: Math.min(22, s + 2), height: Math.min(22, s + 2), borderRadius: '50%', background: C.text }} />
            </button>
          ))}
        </div>

        {/* Outils */}
        <div style={{ display: 'flex', gap: 6 }}>
          {toolBtn('brush', '🖌', 'Pinceau')}
          {toolBtn('eraser', '🩹', 'Gomme')}
          {toolBtn('fill', '🪣', 'Pot de peinture')}
          {toolBtn('eyedropper', '💧', 'Pipette')}
        </div>

        {/* Historique */}
        <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
          <button onClick={undo} disabled={!canUndo} title="Annuler (Ctrl+Z)" style={histBtn(canUndo)}>↶</button>
          <button onClick={redo} disabled={!canRedo} title="Refaire (Ctrl+Y)" style={histBtn(canRedo)}>↷</button>
          <button onClick={clearAll} title="Tout effacer" style={{ ...histBtn(true), color: C.danger, fontFamily: fonts.body, fontSize: 13, fontWeight: 800, width: 'auto', padding: '0 12px' }}>Effacer</button>
        </div>
      </div>
    </div>
  )
}

const histBtn = (enabled) => ({
  width: 42, height: 42, borderRadius: 11, fontSize: 20, lineHeight: 1,
  cursor: enabled ? 'pointer' : 'default', opacity: enabled ? 1 : 0.4,
  border: `1px solid ${C.hairSoft}`, background: 'rgba(255,255,255,0.04)', color: C.text,
  display: 'grid', placeItems: 'center',
})
