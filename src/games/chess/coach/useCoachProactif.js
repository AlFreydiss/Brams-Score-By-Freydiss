// ── useCoachProactif : le coach PROACTIF en jeu (vs IA) ──────────────────────
// Après chaque coup HUMAIN, classe le coup (badge transitoire) en comparant la
// proba de gain AVANT/APRÈS (même logique que l'analyse post-partie : cpVersWin +
// SEUIL). Sur une gaffe, on laisse l'appelant déclencher une explication coach.
//
// Convention : `analyser(fen,{movetime})` renvoie le score du camp AU TRAIT
// (scoreCp/mate/bestMove/pv). On normalise tout en cp côté BLANC puis on convertit
// vers le point de vue du joueur — strictement comme analyzeGame.js.
import { useRef, useState, useCallback, useEffect } from 'react'
import { Chess } from 'chess.js'
import { cpVersWin, SEUIL } from '../analysis/analyzeGame.js'
import { cc } from '../ui/chesscom.js'

const VALEUR = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 }

// Score brut analyser() (vu du camp au trait) → cp côté BLANC (mat = ±1000 borné).
function cpCoteBlanc(res, traitAuTrait) {
  if (!res) return null
  if (res.mate != null) { const v = res.mate > 0 ? 1000 : -1000; return traitAuTrait === 'w' ? v : -v }
  if (res.scoreCp == null) return null
  return traitAuTrait === 'w' ? res.scoreCp : -res.scoreCp
}

function materielCote(chess, couleur) {
  let s = 0
  for (const ligne of chess.board()) for (const c of ligne) if (c && c.color === couleur) s += VALEUR[c.type] || 0
  return s
}

// Sacrifice gagnant : le joueur cède ≥ 2 pts de matériel (après la meilleure reprise
// adverse simulée) tout en gardant une position nettement gagnante.
function estSacrificeGagnant(fenAvant, fenApres, pvApres, joueur, winApres) {
  if (winApres < 60) return false
  try {
    const matAvant = materielCote(new Chess(fenAvant), joueur)
    const cApres = new Chess(fenApres)
    const rep = pvApres?.[0]
    if (rep) { try { cApres.move({ from: rep.slice(0, 2), to: rep.slice(2, 4), promotion: rep[4] || undefined }) } catch {} }
    return (matAvant - materielCote(cApres, joueur)) >= 2
  } catch { return false }
}

const COULEURS = {
  Brillant:    cc.greenHi,   // vert clair
  Excellent:   cc.green,     // vert chess.com
  Imprécision: '#E8A93B',    // ambre
  Gaffe:       cc.danger,    // rouge chess.com
}

export function useCoachProactif({ analyser }) {
  const [badge, setBadge] = useState(null)   // { id, label, couleur, icon } | null
  const avantRef = useRef(null)              // { fen, res } éval du POV joueur (cache eval-bar)
  const idRef = useRef(0)
  const timerRef = useRef(null)
  const aliveRef = useRef(true)

  useEffect(() => () => { aliveRef.current = false; if (timerRef.current) clearTimeout(timerRef.current) }, [])

  // Mémorise l'éval de la position quand c'est au joueur de jouer (appelé par l'eval-bar).
  const memoriserAvant = useCallback((fen, res) => { if (res) avantRef.current = { fen, res } }, [])

  const montrerBadge = useCallback((label) => {
    const couleur = COULEURS[label]
    const icon = { Brillant: '!!', Excellent: '!', Imprécision: '?!', Gaffe: '??' }[label]
    const id = ++idRef.current
    if (timerRef.current) clearTimeout(timerRef.current)
    setBadge({ id, label, couleur, icon })
    timerRef.current = setTimeout(() => { if (aliveRef.current) setBadge(b => (b && b.id === id ? null : b)) }, 2600)
  }, [])

  // Évalue un coup HUMAIN ; pose le badge et, sur gaffe, appelle onGaffe(ctx) (LLM).
  // ctx onGaffe : { fenAvant, joueur, resAvant, san }.
  const evaluerCoup = useCallback(async ({ fenAvant, fenApres, traitApres, joueur, mv, onGaffe }) => {
    try {
      let resAvant = (avantRef.current && avantRef.current.fen === fenAvant) ? avantRef.current.res : null
      avantRef.current = null
      if (!resAvant) resAvant = await analyser(fenAvant, { movetime: 320 })
      const resApres = await analyser(fenApres, { movetime: 450 })
      const cpAvant = cpCoteBlanc(resAvant, joueur)        // fenAvant : trait = joueur
      const cpApres = cpCoteBlanc(resApres, traitApres)    // fenApres : trait = adversaire
      if (cpAvant == null || cpApres == null) return
      const winAvant = cpVersWin(joueur === 'w' ? cpAvant : -cpAvant)
      const winApres = cpVersWin(joueur === 'w' ? cpApres : -cpApres)
      const perte = Math.max(0, winAvant - winApres)

      let label = null
      if (perte >= SEUIL.blunder) label = 'Gaffe'
      else if (perte >= SEUIL.imprecision) label = 'Imprécision'
      else if (perte <= SEUIL.excellent) {
        const meilleur = resAvant?.bestMove && mv && (mv.from + mv.to + (mv.promotion || '')) === resAvant.bestMove
        if (estSacrificeGagnant(fenAvant, fenApres, resApres?.pv, joueur, winApres)) label = 'Brillant'
        else if (meilleur || perte <= SEUIL.excellent) label = 'Excellent'
      }
      // « Bon » (perte moyenne) → pas de badge, pour rester sobre.

      if (label && aliveRef.current) montrerBadge(label)
      if (label === 'Gaffe' && typeof onGaffe === 'function') {
        onGaffe({ fenAvant, joueur, resAvant, san: mv?.san || null })
      }
    } catch { /* moteur indispo / position fermée : on n'affiche rien */ }
  }, [analyser, montrerBadge])

  const reset = useCallback(() => {
    avantRef.current = null
    if (timerRef.current) clearTimeout(timerRef.current)
    setBadge(null)
  }, [])

  return { badge, memoriserAvant, evaluerCoup, reset }
}
