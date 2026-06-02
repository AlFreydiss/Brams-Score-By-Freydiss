// Barre de séparation entre saisons / arcs dans les grilles d'épisodes.
// Span toute la largeur de la grille (gridColumn 1/-1). Accent violet par défaut.
export default function SeasonDivider({ label, color = '#8b5cf6' }) {
  return (
    <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 14, margin: '22px 0 8px' }}>
      <span style={{
        display: 'flex', alignItems: 'center', gap: 9, whiteSpace: 'nowrap',
        fontSize: 13, fontWeight: 900, letterSpacing: '.1em', textTransform: 'uppercase', color: '#fff',
      }}>
        <span style={{ width: 9, height: 9, borderRadius: 2, background: color, boxShadow: `0 0 12px ${color}` }} />
        {label}
      </span>
      <div style={{ flex: 1, height: 2, borderRadius: 2, background: `linear-gradient(to right, ${color}, ${color}33 55%, transparent)` }} />
    </div>
  )
}
