// ── Sélecteur de promotion : dame / tour / fou / cavalier ────────────────────
// Overlay au-dessus du plateau, jamais de promotion automatique.
import { THEME, GLYPHES_PIECES } from '../constants.js'

const CHOIX = ['q', 'r', 'b', 'n']
const NOMS = { q: 'Dame', r: 'Tour', b: 'Fou', n: 'Cavalier' }

export default function SelecteurPromotion({ couleur, onChoisir, onAnnuler }) {
  return (
    <div
      onClick={onAnnuler}
      style={{
        position: 'absolute', inset: 0, zIndex: 30,
        background: 'rgba(10,10,12,0.62)', backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 12,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          display: 'flex', gap: 10, padding: '16px 18px',
          background: THEME.card, border: `1px solid ${THEME.cardBorderHover}`,
          borderRadius: 16, boxShadow: '0 24px 60px -20px rgba(0,0,0,.8)',
        }}
      >
        {CHOIX.map(p => (
          <button
            key={p}
            onClick={() => onChoisir(p)}
            title={NOMS[p]}
            style={{
              width: 64, height: 64, fontSize: 44, lineHeight: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(255,255,255,0.05)', color: THEME.text,
              border: `1px solid ${THEME.cardBorder}`, borderRadius: 12,
              cursor: 'pointer', transition: 'background .15s, transform .12s, border-color .15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(200,164,92,0.16)'; e.currentTarget.style.borderColor = THEME.gold; e.currentTarget.style.transform = 'translateY(-2px)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = THEME.cardBorder; e.currentTarget.style.transform = 'none' }}
          >
            {GLYPHES_PIECES[couleur === 'w' ? 'w' : 'b'][p]}
          </button>
        ))}
      </div>
    </div>
  )
}
