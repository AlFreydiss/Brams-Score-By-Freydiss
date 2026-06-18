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

// ns (id animé) -> slug du manga ; le bouton "Lire le scan" n'apparaît que si le
// fichier de scans existe réellement (glob), donc auto au fur et à mesure des uploads.
const MANGA_FILES = import.meta.glob('../data/manga/*.json')
const NS_TO_MANGA = { aot:'aot', sl:'solo-leveling', jjk:'jjk', kny:'kny', bluelock:'blue-lock', bc:'black-clover', fireforce:'fire-force', bleach:'bleach', drstone:'dr-stone', kingdom:'kingdom', mha:'mha', nnt:'nnt', dbs:'dbs', tpn:'tpn' }

export default function EpisodeWatch({
  videos, startIdx, ns, storageKey,
  color = '#8b7cff', color2 = '#b8a8ff',
  tags = [], animeSynopsis = '',
  onSelect, onClose,
}) {
  const navigate = useNavigate()
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
        .ew-grid { display:grid; grid-template-columns:minmax(0,2.4fr) minmax(0,1fr); gap:22px; align-items:stretch; }
        .ew-player { aspect-ratio:16/9; border-radius:16px; overflow:hidden; border:1px solid ${color}3a; box-shadow:0 24px 70px rgba(0,0,0,.55); background:#000; min-width:0; }
        .ew-eps { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:16px; }
        .ew-eps-card { text-align:left; cursor:pointer; padding:0; background:rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.08); border-radius:12px; overflow:hidden; transition:transform .15s ease, border-color .15s ease; }

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
          .ew-detail, .ew-about, .ew-epswrap{ margin-left:14px; margin-right:14px; }
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
