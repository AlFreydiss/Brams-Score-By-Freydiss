import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { OPENING_R2_CATALOG } from '../../data/opening-r2-catalog.js'
import { FULL_CATALOG } from '../../data/rap-vs-ost-data.js'

// ── Duel du jour ────────────────────────────────────────────────────────────
// Cinq duels tirés au sort une fois par jour, identiques pour tout le monde :
// le tirage est SEEDÉ SUR LA DATE, donc deux personnes qui ouvrent le hub le
// même jour comparent exactement les mêmes affiches et peuvent en parler. Pas
// d'aléatoire par visite, sinon la manche n'a rien de commun.
//
// Les votes restent locaux (localStorage), comme tout le reste du système de
// tournoi du site : on affiche donc « tes votes », jamais un score communauté
// qu'on ne mesure pas.

const KEY_DAY    = 'brams_duel_jour'
const KEY_STREAK = 'brams_duel_streak'
const ROUNDS     = 5
const PREVIEW_MS = 15000

const CSS = `
  @keyframes ddVs      { 0%,100%{transform:scale(1) rotate(-4deg); filter:drop-shadow(0 0 14px rgba(232,90,160,.45))} 50%{transform:scale(1.09) rotate(4deg); filter:drop-shadow(0 0 26px rgba(157,90,255,.6))} }
  @keyframes ddArc     { 0%{opacity:0; transform:scaleX(.3)} 30%{opacity:.9} 100%{opacity:0; transform:scaleX(1.25)} }
  @keyframes ddShock   { 0%{transform:translate(-50%,-50%) scale(.3); opacity:.8} 100%{transform:translate(-50%,-50%) scale(2.6); opacity:0} }
  @keyframes ddScan    { 0%{transform:translateY(-100%)} 100%{transform:translateY(320%)} }
  @keyframes ddBars    { 0%,100%{transform:scaleY(.2)} 50%{transform:scaleY(1)} }
  @keyframes ddDot     { 0%,100%{opacity:.4} 50%{opacity:1} }
  @media (prefers-reduced-motion: reduce){ [data-ddfx]{animation:none!important} }
`

// PRNG déterministe (mulberry32) : même graine, même tirage, partout.
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function todayKey() {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return d.getFullYear() + '-' + m + '-' + day
}

function seedFromDate(key) {
  let h = 2166136261
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function readJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || 'null') || fallback }
  catch { return fallback }
}
function writeJson(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
}

function yesterdayKey() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return d.getFullYear() + '-' + m + '-' + day
}

