import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { DOUBLAGE_SCENE_COUNT } from '../../data/doublage-count.js'
import { HIGHER_LOWER_POOL, YEAR_RANGE } from '../../data/higher-lower-data.js'
import { SAKUGA_CLIPS, SAKUGA_READY } from '../../data/sakuga-data.js'

// ── Modes de jeu ────────────────────────────────────────────────────────────
// Les formats qui ne sont pas de simples brackets : Doublage (VF ou VOSTFR à
// l'aveugle), Plus vieux / Plus récent, Sakuga. Chaque carte porte un aperçu
// animé qui MONTRE la mécanique du mode — une vignette figée ne dit pas la
// différence entre « écouter deux doublages » et « dater deux animés ».
//
// Les compteurs viennent des catalogues réels ; un mode dont le catalogue est
// vide (Sakuga) reste marqué « bientôt » et n'est pas cliquable.

const CSS = `
  @keyframes gmWaveA  { 0%,100%{transform:scaleY(.25)} 50%{transform:scaleY(1)} }
  @keyframes gmSwap   { 0%,46%{opacity:1} 54%,100%{opacity:.18} }
  @keyframes gmSwapB  { 0%,46%{opacity:.18} 54%,100%{opacity:1} }
  @keyframes gmFault  { 0%,100%{opacity:.4; transform:scaleY(1)} 50%{opacity:1; transform:scaleY(1.14)} }
  @keyframes gmSlide  { from{transform:translateX(0)} to{transform:translateX(-50%)} }
  @keyframes gmScrub  { 0%,100%{left:6%} 50%{left:82%} }
  @keyframes gmFlick  { 0%,100%{opacity:.85} 47%{opacity:.85} 50%{opacity:.35} 53%{opacity:.85} }
  @keyframes gmHalo   { 0%,100%{opacity:.35} 50%{opacity:.75} }
  [data-tkcard]:focus-visible { outline:2px solid #f9a8d4; outline-offset:3px; }
  @media (prefers-reduced-motion: reduce){ [data-gmfx]{animation:none!important} }
`

// ── Aperçu 1 : Doublage — deux pistes qui se relaient ───────────────────────
function DoublagePreview({ hot }) {
  const bars = useMemo(() => Array.from({ length: 26 }, (_, i) => ({
    dur: 0.7 + (i * 0.11) % 0.9, del: (i * 0.07) % 1.1, h: 8 + (i * 11) % 26,
  })), [])
  const speed = hot ? 0.55 : 1

  return (
    <div style={{ position: 'relative', height: 96, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      {/* Piste A */}
      <div data-gmfx style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 34, animation: 'gmSwap 4.2s ease-in-out infinite' }}>
        {bars.map((b, i) => (
          <span key={i} data-gmfx style={{
            flex: 1, height: b.h, borderRadius: 2, transformOrigin: 'bottom',
            background: 'linear-gradient(180deg,#22d3ee,rgba(34,211,238,.15))',
            animation: 'gmWaveA ' + (b.dur * speed) + 's ' + b.del + 's ease-in-out infinite',
          }} />
        ))}
      </div>

      {/* Ligne de faille entre les deux camps */}
      <div data-gmfx style={{
        height: 2, borderRadius: 2, margin: '4px 0',
        background: 'linear-gradient(90deg, transparent, #22d3ee, #f472b6, transparent)',
        boxShadow: '0 0 16px rgba(244,114,182,.5)',
        animation: 'gmFault 2.6s ease-in-out infinite',
      }} />

      {/* Piste B */}
      <div data-gmfx style={{ display: 'flex', alignItems: 'flex-start', gap: 3, height: 34, animation: 'gmSwapB 4.2s ease-in-out infinite' }}>
        {bars.map((b, i) => (
          <span key={i} data-gmfx style={{
            flex: 1, height: b.h, borderRadius: 2, transformOrigin: 'top',
            background: 'linear-gradient(0deg,#f472b6,rgba(244,114,182,.15))',
            animation: 'gmWaveA ' + (b.dur * speed * 1.13) + 's ' + b.del + 's ease-in-out infinite',
          }} />
        ))}
      </div>

      <div style={{
        position: 'absolute', inset: 0, display: 'flex',
        alignItems: 'center', justifyContent: 'space-between',
        fontSize: 9, fontWeight: 800, letterSpacing: '.16em', pointerEvents: 'none',
      }}>
        <span style={{ color: 'rgba(34,211,238,.7)' }}>CAMP A</span>
        <span style={{ color: 'rgba(255,255,255,.28)' }}>À L’AVEUGLE</span>
        <span style={{ color: 'rgba(244,114,182,.7)' }}>CAMP B</span>
      </div>
    </div>
  )
}

