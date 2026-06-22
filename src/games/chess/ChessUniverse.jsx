// ChessUniverse — assemble la coquille GameUniverse avec les onglets Échecs.
// DA : laiton désaturé chaud (#b09467), distincte de l'univers Dames (bleu-acier froid).
// Onglet piloté par l'URL (/jeux/echecs/:tab), défaut = jouer. 2D STRICTE (zéro R3F).
import { useParams, useNavigate } from 'react-router-dom'
import GameUniverse from '../_shell/GameUniverse.jsx'
import PlayTab from './tabs/PlayTab.jsx'
import RulesTab from './tabs/RulesTab.jsx'
import RankingTab from './tabs/RankingTab.jsx'
import SettingsTab from './tabs/SettingsTab.jsx'

export const CHESS_ACCENT = '#b09467'
export const CHESS_BG = '#17181c'
const ORDER = ['jouer', 'regles', 'classement', 'parametres']

export default function ChessUniverse() {
  const { tab } = useParams()
  const navigate = useNavigate()
  const active = ORDER.includes(tab) ? tab : 'jouer'
  const onSelect = (id) => navigate(id === 'jouer' ? '/jeux/echecs' : `/jeux/echecs/${id}`)
  const props = { accent: CHESS_ACCENT, bg: CHESS_BG }
  const tabs = [
    { id: 'jouer', label: 'Jouer', element: <PlayTab {...props} /> },
    { id: 'regles', label: 'Règles', element: <RulesTab {...props} /> },
    { id: 'classement', label: 'Classement', element: <RankingTab {...props} /> },
    { id: 'parametres', label: 'Paramètres', element: <SettingsTab {...props} /> },
  ]
  return <GameUniverse title="Échecs" accent={CHESS_ACCENT} bg={CHESS_BG} tabs={tabs} active={active} onSelect={onSelect} />
}
