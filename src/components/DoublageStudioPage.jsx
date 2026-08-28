import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { DOUBLAGE_SCENES } from '../data/doublage-data.js'
import { DOUBLAGE_SUBS } from '../data/doublage-subs.js'
import { loadCues, cueAt } from '../lib/vttCues.js'
import DoublageBackdrop, { SIDE_A, SIDE_B } from './tournament/DoublageBackdrop.jsx'
import ArenaField from './tournament/ArenaField.jsx'
import {
  CAN_RECORD, CAN_EXPORT_VIDEO,
  attachSource, waitReady, seekTo,
  openMic, listMics, createMeter, createTakeRecorder,
  scoreTake, renderDub, voiceToWav, downloadBlob, slug,
} from '../lib/doublageStudio.js'

// ── Studio de doublage ──────────────────────────────────────────────────────
// Le pendant « actif » de la Guerre du Doublage : là-bas on juge les voix des
// autres, ici on pose la sienne. On choisit un extrait du même catalogue, on
// lit le script tiré des sous-titres pendant que la scène tourne en muet, et
// on repart avec le fichier.
//
// Trois pièces : la scène (un <video> calé sur l'extrait), le script
// (sous-titres VTT découpés sur la fenêtre du clip) et la prise (micro +
// enveloppe de niveau). Le moteur est dans lib/doublageStudio.js.

const BG      = '#050308'
const PINK    = '#9d174d'
const PURPLE  = '#4c1d95'
const PINK_L  = '#db2777'
const PINK_LL = '#f9a8d4'
const CYAN    = SIDE_A.glow
const REC     = '#ef4444'
const GRAD    = `linear-gradient(135deg, ${PINK}, ${PURPLE})`

const PREF_KEY  = 'brams_studio_prefs_v1'
const STATS_KEY = 'brams_studio_stats_v1'

const CSS = `
  @keyframes stPulse   { 0%,100%{opacity:.5} 50%{opacity:1} }
  @keyframes stRecDot  { 0%,100%{opacity:1; transform:scale(1)} 50%{opacity:.35; transform:scale(.82)} }
  @keyframes stCount   { 0%{transform:scale(.6); opacity:0} 25%{transform:scale(1); opacity:1} 100%{transform:scale(1.5); opacity:0} }
  @keyframes stTitle   { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
  .st-scroll::-webkit-scrollbar { width:8px }
  .st-scroll::-webkit-scrollbar-thumb { background:rgba(219,39,119,.35); border-radius:8px }
  .st-scroll::-webkit-scrollbar-track { background:transparent }
  /* Pas de clavier physique sous le doigt : le rappel des touches ne sert à rien. */
  @media (hover: none) and (pointer: coarse) { .st-keys { display:none } }
  @media (max-width: 620px) { .st-keys { display:none } }
  @media (prefers-reduced-motion: reduce){ [data-stfx]{animation:none!important} }
`

const card = {
  background: 'rgba(10,6,16,.72)',
  border: '1px solid rgba(255,255,255,.08)',
  borderRadius: 16,
  backdropFilter: 'blur(10px)',
}

const label = {
  fontSize: 9, letterSpacing: '.16em', textTransform: 'uppercase',
  color: 'rgba(255,255,255,.32)', fontWeight: 800,
}

