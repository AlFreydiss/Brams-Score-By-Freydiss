import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { DOUBLAGE_SCENES } from '../data/doublage-data.js'
import { DOUBLAGE_SUBS } from '../data/doublage-subs.js'
import { loadCues, cueAt } from '../lib/vttCues.js'
import {
  CAN_RECORD, CAN_EXPORT_VIDEO,
  attachSource, waitReady, seekTo,
  openMic, listMics, createMeter, createTakeRecorder,
  scoreTake, renderDub, voiceToWav, downloadBlob, slug,
} from '../lib/doublageStudio.js'
import {
  getContext, mediaSource, createOriginalChain, createVoiceProcessor,
  speechWindows, scheduleWindows, stereoVerdict, peakGain,
  scheduleCountIn, VOICE_PRESETS,
} from '../lib/dubMixer.js'

// ── Studio de doublage ──────────────────────────────────────────────────────
// Une cabine, pas une arène : ici on travaille, donc l'écran est gris, la seule
// couleur est le témoin d'enregistrement, et tout ce qui est chiffré est en
// chasse fixe. Le décor animé des pages de tournoi est volontairement absent —
// il volait des images à l'encodage temps réel du rendu.
//
// Le geste central : la voix japonaise ou française d'origine est retirée
// pendant les répliques (voir lib/dubMixer.js), on pose la sienne à la place,
// et on repart avec le fichier monté.

const INK   = '#08080a'
const PANEL = '#0f0f13'
const RAISE = '#15151b'
const LINE  = '#22222b'
const TXT   = '#e8e8ec'
const DIM   = '#8b8b96'
const FAINT = '#5a5a66'
const REC   = '#e5484d'
const OK    = '#7dc98f'
const GHOST = '#3f3f4b'

const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'

const PREF_KEY  = 'brams_studio_prefs_v2'
const STATS_KEY = 'brams_studio_stats_v1'

const PRE_ROLL = 1.5    // s d'élan avant une réplique en mode ligne par ligne
const POST_ROLL = 0.6   // s de queue après

const CSS = `
  .st-a { transition: background .14s, border-color .14s, color .14s }
  .st-a:hover:not(:disabled) { background: #1c1c24; border-color: #33333f; color: #fff }
  .st-scroll::-webkit-scrollbar { width: 9px; height: 9px }
  .st-scroll::-webkit-scrollbar-thumb { background: #2a2a34; border-radius: 9px }
  .st-scroll::-webkit-scrollbar-track { background: transparent }
  .st-range { -webkit-appearance: none; appearance: none; height: 2px; background: #2a2a34; border-radius: 2px; outline: none }
  .st-range::-webkit-slider-thumb { -webkit-appearance: none; width: 12px; height: 12px; border-radius: 50%; background: #d8d8de; cursor: pointer }
  .st-range::-moz-range-thumb { width: 12px; height: 12px; border: none; border-radius: 50%; background: #d8d8de; cursor: pointer }
  @keyframes stRec { 0%,100% { opacity: 1 } 50% { opacity: .28 } }
  @media (hover: none) and (pointer: coarse) { .st-keys { display: none } }
  @media (max-width: 700px) { .st-keys { display: none } }
  @media (prefers-reduced-motion: reduce) { [data-stfx] { animation: none !important } }
`

// ── Primitives ──────────────────────────────────────────────────────────────
const panel = {
  background: PANEL,
  border: `1px solid ${LINE}`,
  borderRadius: 10,
}

const capStyle = {
  fontSize: 9.5, letterSpacing: '.14em', textTransform: 'uppercase',
  color: FAINT, fontWeight: 600,
}

const num = { fontFamily: MONO, fontVariantNumeric: 'tabular-nums' }

function Cap({ children, style }) {
  return <div style={{ ...capStyle, ...style }}>{children}</div>
}

function Btn({ children, onClick, disabled, tone, wide, title, active }) {
  // La bordure se calcule d'abord : mélanger `border` et `borderColor` dans le
  // même objet de style fait râler React et rend l'ordre d'application incertain.
  let edge = LINE
  let fill = RAISE
  let ink = disabled ? FAINT : TXT
  if (tone === 'rec') { edge = REC; fill = REC; ink = '#fff' }
  if (tone === 'quiet') { fill = 'transparent'; ink = disabled ? FAINT : DIM }
  if (active) { edge = '#3a3a47'; fill = '#26262f'; ink = '#fff' }

  return (
    <button
      className="st-a" onClick={onClick} disabled={disabled} title={title}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
        padding: '9px 14px', borderRadius: 8, cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap',
        border: `1px solid ${edge}`, background: fill, color: ink,
        width: wide ? '100%' : undefined, opacity: disabled ? 0.55 : 1,
      }}
    >
      {children}
    </button>
  )
}

