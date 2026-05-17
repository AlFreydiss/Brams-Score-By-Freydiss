import { useState, useEffect, useRef, useMemo } from 'react'
import { supabase } from '../lib/supabase.js'

const ROLE_LEVEL = {
  capitaine:   0,
  second:      1,
  navigateur:  1,
  sniper:      1,
  cuisinier:   1,
  medecin:     1,
  bretteur:    1,
  charpentier: 1,
  archeologue: 1,
  musicien:    2,
  timonier:    2,
  mousse:      2,
}

const ROLE_COLORS = {
  capitaine:   '#b91c1c',
  second:      '#1e3a8a',
  navigateur:  '#166534',
  sniper:      '#78350f',
  cuisinier:   '#831843',
  medecin:     '#164e63',
  bretteur:    '#312e81',
  charpentier: '#713f12',
  archeologue: '#1e40af',
  musicien:    '#4c1d95',
  timonier:    '#064e3b',
  mousse:      '#1f2937',
}

const ROLE_LABELS = {
  capitaine:   'Capitaine',
  second:      'Second',
  navigateur:  'Navigateur',
  sniper:      'Sniper',
  cuisinier:   'Cuisinier',
  medecin:     'Médecin',
  bretteur:    'Bretteur',
  charpentier: 'Charpentier',
  archeologue: 'Archéologue',
  musicien:    'Musicien',
  timonier:    'Timonier',
  mousse:      'Mousse',
}

function fmtBounty(n) {
  if (n == null || n === 0) return '??? ฿'
  n = parseInt(n)
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)} Md ฿`
  if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(0)} M ฿`
  if (n >= 1_000)         return `${(n / 1_000).toFixed(0)} k ฿`
  return `${n} ฿`
}

function defaultAvatar(userId) {
  return `https://cdn.discordapp.com/embed/avatars/${parseInt(userId) % 5}.png`
}

function computeLayout(members, cw, ch) {
  if (!members.length) return []
  const cx = cw / 2
  const cy = ch / 2
  const minDim = Math.min(cw, ch)

  const cap      = members.filter(m => ROLE_LEVEL[m.position] === 0)
  const officers = members.filter(m => ROLE_LEVEL[m.position] === 1)
  const crew     = members.filter(m => ROLE_LEVEL[m.position] === 2 || ROLE_LEVEL[m.position] == null)

  const result = []

  cap.forEach((m, i) => {
    const angle = cap.length > 1 ? (i / cap.length) * Math.PI * 2 - Math.PI / 2 : 0
    const r = cap.length > 1 ? minDim * 0.06 : 0
    result.push({ ...m, x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r, scale: 1.15 })
  })

  const r1 = minDim * 0.28
  officers.forEach((m, i) => {
    const angle = (i / Math.max(officers.length, 1)) * Math.PI * 2 - Math.PI / 2
    result.push({ ...m, x: cx + Math.cos(angle) * r1, y: cy + Math.sin(angle) * r1, scale: 0.85 })
  })

  const r2 = minDim * 0.46
  crew.forEach((m, i) => {
    const angle = (i / Math.max(crew.length, 1)) * Math.PI * 2 - Math.PI / 2
    result.push({ ...m, x: cx + Math.cos(angle) * r2, y: cy + Math.sin(angle) * r2, scale: 0.68 })
  })

  return result
}

function StarField() {
  const stars = useMemo(() => (
    Array.from({ length: 160 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      r: Math.random() * 1.4 + 0.4,
      o: Math.random() * 0.55 + 0.15,
    }))
  ), [])

  return (
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
      {stars.map((s, i) => (
        <circle key={i} cx={`${s.x}%`} cy={`${s.y}%`} r={s.r} fill="#fff" opacity={s.o} />
      ))}
    </svg>
  )
}

