// ── RankingTab (Échecs) : classement ELO neutre ─────────────────────────────
// Source : getLeaderboard() (REST direct → table echecs_profils, order elo.desc).
// Colonnes : Rang · Joueur (avatar+pseudo) · ELO · Parties · %V · tendance ▲▼.
// Joueur courant surligné. Filtre Tous / Actifs (≥1 partie jouée). Zéro
// wanted-poster — tableau sobre, tabular-nums, accent laiton discret.
import { useState, useEffect } from 'react'
import { ui, fonts } from '../../../features/games/neutralTheme.js'
import { useAuth } from '../../../contexts/AuthContext.jsx'
import { getLeaderboard } from '../../../features/echecs/lib/api.js'
import { rangPourElo } from '../../../features/echecs/lib/elo.js'
import { saisonActive, classementSaison, countdownFinSaison } from '../../_shell/arena/seasons.js'
import { badgesPourJoueurs } from '../../_shell/arena/badges.js'
import BadgeChip from '../../_shell/arena/BadgeChip.jsx'
import { glass } from '../../_shell/arena/arenaTokens.js'

const ACCENT = ui.accent       // or laiton échecs
const ACCENT_HI = ui.accentHi

function trend(profil) {
  // pas de série temporelle fiable → tendance dérivée du ratio de victoires
  const parties = profil.parties ?? 0
  if (!parties) return { dir: 0, label: '–' }
  const tx = (profil.victoires ?? 0) / parties
  if (tx >= 0.55) return { dir: 1, label: '▲' }
  if (tx <= 0.45) return { dir: -1, label: '▼' }
  return { dir: 0, label: '–' }
}

function pourcentVictoires(p) {
  const parties = p.parties ?? 0
  if (!parties) return '–'
  return `${Math.round(((p.victoires ?? 0) / parties) * 100)}%`
}

function Avatar({ url, pseudo, rang }) {
  if (url) return <img src={url} alt="" width={28} height={28} style={{ borderRadius: 7, objectFit: 'cover', flexShrink: 0 }} />
  return (
    <div aria-hidden style={{
      width: 28, height: 28, borderRadius: 7, flexShrink: 0, display: 'grid', placeItems: 'center',
      background: ui.surfaceHi, border: `1px solid ${ui.line}`,
      font: `700 12px ${fonts.body}`, color: rang.couleur,
    }}>{(pseudo || '?').slice(0, 1).toUpperCase()}</div>
  )
}

// Normalise un row d'agrégat de saison (game_season_standings) vers la forme
// d'affichage des profils échecs, en conservant discord_id pour les badges.
function fromSaison(r) {
  return {
    user_id: r.discord_id ? `dc:${r.discord_id}` : undefined,   // clé d'affichage stable
    discord_id: r.discord_id,
    pseudo: r.username,
    avatar: r.avatar,
    elo: r.rating,
    parties: r.games ?? ((r.wins ?? 0) + (r.losses ?? 0) + (r.draws ?? 0)),
    victoires: r.wins ?? 0,
  }
}

