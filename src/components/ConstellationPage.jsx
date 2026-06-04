import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import { fetchCrews } from '../lib/crew/supabaseCrewQueries.js'
import { getUserCrewMembership, applyToCrew, fetchCrewById } from '../lib/crew/crewHQQueries.js'
import { supabase } from '../lib/supabase.js'

// ── Design tokens (identiques à l'Encyclopédie) ───────────────────────────────
const ACCENT = '#e0524a'
const VIOLET = '#a29bfe'
const GOLD   = '#fdcb6e'

// ── Mock data ─────────────────────────────────────────────────────────────────
const MOCK_CREWS = [
  { id:'m1', name:'Les Dragons Rouges',          tag:'DR',  emoji:'🐉', color:'#e0524a', description:"Équipage légendaire visant le sommet des classements. Ici seuls les meilleurs survivent.", captain_name:'Freydiss',   member_count:24, total_bounty:4200000, level:12, styles:['tryhard','vocal'],  recruiting:true,  wins:89  },
  { id:'m2', name:'Les Ombres du Nouveau Monde', tag:'ONM', emoji:'🌑', color:'#8b5cf6', description:"Dans l'ombre des Grands, nous préparons notre ascension silencieuse.",                    captain_name:'Ayzeni',     member_count:18, total_bounty:2800000, level:9,  styles:['quiz','rp'],        recruiting:true,  wins:52  },
  { id:'m3', name:'Les Rois des Mers',           tag:'RM',  emoji:'🌊', color:'#0984e3', description:"Maîtres des eaux profondes. Chaque membre est un Nakama pour la vie.",                   captain_name:'Océan',      member_count:31, total_bounty:5100000, level:15, styles:['chill','vocal'],    recruiting:false, wins:120 },
  { id:'m4', name:'Les Chasseurs de Primes',     tag:'CDP', emoji:'🎯', color:'#fdcb6e', description:"La prime, notre obsession. On chasse, on monte, on domine.",                              captain_name:'BountyKing', member_count:12, total_bounty:1900000, level:7,  styles:['tryhard'],          recruiting:true,  wins:34  },
  { id:'m5', name:"Les Héritiers du D.",         tag:'HD',  emoji:'⚡', color:'#06b6d4', description:"Porteurs de la volonté du D. Notre destinée est gravée dans l'histoire.",                captain_name:'RogerFan',   member_count:20, total_bounty:3400000, level:11, styles:['rp','quiz'],        recruiting:false, wins:78  },
  { id:'m6', name:'La Marine Noire',             tag:'MN',  emoji:'⚓', color:'#6c5ce7', description:"Ordre et discipline. Nous imposons notre loi sans compromis.",                            captain_name:'Akainu_2',   member_count:15, total_bounty:2200000, level:8,  styles:['tryhard','vocal'],  recruiting:true,  wins:61  },
  { id:'m7', name:'Les Loups de Grand Line',     tag:'LGL', emoji:'🐺', color:'#10b981', description:"Survivants des pires tempêtes. Grand Line est notre terrain de chasse.",                  captain_name:'WolfLeader', member_count:22, total_bounty:3700000, level:10, styles:['event','chill'],    recruiting:true,  wins:95  },
  { id:'m8', name:"Les Fantômes d'Onyx",         tag:'FO',  emoji:'💀', color:'#f97316', description:"Nous hantions les classements depuis l'ombre. L'heure est venue de sortir.",              captain_name:'OnxyCpt',    member_count:8,  total_bounty:1100000, level:5,  styles:['quiz','rp'],        recruiting:true,  wins:18  },
]

const STYLE_FILTERS = ['Tous', 'Recrute', 'Tryhard', 'Chill', 'Quiz', 'Vocal', 'RP', 'Événement']
const SORT_OPTIONS  = [
  { value:'bounty',  label:'Prime totale' },
  { value:'members', label:'Membres'      },
  { value:'level',   label:'Niveau'       },
  { value:'wins',    label:'Victoires'    },
]
const ROADMAP = [
  { emoji:'⚔️', title:"Missions d'équipage", desc:"Des quêtes communes pour gagner des primes et progresser ensemble.",       soon:false },
  { emoji:'💰', title:'Coffre commun',        desc:"Gérez un trésor partagé entre les membres actifs.",                        soon:true  },
  { emoji:'🤝', title:'Alliances',            desc:"Forgez des alliances stratégiques avec d'autres équipages.",               soon:true  },
  { emoji:'⚡', title:'Rivalités',            desc:"Déclarez vos rivaux et mesurez-vous à eux en compétition.",                soon:true  },
  { emoji:'🏆', title:'Saisons',              desc:"Classements saisonniers avec récompenses exclusives.",                     soon:true  },
  { emoji:'🎖️', title:"Trophées d'équipage", desc:"Débloquez des distinctions visibles sur votre profil QG.",                 soon:true  },
]

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtB(n) {
  if (!n) return '0'
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace('.0', '') + 'M'
  if (n >= 1000)    return Math.round(n / 1000) + 'K'
  return String(n)
}

function useCountUp(target, dur = 1400, delay = 350) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    let raf
    const t = setTimeout(() => {
      const s = performance.now()
      const tick = now => {
        const p = Math.min((now - s) / dur, 1)
        setVal(Math.round((1 - Math.pow(1 - p, 3)) * target))
        if (p < 1) raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    }, delay)
    return () => { clearTimeout(t); cancelAnimationFrame(raf) }
  }, [target, dur, delay])
  return val
}

// ── StatPill — copie exacte Encyclopédie ────────────────────────────────────
function StatPill({ value, label, color = ACCENT }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, minWidth:90 }}>
      <span style={{ fontFamily:'var(--display)', fontWeight:900, fontSize:40, lineHeight:1, color }}>{value}</span>
      <span style={{ fontSize:11, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.45)' }}>{label}</span>
    </div>
  )
}

