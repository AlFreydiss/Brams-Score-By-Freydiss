import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { getCachedSynopsis, fetchEpisodeSynopsis } from '../lib/episodeSynopsis.js'

const clamp = (min, v, max) => Math.max(min, Math.min(max, v))

// Overlay de pause (PENDANT la lecture, pas en pré-lecture) : voile sombre +
// fiche « Vous regardez » alignée à gauche.
//
// zIndex 4 → l'overlay passe SOUS le canvas des sous-titres (zIndex 5) : les ST
// restent lisibles par-dessus le voile au lieu d'être assombris avec l'image.
// pointerEvents: none → un clic n'importe où relance la lecture (le handler de
// la zone vidéo reste atteignable).
//
// Dimensionnement : rien n'est exprimé en vw/vh. On MESURE le lecteur et la
// hauteur réelle de `.vp-controls`, et la fiche est centrée dans la zone libre
// au-dessus des contrôles. Le même composant sert donc le plein écran 1080p, le
// plein écran paysage d'un téléphone (~340px) et le lecteur fenêtré
// d'EpisodeWatch (~190px) sans jamais écrire par-dessus la barre.
export default function PauseOverlay({ visible, animeId, animeTitle, video, episodeLabel, color = '#a78bfa' }) {
  const ep = video?.episode
  const isFilm = video?.kind === 'film' || (video?.season && String(video.season).toLowerCase().includes('film'))
  const epTitle = video?.title && !/^episode\s/i.test(String(video.title)) ? video.title : null
  const epLine = isFilm
    ? (epTitle || episodeLabel)
    : (epTitle ? `${epTitle} : Ép. ${ep}` : `Épisode ${ep}`)

  const rootRef = useRef(null)
  const [box, setBox] = useState({ w: 1280, h: 720, ctrlH: 110 })

  useLayoutEffect(() => {
    const el = rootRef.current
    if (!el) return
    const controls = el.parentElement?.querySelector('.vp-controls') || null
    const read = () => setBox({
      w: el.clientWidth || 1280,
      h: el.clientHeight || 720,
      // La barre peut être masquée (opacity 0) mais garde sa hauteur : offsetHeight
      // reste la bonne réserve, la fiche ne sautera pas quand les contrôles reviennent.
      ctrlH: controls?.offsetHeight || 110,
    })
    read()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(read)
    ro.observe(el)
    if (controls) ro.observe(controls)
    return () => ro.disconnect()
  }, [])

  const [synopsis, setSynopsis] = useState(
    () => (animeId ? getCachedSynopsis(animeId, ep) : null) || video?.synopsis || ''
  )

  // Le synopsis n'est chargé qu'à la première pause : aucune requête tant que
  // l'overlay n'a jamais été affiché. Ensuite le cache (mémoire + localStorage)
  // de episodeSynopsis.js sert toutes les pauses suivantes.
  useEffect(() => {
    if (!visible) return
    if (video?.synopsis) { setSynopsis(video.synopsis); return }
    if (!animeId || !Number.isFinite(Number(ep))) return
    const cached = getCachedSynopsis(animeId, ep)
    if (cached) { setSynopsis(cached); return }
    let alive = true
    setSynopsis('')
    fetchEpisodeSynopsis(animeId, animeTitle, ep).then(txt => { if (alive) setSynopsis(txt || '') })
    return () => { alive = false }
  }, [visible, animeId, animeTitle, ep, video?.synopsis])

  const title = animeTitle || episodeLabel

  // ── Échelle dérivée de la zone LIBRE (au-dessus des contrôles) ──
  const { w, h, ctrlH } = box
  const ctrlZone = clamp(52, ctrlH + 12, 200)
  const free = Math.max(0, h - ctrlZone)
  const gutter = clamp(14, w * 0.038, 60)
  const titleSize = clamp(17, free * 0.16, 52)
  const metaSize = clamp(10.5, free * 0.032, 15)
  const labelSize = clamp(10, free * 0.027, 13)
  // En dessous de ~110px de libre il n'y a de place pour rien : on garde le seul
  // voile (la pastille play centrale dit déjà que c'est en pause).
  const showCard = free >= 110
  const showRepeatTitle = free >= 190
  const showSynopsis = free >= 230
  const showRule = free >= 150
  const showEnPause = h >= 300

  return (
    <div
      ref={rootRef}
      aria-hidden={!visible}
      style={{
        position: 'absolute', inset: 0, zIndex: 4,
        pointerEvents: 'none', overflow: 'hidden',
        background: 'rgba(0,0,0,0.55)',
        opacity: visible ? 1 : 0,
        transition: 'opacity .3s ease',
      }}
    >
      {/* Zone libre au-dessus des contrôles : la fiche y est centrée verticalement */}
      {showCard && (
        <div style={{
          position: 'absolute', left: gutter, right: gutter, top: 0, bottom: ctrlZone,
          display: 'flex', alignItems: 'center',
        }}>
          <div style={{
            width: showSynopsis ? 'min(48%, 640px)' : 'min(74%, 520px)',
            maxWidth: '100%',
            opacity: visible ? 1 : 0,
            transform: `translateY(${visible ? 0 : 10}px)`,
            transition: 'opacity .35s ease .06s, transform .35s ease .06s',
            fontFamily: 'var(--body)', color: '#fff',
            textShadow: '0 2px 18px rgba(0,0,0,0.55)',
          }}>
            <div style={{ fontSize: labelSize, fontWeight: 500, color: 'rgba(255,255,255,0.78)' }}>
              Vous regardez
            </div>

            {/* lineHeight >= 1.18 : sous 1.1, la line-box est plus courte que le
                glyphe et overflow:hidden rase les jambages (le « g » de Song) sur
                la derniere ligne du clamp. Syne a des descendantes longues. */}
            <div style={{
              fontFamily: 'var(--display)', fontSize: titleSize, fontWeight: 800,
              lineHeight: 1.18, marginTop: titleSize * 0.1,
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>{title}</div>

            {showRepeatTitle && (
              <div style={{ fontSize: metaSize, fontWeight: 800, lineHeight: 1.4, marginTop: 9, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
            )}

            <div style={{ fontSize: metaSize, fontWeight: 800, marginTop: showRepeatTitle ? 16 : 8 }}>{epLine}</div>

            {showSynopsis && synopsis && (
              <div style={{
                fontSize: labelSize, fontWeight: 400, lineHeight: 1.45, marginTop: 7,
                color: 'rgba(255,255,255,0.72)',
                display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
              }}>{synopsis}</div>
            )}

            {/* Liseré accent de l'animé — rappel discret de l'identité Brams */}
            {showRule && (
              <div style={{
                width: 44, height: 2, marginTop: 18, borderRadius: 2,
                background: `linear-gradient(90deg, ${color}, transparent)`,
                opacity: 0.8,
              }} />
            )}
          </div>
        </div>
      )}

      {/* « En pause » — bas-droite, juste au-dessus de la barre de contrôles */}
      {showEnPause && (
        <div style={{
          position: 'absolute',
          right: `calc(${gutter}px + env(safe-area-inset-right, 0px))`,
          bottom: ctrlZone + 8,
          fontFamily: 'var(--body)', fontSize: labelSize, fontWeight: 500,
          color: 'rgba(255,255,255,0.82)',
          textShadow: '0 2px 14px rgba(0,0,0,0.6)',
          opacity: visible ? 1 : 0,
          transition: 'opacity .3s ease .06s',
        }}>En pause</div>
      )}
    </div>
  )
}
