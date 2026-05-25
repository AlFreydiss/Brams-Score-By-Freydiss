import { useState, useEffect } from 'react'

// ─── Data ─────────────────────────────────────────────────────────────────────

const EVENTS = [
  { id: 1, date: '2026-05-17', title: 'Quiz One Piece',          desc: 'Battle de connaissances OP au salon Quiz !' },
  { id: 2, date: '2026-05-20', title: 'Tournoi Vocal',           desc: 'Qui tiendra le plus longtemps en vocal ?' },
  { id: 3, date: '2026-05-22', title: 'Classement Mensuel',      desc: 'Révélation du top 10 du mois de mai.' },
  { id: 4, date: '2026-05-25', title: 'Watch Party Dr. Stone',   desc: 'Visionnage en groupe — S3 ep 1 à 3.' },
  { id: 5, date: '2026-05-30', title: 'Grand Tournoi Nakamas',   desc: 'Finale — inscription obligatoire en avance.' },
]

const ANNOUNCEMENTS = [
  {
    author: 'Brams Score',
    avatar: '🏴‍☠️',
    content: "Le classement de la semaine vient d'être mis à jour ! Félicitations à CartonOG qui prend la tête avec 166h de vocal. Les Berrys ont été distribués à tous les membres actifs — continuez comme ça nakamas !",
    timestamp: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
]

export async function getEvents()        { return EVENTS }
export async function getAnnouncements() { return ANNOUNCEMENTS }

// ─── Widget styles ─────────────────────────────────────────────────────────────

const WIDGET_STYLES = `
  @keyframes dotPulse {
    0%,100% { transform: scale(1);   opacity: 0.7; }
    50%      { transform: scale(1.6); opacity: 1;   }
  }
  @keyframes todayGlow {
    0%,100% { box-shadow: 0 0 10px rgba(224,82,74,.50), 0 0 22px rgba(224,82,74,.22); }
    50%      { box-shadow: 0 0 18px rgba(224,82,74,.85), 0 0 36px rgba(224,82,74,.40); }
  }
  @keyframes newPulse {
    0%,100% { box-shadow: 0 0 0 0   rgba(224,82,74,.55); }
    50%      { box-shadow: 0 0 0 5px rgba(224,82,74,0);   }
  }
  @keyframes borderShift {
    0%,100% { background-position: 0%   50%; }
    50%      { background-position: 100% 50%; }
  }
  @keyframes widgetSlide {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0);    }
  }
  .evt-border {
    background: linear-gradient(135deg, rgba(224,82,74,.45), rgba(255,138,128,.25), rgba(255,179,71,.45), rgba(224,82,74,.45));
    background-size: 300% 300%;
    animation: borderShift 4s ease infinite;
    padding: 1px;
    border-radius: 14px;
    transition: transform .2s ease, box-shadow .2s ease;
    cursor: default;
  }
  .evt-border:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 28px rgba(224,82,74,.22);
    background: linear-gradient(135deg, #e0524a, #ff8a80, #ffb347, #e0524a);
    background-size: 300% 300%;
  }
`

// ─── Utils ─────────────────────────────────────────────────────────────────────

function timeAgo(iso) {
  const mins = Math.floor((Date.now() - new Date(iso)) / 60000)
  if (mins < 1)  return "à l'instant"
  if (mins < 60) return `il y a ${mins}min`
  const h = Math.floor(mins / 60)
  if (h < 24)    return `il y a ${h}h`
  return `il y a ${Math.floor(h / 24)}j`
}

function isRecent(iso) { return Date.now() - new Date(iso) < 86400000 }

function truncate(str, n) { return str.length > n ? str.slice(0, n) + '…' : str }

// ─── useCountdown ──────────────────────────────────────────────────────────────

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

// ─── MiniCalendar ─────────────────────────────────────────────────────────────

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

const navBtnBase = {
  background: 'rgba(255,255,255,.06)',
  border: '1px solid rgba(255,255,255,.09)',
  borderRadius: 7,
  color: 'rgba(255,255,255,.55)',
  cursor: 'pointer',
  width: 26, height: 26,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 16, lineHeight: 1,
  transition: 'background .15s, color .15s',
}

function MiniCalendar({ events }) {
  const today   = new Date()
  const [year,  setYear]    = useState(today.getFullYear())
  const [month, setMonth]   = useState(today.getMonth())
  const [tip,   setTip]     = useState(null)

  const eventMap = {}
  events.forEach(e => { eventMap[e.date] = e })

  const pad2         = n   => String(n).padStart(2, '0')
  const dateKey      = d   => `${year}-${pad2(month + 1)}-${pad2(d)}`
  const isToday      = d   => d === today.getDate() && month === today.getMonth() && year === today.getFullYear()
  const daysInMonth  = new Date(year, month + 1, 0).getDate()
  const firstDow     = (new Date(year, month, 1).getDay() + 6) % 7
  const monthLabel   = new Date(year, month).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

  const prevM = () => { if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1) }
  const nextM = () => { if (month === 11) { setMonth(0);  setYear(y => y + 1) } else setMonth(m => m + 1) }

  const cells = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <div style={{ background: 'rgba(14,15,17,.65)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,.09)', borderRadius: 16, padding: '14px 14px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <button style={navBtnBase} onClick={prevM}
          onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,.13)'; e.currentTarget.style.color='#fff' }}
          onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,.06)'; e.currentTarget.style.color='rgba(255,255,255,.55)' }}
        >‹</button>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', textTransform: 'capitalize', letterSpacing: '.02em' }}>{monthLabel}</span>
        <button style={navBtnBase} onClick={nextM}
          onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,.13)'; e.currentTarget.style.color='#fff' }}
          onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,.06)'; e.currentTarget.style.color='rgba(255,255,255,.55)' }}
        >›</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 1, marginBottom: 4 }}>
        {WEEKDAYS.map((w, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: 8, fontWeight: 700, color: 'rgba(255,255,255,.30)', letterSpacing: '.02em' }}>{w}</div>
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
                width: 28, height: 28,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '50%',
                fontSize: 11, fontWeight: tod ? 800 : ev ? 600 : 400,
                color: tod ? '#fff' : ev ? 'var(--accent)' : 'rgba(255,255,255,.40)',
                background: tod ? 'var(--accent)' : 'transparent',
                animation: tod ? 'todayGlow 2.2s ease-in-out infinite' : 'none',
              }}>{d}</div>
              {ev && <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--accent)', marginTop: 1, animation: 'dotPulse 2.5s ease-in-out infinite' }} />}
              {tip === d && ev && (
                <div style={{
                  position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)',
                  background: 'rgba(12,13,15,.98)', border: '1px solid rgba(224,82,74,.35)',
                  borderRadius: 8, padding: '5px 9px', zIndex: 20,
                  whiteSpace: 'nowrap', fontSize: 11, fontWeight: 600, color: '#fff',
                  boxShadow: '0 8px 20px rgba(0,0,0,.6), 0 0 10px rgba(224,82,74,.12)',
                  pointerEvents: 'none',
                }}>{ev.title}</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── EventCard ─────────────────────────────────────────────────────────────────

function EventCard({ event, delay }) {
  const countdown = useCountdown(event.date)
  const dt  = new Date(event.date)
  const day = dt.getDate()
  const mon = dt.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')

  return (
    <div className="evt-border" style={{ animationDelay: `${delay}s`, animation: `widgetSlide .55s ${delay}s ease-out both` }}>
      <div style={{ background: 'rgba(13,14,16,.95)', borderRadius: 13, padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 15 }}>
        <div style={{ flexShrink: 0, width: 42, height: 42, borderRadius: 10, background: 'rgba(224,82,74,.12)', border: '1px solid rgba(224,82,74,.28)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginRight: 2 }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--accent)', lineHeight: 1 }}>{day}</span>
          <span style={{ fontSize: 8, fontWeight: 700, color: 'rgba(224,82,74,.65)', letterSpacing: '.06em', marginTop: 1 }}>{mon}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0, paddingLeft: 2 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.title}</div>
          <div style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 600 }}>{countdown}</div>
        </div>
      </div>
    </div>
  )
}

