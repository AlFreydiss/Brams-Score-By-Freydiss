// Tokyo Revengers — fiche série : présentation, les quatre saisons avec leurs
// bandes-annonces officielles (YouTube, chargées au clic), les plateformes où
// la série se regarde légalement, et les épisodes publiés par le staff depuis
// /staff/contenus (fusionnés dans VIDEOS par prepareAnime avant l'ouverture).
import { useEffect, useMemo, useState } from 'react'
import EpisodeWatch from './EpisodeWatch.jsx'
import VIDEOS from '../data/tokyo-revengers-videos.json'

const NS = 'tokyo-revengers'

const COLOR  = '#e11d48'
const COLOR2 = '#fb7185'
const GOLD   = '#f5c451'

const BANNER = 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/120120-UDYgoHA69peT.jpg'
const COVER  = 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx120120-cWDmnmeEntSe.jpg'

const SYNOPSIS = "Takemichi Hanagaki, 26 ans, enchaîne les petits boulots et les humiliations. Un soir, il apprend que son ex du collège, Hinata Tachibana, a été tuée dans un affrontement lié au Tokyo Manji Gang, le Toman. Le lendemain, poussé sur les rails d'un quai de gare, il se réveille douze ans plus tôt. Une seule idée : changer le passé, quitte à infiltrer le Toman pour le transformer de l'intérieur et sauver Hinata."

const TAGS = ['Action', 'Drame', 'Voyage dans le temps', 'Gangs', 'Shōnen']

