// Guess Who — briques visuelles communes, identité Brams (atelier de gravure) :
// encre chaude, champagne mat, Fraunces + Hanken Grotesk, plaques à filet fin.
// Même API qu'avant (Btn, PhaseFrame, LiveRoster, PlayerChip, Waiting, C…) :
// les écrans changent de peau sans changer de logique. Palette : ./theme.js.
import { useEffect, useRef } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { play, vibrate } from './sfx.js'
import { T, F, LINE, SHADOW, plate, pill, label } from './theme.js'

export const FONT_DISPLAY = F.display
export const FONT_BODY = F.ui

// Clés historiques conservées, remappées (un usage oublié reste lisible).
export const C = {
  paper: T.surface, ink: T.textHi, tone: T.line,
  red: T.danger, yellow: T.accent, cyan: T.accentHi,
  text: T.textHi, textMut: T.textMute, warn: T.accentHi, danger: T.danger, ok: T.ok, ember: T.danger, gold: T.accent,
  // nouvelles clés
  bg: T.bg, surface: T.surface, raised: T.raised, line: T.line, accent: T.accent, accentHi: T.accentHi,
  accentLit: T.accentLit, onAccent: T.onAccent, faint: T.textFaint, body: T.text,
}

export const SPRING_POP = { type: 'spring', stiffness: 380, damping: 26, mass: 0.7 }

export const GLOBAL_CSS = `
.gw-btn:focus-visible, .gw-focus:focus-visible { outline: 2px solid ${T.accent}; outline-offset: 3px; }
@keyframes gw-spin { to { transform: rotate(360deg) } }
@keyframes gw-confetti { 0% { transform: translate3d(0,-10vh,0) rotate(0) } 100% { transform: translate3d(var(--dx),110vh,0) rotate(var(--rot)) } }
@keyframes gw-pulse { 0%,100% { transform: scale(1) } 50% { transform: scale(1.05) } }
@keyframes gw-beat { 0% { transform: scale(1.12) } 100% { transform: scale(1) } }
@keyframes gw-blink { 0%,100% { opacity: 1 } 50% { opacity: .5 } }
@keyframes gw-breathe { 0%,100% { opacity: .35; transform: scale(1) } 50% { opacity: .7; transform: scale(1.06) } }
@keyframes gw-float-up { 0% { transform: translate3d(0,0,0) scale(.6); opacity: 0 } 15% { transform: translate3d(0,-40px,0) scale(1); opacity: .85 } 75% { opacity: .7 } 100% { transform: translate3d(var(--dx),-300px,0) scale(.9); opacity: 0 } }
@keyframes gw-flash { 0% { opacity: .5 } 100% { opacity: 0 } }
@media (prefers-reduced-motion: reduce) { .gw-anim { animation: none !important } }
.gw-btn { touch-action: manipulation; -webkit-user-select: none; user-select: none; }
`

