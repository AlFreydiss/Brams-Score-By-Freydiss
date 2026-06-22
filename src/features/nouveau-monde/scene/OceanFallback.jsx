// src/features/nouveau-monde/scene/OceanFallback.jsx
// Version mobile / low-perf de la carte : grille 2D animée (framer-motion) des îles,
// même esprit DA (parchemin + océan), zéro WebGL. Sert AUSSI de skeleton de chargement.
// Clic île → onSelect(island). Survol → élévation + halo + prime #1.

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { ISLANDS } from '../data/islands'
import { nm, skyForHour } from '../theme/tokens'

function formatBounty(n) {
  if (!n) return null
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)} Md ฿`
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)} M ฿`
  return `${Math.round(n).toLocaleString('fr-FR')} ฿`
}

export default function OceanFallback({ hour = 18, leaders = {}, onSelect }) {
  const [top, bottom] = skyForHour(hour)
  const islands = useMemo(() => ISLANDS, [])

  return (
    <div style={{
      position: 'absolute', inset: 0, overflow: 'hidden',
      background: `linear-gradient(180deg, ${top} 0%, ${nm.color.sea} 42%, ${nm.color.abyss} 100%)`,
    }}>
      {/* Reflets/houle décoratifs */}
      <motion.div
        aria-hidden
        animate={{ backgroundPositionX: ['0px', '60px'] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        style={{
          position: 'absolute', inset: 0, opacity: 0.18,
          backgroundImage: `repeating-linear-gradient(105deg, ${nm.color.foam}22 0 2px, transparent 2px 26px)`,
        }}
      />

      <div style={{
        position: 'relative', height: '100%', display: 'grid', placeItems: 'center',
        padding: nm.space.lg, boxSizing: 'border-box',
      }}>
        <div style={{
          display: 'grid', gap: nm.space.md, width: '100%', maxWidth: 900,
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        }}>
          {islands.map((isl, i) => {
            const live = isl.status === 'live'
            const bounty = leaders?.[isl.ratingKey] ?? null
            return (
              <motion.button
                key={isl.id}
                type="button"
                disabled={!live}
                onClick={() => live && onSelect?.(isl)}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: [0, -4, 0] }}
                transition={{
                  opacity: { delay: i * 0.05, duration: 0.4 },
                  y: { duration: 4 + (i % 3), repeat: Infinity, ease: 'easeInOut', delay: i * 0.1 },
                }}
                whileHover={live ? { y: -8, scale: 1.03 } : {}}
                whileTap={live ? { scale: 0.97 } : {}}
                style={{
                  position: 'relative', textAlign: 'left', cursor: live ? 'pointer' : 'not-allowed',
                  border: `1px solid ${live ? isl.accent + '66' : nm.color.mist}`,
                  borderRadius: nm.radius.lg, padding: nm.space.md,
                  minHeight: 96, // target size confortable (>24px)
                  background: live
                    ? `linear-gradient(160deg, rgba(11,36,54,0.92), rgba(6,20,31,0.96))`
                    : 'rgba(6,20,31,0.6)',
                  boxShadow: live ? nm.shadow.card : 'none',
                  opacity: live ? 1 : 0.55, color: nm.color.foam,
                  display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                }}
              >
                <div style={{
                  position: 'absolute', top: 10, right: 10, width: 10, height: 10, borderRadius: '50%',
                  background: live ? isl.accent : nm.color.foamDim,
                  boxShadow: live ? `0 0 12px ${isl.accent}` : 'none',
                }} />
                <div>
                  <div style={{ ...nm.type.islandName, color: nm.color.foam }}>{isl.title}</div>
                  <div style={{ ...nm.type.small, color: nm.color.foamDim, marginTop: 2 }}>{isl.tagline}</div>
                </div>
                <div style={{ marginTop: nm.space.sm }}>
                  {live && bounty != null ? (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '3px 10px', borderRadius: nm.radius.pill,
                      background: 'rgba(6,20,31,0.7)', border: `1px solid ${isl.accent}55`,
                      fontSize: '0.72rem', fontWeight: 700, color: nm.color.goldHi, letterSpacing: '0.04em',
                    }}>#1 · {formatBounty(bounty)}</span>
                  ) : (
                    <span style={{ ...nm.type.eyebrow, color: nm.color.foamDim }}>{live ? 'Jouable' : 'Bientôt'}</span>
                  )}
                </div>
              </motion.button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