function WantedCard({ member, scale }) {
  const [imgErr, setImgErr] = useState(false)
  const color = ROLE_COLORS[member.position] || '#1f2937'
  const label = ROLE_LABELS[member.position] || member.position || 'Mousse'
  const pw = Math.round(176 * scale)
  const ph = Math.round(234 * scale)
  const avatarSize = Math.round(96 * scale)
  const borderW = Math.max(1, Math.round(2 * scale))

  const avatarSrc = member.avatar_url && !imgErr
    ? member.avatar_url
    : defaultAvatar(member.user_id)

  return (
    <div style={{
      width: pw, height: ph,
      background: 'linear-gradient(160deg, #2a1f0d 0%, #19110a 100%)',
      border: `${borderW}px solid #8B6914`,
      borderRadius: Math.round(6 * scale),
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: `${Math.round(10 * scale)}px ${Math.round(8 * scale)}px`,
      boxShadow: `0 0 ${Math.round(28 * scale)}px rgba(139,105,20,0.45), 0 ${Math.round(6 * scale)}px ${Math.round(24 * scale)}px rgba(0,0,0,0.7)`,
      fontFamily: 'serif',
      position: 'relative',
      boxSizing: 'border-box',
    }}>
      {/* Gold corner accents */}
      {[['top',8,'left',8],['top',8,'right',8],['bottom',8,'left',8],['bottom',8,'right',8]].map(([v,vo,h,ho], i) => (
        <div key={i} style={{
          position: 'absolute', [v]: vo, [h]: ho,
          width: Math.round(10 * scale), height: Math.round(10 * scale),
          borderTop: v === 'top' ? `1px solid #FFD700` : 'none',
          borderBottom: v === 'bottom' ? `1px solid #FFD700` : 'none',
          borderLeft: h === 'left' ? `1px solid #FFD700` : 'none',
          borderRight: h === 'right' ? `1px solid #FFD700` : 'none',
        }} />
      ))}

      <div style={{ fontSize: Math.round(6.5 * scale), letterSpacing: '.22em', color: '#8B6914', marginBottom: 1, textAlign: 'center' }}>
        AVIS DE RECHERCHE
      </div>
      <div style={{
        fontSize: Math.round(24 * scale), lineHeight: 1,
        color: '#FFD700',
        fontFamily: 'var(--pirate, "Palatino Linotype", serif)',
        textShadow: `0 0 ${Math.round(10 * scale)}px rgba(255,215,0,0.5)`,
        marginBottom: Math.round(6 * scale),
        textAlign: 'center',
      }}>
        WANTED
      </div>

      <div style={{
        width: avatarSize, height: avatarSize,
        border: `${borderW}px solid #8B6914`,
        borderRadius: Math.round(3 * scale),
        overflow: 'hidden',
        marginBottom: Math.round(6 * scale),
        background: `${color}30`,
        flexShrink: 0,
      }}>
        <img
          src={avatarSrc}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          onError={() => setImgErr(true)}
        />
      </div>

      <div style={{
        fontSize: Math.round(9.5 * scale), fontWeight: 700, color: '#fff',
        textAlign: 'center', lineHeight: 1.2,
        maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        marginBottom: Math.round(3 * scale),
      }}>
        {member.username || `Pirate #${String(member.user_id).slice(-4)}`}
      </div>

      <div style={{
        fontSize: Math.round(7 * scale), color: '#FFD700', letterSpacing: '.08em',
        textAlign: 'center', marginBottom: Math.round(3 * scale),
      }}>
        {label.toUpperCase()}
      </div>

      <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, #8B691460, transparent)', width: '80%', marginBottom: Math.round(3 * scale) }} />

      <div style={{ fontSize: Math.round(7.5 * scale), color: '#e2c97e', textAlign: 'center' }}>
        {fmtBounty(member.contribution)}
      </div>
    </div>
  )
}

