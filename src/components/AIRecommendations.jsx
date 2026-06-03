import { useState, useMemo, useCallback, useEffect, memo } from 'react'

/**
 * « Recommandé par l'IA pour toi » — module de recommandation Phase 1 (règles + similarité genres).
 *
 * Le navigateur ne peut pas appeler Ruflo (MCP) directement : les feedbacks 👍/👎 sont
 * persistés en localStorage ET empilés dans une file `brams_ruflo_feedback_queue` que
 * Claude/un backend vide ensuite dans Ruflo via memory_store (voir prop `onFeedback`).
 *
 * Props :
 *   animes      : catalogue complet [{ id, title, emoji, color, coverImage, genres, ... }]
 *   ratings     : { [id]: { avg, count, mine } }  (notes communauté + ma note)
 *   favorites   : Set<id>                          (watchlist / favoris)
 *   onOpen      : (id) => void                     (ouvrir la fiche / lecteur)
 *   onFeedback  : (anime_id, action, reasonGiven) => void   (sync Ruflo, optionnel)
 */

const ACCENT = '#a78bfa'
const ACCENT2 = '#7cc4e0'
const FB_KEY = 'brams_ai_reco_fb'        // { [id]: 'like' | 'dislike' }
const QUEUE_KEY = 'brams_ruflo_feedback_queue'

function loadJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || '') ?? fallback } catch { return fallback }
}
function saveJSON(key, val) { try { localStorage.setItem(key, JSON.stringify(val)) } catch {} }

// Empile un feedback pour synchro Ruflo ultérieure (recommendation_feedback).
function queueRufloFeedback(evt) {
  const q = loadJSON(QUEUE_KEY, [])
  q.push({ ...evt, ts: Date.now() })
  saveJSON(QUEUE_KEY, q.slice(-200))   // borne la file
}

const noteOf = (ratings, id) => {
  const a = ratings?.[id]?.avg
  return Number.isFinite(a) && a > 0 ? a : null
}

/**
 * Cœur Phase 1 : profil de goûts dérivé des favoris + notes perso + 👍/👎,
 * scoring des candidats par recouvrement de genres pondéré.
 */
function buildRecommendations({ animes, ratings, favorites, feedback, seed }) {
  const liked = new Set()
  const disliked = new Set()
  for (const [id, v] of Object.entries(feedback)) (v === 'like' ? liked : disliked).add(id)
  for (const id of favorites) liked.add(id)
  for (const a of animes) if ((ratings?.[a.id]?.mine ?? 0) >= 4) liked.add(a.id)

  const byId = Object.fromEntries(animes.map(a => [a.id, a]))

  // Poids de genres issus des titres aimés.
  const genreWeight = {}
  const likedTitles = []
  for (const id of liked) {
    const a = byId[id]; if (!a) continue
    likedTitles.push(a)
    for (const g of (a.genres || [])) genreWeight[g] = (genreWeight[g] || 0) + 1
  }
  const topGenres = Object.entries(genreWeight).sort((x, y) => y[1] - x[1]).map(e => e[0])
  const hasTaste = topGenres.length > 0

  const scored = animes
    .filter(a => !liked.has(a.id) && !disliked.has(a.id))
    .map(a => {
      let score = 0
      const shared = (a.genres || []).filter(g => genreWeight[g])
      for (const g of shared) score += genreWeight[g]
      const note = noteOf(ratings, a.id)
      if (note) score += (note - 7) * 0.4               // léger bonus qualité
      // titre « source » le plus proche (genre partagé) → pour la raison
      let source = null, best = 0
      for (const lt of likedTitles) {
        const o = (lt.genres || []).filter(g => (a.genres || []).includes(g)).length
        if (o > best) { best = o; source = lt }
      }
      return { anime: a, score, shared, source, note }
    })
    .sort((x, y) => y.score - x.score)

  // Sans goûts encore connus : on plébiscite les mieux notés / populaires.
  const pool = hasTaste ? scored.filter(s => s.score > 0) : scored
  const ranked = (pool.length ? pool : scored)

  // « Rafraîchir » : on pioche 6 parmi le top 14, mélange déterministe via seed.
  const head = ranked.slice(0, 14)
  for (let i = head.length - 1; i > 0; i--) {
    const j = Math.floor((Math.sin(seed * 9301 + i * 49297) * 0.5 + 0.5) * (i + 1))
    ;[head[i], head[j]] = [head[j], head[i]]
  }
  const picks = head.slice(0, 6)

  return picks.map(p => {
    const g = p.shared[0] || (p.anime.genres || [])[0]
    let short, detailed
    if (p.source) {
      short = `Parce que tu as aimé ${p.source.title}`
      detailed = `Partage ${p.shared.length > 1 ? 'les genres ' + p.shared.slice(0, 3).join(', ') : 'le genre ' + (p.shared[0] || g)} avec ${p.source.title}.` + (p.note ? ` Note communauté ${p.note.toFixed(1)}/10.` : '')
    } else if (hasTaste && g) {
      short = `Pour les fans de ${g}`
      detailed = `Correspond à ton goût pour le ${g}.` + (p.note ? ` Plébiscité ${p.note.toFixed(1)}/10 par la commu.` : '')
    } else {
      short = p.note ? `Coup de cœur de la commu` : `À découvrir`
      detailed = p.note ? `Très bien noté par la communauté Brams (${p.note.toFixed(1)}/10).` : `Une pépite à ajouter à ton univers.`
    }
    return { ...p, short, detailed, primaryGenre: g }
  })
}

