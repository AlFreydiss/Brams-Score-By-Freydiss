import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  fetchBlindTestLeaderboard,
  getBlindTestProfileId,
  isBlindTestGuestId,
  LOCAL_TRACKS,
} from '../lib/blindTest.js'
import { useAuth } from '../contexts/AuthContext.jsx'

const GOLD = '#d4a017'

const BT_CSS = `
  @keyframes btFadeUp  { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:none} }
  @keyframes btTwinkle { 0%,100%{opacity:.10} 50%{opacity:.65} }
  @keyframes btScan    { 0%{top:-2px} 100%{top:100%} }
`

function BTStars() {
  const stars = useMemo(() => Array.from({ length: 40 }, (_, i) => ({
    x:(i*39.1+7)%98, y:(i*43.7+13)%96, size:i%9===0?2.5:i%4===0?1.6:1,
    dur:2.8+(i*0.28)%4.5, del:(i*0.21)%7, gold:i%13===0,
  })), [])
  return (
    <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0 }}>
      {stars.map((s, i) => (
        <div key={i} style={{ position:'absolute', left:`${s.x}%`, top:`${s.y}%`, width:s.size, height:s.size, borderRadius:'50%', background:s.gold?'rgba(212,160,23,.65)':'rgba(255,255,255,.5)', animation:`btTwinkle ${s.dur}s ${s.del}s ease-in-out infinite` }} />
      ))}
    </div>
  )
}

const MEDAL = ['🥇', '🥈', '🥉']

function fallbackAvatar(seed) {
  return `https://api.dicebear.com/8.x/thumbs/svg?seed=${encodeURIComponent(seed || 'Pirate')}`
}

