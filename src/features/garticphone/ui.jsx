// Brams Phone — primitives UI partagées (inline styles). Timer, PlayerChip,
// PhaseFrame (cadre de phase avec consigne + minuteur + bouton), Btn.
import { type, fonts } from '../../styles/typography.js'
import { C, GRAD, alpha, panel } from './theme.js'

// ── Bouton ────────────────────────────────────────────────────────────────
export function Btn({ children, variant = 'gold', disabled, full, style, ...props }) {
  const base = {
    minHeight: 46, padding: '0 20px', borderRadius: 13,
    fontFamily: fonts.body, fontWeight: 800, fontSize: 14.5, letterSpacing: '0.01em',
    cursor: disabled ? 'default' : 'pointer',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 9,
    width: full ? '100%' : undefined,
    transition: 'transform .16s, box-shadow .16s, border-color .16s, background .16s, opacity .16s',
    opacity: disabled ? 0.5 : 1,
    border: '1px solid transparent', boxSizing: 'border-box',
  }
  const skins = {
    gold: { background: GRAD.gold, color: '#1b1305', border: '1px solid rgba(255,255,255,0.14)',
            boxShadow: disabled ? 'none' : '0 14px 34px rgba(168,122,22,0.26)' },
    ghost: { background: 'rgba(255,255,255,0.05)', color: C.text, border: `1px solid ${C.hairTop}` },
    sea: { background: GRAD.sea, color: '#eafaff', border: '1px solid rgba(255,255,255,0.12)',
           boxShadow: disabled ? 'none' : '0 14px 34px rgba(29,87,99,0.30)' },
    danger: { background: alpha(C.danger, 0.16), color: '#ffd2cd', border: `1px solid ${alpha(C.danger, 0.34)}` },
  }
  return (
    <button
      {...props} disabled={disabled}
      onMouseEnter={(e) => { if (!disabled) { e.currentTarget.style.transform = 'translateY(-2px)' } ; props.onMouseEnter?.(e) }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; props.onMouseLeave?.(e) }}
      style={{ ...base, ...skins[variant], ...style }}
    >
      {children}
    </button>
  )
}