// Grain très léger (bruit SVG) pour casser l'aplat sans motif visible.
const GRAIN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`

// Fond : encre unie + halo champagne à peine visible + grain.
export function MangaBackdrop() {
  return (
    <>
      <div aria-hidden style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', background: T.bg,
        backgroundImage: 'radial-gradient(ellipse 60% 45% at 50% 28%, rgba(199,168,105,0.09), transparent 70%)',
      }} />
      <div aria-hidden style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: 0.035, backgroundImage: GRAIN,
      }} />
    </>
  )
}

// Bouton pilule : champagne (principal), filet (secondaire), brique (danger).
export function Btn({ children, variant = 'gold', disabled, full, style, ...props }) {
  const kind = { gold: 'primary', ember: 'primary', sea: 'primary', ghost: 'ghost', danger: 'danger' }[variant] || 'primary'
  const extra = variant === 'sea' ? { background: T.accentHi, borderColor: T.accentHi } : {}
  return (
    <motion.button
      {...props} disabled={disabled} className="gw-btn"
      whileHover={disabled ? undefined : { y: -1, boxShadow: SHADOW.soft }}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      style={{
        ...pill(kind, extra),
        minHeight: 48, padding: '0 22px', fontFamily: F.ui, fontWeight: 700, fontSize: 15, letterSpacing: '0.01em',
        cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.45 : 1,
        width: full ? '100%' : undefined, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        WebkitTapHighlightColor: 'transparent', ...style,
      }}
    >{children}</motion.button>
  )
}

// Chrono : anneau fin champagne qui se vide ; brique et pulsation douce sous 5 s.
// `tick` : petit clic + vibration (jamais pendant l'enregistrement).
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
  const R = 28, L = 2 * Math.PI * R
  const color = crit ? T.danger : T.accent
  return (
    <div role="timer" aria-label={`${r} secondes`} className={crit ? 'gw-anim' : undefined}
      style={{ position: 'relative', width: 64, height: 64, flex: '0 0 auto', animation: crit ? 'gw-pulse 1s ease-in-out infinite' : 'none' }}>
      <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="32" cy="32" r={R} fill="none" stroke={T.line} strokeWidth="3" />
        <circle cx="32" cy="32" r={R} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round"
          strokeDasharray={L} strokeDashoffset={L * (1 - pct)} style={{ transition: 'stroke-dashoffset .25s linear, stroke .3s' }} />
      </svg>
      <span style={{
        position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
        fontFamily: F.display, fontWeight: 500, fontSize: 22, color: crit ? T.danger : T.textHi, fontVariantNumeric: 'tabular-nums',
      }}>{r}</span>
    </div>
  )
}

// Cadre de phase : plaque à filet fin, entrée en fondu + léger glissement.
export function PhaseFrame({ eyebrow, prompt, remaining, total, children, footer, wide, tick = false }) {
  const reduce = useReducedMotion()
  const crit = remaining != null && remaining > 0 && remaining <= 5
  return (
    <motion.section
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.2, 0.7, 0.2, 1] }}
      style={{
        ...plate(),
        boxShadow: crit ? `0 0 0 1px ${T.danger}, ${SHADOW.soft}` : plate().boxShadow, transition: 'box-shadow .3s',
        position: 'relative', width: '100%', maxWidth: wide ? 1120 : 820, margin: '0 auto', boxSizing: 'border-box',
        padding: 'clamp(18px,3vw,30px)', display: 'flex', flexDirection: 'column', gap: 18,
        fontFamily: F.ui, color: T.text,
      }}
    >
      <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ minWidth: 0 }}>
          {eyebrow && <div style={label({ marginBottom: 10 })}>{eyebrow}</div>}
          {prompt && (
            <h2 style={{
              margin: 0, fontFamily: F.display, fontWeight: 500, lineHeight: 1.1,
              fontSize: 'clamp(1.5rem, 4vw, 2.3rem)', color: T.textHi, overflowWrap: 'anywhere', letterSpacing: '-0.01em',
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
  const size = compact ? 38 : 54
  const away = player?.connected === false
  return (
    <div title={away ? 'Déconnecté' : undefined} style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: compact ? 70 : 90, opacity: away ? 0.4 : 1, filter: away ? 'grayscale(1)' : 'none' }}>
      <span style={{ position: 'relative' }}>
        <img src={avatarOf(player)} alt="" width={size} height={size} style={{
          width: size, height: size, borderRadius: '50%', objectFit: 'cover', background: T.raised,
          border: `1px solid ${me ? T.accent : T.line}`, boxShadow: submitted ? `0 0 0 2px ${T.bg}, 0 0 0 3.5px ${T.accent}` : 'none',
          transition: 'box-shadow .25s',
        }} />
        {host && <span title="Hôte" style={{ position: 'absolute', top: -8, right: -6, fontSize: 13 }}>👑</span>}
        {submitted && (
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={SPRING_POP} aria-label="envoyé" style={{
            position: 'absolute', bottom: -3, right: -4, width: 18, height: 18, borderRadius: '50%', display: 'grid', placeItems: 'center',
            background: T.accent, color: T.onAccent, fontSize: 11, fontWeight: 800, border: `1px solid ${T.bg}`,
          }}>✓</motion.span>
        )}
      </span>
      <span style={{
        maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        fontWeight: 600, fontSize: compact ? 12 : 13.5, color: me ? T.accentLit : T.text, fontFamily: F.ui,
      }}>{me ? 'Toi' : (player?.display_name || 'Invité')}</span>
    </div>
  )
}

export function LiveRoster({ players, submittedSeats, meUserId, label: text = 'ont envoyé' }) {
  const list = (players || []).filter((p) => p.seat != null)
  if (!list.length) return null
  const done = list.filter((p) => submittedSeats?.has?.(p.seat)).length
  return (
    <div style={{ marginTop: 18, borderTop: LINE, paddingTop: 14 }}>
      <div style={label({ marginBottom: 12 })}>
        <span style={{ color: T.accentLit }}>{done}/{list.length}</span> {text}
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

export function Waiting({ label: text }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 0', fontFamily: F.ui, color: T.text }}>
      <span aria-hidden style={{
        display: 'inline-block', width: 30, height: 30, borderRadius: '50%', marginBottom: 14,
        border: `1.5px solid ${T.line}`, borderTopColor: T.accent, animation: 'gw-spin .9s linear infinite',
      }} />
      <div style={{ fontWeight: 600, color: T.textMute }}>{text}</div>
    </div>
  )
}

// Changement de phase : bruitage seul (les onomatopées visuelles sont parties
// avec l'identité manga). Rien à l'arrivée, rien à l'ouverture du micro.
const PHASE_SFX = { gages: 'whoosh', listen: 'whoosh', vote: 'whoosh', revote: 'whoosh', result: 'boom', gage: 'boom', end: 'whoosh' }

export function SfxBurst({ phase, round }) {
  const first = useRef(true)
  const key = `${phase}-${round}`
  useEffect(() => {
    if (first.current) { first.current = false; return }
    if (PHASE_SFX[phase]) play(PHASE_SFX[phase])
  }, [key, phase])
  return null
}

export function alpha(hex, a) {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

// Typo des écrans (même clés qu'avant pour remplacer à l'identique).
export const type = {
  body: { fontFamily: F.ui, fontWeight: 500, fontSize: 16, lineHeight: 1.55, color: T.text },
  small: { fontFamily: F.ui, fontWeight: 600, fontSize: 13.5, lineHeight: 1.45 },
  h2: { fontFamily: F.display, fontWeight: 500, fontSize: 'clamp(1.5rem, 4vw, 2.3rem)', lineHeight: 1.1 },
  h3: { fontFamily: F.display, fontWeight: 500, fontSize: 20, lineHeight: 1.2 },
}
