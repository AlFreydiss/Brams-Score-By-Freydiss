// ── Brams Arcade — hub de tous les jeux développés par Freydiss ──────────────
// « La Taverne de l'Arcade » : salle de jeux pirate de nuit. Braises d'or en
// canvas, hero feuille dorée, bandeau vedette rotatif (plateaux animés + podium
// live), deck de cartes tilt 3D + spotlight, bandeau EN DIRECT (données réelles).
import { Link, useNavigate } from 'react-router-dom'
import { useTeleport } from '../features/nouveau-monde/transition/TeleportTransition.jsx'
import { cc } from '../games/chess/ui/chesscom.js' // vert chess.com partagé avec l'univers Échecs
import AmbianceCanvas from './gameshub/AmbianceCanvas.jsx'
import TiltCard from './gameshub/TiltCard.jsx'
import FeaturedShowcase from './gameshub/FeaturedShowcase.jsx'
import LiveStrip from './gameshub/LiveStrip.jsx'
import { useArcadeLive } from './gameshub/liveData.js'

// Jeux ayant une île dans Le Nouveau Monde : clic carte → téléportation → page d'île.
const ISLAND_OF = {
  '/echecs': 'echecs', '/dames': 'dames', '/fredisu.html': 'fredisu',
  '/blind-test': 'blind-test', '/brams-phone': 'brams-phone',
}

const GOLD = '#d4a017'
const GOLD_HI = '#f0d27a'
const BG = '#08090d'

// `caps` = badges capacités (chips sobres) ; `preview` = mini-aperçu de plateau SVG (échecs/dames).
const GAMES = [
  { to: '/fredisu.html', external: true, emoji: '🎯', title: "Fred'isu", tag: 'Rythme', accent: '#d4a017',
    desc: "Rhythm game façon osu! : importe un MP3/MP4, la map se génère par analyse du son calée sur le BPM. Cercles, sliders, spinners, mods HD/HR/DT/FL, leaderboard mondial.",
    caps: ['En ligne classé'] },
  { to: '/monopoly/', external: true, emoji: '🎩', title: 'Bramsopoly', tag: 'Plateau', accent: '#BFA46A',
    desc: "Le Monopoly du serveur : château de la Reine Amel, palais du Prince Charles, cachot de Carton… et le Bourreau Freydiss qui t'attend au coin maudit. Loyers, forteresses, bots IA, faillites.",
    caps: ['IA', '2 joueurs'] },
  { to: '/brams-phone', emoji: '🎨', title: 'Freydiss Phone', tag: 'Multijoueur', accent: '#2f9e8c',
    desc: "Téléphone arabe version pirate. Une phrase → un dessin → une devinette… la chaîne dérive entre potes, en direct. Canvas complet, reveal cinématique et réactions emojis en live.",
    caps: ['2 joueurs'] },
  { to: '/jeux/dames', emoji: '🔴', title: 'Dames',      tag: 'Classé · ELO', accent: '#6f8fb0',
    desc: "Dames internationales 10×10 (rafle maximale, dames volantes). Local, vs IA (4 niveaux) ou en ligne classé avec ELO — un vrai site de dames.",
    caps: ['IA', '2 joueurs', 'En ligne classé'], preview: 'dames' },
  { to: '/undercover', emoji: '🕵️', title: 'Undercover', tag: 'Multijoueur', accent: '#5fb88a',
    desc: "Le jeu d'imposteur de la communauté. Reçois ton mot secret, bluffe, démasque l'intrus avant qu'il ne gagne.",
    caps: ['2 joueurs'] },
  { to: '/blind-test', emoji: '🎧', title: 'Blind Test', tag: 'Musique',     accent: '#74a7c4',
    desc: "Reconnais l'opening le plus vite possible. Combo, score, classement — montre que tu connais tes animés par cœur.",
    caps: ['En ligne classé'] },
  { to: '/tournoi',    emoji: '⚔️', title: 'Tournoi',    tag: 'Bracket',     accent: '#c9952a',
    desc: "Brackets d'openings, d'OST et d'endings. Vote à chaque duel, élimine, couronne le champion ultime de la communauté.",
    caps: ['2 joueurs'] },
  { to: '/jeux/echecs', emoji: '♟️', title: 'Échecs',    tag: 'Stratégie',   accent: cc.green,
    desc: "Le jeu de rois. Stockfish multi-niveaux, eval bar, analyse, classement ELO — un vrai site d'échecs, sobre et complet.",
    caps: ['IA', '2 joueurs', 'En ligne classé'], preview: 'chess' },
  { to: '/akinator',   emoji: '🔮', title: 'Akinator',   tag: 'IA',          accent: '#c77dc4',
    desc: "Pense à un personnage (anime, jeu, célébrité…) et laisse l'IA le deviner en quelques questions.",
    caps: ['IA'] },
]