const SEASONS = [
  { n: 1, title: 'Tokyo Revengers', sub: "L'arc du Toman · Valhalla", year: 2021, eps: 24, status: 'Terminée',
    cover: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx120120-cWDmnmeEntSe.jpg', trailer: 'nYQUVwwD-H4', where: 'crunchyroll' },
  { n: 2, title: 'Seiya Kessen-hen', sub: 'Le Noël sanglant', year: 2023, eps: 13, status: 'Terminée',
    cover: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx142853-nxEZDE9oDRLG.png', trailer: 'wXvnmUg8I0M', where: 'disney' },
  { n: 3, title: 'Tenjiku-hen', sub: "L'arc Tenjiku", year: 2023, eps: 13, status: 'Terminée',
    cover: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx163329-lGJRnYV9dcjc.jpg', trailer: 'OTlNyYfkM1s', where: 'disney' },
  { n: 4, title: 'Santen Sensou-hen', sub: 'La guerre des trois Deva', year: 2026, eps: null, status: 'En cours · depuis le 2 octobre 2026',
    cover: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx178083-bg7pg6TCHwtG.jpg', trailer: 'Nm21TTXUkf4', where: null },
]

const PLATFORMS = {
  crunchyroll: { name: 'Crunchyroll', color: '#f47521', url: 'https://www.crunchyroll.com/fr/search?q=tokyo%20revengers' },
  disney:      { name: 'Disney+',     color: '#1f80e0', url: 'https://www.disneyplus.com/fr-fr/search?q=tokyo%20revengers' },
}

const CSS = `
  .tr-root { scrollbar-width: thin; scrollbar-color: rgba(225,29,72,.25) transparent; }
  .tr-hero { position: relative; min-height: 380px; display: flex; align-items: flex-end; overflow: hidden; }
  .tr-hero-inner { position: relative; display: flex; gap: 26px; align-items: flex-end; padding: 34px clamp(16px,4vw,48px); width: 100%; box-sizing: border-box; max-width: 1400px; margin: 0 auto; }
  .tr-cover { width: 180px; aspect-ratio: 2/3; object-fit: cover; border-radius: 14px; box-shadow: 0 24px 60px -18px rgba(0,0,0,.9); flex-shrink: 0; border: 1px solid rgba(255,255,255,.12); }
  .tr-body { max-width: 1400px; margin: 0 auto; padding: 8px clamp(16px,4vw,48px) 80px; box-sizing: border-box; }
  .tr-grid { display: grid; grid-template-columns: minmax(0,1fr) 320px; gap: 28px; align-items: start; }
  .tr-seasons { display: grid; gap: 16px; }
  .tr-season { display: grid; grid-template-columns: 120px minmax(0,1fr); gap: 16px; padding: 14px; border-radius: 16px; background: rgba(255,255,255,.035); border: 1px solid rgba(255,255,255,.07); }
  .tr-trailer { position: relative; aspect-ratio: 16/9; border-radius: 12px; overflow: hidden; background: #000; margin-top: 12px; }
  .tr-play { position: absolute; inset: 0; border: 0; padding: 0; cursor: pointer; background: none; }
  .tr-play img { width: 100%; height: 100%; object-fit: cover; opacity: .82; transition: opacity .2s, transform .3s; }
  .tr-play:hover img, .tr-play:focus-visible img { opacity: 1; transform: scale(1.03); }
  .tr-play:focus-visible { outline: 3px solid ${COLOR2}; outline-offset: -3px; }
  .tr-btn { display: inline-flex; align-items: center; gap: 8px; padding: 11px 16px; border-radius: 11px; font-weight: 800; font-size: 14px; text-decoration: none; color: #fff; transition: transform .15s, filter .15s; }
  .tr-btn:hover { transform: translateY(-1px); filter: brightness(1.1); }
  .tr-ep { transition: transform .2s, border-color .2s; }
  .tr-ep:hover, .tr-ep:focus-visible { transform: translateY(-3px); border-color: rgba(225,29,72,.5) !important; outline: none; }
  @media (max-width: 900px) {
    .tr-grid { grid-template-columns: 1fr; }
    .tr-aside { order: -1; position: static !important; }
  }
  @media (max-width: 600px) {
    .tr-hero { min-height: 300px; }
    .tr-hero-inner { gap: 14px; padding-bottom: 22px; }
    .tr-cover { width: 104px; }
    .tr-season { grid-template-columns: 1fr; }
    .tr-season > img { display: none; }
  }
`

function Trailer({ id, title }) {
  const [on, setOn] = useState(false)
  return (
    <div className="tr-trailer">
      {on ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
          title={`Bande-annonce — ${title}`}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
        />
      ) : (
        // Miniature d'abord : 4 iframes YouTube au chargement pèseraient ~2 Mo de scripts.
        <button className="tr-play" onClick={() => setOn(true)} aria-label={`Lire la bande-annonce de ${title}`}>
          <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" loading="lazy" decoding="async" />
          <span aria-hidden style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
            <span style={{ width: 62, height: 62, borderRadius: '50%', display: 'grid', placeItems: 'center', background: COLOR, color: '#fff', fontSize: 22, boxShadow: `0 8px 28px ${COLOR}88` }}>▶</span>
          </span>
          <span style={{ position: 'absolute', left: 10, bottom: 10, padding: '4px 9px', borderRadius: 6, background: 'rgba(0,0,0,.7)', color: '#fff', fontSize: 11.5, fontWeight: 800 }}>BANDE-ANNONCE</span>
        </button>
      )}
    </div>
  )
}

function PlatformLink({ id, small }) {
  const p = PLATFORMS[id]
  if (!p) return null
  return (
    <a className="tr-btn" href={p.url} target="_blank" rel="noopener noreferrer"
      style={{ background: p.color, ...(small ? { padding: '7px 12px', fontSize: 12.5 } : {}) }}>
      ▶ {small ? p.name : `Regarder sur ${p.name}`} <span aria-hidden style={{ opacity: .8 }}>↗</span>
    </a>
  )
}

function EpisodeCard({ video, onPlay }) {
  const [imgErr, setImgErr] = useState(false)
  return (
    <button className="tr-ep" onClick={onPlay} style={{
      textAlign: 'left', padding: 0, cursor: 'pointer', borderRadius: 14, overflow: 'hidden', color: '#fff',
      background: 'rgba(255,255,255,.035)', border: '1px solid rgba(255,255,255,.08)', fontFamily: 'inherit',
    }}>
      <div style={{ position: 'relative', aspectRatio: '16/9', background: '#000' }}>
        {video.thumbnail && !imgErr
          ? <img src={video.thumbnail} alt="" loading="lazy" decoding="async" onError={() => setImgErr(true)} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: .85 }} />
          : <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: `linear-gradient(135deg, ${COLOR}22, #000)`, fontSize: 30, fontWeight: 900, color: `${COLOR2}66` }}>#{video.episode}</div>}
        <span style={{ position: 'absolute', left: 8, bottom: 8, padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 800, background: 'rgba(0,0,0,.6)', border: `1px solid ${COLOR}55`, color: COLOR2 }}>{video.badge || 'VOSTFR'}</span>
      </div>
      <div style={{ padding: '10px 12px 12px' }}>
        <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.1em', color: COLOR2 }}>
          SAISON {String(video.season || 'S01').replace(/^S0?/i, '')} · ÉP. {video.episode}
        </div>
        <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 3, lineHeight: 1.3 }}>{video.title}</div>
      </div>
    </button>
  )
}

