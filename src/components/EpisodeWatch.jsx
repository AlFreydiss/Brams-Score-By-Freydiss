// Page de visionnage d'un épisode, intégrée DANS la page de l'animé :
//  - lecteur vidéo en haut à gauche (intégré, pas plein écran)
//  - titre + note + synopsis de l'épisode à droite
//  - bande-annonce de l'anime + épisodes suivants en bas
// Partagée par toutes les pages d'animés.
import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import VideoPlayer from './VideoPlayer.jsx'
import { getCachedSynopsis, fetchEpisodeSynopsis } from '../lib/episodeSynopsis.js'
import { getAnimeMeta } from '../data/anime-meta.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { reviewEpisode, getEpisodeReviews } from '../lib/episodeReviews.js'

// ns (id animé) -> slug du manga ; le bouton "Lire le scan" n'apparaît que si le
// fichier de scans existe réellement (glob), donc auto au fur et à mesure des uploads.
const MANGA_FILES = import.meta.glob('../data/manga/*.json')
const NS_TO_MANGA = { aot:'aot', sl:'solo-leveling', jjk:'jjk', kny:'kny', bluelock:'blue-lock', bc:'black-clover', fireforce:'fire-force', bleach:'bleach', drstone:'dr-stone', kingdom:'kingdom', mha:'mha', nnt:'nnt', dbs:'dbs', tpn:'tpn' }

// Style commun des boutons préc./suiv. (désactivé = grisé, non cliquable).
function navBtnStyle(disabled, color, color2) {
  return {
    flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10,
    minHeight: 52, padding: '10px 16px', borderRadius: 14,
    background: disabled ? 'rgba(255,255,255,.03)' : `linear-gradient(135deg, ${color}22, rgba(255,255,255,.04))`,
    border: `1px solid ${disabled ? 'rgba(255,255,255,.06)' : color + '40'}`,
    color: disabled ? 'rgba(255,255,255,.3)' : '#fff',
    cursor: disabled ? 'default' : 'pointer',
    fontFamily: 'var(--body)', textAlign: 'left',
    transition: 'border-color .15s, background .15s, transform .1s',
  }
}

