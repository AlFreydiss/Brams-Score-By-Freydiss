// Guess Who — identité « planche de manga » : papier blanc, encre, trame,
// lignes de vitesse, cases (koma) à bord épais, onomatopées. Expose la même
// API que les briques de Frds Phone (Btn, PhaseFrame, LiveRoster, PlayerChip,
// Waiting, C) pour que les écrans changent de peau sans changer de logique.
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { play, vibrate } from './sfx.js'

export const FONT_DISPLAY = "'Dela Gothic One', 'Arial Black', system-ui, sans-serif"
export const FONT_BODY = "'M PLUS 1p', 'Segoe UI', system-ui, sans-serif"

export const C = {
  paper: '#FFFFFF',
  ink: '#14121A',
  tone: '#C9C6D0',
  red: '#E4002B',
  yellow: '#FFE14D',
  cyan: '#14B8E6',
  // alias attendus par les écrans existants
  text: '#14121A',
  textMut: '#55515E',
  warn: '#B4530A',
  danger: '#E4002B',
  ok: '#0F8A4B',
  ember: '#E4002B',
  gold: '#14121A',
}

export const SPRING_POP = { type: 'spring', stiffness: 560, damping: 18, mass: 0.6 }

export const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Dela+Gothic+One&family=M+PLUS+1p:wght@500;700;800&display=swap');
.gw-btn:focus-visible, .gw-focus:focus-visible { outline: 3px solid ${C.cyan}; outline-offset: 3px; }
@keyframes gw-spin { to { transform: rotate(360deg) } }
@keyframes gw-shake { 0%,100%{transform:translate(0,0)} 25%{transform:translate(-2px,1px)} 50%{transform:translate(2px,-1px)} 75%{transform:translate(-1px,-2px)} }
@keyframes gw-confetti { 0% { transform: translate3d(0,-10vh,0) rotate(0) } 100% { transform: translate3d(var(--dx),110vh,0) rotate(var(--rot)) } }
@keyframes gw-pulse { 0%,100% { transform: scale(1) } 50% { transform: scale(1.12) } }
@keyframes gw-beat { 0% { transform: scale(1.35) } 100% { transform: scale(1) } }
@keyframes gw-blink { 0%,100% { opacity: 1 } 50% { opacity: .35 } }
@keyframes gw-float-up { 0% { transform: translate3d(0,0,0) scale(.4); opacity: 0 } 15% { transform: translate3d(0,-60px,0) scale(1.45) rotate(var(--rot)); opacity: 1 } 75% { opacity: 1 } 100% { transform: translate3d(var(--dx),-380px,0) scale(1) rotate(var(--rot)); opacity: 0 } }
@keyframes gw-flash { 0% { opacity: .9 } 100% { opacity: 0 } }
@media (prefers-reduced-motion: reduce) { .gw-shake, .gw-anim { animation: none !important } }
.gw-btn { touch-action: manipulation; -webkit-user-select: none; user-select: none; }
`

// Fond de planche : trame de points + lignes de vitesse depuis le centre.
export function MangaBackdrop() {
  return (
    <>
      <div aria-hidden style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', background: C.paper,
        backgroundImage: `radial-gradient(${C.tone} 1.1px, transparent 1.3px)`,
        backgroundSize: '9px 9px',
      }} />
      <div aria-hidden style={{
        position: 'fixed', inset: '-20%', zIndex: 0, pointerEvents: 'none', opacity: 0.55,
        background: `repeating-conic-gradient(from 0deg at 50% 38%, ${C.ink} 0deg 0.35deg, transparent 0.35deg 4.2deg)`,
        WebkitMaskImage: 'radial-gradient(ellipse 60% 55% at 50% 38%, transparent 32%, #000 78%)',
        maskImage: 'radial-gradient(ellipse 60% 55% at 50% 38%, transparent 32%, #000 78%)',
      }} />
    </>
  )
}

// Bouton : encre pleine + ombre dure décalée, s'écrase au clic.
export function Btn({ children, variant = 'gold', disabled, full, style, ...props }) {
  const skins = {
    gold: { background: C.red, color: '#fff' },
    ember: { background: C.red, color: '#fff' },
    sea: { background: C.cyan, color: C.ink },
    ghost: { background: C.paper, color: C.ink },
    danger: { background: C.paper, color: C.red },
  }
  return (
    <motion.button
      {...props} disabled={disabled} className="gw-btn"
      whileHover={disabled ? undefined : { x: -2, y: -2, boxShadow: `6px 6px 0 ${C.ink}` }}
      whileTap={disabled ? undefined : { x: 2, y: 2, boxShadow: `0 0 0 ${C.ink}` }}
      transition={{ type: 'spring', stiffness: 700, damping: 24 }}
      style={{
        minHeight: 50, padding: '0 22px', borderRadius: 6, border: `3px solid ${C.ink}`,
        boxShadow: `4px 4px 0 ${C.ink}`, fontFamily: FONT_DISPLAY, fontSize: 15, letterSpacing: '0.02em',
        cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.45 : 1,
        width: full ? '100%' : undefined, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        WebkitTapHighlightColor: 'transparent', ...skins[variant], ...style,
      }}
    >{children}</motion.button>
  )
}

// Chrono : bulle d'encre ronde ; sous 5 s elle vire au rouge, bat à chaque
// seconde et tremble. `tick` : petit clic + vibration (jamais pendant l'enregistrement).
export function Timer({ remaining, total, tick = false }) {
  const r = remaining == null ? null : Math.max(0, Math.ceil(remaining))
  const crit = r != null && r <= 5 && r > 0
  const last = useRef(r)
  useEffect(() => {
    if (r === last.current) return
    last.current = r
    if (!tick || r == null || r > 5) return
    if (r > 0) { play(r <= 3 ? 'tickHi' : 'tick'); vibrate(r <= 3 ? 40 : 20) } else vibrate([60, 40, 60])
  }, [r, tick])
  if (r == null) return null
  const pct = total ? Math.max(0, Math.min(1, remaining / total)) : 1
  return (
    <div className={crit ? 'gw-shake' : undefined} role="timer" aria-label={`${r} secondes`}
      style={{
        width: 70, height: 70, borderRadius: '50%', flex: '0 0 auto', display: 'grid', placeItems: 'center',
        border: `3px solid ${C.ink}`, boxShadow: `3px 3px 0 ${crit ? C.red : C.ink}`,
        background: `conic-gradient(${crit ? C.red : C.ink} ${pct * 360}deg, ${crit ? C.yellow : C.paper} 0)`,
        animation: crit ? 'gw-shake .25s linear infinite' : 'none',
      }}>
      <span key={crit ? r : 'n'} className={crit ? 'gw-anim' : undefined} style={{
        width: 50, height: 50, borderRadius: '50%', background: crit ? C.red : C.paper, display: 'grid', placeItems: 'center',
        fontFamily: FONT_DISPLAY, fontSize: crit ? 26 : 22, color: crit ? '#fff' : C.ink, fontVariantNumeric: 'tabular-nums',
        animation: crit ? 'gw-beat .35s cubic-bezier(.3,1.6,.5,1) both' : 'none',
      }}>{r}</span>
    </div>
  )
}

// Case de manga : bord épais, ombre pleine, légère inclinaison alternée.
// Entrée « page qui tourne » : la case pivote depuis sa reliure gauche.
export function PhaseFrame({ eyebrow, prompt, remaining, total, children, footer, wide, tilt = -0.6, tick = false }) {
  const reduce = useReducedMotion()
  const crit = remaining != null && remaining > 0 && remaining <= 5
  return (
    <motion.section
      initial={reduce ? { opacity: 0 } : { opacity: 0, rotateY: -62, rotate: tilt * 3, x: 30 }}
      animate={reduce ? { opacity: 1, rotate: tilt } : { opacity: 1, rotateY: 0, rotate: tilt, x: 0 }}
      transition={reduce ? { duration: 0.2 } : { type: 'spring', stiffness: 260, damping: 26, mass: 0.9 }}
      style={{
        transformPerspective: 1400, transformOrigin: 'left center',
        position: 'relative', width: '100%', maxWidth: wide ? 1120 : 820, margin: '0 auto', boxSizing: 'border-box',
        background: C.paper, border: `3px solid ${C.ink}`, boxShadow: `8px 8px 0 ${crit ? C.red : C.ink}`, transition: 'box-shadow .3s',
        padding: 'clamp(18px,3vw,30px)', display: 'flex', flexDirection: 'column', gap: 18,
        fontFamily: FONT_BODY, color: C.ink,
      }}
    >
      <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ minWidth: 0 }}>
          {eyebrow && (
            <div style={{
              display: 'inline-block', background: C.ink, color: C.paper, fontFamily: FONT_BODY, fontWeight: 800,
              fontSize: 13, padding: '3px 10px', marginBottom: 10, transform: 'skewX(-8deg)',
            }}>{eyebrow}</div>
          )}
          {prompt && (
            <h2 style={{
              margin: 0, fontFamily: FONT_DISPLAY, fontWeight: 400, lineHeight: 1.08,
              fontSize: 'clamp(1.6rem, 4.2vw, 2.6rem)', color: C.ink, overflowWrap: 'anywhere',
            }}>{prompt}</h2>
          )}
        </div>
        <Timer remaining={remaining} total={total} tick={tick} />
      </header>
      <div>{children}</div>
      {footer && <footer style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, flexWrap: 'wrap' }}>{footer}</footer>}
    </motion.section>
  )
}

const avatarOf = (p) => p?.avatar_url || `https://api.dicebear.com/8.x/thumbs/svg?seed=${encodeURIComponent(p?.display_name || 'Invité')}`

