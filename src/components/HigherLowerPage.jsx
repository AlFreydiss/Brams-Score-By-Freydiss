import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion'
import { HIGHER_LOWER_POOL } from '../data/higher-lower-data.js'
import { corsUrl } from '../lib/audioBoost.js'
import HigherLowerBackdrop from './HigherLowerBackdrop.jsx'

// ── Plus vieux / Plus récent ────────────────────────────────────────────────
// Deux openings. Celui du haut a son année affichée, celui du bas est masqué :
// swipe à droite si tu le crois PLUS RÉCENT, à gauche s'il est PLUS VIEUX.
// Bonne réponse → le challenger devient la référence et la série continue.
//
// L'année est celle de la saison de l'animé (source AniList), pas celle de
// l'opening : le pool ne garde donc qu'un opening par animé, sinon deux
// openings du même animé n'auraient aucune bonne réponse.

const BG     = '#050308'
const PINK   = '#9d174d'
const PURPLE = '#4c1d95'
const GRAD   = `linear-gradient(135deg, ${PINK}, ${PURPLE})`
const GREEN  = '#15803d'
const RED    = '#b91c1c'

const BEST_KEY   = 'brams_higherlower_best_v1'
const SWIPE_DIST = 90    // px avant de valider un swipe
const SWIPE_VEL  = 420   // ou vitesse suffisante pour un flick court

const CSS = `
  .hl-split { display: grid; grid-template-rows: 1fr 1fr; gap: 10px; height: min(74vh, 720px); }
  .hl-year  { font-family: 'Pirata One', cursive; line-height: 1; }
  @media (min-width: 860px) {
    .hl-split { grid-template-rows: none; grid-template-columns: 1fr 1fr; height: min(66vh, 560px); }
  }
  @keyframes hlPulse { 0%,100%{opacity:.45} 50%{opacity:.9} }
  @media (prefers-reduced-motion: reduce){ [data-hlfx]{animation:none!important} }
`

function loadBest() {
  try { return Number(localStorage.getItem(BEST_KEY)) || 0 } catch { return 0 }
}

function saveBest(n) {
  try { localStorage.setItem(BEST_KEY, String(n)) } catch { /* navigation privée */ }
}

// Tire un challenger différent de la référence, en évitant si possible une
// année identique (égalité = manche sans vraie bonne réponse).
function pickChallenger(reference, used) {
  const available = HIGHER_LOWER_POOL.filter(o => o.id !== reference?.id && !used.has(o.id))
  const pool = available.length ? available : HIGHER_LOWER_POOL.filter(o => o.id !== reference?.id)
  const distinct = pool.filter(o => o.year !== reference?.year)
  const from = distinct.length >= 8 ? distinct : pool
  return from[Math.floor(Math.random() * from.length)]
}

