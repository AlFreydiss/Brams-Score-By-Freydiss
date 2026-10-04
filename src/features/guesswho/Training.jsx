// Guess Who — mode Entraînement (/guess-who/entrainement), seul, sans salon.
// Tu choisis un son, tu l'imites, le jeu te note sur 100 (rythme, mélodie,
// durée — logic/likeness.js) et garde ton record par son (logic/palmares.js).
// Tout se calcule dans le navigateur : rien n'est envoyé.
import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Btn, PhaseFrame, Waiting, type, C } from './manga.jsx'
import { T, F, RADIUS, LINE, pill } from './theme.js'
import {
  acquireMic, buzz, canRecord, currentMic, decodeMono, finalizeTake, micError, pauseSound, releaseMic,
  startRecorder, unlockAudio,
} from '../../lib/guessWhoAudio.js'
import { fetchClips } from '../../lib/guessWhoRooms.js'
import { COUNTDOWN, COUNT_STEP_MS, takeLimitMs } from './logic/recordFlow.js'
import { likeness } from './logic/likeness.js'
import { PALMARES_KEY, parsePalmares, recordSolo } from './logic/palmares.js'
import LiveWave, { WavePlayer } from './LiveWave.jsx'
import { useClip } from './ListenPhase.jsx'
import DotText from './DotText.jsx'
import MicSetup from './MicSetup.jsx'
import { Confetti } from './fx.jsx'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const MIC_MSG = {
  mic_denied: "Micro refusé. Autorise-le (icône 🔒 à côté de l'adresse, ou Réglages › Safari › Micro sur iPhone), puis recharge.",
  no_mic: 'Aucun micro détecté. Branche-en un ou choisis-en un autre avec « Problème de micro ? ».',
  mic_busy: 'Le micro est pris par une autre appli (appel, Discord, OBS…).',
  mic_timeout: 'Le navigateur ne répond pas pour le micro. Ouvre « Problème de micro ? ».',
  no_support: "Le micro n'est pas accessible ici. Ouvre le site dans Safari ou Chrome.",
}

function readPalmares() { try { return parsePalmares(localStorage.getItem(PALMARES_KEY)) } catch { return parsePalmares(null) } }
function savePalmares(p) { try { localStorage.setItem(PALMARES_KEY, JSON.stringify(p)) } catch {} }

const chip = (on) => ({
  ...pill(on ? 'primary' : 'ghost'), minHeight: 40, padding: '0 14px', cursor: 'pointer',
  fontFamily: F.ui, fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', touchAction: 'manipulation',
})

// « Bleach (Byakuya) » → « Bleach » : une pastille par série, pas par perso.
const seriesOf = (c) => String(c.anime || '').replace(/\s*\(.*\)\s*$/, '')