const AIRecoCard = memo(function AIRecoCard({ rec, onOpen, onVote, vote }) {
  const [hover, setHover] = useState(false)
  const a = rec.anime
  const accent = a.color || ACCENT
  return (
    <div
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      onClick={() => onOpen?.(a.id)}
      role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && onOpen?.(a.id)}
      style={{
        position: 'relative', flex: '0 0 208px', width: 208, scrollSnapAlign: 'start',
        borderRadius: 16, overflow: 'hidden', cursor: 'pointer',
        background: 'rgba(18,16,26,0.92)',
        border: `1px solid ${hover ? accent + '66' : 'rgba(255,255,255,0.07)'}`,
        boxShadow: hover ? `0 16px 40px rgba(0,0,0,0.5), 0 0 0 1px ${accent}33` : '0 6px 20px rgba(0,0,0,0.3)',
        transform: hover ? 'translateY(-4px)' : 'none', transition: 'transform .22s ease, box-shadow .22s ease, border-color .18s ease',
      }}>
      {/* Visuel */}
      <div style={{ position: 'relative', paddingTop: '128%', overflow: 'hidden', background: `radial-gradient(ellipse at 50% 28%, ${accent}33, #0a0810 74%)` }}>
        {a.coverImage
          ? <img src={a.coverImage} alt={a.title} loading="lazy" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: hover ? 0.5 : 0.82, transition: 'opacity .25s, transform .4s', transform: hover ? 'scale(1.06)' : 'none' }} />
          : <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 54, opacity: 0.55 }}>{a.emoji || '🎬'}</div>}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(8,6,14,0) 38%, rgba(8,6,14,0.96) 100%)' }} />

        {/* Note */}
        {rec.note && (
          <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 800, color: '#ffd86b', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', borderRadius: 999, padding: '3px 8px' }}>★ {rec.note.toFixed(1)}</div>
        )}
        {/* Badge match IA */}
        <div style={{ position: 'absolute', top: 8, right: 8, fontSize: 9, fontWeight: 900, letterSpacing: '.06em', color: '#fff', background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`, borderRadius: 999, padding: '3px 8px', boxShadow: `0 4px 14px ${ACCENT}66` }}>IA ✦</div>

        {/* Overlay « Pourquoi cette reco ? » au hover */}
        <div style={{ position: 'absolute', inset: 0, padding: 13, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 7, opacity: hover ? 1 : 0, transition: 'opacity .2s', background: hover ? 'linear-gradient(180deg, rgba(8,6,14,0.2), rgba(8,6,14,0.92))' : 'transparent' }}>
          <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: ACCENT }}>Pourquoi cette reco ?</div>
          <div style={{ fontSize: 11.5, lineHeight: 1.5, color: 'rgba(255,255,255,0.86)' }}>{rec.detailed}</div>
        </div>
      </div>

      {/* Pied : titre + raison courte + feedback */}
      <div style={{ padding: '10px 12px 12px' }}>
        <div style={{ fontSize: 13.5, fontWeight: 800, color: '#F2F0EA', lineHeight: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.title}</div>
        <div style={{ marginTop: 4, fontSize: 11, fontWeight: 600, color: ACCENT, lineHeight: 1.35, minHeight: 30 }}>✦ {rec.short}</div>
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          {[['like', '👍'], ['dislike', '👎']].map(([act, ico]) => (
            <button key={act}
              onClick={e => { e.stopPropagation(); onVote?.(a.id, act, rec.short) }}
              title={act === 'like' ? "J'aime cette reco" : 'Pas pour moi'}
              style={{
                flex: 1, padding: '6px 0', borderRadius: 9, cursor: 'pointer', fontSize: 13, fontFamily: 'var(--body)',
                background: vote === act ? (act === 'like' ? 'rgba(124,196,224,0.22)' : 'rgba(244,63,94,0.18)') : 'rgba(255,255,255,0.05)',
                border: `1px solid ${vote === act ? (act === 'like' ? 'rgba(124,196,224,0.5)' : 'rgba(244,63,94,0.45)') : 'rgba(255,255,255,0.08)'}`,
                transition: 'background .15s, border-color .15s',
              }}>{ico}</button>
          ))}
        </div>
      </div>
    </div>
  )
})

export default function AIRecommendations({ animes = [], ratings = {}, favorites = new Set(), onOpen, onFeedback }) {
  const [feedback, setFeedback] = useState(() => loadJSON(FB_KEY, {}))
  const [seed, setSeed] = useState(1)

  useEffect(() => { saveJSON(FB_KEY, feedback) }, [feedback])

  const recos = useMemo(
    () => buildRecommendations({ animes, ratings, favorites, feedback, seed }),
    [animes, ratings, favorites, feedback, seed]
  )

  const vote = useCallback((id, action, reason) => {
    setFeedback(prev => {
      const next = { ...prev }
      if (next[id] === action) delete next[id]   // re-clic = annule
      else next[id] = action
      return next
    })
    queueRufloFeedback({ anime_id: id, action, reason_given: reason })
    onFeedback?.(id, action, reason)
  }, [onFeedback])

  const refresh = useCallback(() => setSeed(s => s + 1), [])

  if (!animes.length) return null

  return (
    <section style={{ marginBottom: 30 }}>
      {/* En-tête */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 12 }}>
        <span style={{ fontSize: 17 }}>✨</span>
        <h3 style={{ margin: 0, fontSize: 16.5, fontWeight: 800, color: '#f4f4f5', letterSpacing: '-.01em' }}>Recommandé par l'IA pour toi</h3>
        <span style={{ fontSize: 9.5, fontWeight: 900, letterSpacing: '.08em', color: '#fff', background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`, borderRadius: 999, padding: '3px 9px', boxShadow: `0 4px 14px ${ACCENT}55` }}>IA</span>
        <div style={{ flex: 1, height: 1, background: `linear-gradient(to right, ${ACCENT}44, transparent)`, marginLeft: 6 }} />
        <button onClick={refresh}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 13px', borderRadius: 999, cursor: 'pointer', fontFamily: 'var(--body)', fontSize: 11.5, fontWeight: 800, color: ACCENT, background: 'rgba(167,139,250,0.1)', border: `1px solid ${ACCENT}3a`, transition: 'background .15s' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(167,139,250,0.2)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(167,139,250,0.1)'}>
          ↻ Rafraîchir
        </button>
      </div>

      {/* Carrousel 6 cartes */}
      <div className="elegant-scrollbar" style={{
        display: 'flex', gap: 14, overflowX: 'auto', overflowY: 'hidden', paddingBottom: 6,
        scrollSnapType: 'x proximity',
        WebkitMaskImage: 'linear-gradient(to right, black calc(100% - 40px), transparent)',
        maskImage: 'linear-gradient(to right, black calc(100% - 40px), transparent)',
      }}>
        {recos.map(rec => (
          <AIRecoCard key={rec.anime.id} rec={rec} onOpen={onOpen} onVote={vote} vote={feedback[rec.anime.id]} />
        ))}
      </div>
    </section>
  )
}
