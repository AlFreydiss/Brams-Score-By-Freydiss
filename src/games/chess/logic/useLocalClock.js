// ── useLocalClock : pendules locales (vs IA / 2 joueurs) ────────────────────
// Vérité = compte à rebours local sur le camp au trait, avec incrément Fischer.
// IMPORTANT (perf) : on N'EXPOSE PAS le temps qui défile dans le state du board.
// L'horloge qui s'affiche (Clock.jsx) s'abonne via `souscrire(cb)` et se met à
// jour seule ; PlayTab ne re-render pas à chaque tic. On ne « bump » React que
// sur les transitions discrètes (changement de trait, drapeau).
import { useRef, useCallback, useEffect, useState } from 'react'

const TIC_MS = 100

// cadence : { baseMs, incrementMs }. enTrait : 'w' | 'b'. actif : bool.
export function useLocalClock(cadence) {
  const illimite = !cadence || cadence.baseMs == null
  const stateRef = useRef({
    w: illimite ? Infinity : cadence.baseMs,
    b: illimite ? Infinity : cadence.baseMs,
    trait: 'w',
    actif: false,
    dernierTs: 0,
  })
  const subsRef = useRef(new Set())
  const [drapeau, setDrapeau] = useState(null)   // 'w' | 'b' | null (camp qui tombe)
  const drapeauRef = useRef(null)

  const lire = useCallback(() => {
    const s = stateRef.current
    if (illimite || !s.actif || s.dernierTs === 0) return { w: s.w, b: s.b }
    const ecoule = performance.now() - s.dernierTs
    const w = s.trait === 'w' ? Math.max(0, s.w - ecoule) : s.w
    const b = s.trait === 'b' ? Math.max(0, s.b - ecoule) : s.b
    return { w, b }
  }, [illimite])

  const souscrire = useCallback((cb) => {
    subsRef.current.add(cb)
    return () => subsRef.current.delete(cb)
  }, [])

  // boucle d'horloge : notifie les abonnés + détecte le drapeau (sans toucher PlayTab)
  useEffect(() => {
    if (illimite) return undefined
    const id = setInterval(() => {
      const s = stateRef.current
      if (!s.actif || s.dernierTs === 0) return
      const { w, b } = lire()
      for (const cb of subsRef.current) cb({ w, b, trait: s.trait, actif: s.actif })
      const tombe = w <= 0 ? 'w' : (b <= 0 ? 'b' : null)
      if (tombe && drapeauRef.current !== tombe) {
        drapeauRef.current = tombe
        setDrapeau(tombe)   // seule transition qui re-render PlayTab
      }
    }, TIC_MS)
    return () => clearInterval(id)
  }, [illimite, lire])

  // applique le temps écoulé au camp sortant, ajoute l'incrément, passe au suivant
  const basculer = useCallback((nouveauTrait) => {
    const s = stateRef.current
    if (illimite) { s.trait = nouveauTrait; return }
    if (s.actif && s.dernierTs !== 0) {
      const ecoule = performance.now() - s.dernierTs
      s[s.trait] = Math.max(0, s[s.trait] - ecoule + (cadence.incrementMs || 0))
    }
    s.trait = nouveauTrait
    s.dernierTs = performance.now()
  }, [illimite, cadence])

  const demarrer = useCallback((trait = 'w') => {
    const s = stateRef.current
    s.trait = trait
    s.actif = true
    s.dernierTs = performance.now()
  }, [])

  const stopper = useCallback(() => {
    const s = stateRef.current
    if (s.actif && s.dernierTs !== 0 && !illimite) {
      const ecoule = performance.now() - s.dernierTs
      s[s.trait] = Math.max(0, s[s.trait] - ecoule)
    }
    s.actif = false
    s.dernierTs = 0
  }, [illimite])

  const reinitialiser = useCallback(() => {
    stateRef.current = {
      w: illimite ? Infinity : cadence.baseMs,
      b: illimite ? Infinity : cadence.baseMs,
      trait: 'w', actif: false, dernierTs: 0,
    }
    drapeauRef.current = null
    setDrapeau(null)
    for (const cb of subsRef.current) cb({ w: stateRef.current.w, b: stateRef.current.b, trait: 'w', actif: false })
  }, [illimite, cadence])

  return { illimite, lire, souscrire, basculer, demarrer, stopper, reinitialiser, drapeau }
}
