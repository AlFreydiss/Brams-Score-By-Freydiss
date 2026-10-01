// Guess Who — réactions en direct (😂🔥💀👏😱) : canal realtime « broadcast »
// du salon, rien n'est stocké. Chaque réaction s'envole chez tout le monde.
import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { supabase } from '../../lib/supabase.js'
import { C, FONT_DISPLAY } from './manga.jsx'

export const EMOJIS = ['😂', '🔥', '💀', '👏', '😱']
const LIFE_MS = 2200
const MIN_GAP_MS = 250 // anti-spam par joueur

export function useReactions(code, enabled) {
  const [items, setItems] = useState([])
  const chRef = useRef(null)
  const last = useRef(0)

  const spawn = useCallback((emoji) => {
    const id = `${Date.now()}-${Math.random()}`
    setItems((list) => [...list.slice(-30), { id, emoji, x: 8 + Math.random() * 84, rot: -25 + Math.random() * 50 }])
    setTimeout(() => setItems((list) => list.filter((r) => r.id !== id)), LIFE_MS)
  }, [])

  useEffect(() => {
    if (!enabled || !supabase || !code) return
    const ch = supabase.channel(`gwr:${code}`, { config: { broadcast: { self: true } } })
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
    if (chRef.current) chRef.current.send({ type: 'broadcast', event: 'react', payload: { emoji } })
    else spawn(emoji)
  }, [spawn])

  return { items, send }
}

export function ReactionBar({ onSend }) {
  return (
    <div role="group" aria-label="Réagir" style={{
      position: 'fixed', left: '50%', bottom: 'max(14px, env(safe-area-inset-bottom))', transform: 'translateX(-50%)',
      zIndex: 55, display: 'flex', gap: 6, padding: 6, background: C.paper, border: `3px solid ${C.ink}`, boxShadow: `4px 4px 0 ${C.ink}`,
    }}>
      {EMOJIS.map((e) => (
        <motion.button key={e} type="button" className="gw-btn" onClick={() => onSend(e)} whileTap={{ scale: 0.8, rotate: -10 }}
          aria-label={`Réagir ${e}`}
          style={{ width: 46, height: 46, fontSize: 24, cursor: 'pointer', background: C.paper, border: `2px solid ${C.ink}`, lineHeight: 1 }}>
          {e}
        </motion.button>
      ))}
    </div>
  )
}

export function FloatingReactions({ items }) {
  const reduce = useReducedMotion()
  return (
    <div aria-hidden style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 54, overflow: 'hidden' }}>
      <AnimatePresence>
        {items.map((r) => (
          <motion.span key={r.id}
            initial={{ y: 0, opacity: 0, scale: 0.4, rotate: 0 }}
            animate={reduce ? { opacity: 1 } : { y: -420, opacity: [0, 1, 1, 0], scale: [0.4, 1.5, 1.2, 1], rotate: r.rot }}
            exit={{ opacity: 0 }}
            transition={{ duration: LIFE_MS / 1000, ease: 'easeOut' }}
            style={{
              position: 'absolute', left: `${r.x}%`, bottom: 70, fontSize: 44, fontFamily: FONT_DISPLAY,
              filter: `drop-shadow(3px 3px 0 ${C.ink})`,
            }}>{r.emoji}</motion.span>
        ))}
      </AnimatePresence>
    </div>
  )
}
