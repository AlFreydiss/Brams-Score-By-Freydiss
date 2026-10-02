// Guess Who — ondes dessinées au canvas (une image par frame, aucun rendu React) :
// - LiveWave : le micro en direct. Avant la prise, barres qui suivent la voix ;
//   pendant la prise, une « bande » qui se remplit de gauche à droite jusqu'à la
//   durée max (on voit le temps qui reste) ;
// - WavePlayer : lecteur avec l'onde du son (original ou ta prise), touche pour
//   avancer, progression en rouge.
import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { C, FONT_BODY, FONT_DISPLAY } from './manga.jsx'
import { audioCtx, justUnblocked, onSound, pauseSound, playSound, seekSound, setSoundLoop, soundProgress, soundState } from '../../lib/guessWhoAudio.js'
import { levelOf } from './logic/mic.js'

const BARS = 32
const TAPE = 60

function fit(cv) {
  const dpr = window.devicePixelRatio || 1
  const w = Math.round(cv.clientWidth * dpr), h = Math.round(cv.clientHeight * dpr)
  if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h }
  return { w, h, dpr }
}

export default function LiveWave({ stream, startedAt = null, maxMs = 8000, height = 90 }) {
  const canvas = useRef(null)
  const props = useRef({ startedAt, maxMs })
  props.current = { startedAt, maxMs }
  useEffect(() => {
    const cv = canvas.current
    const ctx = audioCtx()
    if (!stream || !cv || !ctx) return
    if (ctx.state !== 'running') ctx.resume?.().catch(() => {})
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 1024
    analyser.smoothingTimeConstant = 0.6
    const source = ctx.createMediaStreamSource(stream)
    source.connect(analyser)
    const freq = new Uint8Array(analyser.frequencyBinCount)
    const time = new Uint8Array(analyser.fftSize)
    const tape = new Float32Array(TAPE)
    let tapeStart = null
    const g = cv.getContext('2d')
    let raf = 0
    const draw = () => {
      const { w, h, dpr } = fit(cv)
      const { startedAt: t0, maxMs: max } = props.current
      g.fillStyle = C.yellow
      g.fillRect(0, 0, w, h)
      g.fillStyle = C.ink
      if (t0 == null) {
        // Avant la prise : barres de fréquences au centre.
        tapeStart = null
        analyser.getByteFrequencyData(freq)
        const bw = w / BARS
        for (let i = 0; i < BARS; i++) {
          const v = freq[Math.floor((i / BARS) * freq.length * 0.35)] / 255
          const bh = Math.max(3 * dpr, v * h * 0.92)
          g.fillRect(i * bw + bw * 0.18, (h - bh) / 2, bw * 0.64, bh)
        }
      } else {
        // Pendant la prise : la bande se remplit au fil du temps.
        if (tapeStart !== t0) { tape.fill(0); tapeStart = t0 }
        analyser.getByteTimeDomainData(time)
        const p = Math.min(1, (performance.now() - t0) / max)
        const idx = Math.min(TAPE - 1, Math.floor(p * TAPE))
        tape[idx] = Math.max(tape[idx], Math.min(1, levelOf(time) * 3.2))
        const bw = w / TAPE
        for (let i = 0; i <= idx; i++) {
          const bh = Math.max(2 * dpr, tape[i] * h * 0.9)
          g.fillRect(i * bw + bw * 0.15, (h - bh) / 2, bw * 0.7, bh)
        }
        g.fillStyle = 'rgba(20,18,26,0.12)'
        g.fillRect(p * w, 0, w - p * w, h)
        g.fillStyle = C.red
        g.fillRect(p * w - dpr * 1.5, 0, dpr * 3, h)
        // temps écoulé / max, en coin
        g.font = `800 ${13 * dpr}px ${FONT_BODY}`
        g.textAlign = 'right'
        g.textBaseline = 'top'
        g.fillStyle = C.ink
        g.fillText(`${((p * max) / 1000).toFixed(1)} / ${Math.round(max / 1000)} s`, w - 8 * dpr, 6 * dpr)
      }
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(raf); try { source.disconnect() } catch { /* déjà coupé */ } }
  }, [stream])
  return (
    <canvas ref={canvas} aria-hidden
      style={{ width: '100%', height, display: 'block', border: `3px solid ${C.ink}`, boxShadow: `4px 4px 0 ${C.ink}`, background: C.yellow }} />
  )
}

// État du lecteur partagé pour ce son (re-rendu seulement aux play/pause/fin).
export function useSound(id) {
  const [s, setS] = useState(() => soundState(id))
  useEffect(() => {
    const sync = () => setS((prev) => {
      const next = soundState(id)
      return prev.playing === next.playing && prev.blocked === next.blocked && prev.error === next.error ? prev : next
    })
    sync()
    return onSound(sync)
  }, [id])
  return s
}