// ── Choix du son ──────────────────────────────────────────────────────────────
function Picker({ clips, best, onPick }) {
  const animes = useMemo(() => [...new Set(clips.map(seriesOf))].sort((a, b) => a.localeCompare(b, 'fr')), [clips])
  const [anime, setAnime] = useState(null)
  const list = anime ? clips.filter((c) => seriesOf(c) === anime) : clips
  const random = () => onPick(list[Math.floor(Math.random() * list.length)])
  return (
    <PhaseFrame eyebrow="Entraînement" prompt="Choisis un son à imiter" wide>
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6, scrollbarWidth: 'none' }}>
        <button type="button" className="gw-focus" style={chip(!anime)} onClick={() => setAnime(null)}>Tous · {clips.length}</button>
        {animes.map((a) => (
          <button key={a} type="button" className="gw-focus" style={chip(anime === a)} onClick={() => setAnime(a)}>{a}</button>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', margin: '16px 0 18px' }}>
        <Btn onClick={random} disabled={!list.length}>🎲 Un son au hasard</Btn>
        <span style={{ ...type.small, color: C.textMut }}>ou choisis dans la liste</span>
      </div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))' }}>
        {list.map((c) => {
          const b = best[c.id]
          return (
            <li key={c.id}>
              <button type="button" className="gw-focus gw-btn" onClick={() => onPick(c)} style={{
                width: '100%', minHeight: 58, display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', cursor: 'pointer',
                textAlign: 'left', borderRadius: RADIUS.md, border: LINE, background: T.deep, color: T.textHi, touchAction: 'manipulation',
              }}>
                <span style={{ minWidth: 0, flex: 1 }}>
                  <span style={{ display: 'block', fontFamily: F.ui, fontWeight: 600, fontSize: 14.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</span>
                  <span style={{ display: 'block', fontFamily: F.ui, fontSize: 12.5, color: T.textMute, marginTop: 2 }}>{c.anime}{c.lang === 'fr' ? ' · VF' : ''}</span>
                </span>
                {b != null && (
                  <span title="Ton record" style={{ fontFamily: F.display, fontWeight: 700, fontSize: 15, color: b >= 85 ? T.accentLit : T.textMute }}>{b}</span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </PhaseFrame>
  )
}

// ── Résultat ──────────────────────────────────────────────────────────────────
// Jauge en trame de points (20 points), comme le reste du jeu.
function DotGauge({ value, label, delay = 0 }) {
  const reduce = useReducedMotion()
  const n = value == null ? 0 : Math.round(value * 20)
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '84px 1fr 40px', alignItems: 'center', gap: 12 }}>
      <span style={{ fontFamily: F.ui, fontWeight: 600, fontSize: 14, color: T.text }}>{label}</span>
      <span aria-hidden style={{ display: 'flex', gap: 4 }}>
        {Array.from({ length: 20 }, (_, i) => (
          <motion.span key={i} initial={reduce ? false : { opacity: 0.15, scale: 0.6 }}
            animate={{ opacity: i < n ? 1 : 0.15, scale: 1 }}
            transition={{ delay: reduce ? 0 : delay + i * 0.025, duration: 0.18 }}
            style={{ width: 7, height: 7, borderRadius: '50%', background: i < n ? T.accent : T.textFaint }} />
        ))}
      </span>
      <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 14, color: T.textHi, textAlign: 'right' }}>
        {value == null ? '–' : Math.round(value * 100)}
      </span>
    </div>
  )
}

// Les deux ondes superposées : l'original en filigrane, ta prise en or.
function Overlay({ a, b }) {
  if (!a || !b) return null
  const W = 300, H = 64, n = Math.max(a.length, b.length)
  const pts = (arr, i) => arr[Math.min(arr.length - 1, Math.floor((i / n) * arr.length))] || 0
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} aria-hidden style={{ display: 'block' }}>
      {Array.from({ length: n }, (_, i) => {
        const x = (i + 0.5) * (W / n)
        const ha = Math.max(2, pts(a, i) * (H - 6)), hb = Math.max(2, pts(b, i) * (H - 6))
        return (
          <g key={i}>
            <rect x={x - 1.6} y={(H - ha) / 2} width={3.2} height={ha} rx={1.6} fill={T.textFaint} opacity={0.55} />
            <rect x={x - 0.9} y={(H - hb) / 2} width={1.8} height={hb} rx={0.9} fill={T.accent} />
          </g>
        )
      })}
    </svg>
  )
}