// ── SectionHeading — même structure que l'Encyclopédie ─────────────────────
function SectionHeading({ eyebrow, title, subtitle, color = ACCENT }) {
  return (
    <div style={{ textAlign:'center', marginBottom:48 }}>
      <div style={{ fontSize:10, letterSpacing:'0.3em', fontWeight:800, color, marginBottom:14, textTransform:'uppercase' }}>{eyebrow}</div>
      <h2 style={{ fontFamily:'var(--display)', fontWeight:900, fontSize:'clamp(32px,6vw,58px)', color:'#fff', margin:'0 0 12px', lineHeight:1 }}>{title}</h2>
      {subtitle && <p style={{ fontSize:14, color:'rgba(255,255,255,0.45)', maxWidth:480, margin:'0 auto', lineHeight:1.7 }}>{subtitle}</p>}
    </div>
  )
}

// ── CrewCard — adapté de FruitCard Encyclopédie ──────────────────────────────
function CrewCard({ crew, index, onApply, userCrewId }) {
  const [hov, setHov] = useState(false)
  const navigate = useNavigate()
  const isMock = String(crew.id).startsWith('m')
  const c = crew.color || ACCENT

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        position:'relative',
        background:`linear-gradient(145deg, ${c}28 0%, ${c}0e 50%, rgba(14,14,16,0.90) 100%)`,
        border:`1px solid ${hov ? c+'60' : c+'28'}`,
        borderRadius:16,
        padding:'20px 20px 16px',
        transition:'all 0.22s ease',
        boxShadow: hov ? `0 8px 32px ${c}28` : `0 2px 10px ${c}0a`,
        animation:`fadeUp 0.45s ${index * 0.05}s ease-out both`,
        display:'flex', flexDirection:'column', gap:12,
      }}
    >
      {/* Top accent stripe */}
      <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:`linear-gradient(90deg, ${c}, ${c}33)`, borderRadius:'16px 16px 0 0' }} />

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
        <div style={{ fontSize:34, filter:`drop-shadow(0 0 10px ${c}70)`, lineHeight:1, flexShrink:0, marginTop:3 }}>{crew.emoji}</div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontWeight:800, fontSize:15, color:'#fff', marginBottom:6, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', lineHeight:1.2 }}>{crew.name}</div>
          <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
            {crew.styles?.map(s => (
              <span key={s} style={{ fontSize:9.5, fontWeight:700, padding:'2px 7px', borderRadius:20, background:`${c}18`, color:c, border:`1px solid ${c}35`, letterSpacing:'0.05em', textTransform:'uppercase' }}>{s}</span>
            ))}
            {crew.recruiting && (
              <span style={{ fontSize:9.5, fontWeight:800, padding:'2px 7px', borderRadius:20, background:'rgba(52,211,153,0.14)', color:'#34d399', border:'1px solid rgba(52,211,153,0.32)', letterSpacing:'0.05em', textTransform:'uppercase' }}>Recrute</span>
            )}
          </div>
        </div>
        <div style={{ flexShrink:0, fontFamily:'var(--display)', fontSize:11, fontWeight:800, color:c }}>Niv.{crew.level||1}</div>
      </div>

      {/* Description */}
      <p style={{ fontSize:12, color:'rgba(255,255,255,0.58)', lineHeight:1.65, margin:0 }}>{crew.description}</p>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, padding:'10px 0', borderTop:`1px solid ${c}18`, borderBottom:`1px solid ${c}18` }}>
        {[
          { label:'Prime',     value:`${fmtB(crew.total_bounty)} B`, color:GOLD },
          { label:'Membres',   value: crew.member_count || 0,         color:'rgba(255,255,255,0.8)' },
          { label:'Victoires', value: crew.wins || 0,                  color:ACCENT },
        ].map(s => (
          <div key={s.label} style={{ textAlign:'center' }}>
            <div style={{ fontSize:14, fontWeight:800, color:s.color, lineHeight:1 }}>{s.value}</div>
            <div style={{ fontSize:9.5, color:'rgba(255,255,255,0.32)', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', marginTop:3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span style={{ fontSize:11, color:'rgba(255,255,255,0.38)' }}>⚓ <span style={{ color:'rgba(255,255,255,0.72)', fontWeight:600 }}>{crew.captain_name || '—'}</span></span>
        <div style={{ display:'flex', gap:7 }}>
          {crew.recruiting && !userCrewId && !isMock && (
            <button onClick={() => onApply(crew)} style={{ fontSize:11, padding:'5px 11px', borderRadius:8, background:`${c}18`, border:`1px solid ${c}40`, color:c, fontWeight:700, cursor:'pointer', transition:'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background=`${c}30`}
              onMouseLeave={e => e.currentTarget.style.background=`${c}18`}
            >Candidater</button>
          )}
          {!isMock && (
            <button onClick={() => navigate(`/equipage/${crew.id}`)} style={{ fontSize:11, padding:'5px 11px', borderRadius:8, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.10)', color:'rgba(255,255,255,0.65)', fontWeight:700, cursor:'pointer', transition:'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,0.12)'; e.currentTarget.style.color='#fff' }}
              onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.05)'; e.currentTarget.style.color='rgba(255,255,255,0.65)' }}
            >Voir QG →</button>
          )}
          {isMock && <span style={{ fontSize:10, color:`${c}88`, fontWeight:600 }}>Démo ↺</span>}
        </div>
      </div>
    </div>
  )
}

// ── TopCrewCard ───────────────────────────────────────────────────────────────
function TopCrewCard({ crew, rank, index }) {
  const [hov, setHov] = useState(false)
  const navigate = useNavigate()
  const isMock = String(crew.id).startsWith('m')
  const c = crew.color || ACCENT
  const rc = rank === 1 ? GOLD : rank === 2 ? '#c0c0c0' : '#cd7f32'

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background:`linear-gradient(135deg, ${c}1c 0%, rgba(14,14,16,0.92) 100%)`,
        border:`1px solid ${hov ? c+'55' : c+'28'}`,
        borderRadius:18,
        padding: rank === 1 ? '28px 24px' : '22px 20px',
        transition:'all 0.22s ease',
        boxShadow: hov ? `0 12px 40px ${c}25` : rank === 1 ? `0 4px 24px ${c}12` : 'none',
        animation:`fadeUp 0.5s ${index*0.1}s ease-out both`,
        position:'relative',
        cursor: isMock ? 'default' : 'pointer',
      }}
      onClick={() => !isMock && navigate(`/equipage/${crew.id}`)}
    >
      <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:`linear-gradient(90deg, ${c}, transparent)`, borderRadius:'18px 18px 0 0' }} />
      <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:16 }}>
        <div style={{ fontSize: rank===1 ? 38 : 30, filter:`drop-shadow(0 0 12px ${c}60)`, lineHeight:1, flexShrink:0 }}>{crew.emoji}</div>
        <div style={{ flex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
            <span style={{ fontFamily:'var(--display)', fontSize: rank===1?13:11, fontWeight:900, color:rc }}>#{rank}</span>
            <span style={{ fontWeight:800, fontSize: rank===1?17:14, color:'#fff' }}>{crew.name}</span>
          </div>
          <div style={{ fontSize:11, color:`${c}cc`, fontWeight:600 }}>Cap. {crew.captain_name || '—'}</div>
        </div>
      </div>
      <div style={{ display:'flex', gap:20 }}>
        <div>
          <div style={{ fontFamily:'var(--display)', fontSize: rank===1?22:18, fontWeight:900, color:GOLD, lineHeight:1 }}>{fmtB(crew.total_bounty)} B</div>
          <div style={{ fontSize:9.5, color:'rgba(255,255,255,0.32)', textTransform:'uppercase', letterSpacing:'0.08em', marginTop:3 }}>Prime totale</div>
        </div>
        <div>
          <div style={{ fontFamily:'var(--display)', fontSize: rank===1?22:18, fontWeight:900, color:'rgba(255,255,255,0.78)', lineHeight:1 }}>{crew.member_count||0}</div>
          <div style={{ fontSize:9.5, color:'rgba(255,255,255,0.32)', textTransform:'uppercase', letterSpacing:'0.08em', marginTop:3 }}>Membres</div>
        </div>
      </div>
    </div>
  )
}

