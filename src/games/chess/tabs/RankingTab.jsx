// ── RankingTab (Échecs) : classement ELO premium « chess.com » ───────────────
// Source : getLeaderboard() (REST direct → table echecs_profils, order elo.desc).
// Colonnes : Rang · Joueur (avatar+pseudo+rang) · ELO · Parties · %V (barre) · ▲▼.
// Joueur courant surligné vert. Filtre Tous / Actifs (≥1 partie). Saison + podium.
// Look : charbon chaud + vert chess.com (#81B64C), tabular-nums. Données INTACTES.
import { useState, useEffect } from 'react'
import { fonts } from '../../../features/games/neutralTheme.js'
import { useAuth } from '../../../contexts/AuthContext.jsx'
import { getLeaderboard } from '../../../features/echecs/lib/api.js'
import { rangPourElo } from '../../../features/echecs/lib/elo.js'
import { saisonActive, classementSaison, countdownFinSaison } from '../../_shell/arena/seasons.js'
import { badgesPourJoueurs } from '../../_shell/arena/badges.js'
import BadgeChip from '../../_shell/arena/BadgeChip.jsx'
import { cc } from '../ui/chesscom.js'

const ACCENT = cc.green        // vert chess.com (#81B64C)
const ACCENT_HI = cc.greenHi
const ACCENT_DK = cc.greenDk

// Grille partagée header / lignes / ghosts → alignement strict des colonnes.
const COLS = '54px minmax(0,1fr) 92px 84px 120px 50px'
const PAD_X = 18

// Styles d'états (hover / focus-visible / reduced-motion) impossibles en inline.
const CSS = `
.cc-rk-btn{transition:background .15s ease,border-color .15s ease,color .15s ease,box-shadow .15s ease}
.cc-rk-btn:hover{border-color:${ACCENT}}
.cc-rk-btn:focus-visible{outline:2px solid ${ACCENT_HI};outline-offset:2px}
.cc-rk-row{transition:background .14s ease}
.cc-rk-row:hover{background:${cc.rowHi}}
@media (prefers-reduced-motion: reduce){
  .cc-rk-btn,.cc-rk-row{transition:none}
}`

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

function tauxVictoires(p) {
  const parties = p.parties ?? 0
  if (!parties) return null
  return Math.max(0, Math.min(1, (p.victoires ?? 0) / parties))
}

