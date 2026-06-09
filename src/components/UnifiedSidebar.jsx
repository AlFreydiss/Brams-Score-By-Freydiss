import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchLeaderboard } from '../lib/supabase.js'
import { fetchVoiceLive, fetchNewMembers } from '../lib/hubLive.js'
import { getRank } from '../lib/profileTokens.js'

// ─── Data ─────────────────────────────────────────────────────────────────────
const EVENTS = [
  { id:1, date:'2026-05-25', title:'Watch Party Dr. Stone',    color:'#34d399', icon:'🎬' },
  { id:2, date:'2026-05-30', title:'Grand Tournoi Nakamas',    color:'#e0524a', icon:'⚔️' },
  { id:3, date:'2026-06-05', title:'Nuit des Encyclopédistes', color:'#a29bfe', icon:'📚' },
  { id:4, date:'2026-06-14', title:'Blind Test Mensuel',       color:'#d4a017', icon:'🎵' },
  { id:5, date:'2026-06-20', title:'Tournoi Vocal Elite',      color:'#5865f2', icon:'🎙️' },
]

const SCHEDULE = [
  { day:'Lun', name:'Undercover',    rank:'Yonkou',      time:'22h30', tag:'SELECT',  tagColor:'#e0524a' },
  { day:'Mar', name:'Quitte la Voc', rank:'Pirate',      time:'22h30', tag:null,      tagColor:null      },
  { day:'Mer', name:'Passe ou Pas',  rank:'Shichibukai', time:'22h30', tag:null,      tagColor:null      },
  { day:'Jeu', name:'Quitte la Voc', rank:'Pirate',      time:'22h30', tag:null,      tagColor:null      },
  { day:'Ven', name:'Alphabets',     rank:'Shichibukai', time:'22h30', tag:null,      tagColor:null      },
  { day:'Sam', name:'Quitte la Voc', rank:'Pirate',      time:'22h30', tag:'STREAM',  tagColor:'#9147ff' },
  { day:'Dim', name:'Quitte la Voc', rank:'Pirate',      time:'22h30', tag:null,      tagColor:null      },
]

const RANK_COLORS = { Yonkou:'#e0524a', Shichibukai:'#a29bfe', Pirate:'#74b9ff' }
const TODAY_IDX   = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1
const WEEKDAYS    = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim']

const TABS = [
  { id:'live',       label:'En direct',  icon:'🔴' },
  { id:'calendrier', label:'Calendrier', icon:'📅' },
  { id:'programme',  label:'Programme',  icon:'📋' },
]

// Citation de spotlight selon le rang (membre de la semaine)
const SPOTLIGHT_QUOTES = {
  'Roi des Pirates': "Les mers du monde m'appartiennent.",
  'Yonkou':          'Les mers tremblent là où je marche.',
  'Amiral':          "La justice forgée dans l'acier ne faiblit jamais.",
  'Shichibukai':     'Entre ombre et lumière, je trace ma route.',
  'Pirate':          'La liberté se mérite par le sang et la sueur.',
  'Moussaillon':     "Le voyage ne fait que commencer.",
}
const MEDALS = ['🥇', '🥈', '🥉']

const BLIND_TEST_STATS = [
  { label:'Titres',     value:'12',  icon:'🎵' },
  { label:'Joueurs',    value:'200+', icon:'🏆' },
  { label:'Animes',     value:'10',  icon:'🎬' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
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

// ─── Equalizer visual ─────────────────────────────────────────────────────────
function Equalizer() {
  const bars = [
    { h: 35, delay: '0s',    dur: '0.9s'  },
    { h: 65, delay: '0.1s',  dur: '1.1s'  },
    { h: 90, delay: '0.2s',  dur: '0.8s'  },
    { h: 50, delay: '0.05s', dur: '1.3s'  },
    { h: 75, delay: '0.3s',  dur: '0.95s' },
    { h: 40, delay: '0.15s', dur: '1.2s'  },
    { h: 80, delay: '0.25s', dur: '0.85s' },
    { h: 55, delay: '0.4s',  dur: '1.0s'  },
    { h: 30, delay: '0.35s', dur: '1.15s' },
    { h: 70, delay: '0.45s', dur: '0.75s' },
    { h: 45, delay: '0.1s',  dur: '1.25s' },
    { h: 85, delay: '0.5s',  dur: '0.9s'  },
    { h: 60, delay: '0.2s',  dur: '1.05s' },
    { h: 38, delay: '0.3s',  dur: '1.1s'  },
    { h: 72, delay: '0.15s', dur: '0.88s' },
    { h: 48, delay: '0.35s', dur: '1.3s'  },
  ]
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:3, height:60, padding:'0 4px' }}>
      {bars.map((b, i) => (
        <div key={i} style={{
          flex:1, borderRadius:'2px 2px 0 0',
          background:`linear-gradient(180deg, #d4a017, rgba(212,160,23,.35))`,
          minHeight:4,
          animation:`eqBar ${b.dur} ${b.delay} ease-in-out infinite alternate`,
          '--h': `${b.h}%`,
        }} />
      ))}
    </div>
  )
}

