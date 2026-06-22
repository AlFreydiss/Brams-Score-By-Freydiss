// Freydiss Phone — primitives UI partagées (inline styles + framer-motion).
// Timer (anneau conique), PlayerChip, PhaseFrame (cadre de phase), Btn tactile.
import { motion } from 'framer-motion'
import { type, fonts } from '../../styles/typography.js'
import { C, GRAD, alpha, panel, foilEdge, SPRING, SPRING_POP } from './theme.js'

// ── Bouton ────────────────────────────────────────────────────────────────
// Tactile : ressort au survol + écrasement franc au press (whileTap). Le skin
// "gold" porte un balayage foil au survol (couche ::before simulée par span).
export function Btn({ children, variant = 'gold', disabled, full, style, ...props }) {
  const base = {
    position: 'relative', overflow: 'hidden',
    minHeight: 48, padding: '0 22px', borderRadius: 14,
    fontFamily: fonts.body, fontWeight: 800, fontSize: 14.5, letterSpacing: '0.012em',
    cursor: disabled ? 'default' : 'pointer',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 9,
    width: full ? '100%' : undefined,
    opacity: disabled ? 0.5 : 1,
    border: '1px solid transparent', boxSizing: 'border-box',
    WebkitTapHighlightColor: 'transparent',
  }
  const skins = {
    gold: { background: GRAD.gold, color: '#1b1305', border: '1px solid rgba(255,236,180,0.35)',
            boxShadow: disabled ? 'none' : '0 16px 36px rgba(168,118,26,0.34), inset 0 1px 0 rgba(255,255,255,0.45)', textShadow: '0 1px 0 rgba(255,255,255,0.25)' },
    ghost: { background: 'rgba(255,255,255,0.055)', color: C.text, border: `1px solid ${C.hairTop}`, backdropFilter: 'blur(6px)' },
    sea: { background: GRAD.sea, color: '#eafaff', border: '1px solid rgba(255,255,255,0.14)',
           boxShadow: disabled ? 'none' : '0 16px 36px rgba(25,80,93,0.36)' },
    ember: { background: GRAD.ember, color: '#fff5ec', border: '1px solid rgba(255,255,255,0.18)',
             boxShadow: disabled ? 'none' : '0 16px 38px rgba(212,69,31,0.4)', textShadow: '0 1px 1px rgba(120,30,0,0.35)' },
    danger: { background: alpha(C.danger, 0.16), color: '#ffd2cd', border: `1px solid ${alpha(C.danger, 0.34)}` },
  }
  return (
    <motion.button
      {...props} disabled={disabled}
      whileHover={disabled ? undefined : { y: -2, scale: 1.015 }}
      whileTap={disabled ? undefined : { scale: 0.955, y: 0 }}
      transition={SPRING}
      style={{ ...base, ...skins[variant], ...style }}
    >
      {variant === 'gold' && !disabled && (
        <span aria-hidden className="bp-foil" style={{
          position: 'absolute', top: 0, bottom: 0, width: '45%', left: 0,
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)',
          animation: 'bp-foilsweep 3.4s ease-in-out infinite', animationDelay: '1.2s',
          pointerEvents: 'none',
        }} />
      )}
      <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 9, zIndex: 1 }}>{children}</span>
    </motion.button>
  )
}

// ── Minuteur ──────────────────────────────────────────────────────────────
// Anneau conique (progression) + chiffre tabulaire. urgent < 10s → braise + pouls.
export function Timer({ remaining, total, size = 'md' }) {
  if (remaining == null) return null
  const r = Math.max(0, Math.ceil(remaining))
  const urgent = r <= 10
  const crit = r <= 5
  const pct = total ? Math.max(0, Math.min(1, remaining / total)) : 1
  const big = size === 'lg'
  const ring = big ? 88 : 66
  const col = crit ? C.ember : urgent ? C.warn : C.gold
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <motion.div
        animate={crit ? { scale: [1, 1.07, 1] } : { scale: 1 }}
        transition={crit ? { duration: 0.85, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }}
        style={{
          position: 'relative', width: ring, height: ring, borderRadius: '50%', flex: '0 0 auto',
          background: `conic-gradient(${col} ${pct * 360}deg, rgba(255,255,255,0.07) ${pct * 360}deg)`,
          display: 'grid', placeItems: 'center',
          boxShadow: crit ? `0 0 26px ${alpha(C.ember, 0.55)}, inset 0 0 0 1px ${alpha(col, 0.3)}` : `inset 0 0 0 1px ${alpha(col, 0.2)}`,
          transition: 'box-shadow .3s',
        }}
      >
        <div style={{ position: 'absolute', inset: big ? 6 : 5, borderRadius: '50%', background: `radial-gradient(circle at 50% 30%, ${C.surfaceFlat}, ${C.bgDeep})` }} />
        <span style={{
          position: 'relative', ...type.stat,
          fontSize: big ? 'clamp(1.7rem,4vw,2.2rem)' : '1.35rem',
          color: col, fontVariantNumeric: 'tabular-nums', lineHeight: 1,
          textShadow: crit ? `0 0 18px ${alpha(C.ember, 0.6)}` : 'none',
        }}>{r}</span>
      </motion.div>
    </div>
  )
}

