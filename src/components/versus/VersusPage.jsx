import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { VERSUS_CONFIGS } from '../../data/versus-data.js'
import { generateBracket, advanceWinner, getCurrentMatch, getWinner, getTournamentProgress } from '../../lib/tournament.js'
import BleachRadio from './BleachRadio.jsx'
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

  const choose = useCallback(side => {
    if (!current || picked || recap) return
    const { match, round } = current
    const p = side === 'left' ? match.left : match.right
    if (!p) return
    setPicked(side)
    setTimeout(() => {
      const next = advanceWinner(rounds, match.id, p.id)
      setHistory(h => [...h.slice(-60), rounds])
      setRun(r => ({ ...r, rounds: next }))
      setPicked(null)
      // Fin de tour (hors finale) : récap des qualifiés.
      const doneRound = next.find(r => r.id === round.id)
      const roundOver = doneRound.matches.every(m => m.status === 'closed')
      if (roundOver && round.size > 2) {
        setRecap({ size: round.size, qualified: doneRound.matches.map(winnerOf).filter(Boolean) })
      }
    }, 480)
  }, [current, picked, recap, rounds])

  const undo = useCallback(() => {
    if (!history.length || picked) return
    setRecap(null)
    setRun(r => ({ ...r, rounds: history[history.length - 1] }))
    setHistory(h => h.slice(0, -1))
  }, [history, picked])

  const quit = () => { setRun(null); setHistory([]); setRecap(null) }

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

  const realMatches = current ? current.round.matches.filter(m => m.left && m.right) : []
  const matchIdx = current ? realMatches.findIndex(m => m.id === current.match.id) + 1 : 0

  return (
    <div className="vs-page">
      <div className="vs-dots" aria-hidden />
      <div className="vs-shell">
        <BleachRadio compact={narrow} />

        <main className="vs-main">
          <header className="vs-head">
            <Link to="/tournoi" className="vs-back">← Tournois</Link>
            <h1 className="vs-title">{config.title}</h1>
            <p className="vs-kicker">{config.kicker}</p>
            {current && (
              <div className="vs-pill">
                <span>{roundName(current.round.size)}</span>
                <i />
                <span><b>{matchIdx}</b>/{realMatches.length}</span>
              </div>
            )}
          </header>

          {!run && <Setup config={config} onStart={start} />}

          {current && (
            <>
              <div className="vs-progress" aria-label={`Progression ${progress.pct} %`}>
                <span style={{ width: `${progress.pct}%` }} />
              </div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={current.match.id}
                  className="vs-arena"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.26, ease: [0.2, 0.7, 0.2, 1] }}
                >
                  <DuelCard side="left" color={RED} p={current.match.left} fit={config.fit} picked={picked} onPick={choose} onZoom={setZoom} />
                  <div className="vs-mark" aria-hidden>
                    <span style={{ color: RED }}>V</span><span style={{ color: BLUE }}>S</span>
                  </div>
                  <DuelCard side="right" color={BLUE} p={current.match.right} fit={config.fit} picked={picked} onPick={choose} onZoom={setZoom} />
                </motion.div>
              </AnimatePresence>
              <div className="vs-help">
                <span className="vs-keys"><kbd>←</kbd> <kbd>→</kbd> pour choisir · {progress.done}/{progress.total} duels</span>
                <button type="button" onClick={undo} disabled={!history.length}>↶ Annuler</button>
                <button type="button" onClick={quit}>Nouvelle partie</button>
              </div>
            </>
          )}

          {winner && <Champion rounds={rounds} config={config} onRestart={quit} onUndo={history.length ? undo : null} />}
        </main>
      </div>

      <AnimatePresence>
        {recap && <Recap recap={recap} onClose={() => setRecap(null)} />}
      </AnimatePresence>

      <AnimatePresence>
        {zoom && (
          <motion.div className="vs-zoom" onClick={() => setZoom(null)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <img src={zoom.img} alt={zoom.title} />
            <p>{zoom.title} <small>{zoom.subtitle}</small></p>
          </motion.div>
        )}
      </AnimatePresence>
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
function DuelCard({ side, color, p, fit, picked, onPick, onZoom }) {
  if (!p) return <div className="vs-card is-empty" style={{ '--c': color }} />
  const state = picked ? (picked === side ? 'is-win' : 'is-lose') : ''
  return (
    <motion.div
      className={`vs-card vs-card--${side} ${state}`}
      style={{ '--c': color }}
      animate={picked === side ? { scale: [1, 1.035, 1.02] } : picked ? { opacity: 0.25, scale: 0.97 } : { opacity: 1, scale: 1 }}
      transition={{ duration: 0.42, ease: [0.2, 0.8, 0.2, 1] }}
    >
      <button type="button" className="vs-card-hit" onClick={() => onPick(side)} aria-label={`Choisir ${p.title}`}>
        <img src={p.img} alt={p.title} style={{ objectFit: fit }} draggable={false} />
      </button>
      <button type="button" className="vs-zoom-btn" onClick={() => onZoom(p)} aria-label="Agrandir">⤢</button>
      <div className="vs-tag">
        <b>{p.title}</b>
        <small>{p.subtitle}</small>
      </div>
    </motion.div>
  )
}

// ── Récap de fin de tour ───────────────────────────────────────────────────
function Recap({ recap, onClose }) {
  const nextName = roundName(recap.size / 2)
  return (
    <motion.div className="vs-recap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="vs-recap-box" initial={{ y: 24, scale: 0.98 }} animate={{ y: 0, scale: 1 }} transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }} onClick={e => e.stopPropagation()}>
        <p className="vs-recap-k">{roundName(recap.size)} terminé</p>
        <h2>Qualifiés pour {nextName === 'Finale' ? 'la finale' : `les ${nextName.toLowerCase()}`}</h2>
        <div className={`vs-recap-grid ${recap.qualified.length > 16 ? 'is-dense' : ''}`}>
          {recap.qualified.map((p, i) => (
            <motion.figure key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.025, 0.8) }}>
              <img src={p.img} alt={p.title} loading="lazy" />
              {recap.qualified.length <= 16 && <figcaption>{p.title}</figcaption>}
            </motion.figure>
          ))}
        </div>
        <button type="button" className="vs-go" onClick={onClose}>Continuer · {nextName}</button>
      </motion.div>
    </motion.div>
  )
}

