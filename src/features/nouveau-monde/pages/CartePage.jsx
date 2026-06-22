// src/features/nouveau-monde/pages/CartePage.jsx
// Page Carte : charge OceanScene 3D en Suspense (lazy → hors bundle initial).
// Détecte mobile / low-perf → OceanFallback. Toggle « Performance » manuel.
// Récupère la prime du #1 de chaque île (getIslandLeader) pour les labels.
// Clic île → téléportation puis navigate(island.route).

import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ISLANDS } from '../data/islands'
import { getLeaderboard } from '../data/api'
import { useTeleport } from '../transition/TeleportTransition'
import OceanFallback from '../scene/OceanFallback'
import { nm } from '../theme/tokens'

// LAZY : le bundle R3F/postprocessing ne charge que sur desktop perf-ok.
const OceanScene = lazy(() => import('../scene/OceanScene'))

function detectLowPerf() {
  if (typeof navigator === 'undefined') return true
  const coarse = window.matchMedia?.('(pointer: coarse)')?.matches
  const narrow = window.innerWidth < 820
  const fewCores = (navigator.hardwareConcurrency || 4) <= 4
  const lowMem = (navigator.deviceMemory || 4) <= 4
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
  return Boolean(reduce || (coarse && narrow) || (narrow && (fewCores || lowMem)))
}

function useLeaders() {
  const [leaders, setLeaders] = useState({})
  useEffect(() => {
    let alive = true
    ;(async () => {
      const live = ISLANDS.filter((i) => i.status === 'live')
      const entries = await Promise.all(
        live.map(async (isl) => {
          const board = await getLeaderboard(isl.ratingKey, 'week')
          return [isl.ratingKey, board?.[0]?.bounty ?? null]
        })
      )
      if (alive) setLeaders(Object.fromEntries(entries))
    })()
    return () => { alive = false }
  }, [])
  return leaders
}

export default function CartePage() {
  const navigate = useNavigate()
  const { teleport } = useTeleport()
  const leaders = useLeaders()
  const [perfMode, setPerfMode] = useState(() => (detectLowPerf() ? 'lite' : 'full'))

  const onSelect = (island) => {
    if (!island?.route) return
    teleport(island.id, () => navigate(island.route))
  }

  const liteScene = (
    <OceanFallback hour={new Date().getHours()} leaders={leaders} onSelect={onSelect} />
  )

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {perfMode === 'full' ? (
        <Suspense fallback={liteScene}>
          <OceanScene hour={new Date().getHours()} leaders={leaders} onSelect={onSelect} />
        </Suspense>
      ) : (
        liteScene
      )}

      {/* Hero overlay (par-dessus l'océan, sous la nav) */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6, ease: nm.motion.easeOut }}
        style={{
          position: 'absolute', left: nm.space.xl, bottom: nm.space.xl,
          maxWidth: 460, pointerEvents: 'none', zIndex: nm.z.ui,
        }}
      >
        <div style={{ ...nm.type.eyebrow, color: nm.color.goldHi }}>Carte maritime · {ISLANDS.filter(i => i.status === 'live').length} îles ouvertes</div>
        <h1 style={{ ...nm.type.hero, color: nm.color.foam, margin: '8px 0 10px', textShadow: '0 8px 40px rgba(2,8,13,0.8)' }}>
          Trace ta route.
        </h1>
        <p style={{ ...nm.type.body, color: nm.color.foamDim, margin: 0 }}>
          Chaque île est un jeu. Accoste, joue, fais grimper ta prime ฿ et deviens
          l'Empereur du Nouveau Monde.
        </p>
      </motion.div>

      {/* Toggle Performance */}
      <button
        type="button"
        onClick={() => setPerfMode((m) => (m === 'full' ? 'lite' : 'full'))}
        style={{
          position: 'absolute', right: nm.space.lg, bottom: nm.space.lg, zIndex: nm.z.ui,
          ...nm.type.small, cursor: 'pointer', minHeight: 36,
          padding: '8px 14px', borderRadius: nm.radius.pill,
          background: 'rgba(6,20,31,0.6)', backdropFilter: 'blur(8px)',
          border: `1px solid ${nm.color.mist}`, color: nm.color.foamDim,
        }}
        title="Basculer le rendu"
      >
        {perfMode === 'full' ? '🌊 Rendu 3D' : '⚡ Mode Performance'}
      </button>
    </div>
  )
}