// ── Pastille joueur ─────────────────────────────────────────────────────────
export function PlayerChip({ player, host, submitted, me, compact }) {
  const name = player?.display_name || 'Invité'
  const avatar = player?.avatar_url || `https://api.dicebear.com/8.x/thumbs/svg?seed=${encodeURIComponent(name)}`
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={SPRING_POP}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 9,
        padding: compact ? '5px 13px 5px 6px' : '7px 15px 7px 7px',
        borderRadius: 999,
        background: me ? `linear-gradient(135deg, ${alpha(C.gold, 0.16)}, ${alpha(C.gold, 0.06)})` : 'rgba(255,255,255,0.05)',
        border: `1px solid ${me ? alpha(C.gold, 0.4) : C.hairSoft}`,
        boxShadow: me ? `0 6px 18px ${alpha(C.gold, 0.16)}` : 'none',
        maxWidth: 220,
      }}>
      <span style={{ position: 'relative', flex: '0 0 auto' }}>
        <img loading="lazy" decoding="async" src={avatar} alt="" style={{ width: compact ? 25 : 29, height: compact ? 25 : 29, borderRadius: '50%', objectFit: 'cover', border: submitted ? `2px solid ${C.ok}` : '2px solid transparent', boxShadow: submitted ? `0 0 0 3px ${alpha(C.ok, 0.18)}` : 'none', transition: 'box-shadow .25s' }} />
        {host && <span style={{ position: 'absolute', top: -7, right: -5, fontSize: 13 }} title="Capitaine">👑</span>}
      </span>
      <span style={{ ...type.small, color: C.text, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
      {submitted && (
        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={SPRING_POP} style={{ color: C.ok, fontSize: 13, flex: '0 0 auto' }}>✓</motion.span>
      )}
    </motion.div>
  )
}

// ── Roster live pendant le jeu ────────────────────────────────────────────────
export function LiveRoster({ players, submittedSeats, meUserId }) {
  const list = (players || []).filter((p) => p.connected !== false && p.seat != null)
  if (list.length < 1) return null
  const done = list.filter((p) => submittedSeats?.has?.(p.seat)).length
  const all = done >= list.length
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SPRING, delay: 0.1 }} style={{ width: '100%', maxWidth: 880, margin: '14px auto 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
        <span style={{ ...type.eyebrow, color: C.textMut }}>Équipage</span>
        <span style={{ ...type.small, color: all ? C.ok : C.textMut, fontWeight: 800 }}>
          {done}/{list.length} ont envoyé{all ? ' ✓' : ''}
        </span>
        {/* mini-jauge collective */}
        <div style={{ flex: 1, minWidth: 80, height: 5, borderRadius: 999, background: 'rgba(255,255,255,0.07)', overflow: 'hidden', maxWidth: 200 }}>
          <motion.div animate={{ width: `${(done / list.length) * 100}%` }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} style={{ height: '100%', borderRadius: 999, background: all ? `linear-gradient(90deg, ${C.ok}, ${C.sea})` : GRAD.gold }} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {list.map((p) => {
          const submitted = !!submittedSeats?.has?.(p.seat)
          return (
            <div key={p.user_id} style={{ opacity: submitted ? 1 : 0.6, transition: 'opacity .3s' }}>
              <PlayerChip
                player={p}
                host={!!p.is_host}
                submitted={submitted}
                me={String(p.user_id) === String(meUserId)}
                compact
              />
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}

// ── Cadre de phase : header (eyebrow + consigne + minuteur) + corps + footer ──
export function PhaseFrame({ eyebrow, prompt, remaining, total, children, footer, wide }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 22, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      style={{ ...panel, padding: 'clamp(18px,3vw,30px)', width: '100%', maxWidth: wide ? 1180 : 880, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}
    >
      <span aria-hidden style={foilEdge} />
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: `radial-gradient(560px 220px at 14% 0%, ${alpha(C.gold, 0.1)}, transparent 64%)` }} />
      <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0, flex: '1 1 280px' }}>
          {eyebrow && <div style={{ ...type.eyebrow, color: C.gold, marginBottom: 9, display: 'inline-flex', alignItems: 'center', gap: 8 }}><span style={{ width: 16, height: 1, background: alpha(C.gold, 0.5) }} />{eyebrow}</div>}
          {prompt && <div style={{ ...type.h2, color: C.text }}>{prompt}</div>}
        </div>
        <Timer remaining={remaining} total={total} />
      </div>
      <div style={{ position: 'relative' }}>{children}</div>
      {footer && <div style={{ position: 'relative', display: 'flex', justifyContent: 'flex-end', gap: 12, flexWrap: 'wrap' }}>{footer}</div>}
    </motion.div>
  )
}

// ── Petit état "attente" (spinner double anneau) ─────────────────────────────
export function Waiting({ label }) {
  return (
    <div style={{ textAlign: 'center', padding: '34px 0' }}>
      <span style={{ position: 'relative', display: 'inline-block', width: 40, height: 40, marginBottom: 16 }}>
        <span data-bp-anim style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `3px solid ${C.hairTop}`, borderTopColor: C.gold, animation: 'bp-spin .9s linear infinite' }} />
        <span data-bp-anim style={{ position: 'absolute', inset: 7, borderRadius: '50%', border: `2px solid transparent`, borderBottomColor: alpha(C.sea, 0.7), animation: 'bp-spin 1.4s linear infinite reverse' }} />
      </span>
      <div style={{ ...type.body, color: C.textMut }}>{label}</div>
    </div>
  )
}
