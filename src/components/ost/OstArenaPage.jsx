import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion'
import { TOURNAMENT_CONFIG as CONFIG } from '../../data/tournament-data.js'
import { generateBracket, advanceWinner, getCurrentMatch, getWinner, getTournamentProgress } from '../../lib/tournament.js'
import Bracket, { makeShareImage } from '../versus/Bracket.jsx'
import { fetchStats, recordDuel, winRate } from '../../lib/versusStats.js'
import { useYouTubeAudio } from './useYouTubeAudio.js'
import '../versus/versus.css'
import './ost.css'

// Tournoi des OST : on n'écoute que le son. Chaque duel est une section qui
// s'ouvre, se fend d'un trait, puis se sépare en deux moitiés, une par piste,
// avec la photo de son anime en fond. Garder une piste pousse le trait
// jusqu'au bord : la gagnante prend tout l'écran avant le duel suivant.
// La partie en cours est sauvegardée en localStorage.

const EASE = [0.2, 0.8, 0.2, 1]
const CUT = [0.7, 0, 0.2, 1]
const STATS_ID = CONFIG.statsId

const runKey = `ost_run_${CONFIG.id}_${CONFIG.version}`
function loadRun() {
  try {
    const r = JSON.parse(localStorage.getItem(runKey) || 'null')
    return r && Array.isArray(r.rounds) && r.rounds.length ? r : null
  } catch { return null }
}
function saveRun(run) {
  try {
    if (run) localStorage.setItem(runKey, JSON.stringify(run))
    else localStorage.removeItem(runKey)
  } catch {}
}

function useIsNarrow() {
  const q = '(max-width: 760px)'
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
  if (size === 32) return 'Seizièmes de finale'
  return `${size / 2}es de finale`
}
const nextRoundPhrase = size => (size === 4 ? 'la finale' : `les ${roundName(size / 2).toLowerCase()}`)

function sample(list, n) {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a.slice(0, n)
}

const winnerOf = m => (m.winnerId && (m.left?.id === m.winnerId ? m.left : m.right)) || null
const loserOf = m => (m.winnerId && (m.left?.id === m.winnerId ? m.right : m.left)) || null

function topRanking(rounds) {
  const out = []
  const champ = getWinner(rounds)
  if (champ) out.push({ p: champ, label: 'Champion', rank: 1 })
  const n = rounds.length
  const add = (round, label, rank) => round?.matches.forEach(m => { const l = loserOf(m); if (l) out.push({ p: l, label, rank }) })
  add(rounds[n - 1], 'Finaliste', 2)
  add(rounds[n - 2], 'Demi-finale', 3)
  add(rounds[n - 3], 'Quart de finale', 5)
  return out
}

const fmtTime = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