// Compteur qui roule jusqu'à l'année : la révélation devient un petit moment
// au lieu d'un chiffre qui apparaît d'un coup.
function CountUpYear({ value, style }) {
  const [shown, setShown] = useState(() => Math.max(1960, value - 26))

  useEffect(() => {
    let raf
    const from = Math.max(1960, value - 26)
    const start = performance.now()
    const step = now => {
      // Décélération franche : le chiffre freine en arrivant sur la bonne année.
      const t = Math.min(1, (now - start) / 900)
      const eased = 1 - Math.pow(1 - t, 3)
      setShown(Math.round(from + (value - from) * eased))
      if (t < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value])

  return <div style={style}>{shown}</div>
}

// ── Carte opening ───────────────────────────────────────────────────────────
function OpeningCard({ item, revealed, muted, label, children, dimmed }) {
  const videoRef = useRef(null)

  // Rebouclage sur la partie musicale : les fichiers R2 se terminent par un
  // silence, `endAt` marque la fin réelle de l'opening.
  useEffect(() => {
    const el = videoRef.current
    if (!el || !item?.endAt) return
    const onTime = () => { if (el.currentTime >= item.endAt) el.currentTime = 0 }
    el.addEventListener('timeupdate', onTime)
    return () => el.removeEventListener('timeupdate', onTime)
  }, [item?.endAt])

  if (!item) return null

  return (
    <div style={{
      position: 'relative', overflow: 'hidden', borderRadius: 18,
      background: item.color || '#111', height: '100%',
      border: '1px solid rgba(255,255,255,.1)',
      opacity: dimmed ? .55 : 1, transition: 'opacity .25s ease',
    }}>
      <video
        ref={videoRef}
        key={item.id}
        src={corsUrl(item.audioUrl)}
        crossOrigin="anonymous"
        autoPlay loop playsInline muted={muted}
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          objectFit: 'cover', opacity: .5,
        }}
      />
      <div style={{
        position: 'absolute', inset: 0,
        background: `linear-gradient(180deg, rgba(5,3,8,.35) 0%, rgba(5,3,8,.85) 100%)`,
      }} />

      <div style={{
        position: 'relative', height: '100%', display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: 20,
      }}>
        <div style={{
          fontSize: 10, letterSpacing: '.22em', color: 'rgba(255,255,255,.45)', marginBottom: 10,
        }}>
          {label}
        </div>

        <div style={{ fontSize: 30, marginBottom: 6 }}>{item.emoji}</div>

        <div style={{
          fontSize: 22, fontWeight: 800, color: '#fff', lineHeight: 1.2,
          textShadow: '0 2px 14px rgba(0,0,0,.7)', maxWidth: 420,
        }}>
          {item.anime}
        </div>

        {item.title && item.title !== 'Opening 1' && (
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,.55)', marginTop: 4 }}>
            {item.title}{item.artist ? ` · ${item.artist}` : ''}
          </div>
        )}

        <div style={{ marginTop: 14, minHeight: 62, display: 'grid', placeItems: 'center' }}>
          <AnimatePresence mode="wait">
            {revealed ? (
              <motion.div
                key="year"
                initial={{ opacity: 0, scale: .6 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <CountUpYear
                  value={item.year}
                  style={{
                    fontFamily: "'Pirata One', cursive", lineHeight: 1,
                    fontSize: 58, color: '#fff', textShadow: '0 3px 20px rgba(0,0,0,.8)',
                  }}
                />
              </motion.div>
            ) : (
              <motion.div
                key="hidden"
                data-hlfx
                className="hl-year"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                style={{
                  fontSize: 58, color: 'rgba(255,255,255,.35)',
                  animation: 'hlPulse 2s ease-in-out infinite',
                }}
              >
                ????
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {children}
      </div>
    </div>
  )
}

// ── Page ────────────────────────────────────────────────────────────────────
export default function HigherLowerPage() {
  const [best, setBest]         = useState(loadBest)
  const [streak, setStreak]     = useState(0)
  const [muted, setMuted]       = useState(true)
  const [phase, setPhase]       = useState('play') // 'play' | 'reveal' | 'over'
  const [lastOk, setLastOk]     = useState(null)
  const [copied, setCopied]     = useState(false)
  const usedRef                 = useRef(new Set())

  const [reference, setReference]   = useState(null)
  const [challenger, setChallenger] = useState(null)

  const x       = useMotionValue(0)
  const rotate  = useTransform(x, [-200, 200], [-9, 9])
  const hintOld = useTransform(x, [-160, -30, 0], [1, .25, 0])
  const hintNew = useTransform(x, [0, 30, 160], [0, .25, 1])

  const start = useCallback(() => {
    usedRef.current = new Set()
    const first = HIGHER_LOWER_POOL[Math.floor(Math.random() * HIGHER_LOWER_POOL.length)]
    usedRef.current.add(first.id)
    const next = pickChallenger(first, usedRef.current)
    usedRef.current.add(next.id)
    setReference(first)
    setChallenger(next)
    setStreak(0)
    setLastOk(null)
    setPhase('play')
    x.set(0)
  }, [x])

  useEffect(() => { if (HIGHER_LOWER_POOL.length >= 2) start() }, [start])

  const answer = useCallback(guess => {
    if (phase !== 'play' || !reference || !challenger) return
    // Égalité d'année : aucune bonne réponse possible, on ne sanctionne pas.
    const ok = challenger.year === reference.year
      ? true
      : guess === 'recent'
        ? challenger.year > reference.year
        : challenger.year < reference.year

    setLastOk(ok)
    setPhase('reveal')
    x.set(0)

    if (!ok) {
      if (streak > best) { setBest(streak); saveBest(streak) }
      setTimeout(() => setPhase('over'), 1500)
      return
    }

    const nextStreak = streak + 1
    setStreak(nextStreak)
    if (nextStreak > best) { setBest(nextStreak); saveBest(nextStreak) }

    setTimeout(() => {
      const nextChallenger = pickChallenger(challenger, usedRef.current)
      usedRef.current.add(nextChallenger.id)
      setReference(challenger)
      setChallenger(nextChallenger)
      setPhase('play')
    }, 1300)
  }, [phase, reference, challenger, streak, best, x])

  // Flèches clavier pour jouer au bureau sans souris.
  useEffect(() => {
    const onKey = e => {
      if (e.key === 'ArrowRight') answer('recent')
      if (e.key === 'ArrowLeft')  answer('vieux')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [answer])

  if (HIGHER_LOWER_POOL.length < 2) {
    return (
      <div style={{ minHeight: '100vh', background: BG, display: 'grid', placeItems: 'center', padding: 24 }}>
        <div style={{ color: 'rgba(255,255,255,.6)', textAlign: 'center', maxWidth: 460, lineHeight: 1.7 }}>
          Pool vide : lance <code style={{ color: '#f9a8d4' }}>node scripts/gen-anime-years.mjs</code> pour
          générer <code style={{ color: '#f9a8d4' }}>src/data/anime-years.js</code>.
        </div>
      </div>
    )
  }

  // ── Écran de fin ──────────────────────────────────────────────────────────
  if (phase === 'over') {
    return (
      <div style={{ minHeight: '100vh', background: BG, padding: '90px 20px 60px', position: 'relative' }}>
        <style>{CSS}</style>
        <HigherLowerBackdrop streak={streak} verdict={false} />
        <div style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 12, letterSpacing: '.22em', color: 'rgba(255,255,255,.4)' }}>
            SÉRIE TERMINÉE
          </div>
          <div className="hl-year" style={{
            fontSize: 92, margin: '10px 0',
            background: GRAD, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            {streak}
          </div>
          <div style={{ color: 'rgba(255,255,255,.55)', fontSize: 15, marginBottom: 8 }}>
            bonnes réponses d'affilée
          </div>
          <div style={{ color: 'rgba(255,255,255,.35)', fontSize: 13, marginBottom: 30 }}>
            Record personnel : {best}
          </div>

          <div style={{
            padding: 18, borderRadius: 14, marginBottom: 26, textAlign: 'left',
            background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)',
            color: 'rgba(255,255,255,.6)', fontSize: 14, lineHeight: 1.7,
          }}>
            <strong style={{ color: '#fff' }}>{challenger?.anime}</strong> est sorti en{' '}
            <strong style={{ color: '#fff' }}>{challenger?.year}</strong>,{' '}
            {challenger?.year > reference?.year ? 'après' : 'avant'}{' '}
            <strong style={{ color: '#fff' }}>{reference?.anime}</strong> ({reference?.year}).
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={start} style={{
              padding: '14px 34px', borderRadius: 12, border: 'none', cursor: 'pointer',
              background: GRAD, color: '#fff', fontSize: 15, fontWeight: 700,
            }}>
              Rejouer
            </button>

            <button
              onClick={async () => {
                const texte = `Plus vieux / Plus récent sur brams.community : ${streak} d'affilée`
                  + (streak >= best ? ' (nouveau record)' : ` — record ${best}`)
                  + `\nDernier duel : ${challenger?.anime} (${challenger?.year}) vs ${reference?.anime} (${reference?.year})`
                try {
                  await navigator.clipboard.writeText(texte)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 1800)
                } catch { /* presse-papiers refusé par le navigateur */ }
              }}
              style={{
                padding: '14px 30px', borderRadius: 12, cursor: 'pointer',
                background: 'rgba(255,255,255,.06)', color: 'rgba(255,255,255,.8)',
                fontSize: 15, border: '1px solid rgba(255,255,255,.1)',
              }}
            >
              {copied ? 'Copié ✓' : 'Copier le résultat'}
            </button>
            <Link to="/jeux" style={{
              padding: '14px 30px', borderRadius: 12, textDecoration: 'none',
              background: 'rgba(255,255,255,.06)', color: 'rgba(255,255,255,.8)',
              fontSize: 15, border: '1px solid rgba(255,255,255,.1)',
            }}>
              Retour aux jeux
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const revealed = phase === 'reveal'

  return (
    <div style={{ minHeight: '100vh', background: BG, padding: '84px 14px 40px', position: 'relative' }}>
      <style>{CSS}</style>
      <HigherLowerBackdrop streak={streak} verdict={phase === 'reveal' ? lastOk : null} />
      <div style={{ maxWidth: 900, margin: '0 auto', position: 'relative', zIndex: 1 }}>

        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14,
        }}>
          <Link to="/jeux" style={{
            fontSize: 11, letterSpacing: '.18em', color: 'rgba(255,255,255,.35)', textDecoration: 'none',
          }}>
            ← JEUX
          </Link>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <button
              onClick={() => setMuted(m => !m)}
              title={muted ? 'Activer le son' : 'Couper le son'}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', fontSize: 18,
                color: 'rgba(255,255,255,.6)',
              }}
            >
              {muted ? '🔇' : '🔊'}
            </button>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.45)' }}>
              SÉRIE <strong style={{ color: '#fff', fontSize: 15 }}>{streak}</strong>
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.3)' }}>
              RECORD {best}
            </div>
          </div>
        </div>

        <div className="hl-split">
          <OpeningCard item={reference} revealed muted label="RÉFÉRENCE" dimmed={revealed} />

          {/* Carte jouable : c'est elle qu'on swipe. */}
          <motion.div
            drag={phase === 'play' ? 'x' : false}
            style={{ x, rotate, height: '100%', touchAction: 'pan-y' }}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.55}
            onDragEnd={(_, info) => {
              const far  = Math.abs(info.offset.x) > SWIPE_DIST
              const fast = Math.abs(info.velocity.x) > SWIPE_VEL
              if (!far && !fast) return
              answer(info.offset.x > 0 ? 'recent' : 'vieux')
            }}
          >
            <OpeningCard
              item={challenger}
              revealed={revealed}
              muted={muted}
              label={revealed ? (lastOk ? '✓ BONNE RÉPONSE' : '✗ RATÉ') : 'PLUS VIEUX  ←  SWIPE  →  PLUS RÉCENT'}
            >
              {/* Voile de verdict : vert si juste, rouge sinon. */}
              <AnimatePresence>
                {revealed && (
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: .3 }} exit={{ opacity: 0 }}
                    style={{
                      position: 'absolute', inset: 0, borderRadius: 18,
                      background: lastOk ? GREEN : RED, pointerEvents: 'none',
                    }}
                  />
                )}
              </AnimatePresence>

              {/* Indices de direction pendant le drag. */}
              {phase === 'play' && (
                <>
                  <motion.div style={{
                    position: 'absolute', left: 16, top: '50%', opacity: hintOld,
                    fontFamily: "'Pirata One',cursive", fontSize: 26, color: '#fff',
                    pointerEvents: 'none',
                  }}>
                    PLUS VIEUX
                  </motion.div>
                  <motion.div style={{
                    position: 'absolute', right: 16, top: '50%', opacity: hintNew,
                    fontFamily: "'Pirata One',cursive", fontSize: 26, color: '#fff',
                    pointerEvents: 'none',
                  }}>
                    PLUS RÉCENT
                  </motion.div>
                </>
              )}
            </OpeningCard>
          </motion.div>
        </div>

        {/* Écart entre les deux années : dit après coup si c'était serré ou
            évident, ce qui donne son sel à une bonne réponse. */}
        <AnimatePresence>
          {revealed && reference && challenger && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{
                marginTop: 10, textAlign: 'center', fontSize: 13,
                color: lastOk ? '#4ade80' : '#f87171',
              }}
            >
              {challenger.year === reference.year
                ? 'Même année — la manche est comptée juste.'
                : `${Math.abs(challenger.year - reference.year)} an${Math.abs(challenger.year - reference.year) > 1 ? 's' : ''} d'écart`}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Palier de série : un petit éclat aux caps, pour marquer le coup. */}
        <AnimatePresence>
          {revealed && lastOk && streak > 0 && streak % 5 === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: .8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              style={{
                marginTop: 8, textAlign: 'center',
                fontFamily: "'Pirata One',cursive", fontSize: 26,
                background: GRAD, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}
            >
              {streak} D'AFFILÉE
            </motion.div>
          )}
        </AnimatePresence>

        {/* Boutons : le swipe reste le geste principal, mais tout doit être
            jouable au clic sur desktop. */}
        <div style={{ display: 'flex', gap: 12, marginTop: 14 }}>
          <button
            onClick={() => answer('vieux')}
            disabled={phase !== 'play'}
            style={{
              flex: 1, padding: '16px 0', borderRadius: 12,
              cursor: phase === 'play' ? 'pointer' : 'default',
              background: 'rgba(255,255,255,.05)', color: '#fff',
              border: '1px solid rgba(255,255,255,.14)',
              fontFamily: "'Pirata One',cursive", fontSize: 22,
            }}
          >
            ← PLUS VIEUX
          </button>
          <button
            onClick={() => answer('recent')}
            disabled={phase !== 'play'}
            style={{
              flex: 1, padding: '16px 0', borderRadius: 12,
              cursor: phase === 'play' ? 'pointer' : 'default',
              background: 'rgba(255,255,255,.05)', color: '#fff',
              border: '1px solid rgba(255,255,255,.14)',
              fontFamily: "'Pirata One',cursive", fontSize: 22,
            }}
          >
            PLUS RÉCENT →
          </button>
        </div>

        <div style={{
          marginTop: 22, fontSize: 11, color: 'rgba(255,255,255,.25)',
          textAlign: 'center', lineHeight: 1.7,
        }}>
          {HIGHER_LOWER_POOL.length} animés dans le pool · année de première diffusion (AniList)<br />
          Flèches ← → au clavier · deux animés de la même année comptent comme juste
        </div>
      </div>
    </div>
  )
}
