// ArenaLayout — coquille de jeu plein écran : lumière d'ambiance + plateau central
// + deux rails verre dépoli flottants. Drop-in pour le contenu de l'onglet « Jouer »
// des deux jeux (échecs/dames) → garant de cohérence visuelle.
//
//   <ArenaLayout turn="warm" mobile={mobile}
//     left={<PlayerRail .../>}  board={<Board .../>}  right={<MoveRail .../>} />
//
// Desktop : rails flottants gauche/droite, plateau centré, lumière derrière.
// Mobile  : plateau plein largeur, rails empilés dessous (drawer simple).
import ArenaLight from './ArenaLight.jsx'
import { railStyle } from './arenaTokens.js'

export default function ArenaLayout({ turn = null, left, board, right, mobile = false }) {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <ArenaLight turn={turn} />

      {mobile ? (
        <div style={{
          position: 'relative', zIndex: 1, height: '100%', overflowY: 'auto',
          display: 'flex', flexDirection: 'column', gap: 12, padding: '12px 10px 28px', alignItems: 'center',
        }}>
          <div style={{ flexShrink: 0 }}>{board}</div>
          {left && <div style={{ ...railStyle(), width: '100%', maxWidth: 460 }}>{left}</div>}
          {right && <div style={{ ...railStyle(), width: '100%', maxWidth: 460, flex: '0 1 auto' }}>{right}</div>}
        </div>
      ) : (
        <div style={{
          position: 'relative', zIndex: 1, height: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 22,
          padding: '20px 26px', boxSizing: 'border-box',
        }}>
          {left && <aside style={{ ...railStyle({ side: 'left' }), width: 248, maxHeight: '92%', alignSelf: 'center' }}>{left}</aside>}
          <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{board}</div>
          {right && <aside style={{ ...railStyle({ side: 'right' }), width: 312, maxHeight: '92%', alignSelf: 'center' }}>{right}</aside>}
        </div>
      )}
    </div>
  )
}
