// Freydiss Phone — moteur de dessin canvas. Pointer events (souris + tactile fluide),
// 4 tailles de pinceau, palette 16 couleurs + sélecteur, gomme, pot de peinture
// (flood fill), pipette, annuler/refaire/effacer (pile de snapshots). Fond blanc
// (PNG non transparent). Le canvas est exposé au parent via canvasRef.
//
// Phase 2 : pression stylet/doigt → épaisseur variable, traits lissés (quadratique
// midpoint, fini l'escalier), curseur custom montrant la taille du pinceau, et
// ergonomie tactile soignée (cf. <style> mobile en bas).
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
const SIZES = [3, 7, 14, 28, 48]
const SHAPE_TOOLS = ['line', 'rect', 'ellipse']
const STAMPS = ['💀', '⭐', '❤️', '⚡', '🔥', '👑', '🏴‍☠️', '🌊', '😂', '💩', '🍖', '⚓']

function hexToRgba(hex) {
  const n = parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255]
}

export default function DrawCanvas({ canvasRef, disabled, draftKey }) {
  const localRef = useRef(null)
  const wrapRef = useRef(null)
  const cursorRef = useRef(null)      // curseur custom (cercle taille pinceau), piloté en impératif
  const ctxRef = useRef(null)
  const drawingRef = useRef(false)
  // Lissage : on garde le dernier point + le dernier midpoint pour tracer des
  // courbes quadratiques (control = dernier point, de mid à mid) au lieu de segments.
  const lastRef = useRef(null)
  const lastMidRef = useRef(null)

  const [color, setColor] = useState('#1b1b1b')
  const [size, setSize] = useState(7)
  const [tool, setTool] = useState('brush') // brush | line | rect | ellipse | spray | eraser | fill | eyedropper
  const toolRef = useRef(tool); toolRef.current = tool
  const colorRef = useRef(color); colorRef.current = color
  const sizeRef = useRef(size); sizeRef.current = size
  // Modes "de fou" : symétrie miroir (axe vertical) + pinceau arc-en-ciel (teinte qui défile).
  const [symmetry, setSymmetry] = useState(false)
  const [rainbow, setRainbow] = useState(false)
  const [grid, setGrid] = useState(false) // grille-repère (overlay visuel, jamais dessinée dans le PNG)
  const [refImg, setRefImg] = useState(null) // image à décalquer (calque, jamais dessinée dans le PNG)
  const symRef = useRef(symmetry); symRef.current = symmetry
  const rainbowRef = useRef(rainbow); rainbowRef.current = rainbow
  const hueRef = useRef(0)
  const [stamp, setStamp] = useState('💀') // tampon courant (outil stamp)
  const stampRef = useRef(stamp); stampRef.current = stamp
  const shiftRef = useRef(false)        // Maj = contraindre (carré/cercle/ligne 45°)
  const shapeBaseRef = useRef(null)     // snapshot AVANT une forme (preview live restaurée à chaque move)
  const startRef = useRef(null)         // point de départ d'une forme
  const undoRef = useRef([])
  const redoRef = useRef([])
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  // Zoom / déplacement de la toile (vue CSS — n'altère JAMAIS les pixels du PNG).
  // pos() lit getBoundingClientRect (déjà transformé) → le mapping dessin reste exact.
  const [view, setView] = useState({ zoom: 1, tx: 0, ty: 0 })
  const viewRef = useRef(view); viewRef.current = view
  const spaceRef = useRef(false)
  const panRef = useRef(null)

  const usesCursor = tool === 'brush' || tool === 'eraser' || tool === 'spray' // les autres gardent un curseur natif

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
    // Restaure un brouillon sauvegardé (reconnexion/refresh en pleine phase dessin).
    if (draftKey) {
      try {
        const d = localStorage.getItem(draftKey)
        if (d) {
          const im = new Image()
          im.onload = () => { try { ctx.drawImage(im, 0, 0, W, H); undoRef.current = []; redoRef.current = []; snapshot() } catch {} }
          im.src = d
        }
      } catch {}
    }
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

  // Brouillon : sauvegarde le dessin courant en localStorage → survit à un refresh/reco
  // en pleine phase dessin (sinon canvas vierge, tout est perdu).
  const saveDraft = useCallback(() => {
    if (!draftKey) return
    const cv = localRef.current; if (!cv) return
    try { localStorage.setItem(draftKey, cv.toDataURL('image/png')) } catch {}
  }, [draftKey])

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
    snapshot(); saveDraft()
  }, [snapshot, saveDraft])

  // Borne la vue : zoom ≥ 1 (jamais plus petit que la toile), translation telle que
  // la toile couvre toujours le cadre (pas de bande vide sur les bords).
  const clampView = (v, rect) => {
    if (v.zoom <= 1) return { zoom: 1, tx: 0, ty: 0 }
    const cw = rect.width, ch = rect.height
    return {
      zoom: v.zoom,
      tx: Math.min(0, Math.max(cw - cw * v.zoom, v.tx)),
      ty: Math.min(0, Math.max(ch - ch * v.zoom, v.ty)),
    }
  }
  // Zoom centré sur un point (mx,my) en px-cadre : garde ce point fixe sous le curseur.
  const zoomAt = (factor, mx, my) => {
    const wrap = wrapRef.current; if (!wrap) return
    const rect = wrap.getBoundingClientRect()
    const v = viewRef.current
    const z = Math.min(6, Math.max(1, v.zoom * factor))
    const wx = (mx - v.tx) / v.zoom, wy = (my - v.ty) / v.zoom
    setView(clampView({ zoom: z, tx: mx - wx * z, ty: my - wy * z }, rect))
  }
  const zoomBy = (factor) => { const r = wrapRef.current?.getBoundingClientRect(); if (r) zoomAt(factor, r.width / 2, r.height / 2) }
  const resetZoom = () => setView({ zoom: 1, tx: 0, ty: 0 })

  // Molette = zoom vers le curseur. Listener natif non-passif (preventDefault fiable).
  useEffect(() => {
    const wrap = wrapRef.current; if (!wrap) return
    const onWheel = (e) => {
      if (disabled) return
      e.preventDefault()
      const rect = wrap.getBoundingClientRect()
      zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX - rect.left, e.clientY - rect.top)
    }
    wrap.addEventListener('wheel', onWheel, { passive: false })
    return () => wrap.removeEventListener('wheel', onWheel)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled])

  // Barre d'espace maintenue = mode déplacement (panoramique) quand on est zoomé.
  useEffect(() => {
    const isField = () => { const t = document.activeElement?.tagName; return t === 'INPUT' || t === 'TEXTAREA' }
    // N'intercepte l'espace QUE si on est zoomé (pan possible) : sinon on laisse le
    // comportement natif (scroll page / activation du bouton focalisé) intact.
    const kd = (e) => { if (e.code === 'Space' && !isField() && viewRef.current.zoom > 1) { e.preventDefault(); spaceRef.current = true; if (wrapRef.current && !panRef.current) wrapRef.current.style.cursor = 'grab' } }
    const ku = (e) => { if (e.code === 'Space') { spaceRef.current = false; if (wrapRef.current && !panRef.current) wrapRef.current.style.cursor = '' } }
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku)
    return () => { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku) }
  }, [])

  // Coordonnées canvas depuis un pointer event.
  const pos = (e) => {
    const cv = localRef.current
    const rect = cv.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * W,
      y: ((e.clientY - rect.top) / rect.height) * H,
    }
  }

  // Épaisseur effective selon la pression. Souris / pas de capteur → taille pleine ;
  // stylet/doigt → modulée de ~0.4× (effleurement) à ~1.2× (appui franc), min 1px.
  const widthFor = (e) => {
    const s = sizeRef.current
    const p = e.pressure
    if (e.pointerType === 'mouse' || p == null || p <= 0) return s
    return Math.max(1, s * (0.4 + 0.8 * p))
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

  // ── Outils "de fou" : couleur active, miroir, segment lissé, formes, aérographe ──
  const mirror = (p) => ({ x: W - p.x, y: p.y }) // axe de symétrie = vertical (W/2)
  // Couleur du trait : blanc pour la gomme, teinte qui défile en arc-en-ciel, sinon la couleur choisie.
  const strokeColor = () => {
    if (toolRef.current === 'eraser') return '#ffffff'
    if (rainbowRef.current) return `hsl(${(hueRef.current % 360 + 360) % 360}, 90%, 55%)`
    return colorRef.current
  }
  // Un segment quadratique lissé (de a vers c, contrôle b).
  const strokeSeg = (ctx, a, b, c) => { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo(b.x, b.y, c.x, c.y); ctx.stroke() }
  // Dessine une forme (ligne/rect/ellipse) de s à e. Maj = carré/cercle/ligne à 45°.
  const drawShapeAt = (s, e) => {
    const ctx = ctxRef.current
    ctx.strokeStyle = strokeColor(); ctx.lineWidth = sizeRef.current
    const t = toolRef.current
    if (t === 'line') {
      let ex = e.x, ey = e.y
      if (shiftRef.current) { const dx = ex - s.x, dy = ey - s.y, ang = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4), len = Math.hypot(dx, dy); ex = s.x + Math.cos(ang) * len; ey = s.y + Math.sin(ang) * len }
      ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(ex, ey); ctx.stroke()
    } else if (t === 'rect') {
      let w = e.x - s.x, h = e.y - s.y
      if (shiftRef.current) { const m = Math.max(Math.abs(w), Math.abs(h)); w = Math.sign(w || 1) * m; h = Math.sign(h || 1) * m }
      ctx.strokeRect(s.x, s.y, w, h)
    } else if (t === 'ellipse') {
      let cx = (s.x + e.x) / 2, cy = (s.y + e.y) / 2, rx = Math.abs(e.x - s.x) / 2, ry = Math.abs(e.y - s.y) / 2
      if (shiftRef.current) { const m = Math.max(rx, ry); rx = m; ry = m; cx = s.x + Math.sign(e.x - s.x || 1) * m; cy = s.y + Math.sign(e.y - s.y || 1) * m }
      ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.stroke()
    }
  }
  const shape = (s, e) => { drawShapeAt(s, e); if (symRef.current) drawShapeAt(mirror(s), mirror(e)) }
  // Aérographe : nuage de points aléatoires dans le rayon du pinceau.
  const sprayAt = (p) => {
    const ctx = ctxRef.current
    if (rainbowRef.current) hueRef.current += 6
    ctx.fillStyle = strokeColor()
    const r = sizeRef.current * 1.7, n = Math.max(6, Math.round(sizeRef.current * 1.4))
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, rad = Math.random() * r
      const x = p.x + Math.cos(a) * rad, y = p.y + Math.sin(a) * rad
      ctx.fillRect(x, y, 1.6, 1.6)
      if (symRef.current) ctx.fillRect(W - x, y, 1.6, 1.6)
    }
  }
  // Tampon : pose un emoji (taille = pinceau) centré sur le clic. Miroir-aware.
  const placeStamp = (p) => {
    const ctx = ctxRef.current
    const px = Math.max(40, sizeRef.current * 5)
    ctx.save()
    ctx.font = `${px}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(stampRef.current, p.x, p.y)
    if (symRef.current) ctx.fillText(stampRef.current, W - p.x, p.y)
    ctx.restore()
  }

  // Maj maintenue = contrainte des formes (carré/cercle/ligne à 45°).
  useEffect(() => {
    const d = (e) => { if (e.key === 'Shift') shiftRef.current = true }
    const u = (e) => { if (e.key === 'Shift') shiftRef.current = false }
    window.addEventListener('keydown', d); window.addEventListener('keyup', u)
    return () => { window.removeEventListener('keydown', d); window.removeEventListener('keyup', u) }
  }, [])

  // ── Curseur custom : cercle de la taille du pinceau qui suit le pointeur ──────
  // Piloté en impératif (pas de state) pour ne pas re-render à chaque pixel.
  const moveCursor = (e) => {
    const cur = cursorRef.current, wrap = wrapRef.current, cv = localRef.current
    if (!cur || !wrap || !cv) return
    if (!usesCursor) { cur.style.opacity = '0'; return }
    const wrapRect = wrap.getBoundingClientRect()
    const cvRect = cv.getBoundingClientRect()
    const scale = cvRect.width / W              // px écran par unité interne
    const d = Math.max(6, sizeRef.current * scale)
    cur.style.width = `${d}px`; cur.style.height = `${d}px`
    cur.style.transform = `translate(${e.clientX - wrapRect.left}px, ${e.clientY - wrapRect.top}px) translate(-50%, -50%)`
    cur.style.borderColor = toolRef.current === 'eraser' ? 'rgba(0,0,0,0.55)' : colorRef.current
    cur.style.background = toolRef.current === 'eraser' ? 'rgba(255,255,255,0.6)' : alpha(colorRef.current, 0.18)
    cur.style.opacity = '1'
  }
  const hideCursor = () => { if (cursorRef.current) cursorRef.current.style.opacity = '0' }

  const onDown = (e) => {
    if (disabled) return
    // Déplacement de la toile : espace maintenu OU clic molette, seulement si zoomé.
    if ((spaceRef.current || e.button === 1) && viewRef.current.zoom > 1) {
      e.preventDefault()
      panRef.current = { sx: e.clientX, sy: e.clientY, tx0: viewRef.current.tx, ty0: viewRef.current.ty }
      if (wrapRef.current) wrapRef.current.style.cursor = 'grabbing'
      if (cursorRef.current) cursorRef.current.style.opacity = '0'
      try { localRef.current.setPointerCapture?.(e.pointerId) } catch {}
      return
    }
    // Souris : bouton gauche uniquement (le droit/milieu ne doit pas peindre de point).
    if (e.pointerType === 'mouse' && e.button !== 0) return
    e.preventDefault()
    const p = pos(e)
    if (tool === 'fill') { floodFill(p.x, p.y, color); snapshot(); saveDraft(); return }
    if (tool === 'eyedropper') { pickColor(p.x, p.y); return }
    if (tool === 'stamp') { placeStamp(p); snapshot(); saveDraft(); return }
    const ctx = ctxRef.current
    drawingRef.current = true
    try { localRef.current.setPointerCapture?.(e.pointerId) } catch {}
    // Forme (ligne/rect/ellipse) : on fige l'image AVANT pour rejouer le preview à chaque move.
    if (SHAPE_TOOLS.includes(tool)) { shapeBaseRef.current = ctx.getImageData(0, 0, W, H); startRef.current = p; return }
    lastRef.current = p
    lastMidRef.current = p
    if (tool === 'spray') { sprayAt(p); return }
    // point isolé (clic sans déplacement)
    const w = widthFor(e) / 2
    ctx.fillStyle = strokeColor()
    ctx.beginPath(); ctx.arc(p.x, p.y, w, 0, Math.PI * 2); ctx.fill()
    if (symRef.current) { const m = mirror(p); ctx.beginPath(); ctx.arc(m.x, m.y, w, 0, Math.PI * 2); ctx.fill() }
  }

  const onMove = (e) => {
    if (panRef.current) {
      const rect = wrapRef.current.getBoundingClientRect()
      const dx = e.clientX - panRef.current.sx, dy = e.clientY - panRef.current.sy
      setView(clampView({ zoom: viewRef.current.zoom, tx: panRef.current.tx0 + dx, ty: panRef.current.ty0 + dy }, rect))
      return
    }
    moveCursor(e)
    if (!drawingRef.current || disabled) return
    e.preventDefault()
    const ctx = ctxRef.current
    const p = pos(e)
    const t = toolRef.current
    // Forme : on restaure l'image figée puis on redessine la forme en cours (preview live).
    if (SHAPE_TOOLS.includes(t)) { ctx.putImageData(shapeBaseRef.current, 0, 0); shape(startRef.current, p); return }
    if (t === 'spray') { sprayAt(p); return }
    const last = lastRef.current
    const lastMid = lastMidRef.current
    const mid = { x: (last.x + p.x) / 2, y: (last.y + p.y) / 2 }
    if (rainbowRef.current && t !== 'eraser') hueRef.current += 4
    ctx.strokeStyle = strokeColor()
    ctx.lineWidth = widthFor(e)
    // Courbe quadratique : du dernier midpoint au nouveau, contrôle = dernier point.
    strokeSeg(ctx, lastMid, last, mid)
    if (symRef.current) strokeSeg(ctx, mirror(lastMid), mirror(last), mirror(mid))
    lastRef.current = p
    lastMidRef.current = mid
  }

  const onUp = (e) => {
    try { if (e && e.pointerId != null) localRef.current?.releasePointerCapture?.(e.pointerId) } catch {}
    if (panRef.current) {
      panRef.current = null
      if (wrapRef.current) wrapRef.current.style.cursor = spaceRef.current && viewRef.current.zoom > 1 ? 'grab' : ''
      return
    }
    if (!drawingRef.current) return
    drawingRef.current = false
    lastRef.current = null
    lastMidRef.current = null
    shapeBaseRef.current = null
    startRef.current = null
    snapshot(); saveDraft()
  }

  // Phase dessin active → coupe la traînée de curseur + le curseur custom GLOBAL du site
  // (calques fixes par-dessus le canvas = "relou" + imprécis). Même mécanisme que storyOpen.
  useEffect(() => {
    document.body.dataset.drawOpen = 'true'
    window.dispatchEvent(new Event('bp-draw-toggle'))
    return () => { delete document.body.dataset.drawOpen; window.dispatchEvent(new Event('bp-draw-toggle')) }
  }, [])

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

  // Raccourcis outils (lettres simples, ignorés si on tape dans un champ ou avec un modificateur).
  useEffect(() => {
    const isField = () => { const t = document.activeElement?.tagName; return t === 'INPUT' || t === 'TEXTAREA' }
    const map = { b: 'brush', l: 'line', r: 'rect', o: 'ellipse', a: 'spray', t: 'stamp', e: 'eraser', f: 'fill', p: 'eyedropper' }
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || isField()) return
      const k = e.key.toLowerCase()
      if (map[k]) { setTool(map[k]); return }
      if (k === 'm') setSymmetry((s) => !s)
      else if (k === 'x') setRainbow((r) => !r)
      else if (k === 'g') setGrid((g) => !g)
      else if (k === ']') setSize((s) => Math.min(64, s + 2))
      else if (k === '[') setSize((s) => Math.max(1, s - 2))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Cache le curseur custom quand on bascule sur un outil sans curseur (sans bouger).
  useEffect(() => {
    if (!usesCursor && cursorRef.current) cursorRef.current.style.opacity = '0'
  }, [usesCursor])

  const toolBtn = (id, label, title) => {
    const active = tool === id
    return (
      <button title={title} onClick={() => setTool(id)} className="bpc-btn" style={{
        width: 42, height: 42, borderRadius: 11, cursor: 'pointer', fontSize: 18,
        border: `1px solid ${active ? alpha(C.gold, 0.5) : C.hairSoft}`,
        background: active ? alpha(C.gold, 0.16) : 'rgba(255,255,255,0.04)',
        color: C.text, display: 'grid', placeItems: 'center',
      }}>{label}</button>
    )
  }

  return (
    <div className="bpc-root" style={{ display: 'grid', gap: 14, opacity: disabled ? 0.7 : 1 }}>
      {/* Toile */}
      <div ref={wrapRef} className="bpc-wrap" style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', border: `1px solid ${alpha(C.gold, 0.28)}`, boxShadow: `0 24px 60px rgba(0,0,0,0.46), 0 0 0 1px ${alpha(C.goldHot, 0.12)} inset`, background: '#fff', touchAction: 'none' }}>
        <canvas
          ref={localRef}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerLeave={(e) => { hideCursor(); onUp(e) }}
          onPointerCancel={(e) => { hideCursor(); onUp(e) }}
          onPointerEnter={moveCursor}
          style={{
            display: 'block', width: '100%', height: 'auto', aspectRatio: `${W} / ${H}`,
            touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none',
            cursor: usesCursor ? 'none' : tool === 'fill' ? 'cell' : 'crosshair',
            transform: `translate(${view.tx}px, ${view.ty}px) scale(${view.zoom})`,
            transformOrigin: '0 0', willChange: 'transform',
          }}
        />
        {/* Curseur custom (cercle taille pinceau). pointerEvents:none = transparent aux events. */}
        <div ref={cursorRef} aria-hidden style={{
          position: 'absolute', top: 0, left: 0, width: 14, height: 14, borderRadius: '50%',
          border: '2px solid #1b1b1b', boxShadow: '0 0 0 1px rgba(255,255,255,0.85)',
          pointerEvents: 'none', opacity: 0, willChange: 'transform', zIndex: 2,
        }} />
        {/* Image à décalquer (calque) : suit la transform zoom/pan, jamais dessinée dans le PNG. */}
        {refImg && <img src={refImg} aria-hidden alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', opacity: 0.38, pointerEvents: 'none', zIndex: 1, transform: `translate(${view.tx}px, ${view.ty}px) scale(${view.zoom})`, transformOrigin: '0 0' }} />}
        {/* Grille-repère (aide à la composition — n'est jamais dessinée dans le PNG) */}
        {grid && <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1, backgroundImage: `linear-gradient(${alpha(C.ink, 0.13)} 1px, transparent 1px), linear-gradient(90deg, ${alpha(C.ink, 0.13)} 1px, transparent 1px)`, backgroundSize: '10% 10%' }} />}
        {/* Axe de symétrie (repère visuel quand le mode miroir est actif) */}
        {symmetry && <div aria-hidden style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 0, borderLeft: `1px dashed ${alpha(C.gold, 0.55)}`, pointerEvents: 'none', zIndex: 1 }} />}
      </div>

      {/* Barre d'outils */}
      <div className="bpc-bar" style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Couleurs */}
        <div className="bpc-palette" style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 22px)', gap: 5 }}>
          {PALETTE.map((c) => (
            <button key={c} onClick={() => { setColor(c); setTool('brush') }} title={c} className="bpc-swatch" style={{
              width: 22, height: 22, borderRadius: 6, cursor: 'pointer', background: c,
              border: color === c ? `2px solid ${C.gold}` : '1px solid rgba(0,0,0,0.25)',
              boxShadow: color === c ? `0 0 0 2px ${alpha(C.gold, 0.3)}` : 'none',
            }} />
          ))}
        </div>
        <label className="bpc-btn" style={{ width: 34, height: 34, borderRadius: 9, overflow: 'hidden', cursor: 'pointer', border: `1px solid ${C.hairTop}`, display: 'grid', placeItems: 'center', background: color, position: 'relative' }} title="Couleur perso">
          <input type="color" value={color} onChange={(e) => { setColor(e.target.value); setTool('brush') }} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
          <span style={{ fontSize: 13, mixBlendMode: 'difference', color: '#fff' }}>🎨</span>
        </label>

        {/* Tailles : presets rapides + slider pour un réglage fin (1–64 px) */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {SIZES.map((s) => (
            <button key={s} onClick={() => setSize(s)} title={`${s}px`} className="bpc-btn" style={{
              width: 38, height: 38, borderRadius: 10, cursor: 'pointer', display: 'grid', placeItems: 'center',
              border: `1px solid ${size === s ? alpha(C.gold, 0.5) : C.hairSoft}`,
              background: size === s ? alpha(C.gold, 0.16) : 'rgba(255,255,255,0.04)',
            }}>
              <span style={{ width: Math.min(22, Math.round(8 + (s / 28) * 14)), height: Math.min(22, Math.round(8 + (s / 28) * 14)), borderRadius: '50%', background: C.text }} />
            </button>
          ))}
          <input
            type="range" min={1} max={64} value={size} aria-label="Taille du pinceau"
            onChange={(e) => setSize(+e.target.value)}
            className="bpc-size"
            style={{ width: 120, accentColor: C.gold, cursor: 'pointer' }}
          />
          <span style={{ ...type.small, color: C.textMut, minWidth: 36, textAlign: 'center', fontVariantNumeric: 'tabular-nums', fontWeight: 800 }}>{size}px</span>
        </div>

        {/* Outils */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {toolBtn('brush', '🖌', 'Pinceau')}
          {toolBtn('line', '📏', 'Ligne droite (Maj = 45°)')}
          {toolBtn('rect', '▭', 'Rectangle (Maj = carré)')}
          {toolBtn('ellipse', '⬭', 'Ellipse (Maj = cercle)')}
          {toolBtn('spray', '💨', 'Aérographe')}
          {toolBtn('stamp', '🌟', 'Tampon (emoji)')}
          {toolBtn('eraser', '🩹', 'Gomme')}
          {toolBtn('fill', '🪣', 'Pot de peinture')}
          {toolBtn('eyedropper', '💧', 'Pipette')}
        </div>

        {/* Modes spéciaux : symétrie miroir + arc-en-ciel */}
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setSymmetry((s) => !s)} title="Symétrie miroir (axe vertical)" className="bpc-btn" style={{
            width: 42, height: 42, borderRadius: 11, cursor: 'pointer', fontSize: 18, display: 'grid', placeItems: 'center', color: C.text,
            border: `1px solid ${symmetry ? alpha(C.gold, 0.6) : C.hairSoft}`, background: symmetry ? alpha(C.gold, 0.22) : 'rgba(255,255,255,0.04)',
          }}>🪞</button>
          <button onClick={() => setRainbow((r) => !r)} title="Pinceau arc-en-ciel" className="bpc-btn" style={{
            width: 42, height: 42, borderRadius: 11, cursor: 'pointer', fontSize: 18, display: 'grid', placeItems: 'center', color: C.text,
            border: `1px solid ${rainbow ? alpha(C.gold, 0.6) : C.hairSoft}`,
            background: rainbow ? 'linear-gradient(90deg,#e0524a,#e7b416,#3fb964,#3a6fd4,#7a52d4)' : 'rgba(255,255,255,0.04)',
          }}>🌈</button>
          <button onClick={() => setGrid((g) => !g)} title="Grille-repère (n'apparaît pas dans le dessin)" className="bpc-btn" style={{
            width: 42, height: 42, borderRadius: 11, cursor: 'pointer', fontSize: 18, display: 'grid', placeItems: 'center', color: C.text,
            border: `1px solid ${grid ? alpha(C.gold, 0.6) : C.hairSoft}`, background: grid ? alpha(C.gold, 0.22) : 'rgba(255,255,255,0.04)',
          }}>📐</button>
          <label title="Image à décalquer (calque — n'apparaît pas dans le dessin)" className="bpc-btn" style={{
            width: 42, height: 42, borderRadius: 11, cursor: 'pointer', fontSize: 18, display: 'grid', placeItems: 'center', color: C.text,
            border: `1px solid ${refImg ? alpha(C.gold, 0.6) : C.hairSoft}`, background: refImg ? alpha(C.gold, 0.22) : 'rgba(255,255,255,0.04)', position: 'relative',
          }}>
            <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = () => setRefImg(r.result); r.readAsDataURL(f) } e.target.value = '' }} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
            🖼️
          </label>
          {refImg && <button onClick={() => setRefImg(null)} title="Retirer le calque" className="bpc-btn" style={{ width: 42, height: 42, borderRadius: 11, cursor: 'pointer', fontSize: 16, display: 'grid', placeItems: 'center', color: C.danger, border: `1px solid ${C.hairSoft}`, background: 'rgba(255,255,255,0.04)' }}>✕</button>}
        </div>

        {/* Zoom (molette aussi) */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button onClick={() => zoomBy(1 / 1.3)} disabled={view.zoom <= 1} title="Dézoomer" className="bpc-btn" style={histBtn(view.zoom > 1)}>－</button>
          <span title="Molette = zoom · Espace = déplacer" style={{ ...type.small, color: C.textMut, minWidth: 42, textAlign: 'center', fontVariantNumeric: 'tabular-nums', fontWeight: 800 }}>{Math.round(view.zoom * 100)}%</span>
          <button onClick={() => zoomBy(1.3)} disabled={view.zoom >= 6} title="Zoomer (molette)" className="bpc-btn" style={histBtn(view.zoom < 6)}>＋</button>
          <button onClick={resetZoom} disabled={view.zoom === 1} title="Réinitialiser le zoom" className="bpc-btn" style={histBtn(view.zoom !== 1)}>⟲</button>
        </div>

        {/* Historique */}
        <div className="bpc-hist" style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
          <button onClick={undo} disabled={!canUndo} title="Annuler (Ctrl+Z)" className="bpc-btn" style={histBtn(canUndo)}>↶</button>
          <button onClick={redo} disabled={!canRedo} title="Refaire (Ctrl+Y)" className="bpc-btn" style={histBtn(canRedo)}>↷</button>
          <button onClick={clearAll} title="Tout effacer" className="bpc-btn" style={{ ...histBtn(true), color: C.danger, fontFamily: fonts.body, fontSize: 13, fontWeight: 800, width: 'auto', padding: '0 12px' }}>Effacer</button>
        </div>
      </div>

      {/* Sélecteur de tampons (visible quand l'outil tampon est actif) */}
      {tool === 'stamp' && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', padding: '4px 0' }}>
          <span style={{ ...type.small, color: C.textMut, marginRight: 4 }}>Tampon</span>
          {STAMPS.map((s) => (
            <button key={s} onClick={() => setStamp(s)} title={`Tampon ${s}`} className="bpc-btn" style={{
              width: 38, height: 38, borderRadius: 10, cursor: 'pointer', fontSize: 20, display: 'grid', placeItems: 'center',
              border: `1px solid ${stamp === s ? alpha(C.gold, 0.6) : C.hairSoft}`,
              background: stamp === s ? alpha(C.gold, 0.2) : 'rgba(255,255,255,0.04)',
            }}>{s}</button>
          ))}
        </div>
      )}

      {/* Ergonomie tactile : sur petit écran on agrandit les cibles et on étale la
          barre d'outils, et on coupe les gestes parasites (sélection, callout iOS). */}
      <style>{`
        .bpc-root { -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }
        .bpc-wrap { overscroll-behavior: contain; }
        @media (hover: none) and (pointer: coarse) {
          .bpc-bar { gap: 10px; justify-content: center; }
          .bpc-palette { grid-template-columns: repeat(8, 34px) !important; gap: 8px !important; }
          .bpc-swatch { width: 34px !important; height: 34px !important; border-radius: 9px !important; }
          .bpc-btn { min-width: 48px; min-height: 48px; }
          .bpc-size { width: 150px !important; height: 30px; }
          .bpc-hist { margin-left: 0 !important; }
        }
      `}</style>
    </div>
  )
}

const histBtn = (enabled) => ({
  width: 42, height: 42, borderRadius: 11, fontSize: 20, lineHeight: 1,
  cursor: enabled ? 'pointer' : 'default', opacity: enabled ? 1 : 0.4,
  border: `1px solid ${C.hairSoft}`, background: 'rgba(255,255,255,0.04)', color: C.text,
  display: 'grid', placeItems: 'center',
})
