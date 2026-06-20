import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Navbar from './Navbar.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useSocial } from '../contexts/SocialContext.jsx'
import {
  listFriends, listFriendRequests, respondFriendRequest,
  cancelFriendRequest, removeFriend, getOrCreateDm,
} from '../lib/social.js'
import { btn, avatar, T } from './social/socialStyles.js'

function Avatar({ url, name, size = 44 }) {
  const initials = (name || '?').slice(0, 2).toUpperCase()
  return (
    <span style={avatar(size)}>
      {url ? <img loading="lazy" decoding="async" src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
    </span>
  )
}

function PersonRow({ person, children }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px',
      background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius,
    }}>
      <Link to={`/u/${person.user_id}`} style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0, textDecoration: 'none' }}>
        <Avatar url={person.avatar_url} name={person.username} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {person.username || `Pirate #${String(person.user_id).slice(-5)}`}
          </div>
        </div>
      </Link>
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>{children}</div>
    </div>
  )
}

function Empty({ children }) {
  return <div style={{ padding: '48px 20px', textAlign: 'center', color: T.textFaint, fontSize: 14 }}>{children}</div>
}

export default function FriendsPage() {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const { refreshCounts } = useSocial()
  const navigate = useNavigate()
  const [tab, setTab]         = useState('friends')
  const [friends, setFriends] = useState([])
  const [reqs, setReqs]       = useState({ incoming: [], outgoing: [] })
  const [loading, setLoading] = useState(true)
  const [busy, setBusy]       = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [f, r] = await Promise.all([listFriends(), listFriendRequests()])
    setFriends(f); setReqs(r); setLoading(false)
    refreshCounts()
  }, [refreshCounts])

  useEffect(() => { if (isAuthenticated) load() }, [isAuthenticated, load])

  async function act(key, fn) {
    setBusy(key); await fn(); setBusy(null); await load()
  }

  async function openDm(userId) {
    const res = await getOrCreateDm(userId)
    if (res?.ok) navigate(`/messages/${res.conversation_id}`)
  }

  // Pendant que l'auth se charge, on n'affiche pas l'écran "connecte-toi" (sinon page = fond seul au 1er rendu)
  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', background: T.bg, position: 'relative', isolation: 'isolate', overflowX: 'hidden' }}>
        <Navbar />
        <Empty>Chargement…</Empty>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: '100vh', background: T.bg, position: 'relative', isolation: 'isolate', overflowX: 'hidden' }}>
        <Navbar />
        <Empty>Connecte-toi pour voir tes amis.</Empty>
      </div>
    )
  }

  const TABS = [
    { id: 'friends',  label: `Amis${friends.length ? ` · ${friends.length}` : ''}` },
    { id: 'incoming', label: `Reçues${reqs.incoming.length ? ` · ${reqs.incoming.length}` : ''}` },
    { id: 'outgoing', label: `Envoyées${reqs.outgoing.length ? ` · ${reqs.outgoing.length}` : ''}` },
  ]

  return (
    <div style={{ minHeight: '100vh', background: T.bg, position: 'relative', isolation: 'isolate', overflowX: 'hidden' }}>
      <Navbar />
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '90px 16px 60px' }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: T.text, marginBottom: 20 }}>Mes amis</h1>

        <div style={{ display: 'flex', gap: 6, marginBottom: 22, borderBottom: `1px solid ${T.border}`, paddingBottom: 0 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: '10px 16px', border: 'none', borderBottom: `2px solid ${tab === t.id ? T.gold : 'transparent'}`,
              background: 'transparent', color: tab === t.id ? T.gold : T.textDim,
              fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginBottom: -1,
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <Empty>Chargement…</Empty>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {tab === 'friends' && (
              friends.length === 0
                ? <Empty>Ajoute des membres de la communauté pour commencer à discuter.</Empty>
                : friends.map(f => (
                    <PersonRow key={f.user_id} person={f}>
                      <button style={btn('gold')} onClick={() => openDm(f.user_id)}>💬 Message</button>
                      <button style={btn('ghost')} disabled={busy === f.user_id}
                        onClick={() => act(f.user_id, () => removeFriend(f.user_id))}>Retirer</button>
                    </PersonRow>
                  ))
            )}

            {tab === 'incoming' && (
              reqs.incoming.length === 0
                ? <Empty>Aucune demande reçue.</Empty>
                : reqs.incoming.map(r => (
                    <PersonRow key={r.request_id} person={r}>
                      <button style={btn('green')} disabled={busy === r.request_id}
                        onClick={() => act(r.request_id, () => respondFriendRequest(r.request_id, true))}>✓ Accepter</button>
                      <button style={btn('red')} disabled={busy === r.request_id}
                        onClick={() => act(r.request_id, () => respondFriendRequest(r.request_id, false))}>✕ Refuser</button>
                    </PersonRow>
                  ))
            )}

            {tab === 'outgoing' && (
              reqs.outgoing.length === 0
                ? <Empty>Aucune demande envoyée.</Empty>
                : reqs.outgoing.map(r => (
                    <PersonRow key={r.request_id} person={r}>
                      <button style={btn('ghost')} disabled>⏳ En attente</button>
                      <button style={btn('red')} disabled={busy === r.user_id}
                        onClick={() => act(r.user_id, () => cancelFriendRequest(r.user_id))}>Annuler</button>
                    </PersonRow>
                  ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