export default function TokyoRevengersPage({ onClose }) {
  const [detailIdx, setDetailIdx] = useState(null)
  // VIDEOS est complété par prepareAnime (App.jsx) avant l'affichage : copie figée au montage.
  const videos = useMemo(() => VIDEOS.filter(v => v.src), [])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])
  useEffect(() => {
    const fn = (e) => {
      if (e.key !== 'Escape') return
      if (detailIdx !== null) setDetailIdx(null)
      else onClose?.()
    }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose, detailIdx])

  if (detailIdx !== null) {
    return (
      <div className="tr-root" style={{
        position: 'fixed', left: 0, right: 0, top: 76, bottom: 0, zIndex: 500, overflowY: 'auto',
        background: 'linear-gradient(135deg, #0c0a10 0%, #110c14 55%, #08070b 100%)', color: '#fff',
        padding: '20px clamp(16px,3vw,28px) 48px', boxSizing: 'border-box',
      }}>
        <style>{CSS}</style>
        <button onClick={() => setDetailIdx(null)} style={{
          marginBottom: 16, cursor: 'pointer', padding: '8px 15px', borderRadius: 10, fontSize: 12.5, fontWeight: 800,
          color: 'rgba(255,255,255,.85)', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)',
        }}>← Épisodes</button>
        <div style={{ maxWidth: 1760, margin: '0 auto' }}>
          <EpisodeWatch videos={videos} startIdx={detailIdx} ns={NS} storageKey={NS} color={COLOR} color2={COLOR2}
            tags={TAGS} animeSynopsis={SYNOPSIS} onSelect={setDetailIdx} onClose={() => setDetailIdx(null)} />
        </div>
      </div>
    )
  }

  return (
    <div className="tr-root" style={{
      position: 'fixed', left: 0, right: 0, top: 76, bottom: 0, zIndex: 500, overflowY: 'auto',
      background: 'radial-gradient(circle at 15% 10%, rgba(225,29,72,.10), transparent 30rem), linear-gradient(135deg, #0c0a10 0%, #110c14 55%, #08070b 100%)',
      color: '#fff', fontFamily: 'var(--body, Inter, system-ui, sans-serif)',
    }}>
      <style>{CSS}</style>

      <header className="tr-hero">
        <img src={BANNER} alt="" aria-hidden style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 30%', opacity: .5 }} />
        <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(12,10,16,.25) 0%, rgba(12,10,16,.55) 55%, #0c0a10 100%)' }} />
        <button onClick={onClose} style={{
          position: 'absolute', top: 16, left: 'clamp(16px,4vw,48px)', zIndex: 2, cursor: 'pointer',
          padding: '8px 15px', borderRadius: 10, fontSize: 12.5, fontWeight: 800, color: 'rgba(255,255,255,.85)',
          background: 'rgba(0,0,0,.45)', border: '1px solid rgba(255,255,255,.14)', backdropFilter: 'blur(8px)',
        }}>← Retour</button>
        <div className="tr-hero-inner">
          <img className="tr-cover" src={COVER} alt="Affiche de Tokyo Revengers" />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.16em', color: COLOR2 }}>SÉRIE · LIDENFILMS · 2021 – 2026</div>
            <h1 style={{ margin: '8px 0 10px', fontSize: 'clamp(30px, 6vw, 58px)', fontWeight: 900, lineHeight: 1, letterSpacing: '-.02em', textShadow: '0 4px 30px rgba(0,0,0,.7)' }}>
              Tokyo Revengers
            </h1>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', fontSize: 13.5, color: 'rgba(255,255,255,.75)', fontWeight: 600 }}>
              <span style={{ color: GOLD, fontWeight: 800 }}>★ 7.7</span>
              <span>4 saisons</span>
              <span>63 épisodes + saison 4 en cours</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#34d399' }} />Nouvelle saison
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
              {TAGS.map((t) => (
                <span key={t} style={{ fontSize: 11.5, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: 'rgba(225,29,72,.12)', border: '1px solid rgba(225,29,72,.3)', color: COLOR2 }}>{t}</span>
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className="tr-body">
        <div className="tr-grid">
          <main>
            {videos.length > 0 && (
              <section style={{ marginBottom: 28 }}>
                <h2 style={{ fontSize: 20, fontWeight: 900, margin: '10px 0 16px' }}>
                  Épisodes <span style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,.45)' }}>· {videos.length}</span>
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
                  {videos.map((v, i) => <EpisodeCard key={v.progressKey || `${v.season}-${v.episode}`} video={v} onPlay={() => setDetailIdx(i)} />)}
                </div>
              </section>
            )}
            <h2 style={{ fontSize: 20, fontWeight: 900, margin: '10px 0 16px' }}>Les saisons</h2>
            <div className="tr-seasons">
              {[...SEASONS].reverse().map((s) => (
                <article key={s.n} className="tr-season">
                  <img src={s.cover} alt="" loading="lazy" decoding="async" style={{ width: '100%', aspectRatio: '2/3', objectFit: 'cover', borderRadius: 10 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.1em', color: COLOR2 }}>SAISON {s.n}</span>
                      {s.n === 4 && <span style={{ fontSize: 10.5, fontWeight: 900, padding: '2px 8px', borderRadius: 5, background: GOLD, color: '#1a1206' }}>NOUVEAU</span>}
                    </div>
                    <h3 style={{ margin: '4px 0 2px', fontSize: 18, fontWeight: 800 }}>{s.title}</h3>
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,.6)' }}>
                      {s.sub} · {s.year}{s.eps ? ` · ${s.eps} épisodes` : ''} · {s.status}
                    </div>
                    <Trailer id={s.trailer} title={`Tokyo Revengers — saison ${s.n}`} />
                    <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                      {s.where
                        ? <PlatformLink id={s.where} small />
                        : <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,.5)' }}>Plateforme de diffusion en France à confirmer.</span>}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </main>

          <aside className="tr-aside" style={{ position: 'sticky', top: 16, display: 'grid', gap: 16 }}>
            <section style={{ padding: 18, borderRadius: 16, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(225,29,72,.22)' }}>
              <h2 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 900 }}>Où regarder légalement</h2>
              <div style={{ display: 'grid', gap: 10 }}>
                <PlatformLink id="crunchyroll" />
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', marginTop: -4 }}>Saison 1</span>
                <PlatformLink id="disney" />
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', marginTop: -4 }}>Saisons 2 et 3</span>
              </div>
              <p style={{ margin: '12px 0 0', fontSize: 12, lineHeight: 1.5, color: 'rgba(255,255,255,.45)' }}>
                Les liens ouvrent la recherche de chaque plateforme. Le catalogue peut varier selon les pays.
              </p>
            </section>
            <section style={{ padding: 18, borderRadius: 16, background: 'rgba(255,255,255,.035)', border: '1px solid rgba(255,255,255,.07)' }}>
              <h2 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 900 }}>Synopsis</h2>
              <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.7, color: 'rgba(255,255,255,.7)' }}>{SYNOPSIS}</p>
            </section>
            <section style={{ padding: 18, borderRadius: 16, background: 'rgba(255,255,255,.035)', border: '1px solid rgba(255,255,255,.07)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[['Studio', 'LIDENFILMS'], ['Manga', 'Ken Wakui'], ['Début', '2021'], ['Saisons', '4']].map(([k, v]) => (
                <div key={k}>
                  <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.1em', color: COLOR2, textTransform: 'uppercase' }}>{k}</div>
                  <div style={{ fontSize: 14, fontWeight: 800, marginTop: 3 }}>{v}</div>
                </div>
              ))}
            </section>
          </aside>
        </div>
      </div>
    </div>
  )
}