// ── MyCrewPanel ───────────────────────────────────────────────────────────────
function MyCrewPanel({ membership, crewData, isAuthenticated, onCreate, onFind }) {
  const navigate = useNavigate()
  if (!isAuthenticated) return null

  if (membership && crewData) {
    const c = crewData.color || ACCENT
    return (
      <div style={{ background:`linear-gradient(145deg, ${c}16 0%, rgba(14,14,16,0.92) 100%)`, border:`1px solid ${c}30`, borderRadius:16, padding:'20px 24px', display:'flex', alignItems:'center', gap:20, flexWrap:'wrap', marginBottom:48 }}>
        <div style={{ fontSize:44, lineHeight:1 }}>{crewData.emoji||'⚓'}</div>
        <div style={{ flex:1, minWidth:180 }}>
          <div style={{ fontSize:11, color:c, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:4 }}>Mon équipage</div>
          <div style={{ fontWeight:800, fontSize:18, color:'#fff', marginBottom:4 }}>{crewData.name}</div>
          <div style={{ fontSize:12, color:'rgba(255,255,255,0.48)' }}>Rang : <span style={{ color:'rgba(255,255,255,0.78)', fontWeight:600 }}>{membership.position||'Mousse'}</span></div>
        </div>
        <button onClick={() => navigate(`/equipage/${membership.crew_id}`)} style={{ padding:'10px 22px', borderRadius:10, background:`${c}1c`, border:`1px solid ${c}50`, color:c, fontWeight:700, fontSize:13, cursor:'pointer', transition:'all 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.background=`${c}34`}
          onMouseLeave={e => e.currentTarget.style.background=`${c}1c`}
        >Voir le QG →</button>
      </div>
    )
  }

  return (
    <div style={{ background:'linear-gradient(135deg, rgba(224,82,74,0.06) 0%, rgba(14,14,16,0.9) 100%)', border:'1px solid rgba(224,82,74,0.16)', borderRadius:16, padding:'28px 32px', display:'flex', alignItems:'center', gap:24, flexWrap:'wrap', marginBottom:48 }}>
      <div style={{ fontSize:44, lineHeight:1, opacity:0.55 }}>🏴‍☠️</div>
      <div style={{ flex:1, minWidth:180 }}>
        <div style={{ fontWeight:800, fontSize:16, color:'#fff', marginBottom:8 }}>Aucun pavillon ne flotte encore sous ton nom</div>
        <p style={{ fontSize:13, color:'rgba(255,255,255,0.42)', margin:0, lineHeight:1.6 }}>Crée ton propre équipage ou rejoins une flotte pour commencer ta conquête.</p>
      </div>
      <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
        <button onClick={onCreate} style={{ padding:'10px 20px', borderRadius:10, fontWeight:700, fontSize:13, cursor:'pointer', background:'rgba(224,82,74,0.14)', border:'1px solid rgba(224,82,74,0.38)', color:ACCENT, transition:'all 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.background='rgba(224,82,74,0.26)'}
          onMouseLeave={e => e.currentTarget.style.background='rgba(224,82,74,0.14)'}
        >⚔️ Créer mon équipage</button>
        <button onClick={onFind} style={{ padding:'10px 20px', borderRadius:10, fontWeight:700, fontSize:13, cursor:'pointer', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.10)', color:'rgba(255,255,255,0.55)', transition:'all 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.color='#fff'; e.currentTarget.style.background='rgba(255,255,255,0.09)' }}
          onMouseLeave={e => { e.currentTarget.style.color='rgba(255,255,255,0.55)'; e.currentTarget.style.background='rgba(255,255,255,0.04)' }}
        >🔍 Trouver un équipage</button>
      </div>
    </div>
  )
}

// ── ApplyModal ────────────────────────────────────────────────────────────────
function ApplyModal({ crew, onClose, onSubmit }) {
  const [msg,       setMsg]       = useState('')
  const [specialty, setSpecialty] = useState('')
  const [loading,   setLoading]   = useState(false)
  const c = crew.color || ACCENT

  async function submit() {
    setLoading(true)
    await onSubmit({ message:msg, specialty })
    setLoading(false)
    onClose()
  }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:9200, background:'rgba(0,0,0,0.86)', backdropFilter:'blur(10px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={onClose}>
      <div style={{ width:'min(500px,100%)', background:'#0e0f11', border:`1px solid ${c}40`, borderTop:`2px solid ${c}`, borderRadius:16, padding:28 }} onClick={e => e.stopPropagation()}>
        <div style={{ fontFamily:'var(--display)', fontSize:22, color:'#fff', marginBottom:4 }}>{crew.emoji} Candidater à {crew.name}</div>
        <div style={{ fontSize:12, color:'rgba(255,255,255,0.38)', marginBottom:20 }}>Présente-toi — le capitaine examinera ta candidature.</div>
        <textarea placeholder="Message de candidature..." value={msg} onChange={e => setMsg(e.target.value)}
          style={{ width:'100%', minHeight:90, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, color:'#fff', fontSize:13, padding:'10px 12px', boxSizing:'border-box', resize:'vertical', outline:'none', fontFamily:'var(--body)', marginBottom:12 }} />
        <input placeholder="Spécialité (quiz, vocal…)" value={specialty} onChange={e => setSpecialty(e.target.value)}
          style={{ width:'100%', height:42, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, color:'#fff', fontSize:13, padding:'0 14px', boxSizing:'border-box', outline:'none', fontFamily:'var(--body)', marginBottom:20 }} />
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
          <button onClick={onClose} style={{ padding:'9px 18px', borderRadius:9, border:'1px solid rgba(255,255,255,0.1)', background:'none', color:'rgba(255,255,255,0.45)', cursor:'pointer', fontWeight:700, fontSize:13 }}>Annuler</button>
          <button onClick={submit} disabled={loading || !msg.trim()} style={{ padding:'9px 20px', borderRadius:9, border:`1px solid ${c}50`, background:`${c}1c`, color:c, cursor:'pointer', fontWeight:700, fontSize:13, opacity: loading || !msg.trim() ? 0.5 : 1 }}>
            {loading ? 'Envoi…' : 'Candidater'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── CreateCrewModal ───────────────────────────────────────────────────────────
function CreateCrewModal({ onClose, onCreate }) {
  const [name,       setName]       = useState('')
  const [tag,        setTag]        = useState('')
  const [desc,       setDesc]       = useState('')
  const [emoji,      setEmoji]      = useState('⚓')
  const [color,      setColor]      = useState(ACCENT)
  const [recruiting, setRecruiting] = useState(true)
  const [loading,    setLoading]    = useState(false)

  const EMOJIS = ['⚓','🐉','🌑','🔥','⚡','🌊','🎯','💀','🐺','⚔️','🌸','💥','🔮','🦅','🛡️','🌹','🦁','💎']
  const COLORS = [ACCENT,'#8b5cf6','#0984e3',GOLD,'#06b6d4','#10b981','#f97316','#ec4899','#6c5ce7','#d4a017']

  async function submit() {
    if (!name.trim()) return
    setLoading(true)
    await onCreate({ name:name.trim(), tag:tag.trim() || name.trim().slice(0,3).toUpperCase(), description:desc, emoji, color, recruiting })
    setLoading(false)
  }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:9200, background:'rgba(0,0,0,0.9)', backdropFilter:'blur(10px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20, overflowY:'auto' }} onClick={onClose}>
      <div style={{ width:'min(520px,100%)', background:'#0e0f11', border:'1px solid rgba(224,82,74,0.28)', borderTop:'2px solid #e0524a', borderRadius:16, padding:28, margin:'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ fontFamily:'var(--display)', fontSize:22, color:'#fff', marginBottom:4 }}>⚓ Lever son pavillon</div>
        <div style={{ fontSize:12, color:'rgba(255,255,255,0.38)', marginBottom:24 }}>Crée ton équipage et impose ton nom dans le Grand Line.</div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
          <div>
            <label style={{ fontSize:11, color:'rgba(255,255,255,0.42)', fontWeight:700, letterSpacing:'0.08em', display:'block', marginBottom:6 }}>NOM</label>
            <input value={name} onChange={e => { setName(e.target.value); if (!tag) setTag(e.target.value.slice(0,3).toUpperCase()) }}
              placeholder="Les Dragons Rouges…"
              style={{ width:'100%', height:42, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:9, color:'#fff', fontSize:13, padding:'0 12px', boxSizing:'border-box', outline:'none', fontFamily:'var(--body)' }} />
          </div>
          <div>
            <label style={{ fontSize:11, color:'rgba(255,255,255,0.42)', fontWeight:700, letterSpacing:'0.08em', display:'block', marginBottom:6 }}>TAG (2-4)</label>
            <input value={tag} onChange={e => setTag(e.target.value.toUpperCase().slice(0,4))}
              placeholder="DR"
              style={{ width:'100%', height:42, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:9, color:'#fff', fontSize:13, padding:'0 12px', boxSizing:'border-box', outline:'none', fontFamily:'var(--body)' }} />
          </div>
        </div>

        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:11, color:'rgba(255,255,255,0.42)', fontWeight:700, letterSpacing:'0.08em', display:'block', marginBottom:6 }}>DESCRIPTION</label>
          <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Présente ton équipage en quelques mots…"
            style={{ width:'100%', minHeight:66, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:9, color:'#fff', fontSize:13, padding:'10px 12px', boxSizing:'border-box', resize:'none', outline:'none', fontFamily:'var(--body)' }} />
        </div>

        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:11, color:'rgba(255,255,255,0.42)', fontWeight:700, letterSpacing:'0.08em', display:'block', marginBottom:8 }}>EMBLÈME</label>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {EMOJIS.map(e => (
              <button key={e} onClick={() => setEmoji(e)} style={{ width:34, height:34, borderRadius:8, fontSize:17, background: emoji===e ? 'rgba(224,82,74,0.18)' : 'rgba(255,255,255,0.05)', border:`1px solid ${emoji===e ? 'rgba(224,82,74,0.5)' : 'rgba(255,255,255,0.1)'}`, cursor:'pointer', transition:'all 0.15s' }}>{e}</button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom:16 }}>
          <label style={{ fontSize:11, color:'rgba(255,255,255,0.42)', fontWeight:700, letterSpacing:'0.08em', display:'block', marginBottom:8 }}>COULEUR</label>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {COLORS.map(col => (
              <button key={col} onClick={() => setColor(col)} style={{ width:28, height:28, borderRadius:'50%', background:col, cursor:'pointer', border: color===col ? '3px solid #fff' : '2px solid transparent', transition:'all 0.15s', outline:'none' }} />
            ))}
          </div>
        </div>

        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
          <span style={{ fontSize:13, color:'rgba(255,255,255,0.55)' }}>Recrutement ouvert</span>
          <button onClick={() => setRecruiting(r => !r)} style={{ width:44, height:24, borderRadius:12, cursor:'pointer', background: recruiting ? 'rgba(52,211,153,0.28)' : 'rgba(255,255,255,0.08)', border:`1px solid ${recruiting ? 'rgba(52,211,153,0.45)' : 'rgba(255,255,255,0.12)'}`, position:'relative', transition:'all 0.2s', padding:0 }}>
            <div style={{ position:'absolute', top:3, left: recruiting ? 22 : 3, width:16, height:16, borderRadius:'50%', background: recruiting ? '#34d399' : 'rgba(255,255,255,0.35)', transition:'left 0.2s' }} />
          </button>
        </div>

        <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
          <button onClick={onClose} style={{ padding:'9px 18px', borderRadius:9, border:'1px solid rgba(255,255,255,0.1)', background:'none', color:'rgba(255,255,255,0.45)', cursor:'pointer', fontWeight:700, fontSize:13 }}>Annuler</button>
          <button onClick={submit} disabled={loading || !name.trim()} style={{ padding:'9px 22px', borderRadius:9, border:'1px solid rgba(224,82,74,0.4)', background:'rgba(224,82,74,0.15)', color:ACCENT, cursor:'pointer', fontWeight:700, fontSize:13, opacity: loading || !name.trim() ? 0.5 : 1 }}>
            {loading ? 'Création…' : "⚓ Créer l'équipage"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── MusicBar ──────────────────────────────────────────────────────────────────
function MusicBar({ videoRef }) {
  const [on, setOn] = useState(false)
  const [vol, setVol] = useState(0.35)

  function toggle() {
    const v = videoRef.current
    if (!v) return
    if (!on) {
      v.muted = false
      v.volume = vol
      setOn(true)
    } else {
      v.muted = true
      setOn(false)
    }
  }

  function handleVol(e) {
    const value = parseFloat(e.target.value)
    setVol(value)
    const v = videoRef.current
    if (!v) return
    v.volume = value
    if (value === 0) { v.muted = true; setOn(false) }
    else if (on) v.muted = false
  }

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9000,
      display: 'flex', alignItems: 'center', gap: 10,
      background: 'rgba(8,9,13,0.90)',
      backdropFilter: 'blur(20px)',
      border: `1px solid ${on ? 'rgba(224,82,74,0.30)' : 'rgba(255,255,255,0.07)'}`,
      borderRadius: 40, padding: '7px 14px 7px 12px',
      transition: 'border-color 0.3s, box-shadow 0.3s',
      boxShadow: on ? '0 0 24px rgba(224,82,74,0.12)' : '0 4px 20px rgba(0,0,0,0.5)',
    }}>
      <span style={{ fontSize: 14, color: on ? ACCENT : 'rgba(255,255,255,0.28)', transition: 'color 0.3s' }}>♫</span>
      <span style={{ fontSize: 11, fontWeight: 600, color: on ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.28)', transition: 'color 0.3s', whiteSpace: 'nowrap', letterSpacing: '0.03em' }}>Dear Sunrise</span>
      {on && (
        <input type="range" min="0" max="1" step="0.05" value={vol} onChange={handleVol}
          style={{ width: 60, cursor: 'pointer', accentColor: ACCENT }} />
      )}
      <button onClick={toggle}
        style={{
          width: 28, height: 28, borderRadius: '50%', border: 'none', cursor: 'pointer',
          background: on ? 'rgba(224,82,74,0.20)' : 'rgba(255,255,255,0.07)',
          color: on ? ACCENT : 'rgba(255,255,255,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 700, transition: 'all 0.2s', flexShrink: 0,
        }}
        onMouseEnter={e => { e.currentTarget.style.background = on ? 'rgba(224,82,74,0.35)' : 'rgba(255,255,255,0.14)' }}
        onMouseLeave={e => { e.currentTarget.style.background = on ? 'rgba(224,82,74,0.20)' : 'rgba(255,255,255,0.07)' }}
        title={on ? 'Couper la musique' : 'Activer la musique'}
      >
        {on ? '⏸' : '▶'}
      </button>
    </div>
  )
}

// ── Main ConstellationPage ────────────────────────────────────────────────────
export default function ConstellationPage() {
  const navigate    = useNavigate()
  const { isAuthenticated, discordId, userId } = useAuth()
  const [crews,       setCrews]       = useState([])
  const [membership,  setMembership]  = useState(null)
  const [memberCrew,  setMemberCrew]  = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [search,      setSearch]      = useState('')
  const [filter,      setFilter]      = useState('Tous')
  const [sort,        setSort]        = useState('bounty')
  const [applyTarget, setApplyTarget] = useState(null)
  const [showCreate,  setShowCreate]  = useState(false)
  const [toast,       setToast]       = useState(null)
  const [usingMock,   setUsingMock]   = useState(false)
  const searchRef = useRef(null)
  const gridRef   = useRef(null)
  const videoRef  = useRef(null)
  const uid = discordId || userId

  useEffect(() => {
    document.title = 'Équipages — Brams Community'
    return () => { document.title = 'Brams Community' }
  }, [])

  useEffect(() => {
    async function load() {
      try {
        const [data, mem] = await Promise.all([
          fetchCrews(),
          uid ? getUserCrewMembership(uid) : Promise.resolve(null),
        ])
        if (data && data.length > 0) {
          setCrews(data)
        } else {
          setCrews(MOCK_CREWS)
          setUsingMock(true)
        }
        if (mem?.crew_id) {
          setMembership(mem)
          const cd = await fetchCrewById(mem.crew_id)
          setMemberCrew(cd)
        }
      } catch {
        setCrews(MOCK_CREWS)
        setUsingMock(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [uid])

  // Realtime pour que les nouveaux équipages / mises à jour (bounty etc) apparaissent sans F5
  useEffect(() => {
    if (!supabase) return
    const ch = supabase
      .channel('crews-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crews' }, () => {
        // reload crews list live
        fetchCrews().then(data => {
          if (data && data.length > 0) setCrews(data)
        }).catch(() => {})
      })
      .subscribe()
    return () => { try { supabase.removeChannel(ch) } catch {} }
  }, [])

  // Realtime membership: si tu rejoins un équipage (ou changes), la sidebar "mon équipage" s'update sans refresh
  useEffect(() => {
    if (!supabase || !uid) return
    const ch = supabase
      .channel(`crew-membership-${uid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crew_members', filter: `user_id=eq.${uid}` }, async () => {
        try {
          const mem = await getUserCrewMembership(uid)
          setMembership(mem)
          if (mem?.crew_id) {
            const cd = await fetchCrewById(mem.crew_id)
            setMemberCrew(cd)
          } else {
            setMemberCrew(null)
          }
        } catch {}
      })
      .subscribe()
    return () => { try { supabase.removeChannel(ch) } catch {} }
  }, [uid])

  const filtered = useMemo(() => {
    let r = [...crews]
    if (filter === 'Recrute') r = r.filter(c => c.recruiting)
    else if (filter !== 'Tous') r = r.filter(c => c.styles?.includes(filter.toLowerCase()))
    if (search.trim()) {
      const q = search.toLowerCase()
      r = r.filter(c => c.name?.toLowerCase().includes(q) || c.captain_name?.toLowerCase().includes(q) || c.tag?.toLowerCase().includes(q))
    }
    r.sort((a, b) => {
      if (sort === 'bounty')  return (b.total_bounty||0) - (a.total_bounty||0)
      if (sort === 'members') return (b.member_count||0) - (a.member_count||0)
      if (sort === 'level')   return (b.level||0) - (a.level||0)
      if (sort === 'wins')    return (b.wins||0) - (a.wins||0)
      return 0
    })
    return r
  }, [crews, filter, search, sort])

  const top3 = useMemo(() => [...crews].sort((a,b) => (b.total_bounty||0)-(a.total_bounty||0)).slice(0,3), [crews])

  const nCrews     = useCountUp(crews.length,                                           1000, 300)
  const nPirates   = useCountUp(crews.reduce((s,c) => s+(c.member_count||0), 0),       1400, 400)
  const nBounty    = useCountUp(crews.reduce((s,c) => s+(c.total_bounty||0),  0),      1600, 350)
  const nRecruit   = useCountUp(crews.filter(c => c.recruiting).length,                 800, 500)

  async function handleCreate({ name, tag, description, emoji, color, recruiting }) {
    if (!isAuthenticated) { showToast('Connecte-toi pour créer un équipage.', 'error'); return }
    try {
      const { data: crew, error } = await supabase
        .from('crews')
        .insert({ name, tag, description, emoji, color, recruiting, level:1, total_bounty:0, member_count:1 })
        .select().single()
      if (error) throw error
      await supabase.from('crew_members').insert({ crew_id:crew.id, user_id:uid, position:'capitaine', contribution:0, joined_at:new Date().toISOString() })
      showToast('Équipage créé ! Bienvenue capitaine.', 'success')
      setShowCreate(false)
      navigate(`/equipage/${crew.id}`)
    } catch { showToast('Erreur lors de la création.', 'error') }
  }

  async function handleApply({ message, specialty }) {
    if (!applyTarget) return
    try {
      await applyToCrew({ crewId:applyTarget.id, userId:uid, username:'', avatarUrl:'', message, specialty, previousCrew:'', acceptsRules:true, availability:'' })
      showToast('Candidature envoyée !', 'success')
    } catch { showToast("Erreur lors de l'envoi.", 'error') }
  }

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  function scrollToGrid() {
    gridRef.current?.scrollIntoView({ behavior:'smooth', block:'start' })
  }

  return (
    <>
      <style>{`
        @keyframes fadeUp  { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } }
        @keyframes fadeIn  { from { opacity:0 } to { opacity:1 } }
        @keyframes drift   { 0%,100%{transform:translate(0,0)} 33%{transform:translate(20px,-15px)} 66%{transform:translate(-10px,20px)} }
        @keyframes vfade   { from { opacity:0 } to { opacity:0.18 } }
      `}</style>

      {/* ── Video background (from 26s) ─────────────────────────────────── */}
      <video
        ref={videoRef}
        style={{ position:'fixed', inset:0, width:'100%', height:'100%', objectFit:'cover', zIndex:0, pointerEvents:'none', opacity:0, animation:'vfade 2.5s 0.5s ease forwards' }}
        autoPlay muted loop playsInline
        onLoadedMetadata={e => { e.currentTarget.currentTime = 26 }}
      >
        <source src="/dear-sunrise.mp4" type="video/mp4" />
      </video>
      {/* Overlay over video */}
      <div style={{ position:'fixed', inset:0, zIndex:1, pointerEvents:'none', background:'rgba(11,12,14,0.80)' }} />

      {/* ── Toast ───────────────────────────────────────────────────────── */}
      {toast && (
        <div style={{ position:'fixed', bottom:32, right:24, zIndex:9999, padding:'12px 20px', borderRadius:12, fontWeight:700, fontSize:13, color:'#fff', background: toast.type==='success' ? 'rgba(52,211,153,0.16)' : 'rgba(224,82,74,0.16)', border:`1px solid ${toast.type==='success' ? 'rgba(52,211,153,0.45)' : 'rgba(224,82,74,0.45)'}`, backdropFilter:'blur(12px)', animation:'fadeUp 0.3s ease both' }}>
          {toast.msg}
        </div>
      )}

      <div style={{ position:'relative', zIndex:2 }}>

        {/* ═══════════════════════════════ HERO ═══════════════════════════ */}
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'80px 24px 48px', position:'relative', overflow:'hidden' }}>
          {/* Ambient */}
          <div style={{ position:'absolute', top:'10%', left:'8%', width:340, height:340, borderRadius:'50%', background:'radial-gradient(circle, rgba(224,82,74,0.12) 0%, transparent 70%)', pointerEvents:'none', animation:'drift 18s ease-in-out infinite' }} />
          <div style={{ position:'absolute', bottom:'5%', right:'6%', width:280, height:280, borderRadius:'50%', background:'radial-gradient(circle, rgba(162,155,254,0.10) 0%, transparent 70%)', pointerEvents:'none', animation:'drift 24s 4s ease-in-out infinite reverse' }} />

          {/* Eyebrow */}
          <div style={{ fontSize:10, letterSpacing:'0.35em', fontWeight:800, color:ACCENT, marginBottom:22, textTransform:'uppercase', animation:'fadeUp 0.6s ease both' }}>
            BRAMS — SYSTÈME D'ÉQUIPAGES
          </div>

          {/* Title */}
          <h1 style={{ fontFamily:'var(--display)', fontWeight:900, textAlign:'center', fontSize:'clamp(56px,11vw,108px)', lineHeight:0.92, margin:'0 0 20px', background:`linear-gradient(140deg, #ffffff 0%, rgba(255,255,255,0.80) 45%, ${ACCENT} 100%)`, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', animation:'fadeUp 0.75s 0.1s ease both' }}>
            ⚓<br />Équipages
          </h1>

          {/* Subtitle */}
          <p style={{ fontSize:17, color:'rgba(255,255,255,0.5)', textAlign:'center', maxWidth:500, lineHeight:1.65, margin:'0 0 44px', animation:'fadeUp 0.75s 0.2s ease both' }}>
            Crée ton équipage, recrute tes membres, grimpe dans le classement et impose ton pavillon.
          </p>

          {/* Stats — même style Encyclopédie */}
          {!loading && (
            <div style={{ display:'flex', gap:48, justifyContent:'center', flexWrap:'wrap', marginBottom:48, animation:'fadeUp 0.75s 0.3s ease both' }}>
              <StatPill value={nCrews}                   label="Équipages"    color={ACCENT}   />
              <div style={{ width:1, background:'rgba(255,255,255,0.08)', alignSelf:'center', height:40 }} />
              <StatPill value={nPirates}                 label="Pirates"      color={VIOLET}   />
              <div style={{ width:1, background:'rgba(255,255,255,0.08)', alignSelf:'center', height:40 }} />
              <StatPill value={`${fmtB(nBounty)} B`}    label="Prime totale" color={GOLD}     />
              <div style={{ width:1, background:'rgba(255,255,255,0.08)', alignSelf:'center', height:40 }} />
              <StatPill value={nRecruit}                 label="Recrutent"    color="#34d399"  />
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display:'flex', gap:10, flexWrap:'wrap', justifyContent:'center', marginBottom:40, animation:'fadeUp 0.75s 0.35s ease both' }}>
            {[
              { label:'⚔️ Créer mon équipage', onClick:() => setShowCreate(true), accent:ACCENT, accentA:'rgba(224,82,74' },
              { label:'🔍 Trouver un équipage', onClick:scrollToGrid,              accent:'rgba(255,255,255,0.65)', accentA:'rgba(255,255,255' },
              { label:'🏆 Classement',          onClick:() => top3.length && gridRef.current?.scrollIntoView({behavior:'smooth'}), accent:VIOLET, accentA:'rgba(162,155,254' },
            ].map(b => (
              <button key={b.label} onClick={b.onClick} style={{ height:46, padding:'0 24px', borderRadius:12, background:`${b.accentA},0.10)`, border:`1px solid ${b.accentA},0.30)`, color:b.accent, fontSize:14, fontWeight:700, cursor:'pointer', transition:'all 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.background=`${b.accentA},0.22)`}
                onMouseLeave={e => e.currentTarget.style.background=`${b.accentA},0.10)`}
              >{b.label}</button>
            ))}
          </div>

          {/* Search bar — même style Encyclopédie */}
          <div style={{ width:'100%', maxWidth:640, display:'flex', gap:10, animation:'fadeUp 0.75s 0.4s ease both' }}>
            <div style={{ flex:1, position:'relative' }}>
              <span style={{ position:'absolute', left:18, top:'50%', transform:'translateY(-50%)', fontSize:18, color:'rgba(255,255,255,0.28)', pointerEvents:'none' }}>🔍</span>
              <input ref={searchRef} type="text" placeholder="Chercher un équipage, un capitaine, un style…" value={search} onChange={e => setSearch(e.target.value)}
                style={{ width:'100%', paddingLeft:50, paddingRight:20, height:50, background:'rgba(255,255,255,0.06)', backdropFilter:'blur(12px)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:14, color:'#fff', fontSize:15, outline:'none', fontFamily:'var(--body)', boxSizing:'border-box', boxShadow:'0 8px 32px rgba(0,0,0,0.22)', transition:'border-color 0.2s, box-shadow 0.2s' }}
                onFocus={e => { e.currentTarget.style.borderColor='rgba(224,82,74,0.5)'; e.currentTarget.style.boxShadow='0 8px 32px rgba(224,82,74,0.15)' }}
                onBlur={e  => { e.currentTarget.style.borderColor='rgba(255,255,255,0.12)'; e.currentTarget.style.boxShadow='0 8px 32px rgba(0,0,0,0.22)' }}
              />
            </div>
            <select value={sort} onChange={e => setSort(e.target.value)} style={{ height:50, padding:'0 14px', borderRadius:14, border:'1px solid rgba(255,255,255,0.12)', background:'rgba(255,255,255,0.06)', backdropFilter:'blur(12px)', color:'rgba(255,255,255,0.65)', fontSize:13, cursor:'pointer', outline:'none', fontFamily:'var(--body)' }}>
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value} style={{ background:'#0e0f11' }}>{o.label}</option>)}
            </select>
          </div>
        </div>

        {/* ═══════════════════════════ CONTENT ════════════════════════════ */}
        <div style={{ maxWidth:1120, margin:'0 auto', padding:'0 20px 80px' }}>

          {/* Demo banner */}
          {usingMock && (
            <div style={{ marginBottom:24, padding:'10px 16px', borderRadius:10, background:'rgba(253,203,110,0.07)', border:'1px solid rgba(253,203,110,0.18)', color:GOLD, fontSize:12, fontWeight:600, textAlign:'center' }}>
              ⚠️ Données de démo — aucun équipage en base. Les vraies données s'afficheront automatiquement.
            </div>
          )}

          {/* Filter pills — même style Encyclopédie */}
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', justifyContent:'center', marginBottom:40 }}>
            {STYLE_FILTERS.map(f => {
              const active = filter === f
              return (
                <button key={f} onClick={() => setFilter(f)} style={{ height:36, padding:'0 18px', borderRadius:100, border:`1px solid ${active ? 'rgba(224,82,74,0.5)' : 'rgba(255,255,255,0.10)'}`, background: active ? 'rgba(224,82,74,0.15)' : 'transparent', color: active ? ACCENT : 'rgba(255,255,255,0.4)', fontSize:13, fontWeight:700, cursor:'pointer', transition:'all 0.15s' }}>
                  {f}
                </button>
              )
            })}
          </div>

          {/* Mon équipage */}
          <MyCrewPanel membership={membership} crewData={memberCrew} isAuthenticated={isAuthenticated} onCreate={() => setShowCreate(true)} onFind={scrollToGrid} />

          {/* Top 3 */}
          {top3.length > 0 && (
            <div style={{ marginBottom:64 }}>
              <SectionHeading eyebrow="Brams • Classement" title="🏆 Top Équipages" subtitle="Les équipages qui dominent le Grand Line de Brams Community." color={GOLD} />
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(260px, 1fr))', gap:14 }}>
                {top3.map((c, i) => <TopCrewCard key={c.id} crew={c} rank={i+1} index={i} />)}
              </div>
            </div>
          )}

          {/* Crew grid */}
          <div ref={gridRef} style={{ scrollMarginTop:100 }}>
            <SectionHeading eyebrow="Brams • Équipages" title="🏴‍☠️ Tous les Équipages" subtitle="Trouve l'équipage qui correspond à ton style et rejoins la flotte." color={ACCENT} />
            {loading ? (
              <div style={{ textAlign:'center', padding:'80px 0', color:'rgba(255,255,255,0.25)', fontSize:14 }}>Chargement…</div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign:'center', padding:'80px 0' }}>
                <div style={{ fontSize:48, marginBottom:16 }}>🔍</div>
                <div style={{ fontWeight:700, color:'#fff', marginBottom:8 }}>Aucun équipage trouvé</div>
                <div style={{ fontSize:14, color:'rgba(255,255,255,0.4)' }}>Essaie un autre filtre ou un autre nom</div>
              </div>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(310px, 1fr))', gap:14 }}>
                {filtered.map((c, i) => <CrewCard key={c.id} crew={c} index={i} onApply={setApplyTarget} userCrewId={membership?.crew_id} />)}
              </div>
            )}
          </div>

          {/* Roadmap */}
          <div style={{ marginTop:80 }}>
            <SectionHeading eyebrow="Brams • Fonctionnalités" title="🔭 Bientôt disponible" subtitle="Les prochaines fonctionnalités du système d'équipages Brams Community." color={VIOLET} />
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:12 }}>
              {ROADMAP.map((item, i) => (
                <div key={i} style={{ background:'linear-gradient(145deg, rgba(255,255,255,0.04) 0%, rgba(14,14,16,0.9) 100%)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:14, padding:'18px 20px', animation:`fadeUp 0.4s ${i*0.06}s ease-out both` }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                    <span style={{ fontSize:22 }}>{item.emoji}</span>
                    <span style={{ fontWeight:800, fontSize:14, color:'#fff' }}>{item.title}</span>
                    {item.soon
                      ? <span style={{ fontSize:9, fontWeight:800, padding:'2px 7px', borderRadius:10, background:'rgba(162,155,254,0.14)', color:VIOLET, border:'1px solid rgba(162,155,254,0.28)', marginLeft:'auto' }}>BIENTÔT</span>
                      : <span style={{ fontSize:9, fontWeight:800, padding:'2px 7px', borderRadius:10, background:'rgba(52,211,153,0.14)', color:'#34d399', border:'1px solid rgba(52,211,153,0.28)', marginLeft:'auto' }}>BETA</span>
                    }
                  </div>
                  <p style={{ fontSize:12, color:'rgba(255,255,255,0.48)', margin:0, lineHeight:1.65 }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA unauthenticated */}
          {!isAuthenticated && (
            <div style={{ marginTop:64, textAlign:'center', padding:'48px 24px', background:'linear-gradient(135deg, rgba(224,82,74,0.06) 0%, rgba(14,14,16,0.9) 100%)', border:'1px solid rgba(224,82,74,0.14)', borderRadius:18 }}>
              <div style={{ fontSize:40, marginBottom:16 }}>⚓</div>
              <h3 style={{ fontFamily:'var(--display)', fontSize:'clamp(24px,4vw,38px)', color:'#fff', margin:'0 0 12px', lineHeight:1 }}>Prêt à lever le pavillon ?</h3>
              <p style={{ fontSize:15, color:'rgba(255,255,255,0.42)', maxWidth:440, margin:'0 auto 28px', lineHeight:1.7 }}>Connecte-toi pour créer ou rejoindre un équipage et écrire ton histoire dans le Grand Line.</p>
              <button onClick={() => document.dispatchEvent(new CustomEvent('open-auth-modal'))} style={{ padding:'13px 32px', borderRadius:12, background:'rgba(224,82,74,0.16)', border:'1px solid rgba(224,82,74,0.42)', color:ACCENT, fontWeight:700, fontSize:15, cursor:'pointer', transition:'all 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.background='rgba(224,82,74,0.28)'}
                onMouseLeave={e => e.currentTarget.style.background='rgba(224,82,74,0.16)'}
              >Se connecter</button>
            </div>
          )}
        </div>
      </div>

      {/* ── Music bar ──────────────────────────────────────────────────── */}
      <MusicBar videoRef={videoRef} />

      {/* ── Modals ─────────────────────────────────────────────────────── */}
      {showCreate  && <CreateCrewModal crew={null} onClose={() => setShowCreate(false)} onCreate={handleCreate} />}
      {applyTarget && <ApplyModal crew={applyTarget} onClose={() => setApplyTarget(null)} onSubmit={handleApply} />}
    </>
  )
}
