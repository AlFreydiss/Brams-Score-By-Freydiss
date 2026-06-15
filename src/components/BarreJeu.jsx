// Barre compacte des écrans de jeu immersifs : ← Jeux + titre + actions (slot droite).
import { Link } from 'react-router-dom'

export default function BarreJeu({ titre, children }) {
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 30, height: 52, display: 'flex', alignItems: 'center',
      gap: 12, padding: '0 clamp(12px,2.5vw,22px)', boxSizing: 'border-box',
      background: 'rgba(8,9,13,0.72)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(255,255,255,0.07)',
    }}>
      <Link to="/jeux" style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none',
        color: '#cbb26b', fontSize: 13, fontWeight: 800, padding: '6px 12px', borderRadius: 10,
        border: '1px solid rgba(212,160,23,0.28)', background: 'rgba(212,160,23,0.08)',
      }}>← Jeux</Link>
      {titre && <span style={{ fontSize: 14, fontWeight: 800, color: '#ece8df', letterSpacing: '-0.01em' }}>{titre}</span>}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>{children}</div>
    </div>
  )
}
