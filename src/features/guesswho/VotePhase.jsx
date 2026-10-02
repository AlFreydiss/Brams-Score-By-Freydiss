import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { C, FONT_BODY, FONT_DISPLAY, type, Btn, PhaseFrame, LiveRoster } from './manga.jsx'
import { ClipPlayer, TakeCard, PLAY_EVT } from './ui.jsx'
import { roster } from './GagesPhase.jsx'
import { votableTakes } from './logic/clock.js'
import { play, vibrate } from './sfx.js'

// « Écouter tout » : original puis chaque imitation, dans UN seul élément audio
// (débloqué par le tap → iOS accepte d'enchaîner les sons sans nouveau geste).
function usePlaylist(urls) {
  const audioRef = useRef(null)
  const idxRef = useRef(null)
  const [idx, setIdxState] = useState(null)
  const list = useRef(urls)
  list.current = urls
  const setIdx = (i) => { idxRef.current = i; setIdxState(i) }
  const go = (i) => {
    const a = audioRef.current
    if (!a || i >= list.current.length) { setIdx(null); return }
    setIdx(i)
    a.src = list.current[i]
    a.play().catch(() => { if (idxRef.current === i) go(i + 1) })
  }
  const stop = () => { audioRef.current?.pause(); setIdx(null) }
  const start = () => {
    if (!audioRef.current) {
      const a = new Audio()
      a.setAttribute('playsinline', '')
      // petite respiration entre deux sons
      a.addEventListener('ended', () => {
        const i = idxRef.current
        if (i != null) setTimeout(() => { if (idxRef.current === i) go(i + 1) }, 350)
      })
      audioRef.current = a
    }
    window.dispatchEvent(new CustomEvent(PLAY_EVT, { detail: audioRef.current }))
    go(0)
  }
  useEffect(() => {
    // Un lecteur lancé à la main coupe la file.
    const other = (e) => { if (e.detail !== audioRef.current && idxRef.current != null) { audioRef.current?.pause(); setIdx(null) } }
    window.addEventListener(PLAY_EVT, other)
    return () => { window.removeEventListener(PLAY_EVT, other); audioRef.current?.pause() }
  }, [])
  return { idx, start, stop }
}

export default function VotePhase({ g }) {
  const revote = g.room.phase === 'revote'
  const [mine, setMine] = useState(null)
  const [err, setErr] = useState(null)
  const byId = Object.fromEntries(g.players.map((p) => [p.user_id, p]))
  const shown = revote ? g.takes.filter((t) => g.room.tied.includes(t.user_id)) : g.takes
  const allowed = new Set(votableTakes(g.takes, { me: g.me?.user_id, phase: g.room.phase, tied: g.room.tied }).map((t) => t.user_id))
  const clip = g.room.clip
  const urls = [...(clip ? [clip.url] : []), ...shown.map((t) => t.audio_url)]
  const pl = usePlaylist(urls)
  const offset = clip ? 1 : 0
  // Vote optimiste : la carte s'allume tout de suite, on annule si le serveur refuse.
  const vote = async (uid) => {
    const prev = mine
    setMine(uid); setErr(null)
    play('select'); vibrate(25)
    const r = await g.act.vote(uid)
    if (!r?.ok) { setMine(prev); setErr(r?.error === 'phase' ? 'Trop tard, le vote est fini.' : "Vote pas pris en compte, réessaie.") }
  }
  const voters = g.players.filter((p) => p.seat != null && p.connected !== false)
  const voted = (g.prog?.voted || []).length
  const left = Math.max(0, voters.length - voted)
  const canVote = !!g.me && allowed.size > 0
  return (
    <PhaseFrame wide tick eyebrow={revote ? 'Égalité !' : `Tour ${g.room.round} · Vote`}
      prompt={revote ? 'Départage les ex aequo' : 'Qui a fait la meilleure imitation ?'} remaining={g.remaining} total={g.total}>
      {/* Bandeau d'état : quoi faire maintenant. */}
      <motion.div key={mine ? 'ok' : 'todo'} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap',
          padding: '10px 14px', marginBottom: 16, border: `3px solid ${C.ink}`,
          background: mine ? C.ink : C.yellow, color: mine ? C.yellow : C.ink,
        }}>
        <span style={{ fontFamily: FONT_DISPLAY, fontSize: 16 }}>
          {!canVote ? 'Les joueurs votent…'
            : mine ? `✓ Vote pour ${byId[mine]?.display_name || '…'} — modifiable jusqu'à la fin`
            : '👂 Écoute, puis vote pour ton préféré'}
        </span>
        <span style={{ fontFamily: FONT_BODY, fontWeight: 800, fontSize: 14 }}>
          {left === 0 ? 'Tout le monde a voté !' : `Encore ${left} vote${left > 1 ? 's' : ''} attendu${left > 1 ? 's' : ''}`}
        </span>
      </motion.div>
      {err && <p role="alert" style={{ ...type.body, color: C.danger, marginTop: 0 }}>{err}</p>}

      <div style={{
        display: 'grid', gap: 10, marginBottom: 18, padding: 12, border: `3px solid ${C.ink}`,
        background: pl.idx === 0 && clip ? '#FFE3E8' : C.paper,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ ...type.small, color: C.ink, minWidth: 0 }}>
            <span style={{ background: C.ink, color: C.paper, padding: '1px 8px', marginRight: 8, fontFamily: FONT_DISPLAY, fontSize: 12 }}>ORIGINAL</span>
            {clip?.title}
          </div>
          <Btn variant={pl.idx != null ? 'ghost' : 'sea'} onClick={pl.idx != null ? pl.stop : pl.start} style={{ minHeight: 46, fontSize: 14, padding: '0 14px' }}>
            {pl.idx != null ? `■ Stop (${pl.idx + 1}/${urls.length})` : '▶▶ Écouter tout'}
          </Btn>
        </div>
        {clip && <ClipPlayer url={clip.url} label={clip.title} />}
      </div>

      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 250px), 1fr))' }}>
        {shown.map((t, i) => {
          const isMe = t.user_id === g.me?.user_id
          return (
            <TakeCard key={t.user_id} index={i} player={byId[t.user_id]} url={t.audio_url} isMe={isMe}
              selected={mine === t.user_id} dim={!!mine && mine !== t.user_id && !isMe}
              onAir={pl.idx === i + offset}
              onVote={g.me && allowed.has(t.user_id) ? () => vote(t.user_id) : undefined}
              voteLabel="Je vote !" />
          )
        })}
      </div>
      {!shown.length && <p style={{ ...type.body, color: C.textMut }}>Aucune imitation reçue ce tour-ci…</p>}
      <LiveRoster players={g.players} submittedSeats={roster(g, g.prog?.voted)} meUserId={g.me?.user_id} label="ont voté" />
    </PhaseFrame>
  )
}
