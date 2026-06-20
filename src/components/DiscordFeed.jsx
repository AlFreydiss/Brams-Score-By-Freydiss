import { useState, useEffect, useCallback } from 'react'

function timeAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'à l\'instant'
  if (m < 60) return `il y a ${m}min`
  const h = Math.floor(m / 60)
  if (h < 24) return `il y a ${h}h`
  const d = Math.floor(h / 24)
  return `il y a ${d}j`
}

function DiscordAvatar({ author }) {
  const [err, setErr] = useState(false)
  if (!err && author.avatar) {
    return (
      <img loading="lazy" decoding="async"
        src={author.avatar}
        alt={author.globalName}
        onError={() => setErr(true)}
        style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, objectFit: 'cover' }}
      />
    )
  }
  const initials = (author.globalName || author.username || '?').slice(0, 2).toUpperCase()
  return (
    <div style={{
      width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
      background: 'linear-gradient(135deg,#5865f2,#a29bfe)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 11, fontWeight: 700, color: '#fff',
    }}>{initials}</div>
  )
}

function MessageCard({ msg }) {
  const hasContent = msg.content?.trim()
  const hasEmbeds = msg.embeds?.length > 0
  const hasImages = msg.attachments?.some(a => a.content_type?.startsWith('image/'))

  if (!hasContent && !hasEmbeds && !hasImages) return null

  return (
    <div style={{
      padding: '10px 12px',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
      transition: 'background .15s',
    }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <DiscordAvatar author={msg.author} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {msg.author.globalName || msg.author.username}
            </span>
            {msg.author.bot && (
              <span style={{ fontSize: 9, fontWeight: 700, color: '#5865f2', background: 'rgba(88,101,242,0.18)', borderRadius: 3, padding: '1px 4px', flexShrink: 0 }}>BOT</span>
            )}
          </div>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{timeAgo(msg.timestamp)}</span>
        </div>
      </div>

      {hasContent && (
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 1.5, margin: 0, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
          {msg.content}
        </p>
      )}

      {hasEmbeds && msg.embeds.map((e, i) => (
        <div key={i} style={{
          marginTop: 6, borderLeft: `3px solid ${e.color ? `#${e.color.toString(16).padStart(6, '0')}` : '#5865f2'}`,
          paddingLeft: 8, borderRadius: '0 4px 4px 0', background: 'rgba(255,255,255,0.04)',
          padding: '6px 8px',
        }}>
          {e.title && <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', margin: '0 0 3px' }}>{e.title}</p>}
          {e.description && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{e.description.slice(0, 200)}{e.description.length > 200 ? '…' : ''}</p>}
          {e.image && <img loading="lazy" decoding="async" src={e.image} alt="" style={{ marginTop: 6, maxWidth: '100%', borderRadius: 6, display: 'block' }} />}
        </div>
      ))}

      {hasImages && msg.attachments.filter(a => a.content_type?.startsWith('image/')).map((a, i) => (
        <img loading="lazy" decoding="async" key={i} src={a.url} alt={a.filename} style={{ marginTop: 6, maxWidth: '100%', borderRadius: 6, display: 'block' }} />
      ))}
    </div>
  )
}

export default function DiscordFeed() {
  const [msgs, setMsgs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastRefresh, setLastRefresh] = useState(null)

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/discord-feed')
      if (!r.ok) throw new Error(`${r.status}`)
      const data = await r.json()
      setMsgs(Array.isArray(data) ? data : [])
      setLastRefresh(new Date())
      setError(null)
    } catch (e) {
      setError('Impossible de charger les annonces')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, 60000)
    return () => clearInterval(id)
  }, [load])

  return (
    <div style={{
      background: 'rgba(14,14,16,0.72)',
      backdropFilter: 'blur(18px)',
      border: '1px solid rgba(88,101,242,0.25)',
      borderRadius: 14,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      maxHeight: 520,
    }}>
      <div style={{
        padding: '12px 14px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'rgba(88,101,242,0.1)',
        flexShrink: 0,
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="#5865f2">
          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
        </svg>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Annonces Discord</span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          {lastRefresh && (
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
              {lastRefresh.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button onClick={load} title="Actualiser" style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.4)', fontSize: 14, padding: 2, lineHeight: 1,
            transition: 'color .15s',
          }}
            onMouseEnter={e => e.currentTarget.style.color = '#fff'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
          >↻</button>
        </div>
      </div>

      <div style={{ overflowY: 'auto', flex: 1 }}>
        {loading && (
          <div style={{ padding: 24, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
            Chargement…
          </div>
        )}
        {!loading && error && (
          <div style={{ padding: 16, textAlign: 'center' }}>
            <p style={{ color: 'rgba(255,100,100,0.8)', fontSize: 13, margin: '0 0 8px' }}>{error}</p>
            <button onClick={load} style={{ fontSize: 12, color: '#5865f2', background: 'none', border: '1px solid rgba(88,101,242,0.4)', borderRadius: 6, padding: '4px 12px', cursor: 'pointer' }}>Réessayer</button>
          </div>
        )}
        {!loading && !error && msgs.length === 0 && (
          <div style={{ padding: 24, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
            Aucune annonce
          </div>
        )}
        {!loading && !error && msgs.map(m => <MessageCard key={m.id} msg={m} />)}
      </div>
    </div>
  )
}
