import { useCallback, useEffect, useRef, useState } from 'react'

// Lecteur YouTube unique pour tout le tournoi OST. On n'en montre jamais
// l'image : la page affiche la photo de l'anime, seule la piste compte.
// Le lecteur reste dans le DOM (200 × 200, transparent), sinon YouTube refuse
// de jouer.

const HOST_ID = 'oa-yt-host'
let ytPromise = null

function loadYT() {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (ytPromise) return ytPromise
  ytPromise = new Promise(resolve => {
    if (!document.getElementById('yt-iframe-script')) {
      const tag = document.createElement('script')
      tag.id = 'yt-iframe-script'
      tag.src = 'https://www.youtube.com/iframe_api'
      document.head.appendChild(tag)
    }
    // Un autre composant a peut-être déjà chargé l'API sans nous prévenir.
    const poll = setInterval(() => { if (window.YT?.Player) done() }, 200)
    const done = () => { clearInterval(poll); resolve(window.YT) }
    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => { prev?.(); done() }
  })
  return ytPromise
}

const VOL_KEY = 'oa_volume'
const readVolume = () => { try { const v = Number(localStorage.getItem(VOL_KEY)); return Number.isFinite(v) && v > 0 ? v : 70 } catch { return 70 } }

// state : { id, playing, loading } — id = piste chargée (participant.id)
export function useYouTubeAudio() {
  const playerRef = useRef(null)
  const readyRef = useRef(false)
  const pendingRef = useRef(null)
  const trackRef = useRef(null)
  const [state, setState] = useState({ id: null, playing: false, loading: false })
  const [failed, setFailed] = useState(() => new Set())
  const [volume, setVolumeState] = useState(readVolume)
  const volRef = useRef(volume)

  useEffect(() => { loadYT() }, [])
  useEffect(() => () => {
    try { playerRef.current?.destroy() } catch {}
    playerRef.current = null
    readyRef.current = false
  }, [])

  const load = useCallback(t => {
    const p = playerRef.current
    p.loadVideoById({ videoId: t.ytId, startSeconds: t.startAt || 0, ...(t.endAt ? { endSeconds: t.endAt } : {}) })
  }, [])

  const ensure = useCallback(async () => {
    if (playerRef.current) return
    const YT = await loadYT()
    if (playerRef.current) return
    let host = document.getElementById(HOST_ID)
    if (!host) {
      host = document.createElement('div')
      host.id = HOST_ID
      host.className = 'oa-yt'
      host.setAttribute('aria-hidden', 'true')
      document.body.appendChild(host)
    }
    // Un lecteur détruit (page quittée puis rouverte) laisse l'hôte vide.
    host.replaceChildren(document.createElement('div'))
    playerRef.current = new YT.Player(host.firstChild, {
      width: 200, height: 200,
      playerVars: { autoplay: 1, controls: 0, rel: 0, modestbranding: 1, iv_load_policy: 3, playsinline: 1, disablekb: 1, origin: window.location.origin },
      events: {
        onReady: e => {
          readyRef.current = true
          e.target.setVolume(volRef.current)
          if (pendingRef.current) { load(pendingRef.current); pendingRef.current = null }
        },
        onStateChange: e => {
          const id = trackRef.current?.id ?? null
          if (e.data === 1) setState({ id, playing: true, loading: false })
          else if (e.data === 2 || e.data === 0) setState({ id, playing: false, loading: false })
          else if (e.data === 3) setState(s => ({ ...s, id, loading: true }))
        },
        onError: () => {
          const t = trackRef.current
          if (t) setFailed(prev => new Set(prev).add(t.id))
          setState({ id: t?.id ?? null, playing: false, loading: false })
        },
      },
    })
  }, [load])

  const play = useCallback(async t => {
    if (!t) return
    const same = trackRef.current?.id === t.id
    trackRef.current = t
    if (same && playerRef.current?.playVideo && readyRef.current) {
      playerRef.current.playVideo()
      return
    }
    setState({ id: t.id, playing: false, loading: true })
    await ensure()
    if (readyRef.current) load(t)
    else pendingRef.current = t
  }, [ensure, load])

  const pause = useCallback(() => { try { playerRef.current?.pauseVideo() } catch {} }, [])

  const toggle = useCallback(t => {
    if (state.id === t.id && state.playing) pause()
    else play(t)
  }, [state, play, pause])

  const stop = useCallback(() => {
    try { playerRef.current?.stopVideo() } catch {}
    trackRef.current = null
    setState({ id: null, playing: false, loading: false })
  }, [])

  const setVolume = useCallback(v => {
    volRef.current = v
    setVolumeState(v)
    try { localStorage.setItem(VOL_KEY, String(v)) } catch {}
    try { playerRef.current?.setVolume(v) } catch {}
  }, [])

  // Lu par la barre de progression dans sa propre boucle, sans rendu React.
  const getTime = useCallback(() => {
    const p = playerRef.current
    if (!p?.getCurrentTime) return null
    const t = trackRef.current
    const start = t?.startAt || 0
    const end = t?.endAt || p.getDuration?.() || 0
    const now = p.getCurrentTime()
    return { now: Math.max(0, now - start), total: Math.max(0, end - start) }
  }, [])

  return { ...state, failed, volume, setVolume, play, pause, toggle, stop, getTime }
}
