// ── Fred'isu — le rhythm game, embarqué plein écran dans Brams ───────────────
// Le jeu est un fichier 100% autonome (public/fredisu.html). On l'embarque en
// iframe plein écran (audio/clavier/souris OK) avec un retour discret vers Brams.
import { Link } from 'react-router-dom'

export default function FredisuPage() {
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#08090d', zIndex: 1 }}>
      <iframe
        src="/fredisu.html"
        title="Fred'isu"
        allow="autoplay; fullscreen; gamepad; clipboard-write"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0, display: 'block' }}
      />
      <Link to="/jeux" title="Retour aux jeux" aria-label="Retour aux jeux" style={{
        position: 'fixed', top: 14, left: 14, zIndex: 10,
        display: 'inline-flex', alignItems: 'center', gap: 7,
        padding: '8px 14px', borderRadius: 999, textDecoration: 'none',
        background: 'rgba(8,9,13,0.6)', backdropFilter: 'blur(10px)',
        border: '1px solid rgba(212,160,23,0.4)', color: '#f0d27a',
        fontSize: 13, fontWeight: 800,
      }}>← Brams</Link>
    </div>
  )
}