export default function OstArenaPage() {
  const narrow = useIsNarrow()
  const audio = useYouTubeAudio()
  const [run, setRun] = useState(loadRun)            // { size, rounds, blind }
  const [history, setHistory] = useState([])
  const [recap, setRecap] = useState(null)            // { size, qualified }
  const [showBracket, setShowBracket] = useState(false)
  const [community, setCommunity] = useState(null)
  const [focus, setFocus] = useState('left')          // côté que Entrée garde

  useEffect(() => { saveRun(run) }, [run])
  useEffect(() => { document.title = `${CONFIG.title} · Tournoi · Brams Community` }, [])
  useEffect(() => { let on = true; fetchStats(STATS_ID).then(m => { if (on) setCommunity(m) }); return () => { on = false } }, [])

  const rounds = run?.rounds
  const current = useMemo(() => rounds && getCurrentMatch(rounds), [rounds])
  const winner = useMemo(() => rounds && getWinner(rounds), [rounds])
  const realMatches = current ? current.round.matches.filter(m => m.left && m.right) : []
  const matchIdx = current ? realMatches.findIndex(m => m.id === current.match.id) + 1 : 0
  const progress = useMemo(() => {
    if (!rounds) return null
    const { done } = getTournamentProgress(rounds)
    return { done, total: Math.max(1, (run.size || 2) - 1) }
  }, [rounds, run])

  // Précharge les photos des deux duels suivants.
  useEffect(() => {
    if (!current) return
    const all = current.round.matches
    const i = all.findIndex(m => m.id === current.match.id)
    for (const m of all.slice(i + 1, i + 3)) for (const p of [m.left, m.right]) if (p) { const im = new Image(); im.src = p.photo }
  }, [current])

  const start = (size, pool, blind) => {
    const chosen = sample(pool, Math.min(size, pool.length))
    setHistory([])
    setRecap(null)
    setRun({ size: chosen.length, rounds: generateBracket(chosen).rounds, blind, startedAt: Date.now() })
  }

  const pick = useCallback(side => {
    if (!current) return
    const { match, round } = current
    const p = side === 'left' ? match.left : match.right
    const other = side === 'left' ? match.right : match.left
    if (!p) return
    recordDuel(STATS_ID, p.id, other?.id)
    const next = advanceWinner(rounds, match.id, p.id)
    setHistory(h => [...h.slice(-60), rounds])
    setRun(r => ({ ...r, rounds: next }))
    setFocus('left')
    const doneRound = next.find(r => r.id === round.id)
    if (round.size > 2 && doneRound.matches.every(m => m.status === 'closed')) {
      setRecap({ size: round.size, qualified: doneRound.matches.map(winnerOf).filter(Boolean) })
    }
  }, [current, rounds])

  const undo = useCallback(() => {
    if (!history.length) return
    setRecap(null)
    setRun(r => ({ ...r, rounds: history[history.length - 1] }))
    setHistory(h => h.slice(0, -1))
  }, [history])

  const quit = () => { audio.stop(); setRun(null); setHistory([]); setRecap(null) }

  // ← → écouter, Entrée garder la piste écoutée, Espace pause, T tableau.
  const duelRef = useRef(null)
  useEffect(() => {
    const onKey = e => {
      if (e.target.closest?.('input, textarea, select')) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (showBracket) return
      if (recap) { if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); setRecap(null) } return }
      if ((e.key === 't' || e.key === 'T') && rounds) { setShowBracket(true); return }
      if (!current) return
      const { left, right } = current.match
      if (e.key === 'ArrowLeft') { e.preventDefault(); setFocus('left'); audio.play(left) }
      else if (e.key === 'ArrowRight') { e.preventDefault(); setFocus('right'); audio.play(right) }
      else if (e.key === ' ' && e.target === document.body) {
        e.preventDefault()
        const t = focus === 'left' ? left : right
        audio.toggle(t)
      }
      else if (e.key === 'Enter' && e.target === document.body) { e.preventDefault(); duelRef.current?.keep(focus) }
      else if (e.key === 'Backspace') { e.preventDefault(); undo() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [current, rounds, recap, showBracket, focus, audio, undo])

  return (
    <div className="oa-page">
      <div className="oa-stage">
        <AnimatePresence mode="wait">
          {!run && <Setup key="setup" onStart={start} />}

          {current && !recap && (
            <Duel
              key={current.match.id}
              ref={duelRef}
              match={current.match}
              round={current.round}
              isFinal={current.round.size === 2}
              narrow={narrow}
              blind={!!run.blind}
              audio={audio}
              community={community}
              focus={focus}
              onFocus={setFocus}
              onPick={pick}
            />
          )}

          {winner && !recap && <Champion key="champ" rounds={rounds} audio={audio} onRestart={quit} onUndo={history.length ? undo : null} onBracket={() => setShowBracket(true)} />}
        </AnimatePresence>

        {current && !recap && (
          <div className="oa-bar">
            <Link to="/tournoi" className="oa-back">← Tournois</Link>
            <p className="oa-round">
              <span>{roundName(current.round.size)}</span>
              <b>{matchIdx} / {realMatches.length}</b>
            </p>
            <div className="oa-tools">
              <Volume audio={audio} />
              <button type="button" onClick={undo} disabled={!history.length}>Annuler</button>
              <button type="button" onClick={() => setShowBracket(true)}>Tableau</button>
              <button type="button" onClick={quit}>Quitter</button>
            </div>
          </div>
        )}

        {current && !recap && (
          <div className="oa-foot">
            <RoundStrip matches={realMatches} currentId={current.match.id} />
            {!narrow && (
              <p className="oa-keys">
                <span><kbd>←</kbd><kbd>→</kbd> écouter</span>
                <span><kbd>Entrée</kbd> garder</span>
                <span><kbd>Espace</kbd> pause</span>
                {progress && <span className="oa-keys-n">{progress.done} duel{progress.done > 1 ? 's' : ''} joué{progress.done > 1 ? 's' : ''} sur {progress.total}</span>}
              </p>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {recap && <Recap key="recap" recap={recap} onClose={() => setRecap(null)} />}
      </AnimatePresence>
      <AnimatePresence>
        {showBracket && rounds && <Bracket rounds={rounds} currentId={current?.match.id} onClose={() => setShowBracket(false)} />}
      </AnimatePresence>
    </div>
  )
}

// ── Volume ─────────────────────────────────────────────────────────────────
function Volume({ audio }) {
  return (
    <label className="oa-vol" title="Volume">
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" /><path d="M16 8.5a5 5 0 0 1 0 7" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" /></svg>
      <input type="range" min="0" max="100" value={audio.volume} onChange={e => audio.setVolume(+e.target.value)} aria-label="Volume" />
    </label>
  )
}

// ── Bande du tour : un trait par duel ──────────────────────────────────────
function RoundStrip({ matches, currentId }) {
  return (
    <div className={`oa-strip ${matches.length > 32 ? 'is-dense' : ''}`} aria-hidden>
      {matches.map(m => <i key={m.id} className={m.status === 'closed' ? 'is-done' : m.id === currentId ? 'is-now' : ''} />)}
    </div>
  )
}

// ── Géométrie du trait ─────────────────────────────────────────────────────
// s = position du trait en %, T = demi-pente. À l'horizontale (bureau) le
// trait descend en biais ; sur mobile il traverse l'écran de gauche à droite.
function clips(s, T, vertical) {
  if (!vertical) return [
    `polygon(0% 0%, ${s + T}% 0%, ${s - T}% 100%, 0% 100%)`,
    `polygon(${s + T}% 0%, 100% 0%, 100% 100%, ${s - T}% 100%)`,
  ]
  return [
    `polygon(0% 0%, 100% 0%, 100% ${s - T}%, 0% ${s + T}%)`,
    `polygon(0% ${s + T}%, 100% ${s - T}%, 100% 100%, 0% 100%)`,
  ]
}

// ── Duel ───────────────────────────────────────────────────────────────────

const Duel = forwardRef(function Duel({ match, round, isFinal, narrow, blind, audio, community, focus, onFocus, onPick }, ref) {
  const reduce = useReducedMotion()
  const T = narrow ? 6 : 4
  const GAP = narrow ? 4 : 6
  const seam = useMotionValue(50)
  const open = useMotionValue(reduce ? 1 : 0)
  const line = useMotionValue(reduce ? 1 : 0)
  const [phase, setPhase] = useState(reduce ? 'open' : 'enter')   // enter → open → picked
  const [picked, setPicked] = useState(null)
  // Quitter pendant l'animation ne doit pas valider le duel après coup.
  const pickTimer = useRef(0)
  useEffect(() => () => clearTimeout(pickTimer.current), [])

  const clipL = useTransform(seam, s => clips(s, T, narrow)[0])
  const clipR = useTransform(seam, s => clips(s, T, narrow)[1])
  const sizeL = useTransform(seam, s => `${Math.min(100, Math.max(0, s + T))}%`)
  const sizeR = useTransform(seam, s => `${Math.min(100, Math.max(0, 100 - (s - T)))}%`)
  const lineA = useTransform(seam, s => `${s + T}%`)
  const lineB = useTransform(seam, s => `${s - T}%`)
  const offL = useTransform(open, o => -o * GAP)
  const offR = useTransform(open, o => o * GAP)
  const photoOpacity = useTransform(open, [0, 0.35, 1], [0, 0.15, 1])
  const photoScale = useTransform(open, [0, 1], [1.12, 1])
  const cardOpacity = useTransform(open, [0, 0.45], [1, 0])
  const lineOpacity = useTransform(open, [0, 1], [1, 0.5])

  // La section s'ouvre, le trait la fend, les deux moitiés s'écartent.
  useEffect(() => {
    if (reduce) return
    const a = animate(line, 1, { duration: 0.34, delay: 0.46, ease: CUT })
    const b = animate(open, 1, { duration: 0.95, delay: 0.82, ease: EASE })
    const t = setTimeout(() => setPhase('open'), 1050)
    return () => { a.stop(); b.stop(); clearTimeout(t) }
  }, [reduce, line, open])

  // Une fois coupée, la piste de gauche démarre d'elle-même.
  useEffect(() => {
    if (phase !== 'open') return
    const first = audio.failed.has(match.left.id) ? match.right : match.left
    audio.play(first)
    onFocus(first === match.left ? 'left' : 'right')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const lean = side => {
    if (picked || phase !== 'open') return
    const to = side === 'left' ? 53 : side === 'right' ? 47 : 50
    animate(seam, to, { type: 'spring', stiffness: 260, damping: 30 })
  }

  const keep = useCallback(side => {
    if (picked || phase !== 'open') return
    setPicked(side)
    setPhase('picked')
    const p = side === 'left' ? match.left : match.right
    if (audio.id !== p.id) audio.play(p)
    animate(seam, side === 'left' ? 100 + T + 1 : -T - 1, { duration: 0.75, ease: CUT })
    pickTimer.current = setTimeout(() => onPick(side), community?.size ? 1500 : 1150)
  }, [picked, phase, match, audio, seam, T, onPick, community])

  useImperativeHandle(ref, () => ({ keep }), [keep])

  const sides = [
    { side: 'left', p: match.left, clip: clipL, size: sizeL, off: offL },
    { side: 'right', p: match.right, clip: clipR, size: sizeR, off: offR },
  ]

  return (
    <motion.div
      className={`oa-duel ${narrow ? 'is-v' : 'is-h'} ${picked ? 'is-picked' : ''}`}
      initial={reduce ? { opacity: 0 } : { clipPath: 'inset(50% 0% 50% 0%)' }}
      animate={reduce ? { opacity: 1 } : { clipPath: 'inset(0% 0% 0% 0%)' }}
      exit={reduce ? { opacity: 0 } : { clipPath: 'inset(50% 0% 50% 0%)', transition: { duration: 0.36, ease: CUT } }}
      transition={{ duration: 0.46, ease: CUT }}
      onPointerLeave={() => lean(null)}
    >
      {sides.map(({ side, p, clip, size, off }) => {
        const loaded = audio.id === p.id
        const playing = loaded && audio.playing
        const failed = audio.failed.has(p.id)
        const win = picked === side
        const lose = picked && !win
        const hidden = blind && !picked
        return (
          <motion.div
            key={side}
            className={`oa-half oa-half--${side} ${playing ? 'is-playing' : ''} ${focus === side ? 'is-focus' : ''} ${win ? 'is-win' : ''} ${lose ? 'is-lose' : ''}`}
            style={{ clipPath: clip, [narrow ? 'y' : 'x']: off }}
            onPointerEnter={e => { if (e.pointerType !== 'touch') lean(side) }}
          >
            <motion.div className="oa-photo" style={{ [narrow ? 'height' : 'width']: size, opacity: photoOpacity }}>
              {hidden
                ? <span className="oa-blind" aria-hidden>{side === 'left' ? 'A' : 'B'}</span>
                : <motion.img src={p.photo} alt="" draggable={false} style={{ objectPosition: p.pos || '50% 50%', scale: photoScale }} />}
            </motion.div>
            <button
              type="button"
              className="oa-hit"
              onClick={() => { onFocus(side); if (!picked) audio.toggle(p) }}
              aria-label={playing ? `Mettre en pause ${hidden ? 'cette piste' : p.title}` : `Écouter ${hidden ? 'cette piste' : p.title}`}
              disabled={phase === 'enter'}
            />
            <motion.div
              className="oa-info"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: lose ? 0 : phase === 'enter' ? 0 : 1, y: phase === 'enter' ? 14 : 0 }}
              transition={{ duration: 0.55, ease: EASE, delay: phase === 'open' && !picked ? (side === 'left' ? 0.05 : 0.14) : 0 }}
            >
              {win && <p className="oa-kept">{isFinal ? 'Championne' : 'Qualifiée'}</p>}
              <p className="oa-anime">{hidden ? (side === 'left' ? 'Piste A' : 'Piste B') : p.anime}</p>
              <h2 className={`oa-title ${!hidden && p.title.length > 24 ? 'is-long' : ''}`}>{hidden ? 'À l’aveugle' : p.title}</h2>
              {!hidden && <p className="oa-artist">{p.artist}</p>}
              {failed && <p className="oa-fail">YouTube bloque la lecture de cette piste ici.</p>}
              {picked && community && <Rate stat={community.get(p.id)} />}
              {!picked && (
                <div className="oa-ctrl">
                  <button type="button" className="oa-listen" onClick={() => { onFocus(side); audio.toggle(p) }} disabled={failed || phase === 'enter'} aria-pressed={playing}>
                    {playing ? <PauseIcon /> : <PlayIcon />}
                    <span>{playing ? 'Pause' : loaded && audio.loading ? 'Chargement…' : loaded ? 'Reprendre' : 'Écouter'}</span>
                  </button>
                  <button type="button" className="oa-keep" onClick={() => keep(side)} disabled={phase === 'enter'}>Garder</button>
                </div>
              )}
              <Progress audio={audio} active={loaded} />
            </motion.div>
          </motion.div>
        )
      })}

      <svg className="oa-seam" aria-hidden>
        <motion.line
          x1={narrow ? '0%' : lineA} y1={narrow ? lineA : '0%'}
          x2={narrow ? '100%' : lineB} y2={narrow ? lineB : '100%'}
          style={{ pathLength: line, opacity: picked ? 0 : lineOpacity }}
        />
      </svg>

      <motion.div className="oa-card" style={{ opacity: cardOpacity }} aria-hidden>
        <p>{roundName(round.size)}</p>
        <b>{isFinal ? 'Le dernier duel' : `${match.position + 1}`}</b>
      </motion.div>
    </motion.div>
  )
})

function PlayIcon() { return <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden><path d="M7 4.5v15l12-7.5z" fill="currentColor" /></svg> }
function PauseIcon() { return <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden><path d="M6.5 4.5h4v15h-4zM13.5 4.5h4v15h-4z" fill="currentColor" /></svg> }

// Barre de lecture : sa propre boucle, active seulement pendant la lecture.
function Progress({ audio, active }) {
  const barRef = useRef(null)
  const timeRef = useRef(null)
  const playing = active && audio.playing
  const { getTime } = audio
  useEffect(() => {
    if (!active) return
    let raf = 0
    const paint = () => {
      const t = getTime()
      if (t && barRef.current) {
        barRef.current.style.transform = `scaleX(${t.total ? Math.min(1, t.now / t.total) : 0})`
        if (timeRef.current) timeRef.current.textContent = t.total ? `${fmtTime(t.now)} / ${fmtTime(t.total)}` : ''
      }
      if (playing) raf = requestAnimationFrame(paint)
    }
    paint()
    return () => cancelAnimationFrame(raf)
  }, [active, playing, getTime])
  return (
    <div className={`oa-prog ${active ? 'is-on' : ''}`} aria-hidden>
      <span className="oa-prog-track"><i ref={barRef} /></span>
      <span className="oa-prog-time" ref={timeRef} />
    </div>
  )
}

function Rate({ stat }) {
  const rate = winRate(stat)
  return (
    <motion.p className="oa-rate" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
      {rate == null ? 'Pas encore assez de duels joués' : `Gagne ${rate} % de ses duels sur le site`}
    </motion.p>
  )
}

// ── Écran de départ ────────────────────────────────────────────────────────
function Setup({ onStart }) {
  const reduce = useReducedMotion()
  const all = CONFIG.participants
  const groups = useMemo(() => {
    const m = new Map()
    for (const p of all) m.set(p.series, (m.get(p.series) || 0) + 1)
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [all])
  const [off, setOff] = useState(() => new Set())
  const pool = all.filter(p => !off.has(p.series))
  const fits = CONFIG.formats.filter(f => f <= pool.length)
  const [size, setSize] = useState(CONFIG.defaultFormat)
  const effective = fits.includes(size) ? size : fits[fits.length - 1]
  const [blind, setBlind] = useState(false)
  const toggle = g => setOff(prev => { const n = new Set(prev); n.has(g) ? n.delete(g) : n.add(g); return n })

  // Une photo par anime, en lamelles coupées dans le même biais que les duels.
  const strips = useRef(sample(groups.map(([g]) => sample(all.filter(p => p.series === g), 1)[0]), 7)).current

  return (
    <motion.div
      className="oa-setup"
      initial={{ opacity: 1 }}
      exit={reduce ? { opacity: 0 } : { clipPath: 'inset(50% 0% 50% 0%)', transition: { duration: 0.4, ease: CUT } }}
    >
      <div className="oa-strips" aria-hidden>
        {strips.map((p, i) => (
          <motion.div key={p.id} className="oa-strip-img"
            style={{ '--i': i, '--n': strips.length }}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: i % 2 ? 40 : -40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.08 * i }}>
            <img src={p.photo} alt="" style={{ objectPosition: p.pos || '50% 50%' }} />
          </motion.div>
        ))}
      </div>

      <div className="oa-setup-box">
        <Link to="/tournoi" className="oa-back">← Tournois</Link>
        <motion.h1 initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE, delay: 0.25 }}>
          Tournoi des OST
        </motion.h1>
        <p className="oa-lead">
          {all.length} thèmes d’anime, sans les images : seulement le son. Tu écoutes les deux,
          tu gardes ta préférée, jusqu’à la dernière.
        </p>

        <div className="oa-field">
          <h2>Nombre de pistes</h2>
          <div className="oa-formats">
            {CONFIG.formats.map(f => (
              <button key={f} type="button" disabled={f > pool.length} className={effective === f ? 'is-on' : ''} onClick={() => setSize(f)} aria-pressed={effective === f}>
                <b>{f}</b>
                <small>{f - 1} duels</small>
              </button>
            ))}
          </div>
        </div>

        <div className="oa-field">
          <h2>
            Animes <small>{pool.length} pistes retenues</small>
            {off.size > 0 && <button type="button" className="oa-link" onClick={() => setOff(new Set())}>Tout reprendre</button>}
          </h2>
          <div className="oa-chips">
            {groups.map(([g, n]) => (
              <button key={g} type="button" className={off.has(g) ? '' : 'is-on'} onClick={() => toggle(g)} aria-pressed={!off.has(g)}>
                {g} <small>{n}</small>
              </button>
            ))}
          </div>
        </div>

        <label className="oa-toggle">
          <input type="checkbox" checked={blind} onChange={e => setBlind(e.target.checked)} />
          <span className="oa-toggle-ui" aria-hidden />
          <span><b>À l’aveugle</b><small>Photo, titre et anime restent cachés jusqu’à ton choix.</small></span>
        </label>

        <button type="button" className="oa-go" disabled={!effective} onClick={() => onStart(effective, pool, blind)}>
          Lancer le tournoi{effective ? ` en ${effective} pistes` : ''}
        </button>
        <p className="oa-note">Le son démarre au premier duel. Pistes tirées au hasard à chaque partie.</p>
      </div>
    </motion.div>
  )
}

// ── Fin de tour ────────────────────────────────────────────────────────────
function Recap({ recap, onClose }) {
  const dense = recap.qualified.length > 16
  return (
    <motion.div className="oa-recap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
      <div className="oa-recap-box">
        <p className="oa-recap-k">{roundName(recap.size)} terminés</p>
        <h2>{recap.qualified.length} pistes passent en {nextRoundPhrase(recap.size) === 'la finale' ? 'finale' : nextRoundPhrase(recap.size).replace(/^les /, '')}</h2>
        <div className={`oa-recap-grid ${dense ? 'is-dense' : ''}`}>
          {recap.qualified.map((p, i) => (
            <motion.figure key={p.id}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: EASE, delay: 0.1 + Math.min(i * (dense ? 0.01 : 0.04), 0.6) }}>
              <img src={p.img} alt="" loading="lazy" style={{ objectPosition: p.pos || '50% 50%' }} />
              <figcaption><b>{p.title}</b>{!dense && <small>{p.anime}</small>}</figcaption>
            </motion.figure>
          ))}
        </div>
        <button type="button" className="oa-go" onClick={onClose} autoFocus>Continuer vers {nextRoundPhrase(recap.size)}</button>
      </div>
    </motion.div>
  )
}

