import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { C, FONT_BODY, FONT_DISPLAY, Btn, PhaseFrame, SPRING_POP } from './manga.jsx'
import { AvatarName, ClipPlayer, Lives, avatarUrl } from './ui.jsx'
import { Confetti } from './fx.jsx'
import { play } from './sfx.js'
import { bestHighlight } from './logic/highlights.js'
import { startErrorText } from './logic/startError.js'

const plural = (n, w) => `${n} ${w}${n > 1 ? 's' : ''}`
// Noms des ex aequo sur un critère (au plus 2, puis « +N »).
function leaders(rows, score) {
  const max = Math.max(...rows.map(score))
  const top = rows.filter((p) => score(p) === max)
  const names = top.slice(0, 2).map((p) => p.display_name || 'Invité').join(' & ')
  return { max, names: top.length > 2 ? `${names} +${top.length - 2}` : names }
}

// Podium : 2e · 1er · 3e, marches de hauteurs différentes qui montent l'une après l'autre.
function Podium({ rows }) {
  const reduce = useReducedMotion()
  const order = [[rows[1], 2, 92], [rows[0], 1, 128], [rows[2], 3, 70]]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', alignItems: 'end', gap: 8, margin: '6px auto 22px', maxWidth: 560 }}>
      {order.map(([p, rank, h]) => (
        <div key={rank} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 0 }}>
          {p && (
            <motion.div initial={reduce ? false : { y: -30, opacity: 0, scale: 0.6 }} animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{ ...SPRING_POP, delay: reduce ? 0 : 0.35 + (3 - rank) * 0.35 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 0, maxWidth: '100%' }}>
              {rank === 1 && <span aria-hidden style={{ fontSize: 30, lineHeight: 1, filter: `drop-shadow(2px 2px 0 ${C.ink})` }}>👑</span>}
              <img src={avatarUrl(p)} alt="" width={rank === 1 ? 72 : 56} height={rank === 1 ? 72 : 56} style={{
                width: rank === 1 ? 72 : 56, height: rank === 1 ? 72 : 56, borderRadius: '50%', objectFit: 'cover',
                border: `3px solid ${C.ink}`, background: C.paper, boxShadow: rank === 1 ? `0 0 0 4px ${C.yellow}, 0 0 0 7px ${C.ink}` : 'none',
              }} />
              <span style={{ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: FONT_DISPLAY, fontSize: rank === 1 ? 17 : 14, color: C.ink }}>
                {p.display_name || 'Invité'}
              </span>
              <span style={{ fontFamily: FONT_BODY, fontWeight: 800, fontSize: 13, color: C.textMut }}>{plural(p.total_votes, 'vote')}</span>
            </motion.div>
          )}
          <motion.div initial={reduce ? false : { scaleY: 0 }} animate={{ scaleY: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20, delay: reduce ? 0 : (3 - rank) * 0.3 }}
            style={{
              width: '100%', height: h, transformOrigin: 'bottom', display: 'grid', placeItems: 'start center', paddingTop: 8,
              background: rank === 1 ? C.yellow : rank === 2 ? C.paper : C.tone, border: `3px solid ${C.ink}`, boxShadow: `4px 4px 0 ${C.ink}`,
              fontFamily: FONT_DISPLAY, fontSize: rank === 1 ? 40 : 30, color: C.ink, opacity: p ? 1 : 0.35, boxSizing: 'border-box',
            }}>{rank}</motion.div>
        </div>
      ))}
    </div>
  )
}

