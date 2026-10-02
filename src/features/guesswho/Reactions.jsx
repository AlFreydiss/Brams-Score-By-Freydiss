// Guess Who — réactions en direct (😂🔥💀👏😱) : canal realtime « broadcast »
// du salon, rien n'est stocké. Chaque réaction s'envole chez tout le monde.
// Perf : animation CSS (transform/opacity) et nombre d'emojis à l'écran plafonné.
import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../../lib/supabase.js'
import { C } from './manga.jsx'
import { SoundToggle } from './fx.jsx'
import { vibrate } from './sfx.js'

export const EMOJIS = ['😂', '🔥', '💀', '👏', '😱']
const LIFE_MS = 2200
const MIN_GAP_MS = 300   // anti-spam à l'envoi (par joueur)
const MAX_ON_SCREEN = 22 // au-delà, les plus anciennes disparaissent

export function useReactions(code, enabled) {
  const [items, setItems] = useState([])
  const chRef = useRef(null)
  const last = useRef(0)

  const spawn = useCallback((emoji, mine = false) => {
    const id = `${Date.now()}-${Math.random()}`
    setItems((list) => [...list.slice(-(MAX_ON_SCREEN - 1)), {
      id, emoji, mine, x: 6 + Math.random() * 84, rot: -25 + Math.random() * 50, dx: -40 + Math.random() * 80,
    }])
    setTimeout(() => setItems((list) => list.filter((r) => r.id !== id)), LIFE_MS)
  }, [])

  useEffect(() => {
    if (!enabled || !supabase || !code) return
    // self: false → sa propre réaction s'affiche tout de suite, sans aller-retour réseau
    const ch = supabase.channel(`gwr:${code}`, { config: { broadcast: { self: false } } })
    ch.on('broadcast', { event: 'react' }, ({ payload }) => {
      if (EMOJIS.includes(payload?.emoji)) spawn(payload.emoji)
    })
    ch.subscribe()
    chRef.current = ch
    return () => { chRef.current = null; try { supabase.removeChannel(ch) } catch { /* déjà fermé */ } }
  }, [code, enabled, spawn])

  const send = useCallback((emoji) => {
    const now = Date.now()
    if (now - last.current < MIN_GAP_MS) return
    last.current = now
    spawn(emoji, true)
    vibrate(10)
    chRef.current?.send({ type: 'broadcast', event: 'react', payload: { emoji } })
  }, [spawn])

  return { items, send }
}

export function ReactionBar({ onSend }) {
  return (
    <div role="group" aria-label="Réagir" style={{
      position: 'fixed', left: '50%', bottom: 'max(12px, env(safe-area-inset-bottom))', transform: 'translateX(-50%)',
      zIndex: 55, display: 'flex', alignItems: 'center', gap: 5, padding: 5, background: C.paper,
      border: `3px solid ${C.ink}`, boxShadow: `4px 4px 0 ${C.ink}`, maxWidth: 'calc(100vw - 24px)', boxSizing: 'border-box',
    }}>
      {EMOJIS.map((e) => (
        <motion.button key={e} type="button" className="gw-btn" onClick={() => onSend(e)} whileTap={{ scale: 0.75, rotate: -12 }}
          aria-label={`Réagir ${e}`}
          style={{ width: 46, height: 46, fontSize: 24, cursor: 'pointer', background: C.paper, border: `2px solid ${C.ink}`, lineHeight: 1, padding: 0 }}>
          {e}
        </motion.button>
      ))}
      <span aria-hidden style={{ width: 2, alignSelf: 'stretch', background: C.ink, margin: '0 2px' }} />
      <SoundToggle />
    </div>
  )
}

export function FloatingReactions({ items }) {
  return (
    <div aria-hidden style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 54, overflow: 'hidden', contain: 'strict' }}>
      {items.map((r) => (
        <span key={r.id} className="gw-anim" style={{
          position: 'absolute', left: `${r.x}%`, bottom: 78, fontSize: r.mine ? 46 : 40, lineHeight: 1,
          textShadow: `3px 3px 0 ${C.ink}`, willChange: 'transform, opacity',
          '--rot': `${r.rot}deg`, '--dx': `${r.dx}px`,
          animation: `gw-float-up ${LIFE_MS}ms cubic-bezier(.2,.7,.3,1) both`,
        }}>{r.emoji}</span>
      ))}
    </div>
  )
}
