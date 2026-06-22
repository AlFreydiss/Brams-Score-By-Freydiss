// ── RankingTab (Échecs) : classement ELO neutre ─────────────────────────────
// Source : getLeaderboard() (REST direct → table echecs_profils, order elo.desc).
// Colonnes : Rang · Joueur (avatar+pseudo) · ELO · Parties · %V · tendance ▲▼.
// Joueur courant surligné. Filtre Tous / Saison (heuristique : récents). Zéro
// wanted-poster — tableau sobre, tabular-nums, accent laiton discret.
import { useState, useEffect } from 'react'
import { ui, fonts } from '../../../features/games/neutralTheme.js'
import { useAuth } from '../../../contexts/AuthContext.jsx'
import { getLeaderboard } from '../../../features/echecs/lib/api.js'
import { rangPourElo } from '../../../features/echecs/lib/elo.js'

const BRASS = '#b09467'

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

export default function RankingTab() {
  const { userId } = useAuth()
  const [profils, setProfils] = useState(null)
  const [erreur, setErreur] = useState(false)
  const [filtre, setFiltre] = useState('tous')   // 'tous' | 'saison'

  useEffect(() => {
    let actif = true
    getLeaderboard(50).then(data => {
      if (!actif) return
      if (!Array.isArray(data)) { setErreur(true); setProfils([]); return }
      setProfils(data)
    }).catch(() => { if (actif) { setErreur(true); setProfils([]) } })
    return () => { actif = false }
  }, [])

  const liste = (profils || []).filter(p => filtre === 'tous' ? true : (p.parties ?? 0) > 0)

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '22px 18px 40px' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 14, marginBottom: 18, flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0, font: `800 24px ${fonts.display}`, letterSpacing: '-0.02em', color: ui.text }}>Classement</h2>
          <div style={{ display: 'flex', gap: 6 }}>
            {[{ id: 'tous', l: 'Tous' }, { id: 'saison', l: 'Saison' }].map(f => (
              <button key={f.id} onClick={() => setFiltre(f.id)} style={{
                padding: '6px 13px', borderRadius: ui.radius.pill, cursor: 'pointer',
                font: `600 12.5px ${fonts.body}`,
                color: filtre === f.id ? '#e7d8b8' : ui.textDim,
                background: filtre === f.id ? 'rgba(176,148,103,0.14)' : ui.surface,
                border: `1px solid ${filtre === f.id ? 'rgba(176,148,103,0.5)' : ui.line}`,
              }}>{f.l}</button>
            ))}
          </div>
        </div>

        {profils === null && (
          <div style={{ padding: '40px 0', textAlign: 'center', color: ui.textMute, font: `500 13px ${fonts.body}` }}>Chargement…</div>
        )}

        {profils !== null && liste.length === 0 && (
          <div style={{
            padding: '34px 20px', textAlign: 'center', borderRadius: ui.radius.md,
            background: ui.surface, border: `1px solid ${ui.line}`, color: ui.textDim, font: `500 13.5px ${fonts.body}`, lineHeight: 1.6,
          }}>
            {erreur ? 'Classement indisponible pour le moment.' : 'Aucun joueur classé pour l\'instant. Lance une partie classée pour apparaître ici.'}
          </div>
        )}

        {liste.length > 0 && (
          <div style={{ borderRadius: ui.radius.md, overflow: 'hidden', border: `1px solid ${ui.line}` }}>
            {/* En-tête */}
            <div style={{
              display: 'grid', gridTemplateColumns: '46px 1fr 76px 64px 54px 40px',
              gap: 8, padding: '9px 14px', background: ui.bgElev,
              font: `700 10.5px ${fonts.body}`, letterSpacing: '0.08em', textTransform: 'uppercase', color: ui.textMute,
            }}>
              <span>Rang</span><span>Joueur</span>
              <span style={{ textAlign: 'right' }}>ELO</span>
              <span style={{ textAlign: 'right' }}>Parties</span>
              <span style={{ textAlign: 'right' }}>%V</span>
              <span style={{ textAlign: 'center' }}>Tend.</span>
            </div>
            {liste.map((p, i) => {
              const moi = userId && p.user_id === userId
              const rang = rangPourElo(p.elo)
              const t = trend(p)
              return (
                <div key={p.user_id || i} style={{
                  display: 'grid', gridTemplateColumns: '46px 1fr 76px 64px 54px 40px',
                  gap: 8, padding: '10px 14px', alignItems: 'center',
                  background: moi ? 'rgba(176,148,103,0.10)' : (i % 2 ? 'transparent' : 'rgba(255,255,255,0.012)'),
                  borderTop: `1px solid ${ui.line}`,
                  boxShadow: moi ? `inset 3px 0 0 ${BRASS}` : 'none',
                }}>
                  <span style={{ font: `700 14px ${fonts.mono}`, fontVariantNumeric: 'tabular-nums', color: i < 3 ? BRASS : ui.textDim }}>{i + 1}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                    <Avatar url={p.avatar} pseudo={p.pseudo} rang={rang} />
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: 'block', font: `700 13.5px ${fonts.body}`, color: moi ? '#e7d8b8' : ui.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.pseudo || 'Joueur'}{moi ? ' · vous' : ''}
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
        )}

        <p style={{ marginTop: 14, font: `400 11.5px ${fonts.body}`, color: ui.textMute, lineHeight: 1.5 }}>
          ELO mis à jour à l'issue des parties classées. La tendance reflète le ratio de victoires.
        </p>
      </div>
    </div>
  )
}
