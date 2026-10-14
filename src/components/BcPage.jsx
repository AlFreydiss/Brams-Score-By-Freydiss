// Black Clover — fiche série, même structure que Death Note : héros, épisodes
// publiés par le staff (fusionnés dans VIDEOS par prepareAnime), saisons et
// film avec bandes-annonces officielles (YouTube, chargées au clic), plateformes
// légales, et les scans déjà sur Brams.
import { useEffect, useMemo, useState } from 'react'
import EpisodeWatch from './EpisodeWatch.jsx'
import { Reader } from './MangaReader.jsx'
import VIDEOS from '../data/bc-videos.json'
import CHAPTERS from '../data/manga/black-clover.json'

const NS = 'bc'

const COLOR  = '#388e3c'
const COLOR2 = '#4ade80'
const GOLD   = '#f5c451'

const BANNER = 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/97940-1URQdQ4U1a0b.jpg'
const COVER  = 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx97940-fyh8o7gNbha0.png'

const SYNOPSIS = "Dans un monde où la magie est tout, Asta naît sans le moindre pouvoir. Avec son grimoire à cinq feuilles et son anti-magie, il rejoint les Chevaliers-Mages du Trèfle noir et jure de devenir le Sorcier Empereur. À ses côtés, Yuno, prodige du vent, avance vers le même trône par un chemin opposé. Ensemble, ils affrontent les royaumes qui menacent Clover."

const TAGS = ['Action', 'Fantastique', 'Shōnen', 'Magie', 'Amitié']

const WORKS = [
  { key: 's2', kicker: 'Saison 2', title: 'Saison 2', sub: 'Le raid sur le royaume de Spade',
    meta: '2026 · en cours · épisode 171 en ligne, VOSTFR', live: true,
    cover: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx195604-tSZcfKbVqSEG.jpg',
    trailer: '4MYo8FfiXMA', where: 'crunchyroll' },
  { key: 's1', kicker: 'Saison 1', title: 'Saison 1', sub: "D'Hage au Taureau noir",
    meta: '2017 – 2021 · 170 épisodes · terminée',
    cover: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx97940-fyh8o7gNbha0.png',
    trailer: 'vUjAxk1qYzQ', where: 'crunchyroll' },
  { key: 'film', kicker: 'Film', title: "L'Épée de l'Empereur-Mage", sub: 'Mahou Tei no Ken',
    meta: '2023 · 113 min',
    cover: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx131680-gjs8mMQPmkOQ.png',
    trailer: 'u0cu-T7C9bU', where: 'netflix' },
]

const PLATFORMS = {
  crunchyroll: { name: 'Crunchyroll', color: '#f47521', url: 'https://www.crunchyroll.com/fr/series/GRE50KV36/black-clover' },
  netflix:     { name: 'Netflix',     color: '#e50914', url: 'https://www.netflix.com/search?q=black%20clover' },
}

const BG = '#07110a'

function loadScanProgress() {
  try { return JSON.parse(localStorage.getItem(`${NS}_progress`) || '{}') } catch { return {} }
}