// ── Aperçu 2 : Plus vieux / Plus récent — deux dates sur une frise ──────────
// L'année montrée et les bornes de la frise viennent du vrai pool, pas d'un
// exemple inventé : la frise annonce donc l'amplitude réelle du jeu.
const HL_SAMPLE = HIGHER_LOWER_POOL[Math.floor(HIGHER_LOWER_POOL.length / 2)] || null
const HL_MIN = YEAR_RANGE?.min ?? ''
const HL_MAX = YEAR_RANGE?.max ?? ''

function HigherLowerPreview({ hot }) {
  return (
    <div style={{ position: 'relative', height: 96, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{
          flex: 1, textAlign: 'center', padding: '8px 6px', borderRadius: 10,
          background: 'rgba(245,158,11,.10)', border: '1px solid rgba(245,158,11,.28)',
        }}>
          <div style={{ fontFamily: "'Pirata One',cursive", fontSize: 24, color: '#fbbf24', lineHeight: 1 }}>{HL_SAMPLE?.year ?? HL_MIN}</div>
          <div style={{ fontSize: 8, letterSpacing: '.12em', color: 'rgba(255,255,255,.3)', marginTop: 3 }}>CONNU</div>
        </div>
        <div style={{
          fontSize: 10, fontWeight: 800, letterSpacing: '.1em',
          color: 'rgba(255,255,255,.35)', flexShrink: 0,
        }}>
          {hot ? 'PLUS VIEUX ?' : 'VS'}
        </div>
        <div style={{
          flex: 1, textAlign: 'center', padding: '8px 6px', borderRadius: 10,
          background: 'rgba(255,255,255,.04)', border: '1px dashed rgba(255,255,255,.16)',
        }}>
          <div style={{ fontFamily: "'Pirata One',cursive", fontSize: 24, color: 'rgba(255,255,255,.5)', lineHeight: 1 }}>? ? ? ?</div>
          <div style={{ fontSize: 8, letterSpacing: '.12em', color: 'rgba(255,255,255,.3)', marginTop: 3 }}>À DATER</div>
        </div>
      </div>

      {/* Frise + curseur qui balaie */}
      <div style={{ position: 'relative', height: 3, borderRadius: 3, background: 'rgba(255,255,255,.08)' }}>
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 3,
          background: 'linear-gradient(90deg, rgba(245,158,11,.7), rgba(157,90,255,.7))',
          opacity: 0.55,
        }} />
        <span data-gmfx style={{
          position: 'absolute', top: -4, width: 11, height: 11, borderRadius: '50%',
          background: '#fbbf24', boxShadow: '0 0 14px rgba(251,191,36,.8)',
          animation: 'gmScrub ' + (hot ? 2.2 : 4) + 's ease-in-out infinite',
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, color: 'rgba(255,255,255,.24)', letterSpacing: '.1em' }}>
        <span>{HL_MIN}</span><span>{HL_MAX}</span>
      </div>
    </div>
  )
}