export default function RankingTab() {
  const { userId } = useAuth()
  const [profils, setProfils] = useState(null)
  const [erreur, setErreur] = useState(false)
  const [filtre, setFiltre] = useState('tous')   // 'tous' | 'actifs' (≥1 partie jouée)
  const [saison, setSaison] = useState(null)      // saison active échecs (ou null)
  const [seasonRows, setSeasonRows] = useState(null)
  const [vue, setVue] = useState('saison')        // 'saison' | 'alltime' (dégrade vers all-time si pas de saison)
  const [badges, setBadges] = useState(new Map())

  useEffect(() => {
    let actif = true
    getLeaderboard(50).then(data => {
      if (!actif) return
      if (!Array.isArray(data)) { setErreur(true); setProfils([]); return }
      setProfils(data)
    }).catch(() => { if (actif) { setErreur(true); setProfils([]) } })
    // Saison active (REST direct, dégrade en silence si table absente)
    saisonActive('echecs').then(s => {
      if (!actif) return
      setSaison(s)
      if (s) classementSaison(s.id, 50).then(rows => { if (actif) setSeasonRows(Array.isArray(rows) ? rows.map(fromSaison) : []) }).catch(() => { if (actif) setSeasonRows([]) })
      else setSeasonRows([])
    }).catch(() => { if (actif) { setSaison(null); setSeasonRows([]) } })
    return () => { actif = false }
  }, [])

  // Pas de saison active → vue all-time forcée (dégradation gracieuse).
  const aSaison = !!saison
  const vueEffective = aSaison ? vue : 'alltime'
  const source = vueEffective === 'saison' ? seasonRows : profils
  const countdown = aSaison ? countdownFinSaison(saison) : null

  // Badges (un seul appel). Les profils all-time échecs n'ont pas de discord_id
  // → la Map reste vide pour eux (dégradation gracieuse) ; en vue saison, oui.
  useEffect(() => {
    let actif = true
    const ids = (source || []).map(p => p.discord_id).filter(Boolean)
    if (!ids.length) { setBadges(new Map()); return }
    badgesPourJoueurs(ids, 'echecs').then(m => { if (actif) setBadges(m) }).catch(() => { if (actif) setBadges(new Map()) })
    return () => { actif = false }
  }, [source])

  const liste = (source || []).filter(p => filtre === 'tous' ? true : (p.parties ?? 0) > 0)   // 'actifs' = a joué au moins une partie
  const top3 = liste.slice(0, 3)
  const vide = source !== null && liste.length === 0

  return (
    <div style={{ minHeight: '100%', overflowY: 'auto', padding: 'clamp(20px,3vw,40px) clamp(16px,4vw,52px) 56px' }}>
      <div style={{ width: '100%', maxWidth: 1180, margin: '0 auto' }}>

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <header style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 18, marginBottom: 'clamp(20px,3vw,34px)' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ font: `700 11px ${fonts.body}`, letterSpacing: '0.22em', textTransform: 'uppercase', color: ACCENT }}>Échecs · Classé</div>
            <h1 style={{ margin: '8px 0 0', font: `800 clamp(28px,4.4vw,42px) ${fonts.display}`, letterSpacing: '-0.02em', color: ui.text }}>Classement</h1>
            <p style={{ margin: '8px 0 0', maxWidth: 520, font: `400 13.5px ${fonts.body}`, lineHeight: 1.55, color: ui.textDim }}>
              Le ladder ELO des parties classées. Grimpe le podium, défends ta place.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            {[{ id: 'tous', l: 'Tous' }, { id: 'actifs', l: 'Actifs' }].map(f => (
              <button key={f.id} onClick={() => setFiltre(f.id)} style={{
                padding: '7px 15px', borderRadius: ui.radius.pill, cursor: 'pointer',
                font: `600 12.5px ${fonts.body}`,
                color: filtre === f.id ? ACCENT_HI : ui.textDim,
                background: filtre === f.id ? `${ACCENT}22` : ui.surface,
                border: `1px solid ${filtre === f.id ? ACCENT : ui.line}`,
              }}>{f.l}</button>
            ))}
          </div>
        </header>

        {/* ── Bandeau saison ───────────────────────────────────────────────── */}
        {aSaison && (
          <div style={{
            display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 'clamp(16px,2vw,22px)',
            padding: '12px 16px', borderRadius: ui.radius.md,
            background: glass.bg, backdropFilter: glass.blur, WebkitBackdropFilter: glass.blur,
            border: `1px solid ${glass.border}`,
          }}>
            <span aria-hidden style={{ width: 8, height: 8, borderRadius: '50%', background: ACCENT, boxShadow: `0 0 10px 1px ${ACCENT}` }} />
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
                    color: on ? ACCENT_HI : ui.textDim,
                    background: on ? `${ACCENT}22` : 'transparent',
                    border: `1px solid ${on ? ACCENT : ui.line}`,
                  }}>{t.l}</button>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Podium top-3 ─────────────────────────────────────────────────── */}
        <Podium top3={top3} vide={vide} userId={userId} loading={source === null} />

        {/* ── Table ────────────────────────────────────────────────────────── */}
        <div style={{ marginTop: 'clamp(18px,2.5vw,28px)', borderRadius: ui.radius.lg, overflow: 'hidden', border: `1px solid ${ui.line}`, background: ui.surface }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '64px 1fr 96px 84px 72px 56px',
            gap: 10, padding: '12px 18px', background: ui.bgElev,
            font: `700 10.5px ${fonts.body}`, letterSpacing: '0.1em', textTransform: 'uppercase', color: ui.textMute,
          }}>
            <span>Rang</span><span>Joueur</span>
            <span style={{ textAlign: 'right' }}>ELO</span>
            <span style={{ textAlign: 'right' }}>Parties</span>
            <span style={{ textAlign: 'right' }}>%V</span>
            <span style={{ textAlign: 'center' }}>Tend.</span>
          </div>

          {source === null && <GhostRows />}

          {vide && (
            <div style={{ padding: 'clamp(40px,7vw,72px) 24px', textAlign: 'center' }}>
              <div aria-hidden style={{ width: 44, height: 4, borderRadius: 2, background: ACCENT, opacity: 0.7, margin: '0 auto 18px' }} />
              <div style={{ font: `700 18px ${fonts.display}`, color: ui.text }}>
                {erreur ? 'Classement indisponible' : 'Le ladder est vierge'}
              </div>
              <p style={{ margin: '8px auto 0', maxWidth: 380, font: `400 13.5px ${fonts.body}`, lineHeight: 1.55, color: ui.textDim }}>
                {erreur ? 'Réessaie plus tard — le service de classement ne répond pas.' : 'Lance une partie classée pour inscrire ton nom et inaugurer le podium.'}
              </p>
            </div>
          )}

          {liste.map((p, i) => {
            const moi = userId && p.user_id === userId
            const rang = rangPourElo(p.elo)
            const t = trend(p)
            return (
              <div key={p.user_id || i} style={{
                display: 'grid', gridTemplateColumns: '64px 1fr 96px 84px 72px 56px',
                gap: 10, padding: '11px 18px', alignItems: 'center',
                background: moi ? `${ACCENT}1a` : (i % 2 ? 'transparent' : 'rgba(255,255,255,0.012)'),
                borderTop: `1px solid ${ui.line}`,
                boxShadow: moi ? `inset 3px 0 0 ${ACCENT}` : 'none',
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ font: `700 14px ${fonts.mono}`, fontVariantNumeric: 'tabular-nums', color: i < 3 ? ACCENT : ui.textDim }}>{i + 1}</span>
                  {i < 3 && <span aria-hidden style={{ fontSize: 12 }}>{MEDAL[i]}</span>}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <Avatar url={p.avatar} pseudo={p.pseudo} rang={rang} />
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                      <span style={{ font: `700 13.5px ${fonts.body}`, color: moi ? ACCENT_HI : ui.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.pseudo || 'Joueur'}{moi ? ' · vous' : ''}
                      </span>
                      {(badges.get(String(p.discord_id)) || []).map(b => <BadgeChip key={b} badgeId={b} compact />)}
                    </span>
                    <span style={{ display: 'block', font: `600 10.5px ${fonts.body}`, color: rang.couleur, marginTop: 1 }}>{rang.label}</span>
                  </span>
                </span>
                <span style={{ textAlign: 'right', font: `800 15px ${fonts.mono}`, fontVariantNumeric: 'tabular-nums', color: ui.text }}>{p.elo ?? '–'}</span>
                <span style={{ textAlign: 'right', font: `600 13px ${fonts.mono}`, fontVariantNumeric: 'tabular-nums', color: ui.textDim }}>{p.parties ?? 0}</span>
                <span style={{ textAlign: 'right', font: `600 13px ${fonts.mono}`, fontVariantNumeric: 'tabular-nums', color: ui.textDim }}>{pourcentVictoires(p)}</span>
                <span style={{ textAlign: 'center', font: `700 13px ${fonts.body}`, color: t.dir > 0 ? ui.good : (t.dir < 0 ? ui.bad : ui.textMute) }}>{t.label}</span>
              </div>
            )
          })}
        </div>

        <p style={{ marginTop: 16, font: `400 11.5px ${fonts.body}`, color: ui.textMute, lineHeight: 1.5 }}>
          ELO mis à jour à l'issue des parties classées. La tendance reflète le ratio de victoires.
        </p>
      </div>
    </div>
  )
}

