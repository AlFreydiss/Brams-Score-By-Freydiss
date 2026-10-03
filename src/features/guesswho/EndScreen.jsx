import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { Btn, PhaseFrame, SPRING_POP } from './manga.jsx'
import { T, F, LINE, RADIUS, SHADOW, plate, pill, label } from './theme.js'
import { AvatarName, ClipPlayer, Lives, avatarUrl } from './ui.jsx'
import { Confetti } from './fx.jsx'
import { play } from './sfx.js'
import { bestHighlight } from './logic/highlights.js'
import { startErrorText } from './logic/startError.js'
import { logEvent } from '../../lib/guessWhoLog.js'

const plural = (n, w) => `${n} ${w}${n > 1 ? 's' : ''}`
// Noms des ex aequo sur un critère (au plus 2, puis « +N »).
function leaders(rows, score) {
  const max = Math.max(...rows.map(score))
  const top = rows.filter((p) => score(p) === max)
  const names = top.slice(0, 2).map((p) => p.display_name || 'Invité').join(' & ')
  return { max, names: top.length > 2 ? `${names} +${top.length - 2}` : names }
}

// Podium : 2e · 1er · 3e, plaques de hauteurs différentes, médailles patinées.
const MEDAL = { 1: T.medal.gold, 2: T.medal.silver, 3: T.medal.bronze }
function Podium({ rows }) {
  const reduce = useReducedMotion()
  const order = [[rows[1], 2, 90], [rows[0], 1, 120], [rows[2], 3, 70]]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', alignItems: 'end', gap: 10, margin: '6px auto 24px', maxWidth: 560 }}>
      {order.map(([p, rank, h]) => (
        <div key={rank} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, minWidth: 0 }}>
          {p && (
            <motion.div initial={reduce ? false : { y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.4, delay: reduce ? 0 : 0.35 + (3 - rank) * 0.3 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 0, maxWidth: '100%' }}>
              <img src={avatarUrl(p)} alt="" width={rank === 1 ? 68 : 54} height={rank === 1 ? 68 : 54} style={{
                width: rank === 1 ? 68 : 54, height: rank === 1 ? 68 : 54, borderRadius: '50%', objectFit: 'cover', background: T.raised,
                border: `1px solid ${rank === 1 ? T.accent : T.line}`, boxShadow: rank === 1 ? `0 0 0 4px ${T.glow}, 0 0 28px rgba(199,168,105,0.22)` : 'none',
              }} />
              <span style={{ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: F.ui, fontWeight: 600, fontSize: rank === 1 ? 16 : 14, color: T.textHi }}>
                {p.display_name || 'Invité'}
              </span>
              <span style={{ fontFamily: F.ui, fontWeight: 500, fontSize: 12.5, color: T.textMute }}>{plural(p.total_votes, 'vote')}</span>
            </motion.div>
          )}
          <motion.div initial={reduce ? false : { scaleY: 0 }} animate={{ scaleY: 1 }}
            transition={{ duration: 0.5, ease: [0.2, 0.7, 0.2, 1], delay: reduce ? 0 : (3 - rank) * 0.25 }}
            style={{
              ...plate({ borderRadius: `${RADIUS.md}px ${RADIUS.md}px 4px 4px` }),
              width: '100%', height: h, transformOrigin: 'bottom', display: 'grid', placeItems: 'start center', paddingTop: 12,
              opacity: p ? 1 : 0.35, boxSizing: 'border-box',
              // même trame de points que le fond, dorée sous le vainqueur
              background: `radial-gradient(circle, ${rank === 1 ? 'rgba(199,168,105,0.42)' : 'rgba(237,234,227,0.12)'} 1.3px, transparent 1.8px) 4px 4px / 9px 9px, linear-gradient(180deg, rgba(30,30,32,0.9) 0%, rgba(22,22,24,0.9) 100%)`,
            }}>
            <span style={{
              width: 30, height: 30, borderRadius: '50%', display: 'grid', placeItems: 'center', background: MEDAL[rank],
              color: T.onAccent, fontFamily: F.display, fontWeight: 600, fontSize: 15, boxShadow: `inset 0 1px 0 rgba(255,255,255,.35), ${SHADOW.soft}`,
            }}>{rank}</span>
          </motion.div>
        </div>
      ))}
    </div>
  )
}

function Stat({ label: text, value, detail, i }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 1.2 + i * 0.1 }}
      style={{ ...plate({ borderRadius: RADIUS.md }), padding: '12px 14px', minWidth: 0 }}>
      <div style={label()}>{text}</div>
      <div style={{ fontFamily: F.display, fontWeight: 500, fontSize: 18, color: T.textHi, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
      {detail && <div style={{ fontFamily: F.ui, fontWeight: 500, fontSize: 12.5, color: T.textMute }}>{detail}</div>}
    </motion.div>
  )
}