function Stat({ icon, label, value, detail, i }) {
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SPRING_POP, delay: 1.3 + i * 0.12 }}
      style={{ border: `3px solid ${C.ink}`, background: C.paper, padding: '10px 12px', boxShadow: `3px 3px 0 ${C.ink}`, minWidth: 0 }}>
      <div style={{ fontFamily: FONT_BODY, fontWeight: 800, fontSize: 12.5, color: C.textMut }}>{icon} {label}</div>
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 17, color: C.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
      {detail && <div style={{ fontFamily: FONT_BODY, fontWeight: 700, fontSize: 12.5, color: C.ink }}>{detail}</div>}
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
    setBusy(false)
  }
  const voted = rows.length ? leaders(rows, (p) => p.total_votes) : null
  const lost = rows.length ? leaders(rows, livesLost) : null
  const alive = rows.length ? leaders(rows, (p) => p.lives) : null
  const mv = awards.most_voted && sp[awards.most_voted]
  const mw = awards.most_wins && sp[awards.most_wins]
  const played = g.stats?.rounds?.length || g.room?.round || 0
  const stats = [
    top && { icon: '🎤', label: 'Imitation de la partie', value: topPlayer?.display_name || 'Un joueur', detail: `« ${top.clip} » · ${plural(top.votes, 'vote')}` },
    mv ? { icon: '🗳️', label: 'Le plus voté', value: nameOf(mv.user_id), detail: plural(mv.total_votes, 'vote') }
      : voted && voted.max > 0 && { icon: '🗳️', label: 'Le plus voté', value: voted.names, detail: plural(voted.max, 'vote') },
    mw && { icon: '👑', label: 'Roi des tours', value: nameOf(mw.user_id), detail: `${plural(mw.wins, 'tour')} gagné${mw.wins > 1 ? 's' : ''}` },
    lost && lost.max > 0 && { icon: '💔', label: 'Cœurs brisés', value: lost.names, detail: `${plural(lost.max, 'vie')} perdue${lost.max > 1 ? 's' : ''}` },
    awards.untouchable ? { icon: '🛡️', label: 'Intouchable', value: nameOf(awards.untouchable), detail: 'aucune vie perdue' }
      : alive && alive.max > 0 && { icon: '🛡️', label: 'Le plus solide', value: alive.names, detail: `${plural(alive.max, 'vie')} restante${alive.max > 1 ? 's' : ''}` },
    played > 0 && { icon: '📖', label: 'Tours joués', value: `${played}` },
  ].filter(Boolean)
  return (
    <PhaseFrame eyebrow="Fin du chapitre" prompt="Le classement final" tilt={0.4}>
      <Confetti count={48} duration={3000} />
      <Podium rows={rows} />
      {/* Actions en haut : pas besoin de défiler pour relancer. */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        {g.isHost
          ? <Btn onClick={replay} disabled={busy} style={{ flex: '1 1 220px', minHeight: 60, fontSize: 20 }}>{busy ? 'Relance…' : '🔁 Rejouer'}</Btn>
          : <span className="gw-anim" style={{ flex: '1 1 220px', alignSelf: 'center', fontFamily: FONT_BODY, fontWeight: 800, color: C.ink, animation: 'gw-blink 1.6s ease-in-out infinite' }}>En attente de l'hôte pour rejouer…</span>}
        <Btn variant="ghost" onClick={() => navigate('/guess-who')}>Quitter</Btn>
      </div>
      {replayErr && (
        <div role="alert" style={{ margin: '-8px 0 18px', fontFamily: FONT_BODY, fontWeight: 800, fontSize: 15, color: '#c8102e' }}>{replayErr}</div>
      )}

      {stats.length > 0 && (
        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 150px), 1fr))', marginBottom: 18 }}>
          {stats.map((s, i) => <Stat key={s.label} i={i} {...s} />)}
        </div>
      )}

      {top && (
        <div style={{ border: `3px solid ${C.ink}`, background: C.ink, color: C.paper, padding: 16, marginBottom: 14, display: 'grid', gap: 12 }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 'clamp(1.3rem,3.5vw,1.8rem)', color: C.yellow }}>🔁 L'imitation de la partie</div>
          <div style={{ fontFamily: FONT_BODY, fontWeight: 700 }}>
            {topPlayer?.display_name || 'Un joueur'} sur « {top.clip} » · tour {top.round} · {plural(top.votes, 'vote')}
          </div>
          <div style={{ background: C.paper, padding: 10, border: `3px solid ${C.ink}` }}><ClipPlayer url={top.audio_url} label="l'imitation de la partie" big /></div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <a href={top.audio_url} download={`guesswho-${(topPlayer?.display_name || 'imitation').replace(/[^a-z0-9]+/gi, '-')}.${top.audio_url.includes('mp4') ? 'm4a' : 'webm'}`}
              className="gw-btn" style={{ display: 'inline-flex', alignItems: 'center', minHeight: 48, padding: '0 18px', background: C.yellow, color: C.ink, border: `3px solid ${C.paper}`, fontFamily: FONT_DISPLAY, textDecoration: 'none' }}>Télécharger</a>
            <Btn variant="sea" onClick={share}>Partager</Btn>
          </div>
        </div>
      )}

      {rest.length > 0 && (
        <div style={{ display: 'grid', gap: 8 }}>
          {rest.map((p, i) => (
            <div key={p.user_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', border: `3px solid ${C.ink}`, background: C.paper }}>
              <span style={{ fontFamily: FONT_DISPLAY, fontSize: 16, color: C.ink, width: 24 }}>{i + 4}</span>
              <div style={{ flex: 1, minWidth: 0 }}><AvatarName player={p} size={36} /></div>
              <span style={{ fontFamily: FONT_BODY, fontWeight: 800, color: C.ink, whiteSpace: 'nowrap' }}>{plural(p.total_votes, 'vote')}</span>
              <Lives lives={p.lives} max={g.maxLives} size={16} />
            </div>
          ))}
        </div>
      )}
    </PhaseFrame>
  )
}
