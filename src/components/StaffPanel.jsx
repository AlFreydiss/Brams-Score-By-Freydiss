import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchPending } from '../lib/wiki.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { isStaff, isCreator, CREATOR_DISCORD_ID } from '../lib/roles.js'
import { supabase } from '../lib/supabase.js'
import Navbar from './Navbar.jsx'
import StaffChat from './social/StaffChat.jsx'

function timeAgo(iso) {
  const m = Math.floor((Date.now() - new Date(iso)) / 60000)
  if (m < 1) return "à l'instant"
  if (m < 60) return `il y a ${m}min`
  const h = Math.floor(m / 60)
  if (h < 24) return `il y a ${h}h`
  return `il y a ${Math.floor(h / 24)}j`
}

function PendingCard({ item, table, onAction, actioning }) {
  const key  = `${table}-${item.id}`
  const busy = actioning === key
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12, padding: '16px 18px',
        display: 'flex', alignItems: 'center', gap: 14,
        transition: 'border-color .15s',
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(212,160,23,0.25)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.title}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)' }}>
          ✍️ {item.author_name} · {timeAgo(item.created_at)}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <button
          disabled={busy}
          onClick={() => onAction(table, item.id, 'published')}
          style={{
            padding: '6px 14px', borderRadius: 8,
            border: '1px solid rgba(52,211,153,0.35)',
            background: 'rgba(52,211,153,0.10)', color: '#34d399',
            fontSize: 11, fontWeight: 700,
            cursor: busy ? 'not-allowed' : 'pointer',
            opacity: busy ? 0.5 : 1, transition: 'all .15s',
          }}
          onMouseEnter={e => !busy && (e.currentTarget.style.background = 'rgba(52,211,153,0.20)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(52,211,153,0.10)')}
        >
          ✓ Publier
        </button>
        <button
          disabled={busy}
          onClick={() => onAction(table, item.id, 'rejected')}
          style={{
            padding: '6px 14px', borderRadius: 8,
            border: '1px solid rgba(224,82,74,0.35)',
            background: 'rgba(224,82,74,0.08)', color: '#e0524a',
            fontSize: 11, fontWeight: 700,
            cursor: busy ? 'not-allowed' : 'pointer',
            opacity: busy ? 0.5 : 1, transition: 'all .15s',
          }}
          onMouseEnter={e => !busy && (e.currentTarget.style.background = 'rgba(224,82,74,0.18)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(224,82,74,0.08)')}
        >
          ✕ Rejeter
        </button>
      </div>
    </div>
  )
}

