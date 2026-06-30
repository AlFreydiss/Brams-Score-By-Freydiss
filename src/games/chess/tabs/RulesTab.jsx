// ── RulesTab (Échecs) : règles pédagogiques sobres ──────────────────────────
// Objectif du jeu, déplacement de chaque pièce (mini-diagrammes 2D lecture seule),
// échec/mat/pat, roque, prise en passant, promotion, nulles. Sections aérées,
// repliables, navigation par ancres. Accent laiton, MiniBoard pour les schémas.
import { useState } from 'react'
import { ui, fonts } from '../../../features/games/neutralTheme.js'
import MiniBoard from '../ui/MiniBoard.jsx'
import { useChessSettings } from '../logic/useChessSettings.js'

const BRASS = '#81b64c'

// Pièce isolée + cases de déplacement surlignées (pastilles laiton).
function diag(piece, cible) {
  const surbrillances = {}
  for (const sq of cible) surbrillances[sq] = { background: 'radial-gradient(circle, rgba(129,182,76,0.55) 26%, transparent 30%)' }
  return surbrillances
}

// chaque pièce posée seule (FEN minimal) + ses cases d'action.
const PIECES = [
  { id: 'pion', nom: 'Le Pion', fen: '8/8/8/8/8/4P3/8/8 w - - 0 1', cible: ['e4', 'e5'],
    texte: "Avance d'une case (deux depuis sa case de départ), capture en diagonale. Il ne recule jamais." },
  { id: 'cavalier', nom: 'Le Cavalier', fen: '8/8/8/8/4N3/8/8/8 w - - 0 1', cible: ['d6', 'f6', 'c5', 'g5', 'c3', 'g3', 'd2', 'f2'],
    texte: "Se déplace en « L » (deux cases puis une perpendiculaire). Seule pièce qui saute par-dessus les autres." },
  { id: 'fou', nom: 'Le Fou', fen: '8/8/8/8/4B3/8/8/8 w - - 0 1', cible: ['b1', 'c2', 'd3', 'f5', 'g6', 'h7', 'a8', 'b7', 'c6', 'd5', 'f3', 'g2', 'h1'],
    texte: "Se déplace en diagonale, sur autant de cases que libres. Reste toujours sur sa couleur de départ." },
  { id: 'tour', nom: 'La Tour', fen: '8/8/8/8/4R3/8/8/8 w - - 0 1', cible: ['e1', 'e2', 'e3', 'e5', 'e6', 'e7', 'e8', 'a4', 'b4', 'c4', 'd4', 'f4', 'g4', 'h4'],
    texte: "Se déplace en lignes droites, horizontalement ou verticalement, sur toute la distance libre." },
  { id: 'dame', nom: 'La Dame', fen: '8/8/8/8/4Q3/8/8/8 w - - 0 1', cible: ['e1', 'e2', 'e3', 'e5', 'e6', 'e7', 'e8', 'a4', 'b4', 'c4', 'd4', 'f4', 'g4', 'h4', 'b1', 'c2', 'd3', 'f5', 'g6', 'h7', 'a8', 'b7', 'c6', 'd5', 'f3', 'g2', 'h1'],
    texte: "Combine la Tour et le Fou : lignes droites ET diagonales. La pièce la plus puissante." },
  { id: 'roi', nom: 'Le Roi', fen: '8/8/8/8/4K3/8/8/8 w - - 0 1', cible: ['d5', 'e5', 'f5', 'd4', 'f4', 'd3', 'e3', 'f3'],
    texte: "Se déplace d'une seule case dans toutes les directions. Il ne doit jamais rester en échec." },
]