export function PlayerChip({ player, host, submitted, me, compact }) {
  const size = compact ? 38 : 56
  const away = player?.connected === false
  return (
    <div title={away ? 'Déconnecté' : undefined} style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: compact ? 70 : 92, opacity: away ? 0.4 : 1, filter: away ? 'grayscale(1)' : 'none' }}>
      <span style={{ position: 'relative' }}>
        <img src={avatarOf(player)} alt="" width={size} height={size} style={{
          width: size, height: size, borderRadius: '50%', objectFit: 'cover', background: C.paper,
          border: `3px solid ${me ? C.cyan : C.ink}`, boxShadow: submitted ? `0 0 0 4px ${C.yellow}, 0 0 0 7px ${C.ink}` : 'none',
        }} />
        {host && <span title="Hôte" style={{ position: 'absolute', top: -10, right: -8, fontSize: 16 }}>👑</span>}
        {submitted && (
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={SPRING_POP} style={{
            position: 'absolute', bottom: -6, right: -8, background: C.yellow, border: `2px solid ${C.ink}`,
            borderRadius: 4, fontFamily: FONT_DISPLAY, fontSize: 11, padding: '0 4px', color: C.ink,
          }}>OK</motion.span>
        )}
      </span>
      <span style={{
        maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        fontWeight: 800, fontSize: compact ? 12 : 13.5, color: C.ink, fontFamily: FONT_BODY,
      }}>{me ? 'Toi' : (player?.display_name || 'Invité')}</span>
    </div>
  )
}

