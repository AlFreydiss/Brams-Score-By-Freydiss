// ── Page Jeu de Dames — étape 2 : pass-and-play local (2 joueurs même écran) ──
// Branché sur le moteur vérifié. vs IA + multi en ligne arrivent ensuite.
import { useState, useCallback, useMemo, useEffect } from 'react'
import DamesBoard from './DamesBoard.jsx'
import { getInitialBoard, applyMove, getOutcome, materialCount, DEFAULT_RULESET } from '../../lib/dames/damesEngine.js'
import { DIFFICULTIES, getBestMove } from '../../lib/dames/damesAI.js'
import { DamesRankCard, DamesLeaderboard } from './DamesLobby.jsx'

const GOLD = '#d4a017'
const SIDE = {
  red: { label: 'Pirates', icon: '🏴‍☠️', color: '#e0524a' },
  black: { label: 'Marine', icon: '⚓', color: '#5b78b0' },
}

export default function DamesPage() {
  const ruleset = DEFAULT_RULESET
  const [board, setBoard] = useState(() => getInitialBoard(ruleset))
  const [turn, setTurn] = useState('red')
  const [lastMove, setLastMove] = useState(null)
  const [mode, setMode] = useState('local')          // 'local' | 'ai'
  const [difficulty, setDifficulty] = useState('pirate')
  const [aiThinking, setAiThinking] = useState(false)
  const outcome = useMemo(() => getOutcome(board, turn, ruleset), [board, turn, ruleset])
  const mat = useMemo(() => materialCount(board), [board])

  const onMove = useCallback((move) => {
    setBoard((b) => applyMove(b, move))
    setLastMove(move)
    setTurn((t) => (t === 'red' ? 'black' : 'red'))
  }, [])

  // Tour de l'IA (Marine = black) en mode vs IA — calcul dans un Web Worker (UI non bloquée).
  useEffect(() => {
    if (mode !== 'ai' || outcome || turn !== 'black') return
    const diff = DIFFICULTIES[difficulty] || DIFFICULTIES.pirate
    let worker = null, cancelled = false
    const apply = (m) => { if (!cancelled && m) { setAiThinking(false); onMove(m) } }
    setAiThinking(true)
    try {
      worker = new Worker(new URL('../../lib/dames/damesAIWorker.js', import.meta.url), { type: 'module' })
      worker.onmessage = (e) => { apply(e.data?.move); try { worker.terminate() } catch {} }
      worker.onerror = () => { if (!cancelled) setAiThinking(false); try { worker.terminate() } catch {} }
      worker.postMessage({ board, color: 'black', depth: diff.depth, ruleset, randomChance: diff.randomChance })
    } catch {
      // Repli thread principal si les Web Workers sont indisponibles
      apply(getBestMove(board, 'black', diff.depth, ruleset, { randomChance: diff.randomChance }))
    }
    return () => { cancelled = true; try { worker?.terminate() } catch {} }
  }, [mode, turn, outcome, board, difficulty, ruleset, onMove])

  const reset = () => { setBoard(getInitialBoard(ruleset)); setTurn('red'); setLastMove(null); setAiThinking(false) }

  const captured = { red: 20 - (mat.red.man + mat.red.king), black: 20 - (mat.black.man + mat.black.king) }

  return (
    <div style={{ minHeight: '100vh', padding: '28px 16px 60px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, color: '#f3ead8' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ margin: 0, fontFamily: "'Bricolage Grotesque', 'Syne', sans-serif", fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: 800, letterSpacing: '-.02em', color: '#fff' }}>
          Dames <span style={{ color: GOLD }}>Brams</span>
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(243,234,216,.55)' }}>
          Dames internationales 10×10 · rafle maximale · dames volantes
        </p>
      </div>

      <DamesRankCard />

      {/* Mode + difficulté */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        {[['local', '👥 Local (2 joueurs)'], ['ai', '🤖 vs IA']].map(([id, lbl]) => (
          <button key={id} onClick={() => { setMode(id); reset() }} style={{
            padding: '7px 16px', borderRadius: 999, cursor: 'pointer', fontWeight: 700, fontSize: 13,
            background: mode === id ? GOLD : 'rgba(255,255,255,.05)', color: mode === id ? '#1a1200' : 'rgba(243,234,216,.7)',
            border: `1px solid ${mode === id ? GOLD : 'rgba(255,255,255,.12)'}`,
          }}>{lbl}</button>
        ))}
      </div>
      {mode === 'ai' && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', marginTop: -8 }}>
          {Object.values(DIFFICULTIES).map((d) => (
            <button key={d.id} onClick={() => { setDifficulty(d.id); reset() }} style={{
              padding: '5px 12px', borderRadius: 999, cursor: 'pointer', fontWeight: 700, fontSize: 12,
              background: difficulty === d.id ? 'rgba(212,160,23,.18)' : 'transparent', color: difficulty === d.id ? GOLD : 'rgba(243,234,216,.5)',
              border: `1px solid ${difficulty === d.id ? GOLD + '88' : 'rgba(255,255,255,.1)'}`,
            }}>{d.label}</button>
          ))}
        </div>
      )}

      {/* Bandeau de tour / résultat */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '9px 20px', borderRadius: 999,
        background: outcome ? `${(outcome === 'draw' ? '#888' : SIDE[outcome].color)}22` : 'rgba(255,255,255,.05)',
        border: `1px solid ${outcome ? (outcome === 'draw' ? '#888' : SIDE[outcome].color) : 'rgba(255,255,255,.1)'}66`,
        fontWeight: 800, fontSize: 15,
      }}>
        {outcome
          ? (outcome === 'draw'
              ? '🤝 Match nul'
              : <span style={{ color: SIDE[outcome].color }}>{SIDE[outcome].icon} {SIDE[outcome].label} {' '}gagnent&nbsp;!</span>)
          : aiThinking
            ? <span style={{ color: SIDE.black.color }}>🤖 L'IA réfléchit…</span>
            : <span><span style={{ color: SIDE[turn].color }}>{SIDE[turn].icon} {SIDE[turn].label}</span> — {mode === 'ai' && turn === 'black' ? "tour de l'IA" : 'à toi de jouer'}</span>}
      </div>

      <DamesBoard board={board} turn={turn} ruleset={ruleset} onMove={onMove} lastMove={lastMove} disabled={!!outcome || aiThinking} myColor={mode === 'ai' ? 'red' : null} />

      {/* Pièces capturées */}
      <div style={{ display: 'flex', gap: 22, fontSize: 13, color: 'rgba(243,234,216,.6)' }}>
        <span>{SIDE.red.icon} Pirates : <strong style={{ color: '#fff' }}>{mat.red.man + mat.red.king}</strong> pièces{mat.red.king ? ` · ${mat.red.king}👑` : ''}</span>
        <span>{SIDE.black.icon} Marine : <strong style={{ color: '#fff' }}>{mat.black.man + mat.black.king}</strong> pièces{mat.black.king ? ` · ${mat.black.king}👑` : ''}</span>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={reset} style={{
          padding: '10px 22px', borderRadius: 10, border: 'none', cursor: 'pointer',
          background: `linear-gradient(135deg, ${GOLD}, #f0c04a)`,
          color: '#1a1200', fontWeight: 800, fontSize: 14,
        }}>↻ Nouvelle partie</button>
      </div>

      <p style={{ fontSize: 12, color: 'rgba(243,234,216,.4)', maxWidth: 460, textAlign: 'center', marginTop: 4 }}>
        Local (2 joueurs) ou <strong style={{ color: 'rgba(243,234,216,.6)' }}>vs IA</strong> (4 difficultés). Le <strong style={{ color: 'rgba(243,234,216,.6)' }}>multijoueur en ligne classé (primes One Piece)</strong> arrive bientôt. 🏴‍☠️
      </p>

      <DamesLeaderboard />
    </div>
  )
}
