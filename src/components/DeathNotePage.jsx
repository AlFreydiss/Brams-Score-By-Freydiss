// Death Note — fiche série : présentation, la bande-annonce officielle (YouTube,
// chargée au clic), les plateformes où la série se regarde légalement, et les
// épisodes publiés par le staff depuis /staff/contenus (fusionnés dans VIDEOS
// par prepareAnime avant l'ouverture).
import { useEffect, useMemo, useState } from 'react'
import EpisodeWatch from './EpisodeWatch.jsx'
import VIDEOS from '../data/death-note-videos.json'

const NS = 'death-note'

const COLOR  = '#b91c1c'
const COLOR2 = '#f87171'
const GOLD   = '#f5c451'

const BANNER  = 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/1535.jpg'
const COVER   = 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx1535-kUgkcrfOrkUM.jpg'
const TRAILER = 'NlJZ-YgAt-c'

const SYNOPSIS = "Light Yagami, lycéen brillant qui s'ennuie, ramasse un cahier noir tombé du ciel : le Death Note. Quiconque y voit son nom écrit meurt. Convaincu de pouvoir purger le monde des criminels, Light devient « Kira », un dieu justicier anonyme. Face à lui se dresse L, détective de génie au visage inconnu. Entre eux s'engage un duel d'esprit où chaque erreur peut être la dernière, sous le regard amusé de Ryuk, le dieu de la mort qui a laissé tomber le cahier."

const TAGS = ['Thriller', 'Psychologique', 'Surnaturel', 'Mystère', 'Shōnen']

const PLATFORMS = {
  netflix:     { name: 'Netflix',     color: '#e50914', url: 'https://www.netflix.com/search?q=death%20note' },
  crunchyroll: { name: 'Crunchyroll', color: '#f47521', url: 'https://www.crunchyroll.com/fr/search?q=death%20note' },
}

const CSS = `
  .dn-root { scrollbar-width: thin; scrollbar-color: rgba(185,28,28,.3) transparent; }
  .dn-hero { position: relative; min-height: 380px; display: flex; align-items: flex-end; overflow: hidden; }
  .dn-hero-inner { position: relative; display: flex; gap: 26px; align-items: flex-end; padding: 34px clamp(16px,4vw,48px); width: 100%; box-sizing: border-box; max-width: 1400px; margin: 0 auto; }
  .dn-cover { width: 180px; aspect-ratio: 2/3; object-fit: cover; border-radius: 14px; box-shadow: 0 24px 60px -18px rgba(0,0,0,.9); flex-shrink: 0; border: 1px solid rgba(255,255,255,.12); }
  .dn-body { max-width: 1400px; margin: 0 auto; padding: 8px clamp(16px,4vw,48px) 80px; box-sizing: border-box; }
  .dn-grid { display: grid; grid-template-columns: minmax(0,1fr) 320px; gap: 28px; align-items: start; }
  .dn-trailer { position: relative; aspect-ratio: 16/9; border-radius: 14px; overflow: hidden; background: #000; }
  .dn-play { position: absolute; inset: 0; border: 0; padding: 0; cursor: pointer; background: none; }
  .dn-play img { width: 100%; height: 100%; object-fit: cover; opacity: .8; transition: opacity .2s, transform .3s; }
  .dn-play:hover img, .dn-play:focus-visible img { opacity: 1; transform: scale(1.03); }
  .dn-play:focus-visible { outline: 3px solid ${COLOR2}; outline-offset: -3px; }
  .dn-btn { display: inline-flex; align-items: center; gap: 8px; padding: 11px 16px; border-radius: 11px; font-weight: 800; font-size: 14px; text-decoration: none; color: #fff; transition: transform .15s, filter .15s; }
  .dn-btn:hover { transform: translateY(-1px); filter: brightness(1.1); }
  .dn-ep { transition: transform .2s, border-color .2s; }
  .dn-ep:hover, .dn-ep:focus-visible { transform: translateY(-3px); border-color: rgba(185,28,28,.55) !important; outline: none; }
  @media (max-width: 900px) {
    .dn-grid { grid-template-columns: 1fr; }
    .dn-aside { order: -1; position: static !important; }
  }
  @media (max-width: 600px) {
    .dn-hero { min-height: 300px; }
    .dn-hero-inner { gap: 14px; padding-bottom: 22px; }
    .dn-cover { width: 104px; }
  }
`

