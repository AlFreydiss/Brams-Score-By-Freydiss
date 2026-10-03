// Guess Who — petites illustrations en points des trois règles de l'accueil,
// en boucle douce (même trame que le fond) :
// - imite : un égaliseur dont les colonnes montent et descendent ;
// - vote : un mini tableau des scores qui se remplit ;
// - survis : deux vies, la seconde vire au rouge et s'éteint.
// Animations CSS (gw-keep : jouées aussi sur téléphone), coupées si l'OS
// demande moins d'animations ; l'image fixe reste lisible.
import { T } from './theme.js'

const W = 15, H = 5, P = 8 // colonnes, lignes, pas en px
const dot = (x, y, fill, style) => (
  <rect key={`${x}-${y}`} x={x * P + 1} y={y * P + 1} width={4} height={4} fill={fill} className="gw-anim gw-keep" style={style} />
)

function Imite() {
  // hauteur de repos de chaque colonne : une voix qui module
  const base = [1, 2, 3, 2, 4, 5, 3, 2, 4, 3, 5, 4, 2, 3, 1]
  return Array.from({ length: W }, (_, c) => Array.from({ length: H }, (_, r) => {
    const fromBottom = H - 1 - r
    const lit = fromBottom < base[c]
    return dot(c, r, lit ? T.accent : 'rgba(237,234,227,0.12)', lit && fromBottom >= 1 ? {
      '--gw-d': '1.1s', '--gw-n': 'infinite',
      animation: `gw-eq 1.1s ease-in-out ${(c * 0.09 + fromBottom * 0.05).toFixed(2)}s infinite`,
    } : undefined)
  })).flat()
}

function Vote() {
  // mini tableau des scores : la ligne du haut reçoit 5 votes, celle du bas 2,
  // les points s'allument un à un puis tout repart
  const rows = [[2, 5], [4, 2]]
  return rows.flatMap(([y, n], ri) => Array.from({ length: 9 }, (_, c) => (c < n
    ? dot(c, y, ri ? T.accent : T.accentLit, {
      '--gw-d': '2.8s', '--gw-n': 'infinite', animation: `gw-ballot 2.8s ease-out ${(c * 0.22 + ri * 0.4).toFixed(2)}s infinite`,
    })
    : dot(c, y, 'rgba(237,234,227,0.12)'))))
}

function Survis() {
  // deux vies (gros points) : la seconde vire au rouge, s'éteint, revient
  return [
    <rect key="a" x={1} y={H * P - 23} width={22} height={22} fill={T.accent} />,
    <rect key="b" x={P * 4 + 1} y={H * P - 23} width={22} height={22} fill={T.accent} className="gw-anim gw-keep"
      style={{ '--gw-d': '2.6s', '--gw-n': 'infinite', animation: 'gw-life 2.6s ease-in-out infinite' }} />,
  ]
}

const ART = { Imite, Vote, Survis }

export default function RuleArt({ rule }) {
  const Art = ART[rule]
  if (!Art) return null
  return (
    <svg aria-hidden width={W * P} height={H * P} viewBox={`0 0 ${W * P} ${H * P}`} style={{ display: 'block', marginBottom: 12, overflow: 'visible' }}>
      <Art />
    </svg>
  )
}