export default function BlindTestLeaderboard() {
  const navigate = useNavigate()
  const { user, discordId } = useAuth()
  const [rows, setRows]   = useState(null)

  useEffect(() => {
    fetchBlindTestLeaderboard(30).then(data => {
      setRows(Array.isArray(data) ? data : [])
    })
  }, [])

  return (
    <div style={{ minHeight:'100vh', background:'#07090e', position:'relative', overflowX:'hidden' }}>
      <style>{BT_CSS}</style>
      <BTStars />
      <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:1, overflow:'hidden' }}>
        <div style={{ position:'absolute', left:0, right:0, height:2, background:'linear-gradient(90deg,transparent,rgba(212,160,23,.12),transparent)', animation:'btScan 16s linear infinite' }} />
      </div>

      <div style={{ position:'relative', zIndex:2, maxWidth:720, margin:'0 auto', padding:'80px 20px 100px' }}>

        {/* Header */}
        <div style={{ textAlign:'center', marginBottom:48, animation:'btFadeUp .5s ease' }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'5px 18px', borderRadius:100, background:'rgba(212,160,23,0.10)', border:'1px solid rgba(212,160,23,0.28)', fontSize:10, fontWeight:800, letterSpacing:'.22em', color:GOLD, textTransform:'uppercase', marginBottom:22 }}>
            🏆 Classement
          </div>
          <h1 style={{ fontFamily:"'Pirata One',cursive", fontSize:'clamp(40px,7vw,72px)', color:'#fff', margin:'0 0 14px', lineHeight:1, letterSpacing:'-.02em' }}>
            Hall of Fame
          </h1>
          <p style={{ fontSize:14, color:'rgba(255,255,255,0.40)', margin:'0 auto 28px', lineHeight:1.7 }}>
            Les meilleurs détecteurs d'Opening de la communauté Brams.
          </p>
          <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
            <button onClick={() => navigate('/blind-test')} style={{ padding:'9px 20px', borderRadius:100, border:'1px solid rgba(212,160,23,0.40)', background:'rgba(212,160,23,0.10)', color:GOLD, fontSize:13, fontWeight:700, cursor:'pointer' }}>
              ← Jouer
            </button>
          </div>
        </div>

        {/* Leaderboard table */}
        {rows === null ? (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ height:64, borderRadius:12, background:'rgba(255,255,255,0.03)', animation:'btFadeUp 1.5s ease-in-out infinite' }} />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div style={{ textAlign:'center', padding:'60px 20px', background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:16 }}>
            <div style={{ fontSize:52, marginBottom:14 }}>🎵</div>
            <div style={{ fontSize:15, fontWeight:700, color:'rgba(255,255,255,0.55)', marginBottom:8 }}>Aucun score pour l'instant</div>
            <div style={{ fontSize:13, color:'rgba(255,255,255,0.30)' }}>Joue une partie pour lancer le Hall of Fame.</div>
            <button onClick={() => navigate('/blind-test')} style={{ marginTop:20, padding:'11px 26px', borderRadius:100, border:'none', background:`linear-gradient(135deg,${GOLD},#e5b83a)`, color:'#1a1200', fontSize:13, fontWeight:800, cursor:'pointer' }}>
              Jouer maintenant
            </button>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {rows.map((row, i) => {
              const rowUserId = String(row.user_id || '')
              const profileId = getBlindTestProfileId(row.user_id)
              const profileHref = profileId ? `/u/${profileId}` : null
              const isGuest = isBlindTestGuestId(row.user_id)
              const isMe = Boolean(user && (rowUserId === String(user.id || '') || rowUserId === String(discordId || '')))
              const medal = MEDAL[i]
              const topGold = i === 0 ? GOLD : i === 1 ? '#9ca3af' : i === 2 ? '#cd7f32' : null
              return (
                <div key={row.user_id} style={{
                  display:'flex', alignItems:'center', gap:14, padding:'14px 18px',
                  background: isMe ? 'rgba(212,160,23,0.08)' : 'rgba(255,255,255,0.025)',
                  border: `1px solid ${isMe ? 'rgba(212,160,23,0.35)' : 'rgba(255,255,255,0.07)'}`,
                  borderLeft: `3px solid ${topGold || (isMe ? GOLD : 'rgba(255,255,255,0.10)')}`,
                  borderRadius:12,
                  animation:`btFadeUp .4s ${i * 0.05}s ease both`,
                  transition:'all .18s',
                }}>
                  <div style={{ width:32, textAlign:'center', fontSize: medal ? 20 : 14, fontWeight:800, color:topGold || 'rgba(255,255,255,0.35)', flexShrink:0 }}>
                    {medal || `#${i + 1}`}
                  </div>
                  <img loading="lazy" decoding="async"
                    src={row.avatar_url || fallbackAvatar(row.display_name || row.user_id)}
                    alt=""
                    onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = fallbackAvatar(row.display_name || row.user_id) }}
                    style={{ width:36, height:36, borderRadius:'50%', objectFit:'cover', border:`1px solid ${topGold || 'rgba(255,255,255,0.12)'}`, flexShrink:0, background:'rgba(212,160,23,0.10)' }}
                  />
                  <button
                    onClick={() => profileHref && navigate(profileHref)}
                    disabled={!profileHref}
                    title={profileHref ? 'Ouvrir le profil' : isGuest ? 'Score invité' : 'Profil indisponible'}
                    style={{
                      flex:1, minWidth:0, textAlign:'left',
                      background:'none', border:'none', padding:0,
                      cursor: profileHref ? 'pointer' : 'default',
                    }}
                  >
                    <div style={{ fontSize:14, fontWeight:700, color: isMe ? GOLD : '#fff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {row.display_name || 'Pirate Anonyme'}{isMe ? ' (toi)' : ''}
                    </div>
                    <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)' }}>
                      {row.games_played} partie{row.games_played > 1 ? 's' : ''} · Streak max {row.streak_max}
                    </div>
                    <div style={{ fontSize:10, marginTop:4, color:profileHref ? 'rgba(255,211,145,0.58)' : 'rgba(255,255,255,0.24)', fontWeight:700 }}>
                      {profileHref ? 'Voir le profil' : isGuest ? 'Invité' : 'Profil indisponible'}
                    </div>
                  </button>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <div style={{ fontFamily:"'Pirata One',cursive", fontSize:20, fontWeight:900, color:topGold || GOLD }}>
                      {Number(row.score).toLocaleString('fr-FR')}
                    </div>
                    <div style={{ fontSize:9, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.30)', marginTop:2 }}>berries</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Tracks available */}
        <div style={{ marginTop:52 }}>
          <div style={{ fontSize:10, fontWeight:800, letterSpacing:'.22em', color:'rgba(255,255,255,0.30)', textTransform:'uppercase', marginBottom:16 }}>
            Tracks disponibles
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:8 }}>
            {LOCAL_TRACKS.map(t => (
              <div key={t.id} style={{ background:`linear-gradient(145deg,${t.color}12 0%,rgba(7,9,14,0.97) 100%)`, border:`1px solid ${t.color}20`, borderTop:`2px solid ${t.color}`, borderRadius:10, padding:'12px 14px', fontSize:11 }}>
                <div style={{ fontSize:20, marginBottom:6 }}>{t.emoji}</div>
                <div style={{ fontWeight:700, color:'#fff', marginBottom:2 }}>{t.anime}</div>
                <div style={{ color:'rgba(255,255,255,0.38)' }}>{t.title}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
