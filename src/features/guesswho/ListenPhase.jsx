import { useCallback, useEffect, useState } from 'react'
import { type } from './manga.jsx'
import { C } from './manga.jsx'
import { F, pill as pillOf } from './theme.js'
import { Btn, PhaseFrame } from './manga.jsx'
import { WavePlayer } from './LiveWave.jsx'
import { loadClip } from '../../lib/guessWhoAudio.js'

// Son du tour préchargé (octets + onde), partagé avec l'écran d'enregistrement.
// → { status: 'loading' | 'ready', src, peaks, retry }
export function useClip(url) {
  const [state, setState] = useState({ status: 'loading', url: null, src: null, peaks: null })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    if (!url) return
    let alive = true
    loadClip(url, { fresh: attempt > 0 }).then((c) => {
      if (alive && c) setState({ status: 'ready', url, src: c.src, peaks: c.peaks })
    })
    return () => { alive = false }
  }, [url, attempt])
  const retry = useCallback(() => {
    setState({ status: 'loading', url: null, src: null, peaks: null })
    setAttempt((a) => a + 1)
  }, [])
  return state.url === url ? { ...state, retry } : { status: 'loading', src: null, peaks: null, retry }
}

const pill = (on) => ({
  ...pillOf(on ? 'primary' : 'ghost'), minHeight: 44, padding: '0 16px', cursor: 'pointer',
  ...type.small, fontFamily: F.ui, touchAction: 'manipulation',
})

export default function ListenPhase({ g }) {
  const clip = g.room?.clip
  const sound = useClip(clip?.url)
  const [broken, setBroken] = useState(false)
  const [loop, setLoop] = useState(false)
  useEffect(() => { setBroken(false) }, [clip?.id])
  if (!clip) {
    return (
      <PhaseFrame prompt="Aucun son disponible">
        <p style={{ ...type.body, color: C.textMut }}>La bibliothèque de sons est vide pour l'instant.</p>
      </PhaseFrame>
    )
  }
  const retry = () => { setBroken(false); sound.retry() }
  return (
    <PhaseFrame eyebrow={`Tour ${g.room.round}, écoute bien`} prompt={clip.title} remaining={g.remaining} total={g.total}
      footer={g.isHost && broken && <Btn variant="ghost" onClick={() => { setBroken(false); g.act.skip() }}>Changer de son</Btn>}>
      <p style={{ ...type.body, color: C.textMut, marginTop: 0 }}>
        {clip.anime} ({clip.lang === 'fr' ? 'VF' : 'VO'}). Tu devras le reproduire juste après.
      </p>
      {sound.status === 'loading'
        ? <p role="status" style={{ ...type.h3, color: C.textMut, margin: '8px 0' }}>Chargement du son…</p>
        : <WavePlayer id={`clip:${clip.id}`} src={sound.src} peaks={sound.peaks} label={clip.title} big autoPlay loop={loop}
            onError={() => setBroken(true)} />}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
        <button type="button" className="gw-focus" aria-pressed={loop} onClick={() => setLoop((v) => !v)} style={pill(loop)}>
          {loop ? '✓ En boucle' : 'Écouter en boucle'}
        </button>
      </div>
      {broken && (
        <div role="alert" style={{ display: 'grid', gap: 10, marginTop: 14 }}>
          <p style={{ ...type.body, color: C.warn, margin: 0 }}>
            Le son ne charge pas. {g.isHost ? 'Réessaie ou change de son.' : "Réessaie, ou l'hôte peut en changer."}
          </p>
          <Btn variant="sea" onClick={retry} style={{ justifySelf: 'start' }}>↻ Réessayer</Btn>
        </div>
      )}
    </PhaseFrame>
  )
}