// ─── Calendar ─────────────────────────────────────────────────────────────────
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
      {/* Month nav */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
        <button className="hub-nav-btn" onClick={prevM}>‹</button>
        <span style={{ fontSize:13, fontWeight:800, color:'#fff', textTransform:'capitalize', letterSpacing:'.02em' }}>{monthLabel}</span>
        <button className="hub-nav-btn" onClick={nextM}>›</button>
      </div>

      {/* Weekdays header */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', marginBottom:6, gap:2 }}>
        {WEEKDAYS.map((w, i) => (
          <div key={i} style={{ textAlign:'center', fontSize:9, fontWeight:800, color:'rgba(255,255,255,.28)', paddingBottom:4, letterSpacing:'.04em' }}>{w}</div>
        ))}
      </div>

      {/* Days grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2 }}>
        {cells.map((d, i) => {
          if (!d) return <div key={`e${i}`} style={{ aspectRatio:'1' }} />
          const key = dateKey(d)
          const ev  = eventMap[key]
          const tod = isToday(d)
          return (
            <div key={d} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2, position:'relative' }}
              onMouseEnter={ev ? () => setTip(d) : undefined}
              onMouseLeave={ev ? () => setTip(null) : undefined}
            >
              <div style={{
                width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center',
                borderRadius:'50%',
                fontSize:11, fontWeight: tod ? 900 : ev ? 700 : 400,
                color: tod ? '#1a1a1a' : ev ? '#d4a017' : 'rgba(255,255,255,.4)',
                background: tod ? '#d4a017' : ev ? 'rgba(212,160,23,.1)' : 'transparent',
                border: ev && !tod ? '1px solid rgba(212,160,23,.25)' : tod ? 'none' : '1px solid transparent',
                animation: tod ? 'calToday 2s ease-in-out infinite' : 'none',
                cursor: ev ? 'pointer' : 'default',
                transition: 'background .15s',
              }}>{d}</div>
              {ev && <div style={{ width:4, height:4, borderRadius:'50%', background: ev.color, boxShadow:`0 0 5px ${ev.color}` }} />}
              {!ev && <div style={{ width:4, height:4 }} />}
              {tip === d && ev && (
                <div style={{
                  position:'absolute', bottom:'calc(100% + 6px)', left:'50%', transform:'translateX(-50%)',
                  background:'rgba(8,10,14,.98)', border:`1px solid ${ev.color}44`,
                  borderRadius:8, padding:'5px 10px', zIndex:30, whiteSpace:'nowrap',
                  fontSize:10.5, fontWeight:700, color:'#fff',
                  boxShadow:`0 8px 24px rgba(0,0,0,.8), 0 0 0 1px ${ev.color}22`,
                  pointerEvents:'none',
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
  const mon = dt.toLocaleDateString('fr-FR', { month:'short' }).replace('.', '').toUpperCase()
  const isSoon = countdown.startsWith('dans') && !countdown.includes('j')
  const isNow  = countdown === 'En cours !'
  return (
    <div className="hub-event-card" style={{ '--ec': event.color }}>
      <div className="hub-event-date">
        <span className="hub-event-day">{day}</span>
        <span className="hub-event-mon">{mon}</span>
      </div>
      <div className="hub-event-body">
        <div className="hub-event-title">{event.icon} {event.title}</div>
        <div className="hub-event-countdown" style={{ color: isNow ? '#2ECC71' : isSoon ? '#2ECC71' : 'rgba(255,255,255,.42)' }}>
          {(isNow || isSoon) && <span className="hub-event-dot" style={{ background: '#2ECC71' }} />}
          {countdown}
        </div>
      </div>
      <div className="hub-event-status" style={{ background: `${event.color}18`, borderColor: `${event.color}33`, color: event.color }}>
        {isNow ? 'LIVE' : isSoon ? 'BIENTÔT' : 'PLANIFIÉ'}
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
  if (!hasContent && !hasEmbeds) return null
  return (
    <div style={{ padding:'10px 16px', borderBottom:'1px solid rgba(255,255,255,0.05)', transition:'background .15s' }}
      onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.025)'}
      onMouseLeave={e => e.currentTarget.style.background='transparent'}
    >
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
        <DiscordAvatar author={msg.author} />
        <div style={{ flex:1, minWidth:0 }}>
          <span style={{ fontSize:12, fontWeight:700, color:'#fff', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', display:'block' }}>
            {msg.author.globalName || msg.author.username}
          </span>
          <span style={{ fontSize:10, color:'rgba(255,255,255,0.28)' }}>{timeAgo(msg.timestamp)}</span>
        </div>
        {msg.author.bot && (
          <span style={{ fontSize:8, fontWeight:700, color:'#5865f2', background:'rgba(88,101,242,.15)', borderRadius:4, padding:'2px 5px', flexShrink:0 }}>BOT</span>
        )}
      </div>
      {hasContent && (
        <p style={{ fontSize:11.5, color:'rgba(255,255,255,0.7)', lineHeight:1.6, margin:0, wordBreak:'break-word' }}>
          {truncate(msg.content, 200)}
        </p>
      )}
      {hasEmbeds && msg.embeds.map((e, i) => (
        <div key={i} style={{
          marginTop:6, borderLeft:`2px solid ${e.color ? `#${e.color.toString(16).padStart(6,'0')}` : '#5865f2'}`,
          background:'rgba(255,255,255,.035)', padding:'6px 10px', borderRadius:'0 6px 6px 0',
        }}>
          {e.title && <p style={{ fontSize:12, fontWeight:700, color:'#fff', margin:'0 0 3px' }}>{e.title}</p>}
          {e.description && <p style={{ fontSize:11, color:'rgba(255,255,255,.6)', margin:0 }}>{e.description.slice(0, 180)}{e.description.length > 180 ? '…' : ''}</p>}
        </div>
      ))}
    </div>
  )
}

// ─── Live: avatar avec fallback initiales ─────────────────────────────────────
function LiveAvatar({ src, name, size = 34, ring = '#2ECC71' }) {
  const [err, setErr] = useState(false)
  const initials = ((name || '?').replace(/[^\p{L}\p{N}]/gu, '').slice(0, 2).toUpperCase()) || '?'
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', flexShrink:0,
      boxShadow:`0 0 0 2px ${ring}`, background:'#1a1d27', overflow:'hidden',
      display:'flex', alignItems:'center', justifyContent:'center' }}>
      {!err && src
        ? <img src={src} alt={name} onError={() => setErr(true)} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
        : <span style={{ fontSize:size*0.34, fontWeight:800, color:'#fff' }}>{initials}</span>}
    </div>
  )
}

// ─── Live: qui est en vocal maintenant ────────────────────────────────────────
function VoiceLiveBlock({ voice, navigate }) {
  const { count, members } = voice
  const shown = members.slice(0, 9)
  const extra = count - shown.length
  return (
    <div style={{ padding:'12px 18px 4px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:9 }}>
        <span style={{ fontSize:14 }}>🎙️</span>
        <span style={{ fontSize:12, fontWeight:800, color:'rgba(255,255,255,.9)', letterSpacing:'.03em' }}>En vocal maintenant</span>
        <span style={{ marginLeft:'auto', display:'inline-flex', alignItems:'center', gap:6,
          background:'rgba(46,204,113,.12)', border:'1px solid rgba(46,204,113,.3)', borderRadius:999, padding:'3px 10px' }}>
          <span style={{ width:6, height:6, borderRadius:'50%', background:'#2ECC71', boxShadow:'0 0 8px #2ECC71', animation:'dotBeat 1.6s ease-in-out infinite' }} />
          <span style={{ fontSize:12, fontWeight:900, color:'#2ECC71' }}>{count}</span>
        </span>
      </div>
      {count === 0 ? (
        <div style={{ padding:'16px 14px', textAlign:'center', borderRadius:14, background:'rgba(255,255,255,.025)', border:'1px solid rgba(255,255,255,.06)' }}>
          <div style={{ fontSize:13, color:'rgba(255,255,255,.55)', marginBottom:8 }}>Aucun nakama en vocal pour l’instant</div>
          <button
            onClick={() => window.open('https://discord.gg/4FgezPpnGU', '_blank')}
            style={{
              background:'#2ECC71', color:'#111', border:'none', borderRadius:999, padding:'6px 16px',
              fontWeight:800, fontSize:12, cursor:'pointer'
            }}
          >
            Rejoindre le Discord & lancer un salon
          </button>
        </div>
      ) : (
        <div style={{ display:'flex', alignItems:'center' }}>
          {shown.map((m, i) => (
            <div key={m.uid} onClick={() => navigate(`/u/${m.uid}`)} title={m.username}
              style={{ marginLeft: i === 0 ? 0 : -10, cursor:'pointer', transition:'transform .15s', zIndex: shown.length - i }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none' }}>
              <LiveAvatar src={m.avatar_url} name={m.username} />
            </div>
          ))}
          {extra > 0 && (
            <div style={{ marginLeft:-10, width:34, height:34, borderRadius:'50%', background:'rgba(46,204,113,.14)',
              border:'1px solid rgba(46,204,113,.3)', display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:11, fontWeight:800, color:'#2ECC71', flexShrink:0 }}>+{extra}</div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Live: podium top 3 de la semaine + nouveaux nakamas ──────────────────────
function PodiumBlock({ board, newMembers, navigate }) {
  const top = (board || []).slice(0, 3)
  return (
    <div style={{ padding:'4px 18px 4px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:7 }}>
        <span style={{ fontSize:9, fontWeight:800, color:'rgba(255,255,255,.4)', letterSpacing:'.14em' }}>TOP DE LA SEMAINE</span>
        {newMembers != null && newMembers > 0 && (
          <span style={{ fontSize:10, fontWeight:700, color:'#d4a017' }}>🆕 {newMembers} nouveaux</span>
        )}
      </div>
      {top.length === 0 ? (
        <div style={{ fontSize:11, color:'rgba(255,255,255,.3)', padding:'6px 0' }}>Chargement…</div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
          {top.map((m, i) => (
            <div key={m.uid} onClick={() => navigate(`/u/${m.uid}`)}
              style={{ display:'flex', alignItems:'center', gap:10, padding:'6px 10px', borderRadius:10, cursor:'pointer',
                background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.06)', transition:'background .15s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(212,160,23,.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,.03)'}>
              <span style={{ fontSize:15, width:18, textAlign:'center', flexShrink:0 }}>{MEDALS[i]}</span>
              <LiveAvatar src={m.avatar_url} name={m.username} size={30} ring="rgba(212,160,23,.5)" />
              <span style={{ flex:1, minWidth:0, fontSize:12.5, fontWeight:700, color:'rgba(255,255,255,.88)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.username}</span>
              <span style={{ fontSize:12, fontWeight:800, color:'#d4a017', flexShrink:0 }}>{Math.round(parseFloat(m.vocal_h || 0))}h</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Live: membre de la semaine (spotlight) ───────────────────────────────────
function SpotlightBlock({ member, navigate }) {
  if (!member) return null
  const hours = parseFloat(member.vocal_h || 0)
  const rank = getRank(hours)
  const quote = SPOTLIGHT_QUOTES[rank.rang] || ''
  return (
    <div style={{ padding:'6px 18px 4px' }}>
      <div style={{ fontSize:9, fontWeight:800, color:'rgba(255,255,255,.4)', letterSpacing:'.14em', marginBottom:7 }}>⭐ MEMBRE DE LA SEMAINE</div>
      <div onClick={() => navigate(`/u/${member.uid}`)}
        style={{ display:'flex', alignItems:'center', gap:11, padding:'10px 11px', borderRadius:13, cursor:'pointer',
          background:`linear-gradient(135deg, ${rank.color}1f, transparent)`, border:`1px solid ${rank.color}38`,
          transition:'transform .18s, box-shadow .18s' }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 10px 26px ${rank.color}22` }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}>
        <LiveAvatar src={member.avatar_url} name={member.username} size={44} ring={rank.color} />
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:14, fontWeight:800, color:'#fff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{member.username}</div>
          <div style={{ display:'inline-flex', alignItems:'center', gap:5, marginTop:3, fontSize:10, fontWeight:800, color:rank.color,
            background:`${rank.color}1f`, border:`1px solid ${rank.color}3a`, borderRadius:999, padding:'2px 8px' }}>{rank.emoji} {rank.rang}</div>
          {quote && <div style={{ fontSize:10, fontStyle:'italic', color:'rgba(255,255,255,.45)', marginTop:4, lineHeight:1.35, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>« {quote} »</div>}
        </div>
      </div>
    </div>
  )
}

// ─── Live: gros compte à rebours du prochain événement ────────────────────────
function CountdownBig({ event }) {
  const calc = () => {
    const diff = new Date(event.date) - Date.now()
    if (diff <= 0) return null
    return {
      d: Math.floor(diff / 86400000),
      h: Math.floor((diff % 86400000) / 3600000),
      m: Math.floor((diff % 3600000) / 60000),
      s: Math.floor((diff % 60000) / 1000),
    }
  }
  const [t, setT] = useState(calc)
  useEffect(() => { const id = setInterval(() => setT(calc()), 1000); return () => clearInterval(id) }, [event.date])
  const cell = (val, lbl) => (
    <div style={{ flex:1, textAlign:'center', background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)', borderRadius:9, padding:'6px 4px' }}>
      <div style={{ fontSize:18, fontWeight:900, color:'#fff', letterSpacing:'-.02em', lineHeight:1, fontVariantNumeric:'tabular-nums' }}>{String(val).padStart(2, '0')}</div>
      <div style={{ fontSize:8, fontWeight:700, color:'rgba(255,255,255,.4)', letterSpacing:'.1em', marginTop:3, textTransform:'uppercase' }}>{lbl}</div>
    </div>
  )
  return (
    <div style={{ padding:'4px 18px 14px' }}>
      <div style={{ fontSize:9, fontWeight:800, color:'rgba(255,255,255,.4)', letterSpacing:'.14em', marginBottom:7 }}>⏳ PROCHAIN ÉVÉNEMENT</div>
      <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:8 }}>
        <span style={{ fontSize:16 }}>{event.icon}</span>
        <span style={{ fontSize:13, fontWeight:700, color:'#fff' }}>{event.title}</span>
      </div>
      {t ? (
        <div style={{ display:'flex', gap:6 }}>
          {cell(t.d, 'jours')}{cell(t.h, 'h')}{cell(t.m, 'min')}{cell(t.s, 'sec')}
        </div>
      ) : (
        <div style={{ textAlign:'center', fontSize:13, fontWeight:800, color:'#2ECC71', padding:'8px' }}>🔴 En cours !</div>
      )}
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function UnifiedSidebar() {
  const navigate = useNavigate()
  const [tab,            setTab]            = useState('live')
  const [msgs,           setMsgs]           = useState([])
  const [discordLoading, setDiscordLoading] = useState(true)
  const [discordError,   setDiscordError]   = useState(null)
  const [lastRefresh,    setLastRefresh]    = useState(null)

  // ── Données live (vocal en direct, podium semaine, nouveaux nakamas) ──────────
  const [voice,      setVoice]      = useState({ count: 0, members: [] })
  const [board,      setBoard]      = useState(null)
  const [newMembers, setNewMembers] = useState(null)

  useEffect(() => {
    let stop = false
    const loadVoice = () => fetchVoiceLive(240).then(v => { if (!stop) setVoice(v) }).catch(() => {})
    loadVoice()
    const id = setInterval(loadVoice, 30000)
    const onFocus = () => { if (!document.hidden) loadVoice() }
    window.addEventListener('focus', onFocus)
    return () => { stop = true; clearInterval(id); window.removeEventListener('focus', onFocus) }
  }, [])

  useEffect(() => {
    let stop = false
    const loadBoard = () => fetchLeaderboard(5, 'week').then(d => { if (!stop && Array.isArray(d)) setBoard(d) }).catch(() => {})
    loadBoard()
    fetchNewMembers('7d').then(n => { if (!stop) setNewMembers(n) }).catch(() => {})
    const id = setInterval(loadBoard, 60000)
    return () => { stop = true; clearInterval(id) }
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

  const today   = new Date()
  const upcoming = EVENTS
    .filter(e => new Date(e.date) >= today)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 4)

  const nextEvent = upcoming[0]

  // Tri par heures décroissantes → l'ordre des médailles colle aux heures affichées.
  const rankedBoard = (board || []).slice().sort((a, b) => parseFloat(b.vocal_h || 0) - parseFloat(a.vocal_h || 0))

  return (
    <>
      <style>{`
        @keyframes hubIn     { from { opacity:0; transform:translateY(14px) } to { opacity:1; transform:none } }
        @keyframes dotBeat   { 0%,100%{transform:scale(1);opacity:.65} 50%{transform:scale(1.7);opacity:1} }
        @keyframes calToday  { 0%,100%{box-shadow:0 0 0 2px rgba(212,160,23,.55),0 0 12px rgba(212,160,23,.3)} 50%{box-shadow:0 0 0 3px rgba(212,160,23,.8),0 0 20px rgba(212,160,23,.55)} }
        @keyframes eqBar     { 0%{height:var(--h,30%)} 100%{height:calc(var(--h,30%) / 3)} }
        @keyframes btPulse   { 0%,100%{opacity:.7} 50%{opacity:1} }
        @keyframes btShimmer { 0%{left:-100%} 60%{left:130%} 100%{left:130%} }

        .hub-nav-btn {
          background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.09);
          border-radius:8px; color:rgba(255,255,255,.5); cursor:pointer;
          width:28px; height:28px; display:flex; align-items:center; justify-content:center;
          font-size:16px; line-height:1; transition:background .15s, color .15s; flex-shrink:0;
        }
        .hub-nav-btn:hover { background:rgba(255,255,255,.14); color:#fff; }

        .hub-tab-btn {
          flex:1; display:flex; align-items:center; justify-content:center; gap:5px;
          padding:10px 6px 11px; border:none; cursor:pointer;
          font-size:11px; font-weight:700; letter-spacing:.03em;
          border-bottom:2px solid transparent; margin-bottom:-1px;
          border-radius:4px 4px 0 0; transition:color .15s, border-color .15s, background .15s;
          background:transparent;
        }
        .hub-tab-btn.active { border-bottom-color:#d4a017; background:rgba(212,160,23,.09); color:#f0be46; }
        .hub-tab-btn:not(.active) { color:rgba(255,255,255,.45); }
        .hub-tab-btn:not(.active):hover { color:rgba(255,255,255,.75); background:rgba(255,255,255,.04); }
        .hub-tab-btn.bt-tab { }
        .hub-tab-btn.bt-tab.active { border-bottom-color:#d4a017; color:#f0be46; background:rgba(212,160,23,.09); }

        .hub-event-card {
          display:flex; align-items:center; gap:16px; padding:13px 16px;
          background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08);
          border-left:3px solid var(--ec); border-radius:12px;
          transition:background .18s, transform .18s, box-shadow .18s;
          cursor:default;
        }
        .hub-event-card:hover {
          background:rgba(255,255,255,.07); transform:translateY(-2px);
          box-shadow:0 8px 24px rgba(0,0,0,.3), 0 0 0 1px rgba(255,255,255,.06);
        }
        .hub-event-date {
          flex-shrink:0; width:46px; height:46px; border-radius:10px;
          background:color-mix(in srgb, var(--ec) 14%, transparent);
          border:1px solid color-mix(in srgb, var(--ec) 30%, transparent);
          display:flex; flex-direction:column; align-items:center; justify-content:center;
          box-shadow:0 4px 14px color-mix(in srgb, var(--ec) 15%, transparent);
        }
        .hub-event-day { font-size:16px; font-weight:900; color:var(--ec); line-height:1; }
        .hub-event-mon { font-size:8px; font-weight:800; color:color-mix(in srgb, var(--ec) 75%, transparent); letter-spacing:.06em; margin-top:1px; }
        .hub-event-body { flex:1; min-width:0; padding-left:2px; }
        .hub-event-title { font-size:12.5px; font-weight:700; color:rgba(255,255,255,.9); margin-bottom:3px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .hub-event-countdown { font-size:10.5px; font-weight:700; display:inline-flex; align-items:center; gap:5px; }
        .hub-event-dot { width:5px; height:5px; border-radius:50%; box-shadow:0 0 6px currentColor; flex-shrink:0; }
        .hub-event-status {
          flex-shrink:0; font-size:8px; font-weight:800; letter-spacing:.08em;
          padding:3px 8px; border-radius:999px; border:1px solid; white-space:nowrap;
        }

        .hub-schedule-row {
          display:flex; align-items:center; gap:12; padding:9px 16px;
          transition:background .15s; border-left:2px solid transparent;
        }
        .hub-schedule-row.today-row { background:rgba(212,160,23,.07); border-left-color:#d4a017; }

        .hub-bt-cta {
          display:flex; align-items:center; justify-content:center; gap:8;
          width:100%; padding:13px 0; border-radius:12px;
          font-size:13px; font-weight:800; letter-spacing:.04em;
          cursor:pointer; border:none; text-decoration:none;
          transition:all .22s; position:relative; overflow:hidden;
        }
        .hub-bt-cta.primary {
          background:linear-gradient(135deg, #C8940F 0%, #E8B84A 50%, #C8940F 100%);
          background-size:200% auto;
          color:#12090a;
          box-shadow:0 8px 28px rgba(212,160,23,.38);
        }
        .hub-bt-cta.primary:hover {
          background-position:right center;
          box-shadow:0 12px 36px rgba(212,160,23,.55);
          transform:translateY(-2px);
        }
        .hub-bt-cta.secondary {
          background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.14);
          color:rgba(255,255,255,.72);
        }
        .hub-bt-cta.secondary:hover { background:rgba(255,255,255,.09); color:#fff; border-color:rgba(255,255,255,.25); }
        .hub-bt-cta::before {
          content:''; position:absolute; top:0; left:-100%; width:50%; height:100%;
          background:linear-gradient(90deg, transparent, rgba(255,255,255,.12), transparent);
          animation:btShimmer 4s 1s ease-in-out infinite;
        }

        .hub-bt-stat {
          display:flex; flex-direction:column; align-items:center; gap:5;
          padding:12px 8px; border-radius:12px;
          background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.07);
          transition:background .2s, transform .2s;
        }
        .hub-bt-stat:hover { background:rgba(212,160,23,.07); border-color:rgba(212,160,23,.2); transform:translateY(-2px); }
        .hub-bt-stat-val { font-size:22px; font-weight:900; color:#d4a017; letter-spacing:-.02em; }
        .hub-bt-stat-lbl { font-size:9.5px; font-weight:700; color:rgba(255,255,255,.38); letter-spacing:.06em; text-transform:uppercase; }
      `}</style>

      <div style={{
        width:'100%',
        display:'flex', flexDirection:'column',
        background:'linear-gradient(160deg, rgba(14,17,26,.95) 0%, rgba(8,10,16,.88) 100%)',
        backdropFilter:'blur(36px) saturate(1.6)',
        WebkitBackdropFilter:'blur(36px) saturate(1.6)',
        border:'1px solid rgba(255,255,255,.14)',
        borderTop:'1px solid rgba(255,255,255,.22)',
        borderRadius:22, overflow:'hidden',
        animation:'hubIn .5s .1s cubic-bezier(.22,1,.36,1) both',
        boxShadow:'0 40px 100px rgba(0,0,0,.7), 0 0 90px rgba(191,164,106,.10), 0 0 0 1px rgba(255,255,255,.05) inset, 0 1px 0 rgba(212,176,110,.18) inset',
        // Hauteur selon le contenu (pas de vide), plafonnée à la hauteur écran →
        // scrolle seulement si le contenu dépasse. (Un height fixe laissait un grand
        // vide quand le vocal/top sont vides.)
        maxHeight:'calc(100vh - 120px)',
      }}>

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div style={{ padding:'16px 18px 0', flexShrink:0, borderBottom:'1px solid rgba(255,255,255,.07)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
            <div style={{
              width:9, height:9, borderRadius:'50%', flexShrink:0,
              background:'#2ECC71',
              boxShadow:'0 0 0 2px rgba(46,204,113,.25), 0 0 12px rgba(46,204,113,.6)',
              animation:'dotBeat 2.2s ease-in-out infinite',
            }} />
            <span style={{ fontSize:13, fontWeight:850, color:'rgba(255,255,255,.9)', letterSpacing:'.04em' }}>
              Hub Communautaire
            </span>
            <span style={{ marginLeft:'auto', fontSize:8.5, fontWeight:700, color:'rgba(46,204,113,.8)', letterSpacing:'.09em', textTransform:'uppercase', background:'rgba(46,204,113,.1)', border:'1px solid rgba(46,204,113,.25)', borderRadius:20, padding:'2px 9px', flexShrink:0 }}>
              LIVE
            </span>
          </div>

          {/* Next event banner */}
          {nextEvent && (
            <div style={{
              display:'flex', alignItems:'center', gap:10, padding:'8px 12px', marginBottom:10,
              background:`linear-gradient(90deg, ${nextEvent.color}10, transparent)`,
              border:`1px solid ${nextEvent.color}28`, borderLeft:`3px solid ${nextEvent.color}`,
              borderRadius:10, animation:'btPulse 3s ease-in-out infinite',
            }}>
              <span style={{ fontSize:16 }}>{nextEvent.icon}</span>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:11.5, fontWeight:700, color:'rgba(255,255,255,.9)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{nextEvent.title}</div>
              </div>
              <span style={{ fontSize:10, fontWeight:700, color:nextEvent.color, flexShrink:0, whiteSpace:'nowrap' }}>
                {(() => {
                  const diff = new Date(nextEvent.date) - Date.now()
                  if (diff <= 0) return 'En cours !'
                  const d = Math.floor(diff / 86400000)
                  const h = Math.floor((diff % 86400000) / 3600000)
                  if (d > 0) return `dans ${d}j ${h}h`
                  return `dans ${h}h`
                })()}
              </span>
            </div>
          )}

          {/* Tab bar */}
          <div style={{ display:'flex', gap:0 }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`hub-tab-btn${tab === t.id ? ' active' : ''}${t.id === 'blind-test' ? ' bt-tab' : ''}`}
              >
                <span style={{ fontSize:13 }}>{t.icon}</span>
                <span>{t.label}</span>
                {t.id === 'blind-test' && (
                  <span style={{ width:5, height:5, borderRadius:'50%', background:'#d4a017', boxShadow:'0 0 6px #d4a017', animation:'dotBeat 2s ease-in-out infinite' }} />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── Tab content ───────────────────────────────────────────────────── */}
        <div style={{ flex:1, overflowY:'auto', scrollbarWidth:'thin', scrollbarColor:'rgba(255,255,255,.08) transparent' }}>

          {/* ── En direct ── */}
          {tab === 'live' && (
            <div style={{ animation:'hubIn .2s ease-out both' }}>
              <VoiceLiveBlock voice={voice} navigate={navigate} />
              <div style={{ height:1, background:'rgba(255,255,255,.06)', margin:'6px 18px 2px' }} />
              <SpotlightBlock member={rankedBoard[0]} navigate={navigate} />
              <PodiumBlock board={rankedBoard} newMembers={newMembers} navigate={navigate} />
              {nextEvent && <CountdownBig event={nextEvent} />}
            </div>
          )}

          {/* ── Calendrier ── */}
          {tab === 'calendrier' && (
            <div style={{ padding:'16px 18px', animation:'hubIn .2s ease-out both' }}>
              <MiniCalendar events={EVENTS} />
              {upcoming.length > 0 && (
                <div style={{ marginTop:20 }}>
                  <div style={{ fontSize:9, fontWeight:800, color:'rgba(255,255,255,.38)', letterSpacing:'.14em', marginBottom:10 }}>
                    PROCHAINS ÉVÉNEMENTS
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {upcoming.map(ev => <EventCard key={ev.id} event={ev} />)}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Programme ── */}
          {tab === 'programme' && (
            <div style={{ animation:'hubIn .2s ease-out both' }}>
              <div style={{ padding:'14px 18px 8px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid rgba(255,255,255,.05)' }}>
                <span style={{ fontSize:9, fontWeight:800, color:'rgba(255,255,255,.4)', letterSpacing:'.14em' }}>PROGRAMME SEMAINE</span>
                <span style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,.35)', background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)', borderRadius:6, padding:'2px 8px' }}>22h30 / soir</span>
              </div>
              <div style={{ padding:'8px 0' }}>
                {SCHEDULE.map((d, i) => {
                  const isToday   = i === TODAY_IDX
                  const rankColor = RANK_COLORS[d.rank] || '#aaa'
                  return (
                    <div key={d.day}
                      className={`hub-schedule-row${isToday ? ' today-row' : ''}`}
                    >
                      {/* Day indicator */}
                      <div style={{ width:36, flexShrink:0, display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
                        <div style={{
                          width:32, height:32, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center',
                          background: isToday ? 'rgba(212,160,23,.15)' : 'rgba(255,255,255,.04)',
                          border: isToday ? '1px solid rgba(212,160,23,.4)' : '1px solid rgba(255,255,255,.07)',
                          fontSize:10, fontWeight:800,
                          color: isToday ? '#d4a017' : 'rgba(255,255,255,.35)',
                        }}>{d.day}</div>
                      </div>

                      {/* Timeline line */}
                      <div style={{ flexShrink:0, display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
                        <div style={{ width:8, height:8, borderRadius:'50%', background: isToday ? '#d4a017' : 'rgba(255,255,255,.15)', boxShadow: isToday ? '0 0 10px rgba(212,160,23,.6)' : 'none', flexShrink:0 }} />
                        {i < SCHEDULE.length - 1 && <div style={{ width:1, height:24, background:'rgba(255,255,255,.08)' }} />}
                      </div>

                      {/* Content */}
                      <div style={{ flex:1, minWidth:0, paddingBottom:i < SCHEDULE.length - 1 ? 12 : 0, marginTop:-2 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:7, flexWrap:'wrap' }}>
                          <span style={{ fontSize:12.5, fontWeight:700, color: isToday ? '#fff' : 'rgba(255,255,255,.75)' }}>{d.name}</span>
                          {d.tag && (
                            <span style={{ fontSize:7.5, fontWeight:800, letterSpacing:'.06em', color:d.tagColor, background:`${d.tagColor}20`, borderRadius:5, padding:'2px 6px', border:`1px solid ${d.tagColor}40`, whiteSpace:'nowrap' }}>
                              {d.tag}
                            </span>
                          )}
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:2 }}>
                          <span style={{ fontSize:9.5, color:rankColor, fontWeight:700 }}>{d.rank}</span>
                          <span style={{ fontSize:9, color:'rgba(255,255,255,.25)', fontWeight:600 }}>{d.time}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Blind Test ── */}
          {tab === 'blind-test' && (
            <div style={{ padding:'20px 18px', animation:'hubIn .2s ease-out both' }}>

              {/* Header */}
              <div style={{ marginBottom:16 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                  <div style={{
                    width:40, height:40, borderRadius:10, flexShrink:0,
                    background:'linear-gradient(135deg, rgba(212,160,23,.2), rgba(212,160,23,.06))',
                    border:'1px solid rgba(212,160,23,.35)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:20, boxShadow:'0 0 20px rgba(212,160,23,.2)',
                  }}>🎵</div>
                  <div>
                    <div style={{ fontSize:16, fontWeight:900, color:'#fff', letterSpacing:'-.01em' }}>Blind Test Anime</div>
                    <div style={{ fontSize:10.5, color:'rgba(255,255,255,.45)', marginTop:2 }}>Reconnais les openings les plus cultes</div>
                  </div>
                  <span style={{
                    marginLeft:'auto', flexShrink:0,
                    fontSize:8, fontWeight:800, letterSpacing:'.1em', color:'#d4a017',
                    background:'rgba(212,160,23,.12)', border:'1px solid rgba(212,160,23,.3)',
                    borderRadius:999, padding:'3px 10px', textTransform:'uppercase',
                    animation:'btPulse 2.5s ease-in-out infinite',
                  }}>NOUVEAU</span>
                </div>
                <p style={{ fontSize:11.5, color:'rgba(255,255,255,.5)', lineHeight:1.7, margin:0 }}>
                  Tokyo Ghoul, One Piece, AOT, Black Clover et plus encore. Écoute l'intro et donne la réponse en moins de 30s.
                </p>
              </div>

              {/* Equalizer visual */}
              <div style={{
                padding:'14px 16px 10px',
                background:'linear-gradient(135deg, rgba(212,160,23,.07), rgba(212,160,23,.02))',
                border:'1px solid rgba(212,160,23,.18)',
                borderRadius:14,
                marginBottom:16,
                position:'relative', overflow:'hidden',
              }}>
                <div style={{
                  position:'absolute', top:0, right:0, width:80, height:80,
                  background:'radial-gradient(circle, rgba(212,160,23,.12), transparent 70%)',
                  pointerEvents:'none',
                }} />
                <div style={{ fontSize:9.5, fontWeight:800, color:'rgba(212,160,23,.55)', letterSpacing:'.14em', marginBottom:10, textTransform:'uppercase' }}>
                  ♪ LECTURE EN COURS
                </div>
                <Equalizer />
                <div style={{ fontSize:10, color:'rgba(255,255,255,.3)', marginTop:8, textAlign:'center', fontStyle:'italic' }}>
                  Tu reconnaîs cette musique ?
                </div>
              </div>

              {/* Stats */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:16 }}>
                {BLIND_TEST_STATS.map(s => (
                  <div key={s.label} className="hub-bt-stat">
                    <span style={{ fontSize:18 }}>{s.icon}</span>
                    <span className="hub-bt-stat-val">{s.value}</span>
                    <span className="hub-bt-stat-lbl">{s.label}</span>
                  </div>
                ))}
              </div>

              {/* CTA buttons */}
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                <button className="hub-bt-cta primary" onClick={() => navigate('/blind-test')}>
                  🎮 Participer maintenant
                </button>
                <button className="hub-bt-cta secondary" onClick={() => navigate('/blind-test/leaderboard')}>
                  🏆 Voir le classement
                </button>
              </div>

              {/* Track list preview */}
              <div style={{ marginTop:16, paddingTop:14, borderTop:'1px solid rgba(255,255,255,.06)' }}>
                <div style={{ fontSize:9, fontWeight:800, color:'rgba(255,255,255,.3)', letterSpacing:'.14em', marginBottom:10 }}>
                  ANIMES DISPONIBLES
                </div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                  {[
                    { name:'Tokyo Ghoul', c:'#8b1a1a' },
                    { name:'One Piece',   c:'#d4a017' },
                    { name:'Naruto',      c:'#f59e0b' },
                    { name:'AOT',         c:'#94a3b8' },
                    { name:'Black Clover',c:'#4ade80' },
                    { name:'SAO',         c:'#60a5fa' },
                    { name:'Code Geass',  c:'#a29bfe' },
                    { name:'Vivy',        c:'#00d4ff' },
                    { name:'TPN',         c:'#9b59b6' },
                    { name:'+ nouveaux',  c:'rgba(255,255,255,.4)' },
                  ].map(a => (
                    <span key={a.name} style={{
                      fontSize:10, fontWeight:700, padding:'3px 10px', borderRadius:999,
                      background:`color-mix(in srgb, ${a.c} 12%, transparent)`,
                      border:`1px solid color-mix(in srgb, ${a.c} 30%, transparent)`,
                      color:`color-mix(in srgb, ${a.c} 80%, #fff)`,
                    }}>{a.name}</span>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* ── Annonces ── */}
          {tab === 'annonces' && (
            <div style={{ animation:'hubIn .2s ease-out both' }}>
              <div style={{ padding:'10px 16px 8px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid rgba(255,255,255,.05)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="#5865f2"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.030z"/></svg>
                  <span style={{ fontSize:8.5, fontWeight:700, color:'rgba(255,255,255,.3)', letterSpacing:'.12em' }}>ANNONCES DISCORD</span>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  {lastRefresh && <span style={{ fontSize:8.5, color:'rgba(255,255,255,.35)' }}>{lastRefresh.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' })}</span>}
                  <button onClick={loadDiscord} title="Actualiser" style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,.3)', fontSize:14, padding:'0 2px', lineHeight:1, transition:'color .15s' }}
                    onMouseEnter={e => e.currentTarget.style.color='#fff'}
                    onMouseLeave={e => e.currentTarget.style.color='rgba(255,255,255,.3)'}
                  >↻</button>
                </div>
              </div>
              {discordLoading && <div style={{ padding:'24px', textAlign:'center', color:'rgba(255,255,255,.25)', fontSize:11 }}>Chargement…</div>}
              {!discordLoading && discordError && (
                <div style={{ padding:'16px', textAlign:'center' }}>
                  <p style={{ color:'rgba(255,100,100,.7)', fontSize:11, margin:'0 0 10px' }}>{discordError}</p>
                  <button onClick={loadDiscord} style={{ fontSize:11, color:'#5865f2', background:'none', border:'1px solid rgba(88,101,242,.4)', borderRadius:6, padding:'4px 12px', cursor:'pointer' }}>Réessayer</button>
                </div>
              )}
              {!discordLoading && !discordError && msgs.length === 0 && <div style={{ padding:'24px', textAlign:'center', color:'rgba(255,255,255,.25)', fontSize:11 }}>Aucune annonce récente</div>}
              {!discordLoading && !discordError && msgs.map(m => <DiscordMessage key={m.id} msg={m} />)}
            </div>
          )}

        </div>

        {/* ── Footer ────────────────────────────────────────────────────────── */}
        <div style={{
          padding:'12px 18px', flexShrink:0,
          borderTop:'1px solid rgba(255,255,255,.06)',
          display:'flex', alignItems:'center', justifyContent:'space-between',
          background:'rgba(0,0,0,.2)',
        }}>
          <a href="https://discord.gg/4FgezPpnGU" target="_blank" rel="noopener noreferrer"
            className="hub-bt-cta primary" style={{ width:'auto', padding:'8px 20px', fontSize:11 }}>
            🏴‍☠️ Rejoindre le Discord
          </a>
          <button className="hub-bt-cta secondary" style={{ width:'auto', padding:'8px 18px', fontSize:11 }}
            onClick={() => navigate('/blind-test')}>
            🎵 Blind Test
          </button>
        </div>

      </div>
    </>
  )
}