// ── Minuteur ──────────────────────────────────────────────────────────────
// remaining = secondes restantes (number|null). urgent < 10s.
export function Timer({ remaining, total, size = 'md' }) {
  if (remaining == null) return null
  const r = Math.max(0, Math.ceil(remaining))
  const urgent = r <= 10
  const pct = total ? Math.max(0, Math.min(1, remaining / total)) : null
  const big = size === 'lg'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div
        data-bp-anim
        style={{
          ...type.stat,
          fontSize: big ? 'clamp(2rem,5vw,2.8rem)' : '1.7rem',
          color: urgent ? C.danger : C.gold,
          fontVariantNumeric: 'tabular-nums',
          textShadow: urgent ? `0 0 22px ${alpha(C.danger, 0.5)}` : 'none',
          animation: urgent ? 'bp-pulse 0.9s ease-in-out infinite' : 'none',
          minWidth: big ? 64 : 48, textAlign: 'right', lineHeight: 1,
        }}
      >
        {r}
        <span style={{ fontSize: '0.5em', opacity: 0.6, marginLeft: 2 }}>s</span>
      </div>
      {pct != null && (
        <div style={{ width: big ? 160 : 110, height: 5, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct * 100}%`, background: urgent ? C.danger : C.gold, transition: 'width .9s linear, background .3s' }} />
        </div>
      )}
    </div>
  )
}

// ── Pastille joueur ─────────────────────────────────────────────────────────
export function PlayerChip({ player, host, submitted, me, compact }) {
  const name = player?.display_name || 'Invité'
  const avatar = player?.avatar_url || `https://api.dicebear.com/8.x/thumbs/svg?seed=${encodeURIComponent(name)}`
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 9,
      padding: compact ? '5px 12px 5px 6px' : '7px 14px 7px 7px',
      borderRadius: 999,
      background: me ? alpha(C.gold, 0.12) : 'rgba(255,255,255,0.045)',
      border: `1px solid ${me ? alpha(C.gold, 0.34) : C.hairSoft}`,
      maxWidth: 220,
    }}>
      <span style={{ position: 'relative', flex: '0 0 auto' }}>
        <img src={avatar} alt="" style={{ width: compact ? 24 : 28, height: compact ? 24 : 28, borderRadius: '50%', objectFit: 'cover', border: submitted ? `2px solid ${C.ok}` : '2px solid transparent' }} />
        {host && <span style={{ position: 'absolute', top: -7, right: -5, fontSize: 13 }} title="Capitaine">👑</span>}
      </span>
      <span style={{ ...type.small, color: C.text, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
      {submitted && <span style={{ color: C.ok, fontSize: 13, flex: '0 0 auto' }}>✓</span>}
    </div>
  )
}

// ── Roster live pendant le jeu ────────────────────────────────────────────────
// Pendant une phase jouable on ne voyait qu'un compteur texte ("3/5 pirates ont
// envoyé") : impossible de savoir QUI on attend. Ce roster affiche chaque pirate
// connecté (avatar + pseudo) avec un ✓ quand son siège a soumis. `submittedSeats`
// est un Set de sièges (déjà exposé par le hook) ; `players` portent seat/host/me.
export function LiveRoster({ players, submittedSeats, meUserId }) {
  const list = (players || []).filter((p) => p.connected !== false && p.seat != null)
  if (list.length < 1) return null
  const done = list.filter((p) => submittedSeats?.has?.(p.seat)).length
  return (
    <div style={{ width: '100%', maxWidth: 880, margin: '12px auto 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
        <span style={{ ...type.eyebrow, color: C.textMut }}>Équipage</span>
        <span style={{ ...type.small, color: done >= list.length ? C.ok : C.textMut, fontWeight: 800 }}>
          {done}/{list.length} ont envoyé{done >= list.length ? ' ✓' : ''}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {list.map((p) => {
          const submitted = !!submittedSeats?.has?.(p.seat)
          return (
            <div key={p.user_id} data-bp-anim style={{ opacity: submitted ? 1 : 0.62, transition: 'opacity .25s' }}>
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
    </div>
  )
}

// ── Cadre de phase : header (eyebrow + consigne + minuteur) + corps + footer ──
export function PhaseFrame({ eyebrow, prompt, remaining, total, children, footer }) {
  return (
    <div style={{ ...panel, padding: 'clamp(18px,3vw,28px)', width: '100%', maxWidth: 880, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: `radial-gradient(520px 200px at 14% 0%, ${alpha(C.gold, 0.08)}, transparent 64%)` }} />
      <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0, flex: '1 1 280px' }}>
          {eyebrow && <div style={{ ...type.eyebrow, color: C.gold, marginBottom: 9 }}>{eyebrow}</div>}
          {prompt && <div style={{ ...type.h2, color: C.text }}>{prompt}</div>}
        </div>
        <Timer remaining={remaining} total={total} />
      </div>
      <div style={{ position: 'relative' }}>{children}</div>
      {footer && <div style={{ position: 'relative', display: 'flex', justifyContent: 'flex-end', gap: 12, flexWrap: 'wrap' }}>{footer}</div>}
    </div>
  )
}

// ── Petit état "attente" (spinner) ───────────────────────────────────────────
export function Waiting({ label }) {
  return (
    <div style={{ textAlign: 'center', padding: '34px 0' }}>
      <span data-bp-anim style={{ display: 'inline-block', width: 34, height: 34, marginBottom: 14, borderRadius: '50%', border: `3px solid ${C.hairTop}`, borderTopColor: C.gold, animation: 'bp-spin .8s linear infinite' }} />
      <div style={{ ...type.body, color: C.textMut }}>{label}</div>
    </div>
  )
}
