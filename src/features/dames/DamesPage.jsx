// ── Page Jeu de Dames — étape 2 : pass-and-play local (2 joueurs même écran) ──
// Branché sur le moteur vérifié. vs IA + multi en ligne arrivent ensuite.
import { useState, useCallback, useMemo } from 'react'
import DamesBoard from './DamesBoard.jsx'
import { getInitialBoard, applyMove, getOutcome, materialCount, DEFAULT_RULESET } from '../../lib/dames/damesEngine.js'

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
  const outcome = useMemo(() => getOutcome(board, turn, ruleset), [board, turn, ruleset])
  const mat = useMemo(() => materialCount(board), [board])

  const onMove = useCallback((move) => {
    setBoard((b) => applyMove(b, move))
    setLastMove(move)
    setTurn((t) => (t === 'red' ? 'black' : 'red'))
  }, [])

  const reset = () => { setBoard(getInitialBoard(ruleset)); setTurn('red'); setLastMove(null) }

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
          : <span><span style={{ color: SIDE[turn].color }}>{SIDE[turn].icon} {SIDE[turn].label}</span> — à toi de jouer</span>}
      </div>

      <DamesBoard board={board} turn={turn} ruleset={ruleset} onMove={onMove} lastMove={lastMove} disabled={!!outcome} />

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
        Mode local (2 joueurs, même écran). <strong style={{ color: 'rgba(243,234,216,.6)' }}>vs IA</strong> et <strong style={{ color: 'rgba(243,234,216,.6)' }}>multijoueur en ligne classé (primes One Piece)</strong> arrivent bientôt. 🏴‍☠️
      </p>
    </div>
  )
}
