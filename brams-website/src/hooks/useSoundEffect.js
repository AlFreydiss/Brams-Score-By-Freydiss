import { useCallback, useRef, useEffect } from 'react'

// Génère des sons via Web Audio API — aucun fichier audio requis
let _ctx = null
const getCtx = () => {
  if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)()
  return _ctx
}

const SOUNDS = {
  hover: (ctx) => {
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.connect(g); g.connect(ctx.destination)
    o.frequency.setValueAtTime(880, ctx.currentTime)
    o.frequency.exponentialRampToValueAtTime(1100, ctx.currentTime + 0.06)
    g.gain.setValueAtTime(0.04, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08)
    o.start(); o.stop(ctx.currentTime + 0.08)
  },
  click: (ctx) => {
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.connect(g); g.connect(ctx.destination)
    o.type = 'square'
    o.frequency.setValueAtTime(440, ctx.currentTime)
    o.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.1)
    g.gain.setValueAtTime(0.12, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12)
    o.start(); o.stop(ctx.currentTime + 0.12)
  },
  success: (ctx) => {
    [[523, 0], [659, 0.1], [784, 0.2]].forEach(([freq, when]) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.connect(g); g.connect(ctx.destination)
      o.frequency.value = freq
      g.gain.setValueAtTime(0.12, ctx.currentTime + when)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + when + 0.2)
      o.start(ctx.currentTime + when)
      o.stop(ctx.currentTime + when + 0.2)
    })
  },
  notification: (ctx) => {
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.connect(g); g.connect(ctx.destination)
    o.type = 'sine'
    o.frequency.setValueAtTime(660, ctx.currentTime)
    o.frequency.setValueAtTime(880, ctx.currentTime + 0.1)
    g.gain.setValueAtTime(0.15, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
    o.start(); o.stop(ctx.currentTime + 0.3)
  },
  awakening: (ctx) => {
    // Son épique — onde grave + harmonique
    const nodes = []
    [[80, 'sawtooth', 0.18], [160, 'sine', 0.1], [320, 'sine', 0.06]].forEach(([freq, type, vol]) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = type
      o.connect(g); g.connect(ctx.destination)
      o.frequency.setValueAtTime(freq, ctx.currentTime)
      o.frequency.exponentialRampToValueAtTime(freq * 0.5, ctx.currentTime + 1.5)
      g.gain.setValueAtTime(vol, ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5)
      o.start(); o.stop(ctx.currentTime + 1.5)
      nodes.push(o)
    })
  },
  haki: (ctx) => {
    // Grondement sourd
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.8, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length)
    const src = ctx.createBufferSource()
    const g = ctx.createGain()
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'; filter.frequency.value = 120
    src.buffer = buf
    src.connect(filter); filter.connect(g); g.connect(ctx.destination)
    g.gain.setValueAtTime(0.5, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8)
    src.start()
  },
  hit: (ctx) => {
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.15, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length)
    const src = ctx.createBufferSource()
    const g = ctx.createGain()
    src.buffer = buf; src.connect(g); g.connect(ctx.destination)
    g.gain.setValueAtTime(0.3, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)
    src.start()
  },
}

const MUTE_KEY = 'brams_sound_muted'

export function useSoundEffect() {
  const muted = useRef(localStorage.getItem(MUTE_KEY) === 'true')

  const play = useCallback((name) => {
    if (muted.current) return
    try {
      const ctx = getCtx()
      if (ctx.state === 'suspended') ctx.resume()
      SOUNDS[name]?.(ctx)
    } catch { /* silencieux */ }
  }, [])

  const toggleMute = useCallback(() => {
    muted.current = !muted.current
    localStorage.setItem(MUTE_KEY, muted.current)
    return muted.current
  }, [])

  const isMuted = useCallback(() => muted.current, [])

  return { play, toggleMute, isMuted }
}

// Hook pratique pour ajouter hover + click sons à un élément
export function useSoundHandlers() {
  const { play } = useSoundEffect()
  return {
    onMouseEnter: () => play('hover'),
    onClick:      () => play('click'),
  }
}
