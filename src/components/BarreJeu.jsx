// Barre compacte des écrans de jeu immersifs : ← Accueil + titre + actions (slot droite).
// `skin` : 'dark' (défaut, jeux sombres) ou 'manga' (papier + encre, Guess Who).
import { Link } from 'react-router-dom'

const SKINS = {
  dark: {
    bar: {
      background: 'rgba(8,9,13,0.72)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(255,255,255,0.07)',
    },
    back: {
      color: '#cbb26b', fontSize: 13, fontWeight: 800, padding: '6px 12px', borderRadius: 10,
      border: '1px solid rgba(212,160,23,0.28)', background: 'rgba(212,160,23,0.08)',
    },
    title: { fontSize: 14, fontWeight: 800, color: '#ece8df', letterSpacing: '-0.01em' },
  },
  manga: {
    bar: { background: '#FFFFFF', border: '3px solid #14121A', boxShadow: '5px 5px 0 #14121A' },
    back: {
      color: '#FFFFFF', fontSize: 14, padding: '5px 12px', borderRadius: 4, background: '#14121A',
      border: '3px solid #14121A', fontFamily: "'Dela Gothic One', 'Arial Black', sans-serif",
    },
    title: { fontSize: 18, color: '#14121A', fontFamily: "'Dela Gothic One', 'Arial Black', sans-serif" },
  },
}

export default function BarreJeu({ titre, children, skin = 'dark' }) {
  const s = SKINS[skin] || SKINS.dark
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 30, height: 52, display: 'flex', alignItems: 'center',
      gap: 12, padding: '0 clamp(12px,2.5vw,22px)', boxSizing: 'border-box', ...s.bar,
    }}>
      <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none', ...s.back }}>← Accueil</Link>
      {titre && <span style={s.title}>{titre}</span>}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>{children}</div>
    </div>
  )
}
