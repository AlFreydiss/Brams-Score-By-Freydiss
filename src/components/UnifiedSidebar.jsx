import { useState, useEffect, useCallback } from 'react'

const SIDEBAR_CSS = `
  @keyframes sbIn    { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:none } }
  @keyframes dotBeat { 0%,100% { transform:scale(1); opacity:.6 } 50% { transform:scale(1.7); opacity:1 } }
  @keyframes todayRing {
    0%,100% { box-shadow:0 0 0 2px rgba(212,160,23,.55),0 0 14px rgba(212,160,23,.30) }
    50%      { box-shadow:0 0 0 3px rgba(212,160,23,.80),0 0 22px rgba(212,160,23,.55) }
  }
  .sb-card {
    background:rgba(255,255,255,.035);
    border:1px solid rgba(255,255,255,.07);
    border-radius:11px;
    padding:10px 12px;
    transition:background .18s,border-color .18s,transform .18s;
    cursor:default;
  }
  .sb-card:hover { background:rgba(212,160,23,.06); border-color:rgba(212,160,23,.22); transform:translateY(-2px); }
`

const EVENTS = [
  { id:1, date:'2026-05-20', title:'Tournoi Vocal',            color:'#5865f2', icon:'🎙️' },
  { id:2, date:'2026-05-22', title:'Classement Mensuel',       color:'#d4a017', icon:'📊' },
  { id:3, date:'2026-05-25', title:'Watch Party Dr. Stone',    color:'#34d399', icon:'🎬' },
  { id:4, date:'2026-05-30', title:'Grand Tournoi Nakamas',    color:'#e0524a', icon:'⚔️' },
  { id:5, date:'2026-06-05', title:'Nuit des Encyclopédistes', color:'#a29bfe', icon:'📚' },
]

const DAYS = [
  { day:'Lun', name:'Undercover',    rank:'Yonkou',      time:'22h30', tag:'select', tagColor:'#e0524a' },
  { day:'Mar', name:'Quitte la Voc', rank:'Pirate',      time:'22h30', tag:null,     tagColor:null      },
  { day:'Mer', name:'Passe ou Pas',  rank:'Shichibukai', time:'22h30', tag:null,     tagColor:null      },
  { day:'Jeu', name:'Quitte la Voc', rank:'Pirate',      time:'22h30', tag:null,     tagColor:null      },
  { day:'Ven', name:'Alphabets',     rank:'Shichibukai', time:'22h30', tag:null,     tagColor:null      },
  { day:'Sam', name:'Quitte la Voc', rank:'Pirate',      time:'22h30', tag:'stream', tagColor:'#9147ff' },
  { day:'Dim', name:'Quitte la Voc', rank:'Pirate',      time:'22h30', tag:null,     tagColor:null      },
]

const RANK_COLORS = { Yonkou:'#e0524a', Shichibukai:'#a29bfe', Pirate:'#74b9ff' }
const TODAY_IDX = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1
const WEEKDAYS = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim']

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
    if (diff <= 0) return 'En cours !'
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

