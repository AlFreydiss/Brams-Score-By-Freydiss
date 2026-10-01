import { useEffect, useRef, useState } from 'react'
import { type } from './manga.jsx'
import { C } from './manga.jsx'
import { Btn, PhaseFrame, LiveRoster } from './manga.jsx'
import { ClipPlayer } from './ui.jsx'
import { roster } from './GagesPhase.jsx'
import { canRecord, startRecording, uploadTake } from '../../lib/guessWhoAudio.js'

const MESSAGES = {
  mic_denied: "Micro refusé. Autorise le micro pour ce site (icône 🔒 à côté de l'adresse), puis recharge la page.",
  no_mic: 'Aucun micro détecté sur cet appareil.',
  too_big: 'Enregistrement trop long pour être envoyé sans compte. Fais plus court ou connecte-toi.',
  upload_failed: "L'envoi a échoué. Réessaie.",
  phase: 'Trop tard, le vote a commencé.',
}

export default function RecordPhase({ g }) {
  const clip = g.room?.clip
  const maxMs = Math.round(((clip?.duration || 5) + 3) * 1000)
  const recRef = useRef(null)                // session en cours
  const [take, setTake] = useState(null)     // { blob, duration, preview }
  const [state, setState] = useState('idle') // idle | recording | sending | sent
  const [err, setErr] = useState(null)
  const previewRef = useRef(null)
  // Nettoyage au démontage seulement (micro coupé, URL d'aperçu libérée).
  useEffect(() => () => {
    recRef.current?.cancel()
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
  }, [])

  if (!g.me || g.me.lives <= 0) {
    return <PhaseFrame prompt="Les joueurs imitent le son…" remaining={g.remaining} total={g.total}>
      <LiveRoster players={g.players} submittedSeats={roster(g, g.prog?.took)} meUserId={g.me?.user_id} />
    </PhaseFrame>
  }
  if (!canRecord()) {
    return <PhaseFrame prompt="Micro indisponible" remaining={g.remaining} total={g.total}>
      <p style={{ ...type.body, color: C.warn }}>Ce navigateur ne permet pas d'enregistrer. Essaie Chrome, Edge ou Safari récent.</p>
    </PhaseFrame>
  }

  const begin = async () => {
    setErr(null)
    try {
      const session = await startRecording(maxMs)
      recRef.current = session
      setState('recording')
      // `finished` se résout à l'arrêt manuel OU automatique (durée max atteinte).
      session.finished.then((res) => {
        if (previewRef.current) URL.revokeObjectURL(previewRef.current)
        previewRef.current = URL.createObjectURL(res.blob)
        recRef.current = null
        setTake({ ...res, preview: previewRef.current }); setState('idle')
      })
    } catch (e) { setErr(MESSAGES[e.message] || MESSAGES.mic_denied) }
  }
  const stop = () => recRef.current?.stop()
  const send = async () => {
    setState('sending'); setErr(null)
    const up = await uploadTake(take.blob, g.room.code)
    if (up.error) { setErr(MESSAGES[up.error]); setState('idle'); return }
    const r = await g.act.take(up.url, Math.round(take.duration * 10) / 10)
    if (r?.ok) setState('sent')
    else { setErr(MESSAGES[r?.error] || MESSAGES.upload_failed); setState('idle') }
  }

  return (
    <PhaseFrame eyebrow={`Tour ${g.room.round} · À toi`} prompt={`Imite : ${clip?.title || ''}`} remaining={g.remaining} total={g.total}
      footer={
        <>
          {state === 'recording'
            ? <Btn variant="ember" onClick={stop}>■ Arrêter</Btn>
            : <Btn variant={take ? 'ghost' : 'ember'} onClick={begin} disabled={state === 'sending'}>{take ? '↺ Recommencer' : '● Enregistrer'}</Btn>}
          {take && state !== 'recording' && (
            <Btn onClick={send} disabled={state === 'sending' || state === 'sent'}>
              {state === 'sent' ? '✓ Envoyé' : state === 'sending' ? 'Envoi…' : 'Envoyer mon imitation'}
            </Btn>
          )}
        </>
      }>
      <div style={{ display: 'grid', gap: 14 }}>
        <div style={{ ...type.small, color: C.textMut }}>Original</div>
        {clip && <ClipPlayer url={clip.url} label={clip.title} />}
        {state === 'recording' && <p style={{ ...type.h3, color: C.ember, margin: 0 }}>● Enregistrement… (max {Math.round(maxMs / 1000)} s)</p>}
        {take && state !== 'recording' && (
          <>
            <div style={{ ...type.small, color: C.textMut }}>Ton imitation ({take.duration.toFixed(1)} s)</div>
            <ClipPlayer url={take.preview} label="ton imitation" />
          </>
        )}
        {state === 'sent' && <p style={{ ...type.body, color: C.ok, margin: 0 }}>Envoyé. Tu peux encore recommencer et renvoyer avant la fin du chrono.</p>}
        {err && <p style={{ ...type.body, color: C.danger, margin: 0 }}>{err}</p>}
      </div>
      <LiveRoster players={g.players} submittedSeats={roster(g, g.prog?.took)} meUserId={g.me?.user_id} />
    </PhaseFrame>
  )
}