// ── Champion ───────────────────────────────────────────────────────────────
function Champion({ rounds, audio, onRestart, onUndo, onBracket }) {
  const ranking = useMemo(() => topRanking(rounds), [rounds])
  const [champ, ...rest] = ranking
  const p = champ.p
  const playing = audio.id === p.id && audio.playing
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)
  const [board, setBoard] = useState(null)

  useEffect(() => {
    let on = true
    fetchStats(STATS_ID, { fresh: true }).then(m => {
      if (!on || !m) return
      const byId = new Map(CONFIG.participants.map(x => [x.id, x]))
      setBoard([...m.entries()]
        .map(([id, s]) => ({ p: byId.get(id), s, rate: winRate(s) }))
        .filter(r => r.p && r.rate != null)
        .sort((a, b) => b.rate - a.rate || b.s.duels - a.s.duels)
        .slice(0, 10))
    })
    return () => { on = false }
  }, [])

  const share = async () => {
    const lines = [`Mon top ${CONFIG.title} sur Brams Community :`, ...ranking.slice(0, 4).map((r, i) => `${i + 1}. ${r.p.title} (${r.p.anime})`), `${window.location.origin}${CONFIG.route}`]
    try { await navigator.clipboard.writeText(lines.join('\n')); setCopied(true); setTimeout(() => setCopied(false), 1800) } catch {}
  }
  const download = async () => {
    setSaving(true)
    try {
      const blob = await makeShareImage({ title: CONFIG.title, ranking: ranking.map(r => ({ ...r, p: { ...r.p, img: r.p.photo, subtitle: r.p.anime } })), url: `${window.location.origin}${CONFIG.route}` })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = 'top-ost.png'
      a.click()
      setTimeout(() => URL.revokeObjectURL(a.href), 4000)
    } finally { setSaving(false) }
  }

  return (
    <motion.div className="oa-champ" initial={{ clipPath: 'inset(50% 0% 50% 0%)' }} animate={{ clipPath: 'inset(0% 0% 0% 0%)' }} exit={{ opacity: 0 }} transition={{ duration: 0.6, ease: CUT }}>
      <div className="oa-champ-hero">
        <motion.img src={p.photo} alt="" style={{ objectPosition: p.pos || '50% 50%' }} initial={{ scale: 1.08 }} animate={{ scale: 1 }} transition={{ duration: 1.6, ease: EASE }} />
        <div className="oa-champ-txt">
          <Link to="/tournoi" className="oa-back">← Tournois</Link>
          <p className="oa-kept">Ta préférée sur {rounds[0].size} pistes</p>
          <p className="oa-anime">{p.anime}</p>
          <h1 className={`oa-title ${p.title.length > 24 ? 'is-long' : ''}`}>{p.title}</h1>
          <p className="oa-artist">{p.artist}</p>
          <div className="oa-ctrl">
            <button type="button" className="oa-listen" onClick={() => audio.toggle(p)} aria-pressed={playing}>
              {playing ? <PauseIcon /> : <PlayIcon />}<span>{playing ? 'Pause' : 'Réécouter'}</span>
            </button>
            <button type="button" className="oa-keep" onClick={onRestart}>Nouvelle partie</button>
          </div>
          <Progress audio={audio} active={audio.id === p.id} />
        </div>
      </div>

      <div className="oa-champ-body">
        <div className="oa-rank">
          <h2>Ton classement</h2>
          <ol>
            {rest.map(r => (
              <li key={r.p.id}>
                <span className="oa-rank-n">{r.rank === 5 ? '5–8' : r.rank === 3 ? '3–4' : r.rank}</span>
                <img src={r.p.img} alt="" loading="lazy" style={{ objectPosition: r.p.pos || '50% 50%' }} />
                <span className="oa-rank-t"><b>{r.p.title}</b><small>{r.p.anime}</small></span>
                <button type="button" onClick={() => audio.toggle(r.p)} aria-label={`Écouter ${r.p.title}`}>
                  {audio.id === r.p.id && audio.playing ? <PauseIcon /> : <PlayIcon />}
                </button>
              </li>
            ))}
          </ol>
        </div>

        {board && board.length >= 3 && (
          <div className="oa-rank">
            <h2>Le classement du site</h2>
            <ol>
              {board.map((r, i) => (
                <li key={r.p.id}>
                  <span className="oa-rank-n">{i + 1}</span>
                  <img src={r.p.img} alt="" loading="lazy" style={{ objectPosition: r.p.pos || '50% 50%' }} />
                  <span className="oa-rank-t"><b>{r.p.title}</b><small>{r.rate} % de victoires sur {r.s.duels} duels</small></span>
                </li>
              ))}
            </ol>
          </div>
        )}

        <div className="oa-champ-actions">
          {onUndo && <button type="button" onClick={onUndo}>Rejouer la finale</button>}
          <button type="button" onClick={onBracket}>Voir le tableau</button>
          <button type="button" onClick={share}>{copied ? 'Top copié' : 'Copier mon top'}</button>
          <button type="button" onClick={download} disabled={saving}>{saving ? 'Image en cours…' : 'Télécharger l’image'}</button>
        </div>
      </div>
    </motion.div>
  )
}
