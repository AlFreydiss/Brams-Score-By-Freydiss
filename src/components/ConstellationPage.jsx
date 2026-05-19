import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext.jsx'
import Navbar from './Navbar.jsx'
import { supabase } from '../lib/supabase.js'
import { fetchCrews } from '../lib/crew/supabaseCrewQueries.js'
import { getUserCrewMembership, fetchCrewById, applyToCrew, writeCrewLog } from '../lib/crew/crewHQQueries.js'

// ─────────────────────────────────────────────────────────────────────────────
// MOCK DATA — remplacé automatiquement si des équipages existent en DB
// ─────────────────────────────────────────────────────────────────────────────
const MOCK_CREWS = [
  { id:'mock-1', name:'Les Dragons Rouges', tag:'DR', motto:'Le feu ne meurt jamais.', description:'Équipage d\'élite fondé sur la puissance brute et la loyauté absolue. Les Dragons Rouges écrasent tout sur leur passage.', emblem_emoji:'🐉', primary_color:'#c41c1c', captain_name:'Kaido_Jr', captain_id:'mock-cap-1', member_count:28, max_members:30, total_bounty:4_500_000_000, level:8, xp:78000, reputation:4200, wins:47, is_recruiting:true, recruitment_message:'Cherchons guerriers d\'élite. Min. 500h vocal.', styles:['pvp','tryhard'], rank:1, treasury_balance:12_000_000, created_at:'2024-01-15T00:00:00Z', is_mock:true },
  { id:'mock-2', name:'Les Ombres du Nouveau Monde', tag:'ONM', motto:'Dans l\'ombre, on prépare la tempête.', description:'Maîtres des stratégies nocturnes et des missions secrètes. On ne les entend jamais venir.', emblem_emoji:'🌑', primary_color:'#7c3aed', captain_name:'Shadowstrike', captain_id:'mock-cap-2', member_count:21, max_members:25, total_bounty:3_200_000_000, level:6, xp:58000, reputation:3100, wins:31, is_recruiting:true, recruitment_message:'Actifs la nuit. Stratèges discrets bienvenus.', styles:['rp','event'], rank:2, treasury_balance:8_500_000, created_at:'2024-02-01T00:00:00Z', is_mock:true },
  { id:'mock-3', name:'Les Rois des Mers', tag:'RM', motto:'Nul ne règne sans l\'avoir mérité.', description:'Les anciens du serveur. 15 mois d\'existence, 89 victoires. La référence absolue des sept mers.', emblem_emoji:'👑', primary_color:'#d4a017', captain_name:'SeaKing_X', captain_id:'mock-cap-3', member_count:35, max_members:40, total_bounty:6_100_000_000, level:10, xp:100000, reputation:5800, wins:89, is_recruiting:false, recruitment_message:null, styles:['quiz','vocal'], rank:3, treasury_balance:45_000_000, created_at:'2023-11-01T00:00:00Z', is_mock:true },
  { id:'mock-4', name:'Les Chasseurs de Primes', tag:'CDP', motto:'Chaque prime a un prix.', description:'Spécialisés dans les événements classement. On grimpe, on gagne, on recommence. Résultats garantis.', emblem_emoji:'🎯', primary_color:'#f97316', captain_name:'BountyHunter99', captain_id:'mock-cap-4', member_count:15, max_members:20, total_bounty:2_800_000_000, level:5, xp:44000, reputation:2400, wins:22, is_recruiting:true, recruitment_message:'On cherche des membres actifs sur le classement.', styles:['tryhard','pvp'], rank:4, treasury_balance:3_200_000, created_at:'2024-03-10T00:00:00Z', is_mock:true },
  { id:'mock-5', name:'Les Héritiers du D.', tag:'HD', motto:'La volonté du D. nous guide.', description:'Équipage RP fondé sur la lore One Piece. Quiz hebdo, débats canon et théories. Ambiance bienveillante.', emblem_emoji:'🌀', primary_color:'#06b6d4', captain_name:'Luffy_D_Monkey', captain_id:'mock-cap-5', member_count:18, max_members:30, total_bounty:1_900_000_000, level:4, xp:32000, reputation:1800, wins:14, is_recruiting:true, recruitment_message:'RP bienvenu. Quiz hebdo. Ambiance détendue.', styles:['rp','quiz','chill'], rank:5, treasury_balance:1_500_000, created_at:'2024-04-05T00:00:00Z', is_mock:true },
  { id:'mock-6', name:'La Marine Noire', tag:'MN', motto:'L\'ordre avant tout, même dans l\'ombre.', description:'Né d\'une trahison. Combat à contre-courant. Ni pirate, ni marine — quelque chose de nouveau.', emblem_emoji:'⚓', primary_color:'#374151', captain_name:'DarkAdmiral', captain_id:'mock-cap-6', member_count:12, max_members:20, total_bounty:1_200_000_000, level:3, xp:24000, reputation:1200, wins:9, is_recruiting:true, recruitment_message:'Cherchons soldats disciplinés. Aucune faiblesse tolérée.', styles:['vocal','event'], rank:6, treasury_balance:800_000, created_at:'2024-05-20T00:00:00Z', is_mock:true },
]

const STYLE_TAGS = {
  pvp:     { label:'PvP',       color:'#e0524a', icon:'⚔️' },
  quiz:    { label:'Quiz',      color:'#60a5fa', icon:'❓' },
  vocal:   { label:'Vocal',     color:'#34d399', icon:'🎙️' },
  chill:   { label:'Chill',     color:'#a78bfa', icon:'🌊' },
  tryhard: { label:'Tryhard',   color:'#f97316', icon:'🔥' },
  event:   { label:'Événement', color:'#fbbf24', icon:'🎪' },
  rp:      { label:'RP',        color:'#ec4899', icon:'🎭' },
}

const HOW_IT_WORKS = [
  { icon:'⚔️', title:'Crée ton équipage', text:'Choisis un nom, un emblème, une couleur. Lance ton pavillon sur les sept mers.' },
  { icon:'🧲', title:'Recrute tes membres', text:'Ouvre le recrutement, accepte les candidatures, construis ton équipe.' },
  { icon:'💰', title:'Monte ta prime', text:'Sois actif. Chaque heure vocale, chaque événement gagne de la prime pour ton équipage.' },
  { icon:'🗺️', title:'Termine des missions', text:'Missions quotidiennes, hebdomadaires et événements spéciaux. Gagnez de l\'XP ensemble.' },
  { icon:'🏆', title:'Grimpe dans le classement', text:'Domine le podium mensuel et prouve que ton équipage est le meilleur du serveur.' },
]

const ROADMAP = [
  { icon:'🗺️', label:'Missions d\'équipage',   status:'beta' },
  { icon:'💰', label:'Coffre commun',           status:'beta' },
  { icon:'🤝', label:'Alliances & Rivalités',   status:'soon' },
  { icon:'🏝️', label:'Territoires',             status:'soon' },
  { icon:'🏟️', label:'Tournois d\'équipages',   status:'soon' },
  { icon:'🎖️', label:'Saisons mensuelles',      status:'soon' },
  { icon:'🎁', label:'Récompenses exclusives',  status:'soon' },
  { icon:'🏆', label:'Trophées & Badges',       status:'soon' },
]

// ─────────────────────────────────────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────────────────────────────────────
function fmtB(n) {
  if (!n) return '0'
  n = parseInt(n)
  if (n >= 1_000_000_000) return `${(n/1_000_000_000).toFixed(1)}Md`
  if (n >= 1_000_000)     return `${(n/1_000_000).toFixed(1)}M`
  if (n >= 1_000)         return `${(n/1_000).toFixed(0)}K`
  return String(n)
}
function fmtNum(n) { return new Intl.NumberFormat('fr-FR').format(n || 0) }
function levelTitle(lvl) {
  if (lvl >= 10) return 'ROI DES PIRATES'
  if (lvl >= 8)  return 'Yonkou'
  if (lvl >= 6)  return 'Warlord'
  if (lvl >= 4)  return 'Supernova'
  if (lvl >= 2)  return 'Marin courageux'
  return 'Débutant'
}

// ─────────────────────────────────────────────────────────────────────────────
// ATOMS
// ─────────────────────────────────────────────────────────────────────────────
function RecruitBadge({ open }) {
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 9px', background: open ? 'rgba(52,211,153,.1)' : 'rgba(239,68,68,.07)', border:`1px solid ${open ? 'rgba(52,211,153,.3)' : 'rgba(239,68,68,.2)'}`, borderRadius:100, fontSize:10, fontWeight:800, color: open ? '#34d399' : '#f87171', letterSpacing:'.06em', textTransform:'uppercase', whiteSpace:'nowrap' }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background: open ? '#34d399' : '#e0524a', boxShadow:`0 0 6px ${open ? '#34d399' : '#e0524a'}` }} />
      {open ? 'Recrute' : 'Fermé'}
    </span>
  )
}

