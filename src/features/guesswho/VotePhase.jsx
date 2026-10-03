import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { C, type, Btn, PhaseFrame, LiveRoster } from './manga.jsx'
import { T, F, LINE, RADIUS, label } from './theme.js'
import { ClipPlayer, TakeCard, PLAY_EVT } from './ui.jsx'
import { roster } from './GagesPhase.jsx'
import { votableTakes } from './logic/clock.js'
import { createPlayQueue } from './logic/playQueue.js'
import { play, vibrate } from './sfx.js'

// « Écouter tout » : file audio unique (logique dans logic/playQueue.js).
function usePlaylist(urls) {
  const [idx, setIdx] = useState(null)
  const list = useRef(urls)
  list.current = urls
  const q = useRef(null)
  if (!q.current) {
    q.current = createPlayQueue({
      getUrls: () => list.current,
      onIdx: setIdx,
      makeAudio: () => {
        const a = new Audio()
        a.setAttribute('playsinline', '')
        a.onEnded = (fn) => a.addEventListener('ended', fn)
        return a
      },
    })
  }
  const start = () => {
    const a = q.current.start()
    window.dispatchEvent(new CustomEvent(PLAY_EVT, { detail: a }))
  }
  const stop = () => q.current.stop()
  useEffect(() => {
    // Un lecteur lancé à la main coupe la file.
    const other = (e) => { if (e.detail !== q.current.audio && q.current.idx != null) q.current.stop() }
    window.addEventListener(PLAY_EVT, other)
    return () => { window.removeEventListener(PLAY_EVT, other); q.current.dispose() }
  }, [])
  return { idx, start, stop }
}

export default function VotePhase({ g }) {
  const revote = g.room.phase === 'revote'
  // Vote déjà enregistré côté serveur (survit au rechargement).
  const [mine, setMine] = useState(g.myVote)
  const [err, setErr] = useState(null)
  const pending = useRef(false)
  useEffect(() => {
    // pas pendant un envoi : une synchro plus ancienne écraserait le vote optimiste
    if (g.myVote && !pending.current) setMine(g.myVote)
  }, [g.myVote])
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
    pending.current = true
    const r = await g.act.vote(uid).finally(() => { pending.current = false })
    if (!r?.ok) { setMine(prev); setErr(r?.error === 'phase' ? 'Trop tard, le vote est fini.' : "Vote pas pris en compte, réessaie.") }
  }
  const voters = g.players.filter((p) => p.seat != null && p.connected !== false)
  const voted = (g.prog?.voted || []).length
  const left = Math.max(0, voters.length - voted)
  const canVote = !!g.me && allowed.size > 0
  return (
    <PhaseFrame wide tick eyebrow={revote ? 'Égalité !' : `Tour ${g.room.round}, vote`}
      prompt={revote ? 'Départage les ex aequo' : 'Qui a fait la meilleure imitation ?'} remaining={g.remaining} total={g.total}>
      {/* Bandeau d'état : quoi faire maintenant. */}
      <motion.div key={mine ? 'ok' : 'todo'} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap',
          padding: '12px 16px', marginBottom: 16, borderRadius: RADIUS.md,
          border: `1px solid ${mine ? T.accent : T.line}`, background: mine ? 'rgba(199,168,105,0.08)' : T.deep, color: T.textHi,
        }}>
        <span style={{ fontFamily: F.display, fontWeight: 500, fontSize: 16.5 }}>
          {!canVote ? 'Les joueurs votent…'
            : mine ? `✓ Vote pour ${byId[mine]?.display_name || '…'} — modifiable jusqu'à la fin`
            : 'Écoute, puis vote pour ton préféré'}
        </span>
        <span style={{ fontFamily: F.ui, fontWeight: 600, fontSize: 13.5, color: T.textMute }}>
          {left === 0 ? 'Tout le monde a voté !' : `Encore ${left} vote${left > 1 ? 's' : ''} attendu${left > 1 ? 's' : ''}`}
        </span>
      </motion.div>
      {err && <p role="alert" style={{ ...type.body, color: C.danger, marginTop: 0 }}>{err}</p>}

      <div style={{
        display: 'grid', gap: 12, marginBottom: 18, padding: 14, borderRadius: RADIUS.md,
        border: `1px solid ${pl.idx === 0 && clip ? T.accent : T.line}`, background: T.deep,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ ...type.small, color: T.textHi, minWidth: 0 }}>
            <span style={label({ color: T.accent, marginRight: 10 })}>Original</span>
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
