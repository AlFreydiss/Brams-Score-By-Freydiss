import { useState, useEffect, useCallback } from 'react'

// ─── Animations ───────────────────────────────────────────────────────────────
const SIDEBAR_STYLES = `
  @keyframes dotPulse {
    0%,100% { transform:scale(1);   opacity:.7; }
    50%      { transform:scale(1.6); opacity:1;  }
  }
  @keyframes todayGlow {
    0%,100% { box-shadow:0 0 10px rgba(224,82,74,.50),0 0 22px rgba(224,82,74,.22); }
    50%      { box-shadow:0 0 18px rgba(224,82,74,.85),0 0 36px rgba(224,82,74,.40); }
  }
  @keyframes borderShift {
    0%,100% { background-position:0%   50%; }
    50%      { background-position:100% 50%; }
  }
  @keyframes sidebarIn {
    from { opacity:0; transform:translateY(14px); }
    to   { opacity:1; transform:translateY(0);    }
  }
  .evt-b {
    background:linear-gradient(135deg,rgba(224,82,74,.45),rgba(255,138,128,.25),rgba(255,179,71,.45),rgba(224,82,74,.45));
    background-size:300% 300%;
    animation:borderShift 4s ease infinite;
    padding:1px; border-radius:12px;
    transition:transform .2s ease,box-shadow .2s ease;
  }
  .evt-b:hover { transform:translateY(-2px); box-shadow:0 8px 22px rgba(224,82,74,.20); }
`

// ─── Calendar data ────────────────────────────────────────────────────────────
const EVENTS = [
  { id: 1, date: '2026-05-17', title: 'Quiz One Piece'        },
  { id: 2, date: '2026-05-20', title: 'Tournoi Vocal'         },
  { id: 3, date: '2026-05-22', title: 'Classement Mensuel'    },
  { id: 4, date: '2026-05-25', title: 'Watch Party Dr. Stone' },
  { id: 5, date: '2026-05-30', title: 'Grand Tournoi Nakamas' },
]

// ─── Schedule data ────────────────────────────────────────────────────────────
const DAYS = [
  { day: 'Lun', name: 'undercover',    rank: 'Yonkou',      people: 10, time: '22h30', tag: 'select',  tagColor: '#e0524a' },
  { day: 'Mar', name: 'quitte la voc', rank: 'Pirate',      people: 50, time: '22h30', tag: null,       tagColor: null      },
  { day: 'Mer', name: 'passe ou pas',  rank: 'Hichiboukai', people: 15, time: '22h30', tag: null,       tagColor: null      },
  { day: 'Jeu', name: 'quitte la voc', rank: 'Pirate',      people: 50, time: '22h30', tag: null,       tagColor: null      },
  { day: 'Ven', name: 'alphabets',     rank: 'Hichiboukai', people: 15, time: '22h30', tag: null,       tagColor: null      },
  { day: 'Sam', name: 'quitte la voc', rank: 'Pirate',      people: 50, time: '22h30', tag: 'stream',  tagColor: '#9147ff' },
  { day: 'Dim', name: 'quitte la voc', rank: 'Pirate',      people: 50, time: '22h30', tag: null,       tagColor: null      },
]

const RANK_COLORS = { Yonkou: '#e0524a', Hichiboukai: '#a29bfe', Pirate: '#74b9ff' }
const TODAY_IDX = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1

// ─── Utils ────────────────────────────────────────────────────────────────────
function timeAgo(iso) {
  const m = Math.floor((Date.now() - new Date(iso)) / 60000)
  if (m < 1)  return "à l'instant"
  if (m < 60) return `il y a ${m}min`
  const h = Math.floor(m / 60)
  if (h < 24) return `il y a ${h}h`
  return `il y a ${Math.floor(h / 24)}j`
}

function truncate(str, n) { return str.length > n ? str.slice(0, n) + '…' : str }

function useCountdown(dateStr) {
  const calc = () => {
    const diff = new Date(dateStr) - Date.now()
    if (diff <= 0) return 'Maintenant !'
    const d = Math.floor(diff / 86400000)
    const h = Math.floor((diff % 86400000) / 3600000)
    const m = Math.floor((diff % 3600000) / 60000)
    if (d > 0) return `dans ${d}j ${h}h`
    if (h > 0) return `dans ${h}h ${m}min`
    return `dans ${m}min`
  }
  const [text, setText] = useState(calc)
  useEffect(() => {
    setText(calc())
    const id = setInterval(() => setText(calc()), 60000)
    return () => clearInterval(id)
  }, [dateStr])
  return text
}