// Dernière page du chapitre : podium, stats fun, l'imitation de la partie, rejouer.
export default function EndScreen({ g }) {
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const rows = [...g.players].filter((p) => p.seat != null).sort((a, b) => b.total_votes - a.total_votes || b.lives - a.lives)
  const rest = rows.slice(3)
  // Récap serveur (guesswho_stats) en priorité, calcul local en repli.
  const awards = g.stats?.awards || {}
  const sp = Object.fromEntries((g.stats?.players || []).map((s) => [s.user_id, s]))
  const nameOf = (uid) => g.players.find((p) => p.user_id === uid)?.display_name || sp[uid]?.display_name || 'Invité'
  const livesLost = (p) => sp[p.user_id]?.lives_lost ?? p.lives_lost ?? Math.max(0, g.maxLives - p.lives)
  const bt = awards.best_take
  const top = bt?.audio_url
    ? { round: bt.round, user_id: bt.user_id, votes: bt.votes, audio_url: bt.audio_url, clip: bt.clip?.title || '' }
    : bestHighlight(g.highlights)
  const topPlayer = top && g.players.find((p) => p.user_id === top.user_id)
  useEffect(() => { const t = setTimeout(() => play('fanfare'), 900); return () => clearTimeout(t) }, [])
  const share = async () => {
    const text = `🎤 Meilleure imitation de la partie Guess Who : ${topPlayer?.display_name} sur « ${top.clip} »`
    try {
      if (navigator.share && top.audio_url.startsWith('https://')) await navigator.share({ title: 'Guess Who', text, url: top.audio_url })
      else await navigator.clipboard?.writeText(top.audio_url.startsWith('https://') ? `${text} ${top.audio_url}` : text)
    } catch { /* partage annulé */ }
  }
  const [replayErr, setReplayErr] = useState(null)
  const replay = async () => {
    setBusy(true); setReplayErr(null)
    const r = await g.act.start(g.room?.settings)
    setReplayErr(startErrorText(r))
    if (r?.error) logEvent(g.room?.code, 'start_refused', `revanche:${r.error}`)
    setBusy(false)
  }
  const [readyOff, setReadyOff] = useState(false) // base sans guesswho_set_ready
  const [readyBusy, setReadyBusy] = useState(false)
  const seated = g.players.filter((p) => p.seat != null)
  const showReady = !readyOff && !!g.me && g.me.seat != null && seated.some((p) => 'ready' in p)
  const readyCount = seated.filter((p) => p.ready).length
  const toggleReady = async () => {
    setReadyBusy(true)
    const r = await g.act.ready(!g.me.ready)
    setReadyBusy(false)
    if (r?.error === 'unsupported') setReadyOff(true)
    else if (r?.ok) play('select')
  }
  const voted = rows.length ? leaders(rows, (p) => p.total_votes) : null
  const lost = rows.length ? leaders(rows, livesLost) : null
  const alive = rows.length ? leaders(rows, (p) => p.lives) : null
  const mv = awards.most_voted && sp[awards.most_voted]
  const mw = awards.most_wins && sp[awards.most_wins]
  const played = g.stats?.rounds?.length || g.room?.round || 0
  const stats = [
    top && { label: 'Imitation de la partie', value: topPlayer?.display_name || 'Un joueur', detail: `« ${top.clip} », ${plural(top.votes, 'vote')}` },
    mv ? { label: 'Le plus voté', value: nameOf(mv.user_id), detail: plural(mv.total_votes, 'vote') }
      : voted && voted.max > 0 && { label: 'Le plus voté', value: voted.names, detail: plural(voted.max, 'vote') },
    mw && { label: 'Roi des tours', value: nameOf(mw.user_id), detail: `${plural(mw.wins, 'tour')} gagné${mw.wins > 1 ? 's' : ''}` },
    lost && lost.max > 0 && { label: 'Cœurs brisés', value: lost.names, detail: `${plural(lost.max, 'vie')} perdue${lost.max > 1 ? 's' : ''}` },
    awards.untouchable ? { label: 'Intouchable', value: nameOf(awards.untouchable), detail: 'aucune vie perdue' }
      : alive && alive.max > 0 && { label: 'Le plus solide', value: alive.names, detail: `${plural(alive.max, 'vie')} restante${alive.max > 1 ? 's' : ''}` },
    played > 0 && { label: 'Tours joués', value: `${played}` },
  ].filter(Boolean)
  return (
    <PhaseFrame eyebrow="Fin de partie" prompt="Le classement final">
      <Confetti count={48} duration={3000} />
      <Podium rows={rows} />
      {/* Actions en haut : pas besoin de défiler pour relancer. */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        {showReady && (
          <Btn variant={g.me.ready ? 'sea' : 'ghost'} onClick={toggleReady} disabled={readyBusy} aria-pressed={!!g.me.ready}
            style={{ flex: '1 1 200px', minHeight: 60, fontSize: 18 }}>
            {g.me.ready ? '✓ Prêt pour la revanche' : '✋ Prêt pour la revanche ?'}
          </Btn>
        )}
        {g.isHost
          ? <Btn onClick={replay} disabled={busy} style={{ flex: '1 1 220px', minHeight: 60, fontSize: 20 }}>
              {busy ? 'Relance…' : showReady ? `Revanche (${readyCount}/${seated.length} prêts)` : 'Rejouer'}
            </Btn>
          : <span className="gw-anim" style={{ flex: '1 1 220px', alignSelf: 'center', fontFamily: F.ui, fontWeight: 600, color: T.textMute, animation: 'gw-blink 1.6s ease-in-out infinite' }}>
              {showReady ? `${readyCount}/${seated.length} prêts. L'hôte lance la revanche…` : "En attente de l'hôte pour rejouer…"}
            </span>}
        <Btn variant="ghost" onClick={() => navigate('/guess-who')}>Quitter</Btn>
      </div>
      {replayErr && (
        <div role="alert" style={{ margin: '-8px 0 18px', fontFamily: F.ui, fontWeight: 600, fontSize: 15, color: T.danger }}>{replayErr}</div>
      )}
      {showReady && readyCount > 0 && (
        <div style={{ margin: '-6px 0 16px', fontFamily: F.ui, fontWeight: 500, fontSize: 14, color: T.textMute }}>
          ✓ Prêts : {seated.filter((p) => p.ready).map((p) => p.display_name || 'Invité').join(', ')}
        </div>
      )}

      {stats.length > 0 && (
        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 150px), 1fr))', marginBottom: 18 }}>
          {stats.map((s, i) => <Stat key={s.label} i={i} {...s} />)}
        </div>
      )}

      {top && (
        <div style={{ ...plate({ borderRadius: RADIUS.lg }), border: `1px solid ${T.accent}`, padding: 18, marginBottom: 14, display: 'grid', gap: 12 }}>
          <div style={label({ color: T.accent })}>L'imitation de la partie</div>
          <div style={{ fontFamily: F.display, fontWeight: 500, fontSize: 'clamp(1.2rem,3.4vw,1.6rem)', color: T.textHi, lineHeight: 1.2 }}>
            {topPlayer?.display_name || 'Un joueur'} <span style={{ color: T.textMute, fontFamily: F.ui, fontWeight: 500, fontSize: 15 }}>sur « {top.clip} », tour {top.round}, {plural(top.votes, 'vote')}</span>
          </div>
          <ClipPlayer url={top.audio_url} label="l'imitation de la partie" big />
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <a href={top.audio_url} download={`guesswho-${(topPlayer?.display_name || 'imitation').replace(/[^a-z0-9]+/gi, '-')}.${top.audio_url.includes('mp4') ? 'm4a' : 'webm'}`}
              className="gw-btn" style={{ ...pill('ghost'), display: 'inline-flex', alignItems: 'center', minHeight: 48, padding: '0 20px', fontFamily: F.ui, fontWeight: 700, fontSize: 15, textDecoration: 'none' }}>Télécharger</a>
            <Btn variant="ghost" onClick={share}>Partager</Btn>
          </div>
        </div>
      )}

      {rest.length > 0 && (
        <div style={{ display: 'grid', gap: 8 }}>
          {rest.map((p, i) => (
            <div key={p.user_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', border: LINE, borderRadius: RADIUS.md, background: T.deep }}>
              <span style={{ fontFamily: F.display, fontWeight: 500, fontSize: 15, color: T.textMute, width: 22 }}>{i + 4}</span>
              <div style={{ flex: 1, minWidth: 0 }}><AvatarName player={p} size={36} /></div>
              {p.ready && <span style={{ fontFamily: F.ui, fontWeight: 600, color: T.ok }}>✓ prêt</span>}
              <span style={{ fontFamily: F.ui, fontWeight: 500, color: T.textMute, whiteSpace: 'nowrap' }}>{plural(p.total_votes, 'vote')}</span>
              <Lives lives={p.lives} max={g.maxLives} size={16} />
            </div>
          ))}
        </div>
      )}
    </PhaseFrame>
  )
}