export function LiveRoster({ players, submittedSeats, meUserId, label = 'ont envoyé' }) {
  const list = (players || []).filter((p) => p.seat != null)
  if (!list.length) return null
  const done = list.filter((p) => submittedSeats?.has?.(p.seat)).length
  return (
    <div style={{ marginTop: 18, borderTop: `3px dashed ${C.ink}`, paddingTop: 14 }}>
      <div style={{ fontFamily: FONT_BODY, fontWeight: 800, fontSize: 14, marginBottom: 10, color: C.ink }}>
        {done}/{list.length} {label}
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {list.map((p) => (
          <PlayerChip key={p.user_id} player={p} host={p.is_host} compact
            submitted={!!submittedSeats?.has?.(p.seat)} me={String(p.user_id) === String(meUserId)} />
        ))}
      </div>
    </div>
  )
}

export function Waiting({ label }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 0', fontFamily: FONT_BODY, color: C.ink }}>
      <span aria-hidden style={{
        display: 'inline-block', width: 38, height: 38, borderRadius: '50%', marginBottom: 14,
        border: `4px solid ${C.tone}`, borderTopColor: C.ink, animation: 'gw-spin .8s linear infinite',
      }} />
      <div style={{ fontWeight: 800 }}>{label}</div>
    </div>
  )
}