// ─── Mini Calendar ────────────────────────────────────────────────────────────
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

  const navBtn = {
    background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.09)',
    borderRadius:6, color:'rgba(255,255,255,.50)', cursor:'pointer',
    width:22, height:22, display:'flex', alignItems:'center', justifyContent:'center',
    fontSize:14, lineHeight:1, transition:'background .15s, color .15s', flexShrink:0,
  }

  const cells = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
        <button style={navBtn} onClick={prevM}
          onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,.14)'; e.currentTarget.style.color='#fff' }}
          onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,.06)'; e.currentTarget.style.color='rgba(255,255,255,.50)' }}
        >‹</button>
        <span style={{ fontSize:11, fontWeight:700, color:'#fff', textTransform:'capitalize', letterSpacing:'.02em' }}>{monthLabel}</span>
        <button style={navBtn} onClick={nextM}
          onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,.14)'; e.currentTarget.style.color='#fff' }}
          onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,.06)'; e.currentTarget.style.color='rgba(255,255,255,.50)' }}
        >›</button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:1, marginBottom:4 }}>
        {WEEKDAYS.map((w, i) => (
          <div key={i} style={{ textAlign:'center', fontSize:7.5, fontWeight:700, color:'rgba(255,255,255,.25)' }}>{w}</div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:1 }}>
        {cells.map((d, i) => {
          if (!d) return <div key={`e${i}`} />
          const key = dateKey(d)
          const ev  = eventMap[key]
          const tod = isToday(d)
          return (
            <div key={d} style={{ position:'relative', display:'flex', flexDirection:'column', alignItems:'center', padding:'2px 0' }}
              onMouseEnter={ev ? () => setTip(d) : undefined}
              onMouseLeave={ev ? () => setTip(null) : undefined}
            >
              <div style={{
                width:24, height:24, display:'flex', alignItems:'center', justifyContent:'center',
                borderRadius:'50%', fontSize:9.5, fontWeight: tod ? 800 : ev ? 600 : 400,
                color: tod ? '#1a1a1a' : ev ? '#d4a017' : 'rgba(255,255,255,.38)',
                background: tod ? '#d4a017' : 'transparent',
                animation: tod ? 'todayRing 2s ease-in-out infinite' : 'none',
              }}>{d}</div>
              {ev && <div style={{ width:3, height:3, borderRadius:'50%', background: ev.color || '#d4a017', marginTop:1, animation:'dotBeat 2.5s ease-in-out infinite' }} />}
              {tip === d && ev && (
                <div style={{
                  position:'absolute', bottom:'calc(100% + 5px)', left:'50%', transform:'translateX(-50%)',
                  background:'rgba(10,11,14,.98)', border:`1px solid ${ev.color || '#d4a017'}55`,
                  borderRadius:7, padding:'4px 8px', zIndex:30, whiteSpace:'nowrap',
                  fontSize:10, fontWeight:600, color:'#fff',
                  boxShadow:'0 6px 18px rgba(0,0,0,.7)', pointerEvents:'none',
                }}>{ev.icon} {ev.title}</div>
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
  const mon = dt.toLocaleDateString('fr-FR', { month:'short' }).replace('.', '')
  const isSoon = countdown.startsWith('dans') && !countdown.includes('j')
  return (
    <div className="sb-card" style={{ display:'flex', alignItems:'center', gap:12 }}>
      <div style={{
        flexShrink:0, width:40, height:40, borderRadius:10,
        background:`linear-gradient(135deg, ${event.color}28, ${event.color}12)`,
        border:`1px solid ${event.color}55`,
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        boxShadow:`0 4px 12px ${event.color}18`,
      }}>
        <span style={{ fontSize:14, fontWeight:900, color:event.color, lineHeight:1 }}>{day}</span>
        <span style={{ fontSize:7.5, fontWeight:700, color:`${event.color}bb`, letterSpacing:'.05em', marginTop:1 }}>{mon.toUpperCase()}</span>
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:12, fontWeight:700, color:'rgba(255,255,255,.92)', marginBottom:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {event.icon} {event.title}
        </div>
        <div style={{
          fontSize:10, fontWeight:700,
          color: isSoon ? '#2ECC71' : '#d4a017',
          display:'inline-flex', alignItems:'center', gap:4,
        }}>
          {isSoon && <span style={{ width:5, height:5, borderRadius:'50%', background:'#2ECC71', boxShadow:'0 0 6px #2ECC71', display:'inline-block' }} />}
          {countdown}
        </div>
      </div>
    </div>
  )
}

// ─── Discord components ───────────────────────────────────────────────────────
function DiscordAvatar({ author }) {
  const [err, setErr] = useState(false)
  if (!err && author.avatar) {
    return <img src={author.avatar} alt={author.globalName} onError={() => setErr(true)}
      style={{ width:28, height:28, borderRadius:'50%', flexShrink:0, objectFit:'cover' }} />
  }
  const initials = (author.globalName || author.username || '?').slice(0, 2).toUpperCase()
  return (
    <div style={{
      width:28, height:28, borderRadius:'50%', flexShrink:0,
      background:'linear-gradient(135deg,#5865f2,#a29bfe)',
      display:'flex', alignItems:'center', justifyContent:'center',
      fontSize:9, fontWeight:700, color:'#fff',
    }}>{initials}</div>
  )
}

function DiscordMessage({ msg }) {
  const hasContent = msg.content?.trim()
  const hasEmbeds  = msg.embeds?.length > 0
  const hasImages  = msg.attachments?.some(a => a.content_type?.startsWith('image/'))
  if (!hasContent && !hasEmbeds && !hasImages) return null
  return (
    <div style={{ padding:'8px 12px', borderBottom:'1px solid rgba(255,255,255,0.05)', transition:'background .15s' }}
      onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.025)'}
      onMouseLeave={e => e.currentTarget.style.background='transparent'}
    >
      <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:4 }}>
        <DiscordAvatar author={msg.author} />
        <div style={{ flex:1, minWidth:0 }}>
          <span style={{ fontSize:11.5, fontWeight:700, color:'#fff', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', display:'block' }}>
            {msg.author.globalName || msg.author.username}
          </span>
          <span style={{ fontSize:9.5, color:'rgba(255,255,255,0.28)' }}>{timeAgo(msg.timestamp)}</span>
        </div>
        {msg.author.bot && (
          <span style={{ fontSize:7.5, fontWeight:700, color:'#5865f2', background:'rgba(88,101,242,0.18)', borderRadius:3, padding:'1px 4px', flexShrink:0 }}>BOT</span>
        )}
      </div>
      {hasContent && (
        <p style={{ fontSize:11, color:'rgba(255,255,255,0.68)', lineHeight:1.55, margin:0, wordBreak:'break-word', whiteSpace:'pre-wrap' }}>
          {truncate(msg.content, 160)}
        </p>
      )}
      {hasEmbeds && msg.embeds.map((e, i) => (
        <div key={i} style={{
          marginTop:5, borderLeft:`2px solid ${e.color ? `#${e.color.toString(16).padStart(6,'0')}` : '#5865f2'}`,
          background:'rgba(255,255,255,0.035)', padding:'5px 8px', borderRadius:'0 5px 5px 0',
        }}>
          {e.title && <p style={{ fontSize:11.5, fontWeight:700, color:'#fff', margin:'0 0 2px' }}>{e.title}</p>}
          {e.description && <p style={{ fontSize:10.5, color:'rgba(255,255,255,0.62)', margin:0, whiteSpace:'pre-wrap', wordBreak:'break-word' }}>{e.description.slice(0, 160)}{e.description.length > 160 ? '…' : ''}</p>}
        </div>
      ))}
    </div>
  )
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────
const TABS = [
  { id:'calendrier', label:'Calendrier', icon:'📅' },
  { id:'programme',  label:'Programme',  icon:'📋' },
  { id:'annonces',   label:'Annonces',   icon:'📢' },
]

// ─── Main export ──────────────────────────────────────────────────────────────
export default function UnifiedSidebar() {
  const [tab,            setTab]            = useState('calendrier')
  const [msgs,           setMsgs]           = useState([])
  const [discordLoading, setDiscordLoading] = useState(true)
  const [discordError,   setDiscordError]   = useState(null)
  const [lastRefresh,    setLastRefresh]    = useState(null)

  useEffect(() => {
    const id = 'sb-styles'
    if (document.getElementById(id)) return
    const el = document.createElement('style')
    el.id = id; el.textContent = SIDEBAR_CSS
    document.head.appendChild(el)
    return () => document.getElementById(id)?.remove()
  }, [])

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
      width:390, maxHeight:560,
      display:'flex', flexDirection:'column',
      background:'linear-gradient(160deg, rgba(14,15,20,.78) 0%, rgba(8,9,13,.68) 100%)',
      backdropFilter:'blur(32px) saturate(1.5)',
      WebkitBackdropFilter:'blur(32px) saturate(1.5)',
      border:'1px solid rgba(255,255,255,.11)',
      borderTop:'1px solid rgba(255,255,255,.16)',
      borderRadius:20, overflow:'hidden',
      animation:'sbIn .5s .1s cubic-bezier(.22,1,.36,1) both, floatCard 7s ease-in-out 1s infinite',
      boxShadow:'0 32px 80px rgba(0,0,0,.50), 0 0 0 1px rgba(255,255,255,.04) inset, 0 1px 0 rgba(255,255,255,.10) inset',
    }}>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div style={{
        padding:'14px 16px 0', flexShrink:0,
        borderBottom:'1px solid rgba(255,255,255,.06)',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
          <div style={{
            width:9, height:9, borderRadius:'50%', flexShrink:0,
            background:'#2ECC71',
            boxShadow:'0 0 0 2px rgba(46,204,113,.25), 0 0 12px rgba(46,204,113,.60)',
            animation:'dotBeat 2.2s ease-in-out infinite',
          }} />
          <span style={{ fontSize:11.5, fontWeight:800, color:'rgba(255,255,255,.82)', letterSpacing:'.04em' }}>
            Brams Community
          </span>
          <span style={{ marginLeft:'auto', fontSize:8.5, fontWeight:700, color:'rgba(46,204,113,.75)', letterSpacing:'.08em', textTransform:'uppercase', background:'rgba(46,204,113,.10)', border:'1px solid rgba(46,204,113,.22)', borderRadius:20, padding:'1px 8px' }}>
            Live
          </span>
        </div>

        {/* Tab bar */}
        <div style={{ display:'flex', gap:2 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:5,
              padding:'8px 4px 9px', border:'none', cursor:'pointer',
              fontSize:10, fontWeight:700, letterSpacing:'.04em',
              color: tab === t.id ? '#d4a017' : 'rgba(255,255,255,.32)',
              borderBottom: tab === t.id ? '2px solid #d4a017' : '2px solid transparent',
              marginBottom:-1,
              transition:'color .15s, border-color .15s',
              borderRadius:'4px 4px 0 0',
              background: tab === t.id ? 'rgba(212,160,23,.08)' : 'transparent',
            }}>
              <span style={{ fontSize:12 }}>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ───────────────────────────────────────────────────── */}
      <div style={{ flex:1, overflowY:'auto', scrollbarWidth:'thin', scrollbarColor:'rgba(255,255,255,.08) transparent' }}>

        {/* Calendrier */}
        {tab === 'calendrier' && (
          <div style={{ padding:'14px', animation:'sbIn .2s ease-out both' }}>
            <MiniCalendar events={EVENTS} />
            {upcomingEvents.length > 0 && (
              <div style={{ marginTop:16 }}>
                <div style={{ fontSize:8, fontWeight:700, color:'rgba(255,255,255,.28)', letterSpacing:'.12em', marginBottom:8 }}>
                  PROCHAINS ÉVÉNEMENTS
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                  {upcomingEvents.map(ev => <EventCard key={ev.id} event={ev} />)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Programme */}
        {tab === 'programme' && (
          <div style={{ animation:'sbIn .2s ease-out both' }}>
            <div style={{ padding:'12px 14px 8px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontSize:8, fontWeight:700, color:'rgba(255,255,255,.28)', letterSpacing:'.12em' }}>PROGRAMME DE LA SEMAINE</span>
              <span style={{ fontSize:8, color:'rgba(255,255,255,.22)', fontWeight:600 }}>22h30 / soir</span>
            </div>
            {DAYS.map((d, i) => {
              const isToday   = i === TODAY_IDX
              const rankColor = RANK_COLORS[d.rank] || '#aaa'
              return (
                <div key={d.day} style={{
                  display:'flex', alignItems:'center', gap:10, padding:'7px 14px',
                  background: isToday ? 'rgba(212,160,23,.07)' : 'transparent',
                  borderLeft: isToday ? '2px solid #d4a017' : '2px solid transparent',
                  transition:'background .15s',
                }}>
                  <div style={{ width:26, fontSize:9.5, fontWeight: isToday ? 800 : 500, color: isToday ? '#d4a017' : 'rgba(255,255,255,.32)', flexShrink:0 }}>{d.day}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:5, flexWrap:'wrap' }}>
                      <span style={{ fontSize:11.5, fontWeight:700, color: isToday ? '#fff' : 'rgba(255,255,255,.78)', whiteSpace:'nowrap' }}>{d.name}</span>
                      {d.tag && (
                        <span style={{ fontSize:7, fontWeight:800, letterSpacing:'.05em', color:d.tagColor, background:`${d.tagColor}22`, borderRadius:4, padding:'1px 5px', border:`1px solid ${d.tagColor}44`, whiteSpace:'nowrap' }}>
                          {d.tag.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize:9, color:rankColor, fontWeight:600, marginTop:1 }}>{d.rank}</div>
                  </div>
                  <div style={{ fontSize:9, fontWeight:600, color:'rgba(255,255,255,.24)', flexShrink:0 }}>{d.time}</div>
                </div>
              )
            })}
          </div>
        )}

        {/* Annonces */}
        {tab === 'annonces' && (
          <div style={{ animation:'sbIn .2s ease-out both' }}>
            <div style={{ padding:'10px 14px 8px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid rgba(255,255,255,.05)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="#5865f2"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
                <span style={{ fontSize:8, fontWeight:700, color:'rgba(255,255,255,.28)', letterSpacing:'.12em' }}>ANNONCES DISCORD</span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                {lastRefresh && <span style={{ fontSize:8, color:'rgba(255,255,255,.20)' }}>{lastRefresh.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' })}</span>}
                <button onClick={loadDiscord} title="Actualiser" style={{
                  background:'none', border:'none', cursor:'pointer',
                  color:'rgba(255,255,255,.28)', fontSize:13, padding:'0 2px', lineHeight:1, transition:'color .15s',
                }}
                  onMouseEnter={e => e.currentTarget.style.color='#fff'}
                  onMouseLeave={e => e.currentTarget.style.color='rgba(255,255,255,.28)'}
                >↻</button>
              </div>
            </div>

            {discordLoading && (
              <div style={{ padding:'20px', textAlign:'center', color:'rgba(255,255,255,.25)', fontSize:11 }}>Chargement…</div>
            )}
            {!discordLoading && discordError && (
              <div style={{ padding:'14px', textAlign:'center' }}>
                <p style={{ color:'rgba(255,100,100,.7)', fontSize:11, margin:'0 0 8px' }}>{discordError}</p>
                <button onClick={loadDiscord} style={{ fontSize:10, color:'#5865f2', background:'none', border:'1px solid rgba(88,101,242,.4)', borderRadius:5, padding:'3px 10px', cursor:'pointer' }}>Réessayer</button>
              </div>
            )}
            {!discordLoading && !discordError && msgs.length === 0 && (
              <div style={{ padding:'20px', textAlign:'center', color:'rgba(255,255,255,.25)', fontSize:11 }}>Aucune annonce récente</div>
            )}
            {!discordLoading && !discordError && msgs.map(m => <DiscordMessage key={m.id} msg={m} />)}
          </div>
        )}

      </div>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <div style={{
        padding:'10px 14px', flexShrink:0,
        borderTop:'1px solid rgba(255,255,255,.06)',
        display:'flex', alignItems:'center', justifyContent:'space-between',
        background:'rgba(0,0,0,.15)',
      }}>
        <a
          href="https://discord.gg/v3Ddhtbz"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize:10, fontWeight:700, color:'#d4a017',
            background:'rgba(212,160,23,.10)', border:'1px solid rgba(212,160,23,.28)',
            borderRadius:6, padding:'4px 10px', textDecoration:'none',
            transition:'all .15s', display:'inline-flex', alignItems:'center', gap:4,
          }}
          onMouseEnter={e => { e.currentTarget.style.background='rgba(212,160,23,.20)'; e.currentTarget.style.borderColor='rgba(212,160,23,.60)' }}
          onMouseLeave={e => { e.currentTarget.style.background='rgba(212,160,23,.10)'; e.currentTarget.style.borderColor='rgba(212,160,23,.28)' }}
        >
          Rejoindre →
        </a>
      </div>

    </div>
  )
}
