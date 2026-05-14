import { useEffect, useRef, useState } from 'react'

const PLAYER_DIV_ID = 'yt-music-player'

export default function MusicPlayer() {
  const [muted, setMuted] = useState(true)
  const [ready, setReady] = useState(false)
  const [volume, setVolume] = useState(35)
  const playerRef = useRef(null)

  useEffect(() => {
    let destroyed = false

    const init = () => {
      if (destroyed) return
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
          onError: () => {},
        },
      })
    }

    if (window.YT && window.YT.Player) {
      init()
    } else {
      if (!document.getElementById('yt-iframe-script')) {
        const tag = document.createElement('script')
        tag.id = 'yt-iframe-script'
        tag.src = 'https://www.youtube.com/iframe_api'
        document.head.appendChild(tag)
      }
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
      p.setVolume(volume)
    } else {
      p.mute()
    }
    setMuted(m => !m)
  }

  const handleVolume = (e) => {
    const val = parseInt(e.target.value)
    setVolume(val)
    const p = playerRef.current
    if (!p || typeof p.setVolume !== 'function') return
    p.setVolume(val)
    if (val === 0) {
      p.mute()
      setMuted(true)
    } else if (muted) {
      p.unMute()
      setMuted(false)
    }
  }

  return (
    <>
      <div
        style={{ position: 'fixed', left: '-9999px', top: 0, width: 1, height: 1, overflow: 'hidden', pointerEvents: 'none' }}
        aria-hidden="true"
      >
        <div id={PLAYER_DIV_ID} />
      </div>

      {ready && (
        <div style={{
          position: 'fixed', bottom: 90, left: 16, zIndex: 800,
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(14,14,16,0.75)',
          border: '1px solid rgba(255,255,255,.08)',
          borderRadius: 12, padding: '6px 10px',
          backdropFilter: 'blur(10px)',
          animation: 'fadeIn .4s ease-out',
        }}>
          <button
            onClick={toggle}
            title={muted ? 'Activer la musique' : 'Couper la musique'}
            style={{
              width: 28, height: 28, borderRadius: 7, flexShrink: 0,
              background: 'transparent', border: 'none',
              color: muted ? 'rgba(255,255,255,.3)' : 'rgba(255,255,255,.75)',
              cursor: 'pointer', fontSize: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'color .2s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#fff'}
            onMouseLeave={e => e.currentTarget.style.color = muted ? 'rgba(255,255,255,.3)' : 'rgba(255,255,255,.75)'}
          >
            {muted || volume === 0 ? '🔇' : volume < 40 ? '🔉' : '🔊'}
          </button>

          <input
            type="range"
            min="0"
            max="100"
            value={muted ? 0 : volume}
            onChange={handleVolume}
            style={{
              width: 80, height: 4, cursor: 'pointer',
              accentColor: '#e0524a',
              background: `linear-gradient(to right, #e0524a ${muted ? 0 : volume}%, rgba(255,255,255,.15) ${muted ? 0 : volume}%)`,
              borderRadius: 4, outline: 'none', border: 'none',
              appearance: 'none', WebkitAppearance: 'none',
            }}
          />
        </div>
      )}
    </>
  )
}