// ── Carte d'un camp ─────────────────────────────────────────────────────────
function DuelSide({ item, side, onVote, decided, won, playing, onPreview }) {
  const accent = item.color || '#9d174d'
  const dimmed = decided && !won

  return (
    <motion.button
      type="button"
      onClick={() => !decided && onVote(side)}
      disabled={decided}
      animate={{
        scale: won ? 1.02 : 1,
        opacity: dimmed ? 0.42 : 1,
        filter: dimmed ? 'grayscale(0.7)' : 'grayscale(0)',
      }}
      whileHover={decided ? {} : { y: -4, scale: 1.015 }}
      whileTap={decided ? {} : { scale: 0.985 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: 'relative', overflow: 'hidden',
        flex: '1 1 260px', minWidth: 0,
        textAlign: 'left', cursor: decided ? 'default' : 'pointer',
        padding: '22px 22px 20px', borderRadius: 18,
        background: 'linear-gradient(150deg,' + accent + '22 0%, rgba(9,7,13,.96) 78%)',
        border: '1px solid ' + accent + (won ? 'cc' : '33'),
        boxShadow: won ? '0 0 44px ' + accent + '4d, inset 0 0 60px ' + accent + '1a' : 'none',
        color: 'inherit', font: 'inherit',
        transition: 'border-color .25s, box-shadow .25s',
      }}
    >
      {/* Balayage lumineux permanent, coupé une fois le duel tranché */}
      {!decided && (
        <div data-ddfx style={{
          position: 'absolute', left: 0, right: 0, height: '40%',
          background: 'linear-gradient(180deg, transparent, ' + accent + '1f, transparent)',
          animation: 'ddScan 4.5s linear infinite', pointerEvents: 'none',
        }} />
      )}

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span style={{
          fontSize: 22, lineHeight: 1,
          filter: 'drop-shadow(0 0 10px ' + accent + 'aa)',
        }}>
          {item.emoji || (item.camp === 'rap' ? '♬' : '♪')}
        </span>
        <span style={{
          fontSize: 8, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase',
          padding: '3px 9px', borderRadius: 6,
          background: accent + '1f', border: '1px solid ' + accent + '3d', color: accent,
        }}>
          {item.camp === 'rap' ? 'Rap FR' : item.type === 'OP' ? 'Opening' : item.anime === 'Rap FR' ? 'Rap FR' : 'Anime'}
        </span>
        {won && (
          <span style={{
            marginLeft: 'auto', fontSize: 9, fontWeight: 800, letterSpacing: '.12em',
            color: accent, textTransform: 'uppercase',
          }}>
            ✦ Ton choix
          </span>
        )}
      </div>

      <div style={{
        fontFamily: "'Pirata One',cursive", fontSize: 'clamp(22px,3vw,30px)', lineHeight: 1.08,
        color: 'rgba(255,255,255,.95)', marginBottom: 6,
        textShadow: '0 0 24px ' + accent + '59',
      }}>
        {item.title}
      </div>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,.42)', marginBottom: 4 }}>
        {item.anime}
      </div>
      {item.artist && (
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,.26)' }}>{item.artist}</div>
      )}

      {/* Écoute optionnelle — jamais d'autoplay */}
      {item.audioUrl && (
        <span
          role="button"
          tabIndex={0}
          onClick={e => { e.stopPropagation(); onPreview(side) }}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); e.preventDefault(); onPreview(side) } }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 16,
            padding: '7px 14px', borderRadius: 100, cursor: 'pointer',
            background: playing ? accent + '2e' : 'rgba(255,255,255,.05)',
            border: '1px solid ' + (playing ? accent + '80' : 'rgba(255,255,255,.10)'),
            fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase',
            color: playing ? accent : 'rgba(255,255,255,.5)',
          }}
        >
          {playing ? '■ Stop' : '▶ Écouter'}
          {playing && (
            <span style={{ display: 'inline-flex', alignItems: 'flex-end', gap: 2, height: 10 }}>
              {[0, 1, 2, 3].map(i => (
                <span key={i} data-ddfx style={{
                  width: 2, height: 10, background: accent, borderRadius: 1,
                  transformOrigin: 'bottom',
                  animation: 'ddBars ' + (0.6 + i * 0.13) + 's ease-in-out infinite',
                }} />
              ))}
            </span>
          )}
        </span>
      )}
    </motion.button>
  )
}

