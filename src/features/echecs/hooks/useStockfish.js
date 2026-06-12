// ── useStockfish : worker Stockfish 18 lite-single + protocole UCI ───────────
// Build mono-thread sans COOP/COEP (ne casse rien d'autre sur le site).
// chercherCoup(fen) → Promise<{ from, to, promotion }>.
import { useRef, useEffect, useCallback, useState } from 'react'

const CHEMIN_WORKER = '/stockfish/stockfish-18-lite-single.js'
const DELAI_MIN_REPONSE_MS = 300   // rythme naturel même si le moteur répond instantanément

export function useStockfish(niveau) {
  const workerRef = useRef(null)
  const pretRef = useRef(false)      // uciok + readyok reçus
  const resolveRef = useRef(null)    // résolution de la recherche en cours
  const [pret, setPret] = useState(false)
  const [reflechit, setReflechit] = useState(false)
  const niveauRef = useRef(niveau)

  // Envoie les options UCI du niveau courant
  const appliquerNiveau = useCallback(nv => {
    const w = workerRef.current
    if (!w || !nv) return
    if (nv.limitStrength) {
      w.postMessage('setoption name UCI_LimitStrength value true')
      w.postMessage(`setoption name UCI_Elo value ${nv.elo}`)
    } else {
      w.postMessage('setoption name UCI_LimitStrength value false')
      w.postMessage(`setoption name Skill Level value ${nv.skillLevel ?? 20}`)
    }
  }, [])

  useEffect(() => {
    let detruit = false
    let w
    try {
      w = new Worker(CHEMIN_WORKER)
    } catch (e) {
      console.error('[echecs] worker stockfish introuvable', e)
      return undefined
    }
    workerRef.current = w

    w.onmessage = e => {
      const ligne = typeof e.data === 'string' ? e.data : ''
      if (ligne === 'uciok') { w.postMessage('isready'); return }
      if (ligne === 'readyok') {
        if (!pretRef.current) {
          pretRef.current = true
          appliquerNiveau(niveauRef.current)
          w.postMessage('ucinewgame')
          if (!detruit) setPret(true)
        }
        return
      }
      if (ligne.startsWith('bestmove')) {
        const coup = ligne.split(' ')[1]
        const resolve = resolveRef.current
        resolveRef.current = null
        if (!detruit) setReflechit(false)
        if (resolve && coup && coup !== '(none)') {
          resolve({ from: coup.slice(0, 2), to: coup.slice(2, 4), promotion: coup[4] || undefined })
        } else if (resolve) resolve(null)
      }
    }
    w.onerror = err => {
      console.error('[echecs] erreur worker stockfish', err?.message || err)
      const resolve = resolveRef.current
      resolveRef.current = null
      if (resolve) resolve(null)   // le mode IA basculera sur un coup légal aléatoire
    }
    w.postMessage('uci')

    return () => {
      detruit = true
      try { w.postMessage('quit') } catch {}
      try { w.terminate() } catch {}
      workerRef.current = null
      pretRef.current = false
    }
  }, [appliquerNiveau])

  // Changement de niveau en cours de session
  useEffect(() => {
    niveauRef.current = niveau
    if (pretRef.current) {
      appliquerNiveau(niveau)
      workerRef.current?.postMessage('ucinewgame')
    }
  }, [niveau, appliquerNiveau])

  const nouvellePartie = useCallback(() => {
    workerRef.current?.postMessage('ucinewgame')
  }, [])

  // Lance la recherche sur la position donnée ; rejette silencieusement vers null
  const chercherCoup = useCallback(fen => {
    const w = workerRef.current
    const nv = niveauRef.current
    if (!w || !pretRef.current) return Promise.resolve(null)
    setReflechit(true)
    const t0 = performance.now()
    return new Promise(resolve => {
      resolveRef.current = coup => {
        const restant = DELAI_MIN_REPONSE_MS - (performance.now() - t0)
        if (restant > 0) setTimeout(() => resolve(coup), restant)
        else resolve(coup)
      }
      w.postMessage(`position fen ${fen}`)
      w.postMessage(`go movetime ${nv?.movetimeMs ?? 600}`)
    })
  }, [])

  return { pret, reflechit, chercherCoup, nouvellePartie }
}
