import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { C, PhaseFrame, SPRING_POP, type } from './manga.jsx'
import { T, F, LINE, RADIUS, SHADOW, plate } from './theme.js'
import { AvatarName, Lives } from './ui.jsx'
import { Confetti, CountUp } from './fx.jsx'
import { play, vibrate } from './sfx.js'
import { pulseFrom } from './SoundField.jsx'

// Rythme de la révélation (le verdict ne dure que 8 s).
const FIRST_MS = 350
const GAP_MS = 420

// Ton verdict à toi : un cadre de points autour de l'écran (doré si tu es le
// meilleur, rouge si tu perds une vie) qui clignote puis s'éteint (1,8 s).
// Pas de lueur floue : l'or flou vire au brun sur ce fond. Portail vers
// <body> : le cadre de phase animé (transform) piégerait le position: fixed.
const EDGE_TONE = { gold: T.accentLit, red: T.danger }
function Vignette({ tone }) {
  const c = EDGE_TONE[tone]
  const h = `linear-gradient(90deg, ${c} 0 5px, transparent 5px) 0 0 / 11px 5px repeat-x`
  const v = `linear-gradient(180deg, ${c} 0 5px, transparent 5px) 0 0 / 5px 11px repeat-y`
  const strip = { position: 'absolute' }
  return createPortal(
    <div aria-hidden className="gw-anim gw-keep" style={{
      position: 'fixed', inset: 10, zIndex: 55, pointerEvents: 'none',
      '--gw-d': '1.8s', animation: 'gw-vignette 1.8s linear both',
    }}>
      <span style={{ ...strip, top: 0, left: 0, right: 0, height: 5, background: h }} />
      <span style={{ ...strip, bottom: 0, left: 0, right: 0, height: 5, background: h }} />
      <span style={{ ...strip, top: 0, bottom: 0, left: 0, width: 5, background: v }} />
      <span style={{ ...strip, top: 0, bottom: 0, right: 0, width: 5, background: v }} />
    </div>,
    document.body,
  )
}

// Jauge de votes : un point par vote possible, ils s'allument un à un au
// rythme du compteur (même trame de points que le fond).
function VoteDots({ n, max, hot, cold, reduce, delay, step }) {
  const on = hot ? T.accentLit : cold ? T.danger : T.accent
  return (
    <span aria-hidden style={{ display: 'flex', gap: 5, flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: 120, flex: '0 1 auto' }}>
      {Array.from({ length: max }, (_, k) => (
        <motion.span key={k}
          initial={{ backgroundColor: 'rgba(237,234,227,0.14)', scale: 1 }}
          animate={k < n ? { backgroundColor: on, scale: reduce ? 1 : [1, 1.7, 1] } : { backgroundColor: 'rgba(237,234,227,0.14)' }}
          transition={{ delay: reduce ? 0 : (delay + (k + 1) * step) / 1000, duration: 0.3 }}
          style={{ width: 7, height: 7, display: 'block' }} />
      ))}
    </span>
  )
}

