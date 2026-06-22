// UniverseHeader — barre fine de l'univers : ← Brams (discret) · titre du jeu · onglets · ELO.
// Le SEUL endroit où l'identité Brams est permise (wrapper). Jamais sur le plateau.
import { useNavigate } from 'react-router-dom'
import { ui, fonts } from '../../features/games/neutralTheme.js'
import TabNav from './TabNav.jsx'

export default function UniverseHeader({ title, accent, tabs, active, onSelect, elo }) {
  const navigate = useNavigate()
  return (
    <header style={{
      flexShrink: 0, height: 60, display: 'flex', alignItems: 'center', gap: ui.space.lg,
      padding: `0 ${ui.space.lg}px`, background: ui.bgElev,
      boxShadow: `0 1px 0 ${ui.line}, 0 8px 24px -16px rgba(0,0,0,.6)`, zIndex: 5,
    }}>
      <button type="button" onClick={() => navigate('/jeux')}
        style={{
          appearance: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '7px 12px', borderRadius: ui.radius.pill, border: `1px solid ${ui.line}`,
          background: ui.surface, color: ui.textDim, font: `600 12.5px ${fonts.body}`, transition: '.16s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = ui.text; e.currentTarget.style.borderColor = ui.lineHi }}
        onMouseLeave={(e) => { e.currentTarget.style.color = ui.textDim; e.currentTarget.style.borderColor = ui.line }}>
        ← Brams
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <span aria-hidden style={{ width: 8, height: 8, borderRadius: 2, background: accent, flexShrink: 0, transform: 'rotate(45deg)' }} />
        <h1 style={{ margin: 0, font: `700 17px ${fonts.display}`, letterSpacing: '-.01em', color: ui.text, whiteSpace: 'nowrap' }}>{title}</h1>
      </div>

      <div style={{ marginLeft: 'auto', alignSelf: 'stretch', display: 'flex' }}>
        <TabNav tabs={tabs} active={active} accent={accent} onSelect={onSelect} />
      </div>

      {elo != null && (
        <div title="Ton ELO" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: ui.radius.pill,
          background: ui.surface, border: `1px solid ${ui.line}`, color: ui.text,
          font: `700 13px ${fonts.mono}`, fontVariantNumeric: 'tabular-nums',
        }}>
          <span style={{ font: `600 10px ${fonts.body}`, letterSpacing: '.1em', color: ui.textMute }}>ELO</span>
          {elo}
        </div>
      )}

      <style>{`@media (max-width:760px){ header h1{font-size:15px} }`}</style>
    </header>
  )
}