const CONCEPTS = [
  { id: 'echec', nom: 'Échec et mat', fen: 'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3',
    texte: "Le Roi est en échec quand il est attaqué : il faut parer la menace. S'il n'existe aucun coup pour échapper à l'échec, c'est échec et mat — la partie est gagnée. (Ici, « mat du berger » imminent.)" },
  { id: 'pat', nom: 'Le Pat', fen: '7k/5Q2/6K1/8/8/8/8/8 b - - 0 1',
    texte: "Le joueur au trait n'est PAS en échec mais n'a aucun coup légal. La partie est alors nulle — une ressource défensive classique quand on a moins de matériel." },
  { id: 'roque', nom: 'Le Roque', fen: 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1', cible: ['g1', 'c1'],
    texte: "Coup spécial Roi + Tour : le Roi se déplace de deux cases vers une Tour, qui saute par-dessus lui. Possible si ni le Roi ni la Tour n'ont bougé, sans pièce entre eux, et sans traverser ni finir en échec." },
  { id: 'enpassant', nom: 'La prise en passant', fen: '8/8/8/3pP3/8/8/8/8 w - d6 0 1', cible: ['d6'],
    texte: "Si un pion adverse avance de deux cases et se retrouve à côté du vôtre, vous pouvez le capturer « en passant » comme s'il n'avait avancé que d'une case — uniquement au coup suivant immédiat." },
  { id: 'promotion', nom: 'La promotion', fen: '8/4P3/8/8/8/8/8/8 w - - 0 1', cible: ['e8'],
    texte: "Un pion qui atteint la dernière rangée se transforme en la pièce de son choix : presque toujours une Dame. On peut donc avoir plusieurs Dames." },
]

// Carte de section dépliable. Diagramme à gauche (auto), texte à droite (1fr).
// Densité resserrée : padding raisonnable, plus de void interne.
function Bloc({ titre, ouvertParDefaut = false, children, anchorId, large = false }) {
  const [ouvert, setOuvert] = useState(ouvertParDefaut)
  return (
    <section id={anchorId} style={{
      scrollMarginTop: 16, borderRadius: ui.radius.md, background: ui.surface,
      border: `1px solid ${ui.line}`, overflow: 'hidden', display: 'flex', flexDirection: 'column',
      gridColumn: large ? '1 / -1' : 'auto', alignSelf: 'start',
    }}>
      <button className="rulesAcc" onClick={() => setOuvert(o => !o)} aria-expanded={ouvert} style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        padding: '13px 16px', cursor: 'pointer', background: 'transparent', border: 'none', textAlign: 'left',
      }}>
        <span style={{ font: `800 15px ${fonts.display}`, letterSpacing: '-0.01em', color: ui.text }}>{titre}</span>
        <span aria-hidden style={{ font: `400 14px ${fonts.body}`, color: ui.textMute, transform: ouvert ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>▾</span>
      </button>
      {ouvert && <div style={{ padding: '0 16px 14px' }}>{children}</div>}
    </section>
  )
}

// Ligne diagramme + texte resserrée (grille auto | 1fr, pas de centrage vide).
function Schema({ children, texte }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0,1fr)', gap: 14, alignItems: 'center' }}>
      {children}
      <div style={{ minWidth: 0 }}>{texte}</div>
    </div>
  )
}

function CartePiece({ p }) {
  const { reglages } = useChessSettings()
  return (
    <Schema texte={
      <>
        <h4 style={{ margin: '0 0 4px', font: `700 14px ${fonts.body}`, color: ui.text }}>{p.nom}</h4>
        <p style={{ margin: 0, font: `400 13px ${fonts.body}`, color: ui.textDim, lineHeight: 1.55 }}>{p.texte}</p>
      </>
    }>
      <MiniBoard fen={p.fen} taille={132} boardId={reglages.board} surbrillances={diag(p.id, p.cible)} />
    </Schema>
  )
}

