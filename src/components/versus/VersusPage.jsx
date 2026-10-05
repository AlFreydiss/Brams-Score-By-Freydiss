import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion'
import { VERSUS_CONFIGS } from '../../data/versus-data.js'
import { generateBracket, advanceWinner, getCurrentMatch, getWinner, getTournamentProgress } from '../../lib/tournament.js'
import BleachRadio from './BleachRadio.jsx'
import Bracket, { makeShareImage } from './Bracket.jsx'
import HalftoneField, { fx } from './HalftoneField.jsx'
import { RoundWipe, SlashSplit, StretchTitle } from './fx.jsx'
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
  const [showBracket, setShowBracket] = useState(false)
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

  const [wipe, setWipe] = useState(null)                  // { label, sub, kanji }
  const [combo, setCombo] = useState(0)                   // décisions rapides d'affilée
  const [soundOn, setSoundOn] = useState(sfxEnabled)
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
    shownAtRef.current = performance.now()
  }, [current?.match.id])

  // Finale : le fond bat comme un cœur tant que le choix n'est pas fait.
  useEffect(() => {
    if (!isFinal || picked || wipe || recap) return
    let n = 0
    const id = setInterval(() => {
      n++
      const r = arenaRef.current?.getBoundingClientRect()
      if (r) fx.pulse(r.left + r.width / 2, r.top + r.height / 2, '#ffffff', 0.32)
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
      fx.pulse(r.left + r.width / 2, r.top + r.height / 2, '#ffffff', 0.7 + Math.min(nextCombo, 6) * 0.06)
    }
    sfx.impact(nextCombo)
    sfx.slash()
    setTimeout(() => sfx.stamp(), 110)
    if (nextCombo >= 3) setTimeout(() => sfx.combo(nextCombo), 160)
    buzz(isFinal ? [20, 40, 30] : 14)
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
    setRun(r => ({ ...r, rounds: history[history.length - 1], log: (r.log || []).slice(0, -1) }))
    setHistory(h => h.slice(0, -1))
  }, [history, picked])

  const quit = () => { setRun(null); setHistory([]); setRecap(null); setCombo(0); lastRoundRef.current = null }
  const toggleSound = () => { const on = !soundOn; setSfxEnabled(on); setSoundOn(on); if (on) sfx.stamp() }

  useEffect(() => {
    const onKey = e => {
      if (e.target.closest?.('input, textarea')) return
      if (zoom) { if (e.key === 'Escape') setZoom(null); return }
      if (showBracket) return
      if ((e.key === 't' || e.key === 'T') && rounds) { setShowBracket(true); return }
      if (recap) { if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') { e.preventDefault(); setRecap(null) } return }
      if (e.key === 'ArrowLeft') choose('left')
      else if (e.key === 'ArrowRight') choose('right')
      else if (e.key === 'Backspace') { e.preventDefault(); undo() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [choose, undo, zoom, recap, showBracket, rounds])

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
            {current ? (
              <p className="vs-round">
                <span>{roundName(current.round.size)}</span>
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span key={matchIdx} className="vs-round-n" initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }} transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}>
                    {matchIdx} / {realMatches.length}
                  </motion.span>
                </AnimatePresence>
              </p>
            ) : <p className="vs-kicker">{config.kicker}</p>}
          </header>

          {!run && <Setup config={config} onStart={start} />}

          {current && (
            <>
              <RoundStrip matches={realMatches} currentId={current.match.id} />
              <div className="vs-stage" ref={arenaRef}>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={current.match.id}
                    className="vs-arena"
                    exit={{ opacity: 0, transition: { duration: 0.18 } }}
                  >
                    <DuelCard side="left" color={RED} p={current.match.left} fit={config.fit} picked={picked} onPick={choose} onZoom={setZoom} />
                    <motion.div className="vs-mark" aria-hidden
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={picked ? { opacity: 0, scale: 0.8 } : { opacity: 1, scale: 1 }}
                      transition={{ duration: 0.35, delay: picked ? 0 : 0.25, ease: [0.2, 0.8, 0.2, 1] }}>
                      {isFinal ? 'finale' : 'vs'}
                    </motion.div>
                    <DuelCard side="right" color={BLUE} p={current.match.right} fit={config.fit} picked={picked} onPick={choose} onZoom={setZoom} />
                  </motion.div>
                </AnimatePresence>
              </div>
              <div className="vs-help">
                <span className="vs-keys">
                  <kbd>←</kbd> <kbd>→</kbd> pour choisir
                  <AnimatePresence>{combo >= 3 && <motion.em key="c" initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>série rapide ×{combo}</motion.em>}</AnimatePresence>
                </span>
                <button type="button" onClick={undo} disabled={!history.length}>Annuler</button>
                <button type="button" onClick={() => setShowBracket(true)}>Tableau <kbd>T</kbd></button>
                <button type="button" onClick={quit}>Nouvelle partie</button>
                <button type="button" onClick={toggleSound} aria-pressed={soundOn}>{soundOn ? 'Son activé' : 'Son coupé'}</button>
              </div>
            </>
          )}

          {winner && <Champion rounds={rounds} log={run.log || []} config={config} onRestart={quit} onUndo={history.length ? undo : null} onBracket={() => setShowBracket(true)} />}
        </main>
      </div>

      <AnimatePresence>
        {showBracket && rounds && <Bracket rounds={rounds} currentId={current?.match.id} onClose={() => setShowBracket(false)} />}
      </AnimatePresence>

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
// Sobre : la case se révèle de bas en haut, s'incline à peine sous le curseur.
// Au choix, le gagnant s'éclaire d'un filet blanc ; le perdant est fendu d'un
// trait puis se dissout en points d'impression.
function DuelCard({ side, color, p, fit, picked, onPick, onZoom }) {
  const reduce = useReducedMotion()
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const sx = useSpring(mx, { stiffness: 160, damping: 20 })
  const sy = useSpring(my, { stiffness: 160, damping: 20 })
  const rotY = useTransform(sx, v => v * 4)
  const rotX = useTransform(sy, v => v * -3)
  const imgX = useTransform(sx, v => v * -8)
  const imgY = useTransform(sy, v => v * -6)
  const [loaded, setLoaded] = useState(false)

  if (!p) return <div className={`vs-card vs-card--${side} is-empty`} />
  const dir = side === 'left' ? -1 : 1
  const win = picked === side
  const lose = picked && !win
  const ease = [0.2, 0.8, 0.2, 1]

  const onMove = e => {
    if (reduce || e.pointerType === 'touch' || picked) return
    const r = e.currentTarget.getBoundingClientRect()
    mx.set((e.clientX - r.left) / r.width - 0.5)
    my.set((e.clientY - r.top) / r.height - 0.5)
  }
  const onEnter = e => { if (e.pointerType !== 'touch') fx.lean(side) }
  const onLeave = () => { mx.set(0); my.set(0); fx.lean(null) }

  return (
    <div className={`vs-card vs-card--${side} ${win ? 'is-win' : ''} ${lose ? 'is-lose' : ''}`} style={{ '--c': color }}>
      <motion.div
        className="vs-frame"
        style={{ rotateX: rotX, rotateY: rotY, transformPerspective: 1400 }}
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 18, clipPath: 'inset(100% 0 0 0)' }}
        animate={{ opacity: 1, y: 0, clipPath: 'inset(0% 0 0 0)', scale: win ? 1.015 : 1 }}
        transition={{ duration: 0.7, ease, delay: side === 'left' ? 0 : 0.08, scale: { duration: 0.4, ease } }}
        onPointerMove={onMove}
        onPointerEnter={onEnter}
        onPointerLeave={onLeave}
        whileTap={picked ? undefined : { scale: 0.985 }}
      >
        <button type="button" className="vs-card-hit" onClick={() => onPick(side)} aria-label={`Choisir ${p.title}`} disabled={!!picked}>
          {!lose && (
            <motion.div className="vs-card-img" style={{ x: imgX, y: imgY }}
              initial={{ scale: 1.12 }} animate={{ scale: 1.04 }} transition={{ duration: 1.1, ease }}>
              <motion.img layoutId={`img-${p.id}`} src={p.img} alt={p.title} style={{ objectFit: fit }} draggable={false}
                className={loaded ? 'is-loaded' : ''} onLoad={() => setLoaded(true)} ref={el => { if (el?.complete && el.naturalWidth && !loaded) setLoaded(true) }} />
            </motion.div>
          )}
          {lose && <SlashSplit src={p.img} fit={fit} dir={dir} />}
        </button>
        <button type="button" className="vs-zoom-btn" onClick={() => onZoom(p)} aria-label="Agrandir">⤢</button>
      </motion.div>
      <motion.div className="vs-cap"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: lose ? 0.25 : 1, y: 0 }}
        transition={{ duration: 0.5, ease, delay: lose || win ? 0 : 0.35 }}>
        <span className="vs-cap-key" aria-hidden>{side === 'left' ? '←' : '→'}</span>
        <span className="vs-cap-txt">
          <b>{p.title}</b>
          <small>{p.subtitle}</small>
        </span>
        <motion.i className="vs-cap-line" aria-hidden initial={{ scaleX: 0 }} animate={{ scaleX: win ? 1 : 0 }} transition={{ duration: 0.45, ease }} />
      </motion.div>
    </div>
  )
}

