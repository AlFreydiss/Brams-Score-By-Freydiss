// ── Page Jeu de Dames — 3D (Pirates vs Marine) ───────────────────────────────
// Onglet « Partie (3D) » : Local / vs IA. Onglet « En ligne classé » : matchmaking
// + parties temps réel serveur-autoritaires (ELO). Le 2D est entièrement retiré.
import { useState } from 'react'
import DamesGame3D from './DamesGame3D.jsx'
import DamesOnline3D from './DamesOnline3D.jsx'

const GOLD = '#d4a017'

export default function DamesPage() {
  const [tab, setTab] = useState('play')

  return (
    <div style={{ minHeight: '100vh', padding: '24px 16px 60px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, color: '#f3ead8' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ margin: 0, fontFamily: "'Fraunces','Bricolage Grotesque',serif", fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 700, letterSpacing: '-.01em', color: '#fff' }}>
          Dames <span style={{ color: GOLD }}>Brams</span> <span style={{ fontSize: '.5em', color: 'rgba(243,234,216,.5)', fontWeight: 600, verticalAlign: 'middle' }}>· 3D</span>
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(243,234,216,.55)' }}>
          Internationales 10×10 · rafle maximale · dames volantes · Pirates ☠️ vs Marine ⚓
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        {[['play', '🎲 Partie (3D)'], ['online', '🌐 En ligne classé']].map(([id, lbl]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            padding: '8px 18px', borderRadius: 999, cursor: 'pointer', fontWeight: 700, fontSize: 13,
            background: tab === id ? GOLD : 'rgba(255,255,255,.05)', color: tab === id ? '#1a1200' : 'rgba(243,234,216,.7)',
            border: `1px solid ${tab === id ? GOLD : 'rgba(255,255,255,.12)'}`,
          }}>{lbl}</button>
        ))}
      </div>

      <div style={{ width: '100%', maxWidth: 1100 }}>
        {tab === 'play' ? <DamesGame3D /> : <DamesOnline3D />}
      </div>
    </div>
  )
}