// Les 3 jeux mis en scène dans le bandeau vedette (rotation auto).
const FEATURED = [
  { id: 'echecs',  ...GAMES.find(g => g.to === '/jeux/echecs') },
  { id: 'dames',   ...GAMES.find(g => g.to === '/jeux/dames') },
  { id: 'fredisu', ...GAMES.find(g => g.to === '/fredisu.html') },
]

const CSS = `
  /* Accent par jeu piloté via --gh-accent/--gh-bd/--gh-glow/--gh-ring (inline) :
     hover + focus-visible suivent la couleur de la carte. Border/shadow de repos
     vivent ICI (pas en inline) sinon les règles :hover perdraient contre le style inline. */
  .gh-card{border:1px solid var(--gh-bd,rgba(255,255,255,.1));box-shadow:0 14px 40px rgba(0,0,0,.4);transition:transform .18s cubic-bezier(.2,.7,.3,1),border-color .18s,box-shadow .18s,background .18s;outline:none}
  .gh-card:hover,.gh-card:focus-visible{transform:translateY(-4px);border-color:var(--gh-bd-hover,rgba(255,255,255,.18));box-shadow:0 18px 46px -14px rgba(0,0,0,.55),0 10px 32px -16px var(--gh-glow,rgba(255,255,255,.1)),inset 0 0 0 1px var(--gh-ring,transparent)}
  .gh-card:focus-visible{outline:2px solid var(--gh-accent,#d4a017);outline-offset:3px}
  .gh-card:hover .gh-play,.gh-card:focus-visible .gh-play{transform:translateX(3px)}
  .gh-play{transition:transform .18s ease}
  .gh-emoji{transition:transform .3s cubic-bezier(.2,.7,.3,1)}
  .gh-card:hover .gh-emoji,.gh-card:focus-visible .gh-emoji{transform:scale(1.12) rotate(-6deg)}
  /* Mini-aperçu de plateau : la pièce .ghp-anim joue un coup au hover/focus,
     déplacement propre à chaque jeu via --ghp-move (unités = user units du viewBox SVG). */
  .ghp-anim{transition:transform .45s cubic-bezier(.3,.8,.3,1)}
  .gh-card:hover .ghp-anim,.gh-card:focus-visible .ghp-anim{transform:var(--ghp-move,none)}
  @keyframes gh-fade{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
  /* Titre feuille d'or : vacillement de lanterne très subtil (halo qui respire). */
  @keyframes gh-lantern{0%,100%{filter:drop-shadow(0 2px 26px rgba(212,160,23,.30))}42%{filter:drop-shadow(0 2px 34px rgba(212,160,23,.44))}58%{filter:drop-shadow(0 2px 22px rgba(212,160,23,.26))}}
  .gh-title{animation:gh-lantern 5.2s ease-in-out infinite}
  @media (prefers-reduced-motion:reduce){
    .gh-card{animation:none!important}
    .gh-title{animation:none}
    .gh-card,.gh-play,.gh-emoji,.ghp-anim{transition:none}
    .gh-card:hover,.gh-card:focus-visible,
    .gh-card:hover .gh-play,.gh-card:focus-visible .gh-play,
    .gh-card:hover .gh-emoji,.gh-card:focus-visible .gh-emoji,
    .gh-card:hover .ghp-anim,.gh-card:focus-visible .ghp-anim{transform:none}
  }
`

