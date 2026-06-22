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
    quality: 'high', reduced: false, theme: 'sunset', winner: null, view2D: false,
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
    // hooks d'événements de jeu (DOM HUD premium) — additifs, optionnels, branchés par le consommateur.
    // onCombo(n)        : rafle en cours, n = nombre de prises atteint (≥2)
    // onPromote(side)   : un pion vient d'être couronné Dame (side = 'P' | 'M')
    this.onCombo = null; this.onPromote = null
    this.muted = false; this._disposed = false; this.ac = null; this.master = null
    this._amb = null; this._mus = null
    this.musicOn = false; try { this.musicOn = localStorage.getItem('dames_music') === '1' } catch (e) { /* */ }
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
    let savedTheme = null; try { savedTheme = localStorage.getItem('dames_theme') } catch (e) { /* */ }
    let saved2D = false; try { saved2D = localStorage.getItem('dames_view2d') === '1' } catch (e) { /* */ }
    this.store.setState({ reduced: reducedMotion, quality: tier, theme: savedTheme || 'sunset', view2D: saved2D })

    this.root = createRoot(mountEl)
    this.root.render(createElement(DamesScene, {
      store: this.store,
      onSquareClick: (r, c) => { this._resumeAudio(); this.onSquareClick && this.onSquareClick(r, c) },
      audio: { move: () => this._sfxMove(), capture: () => this._sfxCapture(), king: () => this._sfxKing(), select: () => this._sfxSelect() },
      // ponts d'événements de jeu vers le consommateur (DOM HUD) — toujours via this.* pour rester
      // réassignables après coup ; on lit la valeur courante à l'instant de l'événement.
      events: { combo: (n) => { try { this.onCombo && this.onCombo(n) } catch (e) { /* */ } }, promote: (side) => { try { this.onPromote && this.onPromote(side) } catch (e) { /* */ } } },
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
  // ── ambiance (mood ciel/océan) : 'sunset' (défaut) · 'storm' · 'night' ─────────
  theme() { return this.store.getState().theme }
  setTheme(theme) { this.store.setState({ theme }); try { localStorage.setItem('dames_theme', theme) } catch (e) { /* */ } }
  // ── win cinematic : déclenche orbite caméra + feux d'artifice côté faction ─────
  // winner: 'P' (Pirates) | 'M' (Marine). Additif — n'altère pas l'API existante.
  setWinner(side) { this.store.setState({ winner: side || null, gameOver: true }) }
  // ── vue 2D top-down (toggle) : overlay CSS jouable par-dessus la scène 3D ───────
  view2D() { return this.store.getState().view2D }
  setView2D(b) { this.store.setState({ view2D: !!b }); try { localStorage.setItem('dames_view2d', b ? '1' : '0') } catch (e) { /* */ } }
  setMuted(b) { this.muted = b; if (b) { this._stopAmbiance(); this._stopMusic() } else { this._resumeAudio() } }
  setMusic(b) { this.musicOn = b; try { localStorage.setItem('dames_music', b ? '1' : '0') } catch (e) { /* */ } if (b && !this.muted) { this._resumeAudio(); this._startMusic() } else this._stopMusic() }
  music() { return this.musicOn }
  sfxSelect() { this._sfxSelect() }
  sfxWin() { this._resumeAudio(); this._sfxWin() }
  sfxLose() { this._resumeAudio(); this._sfxLose() }

  // ── audio synth (WebAudio) — ambiance océan + SFX + musique, sans fichier ─────
  _resumeAudio() {
    if (!this.ac) { try { this.ac = new (window.AudioContext || window.webkitAudioContext)(); this.master = this.ac.createGain(); this.master.gain.value = 0.5; this.master.connect(this.ac.destination) } catch (e) { /* no audio */ } }
    if (this.ac && this.ac.state === 'suspended') this.ac.resume()
    if (this.ac && !this.muted) { this._startAmbiance(); if (this.musicOn) this._startMusic() }
  }
  _tone(freq, dur, type, vol, slideTo) { if (!this.ac || this.muted) return; const o = this.ac.createOscillator(), g = this.ac.createGain(); o.type = type || 'sine'; o.frequency.value = freq; if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, this.ac.currentTime + dur); g.gain.setValueAtTime(0, this.ac.currentTime); g.gain.linearRampToValueAtTime(vol || 0.3, this.ac.currentTime + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, this.ac.currentTime + dur); o.connect(g); g.connect(this.master); o.start(); o.stop(this.ac.currentTime + dur + 0.02) }
  _noise(dur, vol, cut) { if (!this.ac || this.muted) return; const n = this.ac.createBufferSource(); const buf = this.ac.createBuffer(1, this.ac.sampleRate * dur, this.ac.sampleRate); const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length); n.buffer = buf; const f = this.ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cut || 1200; const g = this.ac.createGain(); g.gain.setValueAtTime(vol || 0.25, this.ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, this.ac.currentTime + dur); n.connect(f); f.connect(g); g.connect(this.master); n.start(); n.stop(this.ac.currentTime + dur) }
  _sfxSelect() { this._tone(620, 0.08, 'triangle', 0.16) }
  _sfxMove() { this._tone(180, 0.14, 'sine', 0.22, 90); this._noise(0.05, 0.12, 3200) }       // clac de bois
  _sfxCapture() { this._noise(0.16, 0.34, 2400); this._noise(0.42, 0.3, 360); this._tone(110, 0.24, 'sine', 0.28, 44) }  // canon : crack + boom grave
  _sfxKing() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this._tone(f, 0.22, 'triangle', 0.2), i * 70)) } // fanfare
  _sfxWin() { [523, 659, 784, 1047, 1319].forEach((f, i) => setTimeout(() => this._tone(f, 0.3, 'triangle', 0.22), i * 110)) }
  _sfxLose() { [392, 330, 262, 196].forEach((f, i) => setTimeout(() => this._tone(f, 0.34, 'sine', 0.2), i * 150)) }

  // Ambiance : vagues (bruit filtré modulé) + drone grave. Démarre au 1er geste.
  _startAmbiance() {
    if (!this.ac || this.muted || this._amb) return
    const ac = this.ac, len = ac.sampleRate * 2, buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
    const src = ac.createBufferSource(); src.buffer = buf; src.loop = true
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 480; bp.Q.value = 0.7
    const g = ac.createGain(); g.gain.setValueAtTime(0, ac.currentTime); g.gain.linearRampToValueAtTime(0.06, ac.currentTime + 2.5)
    const lfo = ac.createOscillator(); lfo.frequency.value = 0.12; const lg = ac.createGain(); lg.gain.value = 300; lfo.connect(lg); lg.connect(bp.frequency)
    const lfo2 = ac.createOscillator(); lfo2.frequency.value = 0.08; const lg2 = ac.createGain(); lg2.gain.value = 0.045; lfo2.connect(lg2); lg2.connect(g.gain)
    const dr = ac.createOscillator(); dr.type = 'sine'; dr.frequency.value = 54; const dg = ac.createGain(); dg.gain.value = 0.025
    src.connect(bp); bp.connect(g); g.connect(this.master); dr.connect(dg); dg.connect(this.master)
    src.start(); lfo.start(); lfo2.start(); dr.start()
    this._amb = { src, bp, g, lfo, lfo2, dr, dg, lg, lg2 }
  }
  _stopAmbiance() {
    const a = this._amb; if (!a) return; this._amb = null
    try { const t = this.ac.currentTime; a.g.gain.cancelScheduledValues(t); a.g.gain.setValueAtTime(a.g.gain.value, t); a.g.gain.linearRampToValueAtTime(0, t + 0.4) } catch (e) { /* */ }
    setTimeout(() => { [a.src, a.lfo, a.lfo2, a.dr].forEach(n => { try { n.stop() } catch (e) { /* */ } }); Object.values(a).forEach(n => { try { n.disconnect() } catch (e) { /* */ } }) }, 460)
  }
  // Musique : pad d'accords lent (vibe maritime), togglable.
  _startMusic() {
    if (!this.ac || this.muted || this._mus) return
    const ac = this.ac, chord = [146.83, 220.0, 261.63, 329.63]
    const out = ac.createGain(); out.gain.setValueAtTime(0, ac.currentTime); out.gain.linearRampToValueAtTime(0.08, ac.currentTime + 3); out.connect(this.master)
    const swell = ac.createOscillator(); swell.frequency.value = 0.05; const sg = ac.createGain(); sg.gain.value = 0.05; swell.connect(sg); sg.connect(out.gain)
    const oscs = chord.map((f, i) => { const o = ac.createOscillator(); o.type = i % 2 ? 'sine' : 'triangle'; o.frequency.value = f; o.detune.value = (i - 1.5) * 4; const g = ac.createGain(); g.gain.value = 0.25 / chord.length; o.connect(g); g.connect(out); o.start(); return o })
    swell.start(); this._mus = { out, swell, sg, oscs }
  }
  _stopMusic() {
    const m = this._mus; if (!m) return; this._mus = null
    try { const t = this.ac.currentTime; m.out.gain.cancelScheduledValues(t); m.out.gain.setValueAtTime(m.out.gain.value, t); m.out.gain.linearRampToValueAtTime(0, t + 0.6) } catch (e) { /* */ }
    setTimeout(() => { try { m.oscs.forEach(o => o.stop()); m.swell.stop() } catch (e) { /* */ } try { m.out.disconnect() } catch (e) { /* */ } }, 660)
  }

  dispose() {
    this._disposed = true
    try { this.root && this.root.unmount() } catch (e) { /* */ }
    try { this.mountEl && this.mountEl.remove() } catch (e) { /* */ }
    try { this._stopAmbiance(); this._stopMusic() } catch (e) { /* */ }
    try { if (this.ac) this.ac.close() } catch (e) { /* */ }
    this.store = null; this.root = null
  }
}
