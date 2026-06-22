// ── Page Jeu de Dames internationales — NEUTRE premium (2D par défaut) ─────────
// Onglet « Solo & Ami » : Local / vs IA. Onglet « Classé » : matchmaking + parties
// temps réel serveur-autoritaires (ELO). Vue 2D plane par défaut, 3D en option.
import { useState } from 'react'
import DamesGame3D from './DamesGame3D.jsx'
import DamesOnline3D from './DamesOnline3D.jsx'
import BarreJeu from '../../components/BarreJeu.jsx'
import { useGameShell } from '../nouveau-monde/game/GameShell.jsx'
import { ui, fonts } from '../games/neutralTheme.js'

const GOLD = ui.accent

export default function DamesPage() {
  const [tab, setTab] = useState('play')
  // Embarqué dans Le Nouveau Monde : la topbar + le ⚙ du GameShell fournissent déjà
  // le contexte d'île, le retour et les réglages → on retire le double-chrome
  // (BarreJeu + hero) pour garder un plateau épuré (principe directeur du brief).
  const embarque = !!useGameShell().jeu

  return (
    <div style={{ minHeight: embarque ? 0 : '100vh', background: embarque ? 'transparent' : `radial-gradient(1000px 520px at 50% -6%, rgba(200,164,92,0.08), transparent 60%), linear-gradient(180deg,${ui.bgElev},${ui.bg} 60%,#08090c)`, color: ui.text }}>
      {!embarque && <BarreJeu titre="Dames" />}
      <div style={{ padding: embarque ? '12px 16px 24px' : '0 16px 60px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        {!embarque && (
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <h1 style={{ margin: 0, fontFamily: fonts.display, fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 800, letterSpacing: '-.02em', color: ui.text }}>
              Dames <span style={{ color: GOLD }}>internationales</span>
            </h1>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: ui.textDim, fontFamily: fonts.body }}>
              Plateau 10×10 · rafle maximale · dames volantes · Foncé contre Clair
            </p>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          {[['play', 'Solo & Ami'], ['online', 'Classé']].map(([id, lbl]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              padding: '8px 18px', borderRadius: ui.radius.pill, cursor: 'pointer', fontWeight: 700, fontSize: 13, fontFamily: fonts.body,
              background: tab === id ? GOLD : ui.surface, color: tab === id ? ui.accentInk : ui.textDim,
              border: `1px solid ${tab === id ? GOLD : ui.line}`, transition: '.16s',
            }}>{lbl}</button>
          ))}
        </div>

        <div style={{ width: '100%', maxWidth: 1320 }}>
          {tab === 'play' ? <DamesGame3D /> : <DamesOnline3D />}
        </div>
      </div>
    </div>
  )
}
