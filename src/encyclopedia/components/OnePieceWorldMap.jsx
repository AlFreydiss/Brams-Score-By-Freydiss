import { useState } from 'react'
import { onePieceIslands, onePieceRegions } from '../data/onePieceWorldMap'
import { SectionTitle } from './shared'

export default function OnePieceWorldMap({ spoilerSafe, revealed, onReveal }) {
  const [region, setRegion] = useState('Tous')
  const [activeId, setActiveId] = useState(onePieceIslands[0].id)
  const islands = onePieceIslands.filter(island => region === 'Tous' || island.region === region)
  const active = onePieceIslands.find(island => island.id === activeId)

  return (
    <section className="enc-section">
      <SectionTitle label="Carte du monde One Piece" text="Carte abstraite CSS, pins interactifs, regions et spoilers proteges." />
      <div className="enc-pill-row">
        {onePieceRegions.map(item => <button key={item} className={region === item ? 'is-active' : ''} onClick={() => setRegion(item)}>{item}</button>)}
      </div>
      <div className="enc-world-layout">
        <div className="enc-world-map" role="img" aria-label="Carte abstraite de Grand Line">
          <span className="enc-map-label east">East Blue</span>
          <span className="enc-map-label grand">Grand Line</span>
          <span className="enc-map-label new">Nouveau Monde</span>
          <div className="enc-red-line" />
          <div className="enc-grand-line" />
          {islands.map(island => {
            const hidden = spoilerSafe && island.spoilerLevel >= 4 && !revealed.includes(island.id)
            return (
              <button key={island.id} className={`enc-island-pin status-${island.status} ${activeId === island.id ? 'is-active' : ''}`} style={{ left: `${island.x}%`, top: `${island.y}%` }} onClick={() => hidden ? onReveal(island.id) : setActiveId(island.id)} aria-label={hidden ? 'Ile masquee par spoiler' : island.name}>
                <span />
              </button>
            )
          })}
        </div>
        <aside className="enc-island-panel">
          {active ? (
            <>
              <span className={`enc-map-status status-${active.status}`}>{active.status}</span>
              <h3>{active.name}</h3>
              <p>{active.region} - {active.arc}</p>
              <dl>
                <dt>Personnages</dt>
                <dd>{active.characters.join(', ') || 'A completer'}</dd>
                <dt>Equipages</dt>
                <dd>{active.crews.join(', ') || 'A completer'}</dd>
              </dl>
            </>
          ) : <p>Selectionne une ile.</p>}
        </aside>
      </div>
    </section>
  )
}
