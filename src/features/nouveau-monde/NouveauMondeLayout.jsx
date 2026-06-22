// src/features/nouveau-monde/NouveauMondeLayout.jsx
// Shell plein écran du hub « Le Nouveau Monde ».
// - Fond ciel dynamique (skyForHour selon l'heure réelle).
// - Nav persistante (Carte / Avis de Recherche / Mon Log Pose / Le Journal) avec
//   transitions framer-motion SANS reload (AnimatePresence sur l'<Outlet/>).
// - Log Pose (boussole) en coin.
// - Enveloppé par TeleportProvider (téléport réutilisable partout dans le hub).
//
// Routes nested (câblées par l'orchestrateur dans App.jsx) :
//   index = Carte · classements · profil · news · :jeu

import { useEffect, useMemo, useState } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { nm, skyForHour, FONT_HREF } from './theme/tokens'
import { TeleportProvider } from './transition/TeleportTransition'

const TABS = [
  { to: '/nouveau-monde',              label: 'Carte',            end: true,  glyph: '🧭' },
  { to: '/nouveau-monde/classements',  label: 'Avis de Recherche', end: false, glyph: '📜' },
  { to: '/nouveau-monde/profil',       label: 'Mon Log Pose',      end: false, glyph: '🧮' },
  { to: '/nouveau-monde/news',         label: 'Le Journal',        end: false, glyph: '📰' },
]

// Charge Cinzel une seule fois (Bricolage/Inter déjà fournis par la marque).
function useFont() {
  useEffect(() => {
    if (document.querySelector(`link[href="${FONT_HREF}"]`)) return
    const l = document.createElement('link')
    l.rel = 'stylesheet'; l.href = FONT_HREF
    document.head.appendChild(l)
  }, [])
}

function LogPoseCompass({ hour }) {
  // Aiguille qui dérive doucement — repère décoratif "boussole vivante".
  return (
    <motion.div
      animate={{ rotate: [0, 6, -4, 0] }}
      transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      style={{
        position: 'relative', width: 46, height: 46, borderRadius: '50%',
        background: `radial-gradient(circle at 35% 30%, ${nm.color.parchment}, ${nm.color.parchmentDim})`,
        border: `2px solid ${nm.color.goldDeep}`,
        boxShadow: nm.shadow.goldGlow, display: 'grid', placeItems: 'center', flexShrink: 0,
      }}
      title="Log Pose"
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
        style={{
          width: 4, height: 30, borderRadius: 2,
          background: `linear-gradient(${nm.color.danger} 0 50%, ${nm.color.foam} 50% 100%)`,
        }}
      />
    </motion.div>
  )
}

export default function NouveauMondeLayout() {
  useFont()
  const location = useLocation()
  const [hour, setHour] = useState(() => new Date().getHours())

  // Réévalue le ciel chaque ~5 min (le crépuscule bouge avec l'heure réelle).
  useEffect(() => {
    const t = setInterval(() => setHour(new Date().getHours()), 5 * 60 * 1000)
    return () => clearInterval(t)
  }, [])

  const [top, bottom] = useMemo(() => skyForHour(hour), [hour])

  return (
    <TeleportProvider>
      <div style={{
        position: 'fixed', inset: 0, overflow: 'hidden',
        fontFamily: nm.fonts.body, color: nm.color.foam,
        background: `linear-gradient(180deg, ${top} 0%, ${bottom} 100%)`,
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Voile de brume haut pour asseoir la nav */}
        <div aria-hidden style={{
          position: 'absolute', insetInline: 0, top: 0, height: 160,
          background: `linear-gradient(180deg, rgba(6,20,31,0.55), transparent)`,
          zIndex: nm.z.fog, pointerEvents: 'none',
        }} />

        {/* ── NAV persistante ─────────────────────────────────────────────── */}
        <header style={{
          position: 'relative', zIndex: nm.z.nav,
          display: 'flex', alignItems: 'center', gap: nm.space.md,
          padding: `${nm.space.md} ${nm.space.lg}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: nm.space.sm, marginRight: 'auto' }}>
            <LogPoseCompass hour={hour} />
            <div style={{ lineHeight: 1 }}>
              <div style={{ ...nm.type.eyebrow, color: nm.color.goldHi }}>Hub Arcade Brams</div>
              <div style={{ fontFamily: nm.fonts.display, fontWeight: 800, fontSize: '1.15rem', letterSpacing: '-0.02em' }}>
                Le Nouveau Monde
              </div>
            </div>
          </div>

          <nav style={{
            display: 'flex', gap: 4, padding: 5, borderRadius: nm.radius.pill,
            background: 'rgba(6,20,31,0.55)', border: `1px solid ${nm.color.mist}`,
            backdropFilter: 'blur(10px)',
          }}>
            {TABS.map((t) => (
              <NavLink key={t.to} to={t.to} end={t.end} style={{ textDecoration: 'none' }}>
                {({ isActive }) => (
                  <span style={{
                    position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 8,
                    padding: '9px 16px', minHeight: 24, borderRadius: nm.radius.pill,
                    ...nm.type.button,
                    color: isActive ? nm.color.abyss : nm.color.foam,
                    transition: 'color .25s',
                  }}>
                    {isActive && (
                      <motion.span
                        layoutId="nm-tab-active"
                        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                        style={{
                          position: 'absolute', inset: 0, borderRadius: nm.radius.pill,
                          background: `linear-gradient(135deg, ${nm.color.goldHi}, ${nm.color.gold})`,
                          boxShadow: nm.shadow.goldGlow, zIndex: -1,
                        }}
                      />
                    )}
                    <span aria-hidden style={{ fontSize: '0.95em', opacity: isActive ? 1 : 0.8 }}>{t.glyph}</span>
                    <span>{t.label}</span>
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
        </header>

        {/* ── Contenu : transition framer-motion par route, SANS reload ────── */}
        <main style={{ position: 'relative', flex: 1, minHeight: 0, zIndex: nm.z.ui }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: nm.motion.base, ease: nm.motion.easeOut }}
              style={{ position: 'absolute', inset: 0 }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </TeleportProvider>
  )
}