// ─── AnnouncementBlock ────────────────────────────────────────────────────────

function AnnouncementBlock({ ann }) {
  const [time, setTime] = useState(() => timeAgo(ann.timestamp))
  useEffect(() => {
    const id = setInterval(() => setTime(timeAgo(ann.timestamp)), 60000)
    return () => clearInterval(id)
  }, [ann.timestamp])

  return (
    <div style={{ background: 'rgba(14,15,17,.65)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,.09)', borderRadius: 14, padding: '12px 14px', animation: 'widgetSlide .55s .9s ease-out both' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9 }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg,#e0524a,#9b59b6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>{ann.avatar}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{ann.author}</div>
          <div style={{ fontSize: 10, color: 'var(--muted)' }}>{time}</div>
        </div>
        {isRecent(ann.timestamp) && (
          <div style={{ fontSize: 9, fontWeight: 800, color: '#fff', background: 'var(--accent)', borderRadius: 5, padding: '2px 7px', letterSpacing: '.07em', flexShrink: 0, animation: 'newPulse 2s ease-in-out infinite' }}>NEW</div>
        )}
      </div>
      <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,.60)', lineHeight: 1.65, margin: 0 }}>{truncate(ann.content, 120)}</p>
    </div>
  )
}

// ─── CalendarWidget ───────────────────────────────────────────────────────────

export default function CalendarWidget() {
  const [events]        = useState(EVENTS)
  const [announcements] = useState(ANNOUNCEMENTS)

  useEffect(() => {
    const id = 'calendar-widget-styles'
    if (document.getElementById(id)) return
    const el = document.createElement('style')
    el.id = id
    el.textContent = WIDGET_STYLES
    document.head.appendChild(el)
    return () => { if (document.getElementById(id)) el.remove() }
  }, [])

  const today          = new Date()
  const upcomingEvents = events
    .filter(e => new Date(e.date) >= today)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 3)
  const latestAnn = announcements[0] ?? null

  return (
    <div style={{ position: 'relative', width: 320, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ position: 'absolute', inset: -50, background: 'radial-gradient(ellipse at 50% 35%, rgba(224,82,74,.08) 0%, transparent 68%)', pointerEvents: 'none', zIndex: 0 }} />

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>

        <div style={{ animation: 'widgetSlide .55s .3s ease-out both' }}>
          <MiniCalendar events={events} />
        </div>

        {upcomingEvents.length > 0 && (
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,.28)', letterSpacing: '.12em', marginBottom: 7, paddingLeft: 2 }}>Prochains events</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {upcomingEvents.map((ev, i) => (
                <EventCard key={ev.id} event={ev} delay={0.44 + i * 0.1} />
              ))}
            </div>
          </div>
        )}

        {latestAnn && (
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,.28)', letterSpacing: '.12em', marginBottom: 7, paddingLeft: 2 }}>Dernière annonce</div>
            <AnnouncementBlock ann={latestAnn} />
          </div>
        )}

      </div>
    </div>
  )
}
