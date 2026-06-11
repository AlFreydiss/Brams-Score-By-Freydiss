// ── Suggestions de membres (RPC recommend_members) ──────────────────────────
// Reco basée amis en commun > activité vocale 7j > activité messages.
// Deux layouts : 'strip' (profil, cartes horizontales façon IG) et 'list'
// (rail du Fil, lignes compactes). Styles inline (convention projet).
// Invisible si non connecté, en erreur ou sans résultat.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { recommendMembers, followUser } from '../../lib/social.js'
import { T, avatar } from './socialStyles.js'

function Avatar({ url, name, size }) {
  const initials = (name || '?').slice(0, 2).toUpperCase()
  return (
    <span style={avatar(size)}>
      {url ? <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
    </span>
  )
}

function FollowBtn({ userId, small }) {
  const [state, setState] = useState('idle') // idle | busy | done
  return (
    <button
      type="button"
      disabled={state !== 'idle'}
      onClick={async () => {
        setState('busy')
        const r = await followUser(userId)
        setState(r?.ok === false ? 'idle' : 'done')
      }}
      style={{
        padding: small ? '5px 10px' : '7px 14px', borderRadius: 9,
        fontSize: small ? 11 : 12, fontWeight: 800, fontFamily: 'inherit',
        cursor: state === 'idle' ? 'pointer' : 'default', whiteSpace: 'nowrap',
        transition: 'all .15s',
        background: state === 'done' ? 'rgba(52,211,153,0.10)' : 'rgba(212,160,23,0.14)',
        border: `1px solid ${state === 'done' ? 'rgba(52,211,153,0.35)' : T.borderHi}`,
        color: state === 'done' ? T.green : T.gold,
        opacity: state === 'busy' ? 0.6 : 1,
      }}
    >
      {state === 'done' ? '✓ Suivi' : '+ Suivre'}
    </button>
  )
}

export default function MemberSuggestions({ layout = 'list', limit = 5, excludeId = null, title = 'Suggestions pour toi' }) {
  const { isAuthenticated } = useAuth()
  const [members, setMembers] = useState(null) // null = loading

  useEffect(() => {
    if (!isAuthenticated) return
    let active = true
    recommendMembers(layout === 'strip' ? Math.max(limit, 6) : limit)
      .then(r => { if (active) setMembers(r.filter(m => String(m.user_id) !== String(excludeId))) })
      .catch(() => { if (active) setMembers([]) })
    return () => { active = false }
  }, [isAuthenticated, layout, limit, excludeId])

  if (!isAuthenticated || !members || members.length === 0) return null

  if (layout === 'strip') {
    return (
      <section aria-label={title} style={{ margin: '18px 0 4px' }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: T.textFaint, marginBottom: 10 }}>
          {title}
        </div>
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 6, scrollbarWidth: 'thin' }}>
          {members.map(m => (
            <div key={m.user_id} style={{
              flex: '0 0 auto', width: 138, padding: '14px 12px 12px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
              background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14,
            }}>
              <Link to={`/u/${m.user_id}`} style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, minWidth: 0, width: '100%' }}>
                <Avatar url={m.avatar_url} name={m.username} size={52} />
                <span style={{ fontSize: 12.5, fontWeight: 700, color: T.text, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {m.username}
                </span>
                <span style={{ fontSize: 10.5, color: T.textFaint, textAlign: 'center', lineHeight: 1.3, minHeight: 26 }}>
                  {m.reason}
                </span>
              </Link>
              <FollowBtn userId={m.user_id} small />
            </div>
          ))}
        </div>
      </section>
    )
  }

  // layout 'list' (rail du Fil)
  return (
    <div aria-label={title}>
      {members.map(m => (
        <div key={m.user_id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', minWidth: 0 }}>
          <Link to={`/u/${m.user_id}`} style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, textDecoration: 'none' }}>
            <Avatar url={m.avatar_url} name={m.username} size={36} />
            <span style={{ minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {m.username}
              </span>
              <span style={{ display: 'block', fontSize: 11, color: T.textFaint, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {m.reason}
              </span>
            </span>
          </Link>
          <FollowBtn userId={m.user_id} small />
        </div>
      ))}
    </div>
  )
}
