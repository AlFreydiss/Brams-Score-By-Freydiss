// Guess Who — animations « cartoon » sobres : les principes du dessin animé
// (anticipation, écrasement-étirement, impact, dépassement, inertie) appliqués
// à la trame de points, sans lueur floue ni secousse d'écran.
// Tout passe par framer-motion (JS) : non touché par html.low-end ; rien que
// des transform/opacity ; version fixe si l'OS demande moins d'animations.
import { motion, useReducedMotion } from 'framer-motion'
import { T } from './theme.js'
import DotText from './DotText.jsx'

// Instant de l'impact dans le tampon (fraction de sa durée) : la poussière
// part à ce moment-là, pas avant.
const STAMP_S = 0.5
const IMPACT_AT = 0.42

// Poussière d'impact : petits carrés qui fusent de chaque côté, en cloche.
function Dust({ color, delay }) {
  return (
    <span aria-hidden style={{ position: 'absolute', left: '50%', bottom: -2, width: 0, height: 0 }}>
      {[-1, 1].flatMap((dir) => [26, 42, 58].map((d, k) => (
        <motion.span key={`${dir}-${k}`}
          initial={{ x: 0, y: 0, opacity: 0, scale: 1 }}
          animate={{ x: dir * d, y: [0, -9 + k * 3, 3], opacity: [0, 1, 0], scale: [1, 1, 0.4] }}
          transition={{ delay, duration: 0.55 + k * 0.08, ease: 'easeOut', times: [0, 0.4, 1] }}
          style={{ position: 'absolute', left: -2, top: -2, width: 4 - (k > 1 ? 1 : 0), height: 4 - (k > 1 ? 1 : 0), background: color }} />
      )))}
    </span>
  )
}

// Tampon « K.O. » : tombe de très haut, s'écrase à l'impact, rebondit un
// peu et se fige légèrement penché, comme un coup de tampon encreur.
export function KoStamp() {
  const reduce = useReducedMotion()
  return (
    <motion.div aria-hidden
      initial={reduce ? { opacity: 0 } : { opacity: 0, scaleX: 2.6, scaleY: 2.6, rotate: -18 }}
      animate={reduce ? { opacity: 1, rotate: -8 } : {
        opacity: [0, 1, 1, 1], scaleX: [2.6, 1.24, 0.95, 1], scaleY: [2.6, 0.72, 1.08, 1], rotate: [-18, -6, -10, -8],
      }}
      transition={{ duration: STAMP_S, times: [0, IMPACT_AT, 0.72, 1], ease: ['easeIn', 'easeOut', 'easeInOut'] }}
      style={{
        position: 'absolute', left: '50%', top: '50%', x: '-50%', y: '-50%', zIndex: 3, pointerEvents: 'none',
        padding: '7px 11px', border: `1px solid ${T.danger}`, borderRadius: 6, background: 'rgba(11,11,12,0.92)',
      }}>
      <DotText text="K.O." dot={6.5} color={T.danger} />
      {!reduce && <Dust color={T.danger} delay={STAMP_S * IMPACT_AT} />}
    </motion.div>
  )
}

// Éclats d'une vie qui se brise : quatre morceaux partent en diagonale,
// tournent et tombent (gravité), puis disparaissent.
export function LifeShards({ size, color = T.danger }) {
  const reduce = useReducedMotion()
  if (reduce) return null
  const s = Math.max(3, Math.round(size / 2))
  return (
    <span aria-hidden style={{ position: 'absolute', left: '50%', top: '50%', width: 0, height: 0, pointerEvents: 'none' }}>
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([dx, dy], k) => (
        <motion.span key={k}
          initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
          animate={{ x: dx * (10 + k * 2), y: [0, dy * 7 - 6, 30 + k * 4], rotate: dx * (80 + k * 25), opacity: [1, 1, 0] }}
          transition={{ delay: 0.16, duration: 0.85, ease: [0.3, 0, 0.7, 1], times: [0, 0.3, 1] }}
          style={{ position: 'absolute', left: -s / 2, top: -s / 2, width: s, height: s, background: color }} />
      ))}
    </span>
  )
}

// Atterrissage d'une étiquette : tombe, s'écrase, rebondit, se pose.
export const LAND = {
  initial: { y: -22, opacity: 0, scaleY: 1.3, scaleX: 0.85 },
  animate: { y: [-22, 0, -4, 0], opacity: [0, 1, 1, 1], scaleY: [1.3, 0.74, 1.08, 1], scaleX: [0.85, 1.2, 0.96, 1] },
  transition: { duration: 0.5, times: [0, 0.45, 0.72, 1], ease: 'easeOut' },
}
