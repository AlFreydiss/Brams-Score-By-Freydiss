import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { C, FONT_BODY, FONT_DISPLAY, PhaseFrame } from './manga.jsx'
import { AvatarName } from './ui.jsx'
import { play, vibrate } from './sfx.js'

// Leurres qui défilent avec les vrais gages (la machine ne connaît que le gage tiré).
const DECOYS = [
  "Chanter l'opening de Naruto",
  'Parler comme Goku pendant 2 minutes',
  'Imiter un Pokémon au choix',
  '10 pompes en vocal',
  'Dire « Dattebayo » à chaque phrase',
  'Pseudo « Je suis éclaté » pendant 1 h',
  'Raconter sa pire honte',
  'Faire le cri de Luffy',
  'Danser 10 s en caméra',
  'Déclarer sa flamme à un perso de One Piece',
]

const STEPS = 22
// Délai entre deux crans : rapide puis freinage marqué (≈ 3 s au total).
const delayAt = (k) => 50 + 340 * Math.pow(k / STEPS, 2.6)

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

// Une machine à sous verticale qui ralentit et s'arrête sur le vrai gage.
function Reel({ result, player, extraSteps = 0, pool }) {
  const reduce = useReducedMotion()
  const total = STEPS + extraSteps
  const reel = useMemo(() => {
    const fill = shuffle([...pool.filter((x) => x !== result.gage), ...DECOYS])
    return [...Array.from({ length: total }, (_, i) => fill[i % fill.length]), result.gage]
  }, [result.gage, pool, total])
  const [k, setK] = useState(reduce ? total : 0)
  const done = k >= total
  useEffect(() => {
    if (reduce || done) return
    const t = setTimeout(() => {
      setK(k + 1)
      if (k + 1 >= total) { play('boom'); vibrate([90, 40, 160]) } else play('slot')
    }, delayAt(Math.min(k, STEPS)))
    return () => clearTimeout(t)
  }, [k, done, reduce, total])

  return (
    <div style={{ display: 'grid', gap: 12, marginBottom: 26 }}>
      <AvatarName player={player || { display_name: result.name }} size={52} sub="doit faire ce gage" />
      {!done ? (
        <div aria-hidden style={{
          position: 'relative', height: 'clamp(130px, 26vw, 150px)', overflow: 'hidden', background: C.ink,
          border: `3px solid ${C.ink}`, boxShadow: `6px 6px 0 ${C.red}`,
        }}>
          <AnimatePresence initial={false}>
            <motion.div key={k}
              initial={{ y: '-100%' }} animate={{ y: '0%' }} exit={{ y: '100%' }}
              transition={{ duration: Math.min(0.28, delayAt(Math.min(k, STEPS)) / 1000), ease: 'linear' }}
              style={{
                position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', padding: '0 18px', textAlign: 'center',
                color: C.yellow, fontFamily: FONT_DISPLAY, fontSize: 'clamp(1.05rem, 4.2vw, 1.6rem)', lineHeight: 1.12, overflowWrap: 'anywhere',
              }}>{reel[k]}</motion.div>
          </AnimatePresence>
          {/* fenêtre de la machine : bandes d'ombre haut/bas */}
          <span style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(#14121A 0, transparent 14%, transparent 86%, #14121A 100%)' }} />
          <span style={{ position: 'absolute', left: 0, right: 0, top: '50%', borderTop: `2px dashed ${C.red}`, opacity: 0.6 }} />
        </div>
      ) : (
        <motion.div
          initial={reduce ? { opacity: 0 } : { scale: 0.3, rotate: 10, opacity: 0 }}
          animate={{ scale: 1, rotate: -2, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 440, damping: 12 }}
          style={{ position: 'relative', margin: '14px 6px 10px' }}>
          {/* onomatopée qui claque derrière la bulle */}
          <motion.span aria-hidden initial={{ scale: 0.2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 10, delay: 0.08 }}
            style={{
              position: 'absolute', right: -6, top: -34, zIndex: 2, fontFamily: FONT_DISPLAY, fontSize: 'clamp(2rem, 8vw, 3.4rem)',
              color: C.red, WebkitTextStroke: `3px ${C.ink}`, paintOrder: 'stroke fill', textShadow: `4px 4px 0 ${C.ink}`, transform: 'rotate(10deg)',
            }}>ドーン!</motion.span>
          <div style={{
            background: C.yellow, border: `4px solid ${C.ink}`, borderRadius: '50% / 38%', boxShadow: `6px 6px 0 ${C.ink}`,
            padding: 'clamp(26px,5vw,40px) clamp(22px,6vw,56px)', textAlign: 'center',
          }}>
            <div style={{ fontFamily: FONT_BODY, fontWeight: 800, fontSize: 15, color: C.ink }}>{result.name}, ton gage :</div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 'clamp(1.5rem, 5.5vw, 2.5rem)', lineHeight: 1.15, color: C.ink, margin: '10px 0', overflowWrap: 'anywhere' }}>
              « {result.gage} »
            </div>
            <div style={{ fontFamily: FONT_BODY, fontWeight: 700, fontSize: 13.5, color: C.ink }}>
              {result.author ? `Écrit par ${result.author}` : 'Gage de secours'}
            </div>
          </div>
          <span aria-hidden style={{
            position: 'absolute', left: '22%', bottom: -22, width: 0, height: 0,
            borderLeft: '16px solid transparent', borderRight: '16px solid transparent', borderTop: `26px solid ${C.ink}`,
          }} />
        </motion.div>
      )}
    </div>
  )
}

// Tirage du gage : une machine par éliminé, arrêts décalés pour garder le suspense.
export default function GageWheel({ g }) {
  const results = g.room.gage_result || []
  // clé texte : le sondage renvoie un nouveau tableau toutes les 3 s, la machine ne doit pas se rebattre
  const poolKey = JSON.stringify(results.map((r) => r.gage))
  const pool = useMemo(() => JSON.parse(poolKey), [poolKey])
  const names = results.map((r) => r.name).join(' et ')
  const meOut = results.some((r) => r.user_id === g.me?.user_id)
  return (
    <PhaseFrame eyebrow="Éliminé" prompt={meOut ? 'C\'est toi qui trinques 😈' : `${names} ${results.length > 1 ? 'doivent' : 'doit'} faire un gage`}
      remaining={g.remaining} total={g.total} tilt={-1}>
      {results.map((r, i) => (
        <Reel key={r.user_id} result={r} pool={pool} extraSteps={i * 4}
          player={g.players.find((p) => p.user_id === r.user_id)} />
      ))}
      <p style={{ margin: 0, textAlign: 'center', fontFamily: FONT_BODY, fontWeight: 800, color: C.textMut }}>
        🎙️ En vocal, maintenant !
      </p>
    </PhaseFrame>
  )
}