export default function RulesTab() {
  const { reglages } = useChessSettings()
  const ancres = [
    { id: 'but', l: 'Objectif' }, { id: 'pieces', l: 'Les pièces' },
    { id: 'echec', l: 'Échec & mat' }, { id: 'pat', l: 'Pat' },
    { id: 'roque', l: 'Roque' }, { id: 'enpassant', l: 'En passant' },
    { id: 'promotion', l: 'Promotion' }, { id: 'nulles', l: 'Nulles' },
  ]

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: 'clamp(20px,2.5vw,32px) clamp(16px,3vw,40px) 56px' }}>
      <style>{`
        .rulesGrid { display:grid; grid-template-columns:repeat(auto-fill,minmax(min(100%,540px),1fr)); gap:14px; align-items:start; }
        .rulesAcc:focus-visible, .rulesChip:focus-visible { outline:2px solid ${ui.accent}; outline-offset:2px; border-radius:8px; }
        @media (prefers-reduced-motion: reduce){ .rulesAcc span[aria-hidden]{ transition:none !important; } }
      `}</style>
      <div style={{ maxWidth: 1320, margin: '0 auto' }}>
        <header style={{ marginBottom: 18 }}>
          <h2 style={{ margin: '0 0 6px', font: `800 26px ${fonts.display}`, letterSpacing: '-0.02em', color: ui.text }}>Règles du jeu</h2>
          <p style={{ margin: 0, font: `400 14px ${fonts.body}`, color: ui.textDim, lineHeight: 1.6, maxWidth: 680 }}>
            L'essentiel pour jouer, avec des diagrammes. Cliquez une section pour la déplier.
          </p>
        </header>

        {/* Navigation par ancres */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 18 }}>
          {ancres.map(a => (
            <a key={a.id} href={`#${a.id}`} className="rulesChip" style={{
              padding: '5px 12px', borderRadius: ui.radius.pill, textDecoration: 'none',
              font: `600 12px ${fonts.body}`, color: ui.textDim, background: ui.surface, border: `1px solid ${ui.line}`,
            }}>{a.l}</a>
          ))}
        </div>

        <div className="rulesGrid">
          <Bloc anchorId="but" titre="Objectif du jeu" ouvertParDefaut>
            <Schema texte={
              <p style={{ margin: 0, font: `400 13px ${fonts.body}`, color: ui.textDim, lineHeight: 1.55 }}>
                Les Blancs commencent. Chacun déplace une pièce à tour de rôle. Le but est de
                mettre le Roi adverse en <strong style={{ color: ui.text }}>échec et mat</strong> : menacé
                de capture et sans échappatoire. On peut aussi gagner au temps ou par abandon.
              </p>
            }>
              <MiniBoard taille={144} boardId={reglages.board} />
            </Schema>
          </Bloc>

          <Bloc anchorId="pieces" titre="Déplacement des pièces" ouvertParDefaut>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,240px),1fr))', gap: 16 }}>
              {PIECES.map(p => <CartePiece key={p.id} p={p} />)}
            </div>
          </Bloc>

          {CONCEPTS.map(c => (
            <Bloc key={c.id} anchorId={c.id} titre={c.nom}>
              <Schema texte={
                <p style={{ margin: 0, font: `400 13px ${fonts.body}`, color: ui.textDim, lineHeight: 1.55 }}>{c.texte}</p>
              }>
                <MiniBoard fen={c.fen} taille={144} boardId={reglages.board}
                  surbrillances={c.cible ? diag(c.id, c.cible) : null} />
              </Schema>
            </Bloc>
          ))}

          <Bloc anchorId="nulles" titre="Les parties nulles">
            <ul style={{ margin: 0, paddingLeft: 18, font: `400 13px ${fonts.body}`, color: ui.textDim, lineHeight: 1.7 }}>
              <li><strong style={{ color: ui.text }}>Pat</strong> — aucun coup légal sans être en échec.</li>
              <li><strong style={{ color: ui.text }}>Répétition</strong> — la même position survient trois fois.</li>
              <li><strong style={{ color: ui.text }}>Règle des 50 coups</strong> — 50 coups sans prise ni mouvement de pion.</li>
              <li><strong style={{ color: ui.text }}>Matériel insuffisant</strong> — impossible de mater (ex. Roi contre Roi).</li>
              <li><strong style={{ color: ui.text }}>Accord mutuel</strong> — les deux joueurs acceptent la nulle.</li>
            </ul>
          </Bloc>
        </div>
      </div>
    </div>
  )
}
