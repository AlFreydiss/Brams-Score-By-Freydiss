// ─────────────────────────────────────────────────────────────────────────────
// DamesRenderer — rendu 3D Three.js (npm) du plateau Pirates vs Marine.
// Classe impérative : la boucle de rendu vit HORS de React. React ne reçoit que
// des événements discrets (clic case, fin d'anim). dispose() nettoie tout.
//   API : mount(canvas) · setBoard(board) · setMarkers(opts) · playMove(move,opts)
//         setInteractive(bool) · resetView() · setMuted(bool) · dispose()
//   Événements : onSquareClick(r,c)
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

const SIZE = 10, P = 'P', M = 'M'
const isDark = (r, c) => (r + c) % 2 === 1
const PIECE_Y = 0.18, MARK_Y = 0.105
const worldPos = (r, c) => ({ x: c - 4.5, z: r - 4.5 })

function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath() }
function drawSkull(ctx, cx, cy, S, light, dark) {
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  ctx.fillStyle = light; ctx.strokeStyle = light; ctx.lineWidth = S * 0.13
  for (const ang of [Math.PI / 4, -Math.PI / 4]) {
    ctx.save(); ctx.translate(cx, cy + S * 0.06); ctx.rotate(ang)
    ctx.beginPath(); ctx.moveTo(-S * 0.5, 0); ctx.lineTo(S * 0.5, 0); ctx.stroke()
    for (const ex of [-S * 0.5, S * 0.5]) { ctx.beginPath(); ctx.arc(ex, -S * 0.075, S * 0.08, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(ex, S * 0.075, S * 0.08, 0, 7); ctx.fill() }
    ctx.restore()
  }
  ctx.fillStyle = light
  ctx.beginPath(); ctx.ellipse(cx, cy - S * 0.05, S * 0.27, S * 0.30, 0, 0, 7); ctx.fill()
  ctx.beginPath(); roundRect(ctx, cx - S * 0.135, cy + S * 0.15, S * 0.27, S * 0.17, S * 0.06); ctx.fill()
  ctx.fillStyle = dark
  ctx.beginPath(); ctx.ellipse(cx - S * 0.115, cy - S * 0.04, S * 0.078, S * 0.094, 0, 0, 7); ctx.fill()
  ctx.beginPath(); ctx.ellipse(cx + S * 0.115, cy - S * 0.04, S * 0.078, S * 0.094, 0, 0, 7); ctx.fill()
  ctx.beginPath(); ctx.moveTo(cx, cy + S * 0.02); ctx.lineTo(cx - S * 0.05, cy + S * 0.115); ctx.lineTo(cx + S * 0.05, cy + S * 0.115); ctx.closePath(); ctx.fill()
  ctx.strokeStyle = dark; ctx.lineWidth = S * 0.022
  for (const dx of [-S * 0.07, 0, S * 0.07]) { ctx.beginPath(); ctx.moveTo(cx + dx, cy + S * 0.16); ctx.lineTo(cx + dx, cy + S * 0.30); ctx.stroke() }
  ctx.restore()
}
function drawAnchor(ctx, cx, cy, S, light) {
  ctx.save(); ctx.strokeStyle = light; ctx.fillStyle = light; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = S * 0.075
  ctx.beginPath(); ctx.arc(cx, cy - S * 0.34, S * 0.085, 0, 7); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(cx, cy - S * 0.25); ctx.lineTo(cx, cy + S * 0.30); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(cx - S * 0.18, cy - S * 0.12); ctx.lineTo(cx + S * 0.18, cy - S * 0.12); ctx.stroke()
  ctx.beginPath(); ctx.arc(cx, cy + S * 0.04, S * 0.30, Math.PI * 0.16, Math.PI * 0.84); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(cx - S * 0.295, cy + S * 0.10); ctx.lineTo(cx - S * 0.37, cy + S * 0.02); ctx.lineTo(cx - S * 0.30, cy + S * 0.24); ctx.closePath(); ctx.fill()
  ctx.beginPath(); ctx.moveTo(cx + S * 0.295, cy + S * 0.10); ctx.lineTo(cx + S * 0.37, cy + S * 0.02); ctx.lineTo(cx + S * 0.30, cy + S * 0.24); ctx.closePath(); ctx.fill()
  ctx.restore()
}

export default class DamesRenderer {
  constructor() {
    this.raf = 0; this.tweens = []; this.pieceMeshes = {}; this.boardTiles = []
    this.selected = null; this.legalMoves = []; this.movableKeys = new Set()
    this.interactive = true; this.gameOver = false; this.reduced = false
    this.onSquareClick = null; this._disposed = false; this._track = []
    this.muted = false; this.ac = null; this.master = null
  }

  mount(canvas, { reducedMotion = false } = {}) {
    this.canvas = canvas; this.reduced = reducedMotion
    const host = canvas.parentElement || canvas
    const W = host.clientWidth || 800, H = host.clientHeight || 600
    const scene = new THREE.Scene(); scene.fog = new THREE.FogExp2(0x0a0807, 0.016); this.scene = scene
    const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 200); this.camera = camera
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); this.renderer = renderer
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); renderer.setSize(W, H, false)
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.12

    scene.add(new THREE.HemisphereLight(0xfff0d8, 0x1a1008, 0.55))
    const key = new THREE.DirectionalLight(0xfff3df, 1.15); key.position.set(7, 16, 9); key.castShadow = true
    key.shadow.mapSize.set(2048, 2048); const sc = key.shadow.camera; sc.left = -9; sc.right = 9; sc.top = 9; sc.bottom = -9; sc.near = 1; sc.far = 50; key.shadow.bias = -0.0004
    scene.add(key)
    scene.add(Object.assign(new THREE.PointLight(0xffce8a, 0.55, 40), { position: new THREE.Vector3(-7, 7, -5) }))
    const fill = new THREE.DirectionalLight(0x9fb8e0, 0.25); fill.position.set(-6, 8, 6); scene.add(fill)

    this.piecesGroup = new THREE.Group(); this.markersGroup = new THREE.Group(); this.fxGroup = new THREE.Group()
    this._buildBoard()
    scene.add(this.piecesGroup); scene.add(this.markersGroup); scene.add(this.fxGroup)

    const controls = new OrbitControls(camera, renderer.domElement); this.controls = controls
    controls.enableDamping = true; controls.dampingFactor = 0.08; controls.enablePan = false
    controls.minDistance = 9; controls.maxDistance = 27
    controls.minPolarAngle = 0.2; controls.maxPolarAngle = 1.45
    controls.rotateSpeed = 0.8; controls.zoomSpeed = 0.9
    this.resetView()

    this.raycaster = new THREE.Raycaster(); this.mouse = new THREE.Vector2()
    this._onPointerDown = (e) => { this._downX = e.clientX; this._downY = e.clientY; this._moved = 0; this._resumeAudio() }
    this._onPointerUp = (e) => {
      const d = Math.abs(e.clientX - this._downX) + Math.abs(e.clientY - this._downY)
      if (d < 7) this._handleClick(e.clientX, e.clientY)
    }
    renderer.domElement.addEventListener('pointerdown', this._onPointerDown)
    renderer.domElement.addEventListener('pointerup', this._onPointerUp)
    this._ro = new ResizeObserver(() => this._resize()); this._ro.observe(host)

    const loop = (now) => {
      if (this._disposed) return
      this.raf = requestAnimationFrame(loop)
      for (const tw of this.tweens) { if (tw.done) continue; let p = (now - tw.t0) / tw.dur; if (p >= 1) { p = 1; tw.done = true } tw.onUpdate(p); if (tw.done && tw.onComplete) tw.onComplete() }
      for (let i = this.tweens.length - 1; i >= 0; i--) if (this.tweens[i].done) this.tweens.splice(i, 1)
      const t = now * 0.004
      this.markersGroup.children.forEach(m => { if (m.userData.pulse) m.material.opacity = 0.55 + 0.4 * Math.sin(t * 1.6 + m.position.x) })
      if (this.selected && this.interactive) { const m = this.pieceMeshes[this.selected[0] + '_' + this.selected[1]]; if (m) m.position.y = PIECE_Y + 0.10 + Math.sin(now * 0.005) * 0.04 }
      controls.update()
      renderer.render(scene, camera)
    }
    this.raf = requestAnimationFrame(loop)
  }

  _resize() {
    if (this._disposed || !this.renderer) return
    const host = this.canvas.parentElement || this.canvas
    const W = host.clientWidth || 800, H = host.clientHeight || 600
    this.camera.aspect = W / H; this.camera.updateProjectionMatrix(); this.renderer.setSize(W, H, false)
  }
  resetView() { if (this.camera) { this.camera.position.set(0, 11.5, 13.5); this.controls.target.set(0, 0, 0); this.controls.update() } }

  // ── construction ──────────────────────────────────────────────────────────
  _mat(m) { this._track.push(m); return m }
  _geo(g) { this._track.push(g); return g }
  _goldMat() { return this._mat(new THREE.MeshStandardMaterial({ color: 0xd9b870, metalness: 0.95, roughness: 0.25, emissive: 0x3a2a08, emissiveIntensity: 0.18 })) }

  _buildBoard() {
    this.tilesGroup = new THREE.Group(); this.boardTiles = []
    const tileGeo = this._geo(new THREE.BoxGeometry(0.96, 0.18, 0.96))
    for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
      const dark = isDark(r, c)
      const mat = this._mat(new THREE.MeshStandardMaterial({ color: dark ? 0x6e4a2c : 0xe9d7af, roughness: dark ? 0.7 : 0.55, metalness: 0.05 }))
      const tile = new THREE.Mesh(tileGeo, mat); const w = worldPos(r, c); tile.position.set(w.x, 0, w.z)
      tile.receiveShadow = true; tile.userData = { r, c }; this.boardTiles.push(tile); this.tilesGroup.add(tile)
    }
    const frame = new THREE.Mesh(this._geo(new THREE.BoxGeometry(11.4, 0.55, 11.4)), this._mat(new THREE.MeshStandardMaterial({ color: 0x241710, roughness: 0.6, metalness: 0.15 })))
    frame.position.y = -0.20; frame.receiveShadow = true; this.tilesGroup.add(frame)
    const lip = this._goldMat()
    const lh = this._geo(new THREE.BoxGeometry(11.0, 0.06, 0.14)), lv = this._geo(new THREE.BoxGeometry(0.14, 0.06, 11.0))
    ;[[0, 5.43], [0, -5.43]].forEach(([x, z]) => { const m = new THREE.Mesh(lh, lip); m.position.set(x, 0.08, z); this.tilesGroup.add(m) })
    ;[[5.43, 0], [-5.43, 0]].forEach(([x, z]) => { const m = new THREE.Mesh(lv, lip); m.position.set(x, 0.08, z); this.tilesGroup.add(m) })
    this.scene.add(this.tilesGroup)
    const ground = new THREE.Mesh(this._geo(new THREE.PlaneGeometry(80, 80)), this._mat(new THREE.MeshStandardMaterial({ color: 0x0a0807, roughness: 1, metalness: 0 })))
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.48; ground.receiveShadow = true; this.scene.add(ground)
  }

  _medallion(side, king) {
    const S = 256, cv = document.createElement('canvas'); cv.width = cv.height = S
    const ctx = cv.getContext('2d'); const cx = S / 2, cy = S / 2, R = S * 0.46
    const g = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.35, R * 0.1, cx, cy, R * 1.08)
    if (side === P) { g.addColorStop(0, '#d9594d'); g.addColorStop(.55, '#a8281f'); g.addColorStop(1, '#5e1110') }
    else { g.addColorStop(0, '#5a97d6'); g.addColorStop(.55, '#27598f'); g.addColorStop(1, '#0e2444') }
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.fill()
    ctx.lineWidth = S * 0.035; ctx.strokeStyle = king ? '#e7c878' : (side === P ? '#3c0c0b' : '#0a1c33')
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.9, 0, 7); ctx.stroke()
    if (king) { ctx.lineWidth = S * 0.012; ctx.strokeStyle = '#f4e2a6'; ctx.beginPath(); ctx.arc(cx, cy, R * 0.82, 0, 7); ctx.stroke() }
    const light = king ? '#f6e7b0' : '#f3ead6', dark = side === P ? '#4a0f0d' : '#0c2038'
    if (side === P) drawSkull(ctx, cx, cy + S * 0.01, S * 0.42, light, dark); else drawAnchor(ctx, cx, cy, S * 0.46, light)
    const t = new THREE.CanvasTexture(cv); t.anisotropy = 8; t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true
    this._track.push(t); return t
  }
  _makePiece(side, king, r, c) {
    const g = new THREE.Group()
    const sideMat = this._mat(new THREE.MeshStandardMaterial({ color: side === P ? 0x7c1f17 : 0x153a63, metalness: 0.35, roughness: 0.45 }))
    const topMat = this._mat(new THREE.MeshStandardMaterial({ map: this._medallion(side, king), metalness: 0.25, roughness: 0.5 }))
    const botMat = this._mat(new THREE.MeshStandardMaterial({ color: side === P ? 0x4a0f0a : 0x0c2038, metalness: 0.3, roughness: 0.6 }))
    const disc = new THREE.Mesh(this._geo(new THREE.CylinderGeometry(0.40, 0.43, 0.17, 56, 1)), [sideMat, topMat, botMat])
    disc.castShadow = true; disc.receiveShadow = true; g.add(disc)
    const rim = new THREE.Mesh(this._geo(new THREE.TorusGeometry(0.405, 0.022, 12, 56)), this._mat(new THREE.MeshStandardMaterial({ color: side === P ? 0x3c0c08 : 0x0a1a30, metalness: 0.4, roughness: 0.5 })))
    rim.rotation.x = Math.PI / 2; rim.position.y = 0.055; g.add(rim)
    if (king) {
      const top = new THREE.Mesh(this._geo(new THREE.CylinderGeometry(0.30, 0.34, 0.10, 48, 1)), sideMat.clone()); top.position.y = 0.135; top.castShadow = true; g.add(top)
      const band = new THREE.Mesh(this._geo(new THREE.TorusGeometry(0.235, 0.03, 14, 48)), this._goldMat()); band.rotation.x = Math.PI / 2; band.position.y = 0.205; g.add(band)
      const coneGeo = this._geo(new THREE.ConeGeometry(0.036, 0.10, 12))
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; const pt = new THREE.Mesh(coneGeo, this._goldMat()); pt.position.set(Math.cos(a) * 0.235, 0.265, Math.sin(a) * 0.235); g.add(pt) }
      const gem = new THREE.Mesh(this._geo(new THREE.SphereGeometry(0.052, 16, 16)), this._mat(new THREE.MeshStandardMaterial({ color: side === P ? 0xd14b3a : 0x4a90d9, metalness: 0.6, roughness: 0.2, emissive: side === P ? 0x3a0a06 : 0x07203f, emissiveIntensity: 0.5 })))
      gem.position.y = 0.27; g.add(gem)
    }
    g.userData = { side, king, r, c }; return g
  }

  setBoard(board) {
    this.board = board
    for (const k in this.pieceMeshes) this.piecesGroup.remove(this.pieceMeshes[k])
    this.pieceMeshes = {}
    for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
      const p = board[r][c]; if (!p) continue
      const g = this._makePiece(p.side, p.king, r, c); const w = worldPos(r, c); g.position.set(w.x, PIECE_Y, w.z)
      this.piecesGroup.add(g); this.pieceMeshes[r + '_' + c] = g
    }
  }

  // ── marqueurs ───────────────────────────────────────────────────────────────
  setMarkers({ selected = null, legalMoves = [], movableKeys = new Set(), interactive = true, gameOver = false } = {}) {
    this.selected = selected; this.legalMoves = legalMoves; this.movableKeys = movableKeys; this.interactive = interactive; this.gameOver = gameOver
    this._buildMarkers()
  }
  _clearMarkers() { while (this.markersGroup.children.length) this.markersGroup.remove(this.markersGroup.children[0]) }
  _ring(r, c, kind) {
    const col = kind === 'cap' ? 0xe06a4a : kind === 'sel' ? 0xf4e2a6 : 0xd9b870
    const inner = kind === 'move' || kind === 'cap' ? 0.30 : kind === 'sel' ? 0.36 : 0.17
    const tube = kind === 'move' || kind === 'cap' ? 0.04 : kind === 'sel' ? 0.045 : 0.028
    const m = new THREE.Mesh(this._geo(new THREE.TorusGeometry(inner, tube, 12, 40)), this._mat(new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: kind === 'dot' ? 0.5 : 0.92 })))
    m.rotation.x = Math.PI / 2; const w = worldPos(r, c); m.position.set(w.x, MARK_Y, w.z); m.userData.pulse = (kind !== 'dot'); return m
  }
  _buildMarkers() {
    this._clearMarkers()
    if (this.selected) {
      this.markersGroup.add(this._ring(this.selected[0], this.selected[1], 'sel'))
      for (const mv of this.legalMoves) if (mv.from[0] === this.selected[0] && mv.from[1] === this.selected[1]) this.markersGroup.add(this._ring(mv.to[0], mv.to[1], mv.isCapture ? 'cap' : 'move'))
    } else if (this.interactive && !this.gameOver) {
      this.movableKeys.forEach(k => { const [r, c] = k.split('_').map(Number); this.markersGroup.add(this._ring(r, c, 'dot')) })
    }
  }

  setInteractive(b) { this.interactive = b; this._buildMarkers() }

  // ── interaction ─────────────────────────────────────────────────────────────
  _handleClick(cx, cy) {
    const rect = this.renderer.domElement.getBoundingClientRect()
    this.mouse.x = ((cx - rect.left) / rect.width) * 2 - 1; this.mouse.y = -((cy - rect.top) / rect.height) * 2 + 1
    this.raycaster.setFromCamera(this.mouse, this.camera)
    const targets = [...this.boardTiles, ...Object.values(this.pieceMeshes)]
    const hits = this.raycaster.intersectObjects(targets, true)
    for (const h of hits) { let o = h.object; while (o) { if (o.userData && o.userData.r !== undefined) { this.onSquareClick && this.onSquareClick(o.userData.r, o.userData.c); return } o = o.parent } }
  }

  // ── animation d'un coup ───────────────────────────────────────────────────────
  _tween(dur, onUpdate, onComplete) { this.tweens.push({ t0: performance.now(), dur, onUpdate, onComplete, done: false }) }
  _ember(x, z) {
    if (this.reduced) return
    const geo = this._geo(new THREE.SphereGeometry(0.04, 6, 6))
    for (let k = 0; k < 16; k++) {
      const m = new THREE.Mesh(geo, this._mat(new THREE.MeshBasicMaterial({ color: Math.random() < 0.5 ? 0xe6c878 : 0xff7a3c, transparent: true, opacity: 1 })))
      m.position.set(x, 0.2, z); this.fxGroup.add(m)
      const vx = (Math.random() - 0.5) * 1.5, vy = 0.7 + Math.random() * 1.1, vz = (Math.random() - 0.5) * 1.5
      this._tween(520 + Math.random() * 320, (p) => { m.position.x = x + vx * p; m.position.z = z + vz * p; m.position.y = 0.2 + vy * p * 1.1 - 1.9 * p * p; m.material.opacity = Math.max(0, 1 - p); m.scale.setScalar(Math.max(0.01, 1 - 0.6 * p)) }, () => { this.fxGroup.remove(m); m.material.dispose() })
    }
  }
  _removeCaptured(r, c) {
    const key = r + '_' + c, m = this.pieceMeshes[key]; if (!m) return
    delete this.pieceMeshes[key]; const w = worldPos(r, c); this._ember(w.x, w.z); this._sfxCapture()
    if (this.reduced) { this.piecesGroup.remove(m); return }
    const sy = m.position.y
    this._tween(440, (p) => { m.position.y = sy + 0.45 * p; const s = Math.max(0.001, 1 - p); m.scale.set(s, s, s); m.rotation.y += 0.35 * p; m.traverse(o => { if (o.material) { o.material.transparent = true; o.material.opacity = 1 - p } }) }, () => this.piecesGroup.remove(m))
  }
  _promote(key, side, r, c) {
    const old = this.pieceMeshes[key]; if (!old) return; const pos = old.position.clone(); this.piecesGroup.remove(old)
    const k = this._makePiece(side, true, r, c); k.position.copy(pos); this.piecesGroup.add(k); this.pieceMeshes[key] = k
    this._ember(pos.x, pos.z); this._sfxKing()
    if (this.reduced) return
    k.scale.setScalar(0.2)
    const easeOutBack = p => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2) }
    this._tween(420, (p) => { const s = 0.2 + 0.8 * easeOutBack(p); k.scale.setScalar(s); k.rotation.y = (1 - p) * Math.PI * 1.2 }, null)
  }
  // Joue le coup visuellement. board = état AVANT le coup. Résout la promesse à la fin.
  playMove(move, boardBefore, { promoted = false } = {}) {
    return new Promise((resolve) => {
      const fromKey = move.from[0] + '_' + move.from[1]; const mesh = this.pieceMeshes[fromKey]
      const easeInOut = p => p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2
      const caps = move.caps || [], path = move.path, isCap = caps.length > 0
      const finishLogic = () => {
        delete this.pieceMeshes[fromKey]; const toKey = move.to[0] + '_' + move.to[1]
        if (mesh) { const w = worldPos(move.to[0], move.to[1]); mesh.position.set(w.x, PIECE_Y, w.z); mesh.rotation.y = 0; mesh.userData.r = move.to[0]; mesh.userData.c = move.to[1]; this.pieceMeshes[toKey] = mesh }
        if (promoted) this._promote(toKey, mesh ? mesh.userData.side : (boardBefore[move.from[0]][move.from[1]]?.side), move.to[0], move.to[1])
        else this._sfxMove()
        resolve()
      }
      if (!mesh || this.reduced) { for (const [cr, cc] of caps) this._removeCaptured(cr, cc); finishLogic(); return }
      this._sfxMove(); let i = 0, cur = { ...worldPos(move.from[0], move.from[1]) }
      const hop = () => {
        if (i >= path.length) return finishLogic()
        const b = worldPos(path[i][0], path[i][1]), a = { ...cur }
        const dist = Math.hypot(b.x - a.x, b.z - a.z); const dur = isCap ? 320 : Math.max(240, dist * 70); const hopH = isCap ? 0.55 : 0.14
        let removed = false; const cap = isCap ? caps[i] : null
        this._tween(dur, (p) => { const e = easeInOut(p); mesh.position.x = a.x + (b.x - a.x) * e; mesh.position.z = a.z + (b.z - a.z) * e; mesh.position.y = PIECE_Y + Math.sin(p * Math.PI) * hopH; if (isCap && cap && !removed && p > 0.5) { removed = true; this._removeCaptured(cap[0], cap[1]) } }, () => { cur = b; i++; hop() })
      }
      this.selected = null; this._clearMarkers(); hop()
    })
  }

  // ── audio léger ──────────────────────────────────────────────────────────────
  setMuted(b) { this.muted = b }
  _resumeAudio() { if (!this.ac) { try { this.ac = new (window.AudioContext || window.webkitAudioContext)(); this.master = this.ac.createGain(); this.master.gain.value = 0.5; this.master.connect(this.ac.destination) } catch (e) { /* no audio */ } } if (this.ac && this.ac.state === 'suspended') this.ac.resume() }
  _tone(freq, dur, type, vol, slideTo) { if (!this.ac || this.muted) return; const o = this.ac.createOscillator(), g = this.ac.createGain(); o.type = type || 'sine'; o.frequency.value = freq; if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, this.ac.currentTime + dur); g.gain.setValueAtTime(0, this.ac.currentTime); g.gain.linearRampToValueAtTime(vol || 0.3, this.ac.currentTime + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, this.ac.currentTime + dur); o.connect(g); g.connect(this.master); o.start(); o.stop(this.ac.currentTime + dur + 0.02) }
  _noise(dur, vol, cut) { if (!this.ac || this.muted) return; const n = this.ac.createBufferSource(); const buf = this.ac.createBuffer(1, this.ac.sampleRate * dur, this.ac.sampleRate); const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length); n.buffer = buf; const f = this.ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cut || 1200; const g = this.ac.createGain(); g.gain.setValueAtTime(vol || 0.25, this.ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, this.ac.currentTime + dur); n.connect(f); f.connect(g); g.connect(this.master); n.start(); n.stop(this.ac.currentTime + dur) }
  _sfxSelect() { this._tone(620, 0.08, 'triangle', 0.16) }
  _sfxMove() { this._tone(180, 0.14, 'sine', 0.22, 90) }
  _sfxCapture() { this._noise(0.22, 0.3, 1500); this._tone(120, 0.18, 'sine', 0.2, 70) }
  _sfxKing() {[523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this._tone(f, 0.22, 'triangle', 0.2), i * 70)) }
  sfxSelect() { this._sfxSelect() }

  // ── nettoyage complet ─────────────────────────────────────────────────────────
  dispose() {
    this._disposed = true
    if (this.raf) cancelAnimationFrame(this.raf)
    if (this._ro) this._ro.disconnect()
    if (this.renderer) {
      this.renderer.domElement.removeEventListener('pointerdown', this._onPointerDown)
      this.renderer.domElement.removeEventListener('pointerup', this._onPointerUp)
    }
    if (this.controls) this.controls.dispose()
    for (const o of this._track) { try { o.dispose && o.dispose() } catch (e) { /* ignore */ } }
    this._track = []
    if (this.renderer) { this.renderer.dispose(); this.renderer.forceContextLoss && this.renderer.forceContextLoss() }
    try { if (this.ac) this.ac.close() } catch (e) { /* ignore */ }
    this.scene = this.camera = this.renderer = this.controls = null
    this.pieceMeshes = {}; this.tweens = []
  }
}
