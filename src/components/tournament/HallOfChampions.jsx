import { useMemo, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

// ── Hall des Champions ──────────────────────────────────────────────────────
// Podium des tournois. Un tournoi terminé donne un CHAMPION (le vainqueur de la
// finale) ; un tournoi encore en cours donne son MENEUR (le participant avec le
// plus de duels gagnés). Les deux sont étiquetés différemment — annoncer un
// meneur comme champion serait faux, et le podium se remplit quand même.
//
// Un tournoi jamais lancé n'apparaît pas : trois socles vides ne racontent rien.

const CSS = `
  @keyframes hcBeam   { 0%,100%{opacity:.28; transform:translateX(-50%) rotate(-3deg) scaleY(1)} 50%{opacity:.6; transform:translateX(-50%) rotate(3deg) scaleY(1.06)} }
  @keyframes hcCrown  { 0%,100%{transform:translateY(0) rotate(-5deg)} 50%{transform:translateY(-7px) rotate(5deg)} }
  @keyframes hcShine  { 0%{transform:translateX(-140%) skewX(-18deg)} 60%,100%{transform:translateX(320%) skewX(-18deg)} }
  @keyframes hcGlow   { 0%,100%{opacity:.4} 50%{opacity:.85} }
  @keyframes hcConf   { 0%{transform:translate3d(0,0,0) rotate(0deg); opacity:1} 100%{transform:translate3d(var(--cx,0px),var(--cy,140px),0) rotate(var(--cr,220deg)); opacity:0} }
  @media (prefers-reduced-motion: reduce){ [data-hcfx]{animation:none!important} }
`

const RANK_META = [
  { rank: 1, height: 132, medal: '👑', tone: '#f5c542', label: 'Or' },
  { rank: 2, height: 92,  medal: '🥈', tone: '#cbd5e1', label: 'Argent' },
  { rank: 3, height: 70,  medal: '🥉', tone: '#d08a4e', label: 'Bronze' },
]

// Confettis maison : quelques <span> jetés une seule fois quand la section
// entre à l'écran. Pas de librairie pour 18 particules.
function Confetti({ fire, tone }) {
  const bits = useMemo(() => Array.from({ length: 18 }, (_, i) => ({
    x: (i * 37) % 100,
    cx: (((i * 53) % 90) - 45) + 'px',
    cy: (90 + (i * 17) % 110) + 'px',
    cr: (((i * 71) % 400) - 200) + 'deg',
    dur: 1.1 + ((i * 13) % 9) / 10,
    del: ((i * 7) % 6) / 10,
    color: i % 3 === 0 ? tone : i % 3 === 1 ? '#f9a8d4' : '#9d5aff',
    w: i % 4 === 0 ? 3 : 5,
    h: i % 4 === 0 ? 8 : 5,
  })), [tone])

  if (!fire) return null
  return (
    <div aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {bits.map((b, i) => (
        <span key={i} data-hcfx style={{
          position: 'absolute', left: b.x + '%', top: -8,
          width: b.w, height: b.h, borderRadius: 1, background: b.color,
          '--cx': b.cx, '--cy': b.cy, '--cr': b.cr,
          animation: 'hcConf ' + b.dur + 's ' + b.del + 's ease-in forwards',
        }} />
      ))}
    </div>
  )
}

function ChampionPlinth({ read, meta, index, accentA }) {
  const navigate = useNavigate()
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const leader = read.leader
  const tone = leader?.color || meta.tone
  const isChampion = read.finished

  function onMove(e) {
    const r = e.currentTarget.getBoundingClientRect()
    setTilt({
      x: ((e.clientY - r.top) / r.height - 0.5) * -8,
      y: ((e.clientX - r.left) / r.width - 0.5) * 8,
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ delay: index * 0.12, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      style={{
        flex: meta.rank === 1 ? '1 1 300px' : '1 1 230px',
        maxWidth: meta.rank === 1 ? 380 : 300,
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      }}
    >
      {/* Carte */}
      <motion.div
        onMouseMove={onMove}
        onMouseLeave={() => setTilt({ x: 0, y: 0 })}
        onClick={() => read.config.route && navigate(read.config.route)}
        animate={{ rotateX: tilt.x, rotateY: tilt.y }}
        transition={{ type: 'spring', stiffness: 220, damping: 18 }}
        style={{
          position: 'relative', overflow: 'hidden',
          padding: meta.rank === 1 ? '26px 22px 24px' : '20px 18px 18px',
          borderRadius: 18, cursor: read.config.route ? 'pointer' : 'default',
          transformStyle: 'preserve-3d', transformPerspective: 900,
          background: 'linear-gradient(160deg,' + tone + '26 0%, rgba(9,7,13,.97) 72%)',
          border: '1px solid ' + tone + '3d',
          borderTop: '2px solid ' + tone + 'cc',
          boxShadow: meta.rank === 1
            ? '0 20px 60px rgba(0,0,0,.55), 0 0 50px ' + tone + '2e'
            : '0 12px 36px rgba(0,0,0,.45)',
        }}
      >
        {/* Reflet qui traverse la carte */}
        <div data-hcfx aria-hidden style={{
          position: 'absolute', top: 0, bottom: 0, width: '35%',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.10), transparent)',
          animation: 'hcShine ' + (5 + index) + 's ease-in-out infinite',
          animationDelay: index * 0.7 + 's', pointerEvents: 'none',
        }} />

        {/* Médaille */}
        <div style={{
          fontSize: meta.rank === 1 ? 40 : 28, lineHeight: 1, marginBottom: 12,
          filter: 'drop-shadow(0 0 14px ' + tone + '99)',
          animation: meta.rank === 1 ? 'hcCrown 3.4s ease-in-out infinite' : 'none',
        }} data-hcfx={meta.rank === 1 ? '' : undefined}>
          {meta.medal}
        </div>

        {/* Étiquette honnête : champion vs meneur */}
        <span style={{
          display: 'inline-block', marginBottom: 10,
          fontSize: 8, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase',
          padding: '3px 9px', borderRadius: 6,
          background: isChampion ? tone + '26' : 'rgba(255,255,255,.05)',
          border: '1px solid ' + (isChampion ? tone + '59' : 'rgba(255,255,255,.10)'),
          color: isChampion ? tone : 'rgba(255,255,255,.4)',
        }}>
          {isChampion ? '✦ Champion' : 'En tête'}
        </span>

        <div style={{
          fontFamily: "'Pirata One',cursive",
          fontSize: meta.rank === 1 ? 'clamp(24px,3vw,34px)' : 'clamp(19px,2.2vw,25px)',
          lineHeight: 1.08, color: 'rgba(255,255,255,.95)',
          textShadow: '0 0 26px ' + tone + '66', marginBottom: 6,
        }}>
          {leader.title}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', marginBottom: 2 }}>
          {leader.anime}
        </div>
        {leader.artist && (
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,.24)' }}>{leader.artist}</div>
        )}

        <div style={{
          marginTop: 14, paddingTop: 12, borderTop: '1px solid ' + tone + '1f',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
        }}>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,.3)', letterSpacing: '.06em' }}>
            {read.config.categoryLabel || read.config.title}
          </span>
          <span style={{ fontSize: 10, fontWeight: 800, color: tone }}>
            {read.leaderWins} duel{read.leaderWins > 1 ? 's' : ''} gagné{read.leaderWins > 1 ? 's' : ''}
          </span>
        </div>
      </motion.div>

      {/* Socle */}
      <motion.div
        initial={{ height: 0 }}
        whileInView={{ height: meta.height }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ delay: 0.2 + index * 0.12, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        style={{
          marginTop: 10, borderRadius: '10px 10px 4px 4px',
          background: 'linear-gradient(180deg,' + tone + '2e 0%, rgba(255,255,255,.03) 55%, rgba(0,0,0,.25) 100%)',
          border: '1px solid ' + tone + '26', borderBottom: 'none',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <span style={{
          fontFamily: "'Pirata One',cursive", fontSize: 42, lineHeight: 1,
          marginTop: 10, color: tone, opacity: 0.5,
          textShadow: '0 0 22px ' + tone + '80',
        }}>
          {meta.rank}
        </span>
      </motion.div>
    </motion.div>
  )
}

export default function HallOfChampions({ board, accentA = '#e85aa0', accentB = '#9d5aff' }) {
  const navigate = useNavigate()
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, amount: 0.35 })

  // Ordre visuel du podium : 2 — 1 — 3. L'ordre logique reste 1, 2, 3.
  const ordered = useMemo(() => {
    if (!board.length) return []
    const withMeta = board.map((read, i) => ({ read, meta: RANK_META[i] || RANK_META[2], rank: i + 1 }))
    if (withMeta.length === 1) return withMeta
    if (withMeta.length === 2) return [withMeta[1], withMeta[0]]
    return [withMeta[1], withMeta[0], withMeta[2]]
  }, [board])

  return (
    <div ref={ref} style={{ position: 'relative', marginBottom: 76 }}>
      <style>{CSS}</style>

      {/* Projecteur au-dessus du podium */}
      <div data-hcfx aria-hidden style={{
        position: 'absolute', left: '50%', top: -40, width: 'min(520px, 78%)', height: 340,
        transform: 'translateX(-50%)', pointerEvents: 'none',
        background: 'linear-gradient(180deg,' + accentA + '2e 0%, ' + accentA + '0f 42%, transparent 78%)',
        filter: 'blur(26px)', animation: 'hcBeam 8s ease-in-out infinite',
      }} />

      <div style={{ position: 'relative' }}>
        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <div style={{
            fontSize: 9, letterSpacing: '.22em', textTransform: 'uppercase',
            color: 'rgba(255,255,255,.3)', marginBottom: 10,
          }}>
            ✦ Hall des Champions ✦
          </div>
          <h2 style={{
            margin: 0, fontFamily: "'Pirata One',cursive",
            fontSize: 'clamp(30px,5vw,52px)', lineHeight: 1.05,
            background: 'linear-gradient(120deg,#f9a8d4,' + accentA + ' 48%,' + accentB + ')',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            Qui règne sur l’arène
          </h2>
        </div>

        {ordered.length ? (
          <div style={{ position: 'relative' }}>
            <Confetti fire={inView} tone={RANK_META[0].tone} />
            <div style={{
              display: 'flex', gap: 16, flexWrap: 'wrap',
              alignItems: 'flex-end', justifyContent: 'center',
            }}>
              {ordered.map((o, i) => (
                <ChampionPlinth
                  key={o.read.id}
                  read={o.read}
                  meta={o.meta}
                  index={i}
                  accentA={accentA}
                />
              ))}
            </div>
          </div>
        ) : (
          <div style={{
            textAlign: 'center', padding: '46px 24px', borderRadius: 18,
            background: 'linear-gradient(160deg, rgba(157,23,77,.07), rgba(9,7,13,.95))',
            border: '1px dashed rgba(255,255,255,.10)',
          }}>
            <div data-hcfx style={{
              fontSize: 34, marginBottom: 14, opacity: 0.6,
              animation: 'hcGlow 3.5s ease-in-out infinite',
            }}>
              🏆
            </div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,.55)', marginBottom: 8 }}>
              Le podium est encore vide.
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.28)', marginBottom: 22, lineHeight: 1.6 }}>
              Aucun duel n’a été tranché pour l’instant. Ouvre une arène : le premier
              vainqueur monte ici.
            </div>
            <motion.button
              onClick={() => navigate('/tournoi/openings')}
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              style={{
                padding: '12px 28px', borderRadius: 100, border: 'none',
                background: 'linear-gradient(135deg,' + accentA + ',#f06cb5)',
                color: '#1a0011', fontWeight: 800, fontSize: 13, cursor: 'pointer',
                fontFamily: "'Pirata One',cursive",
              }}
            >
              Lancer un bracket
            </motion.button>
          </div>
        )}
      </div>
    </div>
  )
}