const CSS = `
  .bc-root { scrollbar-width: thin; scrollbar-color: rgba(56,142,60,.3) transparent; }
  .bc-hero { position: relative; min-height: 380px; display: flex; align-items: flex-end; overflow: hidden; }
  .bc-hero-inner { position: relative; display: flex; gap: 26px; align-items: flex-end; padding: 34px clamp(16px,4vw,48px); width: 100%; box-sizing: border-box; max-width: 1400px; margin: 0 auto; }
  .bc-cover { width: 180px; aspect-ratio: 2/3; object-fit: cover; border-radius: 14px; box-shadow: 0 24px 60px -18px rgba(0,0,0,.9); flex-shrink: 0; border: 1px solid rgba(255,255,255,.12); }
  .bc-body { max-width: 1400px; margin: 0 auto; padding: 8px clamp(16px,4vw,48px) 80px; box-sizing: border-box; }
  .bc-grid { display: grid; grid-template-columns: minmax(0,1fr) 320px; gap: 28px; align-items: start; }
  .bc-works { display: grid; gap: 16px; }
  .bc-work { display: grid; grid-template-columns: 120px minmax(0,1fr); gap: 16px; padding: 14px; border-radius: 16px; background: rgba(255,255,255,.035); border: 1px solid rgba(255,255,255,.07); }
  .bc-work.is-live { border-color: rgba(74,222,128,.35); }
  .bc-trailer { position: relative; aspect-ratio: 16/9; border-radius: 12px; overflow: hidden; background: #000; margin-top: 12px; }
  .bc-play { position: absolute; inset: 0; border: 0; padding: 0; cursor: pointer; background: none; }
  .bc-play img { width: 100%; height: 100%; object-fit: cover; opacity: .82; transition: opacity .2s, transform .3s; }
  .bc-play:hover img, .bc-play:focus-visible img { opacity: 1; transform: scale(1.03); }
  .bc-play:focus-visible { outline: 3px solid ${COLOR2}; outline-offset: -3px; }
  .bc-btn { display: inline-flex; align-items: center; gap: 8px; padding: 11px 16px; border-radius: 11px; font-weight: 800; font-size: 14px; text-decoration: none; color: #fff; transition: transform .15s, filter .15s; }
  .bc-btn:hover { transform: translateY(-1px); filter: brightness(1.1); }
  .bc-ep { transition: transform .2s, border-color .2s; }
  .bc-ep:hover, .bc-ep:focus-visible { transform: translateY(-3px); border-color: rgba(56,142,60,.55) !important; outline: none; }
  .bc-chaps { display: grid; grid-template-columns: repeat(auto-fill, minmax(62px, 1fr)); gap: 6px; max-height: 360px; overflow-y: auto; padding-right: 4px; }
  .bc-chap { padding: 9px 0; border-radius: 9px; cursor: pointer; font-size: 13px; font-weight: 800; font-family: inherit; }
  .bc-chap:hover { background: rgba(56,142,60,.18) !important; border-color: rgba(56,142,60,.4) !important; }
  .bc-chap:focus-visible { outline: 2px solid ${COLOR2}; outline-offset: 2px; }
  @media (max-width: 900px) {
    .bc-grid { grid-template-columns: 1fr; }
    .bc-aside { order: -1; position: static !important; }
  }
  @media (max-width: 600px) {
    .bc-hero { min-height: 300px; }
    .bc-hero-inner { gap: 14px; padding-bottom: 22px; }
    .bc-cover { width: 104px; }
    .bc-work { grid-template-columns: 1fr; }
    .bc-work > img { display: none; }
  }
`

function Trailer({ id, title }) {
  const [on, setOn] = useState(false)
  return (
    <div className="bc-trailer">
      {on ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
          title={`Bande-annonce — ${title}`}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
        />
      ) : (
        <button className="bc-play" onClick={() => setOn(true)} aria-label={`Lire la bande-annonce de ${title}`}>
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
    <a className="bc-btn" href={p.url} target="_blank" rel="noopener noreferrer"
      style={{ background: p.color, ...(small ? { padding: '7px 12px', fontSize: 12.5 } : {}) }}>
      ▶ {small ? p.name : `Regarder sur ${p.name}`} <span aria-hidden style={{ opacity: .8 }}>↗</span>
    </a>
  )
}

function EpisodeCard({ video, onPlay }) {
  const [imgErr, setImgErr] = useState(false)
  const season = video.season ? `SAISON ${String(video.season).replace(/^S0?/i, '')} · ` : ''
  return (
    <button className="bc-ep" onClick={onPlay} style={{
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
        <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.1em', color: COLOR2 }}>{season}ÉPISODE {video.episode}</div>
        <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 3, lineHeight: 1.3 }}>{video.title}</div>
      </div>
    </button>
  )
}

function backButtonStyle() {
  return {
    cursor: 'pointer', padding: '8px 15px', borderRadius: 10, fontSize: 12.5, fontWeight: 800,
    color: 'rgba(255,255,255,.85)', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)',
  }
}

