import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { PhaseFrame } from './manga.jsx'
import { T, F, LINE, RADIUS, SHADOW, plate, label } from './theme.js'
import { AvatarName, DotBurst } from './ui.jsx'
import { play, vibrate } from './sfx.js'
import { pulseFrom } from './SoundField.jsx'

// Leurres de repli : seulement si le serveur n'a pas publié les gages de la partie (room.gage_pool).
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

// Enseigne de machine à sous : rangée de points en haut ou en bas.
// `chase` : un point sur trois allumé qui défile (tirage en cours) ;
// sinon toute la rangée allumée qui clignote trois fois (gage tiré).
function Marquee({ edge, chase = false, reverse = false }) {
  const lit = chase
    ? `linear-gradient(90deg, ${T.accentLit} 0 4px, transparent 4px) 0 0 / 27px 4px repeat-x`
    : `linear-gradient(90deg, ${T.accentLit} 0 4px, transparent 4px) 0 0 / 9px 4px repeat-x`
  return (
    <span aria-hidden style={{ position: 'absolute', left: 14, right: 14, [edge]: 10, height: 4, pointerEvents: 'none',
      background: `linear-gradient(90deg, rgba(237,234,227,0.14) 0 4px, transparent 4px) 0 0 / 9px 4px repeat-x` }}>
      <span className="gw-anim gw-keep" style={{
        position: 'absolute', inset: 0, background: lit,
        ...(chase
          ? { '--gw-d': '.45s', '--gw-n': 'infinite', animation: `gw-chase .45s steps(3) infinite${reverse ? ' reverse' : ''}` }
          : { '--gw-d': '.32s', '--gw-n': '3', animation: 'gw-flicker .32s steps(2) 3' }),
      }} />
    </span>
  )
}

// Une machine à sous verticale qui ralentit et s'arrête sur le vrai gage.
function Reel({ result, player, extraSteps = 0, pool }) {
  const reduce = useReducedMotion()
  const total = STEPS + extraSteps
  const reel = useMemo(() => {
    const others = pool.filter((x) => x !== result.gage)
    // vrais gages de la partie ; leurres en complément s'il y en a trop peu
    const fill = shuffle(others.length >= 3 ? others : [...others, ...DECOYS])
    return [...Array.from({ length: total }, (_, i) => fill[i % fill.length]), result.gage]
  }, [result.gage, pool, total])
  const [k, setK] = useState(reduce ? total : 0)
  const card = useRef(null)
  const done = k >= total
  useEffect(() => {
    if (reduce || done) return
    const t = setTimeout(() => {
      setK(k + 1)
      if (k + 1 >= total) {
        play('boom'); vibrate([90, 40, 160])
        // onde dorée depuis le gage tiré, une fois la carte affichée
        setTimeout(() => pulseFrom(card.current, 'gold'), 60)
      } else play('slot')
    }, delayAt(Math.min(k, STEPS)))
    return () => clearTimeout(t)
  }, [k, done, reduce, total])

  return (
    <div style={{ display: 'grid', gap: 12, marginBottom: 26 }}>
      <AvatarName player={player || { display_name: result.name }} size={52} sub="doit faire ce gage" />
      {!done ? (
        <div aria-hidden style={{
          position: 'relative', height: 'clamp(120px, 24vw, 140px)', overflow: 'hidden', background: T.deep,
          border: LINE, borderRadius: RADIUS.md,
        }}>
          <AnimatePresence initial={false}>
            <motion.div key={k}
              initial={{ y: '-100%' }} animate={{ y: '0%' }} exit={{ y: '100%' }}
              transition={{ duration: Math.min(0.28, delayAt(Math.min(k, STEPS)) / 1000), ease: 'linear' }}
              style={{
                position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', padding: '0 20px', textAlign: 'center',
                color: T.textHi, fontFamily: F.display, fontWeight: 500, fontSize: 'clamp(1.05rem, 4.2vw, 1.5rem)', lineHeight: 1.15, overflowWrap: 'anywhere',
              }}>{reel[k]}</motion.div>
          </AnimatePresence>
          {/* fenêtre de la machine : fondu haut/bas, repères carrés, enseigne qui chasse */}
          <span style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: `linear-gradient(${T.deep} 0, transparent 22%, transparent 78%, ${T.deep} 100%)` }} />
          <span style={{ position: 'absolute', left: 6, top: 'calc(50% - 3px)', width: 6, height: 6, background: T.accent }} />
          <span style={{ position: 'absolute', right: 6, top: 'calc(50% - 3px)', width: 6, height: 6, background: T.accent }} />
          <Marquee edge="top" chase />
          <Marquee edge="bottom" chase reverse />
        </div>
      ) : (
        <motion.div ref={card}
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.35, ease: [0.2, 0.7, 0.2, 1] }}
          style={{
            ...plate({ borderRadius: RADIUS.lg }), border: `1px solid ${T.accent}`,
            boxShadow: `0 0 0 4px ${T.glow}, 0 0 40px rgba(199,168,105,0.16), ${SHADOW.soft}`,
            padding: 'clamp(28px,5vw,40px) clamp(20px,5vw,40px)', textAlign: 'center', position: 'relative',
          }}>
          {/* à l'arrêt : l'enseigne s'allume en entier et clignote trois fois */}
          <Marquee edge="top" />
          <Marquee edge="bottom" />
          {!reduce && <DotBurst />}
          <div style={label({ color: T.accent })}>{result.name}, ton gage</div>
          <div style={{ fontFamily: F.display, fontWeight: 500, fontSize: 'clamp(1.4rem, 5vw, 2.2rem)', lineHeight: 1.18, color: T.textHi, margin: '12px 0', overflowWrap: 'anywhere' }}>
            « {result.gage} »
          </div>
          <div style={{ fontFamily: F.ui, fontWeight: 500, fontSize: 13.5, color: T.textMute }}>
            {result.author ? `Écrit par ${result.author}` : 'Gage de secours'}
          </div>
        </motion.div>
      )}
    </div>
  )
}