const fmt = t => {
  const s = Math.max(0, Math.floor(t))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// `null` = extrait sans sous-titre : pas de note, donc pas de couleur de note.
const scoreColor = n =>
  n === null || n === undefined ? 'rgba(255,255,255,.35)'
    : n >= 72 ? '#a3e635'
      : n >= 45 ? '#fbbf24'
        : '#f87171'

function loadPrefs() {
  try { return JSON.parse(localStorage.getItem(PREF_KEY) || '{}') } catch { return {} }
}
function savePrefs(p) {
  try { localStorage.setItem(PREF_KEY, JSON.stringify(p)) } catch { /* quota */ }
}
function loadStats() {
  try {
    const raw = JSON.parse(localStorage.getItem(STATS_KEY) || '{}')
    return { takes: raw.takes || 0, best: raw.best || 0, exports: raw.exports || 0 }
  } catch { return { takes: 0, best: 0, exports: 0 } }
}
function saveStats(s) {
  try { localStorage.setItem(STATS_KEY, JSON.stringify(s)) } catch { /* quota */ }
}

// Tirage au sort d'un extrait, sur les fenêtres réellement doublables :
//  - un script existe (sans sous-titre, il n'y a rien à lire ni à noter) ;
//  - au moins 5 répliques, sinon la prise est vide ;
//  - dans les 30 premières minutes — les fenêtres de film tombent à 1 h 15 et
//    le calage y prend une éternité.
// Le sélecteur manuel, lui, laisse tout accessible.
const PLAYABLE_CLIPS = DOUBLAGE_SCENES.flatMap(s => (
  DOUBLAGE_SUBS[s.id]
    ? s.clips.flatMap((c, i) => (c.startAt < 1800 && c.lines >= 5 ? [{ sceneId: s.id, clipIndex: i }] : []))
    : []
))

function randomPick() {
  if (!PLAYABLE_CLIPS.length) return { sceneId: DOUBLAGE_SCENES[0].id, clipIndex: 0 }
  return PLAYABLE_CLIPS[Math.floor(Math.random() * PLAYABLE_CLIPS.length)]
}

// ── Vu-mètre ────────────────────────────────────────────────────────────────
function Meter({ getLevel, active }) {
  const barRef = useRef(null)
  const peakRef = useRef(0)

  useEffect(() => {
    if (!active) {
      if (barRef.current) barRef.current.style.height = '0%'
      return
    }
    let raf = 0
    const tick = () => {
      const rms = getLevel()
      // Attaque immédiate, retombée lente : un vu-mètre qui suit le RMS brut
      // clignote et ne dit rien.
      peakRef.current = Math.max(rms, peakRef.current * 0.9)
      const pct = Math.min(100, Math.round(Math.sqrt(peakRef.current) * 145))
      if (barRef.current) barRef.current.style.height = pct + '%'
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [active, getLevel])

  return (
    <div style={{
      width: 12, height: 92, borderRadius: 8, overflow: 'hidden',
      background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.09)',
      display: 'flex', alignItems: 'flex-end', flexShrink: 0,
    }}>
      <div ref={barRef} style={{
        width: '100%', height: '0%',
        background: `linear-gradient(to top, ${CYAN}, #a3e635 62%, ${REC})`,
        transition: 'height .06s linear',
      }} />
    </div>
  )
}

// ── Frise : répliques, voix enregistrée, tête de lecture ────────────────────
function WaveStrip({ cues, startAt, endAt, levelsRef, delayRef, getPlayhead, live, height = 72 }) {
  const ref = useRef(null)

  const draw = useCallback(() => {
    const canvas = ref.current
    if (!canvas) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const w = canvas.clientWidth
    const h = height
    if (canvas.width !== Math.round(w * dpr)) {
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
    }
    const g = canvas.getContext('2d')
    g.setTransform(dpr, 0, 0, dpr, 0, 0)
    g.clearRect(0, 0, w, h)

    const span = Math.max(0.5, endAt - startAt)
    const x = t => ((t - startAt) / span) * w

    // Bandes de répliques : la cible à couvrir.
    for (const c of cues) {
      const x0 = Math.max(0, x(c.start))
      const x1 = Math.min(w, x(c.end))
      g.fillStyle = 'rgba(219,39,119,.16)'
      g.fillRect(x0, 0, Math.max(2, x1 - x0), h)
      g.fillStyle = 'rgba(249,168,212,.55)'
      g.fillRect(x0, 0, 1.5, h)
    }

    // Ligne médiane.
    g.strokeStyle = 'rgba(255,255,255,.08)'
    g.beginPath(); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke()

    // Enveloppe de la voix, ramenée sur le temps de la scène.
    const levels = levelsRef?.current
    if (levels?.length) {
      const delay = delayRef?.current || 0
      g.fillStyle = CYAN
      for (let i = 0; i < levels.length; i += 2) {
        const l = levels[i]
        const px = x(startAt + (l.t - delay) / 1000)
        if (px < -2 || px > w + 2) continue
        const amp = Math.min(1, Math.sqrt(l.rms) * 1.5) * (h / 2 - 3)
        g.fillRect(px, h / 2 - amp, 1.2, amp * 2)
      }
    }

    // Tête de lecture.
    const now = getPlayhead?.()
    if (Number.isFinite(now)) {
      const px = x(now)
      g.strokeStyle = '#fff'
      g.lineWidth = 1.5
      g.beginPath(); g.moveTo(px, 0); g.lineTo(px, h); g.stroke()
    }
  }, [cues, startAt, endAt, levelsRef, delayRef, getPlayhead, height])

  useEffect(() => {
    draw()
    if (!live) return
    let raf = 0
    const loop = () => { draw(); raf = requestAnimationFrame(loop) }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [draw, live])

  return <canvas ref={ref} style={{ width: '100%', height, display: 'block', borderRadius: 10 }} />
}

// ── Sélecteur d'extrait ─────────────────────────────────────────────────────
const ANIMES = [...new Set(DOUBLAGE_SCENES.map(s => s.anime))].sort()

function ScenePicker({ open, onClose, onPick, currentId }) {
  const [anime, setAnime] = useState('')
  const [query, setQuery] = useState('')

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    return DOUBLAGE_SCENES.filter(s => {
      if (anime && s.anime !== anime) return false
      if (!q) return true
      return `${s.anime} ${s.season} ${s.episode} ${s.title}`.toLowerCase().includes(q)
    }).slice(0, 220)
  }, [anime, query])

  if (!open) return null

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(4,2,7,.82)',
        backdropFilter: 'blur(6px)', display: 'grid', placeItems: 'center', padding: 16,
      }}
    >
      <motion.div
        onClick={e => e.stopPropagation()}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          ...card, width: 'min(880px, 100%)', maxHeight: '86vh',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          border: '1px solid rgba(219,39,119,.28)',
        }}
      >
        <div style={{ padding: '18px 20px 12px', borderBottom: '1px solid rgba(255,255,255,.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ fontFamily: "'Pirata One',cursive", fontSize: 26, color: PINK_LL }}>
              Choisir la scène
            </div>
            <button onClick={onClose} style={{
              border: '1px solid rgba(255,255,255,.12)', background: 'transparent',
              color: 'rgba(255,255,255,.6)', borderRadius: 10, padding: '7px 13px',
              cursor: 'pointer', fontSize: 13, fontFamily: 'inherit',
            }}>Fermer</button>
          </div>

          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Chercher un épisode…"
            style={{
              width: '100%', marginTop: 12, padding: '11px 14px', borderRadius: 11,
              background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)',
              color: '#fff', fontSize: 14, fontFamily: 'inherit', outline: 'none',
            }}
          />

          <div className="st-scroll" style={{ display: 'flex', gap: 6, marginTop: 12, overflowX: 'auto', paddingBottom: 4 }}>
            {['', ...ANIMES].map(a => (
              <button
                key={a || 'all'}
                onClick={() => setAnime(a)}
                style={{
                  flexShrink: 0, padding: '6px 13px', borderRadius: 999, cursor: 'pointer',
                  fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
                  border: `1px solid ${anime === a ? 'rgba(219,39,119,.6)' : 'rgba(255,255,255,.1)'}`,
                  background: anime === a ? 'rgba(157,23,77,.28)' : 'rgba(255,255,255,.03)',
                  color: anime === a ? '#fff' : 'rgba(255,255,255,.5)',
                }}
              >
                {a || 'Tous'}
              </button>
            ))}
          </div>
        </div>

        <div className="st-scroll" style={{ overflowY: 'auto', padding: 12 }}>
          {list.map(s => (
            <div key={s.id} style={{
              padding: '10px 12px', borderRadius: 12, marginBottom: 6,
              background: s.id === currentId ? 'rgba(157,23,77,.16)' : 'rgba(255,255,255,.02)',
              border: `1px solid ${s.id === currentId ? 'rgba(219,39,119,.35)' : 'rgba(255,255,255,.05)'}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color, flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,.9)' }}>{s.anime}</span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,.35)' }}>
                  {s.season} · ép. {s.episode}
                </span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,.25)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {s.title}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                {s.clips.map((c, i) => (
                  <button
                    key={i}
                    onClick={() => { onPick({ sceneId: s.id, clipIndex: i }); onClose() }}
                    style={{
                      padding: '6px 12px', borderRadius: 9, cursor: 'pointer',
                      border: '1px solid rgba(219,39,119,.3)', background: 'rgba(157,23,77,.12)',
                      color: PINK_LL, fontSize: 11.5, fontWeight: 700, fontFamily: 'inherit',
                    }}
                  >
                    Extrait {i + 1} · {fmt(c.startAt)} · {c.lines} répl.
                  </button>
                ))}
              </div>
            </div>
          ))}
          {!list.length && (
            <div style={{ padding: 30, textAlign: 'center', color: 'rgba(255,255,255,.3)', fontSize: 13 }}>
              Aucun épisode ne correspond.
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}

// ── Réglage à curseur ───────────────────────────────────────────────────────
function Slider({ text, value, min, max, step, onChange, render }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={label}>{text}</span>
        <span style={{ fontSize: 11, color: PINK_LL, fontWeight: 700 }}>{render(value)}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: PINK_L, cursor: 'pointer' }}
      />
    </div>
  )
}

// ── Page ────────────────────────────────────────────────────────────────────
export default function DoublageStudioPage() {
  const prefs = useMemo(loadPrefs, [])

  const [sel, setSel]         = useState(randomPick)
  const [lang, setLang]       = useState(prefs.lang || 'vostfr')
  const [guide, setGuide]     = useState(Boolean(prefs.guide))
  const [ambience, setAmb]    = useState(prefs.ambience ?? 0.14)
  const [voiceGain, setGain]  = useState(prefs.voiceGain ?? 1.15)
  const [syncMs, setSyncMs]   = useState(0)

  const [ready, setReady]     = useState(false)
  const [loadErr, setLoadErr] = useState('')
  const [phase, setPhase]     = useState('idle')  // idle | rehearse | countdown | recording | playing
  const [count, setCount]     = useState(3)
  const [clock, setClock]     = useState(0)

  const [micState, setMic]    = useState('idle')  // idle | asking | ready | denied
  const [mics, setMics]       = useState([])
  const [micId, setMicId]     = useState(prefs.micId || '')

  const [takes, setTakes]     = useState([])
  const [activeId, setActive] = useState(null)
  const [stats, setStats]     = useState(loadStats)

  const [rendering, setRender] = useState(null)  // { stage, pct } pendant l'export
  const [result, setResult]    = useState(null)  // { url, blob, name }
  const [exportErr, setExpErr] = useState('')

  const [pickerOpen, setPicker] = useState(false)
  const [allCues, setAllCues]   = useState([])
  const [narrow, setNarrow]     = useState(() => window.innerWidth < 1040)

  const videoRef   = useRef(null)
  const voiceRef   = useRef(null)
  const streamRef  = useRef(null)
  const meterRef   = useRef(null)
  const recRef     = useRef(null)
  const levelsRef  = useRef(null)
  const delayRef   = useRef(0)
  const liveRms    = useRef(0)
  const clockRef   = useRef(0)
  // Le décompte laisse toujours son minuteur aller au bout (c'est `abortRef`
  // qui l'annule) ; `syncTimer` sert au démarrage décalé de la voix en relecture.
  const startTimer = useRef(null)
  const syncTimer  = useRef(null)
  const abortRef   = useRef(false)
  // Les blob: des prises et du montage doivent être révoqués quand on change
  // d'extrait. On les suit par ref pour ne pas glisser d'effet de bord dans un
  // updateur d'état (React le rejoue en développement).
  const takesRef   = useRef([])
  const resultRef  = useRef(null)

  useEffect(() => { takesRef.current = takes }, [takes])
  useEffect(() => { resultRef.current = result }, [result])

  const getPlayhead = useCallback(() => clockRef.current, [])

  // ── Extrait courant ───────────────────────────────────────────────────────
  const scene = useMemo(
    () => DOUBLAGE_SCENES.find(s => s.id === sel.sceneId) || DOUBLAGE_SCENES[0],
    [sel.sceneId],
  )
  const clip    = scene.clips[Math.min(sel.clipIndex, scene.clips.length - 1)]
  const startAt = clip.startAt
  const endAt   = clip.endAt
  const span    = Math.max(1, endAt - startAt)
  const source  = lang === 'vf' ? scene.vf : scene.vostfr

  const cues = useMemo(
    () => allCues.filter(c => c.end > startAt + 0.05 && c.start < endAt - 0.05),
    [allCues, startAt, endAt],
  )

  const activeTake = takes.find(t => t.id === activeId) || null

  useEffect(() => {
    const h = () => setNarrow(window.innerWidth < 1040)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

  useEffect(() => {
    savePrefs({ lang, guide, ambience, voiceGain, micId })
  }, [lang, guide, ambience, voiceGain, micId])

  // Script de l'extrait.
  useEffect(() => {
    let alive = true
    setAllCues([])
    loadCues(DOUBLAGE_SUBS[scene.id]).then(list => { if (alive) setAllCues(list) })
    return () => { alive = false }
  }, [scene.id])

  // ── Chargement de la scène ────────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    let alive = true
    setReady(false)
    setLoadErr('')
    setPhase('idle')
    setClock(startAt)
    clockRef.current = startAt

    const detach = attachSource(video, source, startAt)
    video.muted = true

    ;(async () => {
      try {
        await waitReady(video)
        if (!alive) return
        await seekTo(video, startAt)
        if (!alive) return
        setReady(true)
      } catch (err) {
        if (alive) setLoadErr(err?.message || 'Scène indisponible.')
      }
    })()

    return () => {
      alive = false
      try { video.pause() } catch { /* déjà arrêtée */ }
      detach()
    }
  }, [source, startAt])

  // Changer d'extrait remet les prises à zéro : elles ne veulent plus rien dire.
  useEffect(() => {
    takesRef.current.forEach(t => URL.revokeObjectURL(t.url))
    if (resultRef.current) URL.revokeObjectURL(resultRef.current.url)
    setTakes([])
    setActive(null)
    setResult(null)
    setSyncMs(0)
    setExpErr('')
    levelsRef.current = null
  }, [scene.id, sel.clipIndex, lang])

  // ── Horloge de lecture ────────────────────────────────────────────────────
  const running = phase === 'rehearse' || phase === 'recording' || phase === 'playing'

  useEffect(() => {
    if (!running) return
    let raf = 0
    let last = 0
    const tick = now => {
      const video = videoRef.current
      if (video) {
        clockRef.current = video.currentTime
        if (now - last > 45) { last = now; setClock(video.currentTime) }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [running])

  // Fin de l'extrait : on coupe au lieu de laisser filer sur la suite de l'épisode.
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      const video = videoRef.current
      if (!video) return
      if (video.currentTime >= endAt || video.ended) {
        if (phase === 'recording') finishTake()
        else stopPlayback()
      }
    }, 80)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, phase, endAt])

  // ── Micro ─────────────────────────────────────────────────────────────────
  const askMic = useCallback(async (deviceId) => {
    if (!CAN_RECORD) return null
    setMic('asking')
    try {
      streamRef.current?.getTracks().forEach(t => t.stop())
      meterRef.current?.close()
      const stream = await openMic(deviceId || micId)
      streamRef.current = stream
      meterRef.current = createMeter(stream)
      setMic('ready')
      listMics().then(setMics)
      return stream
    } catch {
      setMic('denied')
      return null
    }
  }, [micId])

  useEffect(() => () => {
    abortRef.current = true
    streamRef.current?.getTracks().forEach(t => t.stop())
    meterRef.current?.close()
    clearTimeout(syncTimer.current)
    takesRef.current.forEach(t => URL.revokeObjectURL(t.url))
    if (resultRef.current) URL.revokeObjectURL(resultRef.current.url)
  }, [])

  // ── Répétition (son d'origine) ────────────────────────────────────────────
  async function rehearse() {
    const video = videoRef.current
    if (!video || !ready) return
    stopPlayback()
    await seekTo(video, startAt).catch(() => {})
    video.muted = false
    video.volume = 1
    setPhase('rehearse')
    video.play().catch(() => {})
  }

  function stopPlayback() {
    const video = videoRef.current
    const voice = voiceRef.current
    clearTimeout(syncTimer.current)
    try { video?.pause() } catch { /* déjà arrêtée */ }
    try { voice?.pause() } catch { /* déjà arrêtée */ }
    setPhase('idle')
  }

  // ── Enregistrement ────────────────────────────────────────────────────────
  async function startRecording() {
    if (!ready) return
    let stream = streamRef.current
    if (!stream || micState !== 'ready') stream = await askMic()
    if (!stream) return

    stopPlayback()
    const video = videoRef.current
    await seekTo(video, startAt).catch(() => {})

    abortRef.current = false
    setPhase('countdown')
    for (let n = 3; n >= 1; n--) {
      setCount(n)
      // eslint-disable-next-line no-await-in-loop
      await new Promise(r => { startTimer.current = setTimeout(r, 850) })
      if (abortRef.current) return
    }

    const rec = createTakeRecorder(stream, meterRef.current)
    recRef.current = rec
    // L'enveloppe vit dans le recorder : la frise la dessine en direct.
    levelsRef.current = rec.levels
    delayRef.current = 0
    rec.onLevel = rms => { liveRms.current = rms }

    rec.onStart = () => {
      const t0 = performance.now()
      const onPlaying = () => {
        // Écart réel entre le départ du micro et la première image jouée :
        // c'est lui qui recale la voix sur l'image à l'export.
        delayRef.current = performance.now() - t0
        video.removeEventListener('playing', onPlaying)
      }
      video.addEventListener('playing', onPlaying)
      // Sans casque, le guide part dans le micro : coupé par défaut.
      video.muted = !guide
      video.volume = guide ? 0.22 : 1
      setPhase('recording')
      video.play().catch(() => {})
    }

    rec.start()
    // L'enveloppe vit dans le recorder ; on la pointe pour la frise en direct.
    levelsRef.current = rec.levels || levelsRef.current
  }

  async function finishTake() {
    const rec = recRef.current
    if (!rec) return
    recRef.current = null
    const video = videoRef.current
    try { video?.pause() } catch { /* déjà arrêtée */ }

    const take = await rec.stop()
    setPhase('idle')
    if (!take || !take.blob.size) return

    // Sans script (sous-titre absent pour cet épisode) il n'y a rien à noter :
    // la prise reste jouable et exportable, mais on n'invente pas une note.
    const scored = cues.length
      ? scoreTake({ levels: take.levels, cues, startAt, videoDelayMs: delayRef.current })
      : { score: null, label: 'Sans script', lines: [], noise: 0 }
    const entry = {
      id: `t${Date.now()}`,
      blob: take.blob,
      url: URL.createObjectURL(take.blob),
      levels: take.levels,
      delayMs: delayRef.current,
      score: scored,
      at: Date.now(),
    }
    levelsRef.current = take.levels
    setTakes(list => [entry, ...list].slice(0, 8))
    setActive(entry.id)
    setStats(s => {
      const next = { ...s, takes: s.takes + 1, best: Math.max(s.best, scored.score ?? 0) }
      saveStats(next)
      return next
    })
  }

  function cancelRecording() {
    abortRef.current = true
    const rec = recRef.current
    recRef.current = null
    rec?.stop()
    stopPlayback()
  }

  // ── Relecture de la prise ─────────────────────────────────────────────────
  async function playTake() {
    const take = activeTake
    const video = videoRef.current
    const voice = voiceRef.current
    if (!take || !video || !voice) return

    stopPlayback()
    await seekTo(video, startAt).catch(() => {})
    video.muted = false
    video.volume = ambience
    voice.volume = Math.min(1, voiceGain)

    // À l'image `startAt`, la voix en est à delayMs (moins le décalage manuel).
    const shift = (take.delayMs - syncMs) / 1000
    voice.currentTime = Math.max(0, shift)
    setPhase('playing')

    if (shift >= 0) {
      voice.play().catch(() => {})
      video.play().catch(() => {})
    } else {
      // La voix doit partir avant l'image.
      voice.play().catch(() => {})
      syncTimer.current = setTimeout(() => video.play().catch(() => {}), -shift * 1000)
    }
  }

  // La voix et l'image dérivent sur les longs extraits : on recale doucement.
  useEffect(() => {
    if (phase !== 'playing' || !activeTake) return
    const id = setInterval(() => {
      const video = videoRef.current
      const voice = voiceRef.current
      if (!video || !voice || voice.paused) return
      const want = (video.currentTime - startAt) + (activeTake.delayMs - syncMs) / 1000
      if (want >= 0 && Math.abs(voice.currentTime - want) > 0.14) voice.currentTime = want
    }, 600)
    return () => clearInterval(id)
  }, [phase, activeTake, startAt, syncMs])

  useEffect(() => {
    const voice = voiceRef.current
    if (voice) voice.volume = Math.min(1, voiceGain)
    const video = videoRef.current
    if (video && phase === 'playing') video.volume = ambience
  }, [voiceGain, ambience, phase])

  // ── Export ────────────────────────────────────────────────────────────────
  async function exportVideo() {
    const take = activeTake
    if (!take || rendering) return
    setExpErr('')
    if (resultRef.current) URL.revokeObjectURL(resultRef.current.url)
    setResult(null)
    stopPlayback()
    setRender({ stage: 'Préparation…', pct: 0 })
    try {
      const blob = await renderDub({
        videoUrl: source,
        startAt, endAt,
        voiceBlob: take.blob,
        voiceGain, ambience,
        videoDelayMs: take.delayMs,
        syncMs,
        onStage: stage => setRender(r => ({ ...(r || {}), stage })),
        onProgress: pct => setRender(r => ({ ...(r || {}), pct })),
      })
      const name = `doublage-${slug(scene.anime)}-${scene.season}e${scene.episode}-${sel.clipIndex + 1}.webm`
      setResult({ url: URL.createObjectURL(blob), blob, name })
      setStats(s => { const next = { ...s, exports: s.exports + 1 }; saveStats(next); return next })
    } catch (err) {
      setExpErr(err?.message || "Le rendu a échoué.")
    } finally {
      setRender(null)
    }
  }

  async function exportVoice() {
    const take = activeTake
    if (!take) return
    setExpErr('')
    try {
      const wav = await voiceToWav(take.blob)
      downloadBlob(wav, `voix-${slug(scene.anime)}-${scene.season}e${scene.episode}-${sel.clipIndex + 1}.wav`)
    } catch (err) {
      setExpErr(err?.message || "Impossible de convertir la voix.")
    }
  }

  // ── Raccourcis ────────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = e => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || pickerOpen) return
      const k = e.key.toLowerCase()
      if (k === ' ' || k === 'spacebar') {
        e.preventDefault()
        if (phase === 'recording') finishTake()
        else if (phase === 'countdown') cancelRecording()
        else startRecording()
      }
      if (k === 'r') rehearse()
      if (k === 'p') { if (phase === 'playing') stopPlayback(); else playTake() }
      if (k === 'escape') { if (phase === 'countdown') cancelRecording(); else stopPlayback() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // ── Script à l'écran ──────────────────────────────────────────────────────
  const current = useMemo(() => (cues.length ? cueAt(cues, clock) : null), [cues, clock])
  const nextCue = useMemo(() => cues.find(c => c.start > clock) || null, [cues, clock])
  const cueIndex = current ? cues.indexOf(current) : -1

  // Ce qu'affiche le téléprompteur : la réplique du moment quand ça tourne,
  // la première réplique à l'arrêt (en gris).
  const prompt = running ? current : (cues[0] || null)
  const promptNext = running
    ? (nextCue && nextCue !== current ? nextCue : null)
    : (cues[1] || null)

  const progress = Math.max(0, Math.min(1, (clock - startAt) / span))
  const recording = phase === 'recording'

  const stage = (
    <div style={{
      position: 'relative', width: '100%', aspectRatio: '16 / 9',
      borderRadius: 16, overflow: 'hidden', background: '#000',
      border: `1px solid ${recording ? REC : 'rgba(219,39,119,.32)'}`,
      boxShadow: recording ? `0 0 52px -10px ${REC}88` : `0 0 46px -14px ${PINK_L}66`,
      transition: 'border-color .25s, box-shadow .25s',
    }}>
      <video
        ref={videoRef}
        crossOrigin="anonymous"
        playsInline
        preload="auto"
        muted
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
      />

      {!ready && !loadErr && (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: 'rgba(255,255,255,.55)', fontSize: 13, letterSpacing: '.08em' }}>
          <span data-stfx style={{ animation: 'stPulse 1.4s ease-in-out infinite' }}>CALAGE SUR L'EXTRAIT…</span>
        </div>
      )}

      {loadErr && (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', padding: 20, textAlign: 'center' }}>
          <div>
            <div style={{ color: '#fca5a5', fontSize: 14, marginBottom: 12 }}>{loadErr}</div>
            <button onClick={() => setSel(randomPick())} style={{
              padding: '10px 18px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
              border: '1px solid rgba(219,39,119,.4)', background: 'rgba(157,23,77,.16)',
              color: PINK_LL, fontSize: 13, fontWeight: 700,
            }}>Prendre une autre scène</button>
          </div>
        </div>
      )}

      {/* Décompte avant la prise : la première réplique est déjà affichée. */}
      <AnimatePresence>
        {phase === 'countdown' && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: 'rgba(5,3,8,.6)' }}
          >
            <div style={{ textAlign: 'center' }}>
              <div key={count} data-stfx style={{
                fontFamily: "'Pirata One',cursive", fontSize: 'clamp(60px,14vw,140px)',
                color: '#fff', textShadow: `0 0 40px ${REC}`, lineHeight: 1,
                animation: 'stCount .85s ease-out',
              }}>{count}</div>
              {cues[0] && (
                <div style={{ marginTop: 10, color: PINK_LL, fontSize: 'clamp(13px,1.8vw,17px)', maxWidth: 520, padding: '0 16px' }}>
                  « {cues[0].text} »
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Témoin d'enregistrement. */}
      {recording && (
        <div style={{
          position: 'absolute', top: 12, left: 12, display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 13px', borderRadius: 999, background: 'rgba(0,0,0,.6)',
          border: `1px solid ${REC}88`, zIndex: 3,
        }}>
          <span data-stfx style={{ width: 9, height: 9, borderRadius: '50%', background: REC, animation: 'stRecDot 1s ease-in-out infinite' }} />
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.14em', color: '#fff' }}>REC</span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,.5)' }}>{fmt(clock - startAt)} / {fmt(span)}</span>
        </div>
      )}

      {phase === 'rehearse' && (
        <div style={{
          position: 'absolute', top: 12, left: 12, padding: '6px 13px', borderRadius: 999,
          background: 'rgba(0,0,0,.6)', border: `1px solid ${CYAN}66`, zIndex: 3,
          fontSize: 11, fontWeight: 800, letterSpacing: '.12em', color: CYAN,
        }}>
          RÉPÉTITION · SON D'ORIGINE
        </div>
      )}

      {phase === 'playing' && (
        <div style={{
          position: 'absolute', top: 12, left: 12, padding: '6px 13px', borderRadius: 999,
          background: 'rgba(0,0,0,.6)', border: `1px solid ${PINK_L}88`, zIndex: 3,
          fontSize: 11, fontWeight: 800, letterSpacing: '.12em', color: PINK_LL,
        }}>
          TA PRISE
        </div>
      )}

      {/* Téléprompteur : la réplique à dire, puis celle qui suit. */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 2,
        padding: '52px 5% 18px',
        background: 'linear-gradient(to top, rgba(0,0,0,.92) 30%, transparent)',
        textAlign: 'center', pointerEvents: 'none',
      }}>
        {/* À l'arrêt on montre la première réplique en gris : on sait par quoi
            ça commence sans croire que la manche a déjà démarré. */}
        <div style={{
          fontSize: 'clamp(16px,2.3vw,27px)', fontWeight: 700, lineHeight: 1.35,
          color: running && current ? '#fff' : 'rgba(255,255,255,.4)',
          textShadow: '0 2px 10px rgba(0,0,0,.95)',
          minHeight: '1.4em', whiteSpace: 'pre-line',
        }}>
          {prompt ? prompt.text : (cues.length ? '…' : 'Pas de script pour cet extrait — improvise.')}
        </div>
        {promptNext && (
          <div style={{
            marginTop: 6, fontSize: 'clamp(11px,1.3vw,15px)',
            color: 'rgba(255,255,255,.34)', whiteSpace: 'pre-line',
          }}>
            ↓ {promptNext.text}
          </div>
        )}
        {/* Barre de la réplique en cours : on voit le temps qu'il reste pour la dire. */}
        <div style={{ height: 3, borderRadius: 3, background: 'rgba(255,255,255,.1)', marginTop: 10, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: running && current
              ? `${Math.min(100, Math.max(0, ((clock - current.start) / Math.max(0.3, current.end - current.start)) * 100))}%`
              : '0%',
            background: `linear-gradient(90deg, ${PURPLE}, ${PINK_L})`,
          }} />
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: BG, position: 'relative' }}>
      <style>{CSS}</style>
      <DoublageBackdrop side={recording ? 'B' : 'A'} revealed={null} started={running} />
      <ArenaField accentA={CYAN} accentB={SIDE_B.glow} density={0.6} zIndex={1} />

      <audio ref={voiceRef} src={activeTake?.url || undefined} preload="auto" />

      <div style={{
        position: 'relative', zIndex: 2, maxWidth: 1440, margin: '0 auto',
        padding: 'clamp(88px,9vw,120px) clamp(14px,4vw,48px) 72px',
      }}>
        {/* Fil d'Ariane + titre */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <Link to="/tournoi" style={{
            color: 'rgba(255,255,255,.35)', textDecoration: 'none', fontSize: 11,
            fontWeight: 600, letterSpacing: '.06em', padding: '8px 10px', margin: '-8px -10px',
          }}>← Tournois</Link>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,.14)' }}>/</span>
          <Link to="/tournoi/doublage" style={{
            color: 'rgba(255,255,255,.5)', textDecoration: 'none', fontSize: 11, fontWeight: 600,
          }}>Doublage</Link>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,.14)' }}>/</span>
          <span style={{ fontSize: 11, color: PINK_LL, fontWeight: 700 }}>Studio</span>
        </div>

        <div style={{ textAlign: 'center', marginBottom: 26 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 18px',
            borderRadius: 100, background: 'rgba(157,23,77,.10)', border: '1px solid rgba(157,23,77,.3)',
            fontSize: 9, fontWeight: 800, letterSpacing: '.18em', color: PINK_LL,
            textTransform: 'uppercase', marginBottom: 14,
          }}>🎙 Cabine ouverte</div>
          <h1 data-stfx style={{
            fontFamily: "'Pirata One',cursive", fontSize: 'clamp(38px,6.4vw,78px)',
            margin: '0 0 10px', lineHeight: .95,
            background: `linear-gradient(110deg, ${PINK_LL} 0%, ${PINK_L} 30%, ${PURPLE} 55%, ${PINK_L} 80%, ${PINK_LL} 100%)`,
            backgroundSize: '220% 100%',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            animation: 'stTitle 9s ease-in-out infinite',
            filter: 'drop-shadow(0 6px 34px rgba(157,23,77,.4))',
          }}>Studio de Doublage</h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,.34)', maxWidth: 560, margin: '0 auto', lineHeight: 1.65 }}>
            Choisis une scène, lis le script pendant qu'elle tourne, pose ta voix.
            Tu repars avec le fichier.
          </p>
        </div>

        {!CAN_RECORD && (
          <div style={{
            ...card, padding: 16, marginBottom: 18, borderColor: 'rgba(220,72,72,.4)',
            color: '#fca5a5', fontSize: 13, lineHeight: 1.6, textAlign: 'center',
          }}>
            Ce navigateur ne donne pas accès au micro (il faut une connexion sécurisée et
            un navigateur récent). Le studio a besoin de <b>getUserMedia</b> et de <b>MediaRecorder</b>.
          </div>
        )}

        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexDirection: narrow ? 'column' : 'row' }}>
          {/* ── Colonne scène ─────────────────────────────────────────────── */}
          <div style={{ flex: '1 1 0', minWidth: 0, width: '100%' }}>
            {/* Bandeau extrait */}
            <div style={{ ...card, padding: '12px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: scene.color, flexShrink: 0 }} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>{scene.anime}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,.36)' }}>
                  {scene.season} · ép. {scene.episode} · extrait {sel.clipIndex + 1} · {fmt(span)} · {cues.length} répliques
                </div>
              </div>
              <button onClick={() => setPicker(true)} style={{
                padding: '9px 15px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
                border: '1px solid rgba(219,39,119,.4)', background: 'rgba(157,23,77,.14)',
                color: PINK_LL, fontSize: 12.5, fontWeight: 700,
              }}>Changer de scène</button>
              <button onClick={() => setSel(randomPick())} style={{
                padding: '9px 15px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
                border: '1px solid rgba(255,255,255,.12)', background: 'transparent',
                color: 'rgba(255,255,255,.6)', fontSize: 12.5, fontWeight: 700,
              }}>Au hasard</button>
            </div>

            {stage}

            {/* Frise : répliques + voix + tête de lecture */}
            <div style={{ ...card, padding: 12, marginTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={label}>Répliques &amp; ta voix</span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,.4)' }}>
                  {fmt(clock - startAt)} / {fmt(span)}
                </span>
              </div>
              <WaveStrip
                cues={cues}
                startAt={startAt}
                endAt={endAt}
                levelsRef={levelsRef}
                delayRef={delayRef}
                getPlayhead={getPlayhead}
                live={running}
              />
              <div style={{ height: 3, borderRadius: 3, background: 'rgba(255,255,255,.07)', marginTop: 8, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progress * 100}%`, background: `linear-gradient(90deg, ${PURPLE}, ${PINK_L})` }} />
              </div>
            </div>

            {/* Transport */}
            <div style={{ ...card, padding: 14, marginTop: 12, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              {micState === 'ready' && <Meter getLevel={() => liveRms.current} active={recording} />}

              {phase === 'recording' ? (
                <button onClick={finishTake} style={{
                  flex: '1 1 200px', padding: '15px 20px', borderRadius: 13, cursor: 'pointer',
                  border: `1px solid ${REC}`, background: `${REC}22`, color: '#fff',
                  fontSize: 15, fontWeight: 800, fontFamily: 'inherit', letterSpacing: '.03em',
                }}>■ Arrêter la prise</button>
              ) : phase === 'countdown' ? (
                <button onClick={cancelRecording} style={{
                  flex: '1 1 200px', padding: '15px 20px', borderRadius: 13, cursor: 'pointer',
                  border: '1px solid rgba(255,255,255,.15)', background: 'rgba(255,255,255,.05)',
                  color: 'rgba(255,255,255,.75)', fontSize: 15, fontWeight: 800, fontFamily: 'inherit',
                }}>Annuler</button>
              ) : (
                <button
                  onClick={startRecording}
                  disabled={!ready || !CAN_RECORD}
                  style={{
                    flex: '1 1 200px', padding: '15px 20px', borderRadius: 13,
                    cursor: ready && CAN_RECORD ? 'pointer' : 'not-allowed',
                    border: `1px solid ${ready ? REC : 'rgba(255,255,255,.08)'}`,
                    background: ready ? `linear-gradient(135deg, ${REC}, ${PINK})` : 'rgba(255,255,255,.03)',
                    color: ready ? '#fff' : 'rgba(255,255,255,.25)',
                    fontSize: 15, fontWeight: 800, fontFamily: 'inherit', letterSpacing: '.03em',
                    boxShadow: ready ? `0 8px 28px -8px ${REC}aa` : 'none',
                  }}
                >● {takes.length ? 'Nouvelle prise' : 'Enregistrer'}</button>
              )}

              <button
                onClick={() => (phase === 'rehearse' ? stopPlayback() : rehearse())}
                disabled={!ready}
                style={{
                  padding: '15px 18px', borderRadius: 13, cursor: ready ? 'pointer' : 'not-allowed',
                  border: `1px solid ${CYAN}55`, background: 'rgba(34,211,238,.08)',
                  color: ready ? CYAN : 'rgba(255,255,255,.25)',
                  fontSize: 13.5, fontWeight: 800, fontFamily: 'inherit',
                }}
              >{phase === 'rehearse' ? '■ Stop' : '▶ Répéter'}</button>

              <button
                onClick={() => (phase === 'playing' ? stopPlayback() : playTake())}
                disabled={!activeTake}
                style={{
                  padding: '15px 18px', borderRadius: 13, cursor: activeTake ? 'pointer' : 'not-allowed',
                  border: `1px solid ${activeTake ? 'rgba(219,39,119,.45)' : 'rgba(255,255,255,.07)'}`,
                  background: activeTake ? 'rgba(157,23,77,.14)' : 'rgba(255,255,255,.02)',
                  color: activeTake ? PINK_LL : 'rgba(255,255,255,.24)',
                  fontSize: 13.5, fontWeight: 800, fontFamily: 'inherit',
                }}
              >{phase === 'playing' ? '■ Stop' : '▶ Ma prise'}</button>

              <div className="st-keys" style={{ fontSize: 10.5, color: 'rgba(255,255,255,.22)', letterSpacing: '.04em' }}>
                Espace enregistrer · R répéter · P relire · Échap stop
              </div>
            </div>

            {micState === 'denied' && (
              <div style={{ ...card, padding: 14, marginTop: 12, borderColor: 'rgba(220,72,72,.4)', color: '#fca5a5', fontSize: 13, lineHeight: 1.6 }}>
                Micro refusé. Autorise-le dans la barre d'adresse, puis{' '}
                <button onClick={() => askMic()} style={{
                  border: 'none', background: 'none', color: PINK_LL, cursor: 'pointer',
                  textDecoration: 'underline', fontSize: 13, fontFamily: 'inherit', padding: 0,
                }}>réessaie</button>.
              </div>
            )}

            {/* Script complet */}
            {cues.length > 0 && (
              <div style={{ ...card, padding: 14, marginTop: 12 }}>
                <div style={{ ...label, marginBottom: 10 }}>Script de l'extrait</div>
                <div className="st-scroll" style={{ maxHeight: 260, overflowY: 'auto', paddingRight: 6 }}>
                  {cues.map((c, i) => {
                    const line = activeTake?.score.lines[i]
                    const on = i === cueIndex
                    return (
                      <div key={`${c.start}-${i}`} style={{
                        display: 'flex', gap: 10, padding: '8px 10px', borderRadius: 9, marginBottom: 4,
                        background: on ? 'rgba(157,23,77,.2)' : 'rgba(255,255,255,.02)',
                        border: `1px solid ${on ? 'rgba(219,39,119,.4)' : 'transparent'}`,
                      }}>
                        <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,.28)', width: 42, flexShrink: 0, paddingTop: 2 }}>
                          {fmt(c.start - startAt)}
                        </span>
                        <span style={{ fontSize: 13, color: on ? '#fff' : 'rgba(255,255,255,.62)', flex: 1, lineHeight: 1.5, whiteSpace: 'pre-line' }}>
                          {c.text}
                        </span>
                        {line && (
                          <span style={{
                            fontSize: 10.5, fontWeight: 800, alignSelf: 'center', flexShrink: 0,
                            color: line.coverage > 0.6 ? '#a3e635' : line.coverage > 0.3 ? '#fbbf24' : '#f87171',
                          }}>
                            {Math.round(line.coverage * 100)}%
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── Colonne régie ─────────────────────────────────────────────── */}
          <div style={{ width: narrow ? '100%' : 330, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Note de la prise */}
            <div style={{ ...card, padding: 16 }}>
              <div style={{ ...label, marginBottom: 12 }}>Synchro de la prise</div>
              {activeTake ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                    <span style={{
                      fontFamily: "'Pirata One',cursive", fontSize: 54, lineHeight: 1,
                      color: scoreColor(activeTake.score.score),
                    }}>{activeTake.score.score ?? '—'}</span>
                    {activeTake.score.score !== null && (
                      <span style={{ fontSize: 13, color: 'rgba(255,255,255,.4)' }}>/ 100</span>
                    )}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: PINK_LL, marginTop: 2 }}>
                    {activeTake.score.label}
                  </div>
                  <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,.3)', lineHeight: 1.6, marginTop: 10, marginBottom: 0 }}>
                    {activeTake.score.score === null
                      ? "Aucun sous-titre pour cet épisode : la prise s'exporte quand même, mais il n'y a rien à noter."
                      : <>Mesure du <b>timing</b>, pas du texte : parler pendant les répliques,
                        se taire entre elles. Bruit hors réplique&nbsp;: {Math.round(activeTake.score.noise * 100)}%.</>}
                  </p>
                </>
              ) : (
                <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,.3)', lineHeight: 1.6, margin: 0 }}>
                  Enregistre une prise pour voir ta note de synchro.
                </p>
              )}
            </div>

            {/* Prises */}
            <div style={{ ...card, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={label}>Prises</span>
                <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,.3)' }}>{takes.length} / 8</span>
              </div>
              {takes.length === 0 && (
                <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,.28)' }}>Aucune prise pour l'instant.</div>
              )}
              {takes.map((t, i) => {
                const on = t.id === activeId
                return (
                  <div key={t.id} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '9px 11px', borderRadius: 10,
                    marginBottom: 5, cursor: 'pointer',
                    background: on ? 'rgba(157,23,77,.2)' : 'rgba(255,255,255,.025)',
                    border: `1px solid ${on ? 'rgba(219,39,119,.42)' : 'rgba(255,255,255,.05)'}`,
                  }} onClick={() => { setActive(t.id); levelsRef.current = t.levels; delayRef.current = t.delayMs }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: on ? '#fff' : 'rgba(255,255,255,.6)' }}>
                      Prise {takes.length - i}
                    </span>
                    <span style={{
                      fontSize: 11, fontWeight: 800, marginLeft: 'auto',
                      color: scoreColor(t.score.score),
                    }}>{t.score.score ?? '—'}</span>
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        URL.revokeObjectURL(t.url)
                        setTakes(list => list.filter(x => x.id !== t.id))
                        if (on) setActive(null)
                      }}
                      title="Supprimer la prise"
                      style={{
                        border: 'none', background: 'none', cursor: 'pointer', padding: '2px 4px',
                        color: 'rgba(255,255,255,.3)', fontSize: 14, fontFamily: 'inherit',
                      }}
                    >×</button>
                  </div>
                )
              })}
            </div>

            {/* Réglages */}
            <div style={{ ...card, padding: 16 }}>
              <div style={{ ...label, marginBottom: 12 }}>Régie</div>

              <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                {[['vostfr', 'Image VOSTFR'], ['vf', 'Image VF']].map(([v, txt]) => (
                  <button key={v} onClick={() => setLang(v)} style={{
                    flex: 1, padding: '9px 0', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
                    border: `1px solid ${lang === v ? 'rgba(219,39,119,.5)' : 'rgba(255,255,255,.09)'}`,
                    background: lang === v ? 'rgba(157,23,77,.22)' : 'rgba(255,255,255,.02)',
                    color: lang === v ? '#fff' : 'rgba(255,255,255,.45)',
                    fontSize: 11.5, fontWeight: 700,
                  }}>{txt}</button>
                ))}
              </div>

              <Slider
                text="Ambiance d'origine" value={ambience} min={0} max={0.6} step={0.02}
                onChange={setAmb} render={v => `${Math.round(v * 100)}%`}
              />
              <Slider
                text="Niveau de ta voix" value={voiceGain} min={0.4} max={2.5} step={0.05}
                onChange={setGain} render={v => `${v.toFixed(2)}×`}
              />
              <Slider
                text="Décalage voix / image" value={syncMs} min={-600} max={600} step={10}
                onChange={setSyncMs} render={v => `${v > 0 ? '+' : ''}${v} ms`}
              />

              <label style={{
                display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer',
                fontSize: 12.5, color: 'rgba(255,255,255,.62)', marginTop: 4,
              }}>
                <input type="checkbox" checked={guide} onChange={e => setGuide(e.target.checked)} style={{ accentColor: PINK_L }} />
                Guide audio pendant la prise
              </label>
              <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,.26)', marginTop: 5, lineHeight: 1.5 }}>
                Sans casque, la scène repart dans le micro. À n'activer qu'au casque.
              </div>

              {mics.length > 1 && (
                <select
                  value={micId}
                  onChange={e => { setMicId(e.target.value); askMic(e.target.value) }}
                  style={{
                    width: '100%', marginTop: 12, padding: '9px 11px', borderRadius: 10,
                    background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)',
                    color: 'rgba(255,255,255,.75)', fontSize: 12, fontFamily: 'inherit',
                  }}
                >
                  {mics.map(m => (
                    <option key={m.deviceId} value={m.deviceId} style={{ background: '#140a1c' }}>
                      {m.label || 'Micro'}
                    </option>
                  ))}
                </select>
              )}

              {micState !== 'ready' && CAN_RECORD && (
                <button onClick={() => askMic()} style={{
                  width: '100%', marginTop: 12, padding: '11px 0', borderRadius: 11, cursor: 'pointer',
                  border: `1px solid ${CYAN}55`, background: 'rgba(34,211,238,.08)',
                  color: CYAN, fontSize: 12.5, fontWeight: 800, fontFamily: 'inherit',
                }}>
                  {micState === 'asking' ? 'Autorisation…' : 'Brancher le micro'}
                </button>
              )}
            </div>

            {/* Export */}
            <div style={{ ...card, padding: 16, borderColor: 'rgba(219,39,119,.24)' }}>
              <div style={{ ...label, marginBottom: 12 }}>Le fichier</div>

              {rendering ? (
                <>
                  <div style={{ fontSize: 12.5, color: PINK_LL, marginBottom: 8 }}>{rendering.stage}</div>
                  <div style={{ height: 6, borderRadius: 4, background: 'rgba(255,255,255,.07)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${Math.round((rendering.pct || 0) * 100)}%`,
                      background: `linear-gradient(90deg, ${PURPLE}, ${PINK_L})`, transition: 'width .2s linear',
                    }} />
                  </div>
                  <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,.28)', marginTop: 8, lineHeight: 1.5 }}>
                    Le rendu se fait en temps réel : garde l'onglet au premier plan
                    jusqu'à la fin.
                  </div>
                </>
              ) : (
                <>
                  <button
                    onClick={exportVideo}
                    disabled={!activeTake || !CAN_EXPORT_VIDEO}
                    style={{
                      width: '100%', padding: '13px 0', borderRadius: 12,
                      cursor: activeTake && CAN_EXPORT_VIDEO ? 'pointer' : 'not-allowed',
                      border: 'none', background: activeTake && CAN_EXPORT_VIDEO ? GRAD : 'rgba(255,255,255,.03)',
                      color: activeTake && CAN_EXPORT_VIDEO ? '#fff' : 'rgba(255,255,255,.25)',
                      fontSize: 13.5, fontWeight: 800, fontFamily: 'inherit',
                      boxShadow: activeTake && CAN_EXPORT_VIDEO ? '0 8px 26px -10px rgba(157,23,77,.9)' : 'none',
                    }}
                  >🎬 Monter la vidéo doublée</button>

                  <button
                    onClick={exportVoice}
                    disabled={!activeTake}
                    style={{
                      width: '100%', marginTop: 8, padding: '11px 0', borderRadius: 12,
                      cursor: activeTake ? 'pointer' : 'not-allowed',
                      border: '1px solid rgba(255,255,255,.12)', background: 'transparent',
                      color: activeTake ? 'rgba(255,255,255,.7)' : 'rgba(255,255,255,.25)',
                      fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit',
                    }}
                  >🎤 Voix seule (.wav)</button>

                  {!CAN_EXPORT_VIDEO && (
                    <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,.3)', marginTop: 8, lineHeight: 1.5 }}>
                      Ce navigateur n'encode pas la vidéo — l'export voix reste possible.
                    </div>
                  )}
                </>
              )}

              {exportErr && (
                <div style={{ fontSize: 12, color: '#fca5a5', marginTop: 10, lineHeight: 1.5 }}>{exportErr}</div>
              )}

              {result && (
                <div style={{ marginTop: 14 }}>
                  <video
                    src={result.url}
                    controls
                    style={{ width: '100%', borderRadius: 10, background: '#000', display: 'block' }}
                  />
                  <button
                    onClick={() => downloadBlob(result.blob, result.name)}
                    style={{
                      width: '100%', marginTop: 8, padding: '12px 0', borderRadius: 12, cursor: 'pointer',
                      border: `1px solid ${CYAN}66`, background: 'rgba(34,211,238,.12)',
                      color: CYAN, fontSize: 13, fontWeight: 800, fontFamily: 'inherit',
                    }}
                  >⬇ Télécharger {result.name.length > 26 ? '' : result.name}</button>
                </div>
              )}
            </div>

            {/* Compteurs */}
            <div style={{ ...card, padding: 14, display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
              {[['Prises', stats.takes], ['Record', stats.best], ['Exports', stats.exports]].map(([t, v]) => (
                <div key={t}>
                  <div style={{ fontFamily: "'Pirata One',cursive", fontSize: 22, color: PINK_LL }}>{v}</div>
                  <div style={label}>{t}</div>
                </div>
              ))}
            </div>

            <Link to="/tournoi/doublage" style={{
              ...card, padding: '13px 16px', textDecoration: 'none', display: 'block',
              color: 'rgba(255,255,255,.6)', fontSize: 12.5, lineHeight: 1.55,
            }}>
              <b style={{ color: PINK_LL }}>Guerre du Doublage →</b><br />
              Juger les voix des autres, VF contre VOSTFR, à l'aveugle.
            </Link>
          </div>
        </div>
      </div>

      <ScenePicker
        open={pickerOpen}
        onClose={() => setPicker(false)}
        onPick={setSel}
        currentId={scene.id}
      />
    </div>
  )
}
