import { useState, useEffect, useCallback } from 'react'
import RELEASES from '../data/releases.json'

const ANIME_COLORS = {
  onepiece: '#e0524a',
  tpn:      '#6c5ce7',
  drstone:  '#00b894',
  jjk:      '#c62828',
}

const ANIME_LABELS = {
  onepiece: 'One Piece',
  tpn:      'TPN',
  drstone:  'Dr. Stone',
  jjk:      'Jujutsu Kaisen',
}

const ANIME_EMOJIS = {
  onepiece: '🏴‍☠️',
  tpn:      '🌿',
  drstone:  '⚗️',
  jjk:      '⚡',
}

function timeAgo(dateStr) {
  const now  = Date.now()
  const date = new Date(dateStr).getTime()
  const diff = now - date
  const s = Math.floor(diff / 1000)
  if (s < 60)  return 'à l\'instant'
  const m = Math.floor(s / 60)
  if (m < 60)  return `il y a ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24)  return `il y a ${h}h`
  const d = Math.floor(h / 24)
  if (d < 7)   return `il y a ${d}j`
  const w = Math.floor(d / 7)
  if (w < 5)   return `il y a ${w} sem.`
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

function formatReleaseDate(dateStr) {
  const d = new Date(dateStr)
  const now = new Date()
  const diff = d - now
  const days = Math.ceil(diff / 86400000)

  const label = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  if (days < 0)    return { label, badge: 'Sorti', color: '#34d399' }
  if (days === 0)  return { label, badge: "Aujourd'hui !", color: '#f59e0b' }
  if (days === 1)  return { label, badge: 'Demain', color: '#f59e0b' }
  if (days <= 7)   return { label, badge: `Dans ${days}j`, color: '#e0524a' }
  return { label, badge: `Dans ${days}j`, color: 'var(--muted)' }
}

function AnnouncementCard({ ann }) {
  const color = '#a29bfe'
  const initials = (ann.author_name || 'B').slice(0, 2).toUpperCase()

  return (
    <div style={{
      display: 'flex', gap: 14, padding: '14px 0',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
    }}>
      {/* Avatar */}
      <div style={{ flexShrink: 0 }}>
        {ann.author_avatar ? (
          <img loading="lazy" decoding="async" src={ann.author_avatar} alt={ann.author_name} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', display: 'block' }} onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex' }} />
        ) : null}
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: `${color}28`, border: `1px solid ${color}44`, display: ann.author_avatar ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color }}>
          {initials}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: '#fff' }}>{ann.author_name || 'Brams'}</span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{timeAgo(ann.created_at)}</span>
          {ann.edited_at && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' }}>(modifié)</span>}
        </div>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {ann.content}
        </p>
      </div>
    </div>
  )
}

function ReleaseCard({ release }) {
  const color = ANIME_COLORS[release.anime] || '#e0524a'
  const emoji = ANIME_EMOJIS[release.anime] || '📖'
  const { label, badge, color: badgeColor } = formatReleaseDate(release.date)

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
      borderRadius: 12, background: `${color}0a`,
      border: `1px solid ${color}22`,
      marginBottom: 8,
    }}>
      <div style={{ width: 44, height: 44, borderRadius: 10, background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
        {emoji}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: '#fff', marginBottom: 2 }}>
          {ANIME_LABELS[release.anime] || release.label} — {release.title}
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', textTransform: 'capitalize' }}>{label}</div>
        {release.note && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{release.note}</div>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
        <span style={{ fontSize: 11, fontWeight: 700, background: `${badgeColor}22`, color: badgeColor, border: `1px solid ${badgeColor}44`, borderRadius: 100, padding: '2px 10px' }}>{badge}</span>
        {!release.confirmed && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>non confirmé</span>}
      </div>
    </div>
  )
}

export default function CalendarPage({ onClose }) {
  const [tab,           setTab]           = useState('annonces')
  const [announcements, setAnnouncements] = useState([])
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState(null)
  const [autoRefresh,   setAutoRefresh]   = useState(true)

  const fetchAnnouncements = useCallback(async () => {
    try {
      const r = await fetch('/api/announcements')
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const data = await r.json()
      setAnnouncements(Array.isArray(data) ? data : [])
      setError(null)
    } catch (e) {
      setError('Impossible de charger les annonces.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAnnouncements()
  }, [fetchAnnouncements])

  // Auto-refresh toutes les 30s
  useEffect(() => {
    if (!autoRefresh) return
    const id = setInterval(fetchAnnouncements, 30_000)
    return () => clearInterval(id)
  }, [autoRefresh, fetchAnnouncements])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])

  // Tri des sorties : plus proches en premier, puis futures
  const sortedReleases = [...RELEASES].sort((a, b) => new Date(a.date) - new Date(b.date))

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'var(--bg)', display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.18s ease-out' }}>

      {/* Header */}
      <div style={{ flexShrink: 0, background: 'rgba(17,18,20,0.97)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px', height: 64 }}>
          <button onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', borderRadius: 9, color: '#fff', cursor: 'pointer', padding: '7px 14px', fontSize: 13, fontWeight: 700, flexShrink: 0, transition: 'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
          >← Retour</button>

          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 16, color: '#fff' }}>📅 Calendrier Brams</div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>Annonces & sorties manga / animé</div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)', flexShrink: 0 }}>
            {[['annonces', '📢 Annonces'], ['sorties', '📅 Sorties']].map(([t, label]) => (
              <button key={t} onClick={() => setTab(t)} style={{ height: 38, padding: '0 18px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, background: tab === t ? 'rgba(162,155,254,0.2)' : 'transparent', color: tab === t ? '#a29bfe' : 'var(--muted)', borderRight: t === 'annonces' ? '1px solid var(--border)' : 'none', transition: 'all 0.15s' }}>{label}</button>
            ))}
          </div>

          {/* Refresh */}
          {tab === 'annonces' && (
            <button onClick={fetchAnnouncements} title="Rafraîchir" style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', color: 'var(--muted)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
            >↻</button>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>

          {tab === 'annonces' ? (
            <>
              {/* Live badge */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#34d399', animation: 'pulse 2s infinite' }} />
                  <span style={{ fontSize: 12, color: '#34d399', fontWeight: 700 }}>Live</span>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>— se met à jour toutes les 30s</span>
                </div>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>#{announcements.length} annonces</span>
              </div>

              {loading && (
                <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
                  <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.4 }}>📢</div>
                  <div>Chargement des annonces…</div>
                </div>
              )}

              {error && !loading && (
                <div style={{ textAlign: 'center', padding: '60px 0' }}>
                  <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.3 }}>⚠️</div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', marginBottom: 16 }}>{error}</div>
                  <button onClick={fetchAnnouncements} style={{ padding: '8px 20px', borderRadius: 9, background: 'rgba(255,255,255,0.08)', border: '1px solid var(--border)', color: '#fff', cursor: 'pointer', fontSize: 13 }}>Réessayer</button>
                </div>
              )}

              {!loading && !error && announcements.length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px 0' }}>
                  <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.2 }}>📢</div>
                  <div style={{ fontWeight: 700, fontSize: 18, color: '#fff', marginBottom: 8 }}>Aucune annonce</div>
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>Les annonces du Discord apparaîtront ici.</div>
                </div>
              )}

              {!loading && announcements.map(ann => (
                <AnnouncementCard key={ann.id} ann={ann} />
              ))}
            </>
          ) : (
            <>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
                  Sorties manga et animé à venir. Les dates non confirmées sont indicatives.
                </div>
              </div>

              {sortedReleases.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0' }}>
                  <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.2 }}>📅</div>
                  <div style={{ fontWeight: 700, fontSize: 18, color: '#fff', marginBottom: 8 }}>Aucune sortie planifiée</div>
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>Le calendrier sera mis à jour prochainement.</div>
                </div>
              ) : (
                <div>
                  {sortedReleases.map(r => <ReleaseCard key={r.id} release={r} />)}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div style={{ flexShrink: 0, borderTop: '1px solid var(--border)', padding: '8px 20px', background: 'rgba(17,18,20,0.9)', display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>
          <kbd style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 4, padding: '1px 6px', fontSize: 10, fontFamily: 'monospace', color: 'rgba(255,255,255,0.6)', marginRight: 5 }}>Échap</kbd>
          Retour
        </span>
      </div>
    </div>
  )
}
