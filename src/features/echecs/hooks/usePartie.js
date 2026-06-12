// ── usePartie : état chess.js partagé par tous les modes ────────────────────
// Source de vérité des règles : chess.js v1 (roque, en passant, promotion,
// mat, pat, répétition, 50 coups, matériel insuffisant).
import { useRef, useState, useCallback, useMemo } from 'react'
import { Chess } from 'chess.js'
import { VALEURS_PIECES } from '../constants.js'

// Statut de fin → { terminee, resultat: 'blanc'|'noir'|'nulle'|null, cause }
function statutDePartie(chess) {
  if (chess.isCheckmate()) {
    // le camp AU TRAIT est maté → l'autre gagne
    return { terminee: true, resultat: chess.turn() === 'w' ? 'noir' : 'blanc', cause: 'mat' }
  }
  if (chess.isStalemate())            return { terminee: true, resultat: 'nulle', cause: 'pat' }
  if (chess.isThreefoldRepetition())  return { terminee: true, resultat: 'nulle', cause: 'repetition' }
  if (chess.isInsufficientMaterial()) return { terminee: true, resultat: 'nulle', cause: 'materiel' }
  if (chess.isDraw())                 return { terminee: true, resultat: 'nulle', cause: 'cinquante_coups' }
  return { terminee: false, resultat: null, cause: null }
}

export function usePartie() {
  const chessRef = useRef(null)
  if (!chessRef.current) chessRef.current = new Chess()
  const [, setVersion] = useState(0)
  const bump = useCallback(() => setVersion(v => v + 1), [])

  const chess = chessRef.current
  const fen = chess.fen()

  // Coups légaux depuis une case (verbose → to, captured, promotion…)
  const coupsLegaux = useCallback(square => {
    try { return chessRef.current.moves({ square, verbose: true }) } catch { return [] }
  }, [])

  // Joue un coup ; retourne le move chess.js (ou null si illégal)
  const jouer = useCallback(({ from, to, promotion }) => {
    try {
      const mv = chessRef.current.move({ from, to, promotion })
      bump()
      return mv
    } catch { return null }
  }, [bump])

  // Joue un coup en SAN (réception réseau) — null si illégal (garde-fou)
  const jouerSan = useCallback(san => {
    try {
      const mv = chessRef.current.move(san)
      bump()
      return mv
    } catch { return null }
  }, [bump])

  const annuler = useCallback((demiCoups = 1) => {
    for (let i = 0; i < demiCoups; i++) chessRef.current.undo()
    bump()
  }, [bump])

  const reinitialiser = useCallback(() => { chessRef.current = new Chess(); bump() }, [bump])

  const chargerPgn = useCallback(pgn => {
    try {
      const c = new Chess()
      if (pgn) c.loadPgn(pgn)
      chessRef.current = c
      bump()
      return true
    } catch { return false }
  }, [bump])

  const historique = useMemo(() => chess.history({ verbose: true }), [fen]) // eslint-disable-line react-hooks/exhaustive-deps

  // Pièces capturées par chaque camp + avantage matériel
  const captures = useMemo(() => {
    const parBlanc = [], parNoir = []
    let scoreBlanc = 0, scoreNoir = 0
    for (const mv of historique) {
      if (!mv.captured) continue
      if (mv.color === 'w') { parBlanc.push(mv.captured); scoreBlanc += VALEURS_PIECES[mv.captured] || 0 }
      else                  { parNoir.push(mv.captured);  scoreNoir += VALEURS_PIECES[mv.captured] || 0 }
    }
    return { parBlanc, parNoir, avantage: scoreBlanc - scoreNoir } // >0 : blanc devant
  }, [historique])

  const dernierCoup = historique.length ? historique[historique.length - 1] : null

  // Case du roi au trait (surbrillance échec)
  const caseRoiEnEchec = useMemo(() => {
    if (!chess.isCheck()) return null
    const couleur = chess.turn()
    for (const ligne of chess.board()) {
      for (const c of ligne) {
        if (c && c.type === 'k' && c.color === couleur) return c.square
      }
    }
    return null
  }, [fen]) // eslint-disable-line react-hooks/exhaustive-deps

  const fin = useMemo(() => statutDePartie(chess), [fen]) // eslint-disable-line react-hooks/exhaustive-deps

  const api = {
    chess, fen,
    trait: chess.turn(),                 // 'w' | 'b'
    enEchec: chess.isCheck(),
    caseRoiEnEchec,
    dernierCoup,                         // { from, to, san, captured, flags... }
    historique,
    captures,
    fin,                                 // { terminee, resultat, cause }
    pgn: () => chessRef.current.pgn(),
    coupsLegaux, jouer, jouerSan, annuler, reinitialiser, chargerPgn,
  }
  // hook de test (Playwright) : uniquement en dev, jamais en prod
  if (import.meta.env.DEV && typeof window !== 'undefined') window.__echecsPartie = api
  return api
}