// ─── Shared UI ────────────────────────────────────────────────────────────────
function SectionLabel({ icon, label, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {icon && <span style={{ fontSize: 11 }}>{icon}</span>}
        <span style={{ fontSize: 8.5, fontWeight: 700, color: 'rgba(255,255,255,.30)', letterSpacing: '.12em' }}>{label}</span>
      </div>
      {right}
    </div>
  )
}

function Divider() {
  return <div style={{ height: 1, background: 'rgba(255,255,255,0.07)' }} />
}

// ─── Mini Calendar ────────────────────────────────────────────────────────────
const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

const navBtn = {
  background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.09)',
  borderRadius: 6, color: 'rgba(255,255,255,.55)', cursor: 'pointer',
  width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 15, lineHeight: 1, transition: 'background .15s, color .15s',
}

function MiniCalendar({ events }) {
  const today  = new Date()
  const [year,  setYear]  = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [tip,   setTip]   = useState(null)

  const eventMap = {}
  events.forEach(e => { eventMap[e.date] = e })

  const pad2        = n => String(n).padStart(2, '0')
  const dateKey     = d => `${year}-${pad2(month + 1)}-${pad2(d)}`
  const isToday     = d => d === today.getDate() && month === today.getMonth() && year === today.getFullYear()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDow    = (new Date(year, month, 1).getDay() + 6) % 7
  const monthLabel  = new Date(year, month).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

  const prevM = () => { if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1) }
  const nextM = () => { if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1) }

  const cells = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <button style={navBtn} onClick={prevM}
          onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,.13)'; e.currentTarget.style.color='#fff' }}
          onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,.06)'; e.currentTarget.style.color='rgba(255,255,255,.55)' }}
        >‹</button>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: '#fff', textTransform: 'capitalize', letterSpacing: '.02em' }}>{monthLabel}</span>
        <button style={navBtn} onClick={nextM}
          onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,.13)'; e.currentTarget.style.color='#fff' }}
          onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,.06)'; e.currentTarget.style.color='rgba(255,255,255,.55)' }}
        >›</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 1, marginBottom: 3 }}>
        {WEEKDAYS.map((w, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: 7.5, fontWeight: 700, color: 'rgba(255,255,255,.28)' }}>{w}</div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 1 }}>
        {cells.map((d, i) => {
          if (!d) return <div key={`e${i}`} />
          const key = dateKey(d)
          const ev  = eventMap[key]
          const tod = isToday(d)
          return (
            <div key={d} style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2px 0' }}
              onMouseEnter={ev ? () => setTip(d) : undefined}
              onMouseLeave={ev ? () => setTip(null) : undefined}
            >
              <div style={{
                width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '50%', fontSize: 10.5, fontWeight: tod ? 800 : ev ? 600 : 400,
                color: tod ? '#fff' : ev ? 'var(--accent)' : 'rgba(255,255,255,.38)',
                background: tod ? 'var(--accent)' : 'transparent',
                animation: tod ? 'todayGlow 2.2s ease-in-out infinite' : 'none',
              }}>{d}</div>
              {ev && <div style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--accent)', marginTop: 1, animation: 'dotPulse 2.5s ease-in-out infinite' }} />}
              {tip === d && ev && (
                <div style={{
                  position: 'absolute', bottom: 'calc(100% + 5px)', left: '50%', transform: 'translateX(-50%)',
                  background: 'rgba(12,13,15,.98)', border: '1px solid rgba(224,82,74,.35)',
                  borderRadius: 7, padding: '4px 8px', zIndex: 30,
                  whiteSpace: 'nowrap', fontSize: 10.5, fontWeight: 600, color: '#fff',
                  boxShadow: '0 6px 18px rgba(0,0,0,.6)', pointerEvents: 'none',
                }}>{ev.title}</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Event Card ───────────────────────────────────────────────────────────────
function EventCard({ event }) {
  const countdown = useCountdown(event.date)
  const dt  = new Date(event.date)
  const day = dt.getDate()
  const mon = dt.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')
  return (
    <div className="evt-b">
      <div style={{ background: 'rgba(13,14,16,.96)', borderRadius: 11, padding: '9px 11px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flexShrink: 0, width: 38, height: 38, borderRadius: 9, background: 'rgba(224,82,74,.12)', border: '1px solid rgba(224,82,74,.28)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--accent)', lineHeight: 1 }}>{day}</span>
          <span style={{ fontSize: 7.5, fontWeight: 700, color: 'rgba(224,82,74,.65)', letterSpacing: '.06em', marginTop: 1 }}>{mon}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: '#fff', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.title}</div>
          <div style={{ fontSize: 9.5, color: 'var(--accent)', fontWeight: 600 }}>{countdown}</div>
        </div>
      </div>
    </div>
  )
}

// ─── Discord sub-components ───────────────────────────────────────────────────
function DiscordAvatar({ author }) {
  const [err, setErr] = useState(false)
  if (!err && author.avatar) {
    return <img src={author.avatar} alt={author.globalName} onError={() => setErr(true)}
      style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, objectFit: 'cover' }} />
  }
  const initials = (author.globalName || author.username || '?').slice(0, 2).toUpperCase()
  return (
    <div style={{
      width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
      background: 'linear-gradient(135deg,#5865f2,#a29bfe)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 10, fontWeight: 700, color: '#fff',
    }}>{initials}</div>
  )
}

function DiscordMessage({ msg }) {
  const hasContent = msg.content?.trim()
  const hasEmbeds  = msg.embeds?.length > 0
  const hasImages  = msg.attachments?.some(a => a.content_type?.startsWith('image/'))
  if (!hasContent && !hasEmbeds && !hasImages) return null
  return (
    <div style={{ padding: '9px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background .15s' }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
        <DiscordAvatar author={msg.author} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {msg.author.globalName || msg.author.username}
            </span>
            {msg.author.bot && (
              <span style={{ fontSize: 8, fontWeight: 700, color: '#5865f2', background: 'rgba(88,101,242,0.18)', borderRadius: 3, padding: '1px 4px', flexShrink: 0 }}>BOT</span>
            )}
          </div>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)' }}>{timeAgo(msg.timestamp)}</span>
        </div>
      </div>
      {hasContent && (
        <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.72)', lineHeight: 1.55, margin: 0, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
          {truncate(msg.content, 160)}
        </p>
      )}
      {hasEmbeds && msg.embeds.map((e, i) => (
        <div key={i} style={{
          marginTop: 5, borderLeft: `3px solid ${e.color ? `#${e.color.toString(16).padStart(6,'0')}` : '#5865f2'}`,
          background: 'rgba(255,255,255,0.04)', padding: '5px 8px', borderRadius: '0 4px 4px 0',
        }}>
          {e.title && <p style={{ fontSize: 12, fontWeight: 700, color: '#fff', margin: '0 0 2px' }}>{e.title}</p>}
          {e.description && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{e.description.slice(0, 160)}{e.description.length > 160 ? '…' : ''}</p>}
        </div>
      ))}
      {hasImages && msg.attachments.filter(a => a.content_type?.startsWith('image/')).map((a, i) => (
        <img key={i} src={a.url} alt={a.filename} style={{ marginTop: 5, maxWidth: '100%', borderRadius: 5, display: 'block' }} />
      ))}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function UnifiedSidebar() {
  const [msgs,           setMsgs]           = useState([])
  const [discordLoading, setDiscordLoading] = useState(true)
  const [discordError,   setDiscordError]   = useState(null)
  const [lastRefresh,    setLastRefresh]    = useState(null)

  // Inject CSS
  useEffect(() => {
    const id = 'unified-sidebar-styles'
    if (document.getElementById(id)) return
    const el = document.createElement('style')
    el.id = id; el.textContent = SIDEBAR_STYLES
    document.head.appendChild(el)
    return () => { document.getElementById(id)?.remove() }
  }, [])

  // Discord feed
  const loadDiscord = useCallback(async () => {
    try {
      const r = await fetch('/api/discord-feed')
      if (!r.ok) throw new Error(`${r.status}`)
      const data = await r.json()
      setMsgs(Array.isArray(data) ? data : [])
      setLastRefresh(new Date())
      setDiscordError(null)
    } catch {
      setDiscordError('Impossible de charger')
    } finally {
      setDiscordLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDiscord()
    const id = setInterval(loadDiscord, 60000)
    return () => clearInterval(id)
  }, [loadDiscord])

  const today = new Date()
  const upcomingEvents = EVENTS
    .filter(e => new Date(e.date) >= today)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 3)

  return (
    <div style={{
      width: 320,
      background: 'rgba(14,15,17,.68)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255,255,255,.09)',
      borderRadius: 16,
      overflow: 'hidden',
      animation: 'sidebarIn .5s .2s ease-out both',
    }}>

      {/* ── 1. Calendrier ─────────────────────────────────────────────────── */}
      <div style={{ padding: '14px 14px 10px' }}>
        <SectionLabel icon="📅" label="CALENDRIER" />
        <MiniCalendar events={EVENTS} />
      </div>

      {upcomingEvents.length > 0 && (
        <div style={{ padding: '0 14px 14px' }}>
          <SectionLabel label="PROCHAINS EVENTS" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {upcomingEvents.map(ev => <EventCard key={ev.id} event={ev} />)}
          </div>
        </div>
      )}

      <Divider />

      {/* ── 2. Programme de la semaine ────────────────────────────────────── */}
      <div style={{ padding: '12px 14px 4px' }}>
        <SectionLabel
          icon="🗓"
          label="PROGRAMME DE LA SEMAINE"
          right={<span style={{ fontSize: 8.5, color: 'rgba(255,255,255,.22)', fontWeight: 600 }}>22h30 / soir</span>}
        />
      </div>
      <div style={{ paddingBottom: 6 }}>
        {DAYS.map((d, i) => {
          const isToday   = i === TODAY_IDX
          const rankColor = RANK_COLORS[d.rank] || '#aaa'
          return (
            <div key={d.day} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '5px 14px',
              background: isToday ? 'rgba(224,82,74,0.08)' : 'transparent',
              borderLeft: isToday ? '3px solid var(--accent)' : '3px solid transparent',
            }}>
              <div style={{ width: 28, fontSize: 10, fontWeight: isToday ? 800 : 500, color: isToday ? 'var(--accent)' : 'rgba(255,255,255,0.38)', flexShrink: 0 }}>{d.day}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: isToday ? '#fff' : 'rgba(255,255,255,0.82)', whiteSpace: 'nowrap' }}>
                    {d.name}
                  </span>
                  {d.tag && (
                    <span style={{ fontSize: 7.5, fontWeight: 800, letterSpacing: '.05em', color: d.tagColor, background: `${d.tagColor}22`, borderRadius: 4, padding: '1px 5px', border: `1px solid ${d.tagColor}44`, whiteSpace: 'nowrap' }}>
                      {d.tag}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 9.5, color: rankColor, fontWeight: 600, marginTop: 1 }}>{d.rank}</div>
              </div>
              <div style={{ fontSize: 9.5, fontWeight: 600, color: 'rgba(255,255,255,0.28)', flexShrink: 0 }}>{d.time}</div>
            </div>
          )
        })}
      </div>

      <Divider />

      {/* ── 3. Annonces Discord ───────────────────────────────────────────── */}
      <div style={{ padding: '12px 14px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="#5865f2">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
          </svg>
          <span style={{ fontSize: 8.5, fontWeight: 700, color: 'rgba(255,255,255,.30)', letterSpacing: '.12em' }}>ANNONCES DISCORD</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {lastRefresh && (
            <span style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.22)' }}>
              {lastRefresh.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button onClick={loadDiscord} title="Actualiser" style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.32)', fontSize: 13, padding: '1px 3px', lineHeight: 1,
            transition: 'color .15s',
          }}
            onMouseEnter={e => e.currentTarget.style.color = '#fff'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.32)'}
          >↻</button>
        </div>
      </div>

      <div style={{ maxHeight: 250, overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
        {discordLoading && (
          <div style={{ padding: '14px 12px', textAlign: 'center', color: 'rgba(255,255,255,0.28)', fontSize: 11.5 }}>
            Chargement…
          </div>
        )}
        {!discordLoading && discordError && (
          <div style={{ padding: '10px 12px', textAlign: 'center' }}>
            <p style={{ color: 'rgba(255,100,100,0.75)', fontSize: 11.5, margin: '0 0 6px' }}>{discordError}</p>
            <button onClick={loadDiscord} style={{ fontSize: 10.5, color: '#5865f2', background: 'none', border: '1px solid rgba(88,101,242,0.4)', borderRadius: 5, padding: '3px 10px', cursor: 'pointer' }}>Réessayer</button>
          </div>
        )}
        {!discordLoading && !discordError && msgs.length === 0 && (
          <div style={{ padding: '14px 12px', textAlign: 'center', color: 'rgba(255,255,255,0.28)', fontSize: 11.5 }}>
            Aucune annonce
          </div>
        )}
        {!discordLoading && !discordError && msgs.map(m => <DiscordMessage key={m.id} msg={m} />)}
      </div>

      <div style={{ height: 10 }} />
    </div>
  )
}
