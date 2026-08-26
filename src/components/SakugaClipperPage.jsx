import { useState, useMemo, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ANIME_META } from '../data/anime-meta.js'
import { corsUrl } from '../lib/audioBoost.js'

// ── Découpeur de clips Sakuga (outil staff) ─────────────────────────────────
// Le tournoi Sakuga a besoin d'extraits précis : un timecode de début et un de
// fin dans un épisode déjà hébergé sur R2. Les trouver à la main est pénible,
// alors cette page les capture depuis le lecteur : on scrube, on pose IN, on
// pose OUT, on nomme la scène. Le JSON produit se colle dans
// src/data/sakuga-data.js.
//
// Volontairement non listée dans la navigation : c'est un outil, pas un jeu.

const BG   = '#050308'
const PINK = '#9d174d'
const GRAD = `linear-gradient(135deg, ${PINK}, #4c1d95)`

const PALETTE = ['#c62828', '#7c3aed', '#0e7490', '#b45309', '#15803d', '#be185d', '#1d4ed8', '#d97706']
const EMOJIS  = ['✦', '⚔️', '🔥', '💥', '🌊', '⚡', '🌀', '🗡️']

// Tous les catalogues d'épisodes du site, chargés à la compilation par Vite.
const VIDEO_MODULES = import.meta.glob('../data/*-videos.json', { eager: true })

const LABEL_OVERRIDES = { films: 'Films' }

function buildLibrary() {
  const out = []
  for (const [path, mod] of Object.entries(VIDEO_MODULES)) {
    const key = path.replace('../data/', '').replace('-videos.json', '')
    const raw = mod.default || mod
    const list = Array.isArray(raw) ? raw : (raw.episodes || [])
    const episodes = list.filter(e => e.src)
    if (!episodes.length) continue
    out.push({
      key,
      label: ANIME_META[key]?.title || LABEL_OVERRIDES[key] || key,
      episodes,
    })
  }
  return out.sort((a, b) => a.label.localeCompare(b.label))
}