function GameCard({ g, i }) {
  const cardStyle = {
    // Variables consommées par .gh-card / :hover / :focus-visible (CSS) pour suivre l'accent du jeu.
    // border/boxShadow volontairement PAS en inline (voir commentaire du bloc CSS).
    '--gh-accent': g.accent,
    '--gh-bd': `${g.accent}33`,
    '--gh-bd-hover': `${g.accent}88`,
    '--gh-glow': `${g.accent}40`,
    '--gh-ring': `${g.accent}55`,
    position: 'relative', display: 'flex', flexDirection: 'column', gap: 12, textDecoration: 'none',
    height: '100%', boxSizing: 'border-box',
    padding: '22px 22px 20px', borderRadius: 18,
    background: `linear-gradient(165deg, ${g.accent}14, rgba(255,255,255,0.012) 55%)`,
    animation: `gh-fade .5s ease ${0.05 * i}s both`,
    minHeight: 168,
  }
  const inner = (
    <>
      <span style={{ position: 'absolute', top: 16, right: 16, fontSize: 10, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: g.accent, background: `${g.accent}1a`, border: `1px solid ${g.accent}44`, padding: '4px 10px', borderRadius: 999 }}>{g.tag}</span>
      <span aria-hidden="true" className="gh-emoji" style={{ fontSize: 40, lineHeight: 1, filter: `drop-shadow(0 6px 18px ${g.accent}55)` }}>{g.emoji}</span>
      <div style={{ fontSize: 21, fontWeight: 900, color: '#fff', letterSpacing: '-.01em' }}>{g.title}</div>
      <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55, color: 'rgba(236,232,223,0.62)', flex: 1 }}>{g.desc}</p>
      {g.preview === 'chess' && <ChessPreview />}
      {g.preview === 'dames' && <DamesPreview />}
      <Caps caps={g.caps} />
      <span className="gh-play" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 800, color: g.accent }}>
        Jouer <span aria-hidden="true" style={{ fontSize: 16 }}>→</span>
      </span>
    </>
  )
  const navigate = useNavigate()
  const { teleport } = useTeleport()
  const islandId = ISLAND_OF[g.to]

  // Jeu avec île au Nouveau Monde : clic → téléportation marine → page d'île (accostage).
  if (islandId) {
    return (
      <button
        type="button"
        className="gh-card"
        style={{ ...cardStyle, textAlign: 'left', cursor: 'pointer', font: 'inherit', width: '100%', appearance: 'none' }}
        onClick={() => teleport(islandId, () => navigate(`/nouveau-monde/${islandId}`))}
      >
        {inner}
      </button>
    )
  }
  // Univers de jeu (/jeux/*) : morph « shared-element » — on transmet le point cliqué
  // pour que l'univers grandisse depuis la carte (transform-origin, voir GameUniverse).
  if (g.to.startsWith('/jeux/')) {
    const ouvrir = (e) => {
      const r = e.currentTarget.getBoundingClientRect()
      navigate(g.to, { state: { gameOrigin: { x: r.left + r.width / 2, y: r.top + r.height / 2 } } })
    }
    return (
      <button
        type="button"
        className="gh-card"
        style={{ ...cardStyle, textAlign: 'left', cursor: 'pointer', font: 'inherit', width: '100%', appearance: 'none' }}
        onClick={ouvrir}
      >
        {inner}
      </button>
    )
  }
  // Jeu externe (Fred'isu = page statique autonome) → vraie navigation top-level,
  // pas d'iframe SPA (audio/pointer/fullscreen marchent mal embarqués).
  return g.external
    ? <a href={g.to} className="gh-card" style={cardStyle}>{inner}</a>
    : <Link to={g.to} className="gh-card" style={cardStyle}>{inner}</Link>
}

