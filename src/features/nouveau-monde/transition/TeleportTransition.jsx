// src/features/nouveau-monde/transition/TeleportTransition.jsx
// Effet « téléportation marine » : brume marine envahit l'écran → flash d'écume →
// l'océan se révèle en plongeant vers l'île ciblée. < 1,4 s, SKIPPABLE (clic / Échap).
//
// Exporte :
//   <TeleportProvider> ............ enveloppe le hub (et le site si réutilisé ailleurs)
//   useTeleport() → { teleport(islandId, onArrive), teleporting, targetId }
//
// Réutilisable depuis n'importe quelle carte de jeu du site : appeler
// const { teleport } = useTeleport(); teleport('echecs', () => navigate('/echecs')).

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { nm } from '../theme/tokens'
import { islandById } from '../data/islands'

const TeleportCtx = createContext(null)

export function useTeleport() {
  const ctx = useContext(TeleportCtx)
  if (!ctx) {
    // Hors provider : dégradation propre (navigation directe, pas de crash).
    return {
      teleporting: false,
      targetId: null,
      teleport: (_id, onArrive) => { onArrive?.() },
    }
  }
  return ctx
}

const DUR = nm.motion.teleportMs / 1000

export function TeleportProvider({ children }) {
  const [active, setActive] = useState(false)
  const [targetId, setTargetId] = useState(null)
  const arriveRef = useRef(null)
  const doneRef = useRef(false)

  const finish = useCallback(() => {
    if (doneRef.current) return
    doneRef.current = true
    const cb = arriveRef.current
    arriveRef.current = null
    setActive(false)
    setTargetId(null)
    // Laisse l'overlay finir son fondu avant de naviguer (évite le flash blanc).
    requestAnimationFrame(() => cb?.())
  }, [])

  const teleport = useCallback((islandId, onArrive) => {
    if (active) return
    doneRef.current = false
    arriveRef.current = onArrive
    setTargetId(islandId)
    setActive(true)
  }, [active])

  // Auto-fin après la durée nominale (le onAnimationComplete est un filet de sécu).
  useEffect(() => {
    if (!active) return
    const t = setTimeout(finish, nm.motion.teleportMs + 60)
    const onKey = (e) => { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') finish() }
    window.addEventListener('keydown', onKey)
    return () => { clearTimeout(t); window.removeEventListener('keydown', onKey) }
  }, [active, finish])

  const isl = targetId ? islandById(targetId) : null
  const accent = isl?.accent || nm.color.gold

  return (
    <TeleportCtx.Provider value={{ teleport, teleporting: active, targetId }}>
      {children}
      <AnimatePresence>
        {active && (
          <motion.div
            key="teleport"
            onClick={finish}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            style={{
              position: 'fixed', inset: 0, zIndex: nm.z.teleport,
              cursor: 'pointer', overflow: 'hidden',
              background: `radial-gradient(120% 100% at 50% 120%, ${nm.color.deepSea} 0%, ${nm.color.abyss} 60%, #02080d 100%)`,
            }}
          >
            {/* Brume marine qui envahit depuis le bas */}
            <motion.div
              initial={{ y: '60%', opacity: 0 }}
              animate={{ y: '-10%', opacity: 1 }}
              transition={{ duration: DUR * 0.55, ease: nm.motion.easeOut }}
              style={{
                position: 'absolute', inset: '-30% -10% 0 -10%',
                background: `radial-gradient(60% 50% at 50% 100%, ${nm.color.shallow}66 0%, transparent 70%)`,
                filter: 'blur(40px)',
              }}
            />
            {/* Nappe de brume tournoyante */}
            <motion.div
              initial={{ scale: 1.4, opacity: 0, rotate: -6 }}
              animate={{ scale: 1, opacity: 0.9, rotate: 0 }}
              transition={{ duration: DUR * 0.6, ease: nm.motion.easeInOut }}
              style={{
                position: 'absolute', inset: 0,
                background: `radial-gradient(closest-side at 50% 55%, rgba(234,243,244,0.18), transparent 70%)`,
                mixBlendMode: 'screen',
              }}
            />
            {/* Flash d'écume au milieu de la séquence */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0, 0.85, 0] }}
              transition={{ duration: DUR, times: [0, 0.42, 0.5, 0.62], ease: 'easeOut' }}
              style={{ position: 'absolute', inset: 0, background: nm.color.foam }}
            />
            {/* Anneau de téléport qui plonge vers la cible (accent de l'île) */}
            <motion.div
              initial={{ scale: 0.2, opacity: 0 }}
              animate={{ scale: [0.2, 1.1, 3.4], opacity: [0, 0.9, 0] }}
              transition={{ duration: DUR * 0.9, ease: nm.motion.easeOut }}
              style={{
                position: 'absolute', left: '50%', top: '52%',
                width: 360, height: 360, marginLeft: -180, marginTop: -180,
                borderRadius: '50%',
                border: `2px solid ${accent}`,
                boxShadow: `0 0 60px -6px ${accent}, inset 0 0 80px -20px ${accent}`,
              }}
            />
            {/* Centre : nom de l'île qui se révèle */}
            <motion.div
              initial={{ opacity: 0, y: 14, filter: 'blur(8px)' }}
              animate={{ opacity: [0, 1, 1, 0], y: 0, filter: 'blur(0px)' }}
              transition={{ duration: DUR, times: [0.2, 0.45, 0.8, 1], ease: nm.motion.easeOut }}
              onAnimationComplete={finish}
              style={{
                position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
                textAlign: 'center', padding: nm.space.lg, pointerEvents: 'none',
              }}
            >
              <div>
                <div style={{ ...nm.type.eyebrow, color: nm.color.foamDim, marginBottom: nm.space.sm }}>
                  Téléportation
                </div>
                <div style={{ ...nm.type.hero, color: nm.color.foam, textShadow: `0 0 40px ${accent}aa` }}>
                  {isl?.title || 'Le Nouveau Monde'}
                </div>
                <div style={{ ...nm.type.small, color: nm.color.foamDim, marginTop: nm.space.sm }}>
                  {isl?.tagline || 'Trace ta route'} · clique pour passer
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </TeleportCtx.Provider>
  )
}

export default TeleportProvider