// ── Aperçu 3 : Sakuga — bande de pellicule qui défile ───────────────────────
function SakugaPreview({ hot }) {
  const frames = useMemo(() => Array.from({ length: 14 }, (_, i) => i), [])
  return (
    <div style={{ position: 'relative', height: 96, display: 'flex', flexDirection: 'column', justifyContent: 'center', overflow: 'hidden' }}>
      <div data-gmfx style={{
        display: 'flex', gap: 6, width: '200%',
        animation: 'gmSlide ' + (hot ? 6 : 12) + 's linear infinite',
      }}>
        {[...frames, ...frames].map((f, i) => (
          <div key={i} style={{
            flex: '0 0 46px', height: 52, borderRadius: 4,
            background: 'linear-gradient(150deg, rgba(13,148,136,' + (0.35 - (i % 5) * 0.045) + '), rgba(9,7,13,.9))',
            border: '1px solid rgba(45,212,191,.22)',
            position: 'relative',
          }}>
            <span style={{
              position: 'absolute', left: 3, right: 3, top: 3, height: 3,
              borderRadius: 2, background: 'rgba(45,212,191,.28)',
            }} />
            <span style={{
              position: 'absolute', left: 3, right: 3, bottom: 3, height: 3,
              borderRadius: 2, background: 'rgba(45,212,191,.18)',
            }} />
          </div>
        ))}
      </div>
      <div data-gmfx style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'linear-gradient(90deg, rgba(9,7,13,.95), transparent 18%, transparent 82%, rgba(9,7,13,.95))',
        animation: 'gmFlick 3.1s steps(1,end) infinite',
      }} />
      <div style={{
        position: 'absolute', bottom: 0, left: 0, fontSize: 9,
        letterSpacing: '.14em', color: 'rgba(45,212,191,.6)', fontWeight: 800,
      }}>
        {SAKUGA_READY ? SAKUGA_CLIPS.length + ' SÉQUENCES' : 'DÉCOUPAGE EN COURS'}
      </div>
    </div>
  )
}

function ModeCard({ mode, index }) {
  const navigate = useNavigate()
  const [hot, setHot] = useState(false)
  const open = !!mode.route

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ delay: index * 0.09, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      whileHover={open ? { y: -6 } : {}}
      onHoverStart={() => setHot(true)}
      onHoverEnd={() => setHot(false)}
      onClick={() => open && navigate(mode.route)}
      onKeyDown={e => {
        if (!open) return
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(mode.route) }
      }}
      onFocus={() => setHot(true)}
      onBlur={() => setHot(false)}
      role={open ? 'button' : undefined}
      tabIndex={open ? 0 : undefined}
      data-tkcard={open ? '' : undefined}
      aria-label={open ? `Jouer à ${mode.label}` : undefined}
      style={{
        position: 'relative', overflow: 'hidden',
        flex: '1 1 300px', minWidth: 260,
        borderRadius: 20, padding: '24px 22px 22px',
        cursor: open ? 'pointer' : 'default',
        opacity: open ? 1 : 0.72,
        background: 'linear-gradient(160deg,' + mode.color + '1f 0%, rgba(9,7,13,.97) 70%)',
        border: '1px solid ' + mode.color + '2e',
        borderTop: '2px solid ' + mode.color + (open ? 'cc' : '55'),
        boxShadow: hot && open ? '0 18px 50px rgba(0,0,0,.5), 0 0 44px ' + mode.color + '26' : '0 10px 30px rgba(0,0,0,.35)',
        transition: 'box-shadow .3s, border-color .3s',
      }}
    >
      <div data-gmfx aria-hidden style={{
        position: 'absolute', top: -50, left: '50%', transform: 'translateX(-50%)',
        width: '80%', height: 130, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 60% 100% at 50% 0%,' + mode.color + '2e, transparent 72%)',
        animation: 'gmHalo 6s ease-in-out infinite',
      }} />

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 22, filter: 'drop-shadow(0 0 12px ' + mode.color + 'aa)' }}>{mode.icon}</span>
        <span style={{
          fontSize: 8, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase',
          padding: '3px 9px', borderRadius: 6,
          background: open ? mode.color + '1f' : 'rgba(255,255,255,.05)',
          border: '1px solid ' + (open ? mode.color + '47' : 'rgba(255,255,255,.10)'),
          color: open ? mode.color : 'rgba(255,255,255,.35)',
        }}>
          {open ? mode.count : 'Bientôt'}
        </span>
      </div>

      <div style={{
        position: 'relative', fontFamily: "'Pirata One',cursive",
        fontSize: 'clamp(22px,2.6vw,30px)', lineHeight: 1.08,
        color: 'rgba(255,255,255,.95)', marginBottom: 6,
        textShadow: '0 0 24px ' + mode.color + '4d',
      }}>
        {mode.label}
      </div>
      <div style={{ position: 'relative', fontSize: 11.5, color: 'rgba(255,255,255,.32)', lineHeight: 1.6, marginBottom: 18 }}>
        {mode.description}
      </div>

      {/* Aperçu animé de la mécanique */}
      <div style={{
        position: 'relative', padding: '10px 12px', borderRadius: 12,
        background: 'rgba(0,0,0,.35)', border: '1px solid rgba(255,255,255,.06)',
      }}>
        {mode.preview(hot)}
      </div>

      <div style={{
        position: 'relative', marginTop: 16, display: 'flex',
        justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,.22)', letterSpacing: '.06em' }}>
          {mode.tagline}
        </span>
        {open && (
          <motion.span
            animate={{ x: hot ? 4 : 0 }}
            style={{ fontSize: 12, fontWeight: 800, color: mode.color }}
          >
            Jouer →
          </motion.span>
        )}
      </div>
    </motion.div>
  )
}

