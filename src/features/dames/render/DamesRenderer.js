// ─────────────────────────────────────────────────────────────────────────────
// DamesRenderer — façade impérative (API stable) au-dessus d'une scène R3F.
// Monte une racine React dédiée (DamesScene) dans le conteneur du canvas fourni.
// Les consommateurs (DamesGame3D / DamesOnline3D) ne voient qu'une API discrète :
//   mount(canvas,{reducedMotion}) · setBoard · setMarkers · setHint · setCursor
//   setInteractive · playMove(move,before,{promoted})→Promise · resetView
//   quality()/setQuality · setMuted · sfxSelect · dispose
// Rendu, post-processing, drei, océan : tout vit dans la scène R3F (DamesScene.jsx).
// L'audio reste un synth WebAudio léger ici (remplacé par Howler en phase 3).
// ─────────────────────────────────────────────────────────────────────────────
import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import DamesScene from './DamesScene.jsx'

function createStore() {
  let s = {
    board: null, selected: null, legalMoves: [], movableKeys: new Set(),
    interactive: true, gameOver: false, last: null, hint: null, cursor: null,
    quality: 'high', reduced: false,
  }
  const subs = new Set()
  return {
    getState: () => s,
    setState: (patch) => { s = { ...s, ...patch }; subs.forEach(f => f()) },
    subscribe: (f) => { subs.add(f); return () => subs.delete(f) },
    api: {},      // rempli par la scène : playMove, resetView…
    _click: null, // rempli par la scène : garde clic/drag
  }
}

export default class DamesRenderer {
  constructor() {
    this.store = createStore(); this.onSquareClick = null
    this.muted = false; this._disposed = false; this.ac = null; this.master = null
  }

  mount(canvas, { reducedMotion = false } = {}) {
    this.canvas = canvas
    const host = canvas.parentElement || canvas
    canvas.style.display = 'none'  // canvas fourni inutilisé : R3F crée le sien
    const mountEl = document.createElement('div')
    mountEl.style.cssText = 'position:absolute;inset:0;'
    host.insertBefore(mountEl, canvas)
    this.mountEl = mountEl

    let saved = null; try { saved = localStorage.getItem('dames_quality') } catch (e) { /* */ }
    const coarse = window.matchMedia?.('(pointer: coarse)')?.matches
    const minWH = Math.min(host.clientWidth || 800, host.clientHeight || 600)
    const tier = saved || (reducedMotion ? 'low' : (coarse && minWH < 820) ? 'medium' : 'high')
    this.store.setState({ reduced: reducedMotion, quality: tier })

    this.root = createRoot(mountEl)
    this.root.render(createElement(DamesScene, {
      store: this.store,
      onSquareClick: (r, c) => { this._resumeAudio(); this.onSquareClick && this.onSquareClick(r, c) },
      audio: { move: () => this._sfxMove(), capture: () => this._sfxCapture(), king: () => this._sfxKing(), select: () => this._sfxSelect() },
    }))
  }

  setBoard(board) { this.store.setState({ board }) }
  setMarkers(opts = {}) { this.store.setState({ ...opts }) }
  setHint(move) { this.store.setState({ hint: move || null }) }
  setCursor(rc) { this.store.setState({ cursor: rc || null }) }
  setInteractive(b) { this.store.setState({ interactive: b }) }
  playMove(move, before, opts) { return this.store.api.playMove ? this.store.api.playMove(move, before, opts) : Promise.resolve() }
  resetView() { this.store.api.resetView && this.store.api.resetView() }
  quality() { return this.store.getState().quality }
  setQuality(tier) { this.store.setState({ quality: tier }); try { localStorage.setItem('dames_quality', tier) } catch (e) { /* */ } }
  setMuted(b) { this.muted = b }
  sfxSelect() { this._sfxSelect() }

  // ── audio synth léger (WebAudio) ──────────────────────────────────────────────
  _resumeAudio() {
    if (!this.ac) { try { this.ac = new (window.AudioContext || window.webkitAudioContext)(); this.master = this.ac.createGain(); this.master.gain.value = 0.5; this.master.connect(this.ac.destination) } catch (e) { /* no audio */ } }
    if (this.ac && this.ac.state === 'suspended') this.ac.resume()
  }
  _tone(freq, dur, type, vol, slideTo) { if (!this.ac || this.muted) return; const o = this.ac.createOscillator(), g = this.ac.createGain(); o.type = type || 'sine'; o.frequency.value = freq; if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, this.ac.currentTime + dur); g.gain.setValueAtTime(0, this.ac.currentTime); g.gain.linearRampToValueAtTime(vol || 0.3, this.ac.currentTime + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, this.ac.currentTime + dur); o.connect(g); g.connect(this.master); o.start(); o.stop(this.ac.currentTime + dur + 0.02) }
  _noise(dur, vol, cut) { if (!this.ac || this.muted) return; const n = this.ac.createBufferSource(); const buf = this.ac.createBuffer(1, this.ac.sampleRate * dur, this.ac.sampleRate); const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length); n.buffer = buf; const f = this.ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cut || 1200; const g = this.ac.createGain(); g.gain.setValueAtTime(vol || 0.25, this.ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, this.ac.currentTime + dur); n.connect(f); f.connect(g); g.connect(this.master); n.start(); n.stop(this.ac.currentTime + dur) }
  _sfxSelect() { this._tone(620, 0.08, 'triangle', 0.16) }
  _sfxMove() { this._tone(180, 0.14, 'sine', 0.22, 90) }
  _sfxCapture() { this._noise(0.22, 0.3, 1500); this._tone(120, 0.18, 'sine', 0.2, 70) }
  _sfxKing() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this._tone(f, 0.22, 'triangle', 0.2), i * 70)) }

  dispose() {
    this._disposed = true
    try { this.root && this.root.unmount() } catch (e) { /* */ }
    try { this.mountEl && this.mountEl.remove() } catch (e) { /* */ }
    try { if (this.ac) this.ac.close() } catch (e) { /* */ }
    this.store = null; this.root = null
  }
}
