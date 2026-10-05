import { useEffect, useRef, useState } from 'react'
import { BLEACH_TRACKS } from '../../data/versus-data.js'

// Radio de fond pour les tournois en images : OST, openings et endings de Bleach
// lus via l'API iframe YouTube. Le lecteur reste visible (vignette 16:9) : on
// ne cache pas une vidéo YouTube derrière l'interface.

const TABS = [
  { id: 'ost', label: 'OST' },
  { id: 'op',  label: 'Openings' },
  { id: 'ed',  label: 'Endings' },
]
const PLAYER_ID = 'versus-radio-player'
const PREF_KEY = 'versus_radio'

function loadYT() {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  return new Promise(resolve => {
    if (!document.getElementById('yt-iframe-script')) {
      const tag = document.createElement('script')
      tag.id = 'yt-iframe-script'
      tag.src = 'https://www.youtube.com/iframe_api'
      document.head.appendChild(tag)
    }
    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(window.YT) }
  })
}

function readPrefs() {
  try { return JSON.parse(localStorage.getItem(PREF_KEY) || '{}') } catch { return {} }
}
function writePrefs(p) {
  try { localStorage.setItem(PREF_KEY, JSON.stringify(p)) } catch {}
}

export default function BleachRadio({ compact = false }) {
  const prefs = useRef(readPrefs()).current
  const [tab, setTab] = useState(prefs.tab || 'ost')
  const [current, setCurrent] = useState(null)        // { list, index }
  const [playing, setPlaying] = useState(false)
  const [volume, setVolume] = useState(prefs.volume ?? 45)
  const [shuffle, setShuffle] = useState(!!prefs.shuffle)
  const [failed, setFailed] = useState(() => new Set())
  const [open, setOpen] = useState(!compact)
  const playerRef = useRef(null)
  const readyRef = useRef(false)
  const pendingRef = useRef(null)
  const stateRef = useRef({})
  stateRef.current = { current, shuffle, failed }

  useEffect(() => { writePrefs({ tab, volume, shuffle }) }, [tab, volume, shuffle])

  // Crée le lecteur une seule fois, au premier morceau demandé (le navigateur
  // exige un geste de l'utilisateur pour lancer le son de toute façon).
  const ensurePlayer = async () => {
    if (playerRef.current) return
    const YT = await loadYT()
    if (playerRef.current) return
    playerRef.current = new YT.Player(PLAYER_ID, {
      width: '100%', height: '100%',
      playerVars: { autoplay: 1, controls: 0, rel: 0, modestbranding: 1, iv_load_policy: 3, playsinline: 1, origin: window.location.origin },
      events: {
        onReady: e => {
          readyRef.current = true
          e.target.setVolume(volume)
          if (pendingRef.current) { e.target.loadVideoById(pendingRef.current); pendingRef.current = null }
        },
        onStateChange: e => {
          if (e.data === 1) setPlaying(true)
          else if (e.data === 2) setPlaying(false)
          else if (e.data === 0) step(1)
        },
        onError: () => {
          const { current: c } = stateRef.current
          if (c) setFailed(prev => new Set(prev).add(BLEACH_TRACKS[c.list][c.index].id))
          step(1)
        },
      },
    })
  }

  // Charge l'API dès l'arrivée : au premier clic, le lecteur se crée sans attendre le script.
  useEffect(() => { loadYT() }, [])
  useEffect(() => () => { try { playerRef.current?.destroy() } catch {} ; playerRef.current = null }, [])

  const play = async (list, index) => {
    const track = BLEACH_TRACKS[list][index]
    setCurrent({ list, index })
    await ensurePlayer()
    if (readyRef.current) playerRef.current.loadVideoById(track.id)
    else pendingRef.current = track.id
  }

  const step = dir => {
    const { current: c, shuffle: sh, failed: bad } = stateRef.current
    if (!c) return
    const list = BLEACH_TRACKS[c.list]
    const ok = list.map((t, i) => i).filter(i => !bad.has(list[i].id) && i !== c.index)
    if (!ok.length) return
    let next
    if (sh) next = ok[Math.floor(Math.random() * ok.length)]
    else {
      next = c.index
      do { next = (next + dir + list.length) % list.length } while (bad.has(list[next].id) && next !== c.index)
    }
    play(c.list, next)
  }

  const toggle = () => {
    const p = playerRef.current
    if (!current) return play(tab, 0)
    if (!p?.getPlayerState) return
    if (playing) p.pauseVideo(); else p.playVideo()
  }

  const onVolume = v => {
    setVolume(v)
    try { playerRef.current?.setVolume(v) } catch {}
  }

  const track = current ? BLEACH_TRACKS[current.list][current.index] : null

  return (
    <aside className={`vr ${compact ? 'vr--compact' : ''} ${open ? 'is-open' : ''}`}>
      <button type="button" className="vr-head" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <span className={`vr-eq ${playing ? 'is-on' : ''}`} aria-hidden><i /><i /><i /><i /></span>
        <span className="vr-head-txt">
          <b>Radio Bleach</b>
          <small>{track ? `${track.title} · ${track.artist}` : 'Choisis ta musique de fond'}</small>
        </span>
        {compact && <span className="vr-chev" aria-hidden>{open ? '–' : '+'}</span>}
      </button>

      <div className="vr-body">
        <div className="vr-screen">
          <div id={PLAYER_ID} />
          {!track && <div className="vr-screen-empty">卍解</div>}
        </div>

        <div className="vr-controls">
          <button type="button" onClick={() => step(-1)} disabled={!current} aria-label="Précédent">⏮</button>
          <button type="button" className="vr-play" onClick={toggle} aria-label={playing ? 'Pause' : 'Lecture'}>{playing ? '❚❚' : '▶'}</button>
          <button type="button" onClick={() => step(1)} disabled={!current} aria-label="Suivant">⏭</button>
          <button type="button" className={`vr-shuffle ${shuffle ? 'is-on' : ''}`} onClick={() => setShuffle(s => !s)} aria-pressed={shuffle} title="Aléatoire">⤨</button>
        </div>
        <label className="vr-vol">
          <span>Vol.</span>
          <input type="range" min="0" max="100" value={volume} onChange={e => onVolume(+e.target.value)} />
        </label>

        <div className="vr-tabs" role="tablist">
          {TABS.map(t => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'is-on' : ''} onClick={() => setTab(t.id)}>{t.label}</button>
          ))}
        </div>
        <ol className="vr-list">
          {BLEACH_TRACKS[tab].map((t, i) => {
            const on = current?.list === tab && current.index === i
            const bad = failed.has(t.id)
            return (
              <li key={t.id}>
                <button type="button" className={`${on ? 'is-on' : ''} ${bad ? 'is-bad' : ''}`} onClick={() => play(tab, i)} disabled={bad} title={bad ? 'Lecture bloquée par YouTube' : undefined}>
                  <span className="vr-n">{on && playing ? '♪' : (t.tag || String(i + 1).padStart(2, '0'))}</span>
                  <span className="vr-t"><b>{t.title}</b><small>{t.artist}</small></span>
                </button>
              </li>
            )
          })}
        </ol>
      </div>
    </aside>
  )
}
