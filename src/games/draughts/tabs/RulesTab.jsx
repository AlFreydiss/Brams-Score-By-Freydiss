// ─────────────────────────────────────────────────────────────────────────────
// RulesTab (Dames) — règles internationales 10×10, sobres et aérées, illustrées par
// des mini-damiers 2D : prise obligatoire, rafle maximale, dame volante, promotion.
// Tokens = neutralTheme. Accent univers = bleu-acier (props.accent). Inline only.
// ─────────────────────────────────────────────────────────────────────────────
import { ui, fonts } from '../../../features/games/neutralTheme.js'
import MiniBoard from '../ui/MiniBoard.jsx'
import { SectionTitle } from '../ui/controls.jsx'

const SECTIONS = [
  {
    title: 'Le plateau et le but',
    body: [
      'On joue sur un damier 10×10, uniquement sur les 50 cases foncées, numérotées de 1 à 50. Chaque camp aligne 20 pions : Foncé contre Clair.',
      'Le camp Foncé ouvre. On gagne quand l’adversaire ne peut plus jouer — soit qu’il n’a plus de pièce, soit qu’aucun coup légal ne lui reste.',
    ],
    rows: [
      'ccccc',
      'cc.cc',
      '.....',
      'pp.pp',
      'ppppp',
    ],
    marks: {},
  },
  {
    title: 'Déplacement des pions',
    body: [
      'Un pion avance d’une case en diagonale, vers l’avant, sur une case foncée libre. Il ne recule jamais — sauf pour capturer.',
    ],
    rows: [
      '.....',
      '..p..',
      '.....',
      '.....',
      '.....',
    ],
    marks: { dot: [[2, 1], [2, 3]] },
  },
  {
    title: 'La prise est obligatoire',
    body: [
      'Si une capture est possible, elle doit être jouée : on ne peut pas y renoncer. Le pion saute par-dessus une pièce adverse adjacente vers la case vide juste derrière, et retire la pièce capturée.',
      'Le pion capture dans les quatre diagonales — y compris vers l’arrière.',
    ],
    rows: [
      '.....',
      '..c..',
      '.....',
      '..p..',
      '.....',
    ],
    marks: { ring: [[1, 2]], to: [[0, 3]] },
  },
  {
    title: 'La rafle maximale',
    body: [
      'Une capture peut s’enchaîner : tant qu’une nouvelle prise est possible depuis la case d’arrivée, on continue avec la même pièce.',
      'Quand plusieurs rafles existent, on est obligé de choisir celle qui capture le plus de pièces. Les pions sautés ne sont retirés qu’à la fin de la rafle.',
    ],
    rows: [
      '.....',
      '.c.c.',
      '.....',
      '.c...',
      'p....',
    ],
    marks: { ring: [[3, 1], [1, 1], [1, 3]], to: [[2, 2]] },
  },
  {
    title: 'La dame volante',
    body: [
      'Un pion qui atteint la dernière rangée adverse devient dame (couronne dorée). La dame se déplace de plusieurs cases en diagonale, dans les deux sens.',
      'En prise, elle peut capturer une pièce située loin sur sa diagonale et se poser sur n’importe quelle case libre au-delà.',
    ],
    rows: [
      '.....',
      '.....',
      '.....',
      '...P.',
      '.....',
    ],
    marks: { dot: [[2, 2], [1, 1], [0, 0], [4, 4], [2, 4]] },
  },
  {
    title: 'Promotion',
    body: [
      'Le pion ne promeut qu’en s’arrêtant sur la dernière rangée. S’il ne fait que la traverser au cours d’une rafle, il reste pion et poursuit la prise comme un pion.',
    ],
    rows: [
      '..p..',
      '.....',
      '.....',
      '.....',
      '.....',
    ],
    marks: { to: [[0, 2]] },
  },
  {
    title: 'Parties nulles',
    body: [
      'La partie est nulle après 25 coups de chaque camp sans prise ni avancée de pion, par triple répétition de la position, ou quand il ne reste qu’une dame contre une dame — aucun camp ne pouvant plus forcer le gain.',
    ],
    rows: null,
    marks: {},
  },
]

// Accent univers Dames = bleu-acier (override local, distinct de l'or des échecs).
const STEEL = '#6f8fb0'

export default function RulesTab({ accent = STEEL }) {
  return (
    <div style={{ minHeight: '100%', padding: 'clamp(20px,2.5vw,32px) clamp(16px,3vw,40px) 56px', display: 'flex', justifyContent: 'center' }}>
      <style>{`
        .dRulesGrid { display:grid; grid-template-columns:repeat(auto-fill,minmax(min(100%,540px),1fr)); gap:14px; align-items:start; }
      `}</style>
      <div style={{ width: '100%', maxWidth: 1320 }}>
        <header style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: accent, fontWeight: 700 }}>Dames internationales</div>
          <h1 style={{ margin: '8px 0 0', fontFamily: fonts.display, fontWeight: 800, fontSize: 'clamp(26px,4vw,36px)', color: ui.text, letterSpacing: '-.5px' }}>Les règles</h1>
          <p style={{ margin: '10px 0 0', fontFamily: fonts.body, fontSize: 14, lineHeight: 1.6, color: ui.textDim, maxWidth: 680 }}>
            Le jeu de dames version 10×10 — celle des compétitions. Prise maximale obligatoire et dames volantes, comme dans la partie.
          </p>
        </header>

        <div className="dRulesGrid">
          {SECTIONS.map((s, i) => (
            <section key={i} style={{
              borderRadius: ui.radius.md, background: ui.surface, border: `1px solid ${ui.line}`,
              padding: '14px 16px', gridColumn: s.rows ? 'auto' : '1 / -1',
              display: 'grid', gridTemplateColumns: s.rows ? 'auto minmax(0,1fr)' : '1fr',
              gap: 16, alignItems: 'center',
            }}>
              {s.rows && (
                <div style={{ display: 'grid', placeItems: 'center' }}>
                  <MiniBoard rows={s.rows} marks={s.marks} accent={accent} size={150} />
                </div>
              )}
              <div style={{ minWidth: 0 }}>
                <SectionTitle accent={accent}>{s.title}</SectionTitle>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {s.body.map((p, j) => (
                    <p key={j} style={{ margin: 0, fontFamily: fonts.body, fontSize: 13.5, lineHeight: 1.6, color: ui.textDim }}>{p}</p>
                  ))}
                </div>
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
