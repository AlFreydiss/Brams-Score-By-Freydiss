// ── Brams Arcade — hub de tous les jeux développés par Freydiss ──────────────
// Page de présentation premium (dark/or) qui regroupe Undercover, Blind Test,
// Tournoi, Fred'isu (rhythm game), Dames classées, Échecs, Akinator.
import { Link } from 'react-router-dom'

const GOLD = '#d4a017'
const GOLD_HI = '#f0d27a'
const BG = '#08090d'

const GAMES = [
  { to: '/fredisu.html', external: true, emoji: '🎯', title: "Fred'isu", tag: 'Rythme', accent: '#d4a017',
    desc: "Rhythm game façon osu! : importe un MP3/MP4, la map se génère par analyse du son calée sur le BPM. Cercles, sliders, spinners, mods HD/HR/DT/FL, leaderboard mondial.", featured: true },
  { to: '/dames',      emoji: '🔴', title: 'Dames',      tag: 'Classé · ELO', accent: '#e0524a',
    desc: "Dames internationales 10×10 (rafle maximale, dames volantes). Local, vs IA (4 niveaux) ou en ligne classé avec ELO et primes One Piece." },
  { to: '/undercover', emoji: '🕵️', title: 'Undercover', tag: 'Multijoueur', accent: '#5fb88a',
    desc: "Le jeu d'imposteur de la communauté. Reçois ton mot secret, bluffe, démasque l'intrus avant qu'il ne gagne." },
  { to: '/blind-test', emoji: '🎧', title: 'Blind Test', tag: 'Musique',     accent: '#74a7c4',
    desc: "Reconnais l'opening le plus vite possible. Combo, score, classement — montre que tu connais tes animés par cœur." },
  { to: '/tournoi',    emoji: '⚔️', title: 'Tournoi',    tag: 'Bracket',     accent: '#c9952a',
    desc: "Brackets d'openings, d'OST et d'endings. Vote à chaque duel, élimine, couronne le champion ultime de la communauté." },
  { to: '/echecs',     emoji: '♟️', title: 'Échecs',     tag: 'Stratégie',   accent: '#9b6cff',
    desc: "Le jeu de rois. Affronte un nakama ou l'ordinateur sur un échiquier soigné." },
  { to: '/akinator',   emoji: '🔮', title: 'Akinator',   tag: 'IA',          accent: '#c77dc4',
    desc: "Pense à un personnage (anime, jeu, célébrité…) et laisse l'IA le deviner en quelques questions." },
]

const CSS = `
  .gh-card{transition:transform .22s cubic-bezier(.2,.7,.3,1),border-color .22s,box-shadow .22s,background .22s}
  .gh-card:hover{transform:translateY(-5px)}
  .gh-card:hover .gh-play{transform:translateX(3px)}
  .gh-play{transition:transform .2s ease}
  .gh-emoji{transition:transform .3s cubic-bezier(.2,.7,.3,1)}
  .gh-card:hover .gh-emoji{transform:scale(1.12) rotate(-6deg)}
  @keyframes gh-fade{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
  @media (prefers-reduced-motion:reduce){.gh-card,.gh-card:hover,.gh-emoji,.gh-play{transition:none;transform:none;animation:none}}
`

function GameCard({ g, i }) {
  const cardStyle = {
    position: 'relative', display: 'flex', flexDirection: 'column', gap: 12, textDecoration: 'none',
    gridColumn: g.featured ? 'span 2' : 'span 1',
    padding: g.featured ? '26px 26px 24px' : '22px 22px 20px', borderRadius: 18,
    background: `linear-gradient(165deg, ${g.accent}14, rgba(255,255,255,0.012) 55%)`,
    border: `1px solid ${g.accent}33`,
    boxShadow: '0 14px 40px rgba(0,0,0,.4)',
    animation: `gh-fade .5s ease ${0.05 * i}s both`,
    minHeight: g.featured ? 200 : 168,
  }
  const inner = (
    <>
      <span style={{ position: 'absolute', top: 16, right: 16, fontSize: 10, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: g.accent, background: `${g.accent}1a`, border: `1px solid ${g.accent}44`, padding: '4px 10px', borderRadius: 999 }}>{g.tag}</span>
      <span className="gh-emoji" style={{ fontSize: g.featured ? 52 : 40, lineHeight: 1, filter: `drop-shadow(0 6px 18px ${g.accent}55)` }}>{g.emoji}</span>
      <div style={{ fontSize: g.featured ? 26 : 21, fontWeight: 900, color: '#fff', letterSpacing: '-.01em' }}>{g.title}</div>
      <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55, color: 'rgba(236,232,223,0.62)', flex: 1, maxWidth: g.featured ? 520 : 'none' }}>{g.desc}</p>
      <span className="gh-play" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 800, color: g.accent }}>
        Jouer <span style={{ fontSize: 16 }}>→</span>
      </span>
    </>
  )
  // Jeu externe (Fred'isu = page statique autonome) → vraie navigation top-level,
  // pas d'iframe SPA (audio/pointer/fullscreen marchent mal embarqués).
  return g.external
    ? <a href={g.to} className="gh-card" style={cardStyle}>{inner}</a>
    : <Link to={g.to} className="gh-card" style={cardStyle}>{inner}</Link>
}

export default function GamesHubPage() {
  return (
    <div style={{ minHeight: '100vh', background: BG, color: '#ece8df', paddingTop: 84 }}>
      <style>{CSS}</style>
      {/* Décor doré discret */}
      <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', background: `
        radial-gradient(860px 520px at 14% -8%, rgba(212,160,23,0.12), transparent 60%),
        radial-gradient(720px 480px at 92% 4%, rgba(212,160,23,0.07), transparent 62%),
        linear-gradient(180deg, #08090d 0%, #0b0a0e 60%, #08090d 100%)` }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1180, margin: '0 auto', padding: '0 clamp(16px,3vw,28px) 90px' }}>
        {/* Hero */}
        <header style={{ textAlign: 'center', margin: '0 0 28px' }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.24em', textTransform: 'uppercase', color: GOLD, marginBottom: 12 }}>🏴‍☠️ Brams Arcade</div>
          <h1 style={{ margin: 0, fontFamily: "'Pirata One', serif", fontSize: 'clamp(38px,6vw,68px)', fontWeight: 400, lineHeight: 1.02, color: '#f4ecd8', textShadow: '0 2px 40px rgba(212,160,23,0.2)' }}>
            Les Jeux de la Communauté
          </h1>
          <p style={{ margin: '14px auto 0', maxWidth: 600, fontSize: 15, lineHeight: 1.6, color: 'rgba(236,232,223,0.6)' }}>
            Tous les jeux développés par <strong style={{ color: GOLD_HI }}>Freydiss</strong> pour la Brams Community. Joue, grimpe au classement, deviens une légende. 🏆
          </p>
          <div style={{ display: 'inline-flex', gap: 18, marginTop: 22, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Stat n={GAMES.length} label="jeux" />
            <Stat n="100%" label="maison" />
            <Stat n="∞" label="parties" />
          </div>
        </header>

        {/* Grille de jeux */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {GAMES.map((g, i) => <GameCard key={g.to} g={g} i={i} />)}
        </div>

        <p style={{ textAlign: 'center', marginTop: 40, fontSize: 12.5, color: 'rgba(236,232,223,0.34)' }}>
          Conçus et codés par Al Freydiss · Brams Community 🏴‍☠️
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