export default function GamesHubPage() {
  const navigate = useNavigate()
  const { teleport } = useTeleport()
  const live = useArcadeLive()

  // CTA du bandeau vedette : mêmes chemins que les cartes (morph /jeux/*, île pour fredisu).
  const jouerVedette = (game, e) => {
    if (game.id === 'fredisu') {
      teleport('fredisu', () => navigate('/nouveau-monde/fredisu'))
      return
    }
    const r = e.currentTarget.getBoundingClientRect()
    navigate(game.to, { state: { gameOrigin: { x: r.left + r.width / 2, y: r.top + r.height / 2 } } })
  }

  return (
    <div style={{ minHeight: '100vh', background: BG, color: '#ece8df', paddingTop: 84 }}>
      <style>{CSS}</style>
      {/* Décor doré discret + braises d'ambiance (même zIndex 0 : l'ordre DOM superpose) */}
      <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', background: `
        radial-gradient(860px 520px at 14% -8%, rgba(212,160,23,0.12), transparent 60%),
        radial-gradient(720px 480px at 92% 4%, rgba(212,160,23,0.07), transparent 62%),
        linear-gradient(180deg, #08090d 0%, #0b0a0e 60%, #08090d 100%)` }} />
      <AmbianceCanvas />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1240, margin: '0 auto', padding: '0 clamp(16px,3vw,28px) 90px' }}>
        {/* Hero */}
        <header style={{ textAlign: 'center', margin: '0 0 30px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 14, animation: 'gh-fade .5s ease both' }}>
            <span aria-hidden style={{ width: 54, height: 1, background: `linear-gradient(90deg, transparent, ${GOLD}66)` }} />
            <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.24em', textTransform: 'uppercase', color: GOLD }}><span aria-hidden="true">🏴‍☠️</span> Brams Arcade</span>
            <span aria-hidden style={{ width: 54, height: 1, background: `linear-gradient(90deg, ${GOLD}66, transparent)` }} />
          </div>
          <h1 className="gh-title" style={{
            margin: 0, fontFamily: "'Pirata One', serif", fontSize: 'clamp(40px,6.4vw,74px)', fontWeight: 400,
            lineHeight: 1.02, animation: 'gh-fade .55s ease .06s both',
            background: `linear-gradient(180deg, #f8ecc2 0%, ${GOLD_HI} 34%, #c08a12 58%, #8a5f0a 74%, ${GOLD_HI} 100%)`,
            WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
          }}>
            Les Jeux de la Communauté
          </h1>
          <p style={{ margin: '14px auto 0', maxWidth: 600, fontSize: 15, lineHeight: 1.6, color: 'rgba(236,232,223,0.6)', animation: 'gh-fade .55s ease .12s both' }}>
            Tous les jeux développés par <strong style={{ color: GOLD_HI }}>Freydiss</strong> pour la Brams Community. Joue, grimpe au classement, deviens une légende. <span aria-hidden="true">🏆</span>
          </p>
          <div style={{ display: 'inline-flex', gap: 18, marginTop: 20, flexWrap: 'wrap', justifyContent: 'center', animation: 'gh-fade .55s ease .18s both' }}>
            <Stat n={GAMES.length} label="jeux" />
            <Stat n="100%" label="maison" />
            <Stat n="∞" label="parties" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 18, animation: 'gh-fade .55s ease .24s both' }}>
            <LiveStrip voice={live.voice} echecsTop={live.echecsTop} damesTop={live.damesTop} />
          </div>
        </header>

        {/* Bandeau vedette rotatif (plateaux animés + podium live) */}
        <div style={{ marginBottom: 34, animation: 'gh-fade .55s ease .28s both' }}>
          <FeaturedShowcase
            games={FEATURED}
            onPlay={jouerVedette}
            podiums={{ echecs: live.echecsTop, dames: live.damesTop }}
          />
        </div>

        {/* Deck complet */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '0 0 18px' }}>
          <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '.22em', textTransform: 'uppercase', color: GOLD }}>Toute la flotte</span>
          <span aria-hidden style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${GOLD}44, transparent)` }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 18 }}>
          {GAMES.map((g, i) => (
            <TiltCard key={g.to} accent={g.accent}>
              <GameCard g={g} i={i} />
            </TiltCard>
          ))}
        </div>

        <p style={{ textAlign: 'center', marginTop: 40, fontSize: 12.5, color: 'rgba(236,232,223,0.34)' }}>
          Conçus et codés par Al Freydiss · Brams Community <span aria-hidden="true">🏴‍☠️</span>
        </p>
      </div>
    </div>
  )
}

function Stat({ n, label }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 26, fontWeight: 900, color: GOLD_HI, lineHeight: 1 }}>{n}</div>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(236,232,223,0.4)', marginTop: 4 }}>{label}</div>
    </div>
  )
}

// ── Badges capacités (chips sobres, mêmes libellés partout : IA / 2 joueurs / En ligne classé) ──
function Caps({ caps }) {
  if (!caps || !caps.length) return null
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {caps.map(c => (
        <span key={c} style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'rgba(236,232,223,0.62)', background: 'rgba(255,255,255,0.045)', border: '1px solid rgba(255,255,255,0.12)', padding: '3px 9px', borderRadius: 999, whiteSpace: 'nowrap' }}>{c}</span>
      ))}
    </div>
  )
}

// ── Mini-aperçus de plateau (SVG pur inline : aucun asset externe, aucun composant de jeu) ────
// Bande 7×3 de cases de 24 unités ; la pièce marquée .ghp-anim joue un coup au hover/focus
// de la carte (--ghp-move consommé par le CSS, coupé par prefers-reduced-motion).
const BOARD_STYLE = { width: '100%', height: 'auto', display: 'block', borderRadius: 10, border: '1px solid rgba(255,255,255,0.09)', boxShadow: '0 10px 24px rgba(0,0,0,.35)' }

function Cells({ light, dark }) {
  const out = []
  for (let r = 0; r < 3; r++) for (let c = 0; c < 7; c++)
    out.push(<rect key={`${c}-${r}`} x={c * 24} y={r * 24} width={24} height={24} fill={(c + r) % 2 ? dark : light} />)
  return out
}

// Échiquier vert/crème (palette chess.com) — pièces en silhouettes SVG (pas de glyphes Unicode,
// rendu emoji imprévisible selon l'OS). Le pion blanc avance d'une case au hover.
function ChessPreview() {
  const w = { fill: '#f9f9f9', stroke: '#43403a', strokeWidth: 1, strokeLinejoin: 'round' }
  const b = { fill: '#3f3d3b', stroke: '#211f1d', strokeWidth: 1, strokeLinejoin: 'round' }
  return (
    <svg viewBox="0 0 168 72" aria-hidden="true" focusable="false" style={BOARD_STYLE}>
      <Cells light="#EBECD0" dark="#739552" />
      {/* Tour noire (a-file) */}
      <path {...b} d="M8 19v-5.6h1.1V11h2v1.6h1.8V11h2v2.4H16V19z" />
      {/* Dame noire */}
      <g transform="translate(96,0)">
        <path {...b} d="M6.9 18.6 8.1 11.7l2.9 3.3L12 9.7l1 5.3 2.9-3.3 1.2 6.9z" />
        <circle {...b} cx="8" cy="10.4" r="1.1" /><circle {...b} cx="12" cy="8.4" r="1.1" /><circle {...b} cx="16" cy="10.4" r="1.1" />
      </g>
      {/* Pion blanc — g externe = position (attr), g interne = coup joué (CSS, sinon le
          transform CSS écraserait l'attribut transform de position) */}
      <g transform="translate(72,48)">
        <g className="ghp-anim" style={{ '--ghp-move': 'translateY(-24px)' }}>
          <circle {...w} cx="12" cy="8.8" r="3.2" />
          <path {...w} d="M8.7 19.2c.2-3.6 1.5-5.7 3.3-6.9 1.8 1.2 3.1 3.3 3.3 6.9z" />
          <rect {...w} x="7.7" y="18.5" width="8.6" height="1.9" rx=".95" />
        </g>
      </g>
    </svg>
  )
}

function Pion({ x, y, dark, anim }) {
  const s = dark
    ? { fill: '#3a2f28', stroke: '#201914' }
    : { fill: '#f2e7cf', stroke: '#b09a6d' }
  const ring = dark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.18)'
  const disc = (
    <>
      <circle cx="12" cy="12" r="8" strokeWidth="1.2" {...s} />
      <circle cx="12" cy="12" r="4.6" fill="none" stroke={ring} strokeWidth="1.1" />
    </>
  )
  return (
    <g transform={`translate(${x * 24},${y * 24})`}>
      {anim ? <g className="ghp-anim" style={{ '--ghp-move': 'translate(24px,-24px)' }}>{disc}</g> : disc}
    </g>
  )
}

// Damier bois avec pions — le pion clair glisse en diagonale au hover.
function DamesPreview() {
  return (
    <svg viewBox="0 0 168 72" aria-hidden="true" focusable="false" style={BOARD_STYLE}>
      <Cells light="#e3c193" dark="#9c6b43" />
      <Pion x={1} y={0} dark /><Pion x={3} y={0} dark /><Pion x={5} y={0} dark />
      <Pion x={1} y={2} /><Pion x={5} y={2} />
      <Pion x={3} y={2} anim />
    </svg>
  )
}
