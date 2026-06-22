// DraughtsUniverse — coquille GameUniverse avec les onglets Dames (internationales 10×10).
// DA : bleu-acier froid (#6f8fb0), distincte de l'univers Échecs (laiton chaud).
// Onglet piloté par l'URL (/jeux/dames/:tab), défaut = jouer. 2D STRICTE (zéro R3F).
import { useParams, useNavigate } from 'react-router-dom'
import GameUniverse from '../_shell/GameUniverse.jsx'
import PlayTab from './tabs/PlayTab.jsx'
import RulesTab from './tabs/RulesTab.jsx'
import RankingTab from './tabs/RankingTab.jsx'
import SettingsTab from './tabs/SettingsTab.jsx'

export const DRAUGHTS_ACCENT = '#6f8fb0'
export const DRAUGHTS_BG = '#15171b'
const ORDER = ['jouer', 'regles', 'classement', 'parametres']

export default function DraughtsUniverse() {
  const { tab } = useParams()
  const navigate = useNavigate()
  const active = ORDER.includes(tab) ? tab : 'jouer'
  const onSelect = (id) => navigate(id === 'jouer' ? '/jeux/dames' : `/jeux/dames/${id}`)
  const props = { accent: DRAUGHTS_ACCENT, bg: DRAUGHTS_BG }
  const tabs = [
    { id: 'jouer', label: 'Jouer', element: <PlayTab {...props} /> },
    { id: 'regles', label: 'Règles', element: <RulesTab {...props} /> },
    { id: 'classement', label: 'Classement', element: <RankingTab {...props} /> },
    { id: 'parametres', label: 'Paramètres', element: <SettingsTab {...props} /> },
  ]
  return <GameUniverse title="Dames" accent={DRAUGHTS_ACCENT} bg={DRAUGHTS_BG} tabs={tabs} active={active} onSelect={onSelect} />
}