// Onomatopée qui explose au changement de phase (le seul effet automatique).
const SFX = {
  gages: { jp: 'ゴゴゴ', fr: 'Écris ton gage !' },
  listen: { jp: 'ドン!', fr: 'Écoute !' },
  record: { jp: 'バーン!', fr: 'À toi !' },
  vote: { jp: 'ザワ…', fr: 'Vote !' },
  revote: { jp: 'ゴゴゴ', fr: 'Égalité !' },
  result: { jp: 'ドドド', fr: 'Verdict !' },
  gage: { jp: 'ドーン!', fr: 'Le gage !' },
  end: { jp: '完', fr: 'Fin !' },
}

export function SfxBurst({ phase, round }) {
  const reduce = useReducedMotion()
  const [shown, setShown] = useState(null)
  const first = useRef(true)
  const key = `${phase}-${round}`
  useEffect(() => {
    if (first.current) { first.current = false; return }
    if (!SFX[phase] || reduce) return
    setShown(key)
    // pas de bruit à l'ouverture du micro : l'imitation ne doit rien capter
    if (phase !== 'record') play(phase === 'gage' || phase === 'result' ? 'boom' : 'whoosh')
    const t = setTimeout(() => setShown(null), 1100)
    return () => clearTimeout(t)
  }, [key, phase, reduce])
  const s = SFX[phase]
  return (
    <AnimatePresence>
      {shown === key && s && (
        <motion.div
          key={key} aria-hidden
          initial={{ opacity: 0, scale: 0.3, rotate: -14 }}
          animate={{ opacity: 1, scale: 1, rotate: -6 }}
          exit={{ opacity: 0, scale: 1.4 }}
          transition={{ type: 'spring', stiffness: 520, damping: 14 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 60, pointerEvents: 'none', display: 'grid', placeItems: 'center',
          }}
        >
          <div aria-hidden style={{
            position: 'absolute', inset: '-30%', opacity: 0.5,
            background: `repeating-conic-gradient(from 0deg at 50% 50%, ${C.ink} 0deg 0.6deg, transparent 0.6deg 5deg)`,
            WebkitMaskImage: 'radial-gradient(circle at 50% 50%, transparent 22%, #000 60%)',
            maskImage: 'radial-gradient(circle at 50% 50%, transparent 22%, #000 60%)',
          }} />
          <div style={{ textAlign: 'center', position: 'relative' }}>
            <div style={{
              fontFamily: FONT_DISPLAY, fontSize: 'clamp(4.5rem, 16vw, 11rem)', lineHeight: 1, color: C.yellow,
              WebkitTextStroke: `5px ${C.ink}`, paintOrder: 'stroke fill', textShadow: `8px 8px 0 ${C.ink}`,
            }}>{s.jp}</div>
            <div style={{
              display: 'inline-block', marginTop: 8, background: C.red, color: '#fff', border: `3px solid ${C.ink}`,
              boxShadow: `5px 5px 0 ${C.ink}`, padding: '6px 18px', fontFamily: FONT_DISPLAY,
              fontSize: 'clamp(1.4rem, 4vw, 2.2rem)', transform: 'rotate(4deg)',
            }}>{s.fr}</div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function alpha(hex, a) {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

// Typo des écrans (même clés que styles/typography.js pour remplacer à l'identique).
export const type = {
  body: { fontFamily: FONT_BODY, fontWeight: 500, fontSize: 16, lineHeight: 1.5 },
  small: { fontFamily: FONT_BODY, fontWeight: 700, fontSize: 13.5, lineHeight: 1.4 },
  h2: { fontFamily: FONT_DISPLAY, fontWeight: 400, fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', lineHeight: 1.1 },
  h3: { fontFamily: FONT_DISPLAY, fontWeight: 400, fontSize: 20, lineHeight: 1.2 },
}