function Trailer({ id, title }) {
  const [on, setOn] = useState(false)
  return (
    <div className="dn-trailer">
      {on ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
          title={`Bande-annonce — ${title}`}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
        />
      ) : (
        // Miniature d'abord : l'iframe YouTube pèse ~500 Ko de scripts.
        <button className="dn-play" onClick={() => setOn(true)} aria-label={`Lire la bande-annonce de ${title}`}>
          <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" loading="lazy" decoding="async" />
          <span aria-hidden style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
            <span style={{ width: 66, height: 66, borderRadius: '50%', display: 'grid', placeItems: 'center', background: COLOR, color: '#fff', fontSize: 23, boxShadow: `0 8px 28px ${COLOR}88` }}>▶</span>
          </span>
          <span style={{ position: 'absolute', left: 10, bottom: 10, padding: '4px 9px', borderRadius: 6, background: 'rgba(0,0,0,.7)', color: '#fff', fontSize: 11.5, fontWeight: 800 }}>BANDE-ANNONCE</span>
        </button>
      )}
    </div>
  )
}

function PlatformLink({ id }) {
  const p = PLATFORMS[id]
  if (!p) return null
  return (
    <a className="dn-btn" href={p.url} target="_blank" rel="noopener noreferrer" style={{ background: p.color }}>
      ▶ Regarder sur {p.name} <span aria-hidden style={{ opacity: .8 }}>↗</span>
    </a>
  )
}

function EpisodeCard({ video, onPlay }) {
  const [imgErr, setImgErr] = useState(false)
  return (
    <button className="dn-ep" onClick={onPlay} style={{
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
        <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.1em', color: COLOR2 }}>ÉPISODE {video.episode}</div>
        <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 3, lineHeight: 1.3 }}>{video.title}</div>
      </div>
    </button>
  )
}

export default function DeathNotePage({ onClose }) {
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
      <div className="dn-root" style={{
        position: 'fixed', left: 0, right: 0, top: 76, bottom: 0, zIndex: 500, overflowY: 'auto',
        background: 'linear-gradient(135deg, #0b0a0a 0%, #120c0c 55%, #070606 100%)', color: '#fff',
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
    <div className="dn-root" style={{
      position: 'fixed', left: 0, right: 0, top: 76, bottom: 0, zIndex: 500, overflowY: 'auto',
      background: 'radial-gradient(circle at 15% 10%, rgba(185,28,28,.10), transparent 30rem), linear-gradient(135deg, #0b0a0a 0%, #120c0c 55%, #070606 100%)',
      color: '#fff', fontFamily: 'var(--body, Inter, system-ui, sans-serif)',
    }}>
      <style>{CSS}</style>

      <header className="dn-hero">
        <img src={BANNER} alt="" aria-hidden style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 30%', opacity: .45 }} />
        <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(11,10,10,.25) 0%, rgba(11,10,10,.6) 55%, #0b0a0a 100%)' }} />
        <button onClick={onClose} style={{
          position: 'absolute', top: 16, left: 'clamp(16px,4vw,48px)', zIndex: 2, cursor: 'pointer',
          padding: '8px 15px', borderRadius: 10, fontSize: 12.5, fontWeight: 800, color: 'rgba(255,255,255,.85)',
          background: 'rgba(0,0,0,.45)', border: '1px solid rgba(255,255,255,.14)', backdropFilter: 'blur(8px)',
        }}>← Retour</button>
        <div className="dn-hero-inner">
          <img className="dn-cover" src={COVER} alt="Affiche de Death Note" />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.16em', color: COLOR2 }}>SÉRIE · MADHOUSE · 2006 – 2007</div>
            <h1 style={{ margin: '8px 0 10px', fontSize: 'clamp(30px, 6vw, 58px)', fontWeight: 900, lineHeight: 1, letterSpacing: '-.02em', textShadow: '0 4px 30px rgba(0,0,0,.7)' }}>
              Death Note
            </h1>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', fontSize: 13.5, color: 'rgba(255,255,255,.75)', fontWeight: 600 }}>
              <span style={{ color: GOLD, fontWeight: 800 }}>★ 8.4</span>
              <span>37 épisodes</span>
              <span>Terminée</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
              {TAGS.map((t) => (
                <span key={t} style={{ fontSize: 11.5, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: 'rgba(185,28,28,.14)', border: '1px solid rgba(185,28,28,.35)', color: COLOR2 }}>{t}</span>
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className="dn-body">
        <div className="dn-grid">
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
            <h2 style={{ fontSize: 20, fontWeight: 900, margin: '10px 0 16px' }}>Bande-annonce</h2>
            <Trailer id={TRAILER} title="Death Note" />
          </main>

          <aside className="dn-aside" style={{ position: 'sticky', top: 16, display: 'grid', gap: 16 }}>
            <section style={{ padding: 18, borderRadius: 16, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(185,28,28,.25)' }}>
              <h2 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 900 }}>Où regarder légalement</h2>
              <div style={{ display: 'grid', gap: 10 }}>
                <PlatformLink id="netflix" />
                <PlatformLink id="crunchyroll" />
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
              {[['Studio', 'Madhouse'], ['Manga', 'Ohba · Obata'], ['Diffusion', '2006 – 2007'], ['Épisodes', '37']].map(([k, v]) => (
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
