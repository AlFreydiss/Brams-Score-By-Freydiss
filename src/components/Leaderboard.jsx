import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useInView } from '../hooks/useInView.js'
import { useMediaQuery } from '../hooks/useMediaQuery.js'
import { fetchLeaderboard } from '../lib/supabase.js'
import { CINE, GOLD_GRAD, CineStyles, SectionHead, Reveal } from './home/cine.jsx'

// Paliers de rang Discord (heures vocales /7j). Les couleurs RGB d'origine ont été
// retirées de l'affichage : on ne garde que l'emoji + le seuil. Tout l'accent visuel
// passe désormais par les tons or/ivoire cinématiques (zéro RGB, zéro glow agressif).
const RANK_MAP = [
  { min:150, rang:'Roi des pirates', emoji:'🤴' },
  { min:70,  rang:'Yonkou',          emoji:'👑' },
  { min:40,  rang:'Amiral',          emoji:'🪖' },
  { min:25,  rang:'Shichibukai',     emoji:'⚔️' },
  { min:10,  rang:'Pirate',          emoji:'🏴‍☠️' },
  { min:0,   rang:'Moussaillon',     emoji:'⚓' },
]

const PERIODS    = ['Jour', 'Semaine', 'Mois', 'All-time']
const RANG_OPTS  = ['Tous', ...RANK_MAP.map(r => r.rang)]
const PERIOD_CONFIG = {
  Jour: { rpc: 'day', label: "aujourd'hui" },
  Semaine: { rpc: 'week', label: 'cette semaine' },
  Mois: { rpc: 'month', label: 'sur 30 jours' },
  'All-time': { rpc: 'all', label: 'depuis le debut' },
}

// Tiers d'or pour le podium : 1er le plus brillant, 2e/3e de plus en plus estompés.
const PODIUM_TONE = {
  1: { ring: CINE.goldHi,  text: CINE.goldHi, glow: 'rgba(216,189,126,0.30)', tag: '1ᵉʳ' },
  2: { ring: CINE.gold,    text: CINE.gold,   glow: 'rgba(191,164,106,0.20)', tag: '2ᵉ' },
  3: { ring: CINE.goldDim, text: 'rgba(191,164,106,0.78)', glow: 'rgba(191,164,106,0.12)', tag: '3ᵉ' },
}

function getRank(h) { return RANK_MAP.find(r => h >= r.min) ?? RANK_MAP[RANK_MAP.length-1] }
function fmt(n) { return n >= 1000000 ? `${(n/1000000).toFixed(1)}M` : n >= 1000 ? `${(n/1000).toFixed(0)}k` : String(n) }

const PER_PAGE = 12

