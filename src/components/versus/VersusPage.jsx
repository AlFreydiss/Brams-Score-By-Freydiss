import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion'
import { VERSUS_CONFIGS } from '../../data/versus-data.js'
import { generateBracket, advanceWinner, getCurrentMatch, getWinner, getTournamentProgress } from '../../lib/tournament.js'
import BleachRadio from './BleachRadio.jsx'
import HalftoneField, { fx } from './HalftoneField.jsx'
import { ComboStamp, InkSplat, PaperRain, RewindStamp, RoundWipe, SfxStamp, SlashSplit, SpeedLines, StretchTitle } from './fx.jsx'
import { buzz, setSfxEnabled, sfx, sfxEnabled } from './sfx.js'
import './versus.css'

// Tournoi 1v1 en images (Bankai de Bleach, panels de manga cultes).
// 1. Setup : format (16 → 128) tiré au hasard dans le pool, filtre par série.
// 2. Duels : clic ou ← →, Retour annule. Récap des qualifiés à chaque fin de tour.
// 3. Champion + top 8 + partage.
// La partie en cours est sauvegardée en localStorage (une par tournoi).

const RED = '#e5322d'
const BLUE = '#2f6dff'

const runKey = c => `versus_run_${c.id}_${c.version}`
function loadRun(c) {
  try {
    const r = JSON.parse(localStorage.getItem(runKey(c)) || 'null')
    return r && Array.isArray(r.rounds) && r.rounds.length ? r : null
  } catch { return null }
}
function saveRun(c, run) {
  try {
    if (run) localStorage.setItem(runKey(c), JSON.stringify(run))
    else localStorage.removeItem(runKey(c))
  } catch {}
}