// ── Champion ───────────────────────────────────────────────────────────────
function Champion({ rounds, config, onRestart, onUndo }) {
  const ranking = topRanking(rounds)
  const [champ, ...rest] = ranking
  const [copied, setCopied] = useState(false)
  const share = async () => {
    const lines = [`Mon top ${config.title} sur Brams Community :`, ...ranking.slice(0, 4).map((r, i) => `${i + 1}. ${r.p.title} (${r.p.subtitle})`), `${window.location.origin}${config.route}`]
    try { await navigator.clipboard.writeText(lines.join('\n')); setCopied(true); setTimeout(() => setCopied(false), 1800) } catch {}
  }
  return (
    <motion.div className="vs-champ" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <p className="vs-champ-k">Ton champion</p>
      <motion.div className="vs-champ-card" initial={{ scale: 0.92 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }}>
        <img src={champ.p.img} alt={champ.p.title} />
      </motion.div>
      <h2>{champ.p.title}</h2>
      <p className="vs-champ-sub">{champ.p.subtitle}</p>
      <div className="vs-podium">
        {rest.map(r => (
          <figure key={r.p.id} className="vs-pod">
            <span className="vs-pod-rank">{RANK[r.label]}</span>
            <img src={r.p.img} alt={r.p.title} loading="lazy" />
            <figcaption><small>{r.label}</small>{r.p.title}</figcaption>
          </figure>
        ))}
      </div>
      <div className="vs-help">
        {onUndo && <button type="button" onClick={onUndo}>↶ Revoir la finale</button>}
        <button type="button" onClick={share}>{copied ? '✓ Copié' : 'Copier mon top'}</button>
        <button type="button" className="is-main" onClick={onRestart}>Nouvelle partie</button>
      </div>
    </motion.div>
  )
}