function Avatar({ url, pseudo, rang, size = 30 }) {
  if (url) return <img src={url} alt="" width={size} height={size} style={{ borderRadius: cc.radius.sm, objectFit: 'cover', flexShrink: 0, border: `1px solid ${cc.line}` }} />
  return (
    <div aria-hidden style={{
      width: size, height: size, borderRadius: cc.radius.sm, flexShrink: 0, display: 'grid', placeItems: 'center',
      background: cc.panelHi, border: `1px solid ${cc.line}`,
      font: `700 ${Math.round(size * 0.42)}px ${fonts.body}`, color: rang?.couleur || cc.textDim,
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

  const filtres = [{ id: 'tous', l: 'Tous' }, { id: 'actifs', l: 'Actifs' }]

  return (
    <div style={{
      minHeight: '100%', overflowY: 'auto',
      padding: 'clamp(20px,3vw,40px) clamp(16px,4vw,52px) 64px',
      background: cc.bg,
      backgroundImage: `radial-gradient(120% 80% at 50% -8%, ${ACCENT}14, transparent 60%)`,
    }}>
      <style>{CSS}</style>
      <div style={{ width: '100%', maxWidth: 1280, margin: '0 auto' }}>

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <header style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 18, marginBottom: 'clamp(18px,2.6vw,30px)' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, font: `800 11px ${fonts.body}`, letterSpacing: '0.22em', textTransform: 'uppercase', color: ACCENT_HI }}>
              <span aria-hidden style={{ fontSize: 13, lineHeight: 1 }}>♟</span> Échecs · Classé
            </div>
            <h1 style={{ margin: '8px 0 0', font: `800 clamp(30px,4.6vw,46px) ${fonts.display}`, letterSpacing: '-0.025em', color: cc.text }}>Classement</h1>
            <p style={{ margin: '9px 0 0', maxWidth: 540, font: `400 13.5px ${fonts.body}`, lineHeight: 1.55, color: cc.textDim }}>
              Le ladder ELO des parties classées. Grimpe le podium, défends ta place au sommet.
            </p>
          </div>
          <div role="tablist" aria-label="Filtre du classement" style={{ display: 'flex', gap: 6, flexShrink: 0, padding: 4, borderRadius: cc.radius.pill, background: cc.panel, border: `1px solid ${cc.line}` }}>
            {filtres.map(f => {
              const on = filtre === f.id
              return (
                <button key={f.id} role="tab" aria-selected={on} className="cc-rk-btn" onClick={() => setFiltre(f.id)} style={{
                  padding: '7px 18px', borderRadius: cc.radius.pill, cursor: 'pointer',
                  font: `700 12.5px ${fonts.body}`,
                  color: on ? '#fff' : cc.textDim,
                  background: on ? ACCENT : 'transparent',
                  border: `1px solid ${on ? ACCENT_DK : 'transparent'}`,
                  boxShadow: on ? `inset 0 -2px 0 ${ACCENT_DK}` : 'none',
                }}>{f.l}</button>
              )
            })}
          </div>
        </header>

        {/* ── Bandeau saison ───────────────────────────────────────────────── */}
        {aSaison && (
          <div style={{
            display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 'clamp(14px,2vw,20px)',
            padding: '12px 16px', borderRadius: cc.radius.md,
            background: `linear-gradient(90deg, ${ACCENT}1f, ${cc.panel} 55%)`,
            border: `1px solid ${ACCENT}3a`,
          }}>
            <span aria-hidden style={{ width: 9, height: 9, borderRadius: '50%', background: ACCENT, boxShadow: `0 0 10px 1px ${ACCENT}` }} />
            <span style={{ font: `800 12.5px ${fonts.body}`, color: cc.text, letterSpacing: '.2px' }}>{saison.label || 'Saison en cours'}</span>
            {countdown && vueEffective === 'saison' && (
              <span style={{ font: `600 11.5px ${fonts.body}`, color: cc.textMute }}>· fin dans {countdown}</span>
            )}
            <div role="tablist" aria-label="Période du classement" style={{ display: 'flex', gap: 4, marginLeft: 'auto', padding: 3, borderRadius: cc.radius.pill, background: cc.bg, border: `1px solid ${cc.line}` }}>
              {[{ id: 'saison', l: 'Saison' }, { id: 'alltime', l: 'Tout temps' }].map(t => {
                const on = vueEffective === t.id
                return (
                  <button key={t.id} role="tab" aria-selected={on} className="cc-rk-btn" onClick={() => setVue(t.id)} style={{
                    padding: '5px 13px', borderRadius: cc.radius.pill, cursor: 'pointer',
                    font: `700 11.5px ${fonts.body}`,
                    color: on ? '#fff' : cc.textDim,
                    background: on ? ACCENT : 'transparent',
                    border: `1px solid ${on ? ACCENT_DK : 'transparent'}`,
                  }}>{t.l}</button>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Podium top-3 ─────────────────────────────────────────────────── */}
        <Podium top3={top3} userId={userId} loading={source === null} />

        {/* ── Table ────────────────────────────────────────────────────────── */}
        <div style={{ marginTop: 'clamp(16px,2.4vw,26px)', borderRadius: cc.radius.lg, overflow: 'hidden', border: `1px solid ${cc.line}`, background: cc.panel, boxShadow: cc.shadow }}>
          <div style={{
            display: 'grid', gridTemplateColumns: COLS,
            gap: 12, padding: `12px ${PAD_X}px`, background: cc.panelHi,
            font: `800 10.5px ${fonts.body}`, letterSpacing: '0.1em', textTransform: 'uppercase', color: cc.textMute,
            borderBottom: `1px solid ${cc.line}`,
          }}>
            <span>#</span><span>Joueur</span>
            <span style={{ textAlign: 'right' }}>ELO</span>
            <span style={{ textAlign: 'right' }}>Parties</span>
            <span style={{ textAlign: 'right' }}>Victoires</span>
            <span style={{ textAlign: 'center' }}>Tend.</span>
          </div>

          {source === null && <GhostRows />}

          {vide && (
            <div style={{ padding: 'clamp(40px,7vw,76px) 24px', textAlign: 'center' }}>
              <div aria-hidden style={{ fontSize: 34, lineHeight: 1, marginBottom: 14, opacity: 0.85 }}>♟</div>
              <div aria-hidden style={{ width: 46, height: 4, borderRadius: 2, background: ACCENT, margin: '0 auto 16px' }} />
              <div style={{ font: `800 19px ${fonts.display}`, color: cc.text }}>
                {erreur ? 'Classement indisponible' : 'Le ladder est vierge'}
              </div>
              <p style={{ margin: '8px auto 0', maxWidth: 400, font: `400 13.5px ${fonts.body}`, lineHeight: 1.55, color: cc.textDim }}>
                {erreur ? 'Réessaie plus tard — le service de classement ne répond pas.' : 'Lance une partie classée pour inscrire ton nom et inaugurer le podium.'}
              </p>
            </div>
          )}

          {liste.map((p, i) => {
            const moi = userId && p.user_id === userId
            const rang = rangPourElo(p.elo)
            const t = trend(p)
            const wr = tauxVictoires(p)
            return (
              <div key={p.user_id || i} className={moi ? undefined : 'cc-rk-row'} style={{
                display: 'grid', gridTemplateColumns: COLS,
                gap: 12, padding: `11px ${PAD_X}px`, alignItems: 'center',
                background: moi ? `${ACCENT}22` : (i % 2 ? 'transparent' : cc.row),
                borderTop: `1px solid ${cc.line}`,
                boxShadow: moi ? `inset 3px 0 0 ${ACCENT}` : 'none',
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  {i < 3
                    ? <span aria-hidden style={{ fontSize: 15, lineHeight: 1 }}>{MEDAL[i]}</span>
                    : <span style={{ font: `700 14px ${fonts.mono}`, fontVariantNumeric: 'tabular-nums', color: cc.textMute, width: 22, textAlign: 'center' }}>{i + 1}</span>}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
                  <Avatar url={p.avatar} pseudo={p.pseudo} rang={rang} />
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                      <span style={{ font: `700 13.5px ${fonts.body}`, color: moi ? ACCENT_HI : cc.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.pseudo || 'Joueur'}{moi ? ' · vous' : ''}
                      </span>
                      {(badges.get(String(p.discord_id)) || []).map(b => <BadgeChip key={b} badgeId={b} compact />)}
                    </span>
                    <span style={{ display: 'block', font: `700 10.5px ${fonts.body}`, color: rang.couleur, marginTop: 2, letterSpacing: '.2px' }}>{rang.label}</span>
                  </span>
                </span>
                <span style={{ textAlign: 'right', font: `800 15.5px ${fonts.mono}`, fontVariantNumeric: 'tabular-nums', color: i < 3 ? ACCENT_HI : cc.text }}>{p.elo ?? '–'}</span>
                <span style={{ textAlign: 'right', font: `600 13px ${fonts.mono}`, fontVariantNumeric: 'tabular-nums', color: cc.textDim }}>{p.parties ?? 0}</span>
                <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <span style={{ font: `700 12.5px ${fonts.mono}`, fontVariantNumeric: 'tabular-nums', color: cc.textDim }}>{pourcentVictoires(p)}</span>
                  {wr !== null && (
                    <span aria-hidden style={{ width: '100%', maxWidth: 88, height: 5, borderRadius: 3, background: 'rgba(0,0,0,0.28)', overflow: 'hidden' }}>
                      <span style={{ display: 'block', height: '100%', width: `${Math.round(wr * 100)}%`, borderRadius: 3, background: `linear-gradient(90deg, ${ACCENT_DK}, ${ACCENT})` }} />
                    </span>
                  )}
                </span>
                <span style={{ textAlign: 'center', font: `800 13px ${fonts.body}`, color: t.dir > 0 ? ACCENT : (t.dir < 0 ? cc.danger : cc.textMute) }}>{t.label}</span>
              </div>
            )
          })}
        </div>

        <p style={{ marginTop: 16, font: `400 11.5px ${fonts.body}`, color: cc.textMute, lineHeight: 1.5 }}>
          ELO mis à jour à l'issue des parties classées. La tendance reflète le ratio de victoires.
        </p>
      </div>
    </div>
  )
}

const MEDAL = ['🥇', '🥈', '🥉']
const RING = ['#FFD45A', '#CBD2DA', '#D6924A']   // or · argent · bronze

// Podium top-3 « chess.com » — marche centrale (1er) plus haute. Placeholders si vide.
function Podium({ top3, userId, loading }) {
  const order = [1, 0, 2]   // affichage : 2e · 1er · 3e
  const heights = { 0: 138, 1: 104, 2: 86 }
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'clamp(10px,1.4vw,18px)', alignItems: 'end',
      padding: 'clamp(20px,2.6vw,30px) clamp(14px,2vw,28px) 0', borderRadius: cc.radius.lg,
      background: `linear-gradient(180deg, ${cc.panelHi}, ${cc.panel})`,
      border: `1px solid ${cc.line}`, boxShadow: cc.shadow, overflow: 'hidden',
    }}>
      {order.map(pos => {
        const p = top3[pos]
        const rang = p ? rangPourElo(p.elo) : null
        const moi = p && userId && p.user_id === userId
        const lead = pos === 0
        const avSize = lead ? 76 : 58
        return (
          <div key={pos} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', minWidth: 0 }}>
            {lead && <span aria-hidden style={{ fontSize: 18, lineHeight: 1, marginBottom: 2, opacity: p ? 1 : 0.35 }}>👑</span>}
            <span aria-hidden style={{ fontSize: lead ? 24 : 19, lineHeight: 1, marginBottom: 9, filter: p ? 'none' : 'grayscale(1)', opacity: p ? 1 : 0.4 }}>{MEDAL[pos]}</span>
            <div style={{
              width: avSize, height: avSize, borderRadius: '50%', overflow: 'hidden',
              display: 'grid', placeItems: 'center', background: cc.panelHi,
              border: `3px solid ${p ? RING[pos] : cc.line}`,
              boxShadow: lead && p ? `0 0 26px -4px ${ACCENT}99` : 'none',
            }}>
              {p && p.avatar
                ? <img src={p.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ font: `800 ${lead ? 24 : 18}px ${fonts.body}`, color: p ? (rang?.couleur || cc.text) : cc.textMute }}>{p ? (p.pseudo || '?').slice(0, 1).toUpperCase() : '·'}</span>}
            </div>
            <div style={{ marginTop: 10, maxWidth: '100%', font: `800 13.5px ${fonts.body}`, color: moi ? ACCENT_HI : (p ? cc.text : cc.textMute), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', padding: '0 4px' }}>
              {loading ? '—' : p ? (p.pseudo || 'Joueur') : 'En attente'}
            </div>
            {p && rang && (
              <div style={{ font: `700 10px ${fonts.body}`, color: rang.couleur, marginTop: 2, textTransform: 'uppercase', letterSpacing: '.4px' }}>{rang.label}</div>
            )}
            <div style={{ font: `800 18px ${fonts.mono}`, fontVariantNumeric: 'tabular-nums', color: p ? ACCENT_HI : cc.textMute, marginTop: 4 }}>
              {p ? p.elo : '----'}
            </div>
            <div style={{
              marginTop: 12, width: '100%', height: heights[pos],
              borderRadius: `${cc.radius.md}px ${cc.radius.md}px 0 0`,
              background: lead ? `linear-gradient(180deg, ${ACCENT}33, ${ACCENT}0a)` : 'rgba(255,255,255,0.035)',
              border: `1px solid ${lead ? `${ACCENT}66` : cc.line}`, borderBottom: 'none',
              display: 'grid', placeItems: 'start center', paddingTop: 10,
            }}>
              <span style={{ font: `800 15px ${fonts.mono}`, color: lead ? ACCENT_HI : cc.textMute }}>{pos + 1}</span>
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
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} style={{
          display: 'grid', gridTemplateColumns: COLS, gap: 12,
          padding: `11px ${PAD_X}px`, alignItems: 'center', borderTop: `1px solid ${cc.line}`,
        }}>
          <div style={{ width: 20, height: 14, borderRadius: 4, background: cc.panelHi }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <div style={{ width: 30, height: 30, borderRadius: cc.radius.sm, background: cc.panelHi }} />
            <div>
              <div style={{ width: 132, height: 12, borderRadius: 4, background: cc.panelHi, opacity: 0.8 }} />
              <div style={{ width: 64, height: 9, borderRadius: 4, background: cc.panelHi, opacity: 0.45, marginTop: 6 }} />
            </div>
          </div>
          <div style={{ height: 14, borderRadius: 4, background: cc.panelHi, justifySelf: 'end', width: 50 }} />
          <div style={{ height: 12, borderRadius: 4, background: cc.panelHi, justifySelf: 'end', width: 36, opacity: 0.6 }} />
          <div style={{ height: 12, borderRadius: 4, background: cc.panelHi, justifySelf: 'end', width: 72, opacity: 0.6 }} />
          <div style={{ height: 12, borderRadius: 4, background: cc.panelHi, justifySelf: 'center', width: 16, opacity: 0.5 }} />
        </div>
      ))}
    </div>
  )
}