export default function EpisodeWatch({
  videos, startIdx, ns, storageKey,
  color = '#8b7cff', color2 = '#b8a8ff',
  tags = [], animeSynopsis = '',
  onSelect, onClose,
}) {
  const navigate = useNavigate()
  const { discordId, displayName, avatarUrl } = useAuth()
  const mangaSlug = NS_TO_MANGA[ns]
  const hasScan = mangaSlug && MANGA_FILES[`../data/manga/${mangaSlug}.json`]
  const video = videos[startIdx]
  const meta = getAnimeMeta(ns) || {}
  const animeTitle = meta.title || 'cet animé'
  const note = Number.isFinite(meta.note) ? meta.note : 8.5
  const isFilm = video?.kind === 'film'
  const ep = video?.episode
  const seasonLabel = video?.season ? `Saison ${String(video.season).replace(/^S/i, '')}` : 'Saison 1'
  const label = isFilm ? (video?.episodeLabel || 'Film') : `${seasonLabel} · Épisode ${ep}`
  const title = video?.title && !/^episode\s/i.test(String(video.title)) ? video.title : (isFilm ? animeTitle : `Épisode ${ep}`)
  const trailerHref = meta.youtube
    ? `https://www.youtube.com/watch?v=${meta.youtube}`
    : `https://www.youtube.com/results?search_query=${encodeURIComponent(`${animeTitle} ${isFilm ? 'film' : 'anime'} trailer bande annonce`)}`

  const [synopsis, setSynopsis] = useState(() => getCachedSynopsis(ns, ep) || video?.synopsis || '')
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    if (video?.synopsis) { setSynopsis(video.synopsis); setLoading(false); return }
    const cached = getCachedSynopsis(ns, ep)
    if (cached) { setSynopsis(cached); setLoading(false); return }
    let alive = true; setSynopsis(''); setLoading(true)
    fetchEpisodeSynopsis(ns, animeTitle, ep).then(txt => { if (alive) { setSynopsis(txt || video?.synopsis || ''); setLoading(false) } })
    return () => { alive = false }
  }, [ns, animeTitle, ep, video?.synopsis])

  // ── Avis / notes d'épisodes par membre ──────────────────────────────────────
  const epKey = String(video?.progressKey || video?.id || video?.episode)
  const [reviews, setReviews] = useState({ avg: 0, count: 0, mine: null, reviews: [] })
  const [myRating, setMyRating] = useState(0)
  const [myComment, setMyComment] = useState('')
  const [hoverStar, setHoverStar] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  const loadReviews = useMemo(() => async (alive) => {
    const data = await getEpisodeReviews(ns, epKey)
    if (alive && alive.ok) {
      setReviews(data)
      setMyRating(data.mine?.rating || 0)
      setMyComment(data.mine?.comment || '')
    }
  }, [ns, epKey])

  useEffect(() => {
    const flag = { ok: true }
    loadReviews(flag)
    return () => { flag.ok = false }
  }, [loadReviews])

  const submitReview = async () => {
    if (!discordId || !myRating || submitting) return
    setSubmitting(true)
    try {
      await reviewEpisode({ ns, epKey, rating: myRating, comment: myComment.slice(0, 600), username: displayName, avatar: avatarUrl })
      const data = await getEpisodeReviews(ns, epKey)
      setReviews(data)
      setMyRating(data.mine?.rating || myRating)
      setMyComment(data.mine?.comment ?? myComment)
    } finally {
      setSubmitting(false)
    }
  }

  // Navigation séquentielle préc./suiv. — indispensable sur mobile où dérouler
  // la grille pour changer d'épisode est pénible. Les films (kind:'film')
  // existent dans la même liste : on passe simplement à l'index voisin.
  const prevIdx = startIdx > 0 ? startIdx - 1 : null
  const nextIdx = startIdx < videos.length - 1 ? startIdx + 1 : null
  const epLabel = (v) => v ? (v.kind === 'film' ? (v.episodeLabel || 'Film') : `Ép. ${v.episode}`) : ''

  // Épisodes suivants (puis les autres) — l'épisode courant exclu.
  const upNext = useMemo(() => {
    const after = videos.map((v, i) => ({ v, i })).filter(x => x.i > startIdx)
    const before = videos.map((v, i) => ({ v, i })).filter(x => x.i < startIdx)
    return [...after, ...before]
  }, [videos, startIdx])

  const watchedAll = videos.length
  const detailRows = [
    ['Saison', isFilm ? '—' : (video?.season ? String(video.season).replace(/^S/i, '') : '1')],
    ['Audio', video?.badge || 'VOSTFR'],
    ['Total', `${watchedAll} vidéo${watchedAll > 1 ? 's' : ''}`],
    ['Note', `★ ${note}/10`],
  ]

  return (
    // Plein cadre, pas de "carte flottante" : le contenu vit dans la page et prend tout l'espace.
    <div className="ew-root" style={{ position: 'relative', marginBottom: 10, animation: 'ewFade .3s ease-out both' }}>
      <style>{`
        @keyframes ewFade { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
        /* align-items:start (et pas stretch) : sinon un panneau de détail plus haut que le
           lecteur étire la ligne, et aspect-ratio:16/9 élargit le lecteur → débordement. */
        .ew-grid { display:grid; grid-template-columns:minmax(0,2.4fr) minmax(0,1fr); gap:22px; align-items:start; }
        .ew-player { aspect-ratio:16/9; border-radius:16px; overflow:hidden; border:1px solid ${color}3a; box-shadow:0 24px 70px rgba(0,0,0,.55); background:#000; min-width:0; }
        .ew-eps { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:16px; }
        .ew-eps-card { text-align:left; cursor:pointer; padding:0; background:rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.08); border-radius:12px; overflow:hidden; transition:transform .15s ease, border-color .15s ease; }
        .ew-navbar { display:flex; gap:12px; margin-top:18px; }
        .ew-nav-btn--next { justify-content:flex-end; text-align:right; }
        .ew-nav-btn:not(:disabled):hover { transform:translateY(-1px); }
        .ew-nav-btn:not(:disabled):active { transform:scale(.98); }

        /* ===== Tablette (≤1024px) : lecteur plus grand, détail empilé dessous ===== */
        @media (max-width:1024px){
          .ew-grid{ grid-template-columns:1fr; gap:18px; }
          .ew-player{ position:sticky; top:0; z-index:30; border-radius:14px; box-shadow:0 14px 44px rgba(0,0,0,.6); }
        }

        /* ===== Mobile (≤768px) : lecteur edge-to-edge proéminent, collant en haut ===== */
        @media (max-width:768px){
          /* casse le padding latéral du conteneur parent pour un lecteur pleine largeur */
          .ew-root{ margin-left:calc(50% - 50vw); margin-right:calc(50% - 50vw); width:100vw; }
          .ew-grid{ gap:0; }
          .ew-player{
            position:sticky; top:0; z-index:40; width:100vw; border-radius:0;
            border-left:0; border-right:0; border-top:0; box-shadow:0 10px 30px rgba(0,0,0,.7);
          }
          /* tout le reste du contenu reprend une marge confortable */
          .ew-detail, .ew-about, .ew-epswrap, .ew-navbar{ margin-left:14px; margin-right:14px; }
          .ew-navbar{ margin-top:14px; }
          .ew-nav-btn{ min-height:56px; }
          .ew-detail{ margin-top:14px; border-radius:14px; padding:16px 16px; }
          .ew-detail h2{ font-size:23px !important; }
          .ew-grid-stats{ grid-template-columns:1fr 1fr; }
          /* boutons d'action : zones tactiles confortables */
          .ew-touchbtn{ min-height:48px; font-size:14.5px !important; }
          .ew-close{ width:40px !important; height:40px !important; font-size:16px !important; }
          /* épisodes : 2 colonnes lisibles au doigt */
          .ew-eps{ grid-template-columns:1fr 1fr; gap:12px; }
          .ew-eps-card{ border-radius:14px; }
          .ew-eps-card:active{ transform:scale(.97); }
        }
        @media (max-width:380px){
          .ew-eps{ grid-template-columns:1fr; }
        }
      `}</style>

      <div className="ew-grid">
        {/* Lecteur — haut gauche (sticky/pleine largeur sur mobile/tablette) */}
        <div className="ew-player">
          <VideoPlayer key={startIdx} videos={videos} startIdx={startIdx} onClose={onClose} color={color} storageKey={storageKey} autoStart embedded hideDetail />
        </div>

        {/* Infos — droite (passe sous le lecteur sur mobile/tablette) */}
        <div className="ew-detail" style={{ display: 'flex', flexDirection: 'column', minWidth: 0, borderRadius: 16, padding: '20px 22px', background: `linear-gradient(160deg, ${color}1c, rgba(12,10,20,.85))`, border: `1px solid ${color}33` }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '1.6px', textTransform: 'uppercase', color: color2 }}>{isFilm ? 'Film' : 'Épisode'}</div>
            <button className="ew-close" onClick={onClose} aria-label="Fermer le lecteur" style={{ flexShrink: 0, width: 26, height: 26, borderRadius: 8, border: '1px solid rgba(255,255,255,.12)', background: 'rgba(255,255,255,.05)', color: 'rgba(255,255,255,.6)', cursor: 'pointer', fontSize: 13, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          </div>
          <h2 style={{ margin: '6px 0 4px', fontFamily: "'Pirata One',cursive", fontSize: 'clamp(24px,2.6vw,34px)', fontWeight: 900, color: '#fff', lineHeight: 1.05 }}>{title}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5, color: 'rgba(255,255,255,.55)', fontWeight: 700, marginBottom: 14 }}>
            <span>{label}</span>
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(255,255,255,.3)' }} />
            <span style={{ color: '#fbbf24' }}>★ <span style={{ color: '#fff' }}>{note}</span><span style={{ color: 'rgba(255,255,255,.4)' }}>/10</span></span>
          </div>
          <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'rgba(255,255,255,.42)', marginBottom: 6 }}>Synopsis de l'épisode</div>
          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.62, color: 'rgba(255,255,255,.82)' }}>
            {synopsis || (loading ? 'Génération du synopsis…' : 'Synopsis indisponible pour le moment.')}
          </p>

          {/* ── Avis des pirates (notes + commentaires des membres) ───────────── */}
          <div className="ew-reviews" style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,.07)' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
              <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '1.2px', textTransform: 'uppercase', color: color2 }}>Avis des pirates</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ color: '#fbbf24', fontSize: 17, fontWeight: 900 }}>★</span>
                <span style={{ fontSize: 19, fontWeight: 900, color: '#fff' }}>{reviews.count ? reviews.avg.toFixed(1) : '—'}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.4)' }}>/10</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,.4)', marginLeft: 4 }}>
                  {reviews.count > 0 ? `· ${reviews.count} avis` : '· sois le premier'}
                </span>
              </div>
            </div>

            {discordId ? (
              <div style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 12, padding: '12px 13px' }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,.55)', marginBottom: 8 }}>
                  {reviews.mine ? 'Modifier ma note' : 'Donne ta note'}
                </div>
                {/* 10 étoiles cliquables = note /10 */}
                <div role="radiogroup" aria-label="Noter l'épisode sur 10" style={{ display: 'flex', gap: 3, marginBottom: 10 }} onMouseLeave={() => setHoverStar(0)}>
                  {Array.from({ length: 10 }, (_, i) => i + 1).map(n => {
                    const active = (hoverStar || myRating) >= n
                    return (
                      <button
                        key={n}
                        type="button"
                        role="radio"
                        aria-checked={myRating === n}
                        aria-label={`${n} sur 10`}
                        onMouseEnter={() => setHoverStar(n)}
                        onClick={() => setMyRating(n)}
                        style={{
                          background: 'none', border: 'none', padding: 0, cursor: 'pointer', lineHeight: 1,
                          fontSize: 17, color: active ? '#fbbf24' : 'rgba(255,255,255,.18)',
                          transition: 'color .12s, transform .1s', transform: active ? 'scale(1.05)' : 'none',
                        }}
                      >★</button>
                    )
                  })}
                  <span style={{ marginLeft: 8, alignSelf: 'center', fontSize: 12.5, fontWeight: 800, color: myRating ? '#fff' : 'rgba(255,255,255,.35)' }}>
                    {(hoverStar || myRating) || '–'}/10
                  </span>
                </div>
                <textarea
                  value={myComment}
                  onChange={e => setMyComment(e.target.value.slice(0, 600))}
                  placeholder="Ton avis sur l'épisode (optionnel)…"
                  rows={2}
                  maxLength={600}
                  style={{
                    width: '100%', boxSizing: 'border-box', resize: 'vertical', minHeight: 40,
                    background: 'rgba(0,0,0,.25)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 9,
                    color: '#fff', fontSize: 12.5, fontFamily: 'var(--body)', lineHeight: 1.5, padding: '8px 10px',
                  }}
                />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 9 }}>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,.3)' }}>{myComment.length}/600</span>
                  <button
                    type="button"
                    className="ew-touchbtn"
                    disabled={!myRating || submitting}
                    onClick={submitReview}
                    style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                      minHeight: 38, padding: '8px 16px', borderRadius: 10, fontSize: 12.5, fontWeight: 800,
                      cursor: (!myRating || submitting) ? 'default' : 'pointer',
                      background: (!myRating || submitting) ? 'rgba(255,255,255,.06)' : `linear-gradient(135deg, ${color}, ${color2})`,
                      border: `1px solid ${(!myRating || submitting) ? 'rgba(255,255,255,.1)' : color}`,
                      color: (!myRating || submitting) ? 'rgba(255,255,255,.4)' : '#fff',
                      boxShadow: (!myRating || submitting) ? 'none' : `0 8px 22px ${color}44`,
                    }}
                  >{submitting ? 'Envoi…' : (reviews.mine ? 'Mettre à jour' : 'Publier mon avis')}</button>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.45)', fontWeight: 600, padding: '10px 12px', background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 12 }}>
                Connecte-toi pour noter cet épisode et laisser un avis.
              </div>
            )}

            {/* Liste des avis avec commentaire (max ~10, scroll) */}
            {reviews.reviews.filter(r => (r.comment || '').trim()).length > 0 && (
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 9, maxHeight: 300, overflowY: 'auto', paddingRight: 4 }}>
                {reviews.reviews.filter(r => (r.comment || '').trim()).slice(0, 10).map((r, i) => (
                  <div key={(r.username || 'u') + i} style={{ display: 'flex', gap: 10, padding: '10px 11px', borderRadius: 11, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)' }}>
                    {r.avatar_url
                      ? <img src={r.avatar_url} alt="" loading="lazy" style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, objectFit: 'cover' }} />
                      : <div style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, background: `linear-gradient(135deg, ${color}, ${color2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: '#fff' }}>{(r.username || '?').charAt(0).toUpperCase()}</div>}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.username || 'Pirate'}</span>
                        <span style={{ fontSize: 11, fontWeight: 800, color: '#fbbf24', flexShrink: 0 }}>★ {r.rating}/10</span>
                      </div>
                      <div style={{ fontSize: 12, lineHeight: 1.5, color: 'rgba(255,255,255,.72)', wordBreak: 'break-word' }}>{r.comment}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 14 }}>
              {tags.map(t => <span key={t} style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: `${color}1a`, border: `1px solid ${color}33`, color: color2 }}>{t}</span>)}
            </div>
          )}

          {/* Détails (remplit le panneau) */}
          <div className="ew-grid-stats" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 16 }}>
            {detailRows.map(([k, v]) => (
              <div key={k} style={{ padding: '9px 11px', borderRadius: 10, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.06)' }}>
                <div style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,.32)' }}>{k}</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#fff', marginTop: 2 }}>{v}</div>
              </div>
            ))}
          </div>

          <a href={trailerHref} target="_blank" rel="noreferrer" aria-label="Voir le trailer de l'anime sur YouTube" style={{
            marginTop: 'auto', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 9,
            paddingTop: 16, paddingBottom: 0,
          }}>
            <span className="ew-touchbtn" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 9, width: '100%', minHeight: 44, padding: '12px 0', borderRadius: 12, background: `linear-gradient(135deg, ${color}, ${color2})`, border: `1px solid ${color}`, color: '#fff', fontSize: 13.5, fontWeight: 800, letterSpacing: '.2px', boxShadow: `0 10px 30px ${color}44` }}>▶ Trailer de l'anime</span>
          </a>
          {hasScan && (
            <button className="ew-touchbtn" onClick={() => navigate(`/manga/${mangaSlug}`)} aria-label="Lire le scan du manga" style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 9, width: '100%', minHeight: 44, padding: '11px 0', borderRadius: 12, cursor: 'pointer', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.14)', color: 'rgba(255,255,255,.85)', fontSize: 13, fontWeight: 800 }}>📖 Lire le scan (manga)</button>
          )}
        </div>
      </div>

      {/* Navigation séquentielle préc./suiv. — grosses cibles tactiles. */}
      <div className="ew-navbar">
        <button
          className="ew-nav-btn"
          disabled={prevIdx === null}
          onClick={() => prevIdx !== null && onSelect(prevIdx)}
          aria-label="Épisode précédent"
          style={navBtnStyle(prevIdx === null, color, color2)}
        >
          <span style={{ fontSize: 17, lineHeight: 1 }}>‹</span>
          <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0 }}>
            <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', opacity: .6 }}>Précédent</span>
            <span style={{ fontSize: 12.5, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{prevIdx !== null ? epLabel(videos[prevIdx]) : '—'}</span>
          </span>
        </button>
        <button
          className="ew-nav-btn ew-nav-btn--next"
          disabled={nextIdx === null}
          onClick={() => nextIdx !== null && onSelect(nextIdx)}
          aria-label="Épisode suivant"
          style={navBtnStyle(nextIdx === null, color, color2)}
        >
          <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: 0 }}>
            <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', opacity: .6 }}>Suivant</span>
            <span style={{ fontSize: 12.5, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{nextIdx !== null ? epLabel(videos[nextIdx]) : '—'}</span>
          </span>
          <span style={{ fontSize: 17, lineHeight: 1 }}>›</span>
        </button>
      </div>

      {/* À propos de l'anime — remplit la zone */}
      {animeSynopsis && (
        <div className="ew-about" style={{ marginTop: 20, padding: '18px 20px', borderRadius: 16, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)' }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '1.2px', textTransform: 'uppercase', color: color2, marginBottom: 8 }}>À propos de l'anime</div>
          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.7, color: 'rgba(255,255,255,.7)' }}>{animeSynopsis}</p>
        </div>
      )}

      {/* Tous les autres épisodes — grille qui remplit l'espace */}
      <div className="ew-epswrap" style={{ marginTop: 22 }}>
        <div style={{ fontSize: 15, fontWeight: 900, color: '#fff', marginBottom: 14 }}>Épisodes suivants</div>
        <div className="ew-eps">
          {upNext.map(({ v, i }) => (
            <button className="ew-eps-card" key={v.progressKey || v.id || `e${i}`} onClick={() => onSelect(i)}
              aria-label={v.kind === 'film' ? `Lire le film ${v.title || ''}` : `Lire l'épisode ${v.episode}`}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = `${color}66` }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.08)' }}
            >
              <div style={{ position: 'relative', aspectRatio: '16 / 9', background: '#0a0814' }}>
                {v.thumbnail
                  ? <img src={v.thumbnail} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ width: '100%', height: '100%', background: `linear-gradient(135deg,${color}26,rgba(0,0,0,.9))` }} />}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,transparent 60%,rgba(0,0,0,.5))' }} />
                <div style={{ position: 'absolute', bottom: 8, left: 10, fontSize: 8.5, fontWeight: 800, background: `${color}38`, color: color2, border: `1px solid ${color}4d`, borderRadius: 100, padding: '2px 7px' }}>{v.badge || 'VOSTFR'}</div>
              </div>
              <div style={{ padding: '9px 12px 11px' }}>
                <div style={{ fontSize: 9, fontWeight: 800, color: color2, letterSpacing: '.06em', marginBottom: 2 }}>{v.kind === 'film' ? 'FILM' : `ÉPISODE ${v.episode}`}</div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.title || `Épisode ${v.episode}`}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