function CountUp({ to }) {
  const reduce = useReducedMotion()
  const [v, setV] = useState(reduce ? to : 0)
  useEffect(() => {
    if (reduce) { setV(to); return }
    let raf = 0
    const t0 = performance.now()
    const step = (t) => {
      const k = Math.min(1, (t - t0) / 1100)
      setV(Math.round(to * (1 - Math.pow(1 - k, 3))))
      if (k < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [to, reduce])
  return <DotText text={String(v).padStart(2, ' ')} dot={14} color={to >= 70 ? T.accentLit : T.textHi} />
}

// ── Écran d'un son ────────────────────────────────────────────────────────────
function Practice({ clip, best, onScored, onBack, onNext }) {
  const original = useClip(clip.url)
  const maxMs = takeLimitMs(clip.duration)
  const [rec, setRec] = useState('idle') // idle | arming | countdown | recording | scoring
  const [count, setCount] = useState(null)
  const [stream, setStream] = useState(null)
  const [startedAt, setStartedAt] = useState(null)
  const [take, setTake] = useState(null)
  const [result, setResult] = useState(null)
  const [err, setErr] = useState(null)
  const [showMic, setShowMic] = useState(false)
  const flow = useRef(0)
  const recRef = useRef(null)
  const held = useRef(false)
  const previews = useRef([])
  const origSamples = useRef(null)

  useEffect(() => () => {
    flow.current++
    recRef.current?.stop()
    if (held.current) releaseMic()
    pauseSound()
    previews.current.forEach((u) => URL.revokeObjectURL(u))
  }, [])
  useEffect(() => { origSamples.current = null }, [clip.id])

  const begin = async () => {
    unlockAudio(); pauseSound()
    setErr(null)
    const my = ++flow.current
    const alive = () => flow.current === my
    setRec('arming')
    let s
    try {
      s = currentMic() && held.current ? currentMic() : await acquireMic()
      held.current = true
    } catch (e) {
      if (alive()) { setErr(MIC_MSG[micError(e)] || MIC_MSG.mic_denied); setRec('idle') }
      return
    }
    if (!alive()) return
    setStream(s); setRec('countdown')
    for (const n of COUNTDOWN) { setCount(n); buzz(12); await sleep(COUNT_STEP_MS); if (!alive()) return }
    setCount(null)
    let session
    try { session = startRecorder(currentMic() || s, maxMs) } catch { setErr("L'enregistrement n'a pas pu démarrer. Réessaie."); setRec('idle'); return }
    recRef.current = session
    setStartedAt(performance.now()); setRec('recording'); buzz(40)
    const raw = await session.finished
    recRef.current = null
    if (!alive()) return
    setStream(null); setStartedAt(null); setRec('scoring')
    const t = await finalizeTake(raw)
    if (!alive()) return
    const preview = URL.createObjectURL(t.wav || t.raw)
    previews.current.push(preview)
    try {
      if (!origSamples.current) origSamples.current = await decodeMono(original.src || clip.url)
      const mine = await decodeMono(t.wav || t.raw)
      if (!alive()) return
      const r = likeness(origSamples.current, mine)
      setTake({ ...t, preview }); setResult({ ...r, ...onScored(clip, r.score) })
      buzz(r.score >= 70 ? [30, 60, 30, 60, 60] : [25, 50, 25])
    } catch {
      if (alive()) setErr("Impossible d'analyser ce son sur ce navigateur. Réessaie, ou change de son.")
    }
    if (alive()) setRec('idle')
  }
  const stop = () => recRef.current?.stop()
  const cancel = () => { flow.current++; setRec('idle'); setCount(null); setStream(null) }

  const busy = rec !== 'idle'
  return (
    <PhaseFrame eyebrow={`Entraînement · ${clip.anime}`} prompt={`Imite : ${clip.title}`}
      footer={
        <>
          <Btn variant="ghost" onClick={onBack} disabled={busy}>← Autres sons</Btn>
          <Btn variant="ghost" onClick={onNext} disabled={busy}>Son suivant →</Btn>
        </>
      }>
      <div style={{ display: 'grid', gap: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ ...type.small, color: C.textMut }}>Original</span>
          {best != null && <span style={{ ...type.small, color: C.textMut }}>Ton record : <b style={{ color: T.accentLit }}>{best}</b></span>}
        </div>
        {original.status === 'ready'
          ? <WavePlayer id={`solo:${clip.id}`} src={original.src} peaks={original.peaks} label={clip.title} disabled={busy} />
          : <p style={{ ...type.small, color: C.textMut, margin: 0 }}>Chargement du son…</p>}

        {!canRecord() ? (
          <p style={{ ...type.body, color: C.warn, margin: 0 }}>Ce navigateur ne permet pas d'enregistrer. Essaie Safari, Chrome ou Edge à jour.</p>
        ) : rec === 'recording' ? (
          <div style={{ display: 'grid', justifyItems: 'center', gap: 10 }}>
            <motion.button type="button" className="gw-btn" onClick={stop} aria-label="Arrêter" whileTap={{ scale: 0.94 }} style={{
              width: 96, height: 96, borderRadius: '50%', display: 'grid', placeItems: 'center', cursor: 'pointer',
              background: 'rgba(190,106,90,0.16)', border: `1px solid ${T.danger}`, touchAction: 'manipulation',
            }}><span aria-hidden style={{ width: 28, height: 28, borderRadius: 4, background: T.danger }} /></motion.button>
            <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 16, color: T.textHi }}>Arrêter</span>
          </div>
        ) : rec === 'idle' ? (
          <div style={{ display: 'grid', justifyItems: 'center', gap: 10, padding: '6px 0' }}>
            <motion.button type="button" className="gw-btn" onClick={begin} aria-label={result ? 'Réessayer' : 'Enregistrer mon imitation'}
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.94 }} style={{
                width: 96, height: 96, borderRadius: '50%', display: 'grid', placeItems: 'center', cursor: 'pointer',
                background: 'rgba(190,106,90,0.12)', border: `1px solid ${T.danger}`, boxShadow: '0 0 0 10px rgba(190,106,90,0.06)', touchAction: 'manipulation',
              }}><span aria-hidden style={{ width: 36, height: 36, borderRadius: '50%', background: T.danger }} /></motion.button>
            <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 16, color: T.textHi }}>{result ? 'Réessayer' : 'Enregistrer'}</span>
          </div>
        ) : rec === 'scoring' ? (
          <p role="status" style={{ ...type.body, color: C.textMut, margin: 0, textAlign: 'center' }}>On compare ta voix à l'original…</p>
        ) : (
          <div style={{ display: 'grid', justifyItems: 'center' }}><Btn variant="ghost" onClick={cancel}>{rec === 'arming' ? 'Autorise le micro…' : 'Annuler'}</Btn></div>
        )}

        {stream && (rec === 'countdown' || rec === 'recording') && (
          <div style={{ position: 'relative' }}>
            <LiveWave stream={stream} startedAt={rec === 'recording' ? startedAt : null} maxMs={maxMs} />
            <AnimatePresence>
              {rec === 'countdown' && count != null && (
                <motion.div key={count} initial={{ scale: 1.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.05 } }}
                  style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: 'rgba(8,8,9,0.82)', borderRadius: RADIUS.md }}>
                  <DotText text={count} dot={11} color={T.accentLit} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {result && !busy && (
          <motion.section aria-live="polite" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            style={{ display: 'grid', gap: 14, padding: '18px 16px', borderRadius: RADIUS.lg, border: LINE, background: T.deep }}>
            {result.record && result.score >= 60 && <Confetti count={36} />}
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
              <CountUp to={result.score} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 22, color: T.textHi, letterSpacing: '-0.02em' }}>{result.verdict}</div>
                <div style={{ ...type.small, color: C.textMut, marginTop: 4 }}>
                  {result.silent ? "On n'entend rien sur ta prise. Rapproche-toi du micro."
                    : result.record ? (result.previous ? `Nouveau record ! (avant : ${result.previous})` : 'Premier score sur ce son.')
                    : `Ton record reste ${result.previous}.`}
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              <DotGauge label="Rythme" value={result.rhythm} />
              <DotGauge label="Mélodie" value={result.melody} delay={0.15} />
              <DotGauge label="Durée" value={result.length} delay={0.3} />
            </div>
            {result.melody == null && !result.silent && (
              <p style={{ ...type.small, color: C.textMut, margin: 0 }}>Mélodie non notée : pas assez de son tenu pour suivre la hauteur (cri bref, souffle…).</p>
            )}
            <Overlay a={original.peaks} b={take?.peaks} />
            <div style={{ ...type.small, color: C.textMut, display: 'flex', gap: 14 }}>
              <span><span aria-hidden style={{ color: T.textFaint }}>▮</span> original</span>
              <span><span aria-hidden style={{ color: T.accent }}>▮</span> toi</span>
            </div>
            {take && <WavePlayer id={`solo-take:${clip.id}`} src={take.preview} peaks={take.peaks} label="ton imitation" accent={T.accentHi} />}
          </motion.section>
        )}

        {err && <p role="alert" style={{ ...type.body, color: C.danger, margin: 0 }}>{err}</p>}
        {!busy && (
          <button type="button" className="gw-focus" onClick={() => setShowMic((v) => !v)}
            style={{ justifySelf: 'start', background: 'none', border: 'none', padding: 0, cursor: 'pointer', ...type.small, color: C.ink, textDecoration: 'underline' }}>
            {showMic ? 'Fermer le réglage du micro' : 'Problème de micro ?'}
          </button>
        )}
        {showMic && !busy && <MicSetup compact />}
      </div>
    </PhaseFrame>
  )
}

