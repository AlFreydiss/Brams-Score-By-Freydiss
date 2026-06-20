// ── Modale Abonnés / Suivis ──────────────────────────────────────────────────
// Listes réelles (list_followers / list_following), recherche locale, et bouton
// follow/unfollow inline avec optimistic update + rollback. Pour savoir qui JE
// suis déjà, on charge une seule fois ma liste de suivis (un Set d'ids) plutôt
// que N appels get_follow_state.
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { useSocial } from '../../contexts/SocialContext.jsx'
import { listFollowers, listFollowing, followUser, unfollowUser } from '../../lib/social.js'
import { avatar, btn, T } from '../social/socialStyles.js'

export default function FollowListModal({ targetId, initialTab = 'followers', onClose, onMutated }) {
  const { isAuthenticated, discordId } = useAuth()
  const { refreshCounts } = useSocial()
  const navigate = useNavigate()

  const [tab, setTab] = useState(initialTab)
  const [rows, setRows] = useState(null)        // null = loading
  const [query, setQuery] = useState('')
  const [myFollows, setMyFollows] = useState(() => new Set()) // ids que JE suis
  const [busy, setBusy] = useState(() => new Set())           // ids en cours de toggle (affichage)
  const busyRef = useRef(new Set())                            // verrou synchrone anti double-clic
  const aliveRef = useRef(true)
  useEffect(() => () => { aliveRef.current = false }, [])

  // Liste affichée selon l'onglet.
  const load = useCallback(async () => {
    setRows(null)
    const list = tab === 'followers' ? await listFollowers(targetId) : await listFollowing(targetId)
    if (aliveRef.current) setRows(Array.isArray(list) ? list : [])
  }, [tab, targetId])
  useEffect(() => { load() }, [load])

  // Mes propres suivis (pour l'état des boutons). Inutile si non connecté.
  useEffect(() => {
    if (!isAuthenticated || !discordId) { setMyFollows(new Set()); return }
    let alive = true
    listFollowing(discordId).then(l => {
      if (alive) setMyFollows(new Set((l || []).map(u => String(u.user_id))))
    })
    return () => { alive = false }
  }, [isAuthenticated, discordId])

  const filtered = useMemo(() => {
    if (!rows) return null
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(u => (u.username || '').toLowerCase().includes(q) || String(u.user_id).includes(q))
  }, [rows, query])

  async function toggle(uid) {
    const id = String(uid)
    if (busyRef.current.has(id)) return
    busyRef.current.add(id)
    const wasFollowing = myFollows.has(id)
    // Optimistic
    setMyFollows(prev => { const n = new Set(prev); wasFollowing ? n.delete(id) : n.add(id); return n })
    setBusy(prev => new Set(prev).add(id))
    const res = await (wasFollowing ? unfollowUser(id) : followUser(id))
    busyRef.current.delete(id)
    if (aliveRef.current) setBusy(prev => { const n = new Set(prev); n.delete(id); return n })
    if (res?.ok === false) {
      // Rollback
      if (aliveRef.current) setMyFollows(prev => { const n = new Set(prev); wasFollowing ? n.add(id) : n.delete(id); return n })
      return
    }
    refreshCounts()
    onMutated?.()   // resynchronise les compteurs du hero (utile sur son propre profil)
  }

  const goProfile = (uid) => { navigate(`/u/${uid}`); onClose?.() }

  const TabBtn = ({ k, label }) => (
    <button type="button" onClick={() => setTab(k)}
      style={{
        flex: 1, padding: '12px 0', border: 'none', background: 'transparent', cursor: 'pointer',
        fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit',
        color: tab === k ? T.text : T.textDim,
        borderBottom: `2px solid ${tab === k ? T.gold : 'transparent'}`,
        transition: 'color .18s, border-color .18s',
      }}>
      {label}
    </button>
  )

  return (
    <div className="pfx-modal-overlay" onClick={onClose}>
      <div className="pfx-modal pfx-follow-modal" onClick={e => e.stopPropagation()}
        style={{ padding: 0, maxWidth: 440, width: '100%' }}>
        <div style={{ display: 'flex', borderBottom: `1px solid ${T.border}` }}>
          <TabBtn k="followers" label="Abonnés" />
          <TabBtn k="following" label="Suivis" />
        </div>

        <div style={{ padding: '12px 14px 8px' }}>
          <input
            className="pfx-input" value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Rechercher…" style={{ margin: 0 }} />
        </div>

        <div className="pfx-follow-list" style={{ maxHeight: '52vh', overflowY: 'auto', padding: '4px 8px 12px' }}>
          {filtered === null && (
            <div style={{ padding: '32px 0', textAlign: 'center', color: T.textFaint, fontSize: 13 }}>Chargement…</div>
          )}
          {filtered && filtered.length === 0 && (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: T.textFaint, fontSize: 13.5 }}>
              {query ? 'Aucun résultat.' : tab === 'followers' ? 'Aucun abonné pour l\'instant.' : 'Ne suit personne pour l\'instant.'}
            </div>
          )}
          {filtered && filtered.map(u => {
            const id = String(u.user_id)
            const isMe = String(discordId) === id
            const following = myFollows.has(id)
            return (
              <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '8px 8px', borderRadius: 12 }}>
                <button onClick={() => goProfile(id)} style={{ border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', flexShrink: 0 }}>
                  <span style={avatar(42)}>
                    {u.avatar_url ? <img loading="lazy" decoding="async" src={u.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (u.username || '?').slice(0, 2).toUpperCase()}
                  </span>
                </button>
                <button onClick={() => goProfile(id)} style={{ border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <div style={{ color: T.text, fontSize: 13.5, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {u.username || `Pirate #${id.slice(-4)}`}
                  </div>
                </button>
                {isAuthenticated && !isMe && (
                  <button onClick={() => toggle(id)} disabled={busy.has(id)}
                    style={{ ...btn(following ? 'ghost' : 'gold'), padding: '7px 14px', fontSize: 12.5, opacity: busy.has(id) ? 0.6 : 1 }}>
                    {following ? 'Suivi' : 'Suivre'}
                  </button>
                )}
              </div>
            )
          })}
        </div>

        <button type="button" className="pfx-follow-close" onClick={onClose}
          style={{ width: '100%', padding: 13, border: 'none', borderTop: `1px solid ${T.border}`, background: 'transparent', color: T.textDim, cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit' }}>
          Fermer
        </button>
      </div>
    </div>
  )
}