function fmt(t) {
  if (!Number.isFinite(t)) return '—'
  const m = Math.floor(t / 60)
  const s = Math.floor(t % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

function slug(str) {
  return String(str).toLowerCase().normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export default function SakugaClipperPage() {
  const library = useMemo(buildLibrary, [])
  const videoRef = useRef(null)

  const [animeIdx, setAnimeIdx] = useState(0)
  const [epIdx, setEpIdx]       = useState(0)
  const [inPoint, setIn]        = useState(null)
  const [outPoint, setOut]      = useState(null)
  const [now, setNow]           = useState(0)
  const [name, setName]         = useState('')
  const [clips, setClips]       = useState([])
  const [copied, setCopied]     = useState(false)

  const anime   = library[animeIdx]
  const episode = anime?.episodes[epIdx]

  // Changer d'épisode remet les points à zéro : garder ceux du précédent
  // produirait des clips faux sans prévenir.
  useEffect(() => { setIn(null); setOut(null); setName('') }, [animeIdx, epIdx])

  // Raccourcis : I pose le début, O la fin, P relit l'extrait.
  useEffect(() => {
    const onKey = e => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      const v = videoRef.current
      if (!v) return
      if (e.key === 'i' || e.key === 'I') setIn(v.currentTime)
      if (e.key === 'o' || e.key === 'O') setOut(v.currentTime)
      if (e.key === 'p' || e.key === 'P') { if (inPoint != null) { v.currentTime = inPoint; v.play() } }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [inPoint])

  const valid = inPoint != null && outPoint != null && outPoint > inPoint && name.trim()

  function addClip() {
    if (!valid || !anime || !episode) return
    const season = episode.season || 'S01'
    const clip = {
      id:       `${anime.key}-${season.toLowerCase()}e${episode.episode}-${slug(name)}`,
      title:    name.trim(),
      anime:    anime.label,
      season,
      episode:  episode.episode,
      audioUrl: episode.src,
      startAt:  Math.round(inPoint * 10) / 10,
      endAt:    Math.round(outPoint * 10) / 10,
      color:    PALETTE[clips.length % PALETTE.length],
      emoji:    EMOJIS[clips.length % EMOJIS.length],
    }
    setClips(c => [...c, clip])
    setIn(null); setOut(null); setName('')
  }

  const json = clips.length
    ? clips.map(c => '  ' + JSON.stringify(c) + ',').join('\n')
    : ''

  async function copyJson() {
    try {
      await navigator.clipboard.writeText(json)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch { /* clipboard refusé : le textarea reste sélectionnable */ }
  }

  const box = {
    background: 'rgba(255,255,255,.04)',
    border: '1px solid rgba(255,255,255,.1)',
    borderRadius: 12, color: '#fff', padding: '10px 12px', fontSize: 14,
  }

  if (!library.length) {
    return (
      <div style={{ minHeight: '100vh', background: BG, display: 'grid', placeItems: 'center', color: '#fff' }}>
        Aucun catalogue d'épisodes trouvé dans src/data.
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: BG, padding: '30px 18px 60px', color: '#fff' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>

        <Link to="/tournoi" style={{
          fontSize: 11, letterSpacing: '.18em', color: 'rgba(255,255,255,.35)', textDecoration: 'none',
        }}>
          ← TOURNOIS
        </Link>
        <h1 style={{
          fontFamily: "'Pirata One',cursive", fontSize: 40, margin: '8px 0 4px',
          background: GRAD, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          Découpeur Sakuga
        </h1>
        <p style={{ color: 'rgba(255,255,255,.45)', fontSize: 14, marginTop: 0 }}>
          Pose le début et la fin d'une séquence, nomme-la, puis colle le JSON dans
          {' '}<code style={{ color: '#f9a8d4' }}>src/data/sakuga-data.js</code>.
          {' '}Raccourcis : <strong>I</strong> début · <strong>O</strong> fin · <strong>P</strong> relire.
        </p>

        <div style={{ display: 'grid', gap: 18, gridTemplateColumns: 'minmax(0,2fr) minmax(240px,1fr)' }}>
          {/* Lecteur */}
          <div>
            <video
              ref={videoRef}
              key={episode?.src}
              src={episode ? corsUrl(episode.src) : undefined}
              crossOrigin="anonymous"
              controls
              onTimeUpdate={e => setNow(e.currentTarget.currentTime)}
              style={{ width: '100%', borderRadius: 14, background: '#000', aspectRatio: '16 / 9' }}
            />

            <div style={{
              display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 12,
            }}>
              <button onClick={() => setIn(videoRef.current?.currentTime ?? 0)} style={{ ...box, cursor: 'pointer' }}>
                Début ⟵ {fmt(inPoint)}
              </button>
              <button onClick={() => setOut(videoRef.current?.currentTime ?? 0)} style={{ ...box, cursor: 'pointer' }}>
                Fin ⟶ {fmt(outPoint)}
              </button>
              <button
                onClick={() => { const v = videoRef.current; if (v && inPoint != null) { v.currentTime = inPoint; v.play() } }}
                style={{ ...box, cursor: 'pointer' }}
              >
                ▶ Relire l'extrait
              </button>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,.4)' }}>
                position {fmt(now)}
                {inPoint != null && outPoint != null && outPoint > inPoint
                  ? ` · durée du clip ${fmt(outPoint - inPoint)}`
                  : ''}
              </span>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Nom de la séquence (ex. Sukuna vs Jogo)"
                style={{ ...box, flex: 1 }}
              />
              <button
                onClick={addClip}
                disabled={!valid}
                style={{
                  ...box, cursor: valid ? 'pointer' : 'default',
                  background: valid ? GRAD : 'rgba(255,255,255,.04)',
                  border: 'none', fontWeight: 700, padding: '10px 22px',
                  opacity: valid ? 1 : .45,
                }}
              >
                Ajouter
              </button>
            </div>
          </div>

          {/* Sélection animé / épisode */}
          <div>
            <select
              value={animeIdx}
              onChange={e => { setAnimeIdx(Number(e.target.value)); setEpIdx(0) }}
              style={{ ...box, width: '100%', marginBottom: 10 }}
            >
              {library.map((a, i) => (
                <option key={a.key} value={i} style={{ background: '#111' }}>
                  {a.label} ({a.episodes.length})
                </option>
              ))}
            </select>

            <div style={{
              maxHeight: 360, overflowY: 'auto', borderRadius: 12,
              border: '1px solid rgba(255,255,255,.08)',
            }}>
              {anime?.episodes.map((ep, i) => (
                <button
                  key={`${ep.season || 'S01'}-${ep.episode}`}
                  onClick={() => setEpIdx(i)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer',
                    padding: '9px 12px', border: 'none', fontSize: 13,
                    background: i === epIdx ? 'rgba(157,23,77,.28)' : 'transparent',
                    color: i === epIdx ? '#fff' : 'rgba(255,255,255,.6)',
                  }}
                >
                  {ep.season || 'S01'}E{ep.episode} · {ep.title || 'sans titre'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Clips accumulés */}
        <div style={{ marginTop: 28 }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10,
          }}>
            <h2 style={{ fontSize: 16, margin: 0, color: 'rgba(255,255,255,.8)' }}>
              {clips.length} clip{clips.length > 1 ? 's' : ''} prêt{clips.length > 1 ? 's' : ''}
            </h2>
            {clips.length > 0 && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={copyJson} style={{ ...box, cursor: 'pointer', background: GRAD, border: 'none' }}>
                  {copied ? 'Copié ✓' : 'Copier le JSON'}
                </button>
                <button onClick={() => setClips([])} style={{ ...box, cursor: 'pointer' }}>
                  Vider
                </button>
              </div>
            )}
          </div>

          {clips.length > 0 && (
            <textarea
              readOnly
              value={json}
              onFocus={e => e.currentTarget.select()}
              style={{
                ...box, width: '100%', minHeight: 180, fontFamily: 'monospace',
                fontSize: 12, lineHeight: 1.6, resize: 'vertical',
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}