// ── Section ─────────────────────────────────────────────────────────────────
export default function DailyDuel({ accentA = '#e85aa0', accentB = '#9d5aff' }) {
  const navigate = useNavigate()
  const day = useMemo(todayKey, [])

  const pool = useMemo(
    () => [...OPENING_R2_CATALOG, ...FULL_CATALOG].filter(x => x && x.id && x.title),
    [],
  )
  const byId = useMemo(() => new Map(pool.map(x => [x.id, x])), [pool])

  // Tirage du jour : 10 entrées distinctes → 5 affiches.
  const pairs = useMemo(() => {
    if (pool.length < ROUNDS * 2) return []
    const rand = mulberry32(seedFromDate(day))
    const picked = []
    const seen = new Set()
    let guard = 0
    while (picked.length < ROUNDS * 2 && guard < 5000) {
      guard++
      const item = pool[Math.floor(rand() * pool.length)]
      if (!item || seen.has(item.id)) continue
      // Deux openings du même animé face à face n'a aucun intérêt : on refuse
      // l'entrée quand elle viendrait compléter une affiche avec son jumeau.
      const previous = picked.length % 2 === 1 ? picked[picked.length - 1] : null
      if (previous && previous.anime === item.anime) continue
      seen.add(item.id)
      picked.push(item)
    }
    const out = []
    for (let i = 0; i + 1 < picked.length; i += 2) out.push([picked[i], picked[i + 1]])
    return out.slice(0, ROUNDS)
  }, [pool, day])

  const [state, setState] = useState(() => {
    const saved = readJson(KEY_DAY, null)
    return saved && saved.date === day ? saved : { date: day, picks: [] }
  })
  const [decided, setDecided] = useState(null)   // 'left' | 'right' pour la manche en cours
  const [shock, setShock] = useState(null)
  const [playing, setPlaying] = useState(null)
  const audioRef = useRef(null)
  const timersRef = useRef([])

  const index = state.picks.length
  const finished = index >= pairs.length && pairs.length > 0
  const pair = pairs[index] || null

  // Série de jours consécutifs — incrémentée une seule fois, à la 5e manche.
  const streak = useMemo(() => {
    const s = readJson(KEY_STREAK, { last: null, n: 0 })
    return s && typeof s.n === 'number' ? s.n : 0
  }, [finished])

  const stopAudio = useCallback(() => {
    const a = audioRef.current
    if (a) { try { a.pause() } catch {} }
    setPlaying(null)
  }, [])

  useEffect(() => () => {
    stopAudio()
    timersRef.current.forEach(clearTimeout)
  }, [stopAudio])

  function handlePreview(side) {
    if (!pair) return
    if (playing === side) { stopAudio(); return }
    const item = side === 'left' ? pair[0] : pair[1]
    if (!item?.audioUrl) return
    let a = audioRef.current
    if (!a) { a = new Audio(); a.volume = 0.55; audioRef.current = a }
    try {
      a.src = item.audioUrl
      a.currentTime = 0
      const p = a.play()
      if (p && p.catch) p.catch(() => setPlaying(null))
      setPlaying(side)
      const t = setTimeout(stopAudio, PREVIEW_MS)
      timersRef.current.push(t)
    } catch { setPlaying(null) }
  }

  function handleVote(side) {
    if (!pair || decided) return
    stopAudio()
    setDecided(side)
    setShock(side)
    const winner = side === 'left' ? pair[0] : pair[1]
    const loser  = side === 'left' ? pair[1] : pair[0]
    const t = setTimeout(() => {
      const next = {
        date: day,
        picks: [...state.picks, { winner: winner.id, loser: loser.id, camp: winner.camp === 'rap' ? 'rap' : 'anime' }],
      }
      setState(next)
      writeJson(KEY_DAY, next)
      setDecided(null)
      setShock(null)
      // Série : validée uniquement quand les 5 manches du jour sont faites.
      if (next.picks.length >= pairs.length) {
        const s = readJson(KEY_STREAK, { last: null, n: 0 })
        if (s.last !== day) {
          writeJson(KEY_STREAK, { last: day, n: s.last === yesterdayKey() ? (s.n || 0) + 1 : 1 })
        }
      }
    }, 850)
    timersRef.current.push(t)
  }

  // Raccourcis clavier : ← / → pour trancher sans quitter le clavier.
  useEffect(() => {
    if (finished || !pair) return
    function onKey(e) {
      if (e.key === 'ArrowLeft')  handleVote('left')
      if (e.key === 'ArrowRight') handleVote('right')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  function replay() {
    stopAudio()
    const fresh = { date: day, picks: [] }
    setState(fresh)
    writeJson(KEY_DAY, fresh)
  }

  if (!pairs.length) return null

  const camps = state.picks.reduce((acc, p) => {
    const k = p.camp === 'rap' ? 'rap' : 'anime'
    acc[k] = (acc[k] || 0) + 1
    return acc
  }, {})

  return (
    <div style={{ position: 'relative', marginBottom: 76 }}>
      <style>{CSS}</style>

      <div style={{
        position: 'relative', overflow: 'hidden',
        borderRadius: 22, padding: 'clamp(22px,3.4vw,40px)',
        background: 'linear-gradient(160deg, rgba(157,23,77,.10) 0%, rgba(8,5,12,.96) 62%, rgba(76,29,149,.12) 100%)',
        border: '1px solid rgba(255,255,255,.08)',
        borderTop: '2px solid ' + accentA + 'aa',
      }}>
        {/* Halo de scène */}
        <div aria-hidden style={{
          position: 'absolute', top: -80, left: '50%', transform: 'translateX(-50%)',
          width: '80%', height: 200, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 60% 100% at 50% 0%, ' + accentA + '2e 0%, transparent 70%)',
        }} />

        {/* En-tête */}
        <div style={{
          position: 'relative', display: 'flex', flexWrap: 'wrap', gap: 12,
          alignItems: 'center', justifyContent: 'space-between', marginBottom: 26,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span data-ddfx style={{
              width: 7, height: 7, borderRadius: '50%', background: accentA,
              boxShadow: '0 0 10px ' + accentA, animation: 'ddDot 1.5s ease-in-out infinite',
            }} />
            <h2 style={{
              margin: 0, fontFamily: "'Pirata One',cursive",
              fontSize: 'clamp(24px,3.4vw,36px)', lineHeight: 1,
              background: 'linear-gradient(120deg,' + accentA + ',#f9a8d4 45%,' + accentB + ')',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              Arène du jour
            </h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {streak > 0 && (
              <span style={{
                fontSize: 9, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase',
                padding: '5px 11px', borderRadius: 100,
                background: 'rgba(245,158,11,.12)', border: '1px solid rgba(245,158,11,.32)', color: '#fbbf24',
              }}>
                🔥 {streak} jour{streak > 1 ? 's' : ''} d’affilée
              </span>
            )}
            {/* Piste d'avancement des 5 manches */}
            <div style={{ display: 'flex', gap: 5 }}>
              {pairs.map((_, i) => (
                <span key={i} style={{
                  width: i === index && !finished ? 20 : 7, height: 7, borderRadius: 100,
                  background: i < index ? accentA : i === index && !finished ? accentB : 'rgba(255,255,255,.12)',
                  boxShadow: i <= index ? '0 0 8px ' + accentA + '80' : 'none',
                  transition: 'all .3s',
                }} />
              ))}
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {!finished && pair ? (
            <motion.div
              key={'duel-' + index}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            >
              <p style={{
                margin: '0 0 20px', fontSize: 12, color: 'rgba(255,255,255,.32)',
                letterSpacing: '.04em',
              }}>
                Manche {index + 1} sur {pairs.length} — même affiche pour tout le monde aujourd’hui.
                Clique, ou tranche au clavier avec ← et →.
              </p>

              <div style={{ position: 'relative', display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'stretch' }}>
                <DuelSide
                  item={pair[0]} side="left" onVote={handleVote}
                  decided={!!decided} won={decided === 'left'}
                  playing={playing === 'left'} onPreview={handlePreview}
                />

                {/* VS central */}
                <div style={{
                  position: 'relative', flex: '0 0 auto',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  minWidth: 64, alignSelf: 'center',
                }}>
                  <div data-ddfx style={{
                    position: 'absolute', width: 120, height: 2, left: '50%', top: '50%',
                    transform: 'translate(-50%,-50%)',
                    background: 'linear-gradient(90deg, transparent,' + accentA + 'cc,' + accentB + 'cc, transparent)',
                    animation: 'ddArc 2.4s ease-in-out infinite',
                  }} />
                  <span data-ddfx style={{
                    position: 'relative',
                    fontFamily: "'Pirata One',cursive", fontSize: 34,
                    color: 'rgba(255,255,255,.9)',
                    animation: 'ddVs 3.2s ease-in-out infinite',
                  }}>
                    VS
                  </span>
                  {shock && (
                    <span data-ddfx style={{
                      position: 'absolute', left: '50%', top: '50%',
                      width: 90, height: 90, borderRadius: '50%',
                      border: '2px solid ' + accentA,
                      animation: 'ddShock .85s ease-out forwards', pointerEvents: 'none',
                    }} />
                  )}
                </div>

                <DuelSide
                  item={pair[1]} side="right" onVote={handleVote}
                  decided={!!decided} won={decided === 'right'}
                  playing={playing === 'right'} onPreview={handlePreview}
                />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="verdict"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              style={{ textAlign: 'center', padding: '10px 0 4px' }}
            >
              <div style={{
                fontSize: 9, letterSpacing: '.22em', textTransform: 'uppercase',
                color: 'rgba(255,255,255,.34)', marginBottom: 12,
              }}>
                Manche du jour terminée
              </div>
              <div style={{
                fontFamily: "'Pirata One',cursive", fontSize: 'clamp(30px,5vw,52px)', lineHeight: 1.05,
                background: 'linear-gradient(120deg,#f9a8d4,' + accentA + ' 50%,' + accentB + ')',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                marginBottom: 16,
              }}>
                {camps.rap && camps.anime
                  ? camps.anime >= camps.rap ? 'Camp Anime' : 'Camp Rap'
                  : 'Tes 5 verdicts'}
              </div>
              <div style={{
                display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 24,
              }}>
                {state.picks.map((p, i) => {
                  const item = byId.get(p.winner)
                  if (!item) return null
                  return (
                    <span key={p.winner + i} style={{
                      fontSize: 11, padding: '7px 13px', borderRadius: 100,
                      background: (item.color || accentA) + '1c',
                      border: '1px solid ' + (item.color || accentA) + '3d',
                      color: 'rgba(255,255,255,.72)',
                    }}>
                      {item.title}
                    </span>
                  )
                })}
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                <motion.button
                  onClick={() => navigate('/tournoi/openings')}
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  style={{
                    padding: '13px 28px', borderRadius: 100, border: 'none',
                    background: 'linear-gradient(135deg,' + accentA + ',#f06cb5)',
                    color: '#1a0011', fontWeight: 800, fontSize: 13, cursor: 'pointer',
                    fontFamily: "'Pirata One',cursive", letterSpacing: '.03em',
                  }}
                >
                  Enchaîner sur un vrai bracket
                </motion.button>
                <motion.button
                  onClick={replay}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  style={{
                    padding: '13px 24px', borderRadius: 100,
                    border: '1px solid rgba(255,255,255,.12)',
                    background: 'rgba(255,255,255,.04)',
                    color: 'rgba(255,255,255,.5)', fontWeight: 700, fontSize: 12, cursor: 'pointer',
                  }}
                >
                  Rejouer la manche
                </motion.button>
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,.2)', marginTop: 16 }}>
                Nouvelle affiche demain — la série se garde si tu reviens.
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
