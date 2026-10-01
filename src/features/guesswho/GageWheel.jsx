import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { C, FONT_BODY, FONT_DISPLAY, PhaseFrame } from './manga.jsx'

// Tirage : les gages défilent façon machine à sous (~2,5 s) puis le gage tiré
// tombe dans une grosse bulle de dialogue.
export default function GageWheel({ g }) {
  const reduce = useReducedMotion()
  const results = g.room.gage_result || []
  const pool = results.map((r) => r.gage)
  const [spin, setSpin] = useState(0)
  const [done, setDone] = useState(!!reduce)
  useEffect(() => {
    if (reduce) return
    const t = setInterval(() => setSpin((s) => s + 1), 85)
    const end = setTimeout(() => { clearInterval(t); setDone(true) }, 2500)
    return () => { clearInterval(t); clearTimeout(end) }
  }, [reduce])
  const names = results.map((r) => r.name).join(' et ')
  return (
    <PhaseFrame eyebrow="Éliminé" prompt={`${names} ${results.length > 1 ? 'doivent' : 'doit'} faire un gage`}
      remaining={g.remaining} total={g.total} tilt={-1}>
      {!done ? (
        <div style={{
          border: `3px solid ${C.ink}`, background: C.ink, color: C.yellow, padding: '26px 14px', textAlign: 'center',
          fontFamily: FONT_DISPLAY, fontSize: 'clamp(1.2rem, 3.5vw, 1.8rem)', overflow: 'hidden',
        }}>
          {pool.length ? pool[spin % pool.length] : '…'}
        </div>
      ) : results.map((r) => (
        <motion.div key={r.user_id}
          initial={{ scale: 0.4, rotate: 8, opacity: 0 }} animate={{ scale: 1, rotate: -2, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 420, damping: 13 }}
          style={{ position: 'relative', margin: '8px 6px 26px' }}>
          <div style={{
            background: C.yellow, border: `4px solid ${C.ink}`, borderRadius: '50% / 38%', boxShadow: `6px 6px 0 ${C.ink}`,
            padding: 'clamp(26px,5vw,40px) clamp(24px,6vw,56px)', textAlign: 'center',
          }}>
            <div style={{ fontFamily: FONT_BODY, fontWeight: 800, fontSize: 15, color: C.ink }}>{r.name}, ton gage :</div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 'clamp(1.5rem, 4.5vw, 2.4rem)', lineHeight: 1.15, color: C.ink, margin: '10px 0' }}>
              « {r.gage} »
            </div>
            <div style={{ fontFamily: FONT_BODY, fontWeight: 700, fontSize: 13.5, color: C.ink }}>
              {r.author ? `Écrit par ${r.author}` : 'Gage de secours'}
            </div>
          </div>
          {/* queue de la bulle */}
          <span aria-hidden style={{
            position: 'absolute', left: '22%', bottom: -22, width: 0, height: 0,
            borderLeft: '16px solid transparent', borderRight: '16px solid transparent', borderTop: `26px solid ${C.ink}`,
          }} />
        </motion.div>
      ))}
    </PhaseFrame>
  )
}
