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
import { saisonActive, classementSaison, countdownFinSaison } from '../../_shell/arena/seasons.js'
import { badgesPourJoueurs } from '../../_shell/arena/badges.js'
import BadgeChip from '../../_shell/arena/BadgeChip.jsx'
import { glass } from '../../_shell/arena/arenaTokens.js'

const STEEL = '#6f8fb0'      // bleu-acier froid — accent univers Dames (override local)
const STEEL_HI = '#9bb6d2'
const MEDAL = ['🥇', '🥈', '🥉']

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

export default function RankingTab({ accent = STEEL }) {
  const { discordId, isAuthenticated } = useAuth()
  const [allTime, setAllTime] = useState(null)   // null = chargement (classement all-time)
  const [me, setMe] = useState(null)
  const [err, setErr] = useState(false)
  const [saison, setSaison] = useState(null)     // saison active (ou null si aucune)
  const [seasonRows, setSeasonRows] = useState(null) // classement de la saison active
  const [vue, setVue] = useState('saison')       // 'saison' | 'alltime' — l'onglet « saison » dégrade vers all-time si pas de saison
  const [badges, setBadges] = useState(new Map())

  useEffect(() => {
    let alive = true
    leaderboard(50).then(r => { if (alive) setAllTime(Array.isArray(r) ? r : []) }).catch(() => { if (alive) { setAllTime([]); setErr(true) } })
    if (isAuthenticated) ensureRating().then(r => { if (alive) setMe(r) }).catch(() => {})
    // Saison active (REST direct, dégrade en silence si table absente)
    saisonActive('dames').then(s => {
      if (!alive) return
      setSaison(s)
      if (s) classementSaison(s.id, 50).then(rows => { if (alive) setSeasonRows(Array.isArray(rows) ? rows : []) }).catch(() => { if (alive) setSeasonRows([]) })
      else setSeasonRows([])
    }).catch(() => { if (alive) { setSaison(null); setSeasonRows([]) } })
    return () => { alive = false }
  }, [isAuthenticated])

  // Pas de saison active en DB → on force la vue all-time (dégradation gracieuse).
  const aSaison = !!saison
  const vueEffective = aSaison ? vue : 'alltime'
  const rows = vueEffective === 'saison' ? seasonRows : allTime
  const countdown = aSaison ? countdownFinSaison(saison) : null

  // Badges des joueurs affichés (un seul appel, dégrade en Map vide si table absente).
  useEffect(() => {
    let alive = true
    const ids = (rows || []).map(r => r.discord_id).filter(Boolean)
    if (!ids.length) { setBadges(new Map()); return }
    badgesPourJoueurs(ids, 'dames').then(m => { if (alive) setBadges(m) }).catch(() => { if (alive) setBadges(new Map()) })
    return () => { alive = false }
  }, [rows])

  const myId = discordId ? String(discordId) : null
  const myRank = useMemo(() => {
    if (!rows || !myId) return null
    const i = rows.findIndex(r => String(r.discord_id) === myId)
    return i >= 0 ? i + 1 : null
  }, [rows, myId])

  const top3 = (rows || []).slice(0, 3)
  const vide = rows !== null && rows.length === 0

  return (
    <div style={{ minHeight: '100%', overflowY: 'auto', padding: 'clamp(20px,3vw,40px) clamp(16px,4vw,52px) 56px' }}>
      <div style={{ width: '100%', maxWidth: 1180, margin: '0 auto' }}>

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <header style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 18, marginBottom: 'clamp(20px,3vw,34px)' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ font: `700 11px ${fonts.body}`, letterSpacing: '0.22em', textTransform: 'uppercase', color: accent }}>Dames internationales</div>
            <h1 style={{ margin: '8px 0 0', font: `800 clamp(28px,4.4vw,42px) ${fonts.display}`, letterSpacing: '-0.02em', color: ui.text }}>Classement</h1>
            <p style={{ margin: '8px 0 0', maxWidth: 520, font: `400 13.5px ${fonts.body}`, lineHeight: 1.55, color: ui.textDim }}>
              Le ladder ELO des parties classées en ligne. Distinct du classement des Échecs.
            </p>
          </div>
          {me && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: ui.surface, border: `1px solid ${ui.line}`, borderRadius: ui.radius.lg, padding: '10px 18px', flexShrink: 0 }}>
              <Stat label="Votre ELO" value={me.rating} accent={accent} />
              {myRank && <Stat label="Rang" value={`#${myRank}`} />}
              <Stat label="Bilan" value={`${me.wins ?? 0}–${me.losses ?? 0}–${me.draws ?? 0}`} small />
            </div>
          )}
        </header>

        {/* ── Bandeau saison ───────────────────────────────────────────────── */}
        {aSaison && (
          <div style={{
            display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 'clamp(16px,2vw,22px)',
            padding: '12px 16px', borderRadius: ui.radius.md,
            background: glass.bg, backdropFilter: glass.blur, WebkitBackdropFilter: glass.blur,
            border: `1px solid ${glass.border}`,
          }}>
            <span aria-hidden style={{ width: 8, height: 8, borderRadius: '50%', background: accent, boxShadow: `0 0 10px 1px ${accent}` }} />
            <span style={{ font: `700 12.5px ${fonts.body}`, color: ui.text, letterSpacing: '.2px' }}>{saison.label || 'Saison en cours'}</span>
            {countdown && vueEffective === 'saison' && (
              <span style={{ font: `600 11.5px ${fonts.body}`, color: ui.textMute }}>· {countdown}</span>
            )}
            <div role="tablist" aria-label="Période du classement" style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
              {[{ id: 'saison', l: 'Saison' }, { id: 'alltime', l: 'Tout temps' }].map(t => {
                const on = vueEffective === t.id
                return (
                  <button key={t.id} role="tab" aria-selected={on} onClick={() => setVue(t.id)} style={{
                    padding: '5px 12px', borderRadius: ui.radius.pill, cursor: 'pointer',
                    font: `600 11.5px ${fonts.body}`,
                    color: on ? STEEL_HI : ui.textDim,
                    background: on ? `${accent}22` : 'transparent',
                    border: `1px solid ${on ? accent : ui.line}`,
                  }}>{t.l}</button>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Podium top-3 ─────────────────────────────────────────────────── */}
        <Podium top3={top3} loading={rows === null} myId={myId} accent={accent} />

        {/* ── Table ────────────────────────────────────────────────────────── */}
        <div style={{ marginTop: 'clamp(18px,2.5vw,28px)', borderRadius: ui.radius.lg, overflow: 'hidden', border: `1px solid ${ui.line}`, background: ui.surface }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: fonts.body, minWidth: 520 }}>
              <thead>
                <tr style={{ background: ui.bgElev }}>
                  <Th w={64} align="center">Rang</Th>
                  <Th>Joueur</Th>
                  <Th align="right" w={96}>ELO</Th>
                  <Th align="right" w={84}>Parties</Th>
                  <Th align="right" w={72}>%V</Th>
                </tr>
              </thead>
              <tbody>
                {rows === null && <GhostRows />}

                {vide && (
                  <tr>
                    <td colSpan={5} style={{ padding: 'clamp(40px,7vw,72px) 24px', textAlign: 'center' }}>
                      <div aria-hidden style={{ width: 44, height: 4, borderRadius: 2, background: accent, opacity: 0.7, margin: '0 auto 18px' }} />
                      <div style={{ font: `700 18px ${fonts.display}`, color: ui.text }}>
                        {err ? 'Classement indisponible' : 'Le ladder est vierge'}
                      </div>
                      <p style={{ margin: '8px auto 0', maxWidth: 380, font: `400 13.5px ${fonts.body}`, lineHeight: 1.55, color: ui.textDim }}>
                        {err ? 'Réessaie plus tard — le service de classement ne répond pas.' : 'Joue une partie classée en ligne pour inscrire ton nom et inaugurer le podium.'}
                      </p>
                    </td>
                  </tr>
                )}

                {(rows || []).map((r, i) => {
                  const mine = myId && String(r.discord_id) === myId
                  const games = (r.wins ?? 0) + (r.losses ?? 0) + (r.draws ?? 0)
                  const winPct = games > 0 ? Math.round(((r.wins ?? 0) / games) * 100) : null
                  return (
                    <tr key={r.discord_id ?? i} style={{ borderTop: `1px solid ${ui.line}`, background: mine ? `${accent}1a` : (i % 2 ? 'transparent' : 'rgba(255,255,255,0.012)'), boxShadow: mine ? `inset 3px 0 0 ${accent}` : 'none' }}>
                      <td style={{ padding: '11px 14px', textAlign: 'center' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                          <span style={{ fontFamily: fonts.mono, fontVariantNumeric: 'tabular-nums', fontWeight: 700, fontSize: 14, color: i < 3 ? accent : ui.textDim }}>{i + 1}</span>
                          {i < 3 && <span aria-hidden style={{ fontSize: 12 }}>{MEDAL[i]}</span>}
                        </span>
                      </td>
                      <td style={{ padding: '9px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                          <Avatar src={r.avatar} name={r.username} mine={mine} accent={accent} />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                              <span style={{ fontWeight: 700, fontSize: 14, color: mine ? STEEL_HI : ui.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>
                                {r.username || 'Joueur'}
                              </span>
                              {mine && <span style={{ fontSize: 10.5, fontWeight: 700, color: accent, letterSpacing: '.4px', flexShrink: 0 }}>VOUS</span>}
                              {(badges.get(String(r.discord_id)) || []).map(b => <BadgeChip key={b} badgeId={b} compact />)}
                            </div>
                            <div style={{ fontSize: 11.5, color: ui.textMute }}>{neutralTier(r.rating)}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '11px 14px', textAlign: 'right' }}>
                        <span style={{ fontFamily: fonts.mono, fontVariantNumeric: 'tabular-nums', fontWeight: 800, fontSize: 15, color: ui.text }}>{r.rating}</span>
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
        <p style={{ margin: '16px 2px 0', fontFamily: fonts.body, fontSize: 12, color: ui.textMute, lineHeight: 1.5 }}>
          Classement des parties classées en ligne. Distinct du classement des Échecs.
        </p>
      </div>
    </div>
  )
}

// Podium top-3 — marche centrale (1er) plus haute. Placeholders élégants si vide.
function Podium({ top3, loading, myId, accent }) {
  const order = [1, 0, 2]   // affichage : 2e · 1er · 3e
  const heights = { 0: 128, 1: 96, 2: 80 }
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'clamp(10px,1.4vw,18px)', alignItems: 'end',
      padding: 'clamp(18px,2.4vw,28px) clamp(14px,2vw,26px)', borderRadius: ui.radius.lg,
      background: glass.bg, backdropFilter: glass.blur, WebkitBackdropFilter: glass.blur,
      border: `1px solid ${glass.border}`, boxShadow: glass.shadow,
    }}>
      {order.map(pos => {
        const r = top3[pos]
        const mine = r && myId && String(r.discord_id) === myId
        return (
          <div key={pos} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', minWidth: 0 }}>
            <span aria-hidden style={{ fontSize: pos === 0 ? 26 : 20, lineHeight: 1, marginBottom: 8, filter: r ? 'none' : 'grayscale(1)', opacity: r ? 1 : 0.4 }}>{MEDAL[pos]}</span>
            <div style={{
              width: pos === 0 ? 64 : 52, height: pos === 0 ? 64 : 52, borderRadius: '50%', overflow: 'hidden',
              display: 'grid', placeItems: 'center', background: ui.surfaceHi,
              border: `2px solid ${pos === 0 ? accent : ui.line}`,
              boxShadow: pos === 0 && r ? `0 0 24px -4px ${accent}88` : 'none',
            }}>
              {r && r.avatar
                ? <img src={r.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ font: `700 ${pos === 0 ? 20 : 16}px ${fonts.body}`, color: r ? ui.text : ui.textMute }}>{r ? (r.username || '?').slice(0, 1).toUpperCase() : '·'}</span>}
            </div>
            <div style={{ marginTop: 9, maxWidth: '100%', font: `700 13px ${fonts.body}`, color: mine ? STEEL_HI : (r ? ui.text : ui.textMute), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {loading ? '—' : r ? (r.username || 'Joueur') : 'En attente'}
            </div>
            <div style={{ font: `800 17px ${fonts.mono}`, fontVariantNumeric: 'tabular-nums', color: r ? accent : ui.textMute, marginTop: 2 }}>
              {r ? r.rating : '----'}
            </div>
            <div style={{
              marginTop: 10, width: '100%', height: heights[pos],
              borderRadius: `${ui.radius.md}px ${ui.radius.md}px 0 0`,
              background: pos === 0 ? `linear-gradient(180deg, ${accent}26, ${accent}08)` : 'rgba(255,255,255,0.03)',
              border: `1px solid ${pos === 0 ? `${accent}55` : ui.line}`, borderBottom: 'none',
              display: 'grid', placeItems: 'start center', paddingTop: 8,
            }}>
              <span style={{ font: `800 13px ${fonts.mono}`, color: pos === 0 ? accent : ui.textMute }}>{pos + 1}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Lignes fantômes pendant le chargement (squelette table).
function GhostRows() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} aria-hidden style={{ borderTop: `1px solid ${ui.line}` }}>
          <td style={{ padding: '13px 14px' }}><div style={{ width: 20, height: 12, borderRadius: 4, background: ui.surfaceHi, margin: '0 auto' }} /></td>
          <td style={{ padding: '11px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: ui.surfaceHi }} />
              <div style={{ width: 150, height: 12, borderRadius: 4, background: ui.surfaceHi, opacity: 0.7 }} />
            </div>
          </td>
          <td style={{ padding: '13px 14px' }}><div style={{ width: 48, height: 12, borderRadius: 4, background: ui.surfaceHi, marginLeft: 'auto' }} /></td>
          <td style={{ padding: '13px 14px' }}><div style={{ width: 36, height: 12, borderRadius: 4, background: ui.surfaceHi, marginLeft: 'auto', opacity: 0.6 }} /></td>
          <td style={{ padding: '13px 14px' }}><div style={{ width: 32, height: 12, borderRadius: 4, background: ui.surfaceHi, marginLeft: 'auto', opacity: 0.6 }} /></td>
        </tr>
      ))}
    </>
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

