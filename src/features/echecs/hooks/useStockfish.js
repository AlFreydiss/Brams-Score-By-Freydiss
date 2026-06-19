// ── useStockfish : worker Stockfish 18 lite-single + protocole UCI ───────────
// Build mono-thread sans COOP/COEP (ne casse rien d'autre sur le site).
// chercherCoup(fen) → Promise<{ from, to, promotion }>.
// analyser(fen) → Promise<{ scoreCp, mate, bestMove (uci), pv }> sur un SECOND
// worker dédié pour ne jamais voler le bestmove du worker « adversaire ».
import { useRef, useEffect, useCallback, useState } from 'react'

const CHEMIN_WORKER = '/stockfish/stockfish-18-lite-single.js'
const DELAI_MIN_REPONSE_MS = 300   // rythme naturel même si le moteur répond instantanément

// Parse une ligne UCI « info ... score cp 34 ... pv e2e4 e7e5 ... »
function parseInfo(ligne) {
  if (!ligne.startsWith('info') || ligne.indexOf(' score ') === -1) return null
  const tk = ligne.split(/\s+/)
  let scoreCp = null, mate = null, pv = null
  for (let i = 0; i < tk.length; i++) {
    if (tk[i] === 'score') {
      if (tk[i + 1] === 'cp') scoreCp = parseInt(tk[i + 2], 10)
      else if (tk[i + 1] === 'mate') mate = parseInt(tk[i + 2], 10)
    } else if (tk[i] === 'pv') {
      pv = tk.slice(i + 1)
      break
    }
  }
  if (scoreCp === null && mate === null) return null
  return { scoreCp, mate, pv }
}

export function useStockfish(niveau) {
  const workerRef = useRef(null)
  const pretRef = useRef(false)      // uciok + readyok reçus
  const resolveRef = useRef(null)    // résolution de la recherche en cours
  const [pret, setPret] = useState(false)
  const [reflechit, setReflechit] = useState(false)
  const niveauRef = useRef(niveau)

  // ── Second worker dédié à l'analyse (eval bar / indice) ──
  // Isolé du worker adversaire : son bestmove n'interfère jamais avec un coup IA.
  const evalRef = useRef(null)
  const evalPretRef = useRef(false)
  const evalResolveRef = useRef(null)
  const evalDernierInfoRef = useRef(null)   // dernière ligne info (score/pv) reçue

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

    // ── Second worker : moteur d'analyse (pleine force, indépendant du niveau) ──
    let we
    try {
      we = new Worker(CHEMIN_WORKER)
      evalRef.current = we
      we.onmessage = ev => {
        const l = typeof ev.data === 'string' ? ev.data : ''
        if (l === 'uciok') { we.postMessage('isready'); return }
        if (l === 'readyok') {
          if (!evalPretRef.current) {
            evalPretRef.current = true
            we.postMessage('ucinewgame')
          }
          return
        }
        const info = parseInfo(l)
        if (info) { evalDernierInfoRef.current = info; return }
        if (l.startsWith('bestmove')) {
          const coup = l.split(' ')[1]
          const resolve = evalResolveRef.current
          evalResolveRef.current = null
          if (!resolve) return
          const dernier = evalDernierInfoRef.current
          const bm = coup && coup !== '(none)' ? coup : (dernier?.pv?.[0] || null)
          resolve({
            scoreCp: dernier?.scoreCp ?? null,
            mate: dernier?.mate ?? null,
            bestMove: bm,
            pv: dernier?.pv || (bm ? [bm] : []),
          })
        }
      }
      we.onerror = () => {
        const resolve = evalResolveRef.current
        evalResolveRef.current = null
        if (resolve) resolve(null)
      }
      we.postMessage('uci')
    } catch (e) {
      console.warn('[echecs] worker analyse indisponible', e)
      evalRef.current = null
    }

    return () => {
      detruit = true
      try { w.postMessage('quit') } catch {}
      try { w.terminate() } catch {}
      workerRef.current = null
      pretRef.current = false
      try { we?.postMessage('quit') } catch {}
      try { we?.terminate() } catch {}
      evalRef.current = null
      evalPretRef.current = false
      evalResolveRef.current = null
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
    evalRef.current?.postMessage('ucinewgame')
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

  // ── Analyse d'une position (eval bar / indice) sur le worker dédié ──
  // Ne touche jamais resolveRef → aucune interférence avec le coup de l'IA.
  // Le score renvoyé est TOUJOURS du point de vue du camp au trait (convention
  // UCI) ; la normalisation côté blanc se fait dans lib/analyse.js.
  const analyser = useCallback((fen, { depth, movetime } = {}) => {
    const we = evalRef.current
    if (!we || !evalPretRef.current) return Promise.resolve(null)
    // une seule analyse à la fois : on annule la précédente proprement
    if (evalResolveRef.current) {
      const prev = evalResolveRef.current
      evalResolveRef.current = null
      prev(null)
    }
    evalDernierInfoRef.current = null
    return new Promise(resolve => {
      evalResolveRef.current = resolve
      we.postMessage('stop')
      we.postMessage(`position fen ${fen}`)
      if (depth) we.postMessage(`go depth ${depth}`)
      else we.postMessage(`go movetime ${movetime ?? 500}`)
    })
  }, [])

  return { pret, reflechit, chercherCoup, nouvellePartie, analyser }
}