export default function StaffPanel() {
  const navigate   = useNavigate()
  const { isAuthenticated, discordId, displayName, userId } = useAuth()
  const [pending,   setPending]   = useState({ pages: [], theories: [] })
  const [loading,   setLoading]   = useState(true)
  const [actioning, setActioning] = useState(null)
  const [tab,       setTab]       = useState('theories')
  const [notice,    setNotice]    = useState(null)

  // Vérification du rôle depuis roles.js — source unique
  const userIsStaff   = isAuthenticated && isStaff(discordId, userId)
  const userIsCreator = isAuthenticated && isCreator(discordId)

  useEffect(() => {
    document.title = 'Staff Panel — Brams Community'
    return () => { document.title = 'Brams Community' }
  }, [])

  useEffect(() => {
    if (!isAuthenticated || !userIsStaff) return
    fetchPending().then(data => { setPending(data); setLoading(false) })
  }, [isAuthenticated, userIsStaff])

  async function handleAction(table, id, status) {
    const key = `${table}-${id}`
    setActioning(key)
    setNotice(null)

    // Récupérer le token JWT de la session Supabase
    let token
    try {
      const { data: { session } } = await supabase.auth.getSession()
      token = session?.access_token
    } catch {
      token = null
    }

    if (!token) {
      setNotice({ ok: false, text: '✕ Session expirée — reconnecte-toi' })
      setActioning(null)
      setTimeout(() => setNotice(null), 5000)
      return
    }

    try {
      const resp = await fetch('/api/moderate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ table, id, status }),
      })

      const result = await resp.json()

      if (!resp.ok || !result.success) {
        // Modération échouée — NE PAS retirer l'item de la liste
        setNotice({ ok: false, text: `✕ Erreur : ${result.error || 'Modération échouée'}` })
        setActioning(null)
        setTimeout(() => setNotice(null), 6000)
        return
      }

      // Succès confirmé côté serveur → retirer de la liste locale
      setPending(prev => ({
        pages:    table === 'wiki_pages' ? prev.pages.filter(p => p.id !== id)    : prev.pages,
        theories: table === 'theories'   ? prev.theories.filter(t => t.id !== id) : prev.theories,
      }))
      setNotice({ ok: true, text: status === 'published' ? '✓ Publié avec succès' : '✕ Rejeté et archivé' })
      setTimeout(() => setNotice(null), 2500)

    } catch (err) {
      setNotice({ ok: false, text: `✕ Erreur réseau : ${err.message}` })
      setTimeout(() => setNotice(null), 6000)
    }

    setActioning(null)
  }

  const total = pending.pages.length + pending.theories.length

  return (
    <div style={{ minHeight: '100vh', background: '#0b0c0e' }}>
      <Navbar />

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '100px 24px 60px' }}>

        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.15em', color: '#d4a017', textTransform: 'uppercase', marginBottom: 12 }}>
            Modération
          </div>
          <h1 style={{ fontFamily: "'Pirata One', cursive", fontSize: 'clamp(32px,5vw,52px)', color: '#fff', marginBottom: 10, lineHeight: 1.1 }}>
            Staff Panel
          </h1>
          {isAuthenticated && (
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
              Connecté en tant que{' '}
              <strong style={{ color: '#d4a017' }}>{displayName}</strong>
              {userIsCreator && (
                <span style={{ marginLeft: 8, background: 'rgba(255,215,0,0.15)', color: '#FFD700', border: '1px solid rgba(255,215,0,0.35)', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
                  CRÉATEUR
                </span>
              )}
              {userIsStaff && !userIsCreator && (
                <span style={{ marginLeft: 8, background: 'rgba(212,160,23,0.15)', color: '#d4a017', border: '1px solid rgba(212,160,23,0.3)', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
                  STAFF
                </span>
              )}
              {!userIsStaff && (
                <span style={{ marginLeft: 8, background: 'rgba(224,82,74,0.12)', color: '#e0524a', border: '1px solid rgba(224,82,74,0.25)', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
                  VISITEUR
                </span>
              )}
            </p>
          )}
        </div>

        {/* Non connecté */}
        {!isAuthenticated && (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15, marginBottom: 24 }}>
              Connecte-toi pour accéder au panel staff.
            </p>
            <button
              onClick={() => document.dispatchEvent(new CustomEvent('open-auth-modal'))}
              style={{ padding: '10px 24px', borderRadius: 10, background: 'linear-gradient(135deg,#d4a017,#e8b84a)', color: '#1a1a1a', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer' }}
            >
              Se connecter
            </button>
          </div>
        )}

        {/* Connecté mais pas staff */}
        {isAuthenticated && !userIsStaff && (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(224,82,74,0.2)', borderRadius: 16 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⛔</div>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15, marginBottom: 8 }}>
              Accès réservé au staff Brams Community.
            </p>
            <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>
              ID Discord : {discordId || userId || '—'}
            </p>
          </div>
        )}

        {/* Contenu staff */}
        {isAuthenticated && userIsStaff && (
          <>
            {/* Notice */}
            {notice && (
              <div style={{
                marginBottom: 16, padding: '10px 16px', borderRadius: 10,
                background: notice.ok ? 'rgba(52,211,153,0.15)' : 'rgba(224,82,74,0.15)',
                border: `1px solid ${notice.ok ? 'rgba(52,211,153,0.3)' : 'rgba(224,82,74,0.3)'}`,
                color: notice.ok ? '#34d399' : '#e0524a',
                fontWeight: 700, fontSize: 13,
              }}>
                {notice.text}
              </div>
            )}

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 32 }}>
              {[
                { label: 'En attente', value: total,                    color: '#d4a017' },
                { label: 'Théories',   value: pending.theories.length,  color: '#a29bfe' },
                { label: 'Wiki',       value: pending.pages.length,     color: '#74b9ff' },
              ].map(s => (
                <div key={s.label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '16px 20px' }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', marginTop: 4, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 4 }}>
              {[
                { id: 'chat',     label: 'QG Staff',                              icon: '🛡️' },
                { id: 'theories', label: `Théories (${pending.theories.length})`, icon: '📜' },
                { id: 'wiki',     label: `Wiki (${pending.pages.length})`,         icon: '📖' },
              ].map(t => (
                <button key={t.id} onClick={() => setTab(t.id)} style={{
                  flex: 1, padding: '9px 16px', borderRadius: 9, border: 'none', cursor: 'pointer',
                  background: tab === t.id ? 'rgba(212,160,23,0.18)' : 'transparent',
                  color: tab === t.id ? '#d4a017' : 'rgba(255,255,255,0.4)',
                  fontWeight: 700, fontSize: 12, transition: 'all .15s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                  <span>{t.icon}</span><span>{t.label}</span>
                </button>
              ))}
            </div>

            {loading && tab !== 'chat' && (
              <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.35)', fontSize: 14 }}>
                Chargement…
              </div>
            )}

            {tab === 'chat' && <StaffChat />}

            {!loading && tab === 'theories' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {pending.theories.length === 0
                  ? <div style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(255,255,255,0.25)', fontSize: 14 }}>✓ Aucune théorie en attente</div>
                  : pending.theories.map(t => (
                      <PendingCard key={t.id} item={t} table="theories" onAction={handleAction} actioning={actioning} />
                    ))
                }
              </div>
            )}

            {!loading && tab === 'wiki' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {pending.pages.length === 0
                  ? <div style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(255,255,255,0.25)', fontSize: 14 }}>✓ Aucune page wiki en attente</div>
                  : pending.pages.map(p => (
                      <PendingCard key={p.id} item={p} table="wiki_pages" onAction={handleAction} actioning={actioning} />
                    ))
                }
              </div>
            )}

            {/* Info service role key */}
            {!notice && (
              <div style={{ marginTop: 40, padding: '12px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', fontSize: 11, color: 'rgba(255,255,255,0.22)', lineHeight: 1.6 }}>
                Les modérations passent par l'API serveur <code style={{ color: 'rgba(255,255,255,0.4)' }}>/api/moderate</code>.
                Pour un bypass RLS garanti, configure <code style={{ color: 'rgba(255,255,255,0.4)' }}>SUPABASE_SERVICE_ROLE_KEY</code> dans les variables Vercel.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