export default function BcPage({ onClose }) {
  const [detailIdx, setDetailIdx] = useState(null)
  const [reading, setReading] = useState(null)
  const [scanProg, setScanProg] = useState(loadScanProgress)
  const videos = useMemo(() => VIDEOS.filter(v => v.src), [])
  const scanList = useMemo(() => CHAPTERS.map((c, i) => ({ c, i })).reverse(), [])
  const scansRead = useMemo(() => CHAPTERS.filter(c => scanProg[c.num] === 'read').length, [scanProg])
  const scanResumeIdx = useMemo(() => {
    const i = CHAPTERS.findIndex(c => scanProg[c.num] !== 'read')
    return i >= 0 ? i : 0
  }, [scanProg])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])
  useEffect(() => {
    const fn = (e) => {
      if (e.key !== 'Escape') return
      if (reading !== null) setReading(null)
      else if (detailIdx !== null) setDetailIdx(null)
      else onClose?.()
    }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose, detailIdx, reading])

  function markRead(num) {
    setScanProg(prev => {
      const next = { ...prev, [num]: 'read' }
      try { localStorage.setItem(`${NS}_progress`, JSON.stringify(next)) } catch { /* quota */ }
      return next
    })
  }

  if (detailIdx !== null) {
    return (
      <div className="bc-root" style={{
        position: 'fixed', left: 0, right: 0, top: 76, bottom: 0, zIndex: 500, overflowY: 'auto',
        background: `linear-gradient(135deg, ${BG} 0%, #0c1610 55%, #060a07 100%)`, color: '#fff',
        padding: '20px clamp(16px,3vw,28px) 48px', boxSizing: 'border-box',
      }}>
        <style>{CSS}</style>
        <button onClick={() => setDetailIdx(null)} style={{ ...backButtonStyle(), marginBottom: 16 }}>← Épisodes</button>
        <div style={{ maxWidth: 1760, margin: '0 auto' }}>
          <EpisodeWatch videos={videos} startIdx={detailIdx} ns={NS} storageKey={NS} color={COLOR} color2={COLOR2}
            tags={TAGS} animeSynopsis={SYNOPSIS} onSelect={setDetailIdx} onClose={() => setDetailIdx(null)} />
        </div>
      </div>
    )
  }

  const resume = CHAPTERS[scanResumeIdx]

  return (
    <div className="bc-root" style={{
      position: 'fixed', left: 0, right: 0, top: 76, bottom: 0, zIndex: 500, overflowY: 'auto',
      background: `radial-gradient(circle at 15% 10%, rgba(56,142,60,.12), transparent 30rem), linear-gradient(135deg, ${BG} 0%, #0c1610 55%, #060a07 100%)`,
      color: '#fff', fontFamily: 'var(--body, Inter, system-ui, sans-serif)',
    }}>
      <style>{CSS}</style>

      <header className="bc-hero">
        <img src={BANNER} alt="" aria-hidden style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 30%', opacity: .5 }} />
        <div aria-hidden style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, rgba(7,17,10,.25) 0%, rgba(7,17,10,.55) 55%, ${BG} 100%)` }} />
        <button onClick={onClose} style={{
          ...backButtonStyle(), position: 'absolute', top: 16, left: 'clamp(16px,4vw,48px)', zIndex: 2,
          background: 'rgba(0,0,0,.45)', border: '1px solid rgba(255,255,255,.14)', backdropFilter: 'blur(8px)',
        }}>← Retour</button>
        <div className="bc-hero-inner">
          <img className="bc-cover" src={COVER} alt="Affiche de Black Clover" />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.16em', color: COLOR2 }}>SÉRIE · STUDIO PIERROT · 2017 – 2026</div>
            <h1 style={{ margin: '8px 0 10px', fontSize: 'clamp(30px, 6vw, 58px)', fontWeight: 900, lineHeight: 1, letterSpacing: '-.02em', textShadow: '0 4px 30px rgba(0,0,0,.7)' }}>
              Black Clover
            </h1>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', fontSize: 13.5, color: 'rgba(255,255,255,.75)', fontWeight: 600 }}>
              <span style={{ color: GOLD, fontWeight: 800 }}>★ 7.9</span>
              <span>2 saisons + 1 film</span>
              <span>170 épisodes + saison 2 en cours</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#34d399' }} />Nouvelle saison
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
              {TAGS.map((t) => (
                <span key={t} style={{ fontSize: 11.5, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: 'rgba(56,142,60,.14)', border: '1px solid rgba(56,142,60,.35)', color: COLOR2 }}>{t}</span>
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className="bc-body">
        <div className="bc-grid">
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
            <div className="bc-works">
              {WORKS.map((s) => (
                <article key={s.key} className={`bc-work${s.live ? ' is-live' : ''}`}>
                  <img src={s.cover} alt="" loading="lazy" decoding="async" style={{ width: '100%', aspectRatio: '2/3', objectFit: 'cover', borderRadius: 10 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.1em', color: COLOR2, textTransform: 'uppercase' }}>{s.kicker}</span>
                      {s.live && <span style={{ fontSize: 10.5, fontWeight: 900, padding: '2px 8px', borderRadius: 5, background: GOLD, color: '#1a1206' }}>NOUVEAU</span>}
                    </div>
                    <h3 style={{ margin: '4px 0 2px', fontSize: 18, fontWeight: 800 }}>{s.title}</h3>
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,.6)' }}>{s.sub} · {s.meta}</div>
                    <Trailer id={s.trailer} title={`Black Clover — ${s.title}`} />
                    <div style={{ marginTop: 10 }}>
                      <PlatformLink id={s.where} small />
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {CHAPTERS.length > 0 && (
              <section style={{ marginTop: 32 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
                  <h2 style={{ fontSize: 20, fontWeight: 900, margin: 0 }}>
                    Scans <span style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,.45)' }}>· {CHAPTERS[0].num} à {CHAPTERS[CHAPTERS.length - 1].num}</span>
                  </h2>
                  {resume && (
                    <button onClick={() => setReading(scanResumeIdx)} style={{ ...backButtonStyle(), color: COLOR2, borderColor: 'rgba(56,142,60,.35)' }}>
                      {scansRead === 0 ? `Lire le chapitre ${resume.num}` : scansRead === CHAPTERS.length ? 'Relire depuis le début' : `Reprendre au chapitre ${resume.num}`}
                    </button>
                  )}
                </div>
                <div className="bc-chaps">
                  {scanList.map(({ c, i }) => {
                    const read = scanProg[c.num] === 'read'
                    return (
                      <button key={c.num} type="button" className="bc-chap" onClick={() => setReading(i)}
                        title={c.title || `Chapitre ${c.num}`}
                        aria-label={`Chapitre ${c.num}${c.title ? `, ${c.title}` : ''}${read ? ', lu' : ''}`}
                        style={{
                          background: read ? 'rgba(56,142,60,.14)' : 'rgba(255,255,255,.04)',
                          color: read ? COLOR2 : 'rgba(255,255,255,.75)',
                          border: `1px solid ${read ? 'rgba(56,142,60,.3)' : 'rgba(255,255,255,.07)'}`,
                        }}>
                        {read ? '✓ ' : ''}{c.num}
                      </button>
                    )
                  })}
                </div>
              </section>
            )}
          </main>

          <aside className="bc-aside" style={{ position: 'sticky', top: 16, display: 'grid', gap: 16 }}>
            <section style={{ padding: 18, borderRadius: 16, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(56,142,60,.28)' }}>
              <h2 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 900 }}>Où regarder légalement</h2>
              <div style={{ display: 'grid', gap: 10 }}>
                <PlatformLink id="crunchyroll" />
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', marginTop: -4 }}>Saisons 1 et 2</span>
                <PlatformLink id="netflix" />
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', marginTop: -4 }}>Le film</span>
              </div>
              <p style={{ margin: '12px 0 0', fontSize: 12, lineHeight: 1.5, color: 'rgba(255,255,255,.45)' }}>
                Le lien Crunchyroll ouvre la fiche de la série. Netflix ouvre une recherche. Le catalogue peut varier selon les pays.
              </p>
            </section>
            <section style={{ padding: 18, borderRadius: 16, background: 'rgba(255,255,255,.035)', border: '1px solid rgba(255,255,255,.07)' }}>
              <h2 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 900 }}>Synopsis</h2>
              <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.7, color: 'rgba(255,255,255,.7)' }}>{SYNOPSIS}</p>
            </section>
            <section style={{ padding: 18, borderRadius: 16, background: 'rgba(255,255,255,.035)', border: '1px solid rgba(255,255,255,.07)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[['Studio', 'Pierrot'], ['Manga', 'Yūki Tabata'], ['Début', '2017'], ['Saisons', '2 + film']].map(([k, v]) => (
                <div key={k}>
                  <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.1em', color: COLOR2, textTransform: 'uppercase' }}>{k}</div>
                  <div style={{ fontSize: 14, fontWeight: 800, marginTop: 3 }}>{v}</div>
                </div>
              ))}
            </section>
          </aside>
        </div>
      </div>

      {reading !== null && CHAPTERS[reading] && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: BG }}>
          <Reader
            chapter={CHAPTERS[reading]}
            chapterIndex={reading}
            onClose={() => setReading(null)}
            onPrevChapter={() => setReading(Math.max(0, reading - 1))}
            onNextChapter={() => setReading(Math.min(CHAPTERS.length - 1, reading + 1))}
            totalChapters={CHAPTERS.length}
            onFinish={() => markRead(CHAPTERS[reading].num)}
            isRead={scanProg[CHAPTERS[reading].num] === 'read'}
            namespace={NS}
            themeColor={COLOR}
            seriesTitle="Black Clover"
          />
        </div>
      )}
    </div>
  )
}
