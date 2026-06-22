// src/features/nouveau-monde/game/GameShell.jsx
// Socle commun de tous les jeux embarqués dans Le Nouveau Monde.
// - Topbar : ← retour à l'île, prime ฿ du joueur (ELO serveur), ⚙ Paramètres.
// - Slot central : le jeu (children).
// - Panneau latéral : leaderboard « Avis de Recherche » du jeu (drawer sur mobile).
// - SettingsDrawer générique piloté par le schéma du jeu, persisté via useGameSettings.
// - Fournit les réglages au jeu via contexte → useGameShell() (le board lit en live).
//
// Aucune logique dupliquée entre Échecs et Dames : shell + settings + leaderboard mutualisés.

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { nm } from '../theme/tokens'
import { islandById } from '../data/islands'
import { getLeaderboard, getGlobalBounty } from '../data/api'
import { useGameSettings } from '../hooks/useGameSettings'
import { schemaFor, defaultsFor } from './schemas'
import SettingsDrawer from './SettingsDrawer'
import { supabase } from '../../../lib/supabase'

const ShellCtx = createContext(null)
// Le board appelle ceci pour lire/écrire ses réglages en live.
export function useGameShell() {
  return useContext(ShellCtx) || { settings: {}, set: () => {}, jeu: null }
}

function formatBounty(n) {
  if (n == null) return '—'
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)} M฿`
  if (n >= 1e3) return `${Math.round(n / 1e3)} k฿`
  return `${n} ฿`
}

function Leaderboard({ jeu, accent }) {
  const [rows, setRows] = useState(null)
  useEffect(() => {
    let alive = true
    getLeaderboard(jeu, 'all').then((r) => { if (alive) setRows(r?.rows || r || []) }, () => alive && setRows([]))
    return () => { alive = false }
  }, [jeu])
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ ...nm.type.posterTitle, fontSize: '1rem', color: nm.color.foam, padding: `${nm.space.md} ${nm.space.md} ${nm.space.sm}` }}>📜 Avis de Recherche</div>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: `0 ${nm.space.sm} ${nm.space.md}` }}>
        {rows == null && <div style={{ ...nm.type.small, color: nm.color.foamDim, padding: nm.space.md }}>Chargement…</div>}
        {rows && rows.length === 0 && <div style={{ ...nm.type.small, color: nm.color.foamDim, padding: nm.space.md }}>Aucune prime encore. Sois le premier. 🏴‍☠️</div>}
        {rows && rows.map((r, i) => (
          <div key={r.user_id || i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: nm.radius.sm, background: i < 3 ? `${accent}14` : 'transparent', borderBottom: `1px solid ${nm.color.mist}` }}>
            <span style={{ ...nm.type.small, fontWeight: 800, color: i === 0 ? nm.color.goldHi : nm.color.foamDim, width: 22 }}>{r.rang || i + 1}</span>
            <span style={{ ...nm.type.small, color: nm.color.foam, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.username || 'Pirate'}</span>
            <span style={{ ...nm.type.small, fontWeight: 700, color: nm.color.goldHi }}>{formatBounty(r.bounty)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function GameShell({ jeu, children }) {
  const navigate = useNavigate()
  const isl = islandById(jeu)
  const accent = isl?.accent || nm.color.gold
  const schema = useMemo(() => schemaFor(jeu), [jeu])
  const defaults = useMemo(() => defaultsFor(jeu), [jeu])
  const { settings, set, reset } = useGameSettings(jeu, defaults)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false) // mobile
  const [bounty, setBounty] = useState(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const uid = session?.user?.id
        if (!uid) return
        const r = await getGlobalBounty(uid)
        if (alive) setBounty(r?.bounty ?? null)
      } catch { /* non connecté */ }
    })()
    return () => { alive = false }
  }, [])

  const ctx = useMemo(() => ({ settings, set, jeu }), [settings, set, jeu])

  return (
    <ShellCtx.Provider value={ctx}>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Topbar */}
        <div style={{
          flexShrink: 0, display: 'flex', alignItems: 'center', gap: nm.space.sm,
          padding: `8px ${nm.space.lg}`, background: 'rgba(6,20,31,0.62)', backdropFilter: 'blur(10px)',
          borderBottom: `1px solid ${nm.color.mist}`, zIndex: 3,
        }}>
          <button type="button" onClick={() => navigate(`/nouveau-monde/${jeu}`)}
            style={{ ...nm.type.button, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: nm.radius.pill, color: nm.color.foam, background: 'rgba(6,20,31,0.6)', border: `1px solid ${accent}55` }}>
            ← {isl?.title || 'Le Nouveau Monde'}
          </button>
          <span style={{ ...nm.type.eyebrow, color: nm.color.foamDim }}>{isl?.tagline}</span>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: nm.space.sm }}>
            <span title="Ta prime" style={{ ...nm.type.bounty, fontSize: '0.95rem', color: nm.color.goldHi, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: nm.radius.pill, background: 'rgba(6,20,31,0.6)', border: `1px solid ${nm.color.gold}44` }}>
              ฿ {formatBounty(bounty).replace('฿', '').trim()}
            </span>
            <button type="button" aria-label="Avis de Recherche" onClick={() => setPanelOpen((v) => !v)}
              style={{ cursor: 'pointer', color: nm.color.foam, background: 'rgba(6,20,31,0.6)', border: `1px solid ${nm.color.mist}`, borderRadius: '50%', width: 36, height: 36, fontSize: 16, display: 'none' }}
              className="gs-mobile-only">📜</button>
            <button type="button" aria-label="Paramètres" onClick={() => setDrawerOpen(true)}
              style={{ cursor: 'pointer', color: nm.color.foam, background: 'rgba(6,20,31,0.6)', border: `1px solid ${nm.color.mist}`, borderRadius: '50%', width: 36, height: 36, fontSize: 16 }}>⚙</button>
          </div>
        </div>

        {/* Corps : jeu + panneau latéral */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
          <div style={{ flex: 1, minWidth: 0, overflow: 'auto', position: 'relative', background: nm.color.abyss }}>
            {children}
          </div>
          <aside className="gs-side" style={{ width: 280, flexShrink: 0, borderLeft: `1px solid ${nm.color.mist}`, background: 'rgba(6,20,31,0.5)', display: 'flex', flexDirection: 'column' }}>
            <Leaderboard jeu={jeu} accent={accent} />
          </aside>
        </div>
      </div>

      <SettingsDrawer
        open={drawerOpen} onClose={() => setDrawerOpen(false)}
        title={`Paramètres · ${isl?.title || ''}`}
        schema={schema} value={settings} onChange={set} onReset={reset}
      />

      {/* Panneau leaderboard en drawer sur mobile (le <aside> latéral est masqué <900px). */}
      <style>{`
        @media (max-width: 900px) {
          .gs-side { display: none !important; }
          .gs-mobile-only { display: inline-flex !important; }
        }
      `}</style>
      {panelOpen && (
        <div onClick={() => setPanelOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: nm.z.toast, background: 'rgba(3,10,18,0.55)' }}>
          <aside onClick={(e) => e.stopPropagation()} style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(320px,90vw)', background: `linear-gradient(180deg, ${nm.color.deepSea}, ${nm.color.abyss})`, borderLeft: `1px solid ${accent}44`, display: 'flex', flexDirection: 'column' }}>
            <Leaderboard jeu={jeu} accent={accent} />
          </aside>
        </div>
      )}
    </ShellCtx.Provider>
  )
}
