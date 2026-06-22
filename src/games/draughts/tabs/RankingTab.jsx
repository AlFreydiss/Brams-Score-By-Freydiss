// ─────────────────────────────────────────────────────────────────────────────
// RankingTab (Dames) — classement ELO NEUTRE (séparé des échecs), lu depuis le
// backend dames classé (damesRanked.leaderboard → table dames_ratings via RPC).
// Colonnes : Rang · Joueur · ELO · Parties · %V · tendance. Joueur courant surligné.
// Aucune décoration de faction / emoji : sobre, tabular-nums, hiérarchie nette.
// Tokens = neutralTheme. Accent univers = bleu-acier (props.accent). Inline only.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useMemo, useState } from 'react'
import { ui, fonts } from '../../../features/games/neutralTheme.js'
import { useAuth } from '../../../contexts/AuthContext.jsx'
import { leaderboard, ensureRating } from '../../../features/dames/online/damesRanked.js'

// Palier neutre (sans thème One Piece) dérivé de l'ELO — pour une étiquette discrète.
function neutralTier(elo) {
  if (elo >= 2200) return 'Grand maître'
  if (elo >= 1900) return 'Maître'
  if (elo >= 1600) return 'Expert'
  if (elo >= 1300) return 'Avancé'
  if (elo >= 1000) return 'Confirmé'
  if (elo >= 700) return 'Amateur'
  return 'Débutant'
}

const Th = ({ children, align = 'left', w }) => (
  <th style={{ textAlign: align, padding: '0 14px 10px', fontSize: 10.5, letterSpacing: 1.2, textTransform: 'uppercase', color: ui.textMute, fontWeight: 700, width: w, whiteSpace: 'nowrap' }}>{children}</th>
)