const MEDAL = ['🥇', '🥈', '🥉']

// Podium top-3 — marche centrale (1er) plus haute. Placeholders si vide.
function Podium({ top3, vide, userId, loading }) {
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
        const p = top3[pos]
        const rang = p ? rangPourElo(p.elo) : null
        const moi = p && userId && p.user_id === userId
        return (
          <div key={pos} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', minWidth: 0 }}>
            <span aria-hidden style={{ fontSize: pos === 0 ? 26 : 20, lineHeight: 1, marginBottom: 8, filter: p ? 'none' : 'grayscale(1)', opacity: p ? 1 : 0.4 }}>{MEDAL[pos]}</span>
            <div style={{
              width: pos === 0 ? 64 : 52, height: pos === 0 ? 64 : 52, borderRadius: '50%', overflow: 'hidden',
              display: 'grid', placeItems: 'center', background: ui.surfaceHi,
              border: `2px solid ${pos === 0 ? ACCENT : ui.line}`,
              boxShadow: pos === 0 && p ? `0 0 24px -4px ${ACCENT}88` : 'none',
            }}>
              {p && p.avatar
                ? <img src={p.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ font: `700 ${pos === 0 ? 20 : 16}px ${fonts.body}`, color: p ? (rang?.couleur || ui.text) : ui.textMute }}>{p ? (p.pseudo || '?').slice(0, 1).toUpperCase() : '·'}</span>}
            </div>
            <div style={{ marginTop: 9, maxWidth: '100%', font: `700 13px ${fonts.body}`, color: moi ? ACCENT_HI : (p ? ui.text : ui.textMute), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {loading ? '—' : p ? (p.pseudo || 'Joueur') : 'En attente'}
            </div>
            <div style={{ font: `800 17px ${fonts.mono}`, fontVariantNumeric: 'tabular-nums', color: p ? ACCENT : ui.textMute, marginTop: 2 }}>
              {p ? p.elo : '----'}
            </div>
            <div style={{
              marginTop: 10, width: '100%', height: heights[pos],
              borderRadius: `${ui.radius.md}px ${ui.radius.md}px 0 0`,
              background: pos === 0 ? `linear-gradient(180deg, ${ACCENT}26, ${ACCENT}08)` : 'rgba(255,255,255,0.03)',
              border: `1px solid ${pos === 0 ? `${ACCENT}55` : ui.line}`, borderBottom: 'none',
              display: 'grid', placeItems: 'start center', paddingTop: 8,
            }}>
              <span style={{ font: `800 13px ${fonts.mono}`, color: pos === 0 ? ACCENT : ui.textMute }}>{pos + 1}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function GhostRows() {
  return (
    <div aria-hidden>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} style={{
          display: 'grid', gridTemplateColumns: '64px 1fr 96px 84px 72px 56px', gap: 10,
          padding: '11px 18px', alignItems: 'center', borderTop: `1px solid ${ui.line}`,
        }}>
          <div style={{ width: 20, height: 12, borderRadius: 4, background: ui.surfaceHi }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: ui.surfaceHi }} />
            <div style={{ width: 130, height: 12, borderRadius: 4, background: ui.surfaceHi, opacity: 0.7 }} />
          </div>
          <div style={{ height: 12, borderRadius: 4, background: ui.surfaceHi, justifySelf: 'end', width: 48 }} />
          <div style={{ height: 12, borderRadius: 4, background: ui.surfaceHi, justifySelf: 'end', width: 36, opacity: 0.6 }} />
          <div style={{ height: 12, borderRadius: 4, background: ui.surfaceHi, justifySelf: 'end', width: 32, opacity: 0.6 }} />
          <div style={{ height: 12, borderRadius: 4, background: ui.surfaceHi, justifySelf: 'center', width: 16, opacity: 0.5 }} />
        </div>
      ))}
    </div>
  )
}
