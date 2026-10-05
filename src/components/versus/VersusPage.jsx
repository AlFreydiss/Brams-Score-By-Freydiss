import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { VERSUS_CONFIGS } from '../../data/versus-data.js'
import {
  generateBracket, advanceWinner, getCurrentMatch, getWinner,
  loadState, saveState, resetTournament,
} from '../../lib/tournament.js'
import BleachRadio from './BleachRadio.jsx'
import './versus.css'

// Tournoi 1v1 en images (Bankai de Bleach, panels de manga cultes).
// Clic sur une carte ou flèches ← → pour choisir ; Retour annule le dernier choix.

const RED = '#e5322d'
const BLUE = '#2f6dff'

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

// Position du match courant parmi les vrais duels du tour (les exempts ne comptent pas).
function roundProgress(round, match) {
  const real = round.matches.filter(m => m.left && m.right || m.status !== 'closed')
  const playable = real.length ? real : round.matches
  const idx = playable.findIndex(m => m.id === match.id)
  return { n: idx + 1, total: playable.length }
}

function roundName(size) {
  if (size === 2) return 'Finale'
  if (size === 4) return 'Demi-finales'
  if (size === 8) return 'Quarts de finale'
  return `Tour de ${size}`
}

export default function VersusPage({ kind }) {
  const config = VERSUS_CONFIGS[kind]
  const storeId = `${config.id}-${config.version}`
  const narrow = useIsNarrow()

  const [rounds, setRounds] = useState(() => {
    const saved = loadState(storeId)
    return Array.isArray(saved) && saved.length ? saved : generateBracket(config.participants, storeId).rounds
  })
  const [history, setHistory] = useState([])
  const [picked, setPicked] = useState(null)   // 'left' | 'right' pendant l'animation
  const [zoom, setZoom] = useState(null)

  useEffect(() => { saveState(storeId, rounds) }, [storeId, rounds])
  useEffect(() => { document.title = `${config.title} — Tournoi · Brams Community` }, [config.title])

  const current = useMemo(() => getCurrentMatch(rounds), [rounds])
  const winner = useMemo(() => getWinner(rounds), [rounds])

  const choose = useCallback(side => {
    if (!current || picked) return
    const { match } = current
    const p = side === 'left' ? match.left : match.right
    if (!p) return
    setPicked(side)
    setTimeout(() => {
      setHistory(h => [...h.slice(-40), rounds])
      setRounds(r => advanceWinner(r, match.id, p.id))
      setPicked(null)
    }, 520)
  }, [current, picked, rounds])

  const undo = useCallback(() => {
    if (!history.length || picked) return
    setRounds(history[history.length - 1])
    setHistory(h => h.slice(0, -1))
  }, [history, picked])

  const restart = () => {
    resetTournament(storeId)
    setHistory([])
    setRounds(generateBracket(config.participants, storeId).rounds)
  }

  useEffect(() => {
    const onKey = e => {
      if (e.target.closest?.('input, textarea')) return
      if (zoom) { if (e.key === 'Escape') setZoom(null); return }
      if (e.key === 'ArrowLeft') choose('left')
      else if (e.key === 'ArrowRight') choose('right')
      else if (e.key === 'Backspace') { e.preventDefault(); undo() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [choose, undo, zoom])

  const prog = current ? roundProgress(current.round, current.match) : null

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
            {prog && (
              <div className="vs-pill">
                <span>{roundName(current.round.size)}</span>
                <i />
                <span><b>{prog.n}</b>/{prog.total}</span>
              </div>
            )}
          </header>

          {current && (
            <AnimatePresence mode="wait">
              <motion.div
                key={current.match.id}
                className="vs-arena"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.28, ease: [0.2, 0.7, 0.2, 1] }}
              >
                <DuelCard side="left" color={RED} p={current.match.left} fit={config.fit} picked={picked} onPick={choose} onZoom={setZoom} />
                <div className="vs-mark" aria-hidden>
                  <span style={{ color: RED }}>V</span><span style={{ color: BLUE }}>S</span>
                </div>
                <DuelCard side="right" color={BLUE} p={current.match.right} fit={config.fit} picked={picked} onPick={choose} onZoom={setZoom} />
              </motion.div>
            </AnimatePresence>
          )}

          {current && (
            <div className="vs-help">
              <span><kbd>←</kbd> <kbd>→</kbd> pour choisir</span>
              <button type="button" onClick={undo} disabled={!history.length}>↶ Annuler</button>
              <button type="button" onClick={restart}>Recommencer</button>
            </div>
          )}

          {winner && <Champion winner={winner} rounds={rounds} config={config} onRestart={restart} onUndo={history.length ? undo : null} />}
        </main>
      </div>

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

function DuelCard({ side, color, p, fit, picked, onPick, onZoom }) {
  if (!p) return <div className="vs-card is-empty" style={{ '--c': color }} />
  const state = picked ? (picked === side ? 'is-win' : 'is-lose') : ''
  return (
    <motion.div
      className={`vs-card vs-card--${side} ${state}`}
      style={{ '--c': color }}
      animate={picked === side ? { scale: [1, 1.035, 1.02] } : picked ? { opacity: 0.25, scale: 0.97 } : { opacity: 1, scale: 1 }}
      transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
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

function Champion({ winner, rounds, config, onRestart, onUndo }) {
  const final = rounds[rounds.length - 1].matches[0]
  const runnerUp = final.left?.id === winner.id ? final.right : final.left
  const semis = (rounds[rounds.length - 2]?.matches || [])
    .map(m => (m.left?.id === m.winnerId ? m.right : m.left))
    .filter(Boolean)
  return (
    <motion.div className="vs-champ" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <p className="vs-champ-k">Ton champion</p>
      <div className="vs-champ-card">
        <img src={winner.img} alt={winner.title} />
      </div>
      <h2>{winner.title}</h2>
      <p className="vs-champ-sub">{winner.subtitle}</p>
      <div className="vs-podium">
        {runnerUp && <PodiumItem label="Finaliste" p={runnerUp} />}
        {semis.map(s => <PodiumItem key={s.id} label="Demi-finale" p={s} />)}
      </div>
      <div className="vs-help">
        {onUndo && <button type="button" onClick={onUndo}>↶ Revoir la finale</button>}
        <button type="button" className="is-main" onClick={onRestart}>Rejouer {config.title}</button>
      </div>
    </motion.div>
  )
}

function PodiumItem({ label, p }) {
  return (
    <figure className="vs-pod">
      <img src={p.img} alt={p.title} loading="lazy" />
      <figcaption><small>{label}</small>{p.title}</figcaption>
    </figure>
  )
}