export default function RankingTab({ accent = ui.accent }) {
  const { discordId, isAuthenticated } = useAuth()
  const [rows, setRows] = useState(null)   // null = chargement
  const [me, setMe] = useState(null)
  const [err, setErr] = useState(false)

  useEffect(() => {
    let alive = true
    leaderboard(50).then(r => { if (alive) setRows(Array.isArray(r) ? r : []) }).catch(() => { if (alive) { setRows([]); setErr(true) } })
    if (isAuthenticated) ensureRating().then(r => { if (alive) setMe(r) }).catch(() => {})
    return () => { alive = false }
  }, [isAuthenticated])

  const myId = discordId ? String(discordId) : null
  const myRank = useMemo(() => {
    if (!rows || !myId) return null
    const i = rows.findIndex(r => String(r.discord_id) === myId)
    return i >= 0 ? i + 1 : null
  }, [rows, myId])

  return (
    <div style={{ minHeight: '100%', padding: 'clamp(18px, 3vw, 40px) clamp(16px, 4vw, 48px)', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 880 }}>
        <header style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 26 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: accent, fontWeight: 700 }}>Dames internationales</div>
            <h1 style={{ margin: '8px 0 0', fontFamily: fonts.display, fontWeight: 800, fontSize: 'clamp(26px, 4.4vw, 36px)', color: ui.text, letterSpacing: '-.5px' }}>Classement</h1>
          </div>
          {me && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: ui.surface, border: `1px solid ${ui.line}`, borderRadius: ui.radius.lg, padding: '10px 18px' }}>
              <Stat label="Votre ELO" value={me.rating} accent={accent} />
              {myRank && <Stat label="Rang" value={`#${myRank}`} />}
              <Stat label="Bilan" value={`${me.wins ?? 0}–${me.losses ?? 0}–${me.draws ?? 0}`} small />
            </div>
          )}
        </header>

        {rows === null ? (
          <Skeleton />
        ) : rows.length === 0 ? (
          <Empty accent={accent} err={err} />
        ) : (
          <div style={{ background: ui.surface, border: `1px solid ${ui.line}`, borderRadius: ui.radius.lg, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: fonts.body }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${ui.line}` }}>
                    <Th w={56} align="center">#</Th>
                    <Th>Joueur</Th>
                    <Th align="right" w={88}>ELO</Th>
                    <Th align="right" w={84}>Parties</Th>
                    <Th align="right" w={70}>%V</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => {
                    const mine = myId && String(r.discord_id) === myId
                    const games = (r.wins ?? 0) + (r.losses ?? 0) + (r.draws ?? 0)
                    const winPct = games > 0 ? Math.round(((r.wins ?? 0) / games) * 100) : null
                    return (
                      <tr key={r.discord_id ?? i} style={{ borderTop: i === 0 ? 'none' : `1px solid ${ui.line}`, background: mine ? `${accent}14` : 'transparent' }}>
                        <td style={{ padding: '11px 14px', textAlign: 'center' }}>
                          <span style={{ fontFamily: fonts.mono, fontVariantNumeric: 'tabular-nums', fontWeight: 700, fontSize: 14, color: i < 3 ? accent : ui.textDim }}>{i + 1}</span>
                        </td>
                        <td style={{ padding: '9px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                            <Avatar src={r.avatar} name={r.username} mine={mine} accent={accent} />
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 600, fontSize: 14, color: ui.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>
                                {r.username || 'Joueur'}{mine && <span style={{ marginLeft: 8, fontSize: 10.5, fontWeight: 700, color: accent, letterSpacing: '.4px' }}>VOUS</span>}
                              </div>
                              <div style={{ fontSize: 11.5, color: ui.textMute }}>{neutralTier(r.rating)}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '11px 14px', textAlign: 'right' }}>
                          <span style={{ fontFamily: fonts.mono, fontVariantNumeric: 'tabular-nums', fontWeight: 700, fontSize: 14.5, color: ui.text }}>{r.rating}</span>
                        </td>
                        <td style={{ padding: '11px 14px', textAlign: 'right', fontFamily: fonts.mono, fontVariantNumeric: 'tabular-nums', fontSize: 13, color: ui.textDim }}>{games || '—'}</td>
                        <td style={{ padding: '11px 14px', textAlign: 'right', fontFamily: fonts.mono, fontVariantNumeric: 'tabular-nums', fontSize: 13, color: winPct == null ? ui.textMute : winPct >= 50 ? ui.good : ui.textDim }}>{winPct == null ? '—' : `${winPct}%`}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
        <p style={{ margin: '14px 2px 0', fontFamily: fonts.body, fontSize: 12, color: ui.textMute, lineHeight: 1.5 }}>
          Classement des parties classées en ligne. Distinct du classement des Échecs.
        </p>
      </div>
    </div>
  )
}

function Stat({ label, value, accent, small }) {
  return (
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: small ? 15 : 19, color: accent || ui.text, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 9.5, letterSpacing: 1.1, textTransform: 'uppercase', color: ui.textMute, fontWeight: 700, marginTop: 4 }}>{label}</div>
    </div>
  )
}

function Avatar({ src, name, mine, accent }) {
  return (
    <span style={{ width: 32, height: 32, flexShrink: 0, borderRadius: '50%', overflow: 'hidden', display: 'grid', placeItems: 'center', background: ui.surfaceHi, color: ui.textDim, fontSize: 12, fontWeight: 700, boxShadow: mine ? `0 0 0 2px ${accent}` : `0 0 0 1px ${ui.line}` }}>
      {src ? <img loading="lazy" decoding="async" src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (name || '?').slice(0, 2).toUpperCase()}
    </span>
  )
}

function Skeleton() {
  return (
    <div style={{ background: ui.surface, border: `1px solid ${ui.line}`, borderRadius: ui.radius.lg, padding: 8 }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 10px' }}>
          <div style={{ width: 24, height: 14, borderRadius: 4, background: ui.surfaceHi }} />
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: ui.surfaceHi }} />
          <div style={{ flex: 1, height: 12, borderRadius: 4, background: ui.surfaceHi, opacity: 0.7 }} />
          <div style={{ width: 48, height: 12, borderRadius: 4, background: ui.surfaceHi }} />
        </div>
      ))}
    </div>
  )
}

function Empty({ accent, err }) {
  return (
    <div style={{ background: ui.surface, border: `1px solid ${ui.line}`, borderRadius: ui.radius.lg, padding: '52px 24px', textAlign: 'center' }}>
      <div aria-hidden style={{ width: 40, height: 4, borderRadius: 2, background: accent, margin: '0 auto 18px', opacity: 0.7 }} />
      <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 18, color: ui.text }}>
        {err ? 'Classement indisponible' : 'Aucune partie classée'}
      </div>
      <p style={{ margin: '8px auto 0', maxWidth: 360, fontFamily: fonts.body, fontSize: 13.5, lineHeight: 1.55, color: ui.textDim }}>
        {err ? 'Réessayez plus tard — le service de classement ne répond pas.' : 'Jouez une partie classée en ligne pour inaugurer le classement.'}
      </p>
    </div>
  )
}