export default function ConstellationPage() {
  const [crews,      setCrews]      = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [crew,       setCrew]       = useState(null)
  const [members,    setMembers]    = useState([])
  const [nameMap,    setNameMap]    = useState({})
  const [loading,    setLoading]    = useState(true)
  const [err,        setErr]        = useState(null)
  const [hovered,    setHovered]    = useState(null)
  const containerRef = useRef(null)
  const [dims, setDims] = useState({ w: 900, h: 600 })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      setDims({ w: entry.contentRect.width, h: entry.contentRect.height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Pre-load leaderboard for names/avatars
  useEffect(() => {
    if (!supabase) return
    supabase.rpc('top_classement', { p_limit: 500 }).then(({ data }) => {
      if (!data) return
      const map = {}
      data.forEach(m => { map[String(m.uid)] = m })
      setNameMap(map)
    })
  }, [])

  // Fetch crews
  useEffect(() => {
    if (!supabase) { setErr('Supabase non initialisé'); setLoading(false); return }
    supabase
      .from('crews')
      .select('id, name, tag, level, total_bounty, captain_id')
      .order('total_bounty', { ascending: false })
      .then(({ data, error }) => {
        if (error) { setErr(error.message); setLoading(false); return }
        setCrews(data || [])
        if (data?.length) setSelectedId(data[0].id)
        else setLoading(false)
      })
  }, [])

  // Fetch members when crew changes
  useEffect(() => {
    if (!selectedId || !supabase) return
    setLoading(true)
    setCrew(crews.find(c => c.id === selectedId) || null)
    supabase
      .from('crew_members')
      .select('*')
      .eq('crew_id', selectedId)
      .order('contribution', { ascending: false })
      .then(({ data, error }) => {
        if (error) { setErr(error.message); setLoading(false); return }
        setMembers(data || [])
        setLoading(false)
      })
  }, [selectedId, crews])

  const enriched = useMemo(() => (
    members.map(m => ({
      ...m,
      username:   nameMap[String(m.user_id)]?.username  || null,
      avatar_url: nameMap[String(m.user_id)]?.avatar_url || null,
    }))
  ), [members, nameMap])

  const CANVAS_H = 620
  const positioned = useMemo(
    () => computeLayout(enriched, dims.w || 900, CANVAS_H),
    [enriched, dims.w]
  )

  const capMember = positioned.find(m => ROLE_LEVEL[m.position] === 0)

  return (
    <div style={{ minHeight: '100vh', background: '#050508', color: '#fff', paddingTop: 80 }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 24px 64px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 11, letterSpacing: '.4em', color: '#8B6914', marginBottom: 8 }}>
            MARINE — AVIS DE RECHERCHE OFFICIELS
          </div>
          <h1 style={{
            margin: 0, fontSize: 'clamp(28px, 5vw, 48px)',
            fontFamily: 'var(--pirate, "Palatino Linotype", serif)',
            color: '#FFD700',
            textShadow: '0 0 40px rgba(255,215,0,0.35)',
          }}>
            Constellation des Équipages
          </h1>
          <p style={{ color: '#8B6914', marginTop: 8, fontSize: 13 }}>
            Ces pirates sèment la terreur dans le Grand Line — primes émises par le Gouvernement Mondial
          </p>
        </div>

        {/* Crew selector */}
        {crews.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 28 }}>
            {crews.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                style={{
                  padding: '8px 18px',
                  background: selectedId === c.id ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.04)',
                  border: `2px solid ${selectedId === c.id ? '#FFD700' : 'rgba(139,105,20,0.35)'}`,
                  borderRadius: 6,
                  color: selectedId === c.id ? '#FFD700' : '#888',
                  cursor: 'pointer',
                  fontFamily: 'var(--pirate, serif)',
                  fontSize: 13,
                  transition: 'all .15s',
                  whiteSpace: 'nowrap',
                }}
              >
                [{c.tag}] {c.name}
              </button>
            ))}
          </div>
        )}

        {/* Constellation canvas */}
        <div
          ref={containerRef}
          style={{
            position: 'relative',
            width: '100%',
            height: CANVAS_H,
            background: 'radial-gradient(ellipse at 50% 40%, #0c0a24 0%, #070510 50%, #050508 100%)',
            borderRadius: 16,
            border: '1px solid rgba(139,105,20,0.25)',
            overflow: 'hidden',
            marginBottom: 32,
          }}
        >
          <StarField />

          {/* Ambient center glow */}
          <div style={{
            position: 'absolute',
            left: '50%', top: '50%',
            transform: 'translate(-50%, -50%)',
            width: 300, height: 300,
            background: 'radial-gradient(circle, rgba(255,215,0,0.06) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          {loading && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ color: '#FFD700', fontSize: 16, letterSpacing: '.1em' }}>Chargement...</div>
            </div>
          )}

          {!loading && err && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ color: '#f87171', fontSize: 15 }}>{err}</div>
            </div>
          )}

          {!loading && !err && positioned.length === 0 && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ color: '#8B6914', fontSize: 15 }}>Aucun membre dans cet équipage.</div>
            </div>
          )}

          {/* SVG constellation lines */}
          {!loading && positioned.length > 0 && capMember && (
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}>
              <defs>
                <filter id="lineglow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="2.5" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              {positioned.map((m, i) => {
                if (m.position === 'capitaine') return null
                const isOfficer = ROLE_LEVEL[m.position] === 1
                return (
                  <line
                    key={i}
                    x1={capMember.x} y1={capMember.y}
                    x2={m.x} y2={m.y}
                    stroke={isOfficer ? 'rgba(255,215,0,0.4)' : 'rgba(180,180,255,0.12)'}
                    strokeWidth={isOfficer ? 1.5 : 0.7}
                    strokeDasharray={isOfficer ? undefined : '4 6'}
                    filter={isOfficer ? 'url(#lineglow)' : undefined}
                  />
                )
              })}
            </svg>
          )}

          {/* Wanted posters */}
          {!loading && positioned.map((m, i) => {
            const pw = Math.round(176 * m.scale)
            const ph = Math.round(234 * m.scale)
            const isHov = hovered === i
            return (
              <div
                key={i}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  position: 'absolute',
                  left: m.x - pw / 2,
                  top: m.y - ph / 2,
                  zIndex: isHov ? 10 : (ROLE_LEVEL[m.position] === 0 ? 5 : 2),
                  transform: isHov ? 'scale(1.08)' : 'scale(1)',
                  transition: 'transform .18s ease, z-index 0s',
                  cursor: 'pointer',
                  filter: isHov ? 'drop-shadow(0 0 16px rgba(255,215,0,0.6))' : 'none',
                }}
              >
                <WantedCard member={m} scale={m.scale} />
              </div>
            )
          })}
        </div>

        {/* Crew stats bar */}
        {crew && !loading && (
          <div style={{
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            gap: 'clamp(16px, 3vw, 48px)', flexWrap: 'wrap',
            padding: '16px 24px',
            background: 'rgba(139,105,20,0.08)',
            border: '1px solid rgba(139,105,20,0.2)',
            borderRadius: 10,
            fontSize: 13,
          }}>
            <span style={{ fontFamily: 'var(--pirate, serif)', fontSize: 18, color: '#FFD700' }}>
              [{crew.tag}] {crew.name}
            </span>
            <span style={{ color: '#8B6914' }}>|</span>
            <span style={{ color: '#aaa' }}>Lvl <strong style={{ color: '#fff' }}>{crew.level}</strong></span>
            <span style={{ color: '#8B6914' }}>|</span>
            <span style={{ color: '#aaa' }}>Prime totale : <strong style={{ color: '#FFD700' }}>{fmtBounty(crew.total_bounty)}</strong></span>
            <span style={{ color: '#8B6914' }}>|</span>
            <span style={{ color: '#aaa' }}><strong style={{ color: '#fff' }}>{members.length}</strong> pirate{members.length !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>
    </div>
  )
}