// ── Récap de fin de tour : les qualifiés sont « distribués » comme des cartes
function Recap({ recap, onClose }) {
  const nextName = roundName(recap.size / 2)
  const dense = recap.qualified.length > 16
  return (
    <motion.div className="vs-recap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="vs-recap-box" initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }} onClick={e => e.stopPropagation()}>
        <p className="vs-recap-k">{roundName(recap.size)} terminé · {recap.size / 2} éliminés</p>
        <h2>Qualifiés pour {nextName === 'Finale' ? 'la finale' : `les ${nextName.toLowerCase()}`}</h2>
        <div className={`vs-recap-grid ${dense ? 'is-dense' : ''}`}>
          {recap.qualified.map((p, i) => (
            <motion.figure key={p.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1], delay: 0.15 + Math.min(i * (dense ? 0.012 : 0.04), 0.7) }}>
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
function Champion({ rounds, log, config, onRestart, onUndo, onBracket }) {
  const [saving, setSaving] = useState(false)
  const download = async () => {
    setSaving(true)
    try {
      const blob = await makeShareImage({ title: config.title, ranking: topRanking(rounds), url: `${window.location.origin}${config.route}` })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `top-${config.id}.png`
      a.click()
      setTimeout(() => URL.revokeObjectURL(a.href), 4000)
    } finally { setSaving(false) }
  }
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
      if (r) fx.pulse(r.left + r.width / 2, r.top + r.height / 2, '#ffffff', 0.8 - i * 0.2)
    }, 350 + d))
    return () => timers.forEach(clearTimeout)
  }, [])

  const share = async () => {
    const lines = [`Mon top ${config.title} sur Brams Community :`, ...ranking.slice(0, 4).map((r, i) => `${i + 1}. ${r.p.title} (${r.p.subtitle})`), `${window.location.origin}${config.route}`]
    try { await navigator.clipboard.writeText(lines.join('\n')); setCopied(true); setTimeout(() => setCopied(false), 1800) } catch {}
  }
  return (
    <div className="vs-champ">
      <div className="vs-page-sheet">
        <motion.div ref={champRef} className="vs-cell vs-cell--champ"
          initial={{ clipPath: 'inset(50% 50% 50% 50%)' }} animate={{ clipPath: 'inset(0% 0% 0% 0%)' }}
          transition={{ duration: 0.7, ease: [0.7, 0, 0.2, 1] }}>
          <img src={champ.p.img} alt={champ.p.title} />
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
        <button type="button" onClick={onBracket}>Voir le tableau</button>
        <button type="button" onClick={download} disabled={saving}>{saving ? 'Image en cours…' : 'Télécharger l’image'}</button>
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