export default function GameModesShowcase({ accentA = '#e85aa0', accentB = '#9d5aff' }) {
  const modes = [
    {
      id: 'doublage',
      label: 'La Guerre du Doublage',
      icon: '🎙',
      color: '#22d3ee',
      count: DOUBLAGE_SCENE_COUNT + ' extraits',
      tagline: 'Deux camps, aucun indice',
      description: 'La même scène jouée en VF et en VOSTFR. Tu bascules d’un camp à l’autre, tu écoutes, tu tranches — sans savoir laquelle est laquelle.',
      route: '/tournoi/doublage',
      preview: hot => <DoublagePreview hot={hot} />,
    },
    {
      id: 'higherlower',
      label: 'Plus vieux / Plus récent',
      icon: '⏳',
      color: '#f59e0b',
      count: HIGHER_LOWER_POOL.length + ' animés',
      tagline: 'Une frise, aucune pitié',
      description: 'Un animé connu, un animé masqué. Dis simplement lequel est sorti en premier — et enchaîne tant que tu ne te trompes pas.',
      route: '/jeux/plus-ou-moins',
      preview: hot => <HigherLowerPreview hot={hot} />,
    },
    {
      id: 'sakuga',
      label: 'Sakuga',
      icon: '✦',
      color: '#2dd4bf',
      count: SAKUGA_CLIPS.length + ' séquences',
      tagline: 'On juge l’image, pas le son',
      description: 'Les meilleures séquences d’animation en 1v1, sans musique : seule la qualité du mouvement compte.',
      route: SAKUGA_READY ? '/tournoi/sakuga' : null,
      preview: hot => <SakugaPreview hot={hot} />,
    },
  ]

  return (
    <div style={{ position: 'relative', marginBottom: 76 }}>
      <style>{CSS}</style>

      <div style={{ textAlign: 'center', marginBottom: 30 }}>
        <div style={{
          fontSize: 9, letterSpacing: '.22em', textTransform: 'uppercase',
          color: 'rgba(255,255,255,.3)', marginBottom: 10,
        }}>
          ▚ Modes de jeu ▚
        </div>
        <h2 style={{
          margin: '0 0 10px', fontFamily: "'Pirata One',cursive",
          fontSize: 'clamp(28px,4.6vw,46px)', lineHeight: 1.05,
          background: 'linear-gradient(120deg,#f9a8d4,' + accentA + ' 48%,' + accentB + ')',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          Pas que des brackets
        </h2>
        <p style={{
          margin: 0, fontSize: 13, color: 'rgba(255,255,255,.28)',
          maxWidth: 560, marginInline: 'auto', lineHeight: 1.7,
        }}>
          Trois formats qui ne se jouent pas comme un tournoi classique. Survole une
          carte : l’aperçu montre la mécanique avant même d’entrer.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        {modes.map((m, i) => <ModeCard key={m.id} mode={m} index={i} />)}
      </div>
    </div>
  )
}
