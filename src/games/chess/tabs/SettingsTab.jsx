// SettingsTab (Échecs) — STUB. L'agent construit ici les paramètres (échiquier/pièces/
// coords, jeu, animations, sons, IA), persistés Supabase + fallback localStorage.
import { ui, fonts } from '../../../features/games/neutralTheme.js'
export default function SettingsTab() {
  return (
    <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: ui.textDim, font: `600 14px ${fonts.body}` }}>
      Paramètres — en construction
    </div>
  )
}
