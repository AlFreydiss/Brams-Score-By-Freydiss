import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { type } from '../../styles/typography.js'
import { C, alpha } from '../garticphone/theme.js'
import { PhaseFrame } from '../garticphone/ui.jsx'

// Roue : les noms défilent ~2,5 s puis le gage tiré s'affiche en grand.
export default function GageWheel({ g }) {
  const results = g.room.gage_result || []
  const names = g.players.map((p) => p.display_name)
  const [spin, setSpin] = useState(0)
  const [done, setDone] = useState(false)
  useEffect(() => {
    const t = setInterval(() => setSpin((s) => s + 1), 90)
    const end = setTimeout(() => { clearInterval(t); setDone(true) }, 2500)
    return () => { clearInterval(t); clearTimeout(end) }
  }, [])
  return (
    <PhaseFrame eyebrow="Éliminé" prompt={results.map((r) => r.name).join(' et ') + (results.length > 1 ? ' doivent' : ' doit') + ' faire un gage'}
      remaining={g.remaining} total={g.total}>
      {!done ? (
        <div style={{ textAlign: 'center', padding: '30px 0', ...type.h2, color: C.gold }}>
          🎡 {names[spin % Math.max(1, names.length)]}
        </div>
      ) : results.map((r) => (
        <motion.div key={r.user_id} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 18 }}
          style={{ textAlign: 'center', padding: '24px 18px', margin: '10px 0', borderRadius: 18,
            background: alpha(C.ember, 0.14), border: `1px solid ${alpha(C.ember, 0.4)}` }}>
          <div style={{ ...type.small, color: C.textMut }}>{r.name} doit :</div>
          <div style={{ ...type.h2, color: C.text, margin: '8px 0' }}>« {r.gage} »</div>
          <div style={{ ...type.small, color: C.textMut }}>{r.author ? `Gage écrit par ${r.author}` : 'Gage de secours'}</div>
        </motion.div>
      ))}
    </PhaseFrame>
  )
}