// Verdict du tour : les cases tombent une à une, les votes montent,
// puis couronne + confettis pour le meilleur et cœur brisé + « K.O. » pour le(s) perdant(s).
export default function ResultPhase({ g }) {
  const reduce = useReducedMotion()
  const res = g.room.last_result || {}
  const auto = res.stage === 'auto'
  const losers = new Set(res.losers || [])
  const scores = res.stage === 'revote' ? res.revote_scores || {} : res.scores || {}
  const rows = [...g.players].filter((p) => p.seat != null).sort((a, b) => (scores[b.user_id] || 0) - (scores[a.user_id] || 0))
  const topScore = auto ? 0 : Math.max(0, ...rows.map((p) => scores[p.user_id] || 0))
  // un joueur reçoit au plus un vote de chacun des autres
  const maxVotes = Math.max(topScore, rows.length - 1, 1)
  const revealMs = reduce ? 0 : FIRST_MS + rows.length * GAP_MS + 250
  const [step, setStep] = useState(reduce ? 2 : 0) // 0 révélation · 1 couronne · 2 K.O.
  useEffect(() => {
    if (reduce) return
    // le fond répond : onde dorée depuis le meilleur, rouge depuis le(s) perdant(s)
    const rowEl = (uid) => document.querySelector(`[data-gw-row="${CSS.escape(String(uid))}"]`)
    const t1 = setTimeout(() => {
      setStep(1)
      if (topScore > 0) {
        play('fanfare')
        if (!auto) rows.filter((p) => (scores[p.user_id] || 0) === topScore).forEach((p) => pulseFrom(rowEl(p.user_id), 'gold'))
      }
    }, revealMs)
    const t2 = setTimeout(() => {
      setStep(2)
      if (losers.size) {
        play('boom'); setTimeout(() => play('heartbreak'), 120); vibrate([80, 50, 140])
        losers.forEach((uid) => pulseFrom(rowEl(uid), 'red'))
      }
    }, revealMs + (topScore > 0 ? 700 : 100))
    return () => { clearTimeout(t1); clearTimeout(t2) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [res.round, res.stage, reduce])
  const title = losers.size === 0 ? 'Personne ne perd de vie'
    : auto ? "Pas d'imitation = une vie en moins"
    : losers.size > 1 ? 'Égalité : les ex aequo perdent une vie' : 'Le moins voté perd une vie'
  const meLost = g.me && losers.has(g.me.user_id)
  const meBest = !auto && !!g.me && topScore > 0 && (scores[g.me.user_id] || 0) === topScore
  // Qui a voté pour qui (migration 20261002b ; absent sinon) : votes de l'étape décisive.
  const nameOf = (uid) => (uid === g.me?.user_id ? 'Toi' : g.players.find((p) => p.user_id === uid)?.display_name || 'Un joueur')
  const ballots = auto ? [] : (Array.isArray(res.votes) ? res.votes : [])
    .filter((v) => (v.stage || 'vote') === (res.stage === 'revote' ? 'revote' : 'vote'))
  // Verdict final (dernier tour sans éliminé) : désigné par le serveur.
  const final = Array.isArray(res.final) ? res.final : []
  return (
    <PhaseFrame eyebrow={`Tour ${res.round}${g.roundsMax ? `/${g.roundsMax}` : ''}, verdict`} prompt={title} remaining={g.remaining} total={g.total} tilt={0.6}>
      {g.isLastRound && !final.length && (
        <p style={{ ...type.small, margin: '0 0 14px', color: T.accentLit }}>
          Dernier tour : sans éliminé, le joueur avec le moins de vies prendra le gage.
        </p>
      )}
      {final.length > 0 && (
        <p role="status" style={{ margin: '0 0 14px', padding: '10px 14px', border: `1px solid ${T.accent}`, borderRadius: RADIUS.md, background: 'rgba(199,168,105,0.08)', fontFamily: F.ui, fontWeight: 600, color: T.textHi }}>
          Verdict final : {final.map(nameOf).join(' & ')} {final.length > 1 ? 'prennent' : 'prend'} le gage (moins de vies).
        </p>
      )}
      {step >= 1 && topScore > 0 && <Confetti count={34} />}
      {/* bords de l'écran : dorés si c'est toi le meilleur, rouges si tu perds une vie */}
      {step >= 1 && meBest && !meLost && <Vignette key="vg" tone="gold" />}
      {step === 2 && meLost && <Vignette key="vr" tone="red" />}
      <motion.div
        animate={{ x: 0 }}
        transition={{ duration: 0.2 }}
        style={{ display: 'grid', gap: 12 }}>
        {rows.map((p, i) => {
          const lost = losers.has(p.user_id)
          const n = scores[p.user_id] || 0
          const best = step >= 1 && !auto && n === topScore && n > 0
          const ko = step === 2 && lost
          const me = p.user_id === g.me?.user_id
          // le cœur perdu est encore entier jusqu'au K.O.
          const shownLives = lost && step < 2 ? Math.min(g.maxLives, p.lives + 1) : p.lives
          return (
            <motion.div key={p.user_id} data-gw-row={p.user_id}
              initial={reduce ? { opacity: 0 } : { y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: ko ? 0.72 : 1, scale: best ? 1.01 : 1 }}
              transition={{ ...SPRING_POP, delay: reduce ? 0 : (FIRST_MS + i * GAP_MS) / 1000 }}
              style={{
                ...plate({ borderRadius: RADIUS.md }),
                position: 'relative', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                border: `1px solid ${best ? T.accent : ko ? T.danger : T.line}`,
                boxShadow: best ? `0 0 0 4px ${T.glow}, 0 0 28px rgba(199,168,105,0.18), ${SHADOW.soft}` : plate().boxShadow,
                transition: 'border-color .4s, box-shadow .4s, opacity .6s',
              }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <AvatarName player={p} sub={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 2 }}><Lives lives={shownLives} max={g.maxLives} size={18} />{me && 'Toi'}</span>} />
              </div>
              {!auto && (
                <VoteDots n={n} max={maxVotes} hot={best} cold={ko} reduce={reduce}
                  delay={FIRST_MS + i * GAP_MS + 150} step={Math.max(45, Math.min(110, 320 / Math.max(1, n)))} />
              )}
              <span style={{ ...type.h3, color: best ? T.accentLit : T.textHi, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', textAlign: 'center', display: 'grid', lineHeight: 1, flex: '0 0 auto' }}>
                {auto ? '—' : (
                  <>
                    <span style={{ fontSize: 28 }}>
                      <CountUp to={n} delay={reduce ? 0 : FIRST_MS + i * GAP_MS + 150} step={Math.max(45, Math.min(110, 320 / Math.max(1, n)))} />
                    </span>
                    <span style={{ fontFamily: F.ui, fontWeight: 600, fontSize: 11.5, color: T.textMute, marginTop: 2 }}>vote{n > 1 ? 's' : ''}</span>
                  </>
                )}
              </span>
              {best && (
                <motion.span aria-label="meilleure imitation du tour"
                  initial={{ y: -6, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  style={{ position: 'absolute', left: 14, top: -9, fontFamily: F.ui, fontWeight: 700, fontSize: 12, color: T.onAccent, background: T.accent, borderRadius: RADIUS.pill, padding: '2px 9px' }}>Meilleure</motion.span>
              )}
              {ko && (
                <motion.span aria-label="perd une vie"
                  initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  style={{
                    position: 'absolute', right: 14, top: -9, fontFamily: F.ui, fontWeight: 700, fontSize: 12,
                    color: T.danger, background: T.bg, border: `1px solid ${T.danger}`, borderRadius: RADIUS.pill, padding: '2px 9px',
                  }}>− 1 vie</motion.span>
              )}
            </motion.div>
          )
        })}
      </motion.div>
      {step === 2 && meLost && (
        <motion.p initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={SPRING_POP}
          style={{ margin: '18px 0 0', textAlign: 'center', fontFamily: F.display, fontWeight: 500, fontSize: 'clamp(1.15rem,4vw,1.5rem)', color: T.danger }}>
          {g.me.lives > 0 ? `Aïe… il te reste ${g.me.lives} vie${g.me.lives > 1 ? 's' : ''}.` : 'Plus de vie : place au gage.'}
        </motion.p>
      )}
      {step >= 1 && ballots.length > 0 && (
        <motion.ul initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={SPRING_POP} aria-label="Détail des votes"
          style={{ listStyle: 'none', margin: '18px 0 0', padding: '12px 16px', border: LINE, borderRadius: RADIUS.md, display: 'grid', gap: 6 }}>
          {ballots.map((v) => (
            <li key={`${v.voter}-${v.stage}`} style={{ ...type.small, fontWeight: 500, color: T.textMute, overflowWrap: 'anywhere' }}>
              {v.voter === g.me?.user_id ? <b>Tu</b> : <b>{nameOf(v.voter)}</b>} {v.voter === g.me?.user_id ? 'as' : 'a'} voté pour <b>{nameOf(v.target)}</b>
            </li>
          ))}
        </motion.ul>
      )}
    </PhaseFrame>
  )
}
