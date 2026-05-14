import { useEffect, useRef } from 'react'

const PLAYER_DIV_ID = 'yt-music-player'

export default function MusicPlayer() {
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
          autoplay: 1, mute: 1, loop: 1, playlist: 'eBAiYv-OnrI',
          controls: 0, showinfo: 0, rel: 0, modestbranding: 1,
          disablekb: 1, start: 25, iv_load_policy: 3,
          origin: window.location.origin,
        },
        events: {
          onReady: (e) => { if (destroyed) return; e.target.playVideo() },
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
      window.onYouTubeIframeAPIReady = () => { if (prev) prev(); init() }
    }

    return () => { destroyed = true }
  }, [])

  return (
    <div style={{ position:'fixed', left:'-9999px', top:0, width:1, height:1, overflow:'hidden', pointerEvents:'none' }} aria-hidden="true">
      <div id={PLAYER_DIV_ID} />
    </div>
  )
}
