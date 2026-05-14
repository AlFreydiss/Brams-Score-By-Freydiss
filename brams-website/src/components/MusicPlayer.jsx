import { useEffect, useRef, useState } from 'react'

const PLAYER_DIV_ID = 'yt-music-player'

export default function MusicPlayer() {
  const [muted, setMuted] = useState(true)
  const [ready, setReady] = useState(false)
  const playerRef = useRef(null)

  useEffect(() => {
    let destroyed = false

    const init = () => {
      if (destroyed) return
      // Vérifie que le div cible existe
      const target = document.getElementById(PLAYER_DIV_ID)
      if (!target) return

      playerRef.current = new window.YT.Player(PLAYER_DIV_ID, {
        videoId: 'eBAiYv-OnrI',
        playerVars: {
          autoplay: 1,
          mute: 1,
          loop: 1,
          playlist: 'eBAiYv-OnrI',
          controls: 0,
          showinfo: 0,
          rel: 0,
          modestbranding: 1,
          disablekb: 1,
          start: 25,
          iv_load_policy: 3,
          origin: window.location.origin,
        },
        events: {
          onReady: (e) => {
            if (destroyed) return
            e.target.playVideo()
            setReady(true)
          },
          onError: () => {
            // Silencieux — la vidéo peut être bloquée par politiques YT
          },
        },
      })
    }

    if (window.YT && window.YT.Player) {
      init()
    } else {
      // Évite de charger le script en double
      if (!document.getElementById('yt-iframe-script')) {
        const tag = document.createElement('script')
        tag.id = 'yt-iframe-script'
        tag.src = 'https://www.youtube.com/iframe_api'
        document.head.appendChild(tag)
      }
      // Chaîne le callback si un autre composant l'a déjà défini
      const prev = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => {
        if (prev) prev()
        init()
      }
    }

    return () => { destroyed = true }
  }, [])

  const toggle = () => {
    const p = playerRef.current
    if (!p || typeof p.unMute !== 'function') return
    if (muted) {
      p.unMute()
      p.setVolume(35)
    } else {
      p.mute()
    }
    setMuted(m => !m)
  }

  return (
    <>
      {/* Div cible stable avec ID fixe — jamais démonté */}
      <div
        style={{ position: 'fixed', left: '-9999px', top: 0, width: 1, height: 1, overflow: 'hidden', pointerEvents: 'none' }}
        aria-hidden="true"
      >
        <div id={PLAYER_DIV_ID} />
      </div>

      {/* Bouton mute discret */}
      {ready && (
        <button
          onClick={toggle}
          title={muted ? 'Activer la musique' : 'Couper la musique'}
          style={{
            position: 'fixed', bottom: 90, left: 24, zIndex: 800,
            width: 34, height: 34, borderRadius: 9,
            background: 'rgba(255,255,255,.05)',
            border: '1px solid rgba(255,255,255,.08)',
            color: muted ? 'rgba(255,255,255,.25)' : 'rgba(255,255,255,.65)',
            cursor: 'pointer', fontSize: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all .2s',
            animation: 'fadeIn .4s ease-out',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,.12)'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.2)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.05)'; e.currentTarget.style.color = muted ? 'rgba(255,255,255,.25)' : 'rgba(255,255,255,.65)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.08)' }}
        >
          {muted ? '🔇' : '🔊'}
        </button>
      )}
    </>
  )
}
