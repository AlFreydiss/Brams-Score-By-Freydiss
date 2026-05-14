import { useEffect, useRef, useState } from 'react'

export default function MusicPlayer() {
  const [muted, setMuted] = useState(true)
  const [ready, setReady] = useState(false)
  const playerRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    const init = () => {
      if (!containerRef.current) return
      playerRef.current = new window.YT.Player(containerRef.current, {
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
          origin: window.location.origin,
        },
        events: {
          onReady: (e) => {
            e.target.playVideo()
            setReady(true)
          },
        },
      })
    }

    if (window.YT && window.YT.Player) {
      init()
    } else {
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      document.head.appendChild(tag)
      window.onYouTubeIframeAPIReady = init
    }
  }, [])

  const toggle = () => {
    const p = playerRef.current
    if (!p) return
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
      {/* Lecteur caché hors écran */}
      <div style={{ position:'fixed', left:'-9999px', top:0, width:1, height:1, overflow:'hidden', pointerEvents:'none' }}>
        <div ref={containerRef} />
      </div>

      {/* Bouton mute discret */}
      <button
        onClick={toggle}
        title={muted ? 'Activer la musique' : 'Couper la musique'}
        style={{
          position:'fixed', bottom:90, left:24, zIndex:800,
          width:34, height:34, borderRadius:9,
          background:'rgba(255,255,255,.05)',
          border:'1px solid rgba(255,255,255,.08)',
          color: muted ? 'rgba(255,255,255,.25)' : 'rgba(255,255,255,.6)',
          cursor:'pointer', fontSize:14,
          display:'flex', alignItems:'center', justifyContent:'center',
          transition:'all .2s',
          opacity: ready ? 1 : 0,
        }}
        onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,.1)'; e.currentTarget.style.color='#fff'; e.currentTarget.style.borderColor='rgba(255,255,255,.2)' }}
        onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,.05)'; e.currentTarget.style.color=muted?'rgba(255,255,255,.25)':'rgba(255,255,255,.6)'; e.currentTarget.style.borderColor='rgba(255,255,255,.08)' }}
      >
        {muted ? '🔇' : '🔊'}
      </button>
    </>
  )
}
