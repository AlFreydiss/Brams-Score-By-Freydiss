// Démo DEV : chaque écran de Guess Who avec un état factice, sans réseau.
// Route /guess-who/demo déclarée seulement si import.meta.env.DEV (App.jsx).
import { useState } from 'react'
import { GLOBAL_CSS, MangaBackdrop, FONT_BODY } from './manga.jsx'
import { T, F, pill } from './theme.js'
import RoomView from './RoomView.jsx'
import { DEMO_PHASES, demoG } from './demoState.js'

export default function DemoPage() {
  const initial = new URLSearchParams(location.search).get('phase')
  const [phase, setPhase] = useState(DEMO_PHASES.includes(initial) ? initial : 'lobby')
  const g = demoG(phase)
  return (
    <div style={{ position: 'relative', minHeight: '100dvh', padding: 'clamp(12px,3vw,32px)', fontFamily: FONT_BODY, color: T.text }}>
      <style>{GLOBAL_CSS}</style>
      <MangaBackdrop />
      <nav style={{ position: 'relative', zIndex: 2, display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
        {DEMO_PHASES.map((p) => (
          <button key={p} onClick={() => setPhase(p)} style={{ ...pill(p === phase ? 'primary' : 'ghost'), padding: '6px 12px', fontFamily: F.ui, fontSize: 13, cursor: 'pointer' }}>{p}</button>
        ))}
      </nav>
      <div style={{ position: 'relative', zIndex: 1 }}>
        <RoomView key={phase} g={g} code="DEMO" reactions={{ items: [], send: () => {} }} />
      </div>
    </div>
  )
}
