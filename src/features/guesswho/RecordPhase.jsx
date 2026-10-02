import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { type } from './manga.jsx'
import { C } from './manga.jsx'
import { T, F } from './theme.js'
import { Btn, PhaseFrame, LiveRoster } from './manga.jsx'
import { roster } from './GagesPhase.jsx'
import {
  acquireMic, buzz, canRecord, currentMic, finalizeTake, micError, pauseSound, releaseMic,
  startRecorder, unlockAudio, uploadTake,
} from '../../lib/guessWhoAudio.js'
import { AUTO_SEND_S, COUNTDOWN, COUNT_STEP_MS, backoffMs, deadlineAction, inAppBrowser, recordTimeoutDetail, retryableError, takeLimitMs } from './logic/recordFlow.js'
import MicSetup from './MicSetup.jsx'
import { logEvent } from '../../lib/guessWhoLog.js'
import LiveWave, { WavePlayer } from './LiveWave.jsx'
import { useClip } from './ListenPhase.jsx'

const MESSAGES = {
  mic_denied: "Micro refusé. Sur iPhone : Réglages › Safari › Micro › Autoriser. Ailleurs : icône 🔒 à côté de l'adresse. Puis recharge la page.",
  no_mic: 'Aucun micro détecté. Branche un micro, ou choisis-en un autre avec « Problème de micro ? ».',
  mic_busy: 'Le micro est pris par une autre appli (appel, Discord, OBS…). Ferme-la ou choisis un autre micro avec « Problème de micro ? ».',
  mic_timeout: "Le navigateur ne répond pas pour le micro. Ouvre « Problème de micro ? » et teste-le.",
  no_support: "Le micro n'est pas accessible ici. Ouvre le site dans Safari ou Chrome.",
  rec_failed: "L'enregistrement n'a pas pu démarrer. Réessaie, ou recharge la page.",
  too_big: 'Enregistrement trop long pour être envoyé sans compte. Fais plus court ou connecte-toi.',
  upload_failed: "L'envoi a échoué. Vérifie ta connexion et réessaie.",
  phase: 'Trop tard, le vote a commencé.',
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export default function RecordPhase({ g }) {
  const clip = g.room?.clip
  const original = useClip(clip?.url)
  const maxMs = takeLimitMs(clip?.duration)
  const [rec, setRec] = useState('idle')      // idle | arming | countdown | recording | processing
  const [count, setCount] = useState(null)
  const [stream, setStream] = useState(null)
  const [startedAt, setStartedAt] = useState(null)
  const [take, setTake] = useState(null)      // { id, raw, wav, duration, peaks, silent, preview, upload }
  const [sending, setSending] = useState(false)
  const [sentId, setSentId] = useState(null)
  const [autoSent, setAutoSent] = useState(false)
  const [err, setErr] = useState(null)
  const [showMic, setShowMic] = useState(false)

  const gRef = useRef(g)
  gRef.current = g
  const flow = useRef({ n: 0 })               // jeton : un décompte/prise annulé ne continue pas
  const recRef = useRef(null)
  const held = useRef(false)                  // ce composant tient le micro
  const previews = useRef([])
  const autoTried = useRef(null)
  const sendingRef = useRef(false)

  const takeRef = useRef(null)
  takeRef.current = take
  const sentRef = useRef(null)
  sentRef.current = sentId

  // Démontage (fin de phase) : micro rendu, lecture coupée, aperçus libérés.
  useEffect(() => () => {
    const gg = gRef.current
    const miss = recordTimeoutDetail({
      me: gg.me, took: gg.myTake && gg.me ? [gg.me.user_id] : gg.prog?.took, sentLocal: sentRef.current != null,
      hadTake: !!takeRef.current, canRecord: canRecord(), dev: import.meta.env?.DEV,
    })
    if (miss) logEvent(gg.room?.code, 'record_timeout', miss)
    flow.current.n++
    recRef.current?.stop()
    if (held.current) { releaseMic(); held.current = false }
    pauseSound()
    previews.current.forEach((u) => URL.revokeObjectURL(u))
  }, [])

  const getStream = async () => {
    const live = currentMic()
    if (held.current && live) return live
    if (held.current) { releaseMic(); held.current = false }
    const s = await acquireMic()
    held.current = true
    return s
  }

  const cancel = () => {
    flow.current.n++
    setRec('idle'); setCount(null); setStream(null); setStartedAt(null)
  }

  const begin = async () => {
    unlockAudio()                             // dans le geste : onde du micro active sur iPhone
    pauseSound()                              // pas d'original dans la prise
    setErr(null); setAutoSent(false)
    const my = ++flow.current.n
    const alive = () => flow.current.n === my
    setRec('arming')
    let s
    try {
      s = await getStream()
    } catch (e) {
      logEvent(gRef.current.room?.code, 'mic_error', micError(e))
      if (alive()) { setErr(MESSAGES[micError(e)] || MESSAGES.mic_denied); setRec('idle') }
      return
    }
    if (!alive()) return
    setStream(s)
    // Décompte 3-2-1 : le micro est déjà ouvert, la prise démarre pile au « 0 ».
    setRec('countdown')
    for (const n of COUNTDOWN) {
      setCount(n); buzz(12)
      await sleep(COUNT_STEP_MS)
      if (!alive()) return
    }
    setCount(null)
    let session
    try {
      session = startRecorder(currentMic() || s, maxMs)
    } catch {
      logEvent(gRef.current.room?.code, 'mic_error', 'rec_failed')
      setErr(MESSAGES.rec_failed); setRec('idle'); setStream(null)
      return
    }
    recRef.current = session
    setStartedAt(performance.now())
    setRec('recording'); buzz(40)
    const raw = await session.finished
    recRef.current = null
    if (!alive()) return
    buzz([25, 50, 25])
    setStream(null); setStartedAt(null)
    setRec('processing')
    const t = await finalizeTake(raw)
    if (!alive()) return
    const preview = URL.createObjectURL(t.wav || t.raw)
    previews.current.push(preview)
    // Pré-envoi en arrière-plan : « Envoyer » (ou l'envoi auto) sera instantané.
    const ready = { ...t, id: my, preview, upload: upload(t) }
    setTake(ready)
    setRec('idle')
  }

  const stop = () => recRef.current?.stop()
  const upload = (t) => uploadTake(t, gRef.current.room.code).catch(() => ({ error: 'upload_failed' }))

  const send = async (t = take, auto = false) => {
    if (!t || sendingRef.current) return
    sendingRef.current = true
    setSending(true); setErr(null)
    let r = null
    try {
      let up = await t.upload
      if (up.error) { t.upload = upload(t); up = await t.upload } // nouvelle tentative
      r = up.error ? { error: up.error } : null
      for (let attempt = 0; !up.error && attempt < 3; attempt++) {
        await sleep(backoffMs(attempt))
        r = await gRef.current.act.take(up.url, Math.round(t.duration * 10) / 10)
        if (r?.ok || !retryableError(r?.error)) break
      }
    } finally {
      sendingRef.current = false
      setSending(false)
    }
    if (r?.ok) { setSentId(t.id); setAutoSent(auto); buzz(20) }
    else {
      setErr(MESSAGES[r?.error] || MESSAGES.upload_failed)
      logEvent(gRef.current.room?.code, 'upload_failed', String(r?.error || 'unknown'))
    }
  }

  // Fin du chrono : on coupe la prise en cours puis on envoie la dernière prise.
  useEffect(() => {
    const a = deadlineAction({ remaining: g.remaining, rec, takeId: take?.id, sentId, sending })
    if (a === 'stop') stop()
    else if (a === 'cancel') cancel()
    else if (a === 'send' && autoTried.current !== take.id) { autoTried.current = take.id; send(take, true) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g.remaining, rec, take, sentId, sending])

  if (!g.me || g.me.lives <= 0) {
    return <PhaseFrame prompt="Les joueurs imitent le son…" remaining={g.remaining} total={g.total}>
      <LiveRoster players={g.players} submittedSeats={roster(g, g.prog?.took)} meUserId={g.me?.user_id} />
    </PhaseFrame>
  }
  if (!canRecord()) {
    const inApp = typeof navigator !== 'undefined' && inAppBrowser(navigator.userAgent)
    return <PhaseFrame prompt="Micro indisponible" remaining={g.remaining} total={g.total}>
      <p style={{ ...type.body, color: C.warn }}>
        {inApp
          ? "Le navigateur intégré à cette appli ne donne pas accès au micro. Ouvre le lien dans Safari ou Chrome (menu ⋯ › Ouvrir dans le navigateur)."
          : "Ce navigateur ne permet pas d'enregistrer. Essaie Safari, Chrome ou Edge à jour."}
      </p>
    </PhaseFrame>
  }

  const busy = rec !== 'idle'
  const sentThis = take && sentId === take.id
  const late = g.remaining != null && g.remaining <= AUTO_SEND_S
  let mainBtn
  if (rec === 'recording') mainBtn = <Btn variant="danger" onClick={stop} style={{ minHeight: 56 }}>■ Arrêter</Btn>
  else if (rec === 'countdown' || rec === 'arming') mainBtn = <Btn variant="ghost" onClick={cancel}>{rec === 'arming' ? 'Autorise le micro…' : 'Annuler'}</Btn>
  else if (rec === 'processing') mainBtn = <Btn variant="ghost" disabled>Préparation…</Btn>
  else mainBtn = <Btn variant={take ? 'ghost' : 'ember'} onClick={begin} disabled={sending || late} style={{ minHeight: 56, padding: '0 26px' }}>{take ? '↺ Recommencer' : '● Enregistrer'}</Btn>

  return (
    <PhaseFrame eyebrow={`Tour ${g.room.round} · À toi`} prompt={`Imite : ${clip?.title || ''}`} remaining={g.remaining} total={g.total}
      footer={
        <>
          {mainBtn}
          {take && !busy && (
            <Btn onClick={() => send(take)} disabled={sending || sentThis}>
              {sentThis ? '✓ Envoyé' : sending ? 'Envoi…' : sentId ? 'Envoyer cette prise' : 'Envoyer mon imitation'}
            </Btn>
          )}
        </>
      }>
      <div style={{ display: 'grid', gap: 14 }}>
        <div style={{ ...type.small, color: C.textMut }}>Original</div>
        {clip && original.status === 'ready'
          ? <WavePlayer id={`clip:${clip.id}`} src={original.src} peaks={original.peaks} label={clip.title} disabled={busy} />
          : <p style={{ ...type.small, color: C.textMut, margin: 0 }}>Chargement du son…</p>}

        {stream && (rec === 'countdown' || rec === 'recording') && (
          <div style={{ position: 'relative' }}>
            <LiveWave stream={stream} startedAt={rec === 'recording' ? startedAt : null} maxMs={maxMs} />
            <AnimatePresence>
              {rec === 'countdown' && count != null && (
                <motion.div key={count} aria-live="assertive"
                  initial={{ scale: 1.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.05 } }}
                  transition={{ duration: 0.22 }}
                  style={{
                    position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none',
                    fontFamily: F.display, fontWeight: 500, fontSize: 'clamp(72px, 20vw, 120px)', lineHeight: 1, color: T.accentLit,
                    textShadow: '0 4px 30px rgba(0,0,0,.6)',
                  }}>
                  {count}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
        {rec === 'countdown' && <p role="status" style={{ ...type.h3, color: C.ink, margin: 0 }}>Prépare-toi…</p>}
        {rec === 'recording' && <p role="status" style={{ ...type.h3, color: T.textHi, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}><span aria-hidden className="gw-anim" style={{ width: 10, height: 10, borderRadius: '50%', background: T.danger, animation: 'gw-blink 1.2s ease-in-out infinite' }} />À toi ! Appuie sur Arrêter quand tu as fini.</p>}
        {rec === 'processing' && <p role="status" style={{ ...type.small, color: C.textMut, margin: 0 }}>On nettoie ta prise (silences coupés, volume réglé)…</p>}

        {take && !busy && (
          <>
            <div style={{ ...type.small, color: C.textMut }}>Ton imitation ({take.duration.toFixed(1)} s){sentThis ? '' : " — réécoute-la avant d'envoyer"}</div>
            <WavePlayer id={`take:${take.id}`} src={take.preview} peaks={take.peaks} label="ton imitation" accent={T.accentHi} />
            {take.silent && (
              <p role="alert" style={{ ...type.body, color: C.warn, margin: 0 }}>
                On n'entend presque rien sur cette prise. Rapproche-toi du micro, ou vérifie-le avec « Problème de micro ? ».
              </p>
            )}
          </>
        )}
        {sentThis && (
          <p role="status" style={{ ...type.body, color: C.ok, margin: 0 }}>
            {autoSent ? 'Chrono presque fini : ta dernière prise a été envoyée automatiquement ✓' : 'Envoyé ✓ Tu peux encore recommencer et renvoyer avant la fin du chrono.'}
          </p>
        )}
        {/* Après un rechargement : le serveur a déjà mon imitation de ce tour. */}
        {g.myTake && !sentId && !take && !busy && (
          <p role="status" style={{ ...type.body, color: C.ok, margin: 0 }}>
            Imitation déjà envoyée ✓ Tu peux en refaire une avant la fin du chrono.
          </p>
        )}
        {take && sentId && !sentThis && !busy && (
          <p style={{ ...type.small, color: C.warn, margin: 0 }}>Nouvelle prise pas encore envoyée : c'est la précédente qui compte pour l'instant (envoi auto à la fin du chrono).</p>
        )}
        {take && !sentId && !busy && !sending && (
          <p style={{ ...type.small, color: C.textMut, margin: 0 }}>Pas envoyée ? Ta dernière prise partira toute seule juste avant la fin du chrono.</p>
        )}
        {err && <p role="alert" style={{ ...type.body, color: C.danger, margin: 0 }}>{err}</p>}
        {!busy && (
          <button type="button" className="gw-focus" onClick={() => setShowMic((v) => !v)}
            style={{ justifySelf: 'start', background: 'none', border: 'none', padding: 0, cursor: 'pointer', ...type.small, color: C.ink, textDecoration: 'underline' }}>
            {showMic ? 'Fermer le réglage du micro' : 'Problème de micro ?'}
          </button>
        )}
        {showMic && !busy && <MicSetup compact onError={(c) => logEvent(gRef.current.room?.code, 'mic_error', `setup:${c}`)} />}
      </div>
      <LiveRoster players={g.players} submittedSeats={roster(g, g.prog?.took)} meUserId={g.me?.user_id} />
    </PhaseFrame>
  )
}