// Tirage du gage : une machine par éliminé, arrêts décalés pour garder le suspense.
export default function GageWheel({ g }) {
  const results = g.room.gage_result || []
  // Gages de toute la partie (sans auteurs, migration 20261002b), sinon seulement ceux tirés.
  const served = Array.isArray(g.room.gage_pool) ? g.room.gage_pool.filter((x) => typeof x === 'string' && x) : []
  // clé texte : le sondage renvoie un nouveau tableau toutes les 3 s, la machine ne doit pas se rebattre
  const poolKey = JSON.stringify(served.length ? served : results.map((r) => r.gage))
  const pool = useMemo(() => JSON.parse(poolKey), [poolKey])
  const names = results.map((r) => r.name).join(' et ')
  const meOut = results.some((r) => r.user_id === g.me?.user_id)
  // Dernier tour sans éliminé : le serveur a désigné le(s) joueur(s) au moins de vies.
  const final = g.room.last_result?.final || []
  return (
    <PhaseFrame eyebrow={final.length ? 'Verdict final' : 'Éliminé'} prompt={meOut ? 'C\'est toi qui trinques' : `${names} ${results.length > 1 ? 'doivent' : 'doit'} faire un gage`}
      remaining={g.remaining} total={g.total}>
      {final.length > 0 && (
        <p role="status" style={{ margin: '0 0 16px', padding: '10px 14px', border: `1px solid ${T.accent}`, borderRadius: RADIUS.md, background: 'rgba(199,168,105,0.08)',
          fontFamily: F.ui, fontWeight: 600, color: T.textHi }}>
          Dernier tour sans éliminé : le joueur avec le moins de vies (puis de votes) prend le gage.
        </p>
      )}
      {results.map((r, i) => (
        <Reel key={r.user_id} result={r} pool={pool} extraSteps={i * 4}
          player={g.players.find((p) => p.user_id === r.user_id)} />
      ))}
      <p style={{ margin: 0, textAlign: 'center', fontFamily: F.ui, fontWeight: 600, color: T.textMute }}>
        En vocal, maintenant.
      </p>
    </PhaseFrame>
  )
}