export default function Leaderboard() {
  const navigate = useNavigate()
  const [allRows,    setAllRows]    = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [page,       setPage]       = useState(0)
  // Défaut 'Semaine' : les rangs Discord sont basés sur les heures vocales /7j,
  // donc le classement par semaine est cohérent avec les vrais rôles.
  const [period,     setPeriod]     = useState(() => localStorage.getItem('lb_period_v2') || 'Semaine')
  const [rangFilter, setRangFilter] = useState('Tous')
  const [showRangs,  setShowRangs]  = useState(false)
  const [ref, inView] = useInView()
  const isMobile = useMediaQuery('(max-width: 560px)')
  const isNarrow = useMediaQuery('(max-width: 980px)')

  useEffect(() => {
    let ignore = false
    let timer = null
    // silent=true : refresh en arrière-plan → on NE remet PAS le loading (sinon la
    // liste clignote/disparaît toutes les 15s) et on n'écrase pas avec un retour vide.
    const load = async (silent = false) => {
      if (!silent) setLoading(true)
      try {
        const data = await fetchLeaderboard(100, PERIOD_CONFIG[period]?.rpc || 'week')
        if (!ignore) {
          if (!silent || (data && data.length)) setAllRows(data || [])
          setLoading(false)
        }
      } catch {
        if (!ignore) setLoading(false)
      }
    }
    const loop = () => {
      clearTimeout(timer)
      timer = setTimeout(async () => {
        await load(true)
        loop()
      }, document.hidden ? 30000 : 15000)
    }
    load()
    loop()
    const onFocus = () => { if (!document.hidden) load(true) }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      ignore = true
      clearTimeout(timer)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [period])

  const handlePeriod = (p) => { setPeriod(p); localStorage.setItem('lb_period_v2', p); setPage(0) }

  // Tri garanti côté client par heures décroissantes (puis berrys) — filet de
  // sécurité si le RPC renvoie un ordre incorrect. La position (pos) est calculée
  // APRÈS le tri pour que le rang affiché soit toujours juste.
  const rawRows = useMemo(() => {
    if (!allRows) return []
    return [...allRows]
      .map(r => ({ ...r, vocal_h: parseFloat(r.vocal_h || 0), berrys: parseInt(r.berrys || 0) || 0 }))
      .sort((a, b) => b.vocal_h - a.vocal_h || b.berrys - a.berrys)
      .map((r, i) => ({ ...r, pos: i + 1 }))
  }, [allRows])

  const rows = useMemo(() =>
    rangFilter === 'Tous' ? rawRows : rawRows.filter(r => getRank(r.vocal_h).rang === rangFilter),
    [rangFilter, rawRows]
  )

  // Quand on filtre par rang, le podium n'a plus de sens (il afficherait 3 membres du
  // même rang) → on ne réserve le podium qu'à la vue "Tous". Sinon liste pleine largeur.
  const podiumMode = rangFilter === 'Tous'
  const top3 = podiumMode ? rows.slice(0, 3) : []
  // Réordonne pour l'affichage : 2e, 1er, 3e (1er surélevé au centre).
  const podiumOrder = top3.length === 3 ? [top3[1], top3[0], top3[2]] : top3

  const listSource = podiumMode ? rows.slice(3) : rows
  const totalPages = Math.max(1, Math.ceil(listSource.length / PER_PAGE))
  const display    = listSource.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE)

  const subLabel = PERIOD_CONFIG[period]?.label || 'cette semaine'

  return (
    <section style={{ position:'relative', width:'100%', paddingTop:'clamp(72px,10vh,132px)', paddingBottom:'clamp(72px,10vh,132px)' }}>
      <CineStyles />
      <div style={{ width:'100%', maxWidth:CINE.maxW, margin:'0 auto', padding:'0 clamp(20px,5vw,72px)', position:'relative', zIndex:1 }} ref={ref}>

        <SectionHead
          eyebrow="CLASSEMENT"
          title="Classement"
          accent="vocal"
          lead={`Les pirates les plus actifs en vocal ${subLabel}. Le temps de parole forge les rangs — du Moussaillon au Roi des pirates.`}
        />

        {/* Controls */}
        <Reveal delay={140}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:14, margin:'34px 0 30px' }}>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {PERIODS.map(p => {
                const on = p === period
                return (
                  <button key={p} onClick={() => handlePeriod(p)} style={{
                    padding:'9px 18px', borderRadius:999, fontSize:12.5, fontWeight:700, letterSpacing:'.04em',
                    fontFamily:CINE.title,
                    border:`1px solid ${on ? CINE.gold : CINE.hair}`,
                    background: on ? GOLD_GRAD : 'transparent',
                    color: on ? '#0b0a06' : CINE.muted,
                    cursor:'pointer', transition:'all .2s',
                  }}>{p}</button>
                )
              })}
            </div>

            <div style={{ position:'relative' }}>
              <button onClick={() => setShowRangs(v => !v)} style={{
                display:'flex', alignItems:'center', gap:10, padding:'9px 16px', borderRadius:999,
                fontSize:12.5, fontWeight:700, letterSpacing:'.04em', fontFamily:CINE.title,
                border:`1px solid ${rangFilter!=='Tous' ? CINE.gold : CINE.hairTop}`,
                background: CINE.panel, color: CINE.ink, cursor:'pointer', transition:'all .2s',
              }}>
                <span>{rangFilter === 'Tous' ? '⚔️ Filtrer par rang' : `${RANK_MAP.find(r=>r.rang===rangFilter)?.emoji??'⚓'} ${rangFilter}`}</span>
                <span style={{ fontSize:10, color:CINE.gold }}>{showRangs ? '▲' : '▼'}</span>
              </button>
              {showRangs && (
                <div style={{
                  position:'absolute', top:'calc(100% + 8px)', right:0, zIndex:30,
                  background:'#101116', border:`1px solid ${CINE.hairTop}`, borderRadius:14,
                  padding:6, minWidth:226, boxShadow:'0 18px 50px rgba(0,0,0,.55)',
                }}>
                  {RANG_OPTS.map(opt => {
                    const info = RANK_MAP.find(r => r.rang === opt)
                    const on = opt === rangFilter
                    return (
                      <button key={opt} onClick={() => { setRangFilter(opt); setShowRangs(false); setPage(0) }} style={{
                        display:'flex', alignItems:'center', gap:10, width:'100%', padding:'9px 12px',
                        borderRadius:9, border:'none',
                        background: on ? 'rgba(191,164,106,0.12)' : 'transparent',
                        color: on ? CINE.goldHi : CINE.ink, cursor:'pointer', fontSize:13, fontWeight:600,
                        fontFamily:CINE.body, textAlign:'left', transition:'background .15s',
                      }}>
                        <span>{info ? info.emoji : '🏴‍☠️'}</span>
                        {opt}
                        {info && <span style={{ marginLeft:'auto', fontSize:10.5, color:CINE.gold, opacity:.75, fontWeight:700 }}>{info.min}h+</span>}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </Reveal>

        {/* 2-COLUMN : podium gauche · liste droite */}
        <div style={{
          display:'grid',
          gridTemplateColumns: isNarrow ? '1fr' : 'minmax(360px, 0.92fr) minmax(0, 1.08fr)',
          gap: isNarrow ? 34 : 'clamp(28px, 3.5vw, 56px)',
          alignItems:'start',
        }}>

          {/* ── LEFT : PODIUM TOP 3 ── */}
          {podiumMode && (
            <Reveal delay={180}>
              <div style={{
                position:'relative', borderRadius:22, padding:isMobile ? '26px 18px 22px' : '34px 26px 28px',
                background:'linear-gradient(180deg, rgba(191,164,106,0.06), rgba(255,255,255,0.018))',
                border:`1px solid ${CINE.hairTop}`,
                boxShadow:'0 24px 64px rgba(0,0,0,0.4)',
              }}>
                <div style={{
                  fontFamily:CINE.title, fontSize:12, fontWeight:700, letterSpacing:'.22em',
                  textTransform:'uppercase', color:CINE.gold, textAlign:'center', marginBottom:24,
                }}>Le Podium</div>

                {loading ? (
                  <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'center', gap:14, height:230 }}>
                    {[150,210,120].map((h,i) => (
                      <div key={i} style={{ width:88, height:h, borderRadius:16, background:CINE.panel2, animation:'cinePulse 1.6s ease-in-out infinite', animationDelay:`${i*0.12}s` }} />
                    ))}
                  </div>
                ) : podiumOrder.length === 0 ? (
                  <p style={{ textAlign:'center', color:CINE.muted, fontFamily:CINE.body, fontSize:14, padding:'40px 0' }}>Aucun pirate au classement.</p>
                ) : (
                  <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'center', gap:isMobile ? 10 : 16 }}>
                    {podiumOrder.map((m) => {
                      const tone = PODIUM_TONE[m.pos] || PODIUM_TONE[3]
                      const first = m.pos === 1
                      const rk = getRank(m.vocal_h)
                      const av = first ? (isMobile ? 76 : 92) : (isMobile ? 56 : 68)
                      const colH = first ? (isMobile ? 84 : 104) : (m.pos === 2 ? (isMobile ? 56 : 70) : (isMobile ? 40 : 50))
                      return (
                        <div key={m.uid} onClick={() => navigate(`/u/${m.uid}`)}
                          style={{ flex:'0 1 auto', display:'flex', flexDirection:'column', alignItems:'center', cursor:'pointer', maxWidth:first ? 132 : 108 }}>
                          <div style={{
                            position:'relative', width:av, height:av, borderRadius:'50%',
                            border:`2px solid ${tone.ring}`, padding:3,
                            boxShadow:`0 0 0 1px rgba(0,0,0,0.4), 0 10px 30px ${tone.glow}`,
                            background:'#0c0d12', marginBottom:12,
                          }}>
                            <div style={{ width:'100%', height:'100%', borderRadius:'50%', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', fontSize:first?30:22, background:'rgba(191,164,106,0.07)' }}>
                              {m.avatar_url
                                ? <img src={m.avatar_url} alt="" width={av} height={av} loading="lazy" decoding="async" style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e=>{e.currentTarget.style.display='none';e.currentTarget.nextSibling.style.display='flex'}} />
                                : null}
                              <span style={{ display:m.avatar_url?'none':'flex' }}>{rk.emoji}</span>
                            </div>
                            <div style={{
                              position:'absolute', top:-8, left:'50%', transform:'translateX(-50%)',
                              fontFamily:CINE.title, fontSize:first?13:11, fontWeight:700, color:'#0b0a06',
                              background: first ? GOLD_GRAD : tone.ring, padding:'2px 9px', borderRadius:999,
                              whiteSpace:'nowrap', boxShadow:'0 4px 12px rgba(0,0,0,0.4)',
                            }}>{tone.tag}</div>
                          </div>
                          <div style={{ fontFamily:CINE.body, fontWeight:700, fontSize:first?15:13, color:CINE.ink, textAlign:'center', maxWidth:'100%', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', width:first?120:96 }}>
                            {m.username || `Pirate #${m.uid.slice(-5)}`}
                          </div>
                          <div style={{ fontFamily:CINE.title, fontWeight:700, fontSize:first?20:16, color:tone.text, marginTop:3, letterSpacing:'-0.02em' }}>
                            {m.vocal_h}h
                          </div>
                          <div style={{ fontFamily:CINE.body, fontSize:11, color:CINE.gold, fontWeight:600, marginTop:1 }}>{fmt(m.berrys)} ฿</div>
                          <div style={{
                            width:first ? (isMobile?94:108) : (isMobile?72:86), height:colH, marginTop:12,
                            borderRadius:'10px 10px 0 0',
                            background: first
                              ? 'linear-gradient(180deg, rgba(216,189,126,0.28), rgba(191,164,106,0.04))'
                              : 'linear-gradient(180deg, rgba(191,164,106,0.16), rgba(191,164,106,0.02))',
                            border:`1px solid ${CINE.hair}`, borderBottom:'none',
                            display:'flex', alignItems:'flex-start', justifyContent:'center', paddingTop:8,
                            fontFamily:CINE.title, fontWeight:700, fontSize:first?26:18, color:tone.text, opacity:.9,
                          }}>{m.pos}</div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </Reveal>
          )}

          {/* ── RIGHT : RANKED LIST ── */}
          <Reveal delay={220} style={podiumMode ? undefined : { gridColumn:'1 / -1' }}>
            <div>
              {/* Header */}
              <div style={{
                display:'grid', gridTemplateColumns:isMobile ? '40px minmax(0,1fr) auto' : '54px minmax(0,1fr) 96px 110px',
                padding:isMobile ? '0 12px 10px' : '0 22px 12px', fontFamily:CINE.title,
                fontSize:11, fontWeight:700, letterSpacing:'.14em', textTransform:'uppercase', color:CINE.faint, gap:12,
              }}>
                <span>#</span><span>Membre</span>
                <span style={{ textAlign:'right' }}>{isMobile ? 'Stats' : 'Heures'}</span>
                {!isMobile && <span style={{ textAlign:'right' }}>Berrys</span>}
              </div>

              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {loading
                  ? Array.from({length:8}).map((_,i) => (
                      <div key={i} style={{ height:isMobile ? 58 : 64, borderRadius:14, background:CINE.panel, border:`1px solid ${CINE.hair}`, animation:'cinePulse 1.6s ease-in-out infinite', animationDelay:`${i*0.08}s` }} />
                    ))
                  : display.length === 0
                    ? <p style={{ textAlign:'center', color:CINE.muted, fontFamily:CINE.body, fontSize:14, padding:'40px 0' }}>Aucun pirate sur cette page.</p>
                    : display.map((m, i) => {
                        const rk = getRank(m.vocal_h)
                        const me = m.is_me === true
                        const avatarSize = isMobile ? 36 : 40
                        return (
                          <div key={m.uid}
                            onClick={() => navigate(`/u/${m.uid}`)}
                            style={{
                              display:'grid',
                              gridTemplateColumns:isMobile ? '40px minmax(0,1fr) auto' : '54px minmax(0,1fr) 96px 110px',
                              alignItems:'center', gap:12, borderRadius:14, padding:isMobile ? '11px 12px' : '13px 22px',
                              minWidth:0, overflow:'hidden',
                              background: me ? 'linear-gradient(90deg, rgba(191,164,106,0.12), rgba(255,255,255,0.02))' : CINE.panel,
                              border:`1px solid ${me ? CINE.gold : CINE.hair}`,
                              cursor:'pointer', transition:'transform .2s, border-color .2s, background .2s',
                            }}
                            onMouseEnter={e=>{ if (isMobile) return; e.currentTarget.style.transform='translateX(4px)'; e.currentTarget.style.borderColor=CINE.hairTop; e.currentTarget.style.background=CINE.panel2 }}
                            onMouseLeave={e=>{ e.currentTarget.style.transform='translateX(0)'; e.currentTarget.style.borderColor=me?CINE.gold:CINE.hair; e.currentTarget.style.background=me?'linear-gradient(90deg, rgba(191,164,106,0.12), rgba(255,255,255,0.02))':CINE.panel }}
                          >
                            <span style={{ fontFamily:CINE.title, fontSize:isMobile ? 15 : 17, fontWeight:700, color:CINE.faint }}>
                              {m.pos}
                            </span>

                            <div style={{ display:'flex', alignItems:'center', gap:isMobile ? 10 : 13, minWidth:0, overflow:'hidden' }}>
                              <div style={{
                                width:avatarSize, height:avatarSize, borderRadius:'50%', flexShrink:0,
                                background:'rgba(191,164,106,0.08)', border:`1px solid ${CINE.hairTop}`, overflow:'hidden',
                                display:'flex', alignItems:'center', justifyContent:'center', fontSize:16,
                              }}>
                                {m.avatar_url
                                  ? <img src={m.avatar_url} alt="" width={avatarSize} height={avatarSize} loading="lazy" decoding="async" style={{ width:avatarSize, height:avatarSize, objectFit:'cover', borderRadius:'50%' }} onError={e=>{e.currentTarget.style.display='none';e.currentTarget.nextSibling.style.display='flex'}} />
                                  : null}
                                <span style={{ display:m.avatar_url?'none':'flex' }}>{rk.emoji}</span>
                              </div>
                              <div style={{ minWidth:0, overflow:'hidden' }}>
                                <div style={{ fontFamily:CINE.body, fontWeight:600, fontSize:isMobile ? 13.5 : 14.5, color:CINE.ink, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                                  {m.username || `Pirate #${m.uid.slice(-5)}`}{me && <span style={{ color:CINE.gold, fontWeight:700 }}> · toi</span>}
                                </div>
                                <div style={{ fontFamily:CINE.body, fontSize:isMobile ? 10.5 : 11.5, color:CINE.muted, fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{rk.emoji} {rk.rang}</div>
                              </div>
                            </div>

                            <div style={{ textAlign:'right', minWidth:0 }}>
                              <div style={{ fontFamily:CINE.title, fontWeight:700, fontSize:isMobile ? 14 : 15.5, color:CINE.ink, whiteSpace:'nowrap' }}>{m.vocal_h}h</div>
                              {isMobile && <div style={{ fontFamily:CINE.body, fontWeight:600, fontSize:11.5, color:CINE.gold, whiteSpace:'nowrap', marginTop:1 }}>{fmt(m.berrys)} ฿</div>}
                            </div>
                            {!isMobile && <div style={{ textAlign:'right', fontFamily:CINE.body, fontWeight:600, fontSize:14, color:CINE.gold }}>{fmt(m.berrys)} ฿</div>}
                          </div>
                        )
                      })
                }
              </div>

              {/* Pagination */}
              {!loading && totalPages > 1 && (
                <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginTop:28, flexWrap:'wrap' }}>
                  <button onClick={() => setPage(p => Math.max(0, p-1))} disabled={page === 0} style={{
                    padding:'9px 18px', borderRadius:10, fontFamily:CINE.title, fontSize:13.5, fontWeight:600,
                    border:`1px solid ${CINE.hair}`,
                    background: page===0 ? 'transparent' : CINE.panel,
                    color: page===0 ? CINE.faint : CINE.ink, cursor: page===0 ? 'not-allowed' : 'pointer', transition:'all .2s',
                  }}>← Préc</button>

                  <div style={{ display:'flex', gap:5, maxWidth:'100%', overflowX:'auto', padding:'2px 0' }}>
                    {Array.from({length:totalPages}).map((_,i) => {
                      const on = i === page
                      return (
                        <button key={i} onClick={() => setPage(i)} style={{
                          width:34, height:34, borderRadius:9, fontFamily:CINE.title, fontSize:13, fontWeight:700,
                          border:`1px solid ${on ? CINE.gold : CINE.hair}`,
                          background: on ? GOLD_GRAD : 'transparent',
                          color: on ? '#0b0a06' : CINE.muted, cursor:'pointer', transition:'all .2s',
                        }}>{i+1}</button>
                      )
                    })}
                  </div>

                  <button onClick={() => setPage(p => Math.min(totalPages-1, p+1))} disabled={page === totalPages-1} style={{
                    padding:'9px 18px', borderRadius:10, fontFamily:CINE.title, fontSize:13.5, fontWeight:600,
                    border:`1px solid ${CINE.hair}`,
                    background: page===totalPages-1 ? 'transparent' : CINE.panel,
                    color: page===totalPages-1 ? CINE.faint : CINE.ink, cursor: page===totalPages-1 ? 'not-allowed' : 'pointer', transition:'all .2s',
                  }}>Suiv →</button>
                </div>
              )}

              <p style={{ textAlign:'center', marginTop:18, fontFamily:CINE.body, fontSize:12, color:CINE.faint }}>
                Page {page+1}/{totalPages} · Mis à jour toutes les heures · Parle en vocal pour apparaître ici
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