export default function Training() {
  const navigate = useNavigate()
  const [clips, setClips] = useState(null)
  const [error, setError] = useState(null)
  const [clip, setClip] = useState(null)
  const [palmares, setPalmares] = useState(readPalmares)
  useEffect(() => {
    let on = true
    fetchClips().then((r) => { if (!on) return; if (r.error) setError(r.error); setClips(r.clips || []) })
    return () => { on = false }
  }, [])

  const onScored = (c, score) => {
    const r = recordSolo(readPalmares(), c.id, score)
    savePalmares(r.palmares); setPalmares(r.palmares)
    return { record: r.record, previous: r.previous }
  }
  const next = () => {
    if (!clips?.length) return
    const pool = clips.filter((c) => c.id !== clip?.id)
    setClip(pool[Math.floor(Math.random() * pool.length)] || clips[0])
  }

  if (!clips) return <Waiting label="Chargement des sons…" />
  if (!clips.length) {
    return (
      <PhaseFrame prompt="Sons indisponibles">
        <p style={{ ...type.body, color: C.textMut }}>{error ? 'Les sons ne se chargent pas. Vérifie ta connexion et réessaie.' : 'Aucun son pour le moment.'}</p>
        <Btn onClick={() => navigate('/guess-who')}>Retour à l'accueil du jeu</Btn>
      </PhaseFrame>
    )
  }
  return (
    <div style={{ maxWidth: 880, margin: '0 auto', display: 'grid', gap: 18 }}>
      <button type="button" className="gw-focus" onClick={() => (clip ? setClip(null) : navigate('/guess-who'))} style={{
        justifySelf: 'start', background: 'none', border: 'none', cursor: 'pointer', padding: 0, ...type.small, color: C.textMut,
      }}>← {clip ? 'Tous les sons' : "Accueil du jeu"}</button>
      {clip
        ? <Practice key={clip.id} clip={clip} best={palmares.solo[clip.id]} onScored={onScored} onBack={() => setClip(null)} onNext={next} />
        : <Picker clips={clips} best={palmares.solo} onPick={setClip} />}
    </div>
  )
}