function useIsNarrow() {
  const q = '(max-width: 900px)'
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches)
  useEffect(() => {
    const mq = window.matchMedia(q)
    const on = () => setNarrow(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return narrow
}

function roundName(size) {
  if (size === 2) return 'Finale'
  if (size === 4) return 'Demi-finales'
  if (size === 8) return 'Quarts de finale'
  if (size === 16) return 'Huitièmes de finale'
  return `Tour de ${size}`
}

function sample(list, n) {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a.slice(0, n)
}

const KANJI = { 2: '決勝', 4: '準決勝', 8: '準々決勝' }
const RANK = { Finaliste: 2, 'Demi-finale': 3, 'Quart de finale': 5 }

const winnerOf = m => (m.winnerId && (m.left?.id === m.winnerId ? m.left : m.right)) || null
const loserOf = m => (m.winnerId && (m.left?.id === m.winnerId ? m.right : m.left)) || null

// Classement final : champion, finaliste, puis éliminés en demies, en quarts.
function topRanking(rounds) {
  const out = []
  const champ = getWinner(rounds)
  if (champ) out.push({ p: champ, label: 'Champion' })
  const n = rounds.length
  const add = (round, label) => round?.matches.forEach(m => { const l = loserOf(m); if (l) out.push({ p: l, label }) })
  add(rounds[n - 1], 'Finaliste')
  add(rounds[n - 2], 'Demi-finale')
  add(rounds[n - 3], 'Quart de finale')
  return out
}

export default function VersusPage({ kind }) {
  const config = VERSUS_CONFIGS[kind]
  const narrow = useIsNarrow()
  const [run, setRun] = useState(() => loadRun(config))   // { size, rounds }
  const [history, setHistory] = useState([])
  const [picked, setPicked] = useState(null)
  const [zoom, setZoom] = useState(null)
  const [recap, setRecap] = useState(null)                // { size, qualified }

  useEffect(() => { saveRun(config, run) }, [config, run])
  useEffect(() => { document.title = `${config.title} — Tournoi · Brams Community` }, [config.title])

  const rounds = run?.rounds
  const current = useMemo(() => rounds && getCurrentMatch(rounds), [rounds])
  const winner = useMemo(() => rounds && getWinner(rounds), [rounds])
  // Le total vient de la taille du tableau : les tours futurs n'ont pas encore leurs duels.
  const progress = useMemo(() => {
    if (!rounds) return null
    const { done } = getTournamentProgress(rounds)
    const total = Math.max(1, (run.size || 2) - 1)
    return { done, total, pct: Math.round((done / total) * 100) }
  }, [rounds, run])

  // Précharge le prochain duel pour que l'image soit déjà là au clic.
  useEffect(() => {
    if (!rounds || !current) return
    const all = current.round.matches
    const i = all.findIndex(m => m.id === current.match.id)
    for (const m of all.slice(i + 1, i + 3)) for (const p of [m.left, m.right]) if (p) { const im = new Image(); im.src = p.img }
  }, [rounds, current])

  const start = (size, pool) => {
    const chosen = sample(pool, Math.min(size, pool.length))
    setHistory([])
    setRecap(null)
    setRun({ size: chosen.length, rounds: generateBracket(chosen).rounds })
  }

  const [burst, setBurst] = useState(0)                   // relance les lignes de vitesse
  const [wipe, setWipe] = useState(null)                  // { label, sub, kanji }
  const [combo, setCombo] = useState(0)                   // décisions rapides d'affilée
  const [rewind, setRewind] = useState(0)
  const [soundOn, setSoundOn] = useState(sfxEnabled)
  const [beat, setBeat] = useState(0)                     // battement de la finale
  const lastRoundRef = useRef(null)
  const arenaRef = useRef(null)
  const shownAtRef = useRef(0)

  const isFinal = current?.round.size === 2

  // Volet d'encre à chaque nouveau tour (après le récap s'il y en a un).
  const roundSize = current?.round.size
  useEffect(() => {
    if (!roundSize || recap) return
    if (lastRoundRef.current === roundSize) return
    lastRoundRef.current = roundSize
    const real = current.round.matches.filter(m => m.left && m.right).length
    const n = rounds.findIndex(r => r.id === current.round.id) + 1
    setWipe({ label: roundName(roundSize), sub: roundSize === 2 ? 'Le dernier duel' : `${real} duels`, kanji: KANJI[roundSize] || `第${n}回戦` })
    sfx.whoosh()
    const t = setTimeout(() => setWipe(null), 1300)
    return () => clearTimeout(t)
  }, [roundSize, recap, current, rounds])

  // Nouveau duel : lignes de vitesse + départ du chrono de décision.
  useEffect(() => {
    if (!current) return
    setBurst(b => b + 1)
    shownAtRef.current = performance.now()
  }, [current?.match.id])

  // Finale : le fond bat comme un cœur tant que le choix n'est pas fait.
  useEffect(() => {
    if (!isFinal || picked || wipe || recap) return
    let n = 0
    const id = setInterval(() => {
      n++
      setBeat(b => b + 1)
      const r = arenaRef.current?.getBoundingClientRect()
      if (r) fx.pulse(r.left + r.width / 2, r.top + r.height / 2, n % 2 ? RED : BLUE, 0.55)
      if (n <= 3) sfx.heartbeat()
    }, 1500)
    return () => clearInterval(id)
  }, [isFinal, picked, wipe, recap])

  const choose = useCallback(side => {
    if (!current || picked || recap || wipe) return
    const { match, round } = current
    const p = side === 'left' ? match.left : match.right
    const other = side === 'left' ? match.right : match.left
    if (!p) return
    const ms = Math.round(performance.now() - shownAtRef.current)
    const nextCombo = ms < 1600 ? combo + 1 : 0
    setCombo(nextCombo)
    setPicked(side)
    fx.lean(null)
    const card = arenaRef.current?.querySelector(`.vs-card--${side}`)
    if (card) {
      const r = card.getBoundingClientRect()
      fx.pulse(r.left + r.width / 2, r.top + r.height / 2, side === 'left' ? RED : BLUE, 1 + Math.min(nextCombo, 6) * 0.15)
    }
    sfx.impact(nextCombo)
    sfx.slash()
    setTimeout(() => sfx.stamp(), 110)
    if (nextCombo >= 3) setTimeout(() => sfx.combo(nextCombo), 160)
    buzz(isFinal ? [20, 40, 30] : 14)
    setBurst(b => b + 1)
    setTimeout(() => {
      const next = advanceWinner(rounds, match.id, p.id)
      const entry = { ms, w: p.title, l: other?.title, round: round.size }
      setHistory(h => [...h.slice(-60), rounds])
      setRun(r => ({ ...r, rounds: next, log: [...(r.log || []), entry] }))
      setPicked(null)
      const doneRound = next.find(r => r.id === round.id)
      const roundOver = doneRound.matches.every(m => m.status === 'closed')
      if (roundOver && round.size > 2) {
        setRecap({ size: round.size, qualified: doneRound.matches.map(winnerOf).filter(Boolean) })
      }
    }, 760)
  }, [current, picked, recap, wipe, rounds, combo, isFinal])

  const undo = useCallback(() => {
    if (!history.length || picked) return
    setRecap(null)
    setCombo(0)
    sfx.rewind()
    setRewind(k => k + 1)
    setRun(r => ({ ...r, rounds: history[history.length - 1], log: (r.log || []).slice(0, -1) }))
    setHistory(h => h.slice(0, -1))
  }, [history, picked])

  const quit = () => { setRun(null); setHistory([]); setRecap(null); setCombo(0); lastRoundRef.current = null }
  const toggleSound = () => { const on = !soundOn; setSfxEnabled(on); setSoundOn(on); if (on) sfx.stamp() }

  useEffect(() => {
    const onKey = e => {
      if (e.target.closest?.('input, textarea')) return
      if (zoom) { if (e.key === 'Escape') setZoom(null); return }
      if (recap) { if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') { e.preventDefault(); setRecap(null) } return }
      if (e.key === 'ArrowLeft') choose('left')
      else if (e.key === 'ArrowRight') choose('right')
      else if (e.key === 'Backspace') { e.preventDefault(); undo() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [choose, undo, zoom, recap])

  useEffect(() => () => fx.lean(null), [])

  const realMatches = current ? current.round.matches.filter(m => m.left && m.right) : []
  const matchIdx = current ? realMatches.findIndex(m => m.id === current.match.id) + 1 : 0

  return (
    <div className={`vs-page ${isFinal ? 'is-final' : ''}`}>
      <HalftoneField />
      <div className="vs-shell">
        <BleachRadio compact={narrow} />


        <main className="vs-main">
          <header className="vs-head">
            <Link to="/tournoi" className="vs-back">← Tournois</Link>
            <StretchTitle text={config.title} />
            <p className="vs-kicker">{config.kicker}</p>
            {current && (
              <div className="vs-pill">
                <span>{roundName(current.round.size)}</span>
                <i />
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span key={matchIdx} initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -14, opacity: 0 }} transition={{ duration: 0.22 }}>
                    <b>{matchIdx}</b>/{realMatches.length}
                  </motion.span>
                </AnimatePresence>
              </div>
            )}
          </header>

          {!run && <Setup config={config} onStart={start} />}

          {current && (
            <>
              <RoundStrip matches={realMatches} currentId={current.match.id} />
              <div className="vs-stage" ref={arenaRef}>
                <SpeedLines burst={burst} color={picked === 'left' ? RED : picked === 'right' ? BLUE : '#ffffff'} />
                {isFinal && !picked && beat > 0 && (
                  <motion.div key={beat} className="vs-beat" aria-hidden
                    initial={{ opacity: 0.55, scale: 0.6 }} animate={{ opacity: 0, scale: 1.5 }} transition={{ duration: 1.2, ease: 'easeOut' }} />
                )}
                <AnimatePresence>{combo >= 3 && <ComboStamp key={combo} n={combo} />}</AnimatePresence>
                {rewind > 0 && <RewindStamp key={rewind} />}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={current.match.id}
                    className="vs-arena"
                    exit={{ opacity: 0, transition: { duration: 0.15 } }}
                  >
                    <DuelCard side="left" color={RED} p={current.match.left} fit={config.fit} picked={picked} onPick={choose} onZoom={setZoom} seed={matchIdx} />
                    <div className="vs-mark" aria-hidden>
                      <InkSplat seed={matchIdx + current.round.size} />
                      <motion.div className="vs-mark-txt"
                        initial={{ scale: 3.2, rotate: -24, opacity: 0 }}
                        animate={picked ? { scale: 0.6, opacity: 0, rotate: 10 } : { scale: 1, rotate: 0, opacity: 1 }}
                        transition={picked ? { duration: 0.2 } : { type: 'spring', stiffness: 460, damping: 15, delay: 0.18 }}>
                        {isFinal
                          ? <span className="vs-kessen">決戦</span>
                          : <><span style={{ color: RED }}>V</span><span style={{ color: BLUE }}>S</span></>}
                      </motion.div>
                    </div>
                    <DuelCard side="right" color={BLUE} p={current.match.right} fit={config.fit} picked={picked} onPick={choose} onZoom={setZoom} seed={matchIdx + 3} />
                  </motion.div>
                </AnimatePresence>
              </div>
              <div className="vs-help">
                <span className="vs-keys"><kbd>←</kbd> <kbd>→</kbd> pour choisir · {progress.done}/{progress.total} duels</span>
                <button type="button" onClick={undo} disabled={!history.length}>↶ Annuler</button>
                <button type="button" onClick={quit}>Nouvelle partie</button>
                <button type="button" onClick={toggleSound} aria-pressed={soundOn}>{soundOn ? 'Bruitages activés' : 'Bruitages coupés'}</button>
              </div>
            </>
          )}

          {winner && <Champion rounds={rounds} log={run.log || []} config={config} onRestart={quit} onUndo={history.length ? undo : null} />}
        </main>
      </div>

      <AnimatePresence>
        {recap && <Recap recap={recap} onClose={() => setRecap(null)} />}
      </AnimatePresence>

      <AnimatePresence>
        {wipe && <RoundWipe key={wipe.label} label={wipe.label} sub={wipe.sub} kanji={wipe.kanji} />}
      </AnimatePresence>

      <AnimatePresence>
        {zoom && (
          <motion.div className="vs-zoom" onClick={() => setZoom(null)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.img layoutId={`img-${zoom.id}`} src={zoom.img} alt={zoom.title} transition={{ type: 'spring', stiffness: 300, damping: 30 }} />
            <p>{zoom.title} <small>{zoom.subtitle}</small></p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Bande de cases : un duel = une case de manga qui se remplit d'encre ────
function RoundStrip({ matches, currentId }) {
  const dense = matches.length > 24
  return (
    <div className={`vs-strip ${dense ? 'is-dense' : ''}`} aria-hidden>
      {matches.map(m => {
        const state = m.status === 'closed' ? 'is-done' : m.id === currentId ? 'is-now' : ''
        const side = m.status === 'closed' ? (m.left?.id === m.winnerId ? 'l' : 'r') : ''
        return <i key={m.id} className={`${state} ${side}`} />
      })}
    </div>
  )
}

// ── Écran de départ ────────────────────────────────────────────────────────
function Setup({ config, onStart }) {
  const all = config.participants
  const groups = useMemo(() => {
    if (!config.filterBy) return []
    const m = new Map()
    for (const p of all) m.set(p[config.filterBy], (m.get(p[config.filterBy]) || 0) + 1)
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [all, config.filterBy])
  const [off, setOff] = useState(() => new Set())
  const pool = config.filterBy ? all.filter(p => !off.has(p[config.filterBy])) : all
  const fits = config.formats.filter(f => f <= pool.length)
  const [size, setSize] = useState(config.defaultFormat)
  const effective = fits.includes(size) ? size : fits[fits.length - 1]

  const toggle = g => setOff(prev => {
    const n = new Set(prev)
    n.has(g) ? n.delete(g) : n.add(g)
    return n
  })

  // Vignettes de fond : un aperçu du pool.
  const preview = useRef(sample(all, 12)).current

  return (
    <motion.div className="vs-setup" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="vs-setup-strip" aria-hidden>
        {preview.map(p => <img key={p.id} src={p.img} alt="" loading="lazy" />)}
      </div>

      <div className="vs-setup-box">
        <p className="vs-setup-count"><b>{pool.length}</b> {config.filterBy ? 'panels dans le pool' : 'participants'}</p>

        <h2>Format</h2>
        <div className="vs-formats">
          {config.formats.map(f => (
            <button key={f} type="button" disabled={f > pool.length} className={effective === f ? 'is-on' : ''} onClick={() => setSize(f)}>
              <b>{f}</b>
              <small>{f - 1} duels</small>
            </button>
          ))}
        </div>

        {groups.length > 0 && (
          <>
            <h2>Séries <button type="button" className="vs-linkbtn" onClick={() => setOff(new Set())}>tout cocher</button></h2>
            <div className="vs-chips">
              {groups.map(([g, n]) => (
                <button key={g} type="button" className={off.has(g) ? '' : 'is-on'} onClick={() => toggle(g)} aria-pressed={!off.has(g)}>
                  {g} <small>{n}</small>
                </button>
              ))}
            </div>
          </>
        )}

        <button type="button" className="vs-go" disabled={!effective} onClick={() => onStart(effective, pool)}>
          Lancer le tournoi {effective ? `· ${effective}` : ''}
        </button>
        <p className="vs-setup-note">Tirage au hasard dans le pool à chaque partie.</p>
      </div>
    </motion.div>
  )
}

// ── Duel ───────────────────────────────────────────────────────────────────
// Entrée : la case glisse depuis son côté avec un dépassement (ressort).
// Survol : inclinaison 3D qui suit le curseur, l'image dérive en parallaxe,
// la trame de fond se teinte de la couleur du côté.
// Choix : le gagnant prend une « case d'impact » (négatif d'un instant) et une
// onomatopée ; le perdant est tranché en deux.
function DuelCard({ side, color, p, fit, picked, onPick, onZoom, seed }) {
  const reduce = useReducedMotion()
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const sx = useSpring(mx, { stiffness: 220, damping: 18 })
  const sy = useSpring(my, { stiffness: 220, damping: 18 })
  const rotY = useTransform(sx, v => v * 9)
  const rotX = useTransform(sy, v => v * -7)
  const imgX = useTransform(sx, v => v * -12)
  const imgY = useTransform(sy, v => v * -10)

  if (!p) return <div className={`vs-card vs-card--${side} is-empty`} style={{ '--c': color }} />
  const dir = side === 'left' ? -1 : 1
  const win = picked === side
  const lose = picked && !win

  const onMove = e => {
    if (reduce || e.pointerType === 'touch' || picked) return
    const r = e.currentTarget.getBoundingClientRect()
    mx.set((e.clientX - r.left) / r.width - 0.5)
    my.set((e.clientY - r.top) / r.height - 0.5)
  }
  const onEnter = e => { if (e.pointerType !== 'touch') fx.lean(side) }
  const onLeave = () => { mx.set(0); my.set(0); fx.lean(null) }

  return (
    <motion.div
      className={`vs-card vs-card--${side} ${win ? 'is-win' : ''} ${lose ? 'is-lose' : ''}`}
      style={{ '--c': color, rotateX: rotX, rotateY: rotY, transformPerspective: 1100 }}
      initial={reduce ? { opacity: 0 } : { x: 160 * dir, rotate: 7 * dir, opacity: 0, scale: 0.92 }}
      animate={win
        ? { x: 0, rotate: 0, opacity: 1, scale: [1, 1.07, 1.035], zIndex: 4 }
        : lose ? { x: 0, rotate: 0, opacity: 1, scale: 0.97 }
        : { x: 0, rotate: 0, opacity: 1, scale: 1 }}
      transition={win || lose ? { duration: 0.45, ease: [0.2, 0.8, 0.2, 1] } : { type: 'spring', stiffness: 340, damping: 22, mass: 0.9 }}
      onPointerMove={onMove}
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      whileTap={picked ? undefined : { scale: 0.965 }}
    >
      <button type="button" className="vs-card-hit" onClick={() => onPick(side)} aria-label={`Choisir ${p.title}`} disabled={!!picked}>
        {!lose && (
          <motion.div className="vs-card-img" style={{ x: imgX, y: imgY }}
            animate={win ? { filter: ['invert(0) contrast(1)', 'invert(1) contrast(1.6)', 'invert(0) contrast(1)'] } : { scale: [1.06, 1.1] }}
            transition={win ? { duration: 0.22, times: [0, 0.35, 1] } : { duration: 9, ease: 'linear', repeat: Infinity, repeatType: 'mirror' }}>
            <motion.img layoutId={`img-${p.id}`} src={p.img} alt={p.title} style={{ objectFit: fit }} draggable={false} />
          </motion.div>
        )}
        {lose && <SlashSplit src={p.img} fit={fit} dir={dir} />}
        <span className="vs-card-tone" aria-hidden />
      </button>
      <button type="button" className="vs-zoom-btn" onClick={() => onZoom(p)} aria-label="Agrandir">⤢</button>
      <motion.div className="vs-tag"
        initial={{ clipPath: side === 'left' ? 'inset(0 100% 0 0)' : 'inset(0 0 0 100%)' }}
        animate={{ clipPath: 'inset(0 0% 0 0%)', opacity: lose ? 0 : 1 }}
        transition={{ delay: lose ? 0 : 0.28, duration: 0.42, ease: [0.7, 0, 0.2, 1] }}>
        <b>{p.title}</b>
        <small>{p.subtitle}</small>
      </motion.div>
      {win && <SfxStamp seed={seed} side={side} />}
    </motion.div>
  )
}

// ── Récap de fin de tour : les qualifiés sont « distribués » comme des cartes
function Recap({ recap, onClose }) {
  const nextName = roundName(recap.size / 2)
  const dense = recap.qualified.length > 16
  return (
    <motion.div className="vs-recap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="vs-recap-box" initial={{ y: 30, rotate: -1.5 }} animate={{ y: 0, rotate: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 24 }} onClick={e => e.stopPropagation()}>
        <p className="vs-recap-k">{roundName(recap.size)} terminé · {recap.size / 2} éliminés</p>
        <h2>Qualifiés pour {nextName === 'Finale' ? 'la finale' : `les ${nextName.toLowerCase()}`}</h2>
        <div className={`vs-recap-grid ${dense ? 'is-dense' : ''}`}>
          {recap.qualified.map((p, i) => (
            <motion.figure key={p.id}
              initial={{ opacity: 0, y: -60, rotate: ((i * 37) % 17) - 8, scale: 1.2 }}
              animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 420, damping: 22, delay: Math.min(i * (dense ? 0.018 : 0.05), 0.9) }}>
              <img src={p.img} alt={p.title} loading="lazy" />
              {!dense && <figcaption>{p.title}</figcaption>}
            </motion.figure>
          ))}
        </div>
        <button type="button" className="vs-go" onClick={onClose}>Continuer vers {nextName === 'Finale' ? 'la finale' : `les ${nextName.toLowerCase()}`}</button>
      </motion.div>
    </motion.div>
  )
}

// ── Champion : une planche de manga composée avec ton top 8 ────────────────
function Champion({ rounds, log, config, onRestart, onUndo }) {
  const ranking = topRanking(rounds)
  const [champ, ...rest] = ranking
  const [copied, setCopied] = useState(false)
  const champRef = useRef(null)
  useEffect(() => { const t = setTimeout(() => sfx.fanfare(), 300); return () => clearTimeout(t) }, [])
  const stats = useMemo(() => {
    const timed = log.filter(e => e.ms > 0)
    if (timed.length < 2) return null
    const fastest = timed.reduce((a, b) => (b.ms < a.ms ? b : a))
    const slowest = timed.reduce((a, b) => (b.ms > a.ms ? b : a))
    const avg = timed.reduce((s, e) => s + e.ms, 0) / timed.length
    return { fastest, slowest, avg, n: timed.length }
  }, [log])

  // Trois ondes d'encre depuis la case du champion.
  useEffect(() => {
    const timers = [0, 420, 900].map((d, i) => setTimeout(() => {
      const r = champRef.current?.getBoundingClientRect()
      if (r) fx.pulse(r.left + r.width / 2, r.top + r.height / 2, i === 1 ? BLUE : RED, 1.2)
    }, 350 + d))
    return () => timers.forEach(clearTimeout)
  }, [])

  const share = async () => {
    const lines = [`Mon top ${config.title} sur Brams Community :`, ...ranking.slice(0, 4).map((r, i) => `${i + 1}. ${r.p.title} (${r.p.subtitle})`), `${window.location.origin}${config.route}`]
    try { await navigator.clipboard.writeText(lines.join('\n')); setCopied(true); setTimeout(() => setCopied(false), 1800) } catch {}
  }
  return (
    <div className="vs-champ">
      <PaperRain />
      <div className="vs-page-sheet">
        <motion.div ref={champRef} className="vs-cell vs-cell--champ"
          initial={{ clipPath: 'inset(50% 50% 50% 50%)' }} animate={{ clipPath: 'inset(0% 0% 0% 0%)' }}
          transition={{ duration: 0.7, ease: [0.7, 0, 0.2, 1] }}>
          <SpeedLines burst={1} color="#000000" />
          <img src={champ.p.img} alt={champ.p.title} />
          <motion.span className="vs-kanji" initial={{ scale: 3, opacity: 0, rotate: -20 }} animate={{ scale: 1, opacity: 1, rotate: -8 }} transition={{ delay: 0.7, type: 'spring', stiffness: 500, damping: 14 }}>完</motion.span>
          <div className="vs-cell-cap">
            <small>Ton champion</small>
            <b>{champ.p.title}</b>
            <i>{champ.p.subtitle}</i>
          </div>
        </motion.div>
        {rest.map((r, i) => (
          <motion.figure key={r.p.id} className={`vs-cell vs-cell--r${RANK[r.label]}`}
            initial={{ clipPath: i % 2 ? 'inset(0 0 100% 0)' : 'inset(0 100% 0 0)' }}
            animate={{ clipPath: 'inset(0 0% 0% 0)' }}
            transition={{ delay: 0.6 + i * 0.09, duration: 0.5, ease: [0.7, 0, 0.2, 1] }}>
            <img src={r.p.img} alt={r.p.title} loading="lazy" />
            <span className="vs-pod-rank">{RANK[r.label]}</span>
            <figcaption>{r.p.title}</figcaption>
          </motion.figure>
        ))}
      </div>
      {stats && (
        <motion.dl className="vs-stats" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.4, duration: 0.5 }}>
          <div>
            <dt>Temps moyen par duel</dt>
            <dd><Counter to={stats.avg / 1000} decimals={1} suffix=" s" /></dd>
          </div>
          <div>
            <dt>Choix le plus rapide</dt>
            <dd>{fmtS(stats.fastest.ms)}</dd>
            <p>{stats.fastest.w} plutôt que {stats.fastest.l}</p>
          </div>
          <div>
            <dt>Plus longue hésitation</dt>
            <dd>{fmtS(stats.slowest.ms)}</dd>
            <p>{stats.slowest.w} contre {stats.slowest.l}</p>
          </div>
        </motion.dl>
      )}
      <div className="vs-help">
        {onUndo && <button type="button" onClick={onUndo}>↶ Revoir la finale</button>}
        <button type="button" onClick={share}>{copied ? '✓ Copié' : 'Copier mon top'}</button>
        <button type="button" className="is-main" onClick={onRestart}>Nouvelle partie</button>
      </div>
    </div>
  )
}

const fmtS = ms => `${(ms / 1000).toFixed(1).replace('.', ',')} s`

// Nombre qui défile jusqu'à sa valeur.
function Counter({ to, decimals = 0, suffix = '' }) {
  const ref = useRef(null)
  useEffect(() => {
    const t0 = performance.now()
    let raf = 0
    const tick = now => {
      const k = Math.min(1, (now - t0) / 900)
      const e = 1 - Math.pow(1 - k, 3)
      if (ref.current) ref.current.textContent = (to * e).toFixed(decimals).replace('.', ',') + suffix
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    const d = setTimeout(() => { raf = requestAnimationFrame(tick) }, 1400)
    return () => { clearTimeout(d); cancelAnimationFrame(raf) }
  }, [to, decimals, suffix])
  return <span ref={ref}>0{suffix}</span>
}
