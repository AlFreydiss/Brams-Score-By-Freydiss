// RankingTab (Échecs) — STUB. L'agent construit ici le classement ELO sobre
// (tableau Rang · Pseudo · ELO · Parties · %V · tendance), joueur courant surligné.
import { ui, fonts } from '../../../features/games/neutralTheme.js'
export default function RankingTab() {
  return (
    <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: ui.textDim, font: `600 14px ${fonts.body}` }}>
      Classement — en construction
    </div>
  )
}