export function WavePlayer({ id, src, peaks, label, big = false, loop = false, autoPlay = false, disabled = false, onError, accent = C.red }) {
  const canvas = useRef(null)
  const s = useSound(id)
  const data = useRef({ peaks, playing: false, accent })
  data.current = { peaks, playing: s.playing, accent }

  // lecture auto (débloquée au premier geste sur iPhone, sinon bouton « Appuie »)
  useEffect(() => {
    if (!autoPlay || !src || disabled) return
    playSound(id, src, { loop })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, src, autoPlay])
  useEffect(() => setSoundLoop(id, loop), [id, loop])
  useEffect(() => () => pauseSound(id), [id])
  useEffect(() => { if (disabled) pauseSound(id) }, [disabled, id])
  useEffect(() => { if (s.error) onError?.() }, [s.error]) // eslint-disable-line react-hooks/exhaustive-deps

  // Dessin : une image tant que ça joue, sinon une seule fois.
  useEffect(() => {
    const cv = canvas.current
    if (!cv) return
    const g = cv.getContext('2d')
    let raf = 0
    const draw = () => {
      const { w, h, dpr } = fit(cv)
      const { peaks: pk, playing, accent: ac } = data.current
      const p = soundProgress(id)
      g.fillStyle = C.paper
      g.fillRect(0, 0, w, h)
      if (pk?.length) {
        const bw = w / pk.length
        for (let i = 0; i < pk.length; i++) {
          const bh = Math.max(2 * dpr, pk[i] * h * 0.86)
          g.fillStyle = (i + 0.5) / pk.length <= p ? ac : C.ink
          g.fillRect(i * bw + bw * 0.18, (h - bh) / 2, Math.max(dpr, bw * 0.64), bh)
        }
      } else {
        // sans onde (son non décodable) : simple barre de progression tramée
        g.fillStyle = C.tone
        g.fillRect(0, h / 2 - 2 * dpr, w, 4 * dpr)
        g.fillStyle = ac
        g.fillRect(0, h / 2 - 4 * dpr, w * p, 8 * dpr)
      }
      if (p > 0 && p < 1) { g.fillStyle = C.ink; g.fillRect(p * w - dpr, 0, 2 * dpr, h) }
      if (playing) raf = requestAnimationFrame(draw)
    }
    draw()
    const onResize = () => draw()
    window.addEventListener('resize', onResize)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize) }
  }, [id, s.playing, peaks, accent])

  const toggle = () => {
    if (disabled || !src) return
    const now = soundState(id)
    if (now.playing && !justUnblocked()) pauseSound(id)
    else if (!now.playing) playSound(id, src, { loop })
  }
  // toucher l'onde : y aller directement
  const seek = (e) => {
    if (disabled || !src) return
    const r = e.currentTarget.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width))
    if (soundState(id).playing) seekSound(id, ratio)
    else playSound(id, src, { loop, from: ratio })
  }
  const size = big ? 76 : 50
  return (
    <div style={{ display: 'grid', gap: 10, width: '100%' }}>
      {s.blocked && (
        <button type="button" className="gw-btn" onClick={() => { if (!soundState(id).playing) playSound(id, src, { loop }) }} style={{
          width: '100%', minHeight: 56, cursor: 'pointer', background: C.yellow, color: C.ink,
          border: `3px solid ${C.ink}`, boxShadow: `4px 4px 0 ${C.ink}`, fontFamily: FONT_DISPLAY, fontSize: 18,
        }}>🔊 Appuie pour écouter le son</button>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', opacity: disabled ? 0.45 : 1 }}>
        <motion.button type="button" className="gw-btn" onClick={toggle} whileTap={disabled ? undefined : { scale: 0.9 }}
          disabled={disabled || !src} aria-label={s.playing ? 'Pause' : `Écouter ${label || ''}`}
          style={{
            width: size, height: size, borderRadius: '50%', cursor: disabled ? 'default' : 'pointer', flex: '0 0 auto',
            background: s.playing ? C.yellow : accent, color: s.playing ? C.ink : '#fff',
            border: `3px solid ${C.ink}`, boxShadow: `3px 3px 0 ${C.ink}`,
            fontFamily: FONT_DISPLAY, fontSize: big ? 28 : 18, touchAction: 'manipulation',
          }}>
          {s.playing ? '❚❚' : '▶'}
        </motion.button>
        <canvas ref={canvas} onClick={seek} role="presentation"
          style={{
            flex: 1, minWidth: 0, height: big ? 70 : 46, display: 'block', cursor: disabled ? 'default' : 'pointer',
            border: `3px solid ${C.ink}`, background: C.paper, touchAction: 'manipulation',
          }} />
      </div>
    </div>
  )
}