function StyleTag({ tag }) {
  const t = STYLE_TAGS[tag]
  if (!t) return null
  return <span style={{ display:'inline-flex', alignItems:'center', gap:3, padding:'2px 8px', background:`${t.color}12`, border:`1px solid ${t.color}28`, borderRadius:3, fontSize:9, fontWeight:800, color:t.color, letterSpacing:'.06em', textTransform:'uppercase', whiteSpace:'nowrap' }}>{t.icon} {t.label}</span>
}

function BountyGlow({ value, color = '#d4a017', size = 20 }) {
  return (
    <span style={{ fontFamily:'Pirata One, cursive', fontSize:size, fontWeight:900, color, textShadow:`0 0 16px ${color}55`, lineHeight:1 }}>
      {fmtB(value)} <span style={{ fontSize:size*0.65 }}>฿</span>
    </span>
  )
}

function LevelBadge({ level, color }) {
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 8px', background:`${color || '#d4a017'}14`, border:`1px solid ${color || '#d4a017'}30`, borderRadius:3, fontSize:10, fontWeight:800, color:color||'#d4a017', letterSpacing:'.05em' }}>
      ⭐ Niv.{level}
    </span>
  )
}

function GlassCard({ children, style, onClick, hoverGlow = 'rgba(180,130,30,.08)' }) {
  return (
    <motion.div
      onClick={onClick}
      whileHover={{ y: onClick ? -3 : 0 }}
      transition={{ duration:.15 }}
      style={{ background:'linear-gradient(145deg, rgba(12,8,3,.98) 0%, rgba(6,4,2,1) 100%)', border:'1px solid rgba(180,130,30,.22)', borderRadius:8, ...style, cursor: onClick ? 'pointer' : 'default' }}
      onMouseEnter={e => { if(onClick) e.currentTarget.style.borderColor = 'rgba(180,130,30,.5)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(180,130,30,.22)' }}
    >
      {children}
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CREW CARD
// ─────────────────────────────────────────────────────────────────────────────
function CrewCard({ crew, onApply, onView, currentCrewId }) {
  const cc = crew.primary_color || '#d4a017'
  const isFull = crew.member_count >= (crew.max_members || 40)
  const isMyCrewCard = currentCrewId && String(crew.id) === String(currentCrewId)

  return (
    <motion.div
      initial={{ opacity:0, y:16 }}
      animate={{ opacity:1, y:0 }}
      whileHover={{ y:-4, transition:{duration:.18} }}
      style={{ position:'relative', background:'linear-gradient(145deg, rgba(12,8,3,.99) 0%, rgba(5,3,1,1) 100%)', border:`1px solid ${cc}28`, borderTop:`2px solid ${cc}66`, borderRadius:10, overflow:'hidden', display:'flex', flexDirection:'column' }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = `0 8px 40px ${cc}18, 0 0 0 1px ${cc}35`}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
    >
      {/* Top stripe glow */}
      <div style={{ position:'absolute', top:0, left:0, right:0, height:60, background:`radial-gradient(ellipse 60% 100% at 50% 0%, ${cc}16, transparent)`, pointerEvents:'none' }} />

      {/* Rank badge */}
      {crew.rank && crew.rank <= 3 && (
        <div style={{ position:'absolute', top:12, right:12, fontSize:18 }}>
          {['🥇','🥈','🥉'][crew.rank-1]}
        </div>
      )}
      {isMyCrewCard && (
        <div style={{ position:'absolute', top:12, left:12, fontSize:9, fontWeight:900, letterSpacing:'.1em', textTransform:'uppercase', color:'#34d399', background:'rgba(52,211,153,.12)', border:'1px solid rgba(52,211,153,.3)', borderRadius:3, padding:'2px 7px' }}>MON ÉQUIPAGE</div>
      )}
      {crew.is_mock && (
        <div style={{ position:'absolute', top:12, left:12, fontSize:9, fontWeight:900, letterSpacing:'.1em', textTransform:'uppercase', color:'rgba(180,150,100,.4)', background:'rgba(180,130,30,.08)', border:'1px solid rgba(180,130,30,.15)', borderRadius:3, padding:'2px 7px' }}>DÉMO</div>
      )}

      <div style={{ padding:'18px 18px 14px' }}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'flex-start', gap:14, marginBottom:14 }}>
          <div style={{ width:52, height:52, borderRadius:8, background:`${cc}14`, border:`1px solid ${cc}35`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, flexShrink:0, boxShadow:`inset 0 0 20px ${cc}10` }}>
            {crew.emblem_emoji || '🏴‍☠️'}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontFamily:'Pirata One, cursive', fontSize:17, color:'rgba(232,215,175,.95)', lineHeight:1.15, marginBottom:3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{crew.name}</div>
            <div style={{ fontSize:10, color:'rgba(180,150,100,.5)', fontWeight:700, letterSpacing:'.12em', marginBottom:5 }}>[{crew.tag}]</div>
            {crew.motto && <div style={{ fontSize:11, color:`${cc}80`, fontStyle:'italic', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>« {crew.motto} »</div>}
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6, marginBottom:12 }}>
          {[
            { icon:'⚔️', label:'Membres', value:`${crew.member_count || 0}/${crew.max_members || '∞'}` },
            { icon:'💰', label:'Prime',   value: fmtB(crew.total_bounty) + ' ฿' },
            { icon:'⭐', label:'Niveau',  value: `Niv. ${crew.level || 1}` },
          ].map(s => (
            <div key={s.label} style={{ background:'rgba(0,0,0,.35)', border:'1px solid rgba(180,130,30,.1)', borderRadius:5, padding:'7px 8px', textAlign:'center' }}>
              <div style={{ fontSize:13, marginBottom:2 }}>{s.icon}</div>
              <div style={{ fontSize:12, fontWeight:900, color:s.label==='Prime'?cc:'rgba(220,195,145,.85)', fontFamily:s.label==='Prime'?'Pirata One, cursive':'inherit', lineHeight:1 }}>{s.value}</div>
              <div style={{ fontSize:8.5, color:'rgba(180,150,100,.38)', textTransform:'uppercase', letterSpacing:'.08em', marginTop:2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Captain */}
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
          <span style={{ fontSize:10, color:'rgba(180,150,100,.45)', fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase' }}>Capitaine :</span>
          <span style={{ fontSize:12, fontWeight:800, color:'rgba(220,195,145,.8)', fontFamily:'Pirata One, cursive' }}>{crew.captain_name || '—'}</span>
        </div>

        {/* Tags row */}
        <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginBottom:12, minHeight:18 }}>
          <RecruitBadge open={crew.is_recruiting && !isFull} />
          {(crew.styles || []).map(t => <StyleTag key={t} tag={t} />)}
          {crew.wins > 0 && <span style={{ display:'inline-flex', alignItems:'center', gap:3, padding:'2px 7px', background:'rgba(251,191,36,.08)', border:'1px solid rgba(251,191,36,.2)', borderRadius:3, fontSize:9, fontWeight:800, color:'#fbbf24', letterSpacing:'.06em' }}>🏆 {crew.wins}v</span>}
        </div>

        {/* Description */}
        {crew.description && (
          <div style={{ fontSize:11.5, color:'rgba(200,175,130,.5)', lineHeight:1.6, marginBottom:14, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
            {crew.description}
          </div>
        )}
      </div>

      {/* CTA buttons */}
      <div style={{ marginTop:'auto', padding:'0 14px 14px', display:'flex', gap:8 }}>
        <button onClick={() => onView(crew)}
          style={{ flex:1, padding:'9px 10px', background:'rgba(0,0,0,.4)', border:'1px solid rgba(180,130,30,.25)', borderRadius:5, color:'rgba(200,175,130,.65)', fontSize:11, fontWeight:700, cursor:'pointer', letterSpacing:'.04em', transition:'all .15s' }}
          onMouseEnter={e => { e.currentTarget.style.background='rgba(180,130,20,.12)'; e.currentTarget.style.color='rgba(220,195,145,.9)' }}
          onMouseLeave={e => { e.currentTarget.style.background='rgba(0,0,0,.4)'; e.currentTarget.style.color='rgba(200,175,130,.65)' }}>
          ⚓ Voir le QG
        </button>
        {crew.is_recruiting && !isFull && (
          <button onClick={() => onApply(crew)}
            style={{ flex:1, padding:'9px 10px', background:`${cc}14`, border:`1px solid ${cc}40`, borderRadius:5, color:cc, fontSize:11, fontWeight:800, cursor:'pointer', letterSpacing:'.04em', transition:'all .15s' }}
            onMouseEnter={e => { e.currentTarget.style.background=`${cc}28` }}
            onMouseLeave={e => { e.currentTarget.style.background=`${cc}14` }}>
            📋 Candidater
          </button>
        )}
      </div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TOP PODIUM
// ─────────────────────────────────────────────────────────────────────────────
function TopPodium({ crews }) {
  const top3 = [...crews].sort((a,b) => (b.total_bounty||0)-(a.total_bounty||0)).slice(0,3)
  if (top3.length < 1) return null
  const order = [top3[1], top3[0], top3[2]].filter(Boolean)
  const heights = [130, 175, 105]
  const medals = ['🥈','🥇','🥉']
  const colors = ['#c0c0c0', '#d4a017', '#cd7f32']
  const ranks = [2, 1, 3]

  return (
    <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'center', gap:16, padding:'0 20px 20px' }}>
      {order.map((crew, i) => {
        const cc = crew.primary_color || colors[i]
        return (
          <motion.div key={crew.id} initial={{ opacity:0, y:30 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }}
            transition={{ delay: i * 0.12, duration:.5, ease:[.22,1,.36,1] }}
            style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8, flex: i===1 ? '0 0 200px' : '0 0 160px' }}>
            <div style={{ fontSize: i===1?32:24 }}>{medals[i]}</div>
            <div style={{ width:i===1?68:52, height:i===1?68:52, borderRadius:8, background:`${cc}14`, border:`2px solid ${cc}60`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:i===1?30:22, boxShadow:`0 4px 20px ${cc}30` }}>
              {crew.emblem_emoji || '🏴‍☠️'}
            </div>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontFamily:'Pirata One, cursive', fontSize:i===1?16:13, color:'rgba(232,215,175,.93)', lineHeight:1.2, marginBottom:3 }}>{crew.name}</div>
              <div style={{ fontSize:10, color:`${colors[i]}`, fontFamily:'Pirata One, cursive', fontWeight:900 }}>{fmtB(crew.total_bounty)} ฿</div>
              <div style={{ fontSize:9, color:'rgba(180,150,100,.4)', marginTop:3 }}>👥 {crew.member_count} membres</div>
            </div>
            <div style={{ width:'100%', height:heights[i], background:`linear-gradient(180deg, ${cc}20, ${cc}08)`, border:`1px solid ${cc}28`, borderRadius:'6px 6px 0 0', minWidth:'100%', display:'flex', alignItems:'flex-start', justifyContent:'center', paddingTop:10 }}>
              <span style={{ fontFamily:'Pirata One, cursive', fontSize:28, color:`${cc}40` }}>#{ranks[i]}</span>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MARITIME MAP SECTION
// ─────────────────────────────────────────────────────────────────────────────
function MaritimeMapSection({ crews }) {
  const zones = [
    { name:'East Blue',       color:'#3b82f6', x:'15%', y:'30%', crew: crews[5] },
    { name:'Grand Line',      color:'#d4a017', x:'50%', y:'25%', crew: crews[2] },
    { name:'Nouveau Monde',   color:'#dc2626', x:'75%', y:'30%', crew: crews[0] },
    { name:'South Blue',      color:'#7c3aed', x:'20%', y:'65%', crew: crews[1] },
    { name:'North Blue',      color:'#06b6d4', x:'80%', y:'65%', crew: crews[4] },
    { name:'Mer de l\'Ouest', color:'#f97316', x:'50%', y:'70%', crew: crews[3] },
  ]
  const [hovered, setHovered] = useState(null)

  return (
    <div style={{ position:'relative', height:360, background:'linear-gradient(135deg, #020c18 0%, #04152a 50%, #020c18 100%)', borderRadius:12, border:'1px solid rgba(180,130,30,.18)', overflow:'hidden' }}>
      {/* Grid lines */}
      {[...Array(8)].map((_,i) => (
        <div key={i} style={{ position:'absolute', left:`${i*14}%`, top:0, bottom:0, width:1, background:'rgba(180,130,30,.05)' }} />
      ))}
      {[...Array(5)].map((_,i) => (
        <div key={i} style={{ position:'absolute', top:`${i*25}%`, left:0, right:0, height:1, background:'rgba(180,130,30,.05)' }} />
      ))}

      {/* Title */}
      <div style={{ position:'absolute', top:16, left:20, zIndex:2 }}>
        <div style={{ fontSize:9, fontWeight:900, letterSpacing:'.18em', textTransform:'uppercase', color:'rgba(180,130,30,.5)', marginBottom:4 }}>GRAND LINE · CARTE DES MERS</div>
        <div style={{ fontFamily:'Pirata One, cursive', fontSize:18, color:'rgba(220,195,145,.6)' }}>Territoires des Équipages</div>
      </div>

      {/* Coming soon overlay */}
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', zIndex:10, background:'rgba(2,4,10,.75)', backdropFilter:'blur(2px)' }}>
        <div style={{ fontSize:52, marginBottom:14 }}>🗺️</div>
        <div style={{ fontFamily:'Pirata One, cursive', fontSize:24, color:'rgba(220,195,145,.8)', marginBottom:8 }}>Carte des Territoires</div>
        <div style={{ fontSize:13, color:'rgba(180,150,100,.45)', textAlign:'center', maxWidth:360, lineHeight:1.7, marginBottom:20 }}>
          Les équipages pourront bientôt revendiquer des zones, déclarer des guerres
          <br />et établir leur dominance sur les sept mers.
        </div>
        <span style={{ padding:'6px 18px', background:'rgba(180,130,20,.15)', border:'1px solid rgba(180,130,30,.35)', borderRadius:100, fontSize:11, fontWeight:800, color:'#d4a017', letterSpacing:'.1em', textTransform:'uppercase' }}>
          🔒 Bientôt disponible
        </span>
      </div>

      {/* Zone markers (decorative, behind overlay) */}
      {zones.map((z,i) => (
        <div key={i} style={{ position:'absolute', left:z.x, top:z.y, transform:'translate(-50%,-50%)' }}>
          <div style={{ width:10, height:10, borderRadius:'50%', background:z.color, boxShadow:`0 0 12px ${z.color}80` }} />
        </div>
      ))}

      {/* Compass */}
      <div style={{ position:'absolute', bottom:20, right:24, fontSize:36, opacity:.25 }}>🧭</div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// HOW IT WORKS
// ─────────────────────────────────────────────────────────────────────────────
function HowItWorks() {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:14 }}>
      {HOW_IT_WORKS.map((step, i) => (
        <motion.div key={i} initial={{ opacity:0, y:20 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }}
          transition={{ delay: i*0.08, duration:.45 }}
          whileHover={{ y:-3 }}
          style={{ background:'linear-gradient(145deg, rgba(12,8,3,.98) 0%, rgba(6,4,2,1) 100%)', border:'1px solid rgba(180,130,30,.18)', borderRadius:8, padding:'20px 16px', textAlign:'center' }}>
          <div style={{ fontSize:32, marginBottom:12 }}>{step.icon}</div>
          <div style={{ fontFamily:'Pirata One, cursive', fontSize:15, color:'rgba(232,215,175,.9)', marginBottom:8, lineHeight:1.2 }}>{step.title}</div>
          <div style={{ fontSize:12, color:'rgba(180,150,100,.5)', lineHeight:1.6 }}>{step.text}</div>
          <div style={{ marginTop:12, width:32, height:2, background:'linear-gradient(90deg,transparent,rgba(180,130,30,.4),transparent)', margin:'12px auto 0' }} />
          <div style={{ fontSize:10, color:'rgba(180,130,30,.35)', fontWeight:700, letterSpacing:'.1em', marginTop:6 }}>ÉTAPE {i+1}</div>
        </motion.div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ROADMAP
// ─────────────────────────────────────────────────────────────────────────────
function RoadmapSection() {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(170px,1fr))', gap:10 }}>
      {ROADMAP.map((item, i) => (
        <motion.div key={i} initial={{ opacity:0, scale:.95 }} whileInView={{ opacity:1, scale:1 }} viewport={{ once:true }}
          transition={{ delay: i*0.06 }}
          style={{ background:'linear-gradient(145deg, rgba(12,8,3,.98), rgba(6,4,2,1))', border:`1px solid ${item.status==='beta' ? 'rgba(52,211,153,.25)' : 'rgba(180,130,30,.15)'}`, borderRadius:8, padding:'16px', display:'flex', alignItems:'center', gap:12, opacity: item.status==='soon' ? .7 : 1 }}>
          <div style={{ fontSize:24, lineHeight:1 }}>{item.icon}</div>
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:'rgba(220,195,145,.8)', lineHeight:1.3 }}>{item.label}</div>
            <div style={{ marginTop:4, display:'inline-flex', alignItems:'center', gap:4, padding:'1px 7px', background: item.status==='beta' ? 'rgba(52,211,153,.1)' : 'rgba(180,130,30,.1)', border:`1px solid ${item.status==='beta' ? 'rgba(52,211,153,.25)' : 'rgba(180,130,30,.2)'}`, borderRadius:3, fontSize:8.5, fontWeight:800, color:item.status==='beta'?'#34d399':'rgba(180,130,30,.7)', letterSpacing:'.08em', textTransform:'uppercase' }}>
              {item.status==='beta' ? '🟢 EN BETA' : '🔒 BIENTÔT'}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CREATE CREW MODAL
// ─────────────────────────────────────────────────────────────────────────────
const EMOJIS = ['🏴‍☠️','🐉','👑','🌑','🌀','⚓','🎯','🔥','⚡','🌊','🦅','🐺','🦁','🗡️','💀','🌙','☠️','🌋','🏹','🗺️']
const COLORS_PRESETS = ['#d4a017','#c41c1c','#7c3aed','#06b6d4','#f97316','#374151','#34d399','#ec4899','#3b82f6','#10b981']

function CreateCrewModal({ onClose, onDone, discordId, displayName }) {
  const [form, setForm] = useState({ name:'', tag:'', motto:'', description:'', emblem_emoji:'🏴‍☠️', primary_color:'#d4a017', is_recruiting:true, styles:[] })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  const suggestTag = (name) => name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,4) || ''

  async function handleCreate() {
    if (!form.name.trim()) return setErr('Le nom de l\'équipage est obligatoire.')
    if (form.name.trim().length < 3) return setErr('Le nom doit faire au moins 3 caractères.')
    if (!supabase) return setErr('Non connecté à la base de données.')
    setBusy(true)
    const tag = (form.tag || suggestTag(form.name)).toUpperCase().slice(0,5)

    const { data: crew, error } = await supabase.from('crews').insert({
      name: form.name.trim(), tag, motto: form.motto.trim(),
      description: form.description.trim(),
      emblem_emoji: form.emblem_emoji,
      primary_color: form.primary_color,
      captain_id: discordId,
      is_recruiting: form.is_recruiting,
      level:1, xp:0, total_bounty:0, reputation:0, wins:0,
      treasury_balance:0,
    }).select().single()

    if (error) { setBusy(false); return setErr(error.message) }

    await supabase.from('crew_members').upsert({
      crew_id: crew.id, user_id: discordId, position:'capitaine',
      contribution:0, joined_at: new Date().toISOString(),
    })

    setBusy(false)
    onDone(crew)
  }

  const F = ({ label, field, type='text', placeholder, rows }) => (
    <div style={{ marginBottom:14 }}>
      <label style={{ display:'block', fontSize:10, fontWeight:800, letterSpacing:'.1em', textTransform:'uppercase', color:'rgba(200,175,130,.55)', marginBottom:6 }}>{label}</label>
      {rows ? (
        <textarea rows={rows} value={form[field]} onChange={e => setForm(v=>({...v,[field]:e.target.value}))} placeholder={placeholder}
          style={{ width:'100%', padding:'10px 12px', background:'rgba(0,0,0,.5)', border:'1px solid rgba(180,130,30,.22)', borderRadius:5, color:'rgba(220,195,145,.9)', fontSize:13, resize:'vertical', outline:'none', boxSizing:'border-box', fontFamily:'inherit' }} />
      ) : (
        <input type={type} value={form[field]} onChange={e => setForm(v=>({...v,[field]:e.target.value}))} placeholder={placeholder}
          style={{ width:'100%', padding:'10px 12px', background:'rgba(0,0,0,.5)', border:'1px solid rgba(180,130,30,.22)', borderRadius:5, color:'rgba(220,195,145,.9)', fontSize:13, outline:'none', boxSizing:'border-box' }} />
      )}
    </div>
  )

  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      style={{ position:'fixed', inset:0, zIndex:9200, background:'rgba(0,0,0,.92)', backdropFilter:'blur(10px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20, overflowY:'auto' }}
      onClick={onClose}>
      <motion.div initial={{ scale:.9, y:20 }} animate={{ scale:1, y:0 }} exit={{ scale:.9 }}
        onClick={e => e.stopPropagation()}
        style={{ width:'min(560px,100%)', background:'#120a03', border:'1px solid rgba(180,130,30,.35)', borderTop:'2px solid rgba(212,160,23,.5)', borderRadius:10, padding:'28px', boxShadow:'0 40px 100px rgba(0,0,0,.9)', maxHeight:'90vh', overflowY:'auto' }}>

        <div style={{ fontFamily:'Pirata One, cursive', fontSize:26, color:'rgba(232,215,175,.95)', marginBottom:4 }}>⚓ Lever son pavillon</div>
        <div style={{ fontSize:12, color:'rgba(180,150,100,.45)', marginBottom:22 }}>Crée ton équipage et commence ta conquête des sept mers.</div>

        {err && <div style={{ marginBottom:14, padding:'10px 14px', background:'rgba(224,82,74,.1)', border:'1px solid rgba(224,82,74,.3)', borderRadius:5, fontSize:12, color:'#f87171', fontWeight:600 }}>⚠ {err}</div>}

        <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:10, marginBottom:14 }}>
          <div>
            <label style={{ display:'block', fontSize:10, fontWeight:800, letterSpacing:'.1em', textTransform:'uppercase', color:'rgba(200,175,130,.55)', marginBottom:6 }}>Nom de l'équipage *</label>
            <input value={form.name} onChange={e => setForm(v=>({...v, name:e.target.value, tag: suggestTag(e.target.value)}))} placeholder="Ex : Les Dragons du Nouveau Monde"
              style={{ width:'100%', padding:'10px 12px', background:'rgba(0,0,0,.5)', border:'1px solid rgba(180,130,30,.22)', borderRadius:5, color:'rgba(220,195,145,.9)', fontSize:13, outline:'none', boxSizing:'border-box' }} />
          </div>
          <div style={{ width:90 }}>
            <label style={{ display:'block', fontSize:10, fontWeight:800, letterSpacing:'.1em', textTransform:'uppercase', color:'rgba(200,175,130,.55)', marginBottom:6 }}>Tag</label>
            <input value={form.tag} maxLength={5} onChange={e => setForm(v=>({...v, tag:e.target.value.toUpperCase()}))} placeholder="DR"
              style={{ width:'100%', padding:'10px 12px', background:'rgba(0,0,0,.5)', border:'1px solid rgba(180,130,30,.22)', borderRadius:5, color:'rgba(220,195,145,.9)', fontSize:13, outline:'none', boxSizing:'border-box', textAlign:'center', fontWeight:800, letterSpacing:'.08em' }} />
          </div>
        </div>

        <F label="Devise" field="motto" placeholder="Ex : Le feu ne meurt jamais." />
        <F label="Description" field="description" rows={3} placeholder="Décris ton équipage..." />

        {/* Emoji picker */}
        <div style={{ marginBottom:14 }}>
          <label style={{ display:'block', fontSize:10, fontWeight:800, letterSpacing:'.1em', textTransform:'uppercase', color:'rgba(200,175,130,.55)', marginBottom:8 }}>Emblème</label>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {EMOJIS.map(e => (
              <button key={e} onClick={() => setForm(v=>({...v, emblem_emoji:e}))}
                style={{ width:36, height:36, borderRadius:6, background: form.emblem_emoji===e ? 'rgba(212,160,23,.2)' : 'rgba(0,0,0,.4)', border:`1px solid ${form.emblem_emoji===e ? 'rgba(212,160,23,.6)' : 'rgba(180,130,30,.2)'}`, cursor:'pointer', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center' }}>
                {e}
              </button>
            ))}
          </div>
        </div>

        {/* Color picker */}
        <div style={{ marginBottom:14 }}>
          <label style={{ display:'block', fontSize:10, fontWeight:800, letterSpacing:'.1em', textTransform:'uppercase', color:'rgba(200,175,130,.55)', marginBottom:8 }}>Couleur principale</label>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {COLORS_PRESETS.map(c => (
              <button key={c} onClick={() => setForm(v=>({...v, primary_color:c}))}
                style={{ width:28, height:28, borderRadius:'50%', background:c, border:`2px solid ${form.primary_color===c ? '#fff' : 'transparent'}`, cursor:'pointer', boxShadow: form.primary_color===c ? `0 0 10px ${c}` : 'none', transition:'all .15s' }} />
            ))}
            <input type="color" value={form.primary_color} onChange={e => setForm(v=>({...v,primary_color:e.target.value}))}
              style={{ width:28, height:28, border:'none', background:'none', cursor:'pointer', padding:0 }} title="Couleur personnalisée" />
          </div>
        </div>

        {/* Styles */}
        <div style={{ marginBottom:18 }}>
          <label style={{ display:'block', fontSize:10, fontWeight:800, letterSpacing:'.1em', textTransform:'uppercase', color:'rgba(200,175,130,.55)', marginBottom:8 }}>Style de l'équipage</label>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {Object.entries(STYLE_TAGS).map(([key,t]) => {
              const active = form.styles.includes(key)
              return (
                <button key={key} onClick={() => setForm(v=>({...v, styles: active ? v.styles.filter(s=>s!==key) : [...v.styles, key].slice(0,3)}))}
                  style={{ padding:'5px 12px', background:active?`${t.color}18`:'rgba(0,0,0,.35)', border:`1px solid ${active?`${t.color}50`:'rgba(180,130,30,.18)'}`, borderRadius:4, color:active?t.color:'rgba(180,150,100,.5)', fontSize:11, fontWeight:700, cursor:'pointer', transition:'all .15s' }}>
                  {t.icon} {t.label}
                </button>
              )
            })}
          </div>
        </div>

        <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', marginBottom:22 }}>
          <input type="checkbox" checked={form.is_recruiting} onChange={e=>setForm(v=>({...v,is_recruiting:e.target.checked}))} style={{ width:16, height:16 }} />
          <span style={{ fontSize:12, color:'rgba(200,175,130,.7)', fontWeight:600 }}>Ouvrir le recrutement dès maintenant</span>
        </label>

        <div style={{ display:'flex', gap:10 }}>
          <button disabled={busy} onClick={handleCreate}
            style={{ flex:1, padding:'13px', background:'linear-gradient(135deg, rgba(180,130,20,.28), rgba(140,90,10,.2))', border:'1px solid rgba(212,160,23,.5)', borderRadius:5, color:'#d4a017', fontSize:13, fontWeight:800, cursor:'pointer', letterSpacing:'.06em', textTransform:'uppercase', opacity:busy?.5:1 }}>
            {busy ? 'Création...' : '⚓ Lever le pavillon'}
          </button>
          <button onClick={onClose} style={{ padding:'13px 20px', background:'none', border:'1px solid rgba(180,130,30,.2)', borderRadius:5, color:'rgba(200,175,130,.5)', fontSize:12, fontWeight:600, cursor:'pointer' }}>Annuler</button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// APPLY MODAL
// ─────────────────────────────────────────────────────────────────────────────
function ApplyModal({ crew, onClose, onDone, discordId, displayName, avatarUrl }) {
  const [form, setForm] = useState({ message:'', specialty:'', availability:'', previousCrew:'', acceptsRules:false })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  if (!crew) return null
  const cc = crew.primary_color || '#d4a017'

  async function handleApply() {
    if (!form.message.trim()) return setErr('Écris un message de motivation.')
    if (!form.acceptsRules) return setErr('Tu dois accepter le règlement.')
    setBusy(true)
    const { error } = await applyToCrew({ crewId: crew.id, userId: discordId, username: displayName, avatarUrl, ...form })
    setBusy(false)
    if (error) setErr(error.message)
    else onDone()
  }

  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      style={{ position:'fixed', inset:0, zIndex:9200, background:'rgba(0,0,0,.92)', backdropFilter:'blur(10px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
      onClick={onClose}>
      <motion.div initial={{ scale:.9, y:20 }} animate={{ scale:1, y:0 }} exit={{ scale:.9 }}
        onClick={e=>e.stopPropagation()}
        style={{ width:'min(520px,100%)', background:'#120a03', border:`1px solid ${cc}35`, borderTop:`2px solid ${cc}55`, borderRadius:10, padding:'28px', boxShadow:'0 40px 100px rgba(0,0,0,.9)' }}>

        {/* Crew info */}
        <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:22, padding:'14px', background:'rgba(0,0,0,.35)', border:`1px solid ${cc}20`, borderRadius:6 }}>
          <div style={{ width:48, height:48, borderRadius:8, background:`${cc}14`, border:`1px solid ${cc}35`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24 }}>{crew.emblem_emoji||'🏴‍☠️'}</div>
          <div>
            <div style={{ fontFamily:'Pirata One, cursive', fontSize:18, color:'rgba(232,215,175,.9)' }}>{crew.name}</div>
            <div style={{ fontSize:11, color:`${cc}80`, marginTop:2 }}>« {crew.motto} »</div>
          </div>
        </div>

        <div style={{ fontFamily:'Pirata One, cursive', fontSize:22, color:'rgba(232,215,175,.9)', marginBottom:4 }}>📋 Candidature</div>
        <div style={{ fontSize:12, color:'rgba(180,150,100,.45)', marginBottom:20 }}>Convaincs le capitaine de t'accueillir à son bord.</div>

        {err && <div style={{ marginBottom:14, padding:'10px 14px', background:'rgba(224,82,74,.1)', border:'1px solid rgba(224,82,74,.3)', borderRadius:5, fontSize:12, color:'#f87171', fontWeight:600 }}>⚠ {err}</div>}

        {[
          { label:'Pourquoi tu veux rejoindre cet équipage ? *', field:'message', rows:4, placeholder:'Convaincs le capitaine...' },
          { label:'Ta spécialité / rôle souhaité', field:'specialty', placeholder:'Ex : Tireur d\'élite, Stratège...' },
          { label:'Ta disponibilité', field:'availability', placeholder:'Ex : Soir, week-end...' },
          { label:'Ancien équipage (si applicable)', field:'previousCrew', placeholder:'Ex : Les X, ou aucun' },
        ].map(f => (
          <div key={f.field} style={{ marginBottom:14 }}>
            <label style={{ display:'block', fontSize:10, fontWeight:800, letterSpacing:'.1em', textTransform:'uppercase', color:'rgba(200,175,130,.55)', marginBottom:6 }}>{f.label}</label>
            {f.rows ? (
              <textarea rows={f.rows} value={form[f.field]} onChange={e=>setForm(v=>({...v,[f.field]:e.target.value}))} placeholder={f.placeholder}
                style={{ width:'100%', padding:'10px 12px', background:'rgba(0,0,0,.5)', border:'1px solid rgba(180,130,30,.22)', borderRadius:5, color:'rgba(220,195,145,.9)', fontSize:13, resize:'vertical', outline:'none', boxSizing:'border-box', fontFamily:'inherit' }} />
            ) : (
              <input value={form[f.field]} onChange={e=>setForm(v=>({...v,[f.field]:e.target.value}))} placeholder={f.placeholder}
                style={{ width:'100%', padding:'10px 12px', background:'rgba(0,0,0,.5)', border:'1px solid rgba(180,130,30,.22)', borderRadius:5, color:'rgba(220,195,145,.9)', fontSize:13, outline:'none', boxSizing:'border-box' }} />
            )}
          </div>
        ))}

        <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', marginBottom:22 }}>
          <input type="checkbox" checked={form.acceptsRules} onChange={e=>setForm(v=>({...v,acceptsRules:e.target.checked}))} style={{ width:16, height:16 }} />
          <span style={{ fontSize:12, color:'rgba(200,175,130,.7)', fontWeight:600 }}>J'accepte le règlement de l'équipage et du serveur</span>
        </label>

        <div style={{ display:'flex', gap:10 }}>
          <button disabled={busy} onClick={handleApply}
            style={{ flex:1, padding:'13px', background:`rgba(${cc.replace('#','').match(/.{2}/g).map(h=>parseInt(h,16)).join(',')}, .15)`, border:`1px solid ${cc}50`, borderRadius:5, color:cc, fontSize:13, fontWeight:800, cursor:'pointer', letterSpacing:'.06em', textTransform:'uppercase', opacity:busy?.5:1 }}>
            {busy ? 'Envoi...' : '🏴‍☠️ Envoyer ma candidature'}
          </button>
          <button onClick={onClose} style={{ padding:'13px 20px', background:'none', border:'1px solid rgba(180,130,30,.2)', borderRadius:5, color:'rgba(200,175,130,.5)', fontSize:12, fontWeight:600, cursor:'pointer' }}>Annuler</button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// FILTER BAR
// ─────────────────────────────────────────────────────────────────────────────
function FilterBar({ search, setSearch, onlyRecruiting, setOnlyRecruiting, sortBy, setSortBy, selectedStyle, setSelectedStyle }) {
  return (
    <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center', padding:'14px 16px', background:'rgba(0,0,0,.45)', border:'1px solid rgba(180,130,30,.18)', borderRadius:8, backdropFilter:'blur(8px)' }}>
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Rechercher un équipage..."
        style={{ flex:'1 1 200px', padding:'9px 14px', background:'rgba(0,0,0,.5)', border:'1px solid rgba(180,130,30,.22)', borderRadius:5, color:'rgba(220,195,145,.9)', fontSize:13, outline:'none' }} />

      <button onClick={()=>setOnlyRecruiting(v=>!v)}
        style={{ padding:'9px 14px', background:onlyRecruiting?'rgba(52,211,153,.12)':'rgba(0,0,0,.4)', border:`1px solid ${onlyRecruiting?'rgba(52,211,153,.35)':'rgba(180,130,30,.2)'}`, borderRadius:5, color:onlyRecruiting?'#34d399':'rgba(180,150,100,.55)', fontSize:11, fontWeight:800, cursor:'pointer', letterSpacing:'.05em', textTransform:'uppercase', whiteSpace:'nowrap', transition:'all .15s' }}>
        {onlyRecruiting ? '✓ ' : ''}Recrute
      </button>

      <select value={sortBy} onChange={e=>setSortBy(e.target.value)}
        style={{ padding:'9px 12px', background:'rgba(0,0,0,.5)', border:'1px solid rgba(180,130,30,.22)', borderRadius:5, color:'rgba(220,195,145,.7)', fontSize:12, cursor:'pointer', outline:'none' }}>
        <option value="bounty">🏆 Meilleure prime</option>
        <option value="members">👥 Plus de membres</option>
        <option value="level">⭐ Niveau le plus haut</option>
        <option value="wins">🎖️ Plus de victoires</option>
        <option value="recent">🆕 Plus récent</option>
      </select>

      <select value={selectedStyle} onChange={e=>setSelectedStyle(e.target.value)}
        style={{ padding:'9px 12px', background:'rgba(0,0,0,.5)', border:'1px solid rgba(180,130,30,.22)', borderRadius:5, color:'rgba(220,195,145,.7)', fontSize:12, cursor:'pointer', outline:'none' }}>
        <option value="">Tous les styles</option>
        {Object.entries(STYLE_TAGS).map(([k,t])=><option key={k} value={k}>{t.icon} {t.label}</option>)}
      </select>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION TITLE
// ─────────────────────────────────────────────────────────────────────────────
function SectionHeading({ icon, title, sub }) {
  return (
    <div style={{ marginBottom:28 }}>
      <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:sub ? 8 : 0 }}>
        <div style={{ flex:1, height:1, background:'linear-gradient(90deg, rgba(180,130,30,.4), transparent)' }} />
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:22 }}>{icon}</span>
          <h2 style={{ fontFamily:'Pirata One, cursive', fontSize:'clamp(20px,3vw,28px)', color:'rgba(232,215,175,.93)', margin:0 }}>{title}</h2>
        </div>
        <div style={{ flex:1, height:1, background:'linear-gradient(90deg, transparent, rgba(180,130,30,.4))' }} />
      </div>
      {sub && <p style={{ textAlign:'center', fontSize:13, color:'rgba(180,150,100,.45)', margin:0 }}>{sub}</p>}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function ConstellationPage() {
  const navigate = useNavigate()
  const { isAuthenticated, discordId, displayName, avatarUrl, userId } = useAuth()

  const [crews, setCrews] = useState([])
  const [myMembership, setMyMembership] = useState(null)
  const [myCrew, setMyCrew] = useState(null)
  const [loading, setLoading] = useState(true)
  const [usingMock, setUsingMock] = useState(false)

  // Modals
  const [showCreate, setShowCreate] = useState(false)
  const [applyTarget, setApplyTarget] = useState(null)
  const [toast, setToast] = useState(null)

  // Filters
  const [search, setSearch] = useState('')
  const [onlyRecruiting, setOnlyRecruiting] = useState(false)
  const [sortBy, setSortBy] = useState('bounty')
  const [selectedStyle, setSelectedStyle] = useState('')

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true)
    const [realCrews, membership] = await Promise.all([
      fetchCrews(),
      isAuthenticated && discordId ? getUserCrewMembership(discordId) : Promise.resolve(null),
    ])
    const crewList = (realCrews && realCrews.length > 0) ? realCrews : MOCK_CREWS
    setUsingMock(!realCrews || realCrews.length === 0)
    setCrews(crewList)
    setMyMembership(membership)

    if (membership?.crew_id) {
      const mc = await fetchCrewById(membership.crew_id)
      setMyCrew(mc)
    }
    setLoading(false)
  }, [isAuthenticated, discordId])

  useEffect(() => {
    document.title = 'Équipages — Brams Community'
    loadData()
    return () => { document.title = 'Brams Community' }
  }, [loadData])

  // Filtered & sorted crews
  const filteredCrews = useMemo(() => {
    let list = [...crews]
    if (search) list = list.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || (c.tag||'').toLowerCase().includes(search.toLowerCase()))
    if (onlyRecruiting) list = list.filter(c => c.is_recruiting)
    if (selectedStyle) list = list.filter(c => (c.styles||[]).includes(selectedStyle))
    if (sortBy === 'bounty')   list.sort((a,b) => (b.total_bounty||0)-(a.total_bounty||0))
    if (sortBy === 'members')  list.sort((a,b) => (b.member_count||0)-(a.member_count||0))
    if (sortBy === 'level')    list.sort((a,b) => (b.level||0)-(a.level||0))
    if (sortBy === 'wins')     list.sort((a,b) => (b.wins||0)-(a.wins||0))
    if (sortBy === 'recent')   list.sort((a,b) => new Date(b.created_at)-new Date(a.created_at))
    return list
  }, [crews, search, onlyRecruiting, selectedStyle, sortBy])

  // Totals for hero stats
  const totalCrews = crews.length
  const totalMembers = crews.reduce((s,c) => s + (c.member_count||0), 0)
  const totalBounty = crews.reduce((s,c) => s + (c.total_bounty||0), 0)
  const openCrews = crews.filter(c => c.is_recruiting).length

  function showToast(msg, type='ok') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3200)
  }

  // ── LOADING ──
  if (loading) return (
    <div style={{ minHeight:'100vh', background:'#020711' }}>
      <Navbar />
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'calc(100vh - 80px)', gap:20 }}>
        <motion.div animate={{ rotate:360 }} transition={{ duration:2, repeat:Infinity, ease:'linear' }}
          style={{ width:44, height:44, border:'3px solid rgba(180,130,30,.15)', borderTopColor:'#d4a017', borderRadius:'50%' }} />
        <div style={{ fontFamily:'Pirata One, cursive', fontSize:16, color:'rgba(180,130,40,.6)', letterSpacing:'.1em' }}>Chargement des équipages…</div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'#020711', color:'rgba(232,215,175,.93)', fontFamily:'system-ui,-apple-system,sans-serif' }}>
      <Navbar />

      {/* Ambient BG */}
      <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0 }}>
        <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse 80% 40% at 50% 0%, rgba(180,130,20,.07) 0%, transparent 55%)' }} />
        <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse 50% 30% at 80% 80%, rgba(100,50,10,.04) 0%, transparent 50%)' }} />
        <div style={{ position:'absolute', top:0, left:0, right:0, height:1, background:'linear-gradient(90deg, transparent, rgba(180,130,30,.3), transparent)' }} />
      </div>

      <div style={{ position:'relative', zIndex:1 }}>

        {/* ═══════════════════════════════════════════════════════
            HERO CINÉMATIQUE
        ═══════════════════════════════════════════════════════ */}
        <div style={{ position:'relative', overflow:'hidden', minHeight:460, display:'flex', flexDirection:'column', justifyContent:'flex-end' }}>
          {/* Hero background */}
          <div style={{ position:'absolute', inset:0, background:'linear-gradient(180deg, #000c1e 0%, #020a18 50%, #020711 100%)' }} />
          <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse 100% 80% at 50% 20%, rgba(180,130,20,.12) 0%, transparent 60%)' }} />

          {/* Decorative vertical lines */}
          {[...Array(12)].map((_,i) => (
            <div key={i} style={{ position:'absolute', left:`${8+i*8}%`, top:0, bottom:0, width:1, background:'rgba(180,130,30,.025)', pointerEvents:'none' }} />
          ))}

          {/* Big compass bg */}
          <div style={{ position:'absolute', right:'-5%', top:'10%', width:340, height:340, opacity:.06, fontSize:340, lineHeight:1, pointerEvents:'none', userSelect:'none' }}>🧭</div>

          {/* Content */}
          <motion.div initial={{ opacity:0, y:30 }} animate={{ opacity:1, y:0 }} transition={{ duration:.7, ease:[.22,1,.36,1] }}
            style={{ position:'relative', maxWidth:1100, margin:'0 auto', padding:'120px clamp(16px,4vw,48px) 48px', width:'100%' }}>

            <div style={{ fontSize:10, fontWeight:900, letterSpacing:'.22em', textTransform:'uppercase', color:'rgba(180,130,30,.55)', marginBottom:14, display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ width:30, height:1, background:'rgba(180,130,30,.4)', display:'block' }} />
              GOUVERNEMENT MONDIAL — MARINE
              <span style={{ width:30, height:1, background:'rgba(180,130,30,.4)', display:'block' }} />
            </div>

            <h1 style={{ fontFamily:'Pirata One, cursive', fontSize:'clamp(42px,7vw,88px)', color:'rgba(232,215,175,.97)', lineHeight:.95, margin:'0 0 18px', textShadow:'0 8px 50px rgba(0,0,0,.8), 0 0 60px rgba(180,130,20,.12)' }}>
              QG des<br />Équipages
            </h1>

            <p style={{ fontSize:'clamp(13px,1.6vw,16px)', color:'rgba(200,175,130,.55)', maxWidth:560, lineHeight:1.7, marginBottom:28 }}>
              Forme ton équipage, recrute tes pirates, grimpe dans le classement
              et impose ton pavillon sur les sept mers de Brams.
            </p>

            {/* Hero stats */}
            <div style={{ display:'flex', flexWrap:'wrap', gap:12, marginBottom:32 }}>
              {[
                { icon:'🏴‍☠️', label:'Équipages', value:totalCrews },
                { icon:'⚔️',  label:'Pirates',   value:totalMembers },
                { icon:'💰',  label:'Primes',     value:fmtB(totalBounty)+' ฿', big:true },
                { icon:'🟢',  label:'Recrutent',  value:openCrews },
              ].map(s => (
                <div key={s.label} style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 16px', background:'rgba(0,0,0,.45)', border:'1px solid rgba(180,130,30,.18)', borderRadius:6, backdropFilter:'blur(4px)' }}>
                  <span style={{ fontSize:14 }}>{s.icon}</span>
                  <div>
                    <div style={{ fontSize: s.big ? 16 : 18, fontWeight:900, color:'rgba(232,215,175,.93)', fontFamily: s.big ? 'Pirata One, cursive' : 'inherit', lineHeight:1 }}>{s.value}</div>
                    <div style={{ fontSize:9, color:'rgba(180,150,100,.4)', textTransform:'uppercase', letterSpacing:'.1em', fontWeight:700 }}>{s.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div style={{ display:'flex', flexWrap:'wrap', gap:12 }}>
              {!myMembership && isAuthenticated && (
                <button onClick={() => setShowCreate(true)}
                  style={{ padding:'13px 28px', background:'linear-gradient(135deg, rgba(212,160,23,.28), rgba(160,100,10,.2))', border:'1px solid rgba(212,160,23,.5)', borderRadius:6, color:'#d4a017', fontSize:14, fontWeight:800, cursor:'pointer', letterSpacing:'.06em', textTransform:'uppercase', transition:'all .2s' }}
                  onMouseEnter={e => e.currentTarget.style.background='linear-gradient(135deg, rgba(212,160,23,.4), rgba(160,100,10,.3))'}
                  onMouseLeave={e => e.currentTarget.style.background='linear-gradient(135deg, rgba(212,160,23,.28), rgba(160,100,10,.2))'}>
                  ⚓ Créer mon équipage
                </button>
              )}
              {myMembership && myCrew && (
                <button onClick={() => navigate(`/equipage/${myMembership.crew_id}`)}
                  style={{ padding:'13px 28px', background:'linear-gradient(135deg, rgba(212,160,23,.28), rgba(160,100,10,.2))', border:'1px solid rgba(212,160,23,.5)', borderRadius:6, color:'#d4a017', fontSize:14, fontWeight:800, cursor:'pointer', letterSpacing:'.06em', textTransform:'uppercase' }}>
                  🏰 Mon QG — {myCrew.name}
                </button>
              )}
              <button onClick={() => document.getElementById('crew-grid')?.scrollIntoView({ behavior:'smooth' })}
                style={{ padding:'13px 28px', background:'rgba(0,0,0,.45)', border:'1px solid rgba(180,130,30,.28)', borderRadius:6, color:'rgba(200,175,130,.7)', fontSize:14, fontWeight:700, cursor:'pointer', letterSpacing:'.06em', textTransform:'uppercase' }}>
                🔍 Trouver un équipage
              </button>
              {!isAuthenticated && (
                <button onClick={() => document.dispatchEvent(new CustomEvent('open-auth-modal'))}
                  style={{ padding:'13px 28px', background:'rgba(52,211,153,.1)', border:'1px solid rgba(52,211,153,.3)', borderRadius:6, color:'#34d399', fontSize:14, fontWeight:800, cursor:'pointer', letterSpacing:'.06em', textTransform:'uppercase' }}>
                  Connexion Discord
                </button>
              )}
            </div>

          </motion.div>

          {/* Bottom fade */}
          <div style={{ position:'absolute', bottom:0, left:0, right:0, height:80, background:'linear-gradient(transparent, #020711)', pointerEvents:'none' }} />
        </div>

        {/* Content sections */}
        <div style={{ maxWidth:1100, margin:'0 auto', padding:'0 clamp(16px,4vw,48px) 100px', display:'flex', flexDirection:'column', gap:72 }}>

          {/* ═══ MON ÉQUIPAGE ═══ */}
          {isAuthenticated && (
            <section>
              <SectionHeading icon="⚓" title="Mon Équipage" sub={myMembership ? null : "Aucun pavillon ne flotte encore sous ton nom."} />

              {myMembership && myCrew ? (
                <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
                  style={{ background:'linear-gradient(145deg, rgba(12,8,3,.99) 0%, rgba(6,4,2,1) 100%)', border:`1px solid ${myCrew.primary_color||'#d4a017'}35`, borderTop:`2px solid ${myCrew.primary_color||'#d4a017'}60`, borderRadius:10, padding:'24px', position:'relative', overflow:'hidden' }}>
                  <div style={{ position:'absolute', top:0, left:0, right:0, height:80, background:`radial-gradient(ellipse 60% 100% at 50% 0%, ${myCrew.primary_color||'#d4a017'}10, transparent)`, pointerEvents:'none' }} />
                  <div style={{ display:'flex', flexWrap:'wrap', gap:20, alignItems:'center' }}>
                    <div style={{ width:70, height:70, borderRadius:10, background:`${myCrew.primary_color||'#d4a017'}14`, border:`2px solid ${myCrew.primary_color||'#d4a017'}45`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:34, flexShrink:0 }}>{myCrew.emblem_emoji||'🏴‍☠️'}</div>
                    <div style={{ flex:1, minWidth:200 }}>
                      <div style={{ fontFamily:'Pirata One, cursive', fontSize:26, color:'rgba(232,215,175,.95)', lineHeight:1, marginBottom:6 }}>{myCrew.name}</div>
                      {myCrew.motto && <div style={{ fontSize:13, color:`${myCrew.primary_color||'#d4a017'}70`, fontStyle:'italic', marginBottom:8 }}>« {myCrew.motto} »</div>}
                      <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                        <RecruitBadge open={myCrew.is_recruiting} />
                        <LevelBadge level={myCrew.level||1} color={myCrew.primary_color} />
                        <span style={{ fontSize:11, color:'rgba(180,150,100,.5)', fontWeight:600 }}>👥 {myCrew.member_count||0} membres</span>
                        <span style={{ fontFamily:'Pirata One, cursive', fontSize:13, color:myCrew.primary_color||'#d4a017' }}>💰 {fmtB(myCrew.total_bounty)} ฿</span>
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:10, flexShrink:0 }}>
                      <button onClick={() => navigate(`/equipage/${myMembership.crew_id}`)}
                        style={{ padding:'11px 22px', background:`${myCrew.primary_color||'#d4a017'}18`, border:`1px solid ${myCrew.primary_color||'#d4a017'}45`, borderRadius:6, color:myCrew.primary_color||'#d4a017', fontSize:13, fontWeight:800, cursor:'pointer', letterSpacing:'.05em', textTransform:'uppercase' }}>
                        🏰 Entrer dans le QG
                      </button>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }}
                  style={{ textAlign:'center', padding:'48px 20px', background:'linear-gradient(145deg, rgba(12,8,3,.98) 0%, rgba(6,4,2,1) 100%)', border:'1px dashed rgba(180,130,30,.2)', borderRadius:10 }}>
                  <div style={{ fontSize:52, marginBottom:16 }}>🏴‍☠️</div>
                  <div style={{ fontFamily:'Pirata One, cursive', fontSize:22, color:'rgba(232,215,175,.7)', marginBottom:8 }}>Aucun pavillon ne flotte encore sous ton nom</div>
                  <div style={{ fontSize:13, color:'rgba(180,150,100,.4)', lineHeight:1.7, maxWidth:400, margin:'0 auto 24px' }}>
                    Crée ton propre équipage et commence à recruter, ou rejoins un équipage existant pour commencer ta conquête.
                  </div>
                  <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
                    <button onClick={() => setShowCreate(true)}
                      style={{ padding:'11px 24px', background:'rgba(212,160,23,.18)', border:'1px solid rgba(212,160,23,.45)', borderRadius:6, color:'#d4a017', fontSize:13, fontWeight:800, cursor:'pointer', letterSpacing:'.05em', textTransform:'uppercase' }}>
                      ⚓ Créer mon équipage
                    </button>
                    <button onClick={() => document.getElementById('crew-grid')?.scrollIntoView({ behavior:'smooth' })}
                      style={{ padding:'11px 24px', background:'rgba(0,0,0,.4)', border:'1px solid rgba(180,130,30,.22)', borderRadius:6, color:'rgba(200,175,130,.6)', fontSize:13, fontWeight:700, cursor:'pointer', letterSpacing:'.05em', textTransform:'uppercase' }}>
                      🔍 Trouver un équipage
                    </button>
                  </div>
                </motion.div>
              )}
            </section>
          )}

          {/* ═══ TOP PODIUM ═══ */}
          {crews.length >= 3 && (
            <section>
              <SectionHeading icon="🏆" title="Top Équipages" sub="Les 3 équipages avec la plus forte prime totale" />
              <div style={{ background:'linear-gradient(145deg, rgba(12,8,3,.98) 0%, rgba(6,4,2,1) 100%)', border:'1px solid rgba(180,130,30,.18)', borderRadius:10, padding:'28px 20px 0', position:'relative', overflow:'hidden' }}>
                <div style={{ position:'absolute', top:-40, left:'50%', transform:'translateX(-50%)', width:300, height:300, borderRadius:'50%', background:'radial-gradient(circle, rgba(212,160,23,.06), transparent)', pointerEvents:'none' }} />
                <TopPodium crews={crews} />
              </div>
            </section>
          )}

          {/* ═══ GRILLE ÉQUIPAGES ═══ */}
          <section id="crew-grid">
            <SectionHeading icon="⚔️" title="Tous les Équipages" sub={`${filteredCrews.length} équipage${filteredCrews.length !== 1 ? 's' : ''} ${usingMock ? '— données de démo' : 'sur le serveur'}`} />

            {usingMock && (
              <div style={{ marginBottom:20, padding:'12px 16px', background:'rgba(245,158,11,.07)', border:'1px solid rgba(245,158,11,.2)', borderRadius:6, display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontSize:16 }}>📋</span>
                <div style={{ fontSize:12, color:'rgba(245,158,11,.8)', lineHeight:1.5 }}>
                  <strong>Données de démonstration</strong> — Aucun équipage n'est encore enregistré dans la base de données. <a href="/staff" style={{ color:'#fbbf24', textDecoration:'underline' }}>Créer le premier équipage</a> ou exécuter la migration SQL.
                </div>
              </div>
            )}

            <FilterBar search={search} setSearch={setSearch} onlyRecruiting={onlyRecruiting} setOnlyRecruiting={setOnlyRecruiting} sortBy={sortBy} setSortBy={setSortBy} selectedStyle={selectedStyle} setSelectedStyle={setSelectedStyle} />

            <div style={{ marginTop:20 }}>
              {filteredCrews.length === 0 ? (
                <div style={{ textAlign:'center', padding:'60px 20px', background:'linear-gradient(145deg, rgba(12,8,3,.98) 0%, rgba(6,4,2,1) 100%)', border:'1px solid rgba(180,130,30,.12)', borderRadius:10 }}>
                  <div style={{ fontSize:48, marginBottom:16 }}>🔍</div>
                  <div style={{ fontFamily:'Pirata One, cursive', fontSize:22, color:'rgba(232,215,175,.7)', marginBottom:8 }}>Aucun équipage trouvé</div>
                  <div style={{ fontSize:13, color:'rgba(180,150,100,.4)' }}>Aucun équipage ne correspond à ta recherche. Modifie tes filtres.</div>
                </div>
              ) : (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:18 }}>
                  {filteredCrews.map(crew => (
                    <CrewCard key={crew.id} crew={crew}
                      currentCrewId={myMembership?.crew_id}
                      onView={c => navigate(`/equipage/${c.id}`)}
                      onApply={c => isAuthenticated ? setApplyTarget(c) : document.dispatchEvent(new CustomEvent('open-auth-modal'))} />
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* ═══ CARTE MARITIME ═══ */}
          <section>
            <SectionHeading icon="🗺️" title="Carte des Territoires" sub="Réclame ta zone, domine les sept mers" />
            <MaritimeMapSection crews={crews} />
          </section>

          {/* ═══ COMMENT ÇA MARCHE ═══ */}
          <section>
            <SectionHeading icon="📖" title="Comment ça marche" sub="Cinq étapes pour dominer les sept mers" />
            <HowItWorks />
          </section>

          {/* ═══ ROADMAP ═══ */}
          <section>
            <SectionHeading icon="🚀" title="Fonctionnalités à Venir" sub="Le système équipage continue d'évoluer" />
            <RoadmapSection />
          </section>

          {/* ═══ FINAL CTA ═══ */}
          {!isAuthenticated && (
            <section>
              <div style={{ textAlign:'center', padding:'48px 24px', background:'linear-gradient(145deg, rgba(12,8,3,.99) 0%, rgba(6,4,2,1) 100%)', border:'1px solid rgba(212,160,23,.22)', borderRadius:10, position:'relative', overflow:'hidden' }}>
                <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse 60% 60% at 50% 50%, rgba(212,160,23,.05), transparent)', pointerEvents:'none' }} />
                <div style={{ fontSize:52, marginBottom:16 }}>⚓</div>
                <div style={{ fontFamily:'Pirata One, cursive', fontSize:28, color:'rgba(232,215,175,.93)', marginBottom:8 }}>Prêt à prendre la mer ?</div>
                <div style={{ fontSize:14, color:'rgba(180,150,100,.5)', maxWidth:380, margin:'0 auto 24px', lineHeight:1.7 }}>Connecte-toi avec Discord pour créer ou rejoindre un équipage et commencer ta conquête.</div>
                <button onClick={() => document.dispatchEvent(new CustomEvent('open-auth-modal'))}
                  style={{ padding:'14px 32px', background:'linear-gradient(135deg, rgba(212,160,23,.3), rgba(160,100,10,.22))', border:'1px solid rgba(212,160,23,.5)', borderRadius:6, color:'#d4a017', fontSize:14, fontWeight:800, cursor:'pointer', letterSpacing:'.07em', textTransform:'uppercase' }}>
                  ⚓ Connexion Discord
                </button>
              </div>
            </section>
          )}

        </div>
      </div>

      {/* ═══ MODALS ═══ */}
      <AnimatePresence>
        {showCreate && (
          <CreateCrewModal
            onClose={() => setShowCreate(false)}
            discordId={discordId}
            displayName={displayName}
            onDone={crew => {
              setShowCreate(false)
              showToast('✓ Équipage créé ! Bienvenue, capitaine.', 'ok')
              loadData()
              if (crew?.id) navigate(`/equipage/${crew.id}`)
            }} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {applyTarget && (
          <ApplyModal
            crew={applyTarget}
            discordId={discordId}
            displayName={displayName}
            avatarUrl={avatarUrl}
            onClose={() => setApplyTarget(null)}
            onDone={() => {
              setApplyTarget(null)
              showToast('✓ Candidature envoyée ! Le capitaine va l\'examiner.', 'ok')
            }} />
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity:0, y:30 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:20 }}
            style={{ position:'fixed', bottom:32, right:32, zIndex:9999, padding:'13px 20px', borderRadius:6, background: toast.type==='ok' ? 'rgba(52,211,153,.12)' : 'rgba(224,82,74,.1)', border:`1px solid ${toast.type==='ok' ? 'rgba(52,211,153,.3)' : 'rgba(224,82,74,.3)'}`, color: toast.type==='ok' ? '#34d399' : '#f87171', fontSize:14, fontWeight:700, boxShadow:'0 8px 32px rgba(0,0,0,.5)', maxWidth:320 }}>
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
