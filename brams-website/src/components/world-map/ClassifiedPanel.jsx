import { AnimatePresence, motion } from 'framer-motion'

export default function ClassifiedPanel({ selectedIsland, selectedCharacter, onClose }) {
  const island = selectedIsland
  const danger = island ? Array.from({ length: 10 }, (_, index) => index < island.dangerLevel) : []

  return (
    <motion.aside className="world-map-panel" initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.45 }}>
      <div className="world-map-panel-top">
        <span>GOUVERNEMENT MONDIAL / DOSSIER CLASSIFIE</span>
        <button type="button" onClick={onClose}>Fermer</button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={island?.id || 'overview'}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.28 }}
        >
          <h1>{island ? island.name : 'Carte Mondiale Classifiee'}</h1>
          <p>
            {island
              ? island.visualIdentity
              : 'Atlas holographique One Piece: regions, routes maritimes, factions, personnages et zones interdites.'}
          </p>

          {island ? (
            <>
              <div className="world-map-signal">
                <i style={{ background: island.colorPalette?.secondary }} />
                <div>
                  <strong>{island.region}</strong>
                  <span>{island.arc} / {island.saga}</span>
                </div>
              </div>
              <div className="world-map-danger">
                {danger.map((active, index) => <i key={index} className={active ? 'active' : ''} />)}
              </div>
              <div className="world-map-dossier-grid">
                <div><span>Biome</span><strong>{island.biome}</strong></div>
                <div><span>Climat</span><strong>{island.climate}</strong></div>
                <div><span>Statut</span><strong>{island.unlockStatus}</strong></div>
                <div><span>Canon</span><strong>{island.canonStatus}</strong></div>
              </div>
              <div className="world-map-legend">
                {(island.landmarks || []).map((item) => <span key={item}><i style={{ background: island.colorPalette?.secondary }} />{item}</span>)}
              </div>
            </>
          ) : (
            <div className="world-map-dossier-grid">
              <div><span>Regions</span><strong>11</strong></div>
              <div><span>Iles phase 1</span><strong>33</strong></div>
              <div><span>Mode</span><strong>Atlas vivant</strong></div>
              <div><span>Routes</span><strong>filtrables</strong></div>
            </div>
          )}

          {selectedCharacter && (
            <div className="world-map-character-card">
              <div className="world-map-character-orb" style={{ background: selectedCharacter.color }} />
              <div>
                <strong>{selectedCharacter.name}</strong>
                <span>{selectedCharacter.alias || 'Dossier personnage'}</span>
                <small>{selectedCharacter.bounty || selectedCharacter.status || 'Prime inconnue'}</small>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.aside>
  )
}
