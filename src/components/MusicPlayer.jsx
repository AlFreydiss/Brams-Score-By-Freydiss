import { useEffect, useRef, useState } from 'react'

const PLAYER_DIV_ID = 'yt-music-bg'
const VIDEO_ID      = 'N8XorsUsoL4'

export default function MusicPlayer() {
  const [muted,   setMuted]   = useState(true)
  const [ready,   setReady]   = useState(false)
  const [volume,  setVolume]  = useState(30)
  const [hovered, setHovered] = useState(false)
  const playerRef = useRef(null)
  const destroyedRef = useRef(false)

  useEffect(() => {
    destroyedRef.current = false

    const init = () => {
      if (destroyedRef.current || !document.getElementById(PLAYER_DIV_ID)) return
      playerRef.current = new window.YT.Player(PLAYER_DIV_ID, {
        videoId: VIDEO_ID,
        playerVars: {
          autoplay: 1, mute: 1, loop: 1, playlist: VIDEO_ID,
          controls: 0, showinfo: 0, rel: 0, modestbranding: 1,
          disablekb: 1, iv_load_policy: 3, fs: 0,
          origin: window.location.origin,
        },
        events: {
          onReady: e => {
            if (destroyedRef.current) return
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
        tag.id  = 'yt-iframe-script'
        tag.src = 'https://www.youtube.com/iframe_api'
        document.head.appendChild(tag)
      }
      const prev = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => { if (prev) prev(); init() }
    }

    return () => { destroyedRef.current = true }
  }, [])

  const toggle = () => {
    const p = playerRef.current
    if (!p?.unMute) return
    if (muted) {
      p.unMute()
      p.setVolume(volume || 30)
      setMuted(false)
    } else {
      p.mute()
      setMuted(true)
    }
  }

  const handleVolume = e => {
    const val = parseInt(e.target.value)
    setVolume(val)
    const p = playerRef.current
    if (!p?.setVolume) return
    p.setVolume(val)
    if (val === 0) { p.mute(); setMuted(true) }
    else if (muted) { p.unMute(); setMuted(false) }
  }

  return (
    <>
      <div style={{ position:'fixed', left:'-9999px', top:0, width:1, height:1, overflow:'hidden', pointerEvents:'none' }} aria-hidden="true">
        <div id={PLAYER_DIV_ID} />
      </div>

      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          position:'fixed', bottom:90, left:16, zIndex:800,
          display:'flex', alignItems:'center', gap:8,
          background: hovered ? 'rgba(14,14,16,0.85)' : 'transparent',
          border: `1px solid ${hovered ? 'rgba(255,255,255,0.08)' : 'transparent'}`,
          borderRadius:12, padding: hovered ? '6px 10px' : '6px 6px',
          backdropFilter: hovered ? 'blur(12px)' : 'none',
          transition:'all 0.2s',
        }}
      >
        <button
          onClick={toggle}
          title={!ready ? 'Chargement…' : muted ? 'Activer la musique' : 'Couper la musique'}
          style={{
            width:28, height:28, borderRadius:7, flexShrink:0,
            background:'transparent', border:'none',
            color: !ready ? 'rgba(255,255,255,0.2)' : muted ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.85)',
            cursor: ready ? 'pointer' : 'default', fontSize:15,
            display:'flex', alignItems:'center', justifyContent:'center',
            transition:'color .2s',
          }}
        >
          {!ready ? '⏳' : muted || volume === 0 ? '🔇' : volume < 40 ? '🔉' : '🔊'}
        </button>

        {hovered && ready && (
          <input
            type="range" min="0" max="100"
            value={muted ? 0 : volume}
            onChange={handleVolume}
            style={{
              width:80, height:4, cursor:'pointer',
              accentColor:'#e0524a', borderRadius:4,
              outline:'none', border:'none',
              appearance:'none', WebkitAppearance:'none',
            }}
          />
        )}
      </div>
    </>
  )
}