function Seg({ options, value, onChange, style }) {
  return (
    <div style={{ display: 'flex', border: `1px solid ${LINE}`, borderRadius: 8, overflow: 'hidden', ...style }}>
      {options.map(o => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          title={o.hint}
          style={{
            flex: 1, padding: '7px 11px', border: 'none', cursor: 'pointer',
            fontFamily: 'inherit', fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap',
            background: value === o.value ? '#26262f' : 'transparent',
            color: value === o.value ? '#fff' : DIM,
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function Fader({ text, value, min, max, step, onChange, render, disabled }) {
  return (
    <div style={{ opacity: disabled ? 0.45 : 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
        <Cap>{text}</Cap>
        <span style={{ ...num, fontSize: 11, color: TXT }}>{render(value)}</span>
      </div>
      <input
        className="st-range" type="range" min={min} max={max} step={step} value={value}
        disabled={disabled}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%', cursor: disabled ? 'not-allowed' : 'pointer' }}
      />
    </div>
  )
}

const fmt = t => {
  const s = Math.max(0, t)
  const m = Math.floor(s / 60)
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}.${String(Math.floor((s % 1) * 10))}`
}

// ── Préférences ─────────────────────────────────────────────────────────────
function loadPrefs() {
  try { return JSON.parse(localStorage.getItem(PREF_KEY) || '{}') } catch { return {} }
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

// Tirage sur les fenêtres réellement doublables : un script existe, au moins
// cinq répliques, et dans la première demi-heure — les fenêtres de film tombent
// à 1 h 15 et le calage y prend une éternité.
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
function Meter({ getLevel, active, height = 34 }) {
  const ref = useRef(null)
  const peak = useRef(0)

  useEffect(() => {
    let raf = 0
    const tick = () => {
      const rms = active ? getLevel() : 0
      peak.current = Math.max(rms, peak.current * 0.91)
      const el = ref.current
      if (el) {
        const pct = Math.min(100, Math.sqrt(peak.current) * 145)
        el.style.width = pct + '%'
        el.style.background = pct > 88 ? REC : pct > 60 ? '#d8c06b' : '#68a8c4'
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [active, getLevel])

  return (
    <div style={{ width: 96, height: 6, borderRadius: 3, background: '#1c1c24', overflow: 'hidden', flexShrink: 0 }}>
      <div ref={ref} style={{ width: '0%', height: '100%', transition: 'width .05s linear' }} />
    </div>
  )
}

// ── Frise ───────────────────────────────────────────────────────────────────
// Trois couches : les fenêtres de réplique, l'enveloppe du dialogue d'origine
// (gris, mesurée à l'écoute — c'est exactement la bande qu'on retire), et la
// tienne par-dessus en blanc. On voit d'un coup d'œil si on tombe juste.
function Timeline({
  cues, startAt, endAt, height = 92,
  origEnvelope, yourEnvelopes, getPlayhead, live, focusWindow, onSeek,
}) {
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
    const midY = h * 0.52

    // Fenêtre travaillée (mode ligne par ligne) : le reste s'assombrit.
    if (focusWindow) {
      g.fillStyle = 'rgba(0,0,0,.45)'
      g.fillRect(0, 0, Math.max(0, x(focusWindow[0])), h)
      g.fillRect(x(focusWindow[1]), 0, w, h)
    }

    for (const c of cues) {
      const x0 = Math.max(0, x(c.start))
      const x1 = Math.min(w, x(c.end))
      g.fillStyle = 'rgba(255,255,255,.045)'
      g.fillRect(x0, 0, Math.max(1.5, x1 - x0), h)
      g.fillStyle = 'rgba(255,255,255,.16)'
      g.fillRect(x0, 0, 1, h)
    }

    g.strokeStyle = '#20202a'
    g.beginPath(); g.moveTo(0, midY); g.lineTo(w, midY); g.stroke()

    // Dialogue d'origine, vers le bas.
    if (origEnvelope?.length) {
      g.fillStyle = GHOST
      for (const p of origEnvelope) {
        const px = x(p.t)
        if (px < -1 || px > w + 1) continue
        const amp = Math.min(1, Math.sqrt(p.v) * 1.7) * (h - midY - 4)
        g.fillRect(px, midY, 1.1, Math.max(0.6, amp))
      }
    }

    // Ta voix, vers le haut.
    g.fillStyle = TXT
    for (const env of yourEnvelopes || []) {
      for (let i = 0; i < env.length; i += 2) {
        const p = env[i]
        const px = x(p.t)
        if (px < -1 || px > w + 1) continue
        const amp = Math.min(1, Math.sqrt(p.v) * 1.7) * (midY - 4)
        g.fillRect(px, midY - Math.max(0.6, amp), 1.1, Math.max(0.6, amp))
      }
    }

    const now = getPlayhead?.()
    if (Number.isFinite(now)) {
      const px = x(now)
      g.strokeStyle = REC
      g.lineWidth = 1
      g.beginPath(); g.moveTo(px, 0); g.lineTo(px, h); g.stroke()
    }
  }, [cues, startAt, endAt, height, origEnvelope, yourEnvelopes, getPlayhead, focusWindow])

  useEffect(() => {
    draw()
    if (!live) return
    let raf = 0
    const loop = () => { draw(); raf = requestAnimationFrame(loop) }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [draw, live])

  return (
    <canvas
      ref={ref}
      onClick={e => {
        if (!onSeek) return
        const r = e.currentTarget.getBoundingClientRect()
        onSeek(startAt + ((e.clientX - r.left) / r.width) * (endAt - startAt))
      }}
      style={{ width: '100%', height, display: 'block', cursor: onSeek ? 'crosshair' : 'default' }}
    />
  )
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
    }).slice(0, 200)
  }, [anime, query])

  if (!open) return null

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(4,4,6,.8)',
        display: 'grid', placeItems: 'center', padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ ...panel, width: 'min(860px, 100%)', maxHeight: '86vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      >
        <div style={{ padding: 16, borderBottom: `1px solid ${LINE}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Cap>Choisir l'extrait</Cap>
            <Btn onClick={onClose} tone="quiet">Fermer</Btn>
          </div>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Chercher un épisode…"
            style={{
              width: '100%', marginTop: 12, padding: '10px 12px', borderRadius: 8,
              background: INK, border: `1px solid ${LINE}`, color: TXT,
              fontSize: 13.5, fontFamily: 'inherit', outline: 'none',
            }}
          />
          <div className="st-scroll" style={{ display: 'flex', gap: 5, marginTop: 10, overflowX: 'auto', paddingBottom: 4 }}>
            {['', ...ANIMES].map(a => (
              <button
                key={a || 'all'}
                onClick={() => setAnime(a)}
                style={{
                  flexShrink: 0, padding: '5px 11px', borderRadius: 999, cursor: 'pointer',
                  fontSize: 11.5, fontWeight: 600, fontFamily: 'inherit',
                  border: `1px solid ${anime === a ? '#3a3a47' : LINE}`,
                  background: anime === a ? '#26262f' : 'transparent',
                  color: anime === a ? '#fff' : DIM,
                }}
              >
                {a || 'Tous'}
              </button>
            ))}
          </div>
        </div>

        <div className="st-scroll" style={{ overflowY: 'auto', padding: 10 }}>
          {list.map(s => (
            <div key={s.id} style={{
              padding: '9px 11px', borderRadius: 8, marginBottom: 4,
              background: s.id === currentId ? RAISE : 'transparent',
              border: `1px solid ${s.id === currentId ? LINE : 'transparent'}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: TXT }}>{s.anime}</span>
                <span style={{ ...num, fontSize: 11, color: FAINT }}>{s.season}·{s.episode}</span>
                <span style={{ fontSize: 11.5, color: FAINT, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {s.title}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 5, marginTop: 7, flexWrap: 'wrap' }}>
                {s.clips.map((c, i) => (
                  <button
                    key={i}
                    className="st-a"
                    onClick={() => { onPick({ sceneId: s.id, clipIndex: i }); onClose() }}
                    style={{
                      padding: '5px 10px', borderRadius: 7, cursor: 'pointer',
                      border: `1px solid ${LINE}`, background: RAISE, color: DIM,
                      fontSize: 11, fontWeight: 600, fontFamily: MONO,
                    }}
                  >
                    {fmt(c.startAt)} · {c.lines} répl.
                  </button>
                ))}
              </div>
            </div>
          ))}
          {!list.length && (
            <div style={{ padding: 28, textAlign: 'center', color: FAINT, fontSize: 13 }}>
              Aucun épisode ne correspond.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Page ────────────────────────────────────────────────────────────────────
export default function DoublageStudioPage() {
  const prefs = useMemo(loadPrefs, [])

  const [sel, setSel] = useState(randomPick)
  const [lang, setLang] = useState(prefs.lang || 'vostfr')
  const [mode, setMode] = useState(prefs.mode || 'ligne')
  const [removal, setRemoval] = useState(prefs.removal ?? 1)
  const [ambience, setAmbience] = useState(prefs.ambience ?? 0.62)
  const [duckTo, setDuckTo] = useState(prefs.duckTo ?? 0.34)
  const [voicePreset, setVoicePreset] = useState(prefs.voicePreset || 'naturelle')
  const [captions, setCaptions] = useState(prefs.captions ?? true)
  const [cue2ear, setCue2ear] = useState(Boolean(prefs.cue2ear))
  const [micId, setMicId] = useState(prefs.micId || '')

  const [ready, setReady] = useState(false)
  const [loadErr, setLoadErr] = useState('')
  const [phase, setPhase] = useState('idle')  // idle | listen | countdown | rec | play
  const [count, setCount] = useState(3)
  const [clock, setClock] = useState(0)

  const [micState, setMicState] = useState('idle')
  const [mics, setMics] = useState([])

  const [lineIndex, setLineIndex] = useState(0)
  // La prise qu'on vient de faire reste affichee meme apres l'enchainement
  // automatique sur la replique suivante : sinon la note disparait aussitot.
  const [lastLine, setLastLine] = useState(null)
  const [lineTakes, setLineTakes] = useState({})   // index de réplique → prise
  const [fullTake, setFullTake] = useState(null)   // prise continue
  const [stats, setStats] = useState(loadStats)

  const [analysis, setAnalysis] = useState(null)   // { ratio, envelope }
  const [rendering, setRendering] = useState(null)
  const [result, setResult] = useState(null)
  const [exportErr, setExportErr] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [allCues, setAllCues] = useState([])
  const [narrow, setNarrow] = useState(() => window.innerWidth < 1100)

  const videoRef = useRef(null)
  const audioRef = useRef(null)     // { ctx, chain, monitor }
  const streamRef = useRef(null)
  const meterRef = useRef(null)
  const recRef = useRef(null)
  const liveLevels = useRef(null)
  const delayRef = useRef(0)
  const liveRms = useRef(0)
  const clockRef = useRef(0)
  const abortRef = useRef(false)
  const playingRef = useRef([])     // sources de lecture à couper
  const envRef = useRef([])         // enveloppe du dialogue, en cours de mesure
  const takesRef = useRef([])
  const resultRef = useRef(null)

  // ── Extrait courant ───────────────────────────────────────────────────────
  const scene = useMemo(
    () => DOUBLAGE_SCENES.find(s => s.id === sel.sceneId) || DOUBLAGE_SCENES[0],
    [sel.sceneId],
  )
  const clip = scene.clips[Math.min(sel.clipIndex, scene.clips.length - 1)]
  const startAt = clip.startAt
  const endAt = clip.endAt
  const span = Math.max(1, endAt - startAt)
  const source = lang === 'vf' ? scene.vf : scene.vostfr

  const cues = useMemo(
    () => allCues.filter(c => c.end > startAt + 0.05 && c.start < endAt - 0.05),
    [allCues, startAt, endAt],
  )

  const lineMode = mode === 'ligne' && cues.length > 0
  const activeCue = lineMode ? cues[Math.min(lineIndex, cues.length - 1)] : null
  const lineWindow = activeCue
    ? [Math.max(startAt, activeCue.start - PRE_ROLL), Math.min(endAt, activeCue.end + POST_ROLL)]
    : null

  const doneLines = Object.keys(lineTakes).length
  const hasAnyTake = lineMode ? doneLines > 0 : Boolean(fullTake)
  const verdict = analysis ? stereoVerdict(analysis.ratio) : null
  const removalUsable = !verdict || verdict.level !== 'mono'

  const running = phase === 'listen' || phase === 'rec' || phase === 'play'

  useEffect(() => {
    const h = () => setNarrow(window.innerWidth < 1100)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(PREF_KEY, JSON.stringify({
        lang, mode, removal, ambience, duckTo, voicePreset, captions, cue2ear, micId,
      }))
    } catch { /* quota */ }
  }, [lang, mode, removal, ambience, duckTo, voicePreset, captions, cue2ear, micId])

  useEffect(() => { takesRef.current = [...Object.values(lineTakes), fullTake].filter(Boolean) },
    [lineTakes, fullTake])
  useEffect(() => { resultRef.current = result }, [result])

  // ── Chaîne audio, montée une seule fois ───────────────────────────────────
  useEffect(() => {
    if (audioRef.current) return
    const ctx = getContext()
    const video = videoRef.current
    if (!ctx || !video) return
    const src = mediaSource(ctx, video)
    if (!src) return
    const chain = createOriginalChain(ctx, src)
    const monitor = ctx.createGain()
    monitor.gain.value = 0
    chain.output.connect(monitor)
    monitor.connect(ctx.destination)
    chain.setRemoval(0)
    audioRef.current = { ctx, chain, monitor }
  }, [])

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
    // Routé dans le graphe : c'est `monitor` qui décide de ce qu'on entend,
    // l'élément doit donc rester non coupé sinon le graphe ne reçoit rien.
    video.muted = false
    video.volume = 1

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

  // Changer d'extrait invalide tout ce qui a été enregistré et mesuré.
  useEffect(() => {
    takesRef.current.forEach(t => URL.revokeObjectURL(t.url))
    if (resultRef.current) URL.revokeObjectURL(resultRef.current.url)
    setLineTakes({})
    setFullTake(null)
    setResult(null)
    setAnalysis(null)
    setLineIndex(0)
    setExportErr('')
    liveLevels.current = null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene.id, sel.clipIndex, lang])

  // ── Horloge ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!running) return
    let raf = 0
    let last = 0
    const tick = now => {
      const video = videoRef.current
      if (video) {
        clockRef.current = video.currentTime
        if (now - last > 50) { last = now; setClock(video.currentTime) }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [running])

  // Mesure du dialogue d'origine pendant l'écoute : la bande qu'on retire EST
  // le dialogue, donc la mesurer donne son enveloppe, gratuitement.
  useEffect(() => {
    if (phase !== 'listen') return
    const audio = audioRef.current
    if (!audio) return
    envRef.current = []
    let mid = 0, side = 0, n = 0
    let raf = 0
    const tick = () => {
      const video = videoRef.current
      if (video) {
        envRef.current.push({ t: video.currentTime, v: audio.chain.readDialogue() })
        mid += audio.chain.readMid()
        side += audio.chain.readSide()
        n++
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      if (n > 30 && envRef.current.length > 30) {
        setAnalysis({ ratio: mid > 0 ? side / mid : 0, envelope: envRef.current })
      }
    }
  }, [phase])

  // ── Fin de fenêtre ────────────────────────────────────────────────────────
  // Seul l'enregistrement travaille en boucle courte. L'écoute et le montage
  // couvrent toujours l'extrait entier : c'est là qu'on mesure la piste et
  // qu'on juge le résultat, sur deux secondes ça ne veut rien dire.
  const stopAt = phase === 'rec' && lineWindow ? lineWindow[1] : endAt

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      const video = videoRef.current
      if (!video) return
      if (video.currentTime >= stopAt || video.ended) {
        if (phase === 'rec') finishTake()
        else stopAll()
      }
    }, 60)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, phase, stopAt])

  // ── Micro ─────────────────────────────────────────────────────────────────
  const askMic = useCallback(async deviceId => {
    if (!CAN_RECORD) return null
    setMicState('asking')
    try {
      streamRef.current?.getTracks().forEach(t => t.stop())
      meterRef.current?.close()
      const stream = await openMic(deviceId || micId)
      streamRef.current = stream
      meterRef.current = createMeter(stream, getContext())
      setMicState('ready')
      listMics().then(setMics)
      return stream
    } catch {
      setMicState('denied')
      return null
    }
  }, [micId])

  useEffect(() => () => {
    abortRef.current = true
    streamRef.current?.getTracks().forEach(t => t.stop())
    meterRef.current?.close()
    takesRef.current.forEach(t => URL.revokeObjectURL(t.url))
    if (resultRef.current) URL.revokeObjectURL(resultRef.current.url)
  }, [])

  // ── Transport ─────────────────────────────────────────────────────────────
  function stopAll() {
    const video = videoRef.current
    try { video?.pause() } catch { /* déjà arrêtée */ }
    for (const s of playingRef.current) { try { s.stop() } catch { /* déjà fini */ } }
    playingRef.current = []
    const audio = audioRef.current
    if (audio) audio.monitor.gain.value = 0
    setPhase('idle')
  }

  // Applique le retrait de voix à l'instant présent, calé sur la position
  // réelle de la vidéo au moment où le son part.
  function armRemoval(active) {
    const audio = audioRef.current
    const video = videoRef.current
    if (!audio || !video) return
    const strength = active && removalUsable ? removal : 0
    scheduleWindows(
      [
        ...audio.chain.removalTargets(strength),
        { param: audio.chain.duckParam, idle: 1, active: active ? duckTo : 1 },
      ],
      speechWindows(cues, video.currentTime),
      audio.ctx.currentTime,
    )
  }

  async function goTo(t) {
    const video = videoRef.current
    if (!video) return
    await seekTo(video, t).catch(() => {})
    clockRef.current = t
    setClock(t)
  }

  // Écoute de référence. Sert aussi de passe d'analyse : c'est là qu'on mesure
  // la stéréo de la piste et l'enveloppe du dialogue d'origine.
  async function listen() {
    if (!ready) return
    stopAll()
    const audio = audioRef.current
    const video = videoRef.current
    await goTo(startAt)
    if (audio) {
      if (audio.ctx.state === 'suspended') await audio.ctx.resume().catch(() => {})
      audio.monitor.gain.value = 1
      // Écoute brute : on veut entendre l'original, pas le nettoyage.
      audio.chain.setRemoval(0)
      audio.chain.duckParam.cancelScheduledValues(0)
      audio.chain.duckParam.value = 1
      audio.chain.levelParam.value = 1
    }
    setPhase('listen')
    video.play().catch(() => {})
  }

  // Aperçu du nettoyage seul : la scène sans sa voix, sans la tienne.
  async function preview() {
    if (!ready) return
    stopAll()
    const audio = audioRef.current
    const video = videoRef.current
    await goTo(startAt)
    if (audio) {
      if (audio.ctx.state === 'suspended') await audio.ctx.resume().catch(() => {})
      audio.monitor.gain.value = 1
      audio.chain.levelParam.value = 1
      armRemoval(true)
    }
    setPhase('listen')
    video.play().catch(() => {})
  }

  // ── Enregistrement ────────────────────────────────────────────────────────
  async function record() {
    if (!ready) return
    let stream = streamRef.current
    if (!stream || micState !== 'ready') stream = await askMic()
    if (!stream) return

    stopAll()
    const video = videoRef.current
    const audio = audioRef.current
    const from = lineMode && lineWindow ? lineWindow[0] : startAt
    await goTo(from)

    abortRef.current = false
    setPhase('countdown')
    for (let n = 3; n >= 1; n--) {
      setCount(n)
      // eslint-disable-next-line no-await-in-loop
      await new Promise(r => setTimeout(r, 780))
      if (abortRef.current) return
    }

    const rec = createTakeRecorder(stream, meterRef.current)
    recRef.current = rec
    liveLevels.current = rec.levels
    delayRef.current = 0
    rec.onLevel = rms => { liveRms.current = rms }

    rec.onStart = () => {
      const t0 = performance.now()
      const onPlaying = () => {
        delayRef.current = performance.now() - t0
        video.removeEventListener('playing', onPlaying)
      }
      video.addEventListener('playing', onPlaying)
      if (audio) {
        // Sans casque, tout ce qui sort des haut-parleurs repart dans le micro.
        audio.monitor.gain.value = cue2ear ? 0.3 : 0
        audio.chain.levelParam.value = 1
        armRemoval(true)
        if (cue2ear) scheduleCountIn(audio.ctx, audio.ctx.destination, audio.ctx.currentTime + 0.05, 1)
      }
      setPhase('rec')
      video.play().catch(() => {})
    }

    rec.start()
  }

  async function finishTake() {
    const rec = recRef.current
    if (!rec) return
    recRef.current = null
    const video = videoRef.current
    try { video?.pause() } catch { /* déjà arrêtée */ }
    const audio = audioRef.current
    if (audio) audio.monitor.gain.value = 0

    const raw = await rec.stop()
    setPhase('idle')
    if (!raw || !raw.blob.size) return

    const base = lineMode && lineWindow ? lineWindow[0] : startAt
    const scored = lineMode
      ? scoreTake({ levels: raw.levels, cues: [activeCue], startAt: base, videoDelayMs: delayRef.current })
      : cues.length
        ? scoreTake({ levels: raw.levels, cues, startAt, videoDelayMs: delayRef.current })
        : { score: null, label: 'Sans script', lines: [], noise: 0 }

    let buffer = null
    try {
      const ctx = getContext()
      buffer = await ctx.decodeAudioData(await raw.blob.arrayBuffer())
    } catch { /* le montage retombera sur un export voix seule */ }

    const take = {
      id: `t${Date.now()}`,
      blob: raw.blob,
      url: URL.createObjectURL(raw.blob),
      buffer,
      gain: buffer ? peakGain(buffer) : 1,
      levels: raw.levels,
      base,
      delayMs: delayRef.current,
      score: scored,
      // Enveloppe déjà ramenée au temps de la scène : la frise n'a plus qu'à
      // la dessiner, et elle survit au changement de réplique travaillée.
      envelope: raw.levels.map(l => ({ t: base + (l.t - delayRef.current) / 1000, v: l.rms })),
    }

    if (lineMode) {
      setLineTakes(prev => {
        const old = prev[lineIndex]
        if (old) URL.revokeObjectURL(old.url)
        return { ...prev, [lineIndex]: take }
      })
      // Enchaîner : on passe à la réplique suivante non doublée.
      const next = cues.findIndex((_, i) => i > lineIndex && !lineTakes[i])
      setLastLine(lineIndex)
      if (next >= 0) setLineIndex(next)
    } else {
      if (fullTake) URL.revokeObjectURL(fullTake.url)
      setFullTake(take)
    }

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
    stopAll()
  }

  // ── Relecture du montage ──────────────────────────────────────────────────
  function voicesForPlayback() {
    const list = lineMode ? cues.map((c, i) => [c, lineTakes[i]]) : [[null, fullTake]]
    const out = []
    for (const [cue, take] of list) {
      if (!take?.buffer) continue
      const shift = take.delayMs / 1000
      out.push({
        buffer: take.buffer,
        gain: take.gain,
        atClip: take.base + Math.max(0, -shift),
        offset: Math.max(0, shift),
        untilClip: cue ? Math.min(endAt, cue.end + POST_ROLL) : endAt,
      })
    }
    return out
  }

  async function playMix() {
    const audio = audioRef.current
    const video = videoRef.current
    if (!audio || !video) return
    const voices = voicesForPlayback()
    if (!voices.length) return

    stopAll()
    // Le montage se juge sur l'extrait entier, jamais sur la seule réplique en
    // cours : c'est l'enchaînement qui dit si le doublage tient.
    const from = startAt
    await goTo(from)
    if (audio.ctx.state === 'suspended') await audio.ctx.resume().catch(() => {})

    audio.monitor.gain.value = 1
    audio.chain.levelParam.value = ambience
    armRemoval(true)

    const chain = createVoiceProcessor(audio.ctx, voicePreset)
    chain.output.connect(audio.ctx.destination)

    const t0 = audio.ctx.currentTime + 0.06
    for (const v of voices) {
      if (v.untilClip <= from) continue
      const src = audio.ctx.createBufferSource()
      src.buffer = v.buffer
      const g = audio.ctx.createGain()
      src.connect(g); g.connect(chain.input)
      const at = t0 + Math.max(0, v.atClip - from)
      g.gain.setValueAtTime(0, at)
      g.gain.linearRampToValueAtTime(v.gain, at + 0.09)
      const until = t0 + (v.untilClip - from)
      g.gain.setValueAtTime(v.gain, until)
      g.gain.linearRampToValueAtTime(0, until + 0.18)
      src.start(at, Math.min(v.offset, Math.max(0, src.buffer.duration - 0.05)))
      try { src.stop(until + 0.25) } catch { /* déjà planifié */ }
      playingRef.current.push(src)
    }
    playingRef.current.push({ stop: () => { try { chain.output.disconnect() } catch { /* déjà coupé */ } } })

    setPhase('play')
    video.play().catch(() => {})
  }

  // ── Export ────────────────────────────────────────────────────────────────
  async function exportVideo() {
    if (!hasAnyTake || rendering) return
    setExportErr('')
    if (resultRef.current) URL.revokeObjectURL(resultRef.current.url)
    setResult(null)
    stopAll()
    setRendering({ stage: 'Préparation…', pct: 0 })
    try {
      const blob = await renderDub({
        videoUrl: source,
        startAt, endAt,
        voices: voicesForPlayback(),
        cues,
        removal: removalUsable ? removal : 0,
        ambience,
        duckTo,
        voicePreset,
        captions,
        onStage: stage => setRendering(r => ({ ...(r || {}), stage })),
        onProgress: pct => setRendering(r => ({ ...(r || {}), pct })),
      })
      const name = `doublage-${slug(scene.anime)}-${scene.season}e${scene.episode}-${sel.clipIndex + 1}.webm`
      setResult({ url: URL.createObjectURL(blob), blob, name })
      setStats(s => { const next = { ...s, exports: s.exports + 1 }; saveStats(next); return next })
    } catch (err) {
      setExportErr(err?.message || 'Le rendu a échoué.')
    } finally {
      setRendering(null)
    }
  }

  async function exportVoice() {
    const take = activeTake
    if (!take) return
    setExportErr('')
    try {
      const wav = await voiceToWav(take.blob)
      downloadBlob(wav, `voix-${slug(scene.anime)}-${scene.season}e${scene.episode}.wav`)
    } catch (err) {
      setExportErr(err?.message || 'Conversion impossible.')
    }
  }

  // ── Raccourcis ────────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = e => {
      const tag = e.target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || pickerOpen) return
      const k = e.key.toLowerCase()
      if (k === ' ') {
        e.preventDefault()
        if (phase === 'rec') finishTake()
        else if (phase === 'countdown') cancelRecording()
        else record()
      }
      if (k === 'escape') { if (phase === 'countdown') cancelRecording(); else stopAll() }
      if (k === 'e') { e.preventDefault(); running ? stopAll() : listen() }
      if (k === 'p') { e.preventDefault(); running ? stopAll() : playMix() }
      if (k === 'arrowup' && lineMode) { e.preventDefault(); setLineIndex(i => Math.max(0, i - 1)) }
      if (k === 'arrowdown' && lineMode) { e.preventDefault(); setLineIndex(i => Math.min(cues.length - 1, i + 1)) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // ── Téléprompteur ─────────────────────────────────────────────────────────
  const current = useMemo(() => (cues.length ? cueAt(cues, clock) : null), [cues, clock])
  const prompt = lineMode ? activeCue : (running ? current : cues[0] || null)
  const promptLit = lineMode
    ? (running && current === activeCue)
    : (running && Boolean(current))

  const envelopes = useMemo(() => {
    if (lineMode) return Object.values(lineTakes).map(t => t.envelope)
    return fullTake ? [fullTake.envelope] : []
  }, [lineMode, lineTakes, fullTake])

  const getPlayhead = useCallback(() => clockRef.current, [])
  const recording = phase === 'rec'
  const reviewIndex = !lineMode ? null
    : lineTakes[lineIndex] ? lineIndex
      : (lastLine != null && lineTakes[lastLine]) ? lastLine
        : null
  const activeTake = lineMode ? (reviewIndex != null ? lineTakes[reviewIndex] : null) : fullTake

  // ── Rendu ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: INK, color: TXT }}>
      <style>{CSS}</style>

      <div style={{
        maxWidth: 1500, margin: '0 auto',
        padding: 'clamp(84px,8vw,112px) clamp(12px,3vw,32px) 48px',
      }}>
        {/* En-tête */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 6, flexWrap: 'wrap' }}>
          <Link to="/tournoi" style={{ color: FAINT, textDecoration: 'none', fontSize: 11, fontWeight: 600 }}>
            ← Tournois
          </Link>
          <span style={{ color: '#2a2a34' }}>/</span>
          <Link to="/tournoi/doublage" style={{ color: FAINT, textDecoration: 'none', fontSize: 11, fontWeight: 600 }}>
            Doublage
          </Link>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 18, flexWrap: 'wrap' }}>
          <h1 style={{
            margin: 0, fontSize: 15, fontWeight: 700,
            letterSpacing: '.22em', textTransform: 'uppercase', color: TXT,
          }}>
            Studio de doublage
          </h1>
          <span style={{ flex: 1, height: 1, background: LINE, minWidth: 40 }} />
          <span style={{ ...num, fontSize: 11, color: FAINT }}>
            {stats.takes} prises · record {stats.best || '—'}
          </span>
        </div>

        {!CAN_RECORD && (
          <div style={{ ...panel, padding: 14, marginBottom: 14, borderColor: '#40282a', color: '#e8a0a2', fontSize: 12.5, lineHeight: 1.6 }}>
            Ce navigateur ne donne pas accès au micro. Le studio a besoin de <b>getUserMedia</b> et
            de <b>MediaRecorder</b>, sur une connexion sécurisée.
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexDirection: narrow ? 'column' : 'row' }}>
          {/* ── Plateau ──────────────────────────────────────────────────── */}
          <div style={{ flex: '1 1 0', minWidth: 0, width: '100%' }}>
            {/* Bandeau extrait */}
            <div style={{ ...panel, padding: '9px 12px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{scene.anime}</div>
                <div style={{ ...num, fontSize: 10.5, color: FAINT, marginTop: 1 }}>
                  {scene.season}·{scene.episode} · extrait {sel.clipIndex + 1} · {fmt(span)} · {cues.length} répliques
                </div>
              </div>
              <Seg
                value={lang}
                onChange={setLang}
                options={[
                  { value: 'vostfr', label: 'Image JP', hint: 'Doubler par-dessus la version japonaise' },
                  { value: 'vf', label: 'Image VF', hint: 'Doubler par-dessus la version française' },
                ]}
              />
              <Btn onClick={() => setPickerOpen(true)}>Changer</Btn>
              <Btn onClick={() => setSel(randomPick())} tone="quiet">Au hasard</Btn>
            </div>

            {/* Écran — hauteur bornée pour que la frise et le transport
                restent visibles sans défiler, y compris sur un portable. */}
            <div style={{
              position: 'relative', width: '100%', aspectRatio: '16 / 9',
              maxWidth: 'calc(54vh * 16 / 9)', margin: '0 auto',
              borderRadius: 10, overflow: 'hidden', background: '#000',
              border: `1px solid ${recording ? REC : LINE}`,
            }}>
              <video
                ref={videoRef}
                crossOrigin="anonymous"
                playsInline
                preload="auto"
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
              />

              {!ready && !loadErr && (
                <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: FAINT, fontSize: 11.5, letterSpacing: '.14em' }}>
                  CALAGE SUR L'EXTRAIT…
                </div>
              )}

              {loadErr && (
                <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', padding: 20, textAlign: 'center' }}>
                  <div>
                    <div style={{ color: '#e8a0a2', fontSize: 13, marginBottom: 12 }}>{loadErr}</div>
                    <Btn onClick={() => setSel(randomPick())}>Prendre une autre scène</Btn>
                  </div>
                </div>
              )}

              {phase === 'countdown' && (
                <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: 'rgba(6,6,8,.72)' }}>
                  <div style={{ ...num, fontSize: 'clamp(56px,11vw,110px)', fontWeight: 300, color: TXT }}>{count}</div>
                </div>
              )}

              {/* Témoins */}
              <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', gap: 6, alignItems: 'center' }}>
                {recording && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 9px',
                    borderRadius: 6, background: 'rgba(0,0,0,.62)', border: `1px solid ${REC}`,
                  }}>
                    <span data-stfx style={{ width: 7, height: 7, borderRadius: '50%', background: REC, animation: 'stRec 1s infinite' }} />
                    <span style={{ ...num, fontSize: 10.5, color: '#fff', letterSpacing: '.1em' }}>REC</span>
                  </span>
                )}
                {phase === 'listen' && (
                  <span style={{ padding: '4px 9px', borderRadius: 6, background: 'rgba(0,0,0,.62)', border: `1px solid ${LINE}`, fontSize: 10.5, letterSpacing: '.1em', color: DIM }}>
                    ÉCOUTE
                  </span>
                )}
                {phase === 'play' && (
                  <span style={{ padding: '4px 9px', borderRadius: 6, background: 'rgba(0,0,0,.62)', border: `1px solid ${LINE}`, fontSize: 10.5, letterSpacing: '.1em', color: OK }}>
                    MONTAGE
                  </span>
                )}
              </div>

              <div style={{ ...num, position: 'absolute', top: 10, right: 10, fontSize: 10.5, color: 'rgba(255,255,255,.55)', background: 'rgba(0,0,0,.55)', padding: '4px 8px', borderRadius: 6 }}>
                {fmt(Math.max(0, clock - startAt))} / {fmt(span)}
              </div>

              {/* Téléprompteur */}
              <div style={{
                position: 'absolute', left: 0, right: 0, bottom: 0,
                padding: '54px 6% 16px', textAlign: 'center', pointerEvents: 'none',
                background: 'linear-gradient(to top, rgba(0,0,0,.9) 28%, transparent)',
              }}>
                {lineMode && (
                  <div style={{ ...num, fontSize: 10.5, color: 'rgba(255,255,255,.4)', marginBottom: 6 }}>
                    RÉPLIQUE {lineIndex + 1} / {cues.length}
                  </div>
                )}
                <div style={{
                  fontSize: 'clamp(16px,2.2vw,26px)', fontWeight: 600, lineHeight: 1.34,
                  color: promptLit ? '#fff' : 'rgba(255,255,255,.5)',
                  textShadow: '0 2px 10px rgba(0,0,0,.95)',
                  minHeight: '1.4em', whiteSpace: 'pre-line',
                }}>
                  {prompt ? prompt.text : (cues.length ? '…' : 'Pas de script pour cet extrait — improvise.')}
                </div>
                <div style={{ height: 2, marginTop: 12, background: 'rgba(255,255,255,.12)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: running && prompt
                      ? `${Math.min(100, Math.max(0, ((clock - prompt.start) / Math.max(0.3, prompt.end - prompt.start)) * 100))}%`
                      : '0%',
                    background: recording ? REC : 'rgba(255,255,255,.7)',
                  }} />
                </div>
              </div>
            </div>

            {/* Frise */}
            <div style={{ ...panel, padding: 10, marginTop: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
                <Cap>Frise</Cap>
                <div style={{ display: 'flex', gap: 12, fontSize: 10, color: FAINT }}>
                  <span><span style={{ display: 'inline-block', width: 8, height: 8, background: GHOST, marginRight: 5 }} />voix d'origine</span>
                  <span><span style={{ display: 'inline-block', width: 8, height: 8, background: TXT, marginRight: 5 }} />la tienne</span>
                </div>
              </div>
              <Timeline
                cues={cues}
                startAt={startAt}
                endAt={endAt}
                origEnvelope={analysis?.envelope}
                yourEnvelopes={envelopes}
                getPlayhead={getPlayhead}
                live={running}
                focusWindow={lineMode ? lineWindow : null}
                onSeek={running ? null : goTo}
              />
              {!analysis && (
                <div style={{ fontSize: 10.5, color: FAINT, marginTop: 6 }}>
                  Lance une écoute : elle mesure la voix d'origine et l'affiche ici, en repère de timing.
                </div>
              )}
            </div>

            {/* Console */}
            <div style={{ ...panel, padding: 12, marginTop: 10 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                {phase === 'rec' ? (
                  <Btn onClick={finishTake} tone="rec">■ Arrêter</Btn>
                ) : phase === 'countdown' ? (
                  <Btn onClick={cancelRecording}>Annuler</Btn>
                ) : (
                  <Btn onClick={record} tone="rec" disabled={!ready || !CAN_RECORD}>
                    ● {(lineMode ? lineTakes[lineIndex] : fullTake) ? 'Refaire' : 'Enregistrer'}
                  </Btn>
                )}

                <Btn onClick={() => (running ? stopAll() : listen())} disabled={!ready}>
                  {phase === 'listen' ? '■ Stop' : '▶ Écouter'}
                </Btn>
                <Btn onClick={() => (running ? stopAll() : preview())} disabled={!ready || !analysis} title={analysis ? 'La scène sans sa voix' : "Fais d'abord une écoute"}>
                  ▶ Sans la voix
                </Btn>
                <Btn onClick={() => (running ? stopAll() : playMix())} disabled={!hasAnyTake}>
                  {phase === 'play' ? '■ Stop' : '▶ Montage'}
                </Btn>

                {micState === 'ready' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 4 }}>
                    <Cap>Micro</Cap>
                    <Meter getLevel={() => liveRms.current} active={recording || phase === 'countdown'} />
                  </div>
                )}
                {micState !== 'ready' && CAN_RECORD && (
                  <Btn onClick={() => askMic()} tone="quiet">
                    {micState === 'asking' ? 'Autorisation…' : micState === 'denied' ? 'Micro refusé — réessayer' : 'Brancher le micro'}
                  </Btn>
                )}

                <span style={{ flex: 1 }} />
                <span className="st-keys" style={{ fontSize: 10.5, color: '#3f3f4b' }}>
                  Espace enregistrer · E écouter · P montage · ↑↓ réplique · Échap stop
                </span>
              </div>
            </div>

            {/* Feuille de doublage : le document de travail. On y choisit la
                réplique, on y lit son état et sa note. */}
            {cues.length > 0 && (
              <div style={{ ...panel, padding: 12, marginTop: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 9 }}>
                  <Cap>Feuille de doublage</Cap>
                  <span style={{ ...num, fontSize: 11, color: FAINT }}>
                    {lineMode ? `${doneLines} / ${cues.length} enregistrées` : `${cues.length} répliques`}
                  </span>
                </div>
                <div className="st-scroll" style={{ maxHeight: 244, overflowY: 'auto' }}>
                  {cues.map((c, i) => {
                    const take = lineTakes[i]
                    const here = lineMode && i === lineIndex
                    const lit = running && current === c
                    return (
                      <div
                        key={`${c.start}-${i}`}
                        ref={here ? el => el?.scrollIntoView({ block: 'nearest' }) : undefined}
                        onClick={() => { if (lineMode) { stopAll(); setLineIndex(i) } else goTo(c.start) }}
                        style={{
                          display: 'flex', gap: 10, alignItems: 'baseline', cursor: 'pointer',
                          padding: '7px 9px', borderRadius: 6, marginBottom: 2,
                          background: here ? '#1c1c24' : lit ? '#16161d' : 'transparent',
                          borderLeft: `2px solid ${here ? TXT : take ? OK : 'transparent'}`,
                        }}
                      >
                        <span style={{ ...num, fontSize: 10.5, color: FAINT, width: 22, flexShrink: 0 }}>
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <span style={{ ...num, fontSize: 10.5, color: '#4a4a56', width: 46, flexShrink: 0 }}>
                          {fmt(Math.max(0, c.start - startAt))}
                        </span>
                        <span style={{
                          flex: 1, minWidth: 0, fontSize: 12.5, lineHeight: 1.45,
                          color: here || lit ? TXT : DIM, whiteSpace: 'pre-line',
                        }}>
                          {c.text}
                        </span>
                        <span style={{
                          ...num, fontSize: 11, flexShrink: 0, width: 26, textAlign: 'right',
                          color: !take ? '#33333d'
                            : take.score.score === null ? FAINT
                              : take.score.score >= 72 ? OK
                                : take.score.score >= 45 ? '#d8c06b' : REC,
                        }}>
                          {take ? (take.score.score ?? '·') : '—'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── Régie ────────────────────────────────────────────────────── */}
          <div style={{ width: narrow ? '100%' : 348, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Mode */}
            <div style={{ ...panel, padding: 12 }}>
              <Cap style={{ marginBottom: 8 }}>Méthode</Cap>
              <Seg
                value={mode}
                onChange={m => { stopAll(); setMode(m) }}
                options={[
                  { value: 'ligne', label: 'Ligne par ligne', hint: 'Une réplique à la fois, en boucle — la méthode des vraies cabines' },
                  { value: 'continu', label: 'Prise continue', hint: 'Tout l’extrait d’un trait' },
                ]}
              />
              <div style={{ fontSize: 11, color: FAINT, marginTop: 8, lineHeight: 1.55 }}>
                {mode === 'ligne'
                  ? 'Chaque réplique se travaille et se refait seule. Le montage les recolle à leur place.'
                  : "Tout l'extrait d'une traite. Une erreur, et c'est la prise entière à refaire."}
              </div>
              {lineMode && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <Cap>Avancement</Cap>
                    <span style={{ ...num, fontSize: 11, color: doneLines === cues.length ? OK : TXT }}>
                      {doneLines} / {cues.length}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 2 }}>
                    {cues.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => { stopAll(); setLineIndex(i) }}
                        title={`Réplique ${i + 1}`}
                        style={{
                          flex: 1, height: 6, border: 'none', padding: 0, cursor: 'pointer',
                          background: lineTakes[i] ? OK : i === lineIndex ? '#4a4a58' : '#1e1e26',
                          outline: i === lineIndex ? `1px solid ${TXT}` : 'none',
                          outlineOffset: 1,
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Voix d'origine */}
            <div style={{ ...panel, padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 9 }}>
                <Cap>Voix d'origine</Cap>
                {verdict && (
                  <span style={{
                    fontSize: 10, fontWeight: 600,
                    color: verdict.level === 'ok' ? OK : verdict.level === 'weak' ? '#d8c06b' : '#e8a0a2',
                  }}>
                    {verdict.label}
                  </span>
                )}
              </div>
              <Seg
                value={removal >= 0.95 ? 'max' : removal >= 0.4 ? 'mid' : 'off'}
                onChange={v => setRemoval(v === 'max' ? 1 : v === 'mid' ? 0.6 : 0)}
                options={[
                  { value: 'max', label: 'Retirée', hint: 'Suppression maximale de la bande de voix' },
                  { value: 'mid', label: 'Atténuée', hint: 'Suppression partielle, moins d’impact sur la musique' },
                  { value: 'off', label: 'Gardée', hint: 'La piste passe entière' },
                ]}
              />
              <div style={{ fontSize: 11, color: FAINT, marginTop: 8, lineHeight: 1.55 }}>
                {verdict
                  ? verdict.hint
                  : "Le centre stéréo porte les dialogues : on y creuse la bande de la voix, uniquement pendant les répliques. Lance une écoute pour mesurer cette piste."}
              </div>
              {verdict && verdict.level === 'mono' && (
                <div style={{ fontSize: 11, color: '#e8a0a2', marginTop: 6, lineHeight: 1.55 }}>
                  Sur cette piste, le retrait est désactivé : il emporterait la musique avec la voix.
                  L'atténuation par réplique reste appliquée.
                </div>
              )}
              <div style={{ marginTop: 12, display: 'grid', gap: 12 }}>
                <Fader
                  text="Niveau de la scène" value={ambience} min={0} max={1} step={0.02}
                  onChange={setAmbience} render={v => `${Math.round(v * 100)} %`}
                />
                <Fader
                  text="Baisse sur les répliques" value={duckTo} min={0} max={1} step={0.02}
                  onChange={setDuckTo} render={v => (v >= 0.99 ? 'aucune' : `−${Math.round((1 - v) * 100)} %`)}
                />
              </div>
            </div>

            {/* Ta voix */}
            <div style={{ ...panel, padding: 12 }}>
              <Cap style={{ marginBottom: 9 }}>Ta voix</Cap>
              <Seg
                value={voicePreset}
                onChange={setVoicePreset}
                options={Object.entries(VOICE_PRESETS).map(([k, p]) => ({ value: k, label: p.label, hint: p.hint }))}
              />
              <div style={{ fontSize: 11, color: FAINT, marginTop: 8, lineHeight: 1.55 }}>
                {VOICE_PRESETS[voicePreset].hint} La prise reste brute : changer de rendu ne coûte rien.
              </div>

              <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 12, cursor: 'pointer', fontSize: 12, color: DIM }}>
                <input type="checkbox" checked={cue2ear} onChange={e => setCue2ear(e.target.checked)} style={{ marginTop: 2 }} />
                <span>
                  Retour dans le casque
                  <span style={{ display: 'block', fontSize: 10.5, color: FAINT, marginTop: 2 }}>
                    Scène et top de départ pendant la prise. Sans casque, ils repartent dans le micro.
                  </span>
                </span>
              </label>

              {mics.length > 1 && (
                <select
                  value={micId}
                  onChange={e => { setMicId(e.target.value); askMic(e.target.value) }}
                  style={{
                    width: '100%', marginTop: 10, padding: '8px 10px', borderRadius: 8,
                    background: INK, border: `1px solid ${LINE}`, color: DIM,
                    fontSize: 11.5, fontFamily: 'inherit',
                  }}
                >
                  {mics.map(m => (
                    <option key={m.deviceId} value={m.deviceId} style={{ background: PANEL }}>
                      {m.label || 'Micro'}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Synchro de la prise */}
            {activeTake && (
              <div style={{ ...panel, padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <Cap>Synchro {lineMode ? `· réplique ${reviewIndex + 1}` : ''}</Cap>
                  <span style={{ ...num, fontSize: 20, color: activeTake.score.score === null ? FAINT : activeTake.score.score >= 72 ? OK : activeTake.score.score >= 45 ? '#d8c06b' : REC }}>
                    {activeTake.score.score ?? '—'}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: FAINT, marginTop: 4, lineHeight: 1.55 }}>
                  {activeTake.score.label} — mesure du <b>timing</b>, pas du texte : parler sur la
                  réplique, se taire entre. Écart mesuré micro/image : {Math.round(activeTake.delayMs)} ms.
                </div>
                {lineMode && (
                  <Btn
                    wide tone="quiet"
                    onClick={() => setLineTakes(prev => {
                      const next = { ...prev }
                      if (next[reviewIndex]) URL.revokeObjectURL(next[reviewIndex].url)
                      delete next[reviewIndex]
                      return next
                    })}
                  >
                    Jeter cette réplique
                  </Btn>
                )}
              </div>
            )}

            {/* Export */}
            <div style={{ ...panel, padding: 12 }}>
              <Cap style={{ marginBottom: 9 }}>Le fichier</Cap>

              <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10, cursor: 'pointer', fontSize: 12, color: DIM }}>
                <input type="checkbox" checked={captions} onChange={e => setCaptions(e.target.checked)} />
                Incruster le script dans l'image
              </label>

              {rendering ? (
                <>
                  <div style={{ fontSize: 12, color: TXT, marginBottom: 7 }}>{rendering.stage}</div>
                  <div style={{ height: 3, background: '#1c1c24', overflow: 'hidden', borderRadius: 2 }}>
                    <div style={{ height: '100%', width: `${Math.round((rendering.pct || 0) * 100)}%`, background: TXT, transition: 'width .2s linear' }} />
                  </div>
                  <div style={{ fontSize: 10.5, color: FAINT, marginTop: 7, lineHeight: 1.5 }}>
                    Rendu en temps réel : garde l'onglet au premier plan jusqu'à la fin.
                  </div>
                </>
              ) : (
                <>
                  <Btn wide onClick={exportVideo} disabled={!hasAnyTake || !CAN_EXPORT_VIDEO}>
                    Monter la vidéo doublée
                  </Btn>
                  <div style={{ height: 6 }} />
                  <Btn wide tone="quiet" onClick={exportVoice} disabled={!activeTake}>
                    Voix seule (.wav)
                  </Btn>
                  {!CAN_EXPORT_VIDEO && (
                    <div style={{ fontSize: 10.5, color: FAINT, marginTop: 7 }}>
                      Ce navigateur n'encode pas la vidéo — l'export voix reste possible.
                    </div>
                  )}
                </>
              )}

              {exportErr && <div style={{ fontSize: 11.5, color: '#e8a0a2', marginTop: 9 }}>{exportErr}</div>}

              {result && (
                <div style={{ marginTop: 12 }}>
                  <video src={result.url} controls style={{ width: '100%', borderRadius: 8, background: '#000', display: 'block' }} />
                  <div style={{ height: 6 }} />
                  <Btn wide onClick={() => downloadBlob(result.blob, result.name)}>Télécharger</Btn>
                </div>
              )}
            </div>

            <Link to="/tournoi/doublage" style={{ ...panel, padding: 12, textDecoration: 'none', display: 'block', color: DIM, fontSize: 11.5, lineHeight: 1.55 }}>
              <b style={{ color: TXT }}>Guerre du Doublage →</b><br />
              Juger les voix des autres, VF contre VOSTFR, à l'aveugle.
            </Link>
          </div>
        </div>
      </div>

      <ScenePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={setSel}
        currentId={scene.id}
      />
    </div>
  )
}
