// ── Lobby Dames : carte de rang (prime One Piece) + leaderboard ──────────────
import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { ensureDamesProfile, getDamesLeaderboard } from '../../lib/dames/damesApi.js'
import { eloToTier, formatPrime } from '../../lib/dames/damesRank.js'

const GOLD = '#d4a017'
const cardStyle = { width: '100%', maxWidth: 520, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 16, padding: 16 }
const avatarStyle = { width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,.08)', fontSize: 14, fontWeight: 800, color: '#fff' }
const dim = { fontSize: 12.5, color: 'rgba(243,234,216,.45)', padding: '14px 4px', textAlign: 'center' }

export function DamesRankCard() {
  const { isAuthenticated, displayName, avatarUrl } = useAuth()
  const [p, setP] = useState(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (!isAuthenticated) { setLoading(false); return }
    let on = true
    ensureDamesProfile().then((pr) => { if (on) { setP(pr); setLoading(false) } }).catch(() => { if (on) setLoading(false) })
    return () => { on = false }
  }, [isAuthenticated])

  if (!isAuthenticated) return <div style={cardStyle}><div style={{ fontSize: 13, color: 'rgba(243,234,216,.6)' }}>Connecte-toi pour suivre ton rang & ta prime 🏴‍☠️</div></div>
  if (loading) return <div style={cardStyle}><div style={dim}>Chargement de ton rang…</div></div>
  if (!p) return null
  const t = eloToTier(p.elo)
  return (
    <div style={{ ...cardStyle, borderColor: `${t.color}55` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={avatarStyle}>{avatarUrl ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (displayName || '?').slice(0, 2).toUpperCase()}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</div>
          <div style={{ fontSize: 13, fontWeight: 800, color: t.color }}>{t.emoji} {t.label}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: GOLD }}>{formatPrime(t.prime)}</div>
          <div style={{ fontSize: 11, color: 'rgba(243,234,216,.4)' }}>de prime · {p.elo} ELO</div>
        </div>
      </div>
      <div style={{ marginTop: 12 }}>
        <div style={{ height: 6, borderRadius: 999, background: 'rgba(255,255,255,.07)', overflow: 'hidden' }}>
          <div style={{ width: `${t.progress}%`, height: '100%', background: `linear-gradient(90deg, ${t.color}, ${GOLD})` }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: 'rgba(243,234,216,.4)', marginTop: 4 }}>
          <span>{p.wins}V · {p.losses}D · {p.draws}N{p.current_streak > 0 ? ` · 🔥 ${p.current_streak}` : ''}</span>
          <span>{t.next ? `${t.next.emoji} ${t.next.label} à ${t.next.min} ELO` : '🏴‍☠️ Sommet atteint'}</span>
        </div>
      </div>
    </div>
  )
}

export function DamesLeaderboard() {
  const [rows, setRows] = useState(null)
  useEffect(() => {
    let on = true
    getDamesLeaderboard(20).then((r) => { if (on) setRows(r) }).catch(() => { if (on) setRows([]) })
    return () => { on = false }
  }, [])
  return (
    <div style={cardStyle}>
      <div style={{ fontWeight: 800, fontSize: 14, color: '#fff', marginBottom: 10 }}>🏆 Classement — les plus grosses primes</div>
      {rows === null ? <div style={dim}>Chargement…</div>
        : rows.length === 0 ? <div style={dim}>Aucune partie classée encore. Le multijoueur en ligne arrive — sois le premier sur le tableau ! 🏴‍☠️</div>
          : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {rows.map((r, i) => {
                const t = eloToTier(r.elo)
                return (
                  <div key={r.user_id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', borderRadius: 10, background: i < 3 ? 'rgba(212,160,23,.06)' : 'transparent' }}>
                    <span style={{ width: 22, textAlign: 'center', fontWeight: 900, color: i === 0 ? GOLD : i < 3 ? '#cdb87a' : 'rgba(243,234,216,.4)' }}>{i + 1}</span>
                    <span style={{ ...avatarStyle, width: 30, height: 30, fontSize: 11 }}>{r.avatar ? <img src={r.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (r.username || '?').slice(0, 2).toUpperCase()}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.username}</div>
                      <div style={{ fontSize: 11, color: t.color, fontWeight: 700 }}>{t.emoji} {t.label}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: GOLD }}>{formatPrime(t.prime)}</div>
                      <div style={{ fontSize: 10, color: 'rgba(243,234,216,.35)' }}>{r.wins}V · {r.losses}D</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
    </div>
  )
}
