// GameUniverse — coquille générique d'un univers de jeu (plein écran + header + onglets).
// Réutilisable : chaque jeu fournit sa config (titre, accent, onglets, fond) et son contenu.
// Le cœur du jeu reste sobre ; l'identité Brams n'apparaît que dans le header (wrapper).
//
//   <GameUniverse title="Échecs" accent="#b09467" bg="#17181c"
//     tabs={[{id:'jouer',label:'Jouer',element:<PlayTab/>}, ...]}
//     active={onglet} onSelect={setOnglet} elo={1240} />
import { AnimatePresence, motion } from 'framer-motion'
import { useLocation } from 'react-router-dom'
import { ui } from '../../features/games/neutralTheme.js'
import { universeMorph, tabSwap } from './transitions.js'
import UniverseHeader from './UniverseHeader.jsx'

export default function GameUniverse({ title, accent, bg, tabs, active, onSelect, elo = null }) {
  const current = tabs.find((t) => t.id === active) || tabs[0]
  const location = useLocation()
  // Morph depuis la carte du hub (origin px viewport, posé dans location.state). Sinon entrée standard.
  const { style: morphStyle, ...morph } = universeMorph(location.state?.gameOrigin)
  return (
    <motion.div {...morph}
      style={{
        position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column',
        background: bg || ui.bg, color: ui.text, overflow: 'hidden',
        ...morphStyle,
      }}>
      <UniverseHeader title={title} accent={accent} tabs={tabs} active={current.id} onSelect={onSelect} elo={elo} />
      <main role="tabpanel" style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={current.id} {...tabSwap}
            style={{ position: 'absolute', inset: 0, overflow: 'auto' }}>
            {current.element}
          </motion.div>
        </AnimatePresence>
      </main>
    </motion.div>
  )
}
