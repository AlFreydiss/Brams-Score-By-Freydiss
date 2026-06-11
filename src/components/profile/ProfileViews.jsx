// ── Vues du profil façon TikTok ──────────────────────────────────────────────
// Visible UNIQUEMENT par le propriétaire : chip "👁 X vues" sous le hero, clic
// → modale des visiteurs des 30 derniers jours (avatar, pseudo, dernier passage).
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { getProfileViews } from '../../lib/profile.js'

const timeAgo = (iso) => {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  if (s < 60) return 'à l\'instant'
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`
  return `il y a ${Math.floor(s / 86400)} j`
}

export default function ProfileViews() {
  const [data, setData] = useState(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let alive = true
    getProfileViews(50).then(d => { if (alive) setData(d) })
    return () => { alive = false }
  }, [])

  if (!data?.ok) return null

  return (
    <>
      <button onClick={() => setOpen(true)} style={{
        display: 'inline-flex', alignItems: 'center', gap: 8, margin: '10px 0 0',
        padding: '7px 14px', borderRadius: 999, cursor: 'pointer',
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
        color: 'rgba(255,255,255,0.75)', fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit',
      }}>
        👁 {data.total} vue{data.total > 1 ? 's' : ''} du profil
        <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.4)' }}>30 j · visible par toi seul</span>
      </button>

      {open && createPortal(
        <div onClick={() => setOpen(false)} style={{
          position: 'fixed', inset: 0, zIndex: 10060, background: 'rgba(0,0,0,0.75)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backdropFilter: 'blur(8px)',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            width: 'min(420px, 94vw)', maxHeight: '72vh', overflowY: 'auto',
            background: '#101218', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 18,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
              <span style={{ flex: 1, fontSize: 16, fontWeight: 800, color: '#fff' }}>👁 Qui a vu ton profil</span>
              <button onClick={() => setOpen(false)} aria-label="Fermer" style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 18 }}>✕</button>
            </div>
            {data.viewers.length === 0 ? (
              <div style={{ padding: '28px 0', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
                Personne pour l'instant — partage ton profil 🏴‍☠️
              </div>
            ) : data.viewers.map(v => (
              <Link key={v.user_id} to={`/u/${v.user_id}`} onClick={() => setOpen(false)} style={{
                display: 'flex', alignItems: 'center', gap: 11, padding: '8px 4px', textDecoration: 'none',
              }}>
                <span style={{ width: 38, height: 38, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'rgba(255,255,255,0.06)', display: 'grid', placeItems: 'center', color: '#BFA46A', fontWeight: 800, fontSize: 14 }}>
                  {v.avatar_url ? <img src={v.avatar_url} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (v.username || '?').slice(0, 2).toUpperCase()}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: '#f3f4f6', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.username || `Pirate #${String(v.user_id).slice(-5)}`}</span>
                  <span style={{ display: 'block', fontSize: 11.5, color: 'rgba(255,255,255,0.4)' }}>{timeAgo(v.viewed_at)}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
