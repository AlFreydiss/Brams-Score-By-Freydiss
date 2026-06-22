// Freydiss Phone — salle d'attente (pont du navire). Code partageable, joueurs autour
// d'une table de capitaine, réglages hôte, bouton Démarrer. Join tardif = spectateur.
import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { type, fonts } from '../../styles/typography.js'
import { C, GRAD, alpha, panel, foilEdge, KEYFRAMES, SPRING_POP } from './theme.js'
import { Btn } from './ui.jsx'
import { playSound } from './sound.js'

const DURATION_PRESETS = [
  { id: 'chill', label: 'Tranquille', writing: 80, drawing: 150, describing: 60 },
  { id: 'normal', label: 'Normal', writing: 50, drawing: 90, describing: 40 },
  { id: 'rush', label: 'Rush', writing: 30, drawing: 50, describing: 25 },
]
// Équipes (2v2 / NvN) : stockées dans room.settings.teams { userId: 0|1 } — zéro migration SQL.
export const TEAM = [
  { label: 'Rouge', emoji: '🔴', color: '#e0524a' },
  { label: 'Bleu', emoji: '🔵', color: '#3a6fd4' },
]

function PlayerSeat({ player, isMe, angle, radius, index, team, canKick, onKick }) {
  const x = Math.cos(angle) * radius
  const y = Math.sin(angle) * radius
  const name = player.display_name || 'Invité'
  const avatar = player.avatar_url || `https://api.dicebear.com/8.x/thumbs/svg?seed=${encodeURIComponent(name)}`
  const teamColor = team != null ? TEAM[team].color : null
  // Priorité bordure : équipe > moi > prêt > neutre.
  const border = teamColor || (isMe ? C.gold : player.is_ready ? C.ok : C.hairTop)
  return (
    <div
      className="bp-seat" data-bp-anim
      style={{
        position: 'absolute', left: '50%', top: '50%', textAlign: 'center', width: 96,
        // Le siège pousse depuis le centre de la table vers sa place (apparition décalée).
        '--bp-sx': `${x}px`, '--bp-sy': `${y}px`,
        transform: `translate(-50%,-50%) translate(${x}px, ${y}px)`,
        animation: `bp-seat-in .5s cubic-bezier(.18,1.1,.3,1) both`,
        animationDelay: `${Math.min(index, 12) * 70}ms`,
      }}
    >
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <img loading="lazy" decoding="async" src={avatar} alt="" data-bp-anim style={{
          width: 54, height: 54, borderRadius: '50%', objectFit: 'cover',
          border: `2px solid ${border}`,
          boxShadow: teamColor ? `0 0 0 4px ${alpha(teamColor, 0.18)}` : player.is_ready ? `0 0 0 4px ${alpha(C.ok, 0.16)}` : isMe ? `0 0 0 4px ${alpha(C.gold, 0.16)}` : 'none',
          background: C.surfaceFlat, transition: 'border-color .2s, box-shadow .2s',
          animation: !player.is_ready && !player.is_host && !isMe ? 'bp-seatwait 2s ease-in-out infinite' : 'none',
        }} />
        {canKick && (
          <button onClick={() => onKick?.(player.user_id)} title={`Exclure ${name}`} aria-label={`Exclure ${name}`} style={{
            position: 'absolute', top: -8, right: -8, width: 22, height: 22, borderRadius: '50%', cursor: 'pointer',
            background: alpha(C.danger, 0.92), color: '#fff', border: '2px solid #1a1010', fontSize: 11, fontWeight: 900,
            display: 'grid', placeItems: 'center', lineHeight: 1, zIndex: 3,
          }}>✕</button>
        )}
        {player.is_host && (
          <span style={{ position: 'absolute', top: -13, left: '50%', fontSize: 17, transformOrigin: '50% 90%', animation: 'bp-crown 2.4s ease-in-out infinite' }} data-bp-anim>👑</span>
        )}
        {player.is_ready && (
          <span data-bp-anim style={{
            position: 'absolute', bottom: -2, right: -2, width: 18, height: 18, borderRadius: '50%',
            background: C.ok, color: '#06210f', fontSize: 11, display: 'grid', placeItems: 'center', fontWeight: 900,
            animation: 'bp-ready-pop .42s cubic-bezier(.2,1.4,.3,1) both',
          }}>✓</span>
        )}
      </div>
      <div style={{ ...type.small, color: C.text, fontWeight: 700, marginTop: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
    </div>
  )
}

export default function Lobby({ room, players, me, isHost, spectator, onStart, onSetReady, onCopy, copied, onKick }) {
  const [preset, setPreset] = useState('normal')
  const connected = useMemo(() => players.filter((p) => p.connected !== false), [players])
  const radius = Math.min(150, 90 + connected.length * 6)
  const sortedPlayers = connected
  const everyoneReady = sortedPlayers.length > 1 && sortedPlayers.every((p) => p.is_ready || p.is_host)
  const readyCount = sortedPlayers.filter((p) => p.is_ready || p.is_host).length

  // Moment "tout le monde est prêt" : un cue sonore une seule fois à la bascule.
  const wasReadyRef = useRef(false)
  useEffect(() => {
    if (everyoneReady && !wasReadyRef.current) playSound('reveal')
    wasReadyRef.current = everyoneReady
  }, [everyoneReady])

  // ── Mode équipes ──────────────────────────────────────────────────────────
  const [teamMode, setTeamMode] = useState(false)
  const [teams, setTeams] = useState({}) // { userId: 0|1 }
  // Auto-répartition à l'activation / à l'arrivée d'un joueur ; préserve les bascules manuelles
  // et purge ceux qui sont partis.
  useEffect(() => {
    if (!teamMode) return
    setTeams((prev) => {
      const next = {}
      sortedPlayers.forEach((p, i) => { const id = String(p.user_id); next[id] = prev[id] != null ? prev[id] : i % 2 })
      return next
    })
  }, [teamMode, sortedPlayers])
  const flipTeam = (id) => { if (isHost) setTeams((t) => ({ ...t, [id]: t[id] ? 0 : 1 })) }
  const balanceTeams = () => { const next = {}; sortedPlayers.forEach((p, i) => { next[String(p.user_id)] = i % 2 }); setTeams(next) }
  // Démarrage interdit si une équipe est vide (sinon score 2v2 absurde).
  const teamsValid = !teamMode || (sortedPlayers.some((p) => (teams[String(p.user_id)] ?? 0) === 0) && sortedPlayers.some((p) => (teams[String(p.user_id)] ?? 0) === 1))

  const settings = () => {
    const d = DURATION_PRESETS.find((x) => x.id === preset) || DURATION_PRESETS[1]
    // n = nombre de sièges, figé au start (base stable de la rotation des carnets côté client/serveur).
    const base = { mode: teamMode ? 'teams' : 'classique', n: players.length, rounds: players.length, phaseDurations: { writing: d.writing, drawing: d.drawing, describing: d.describing } }
    // Les équipes voyagent dans settings (JSONB) → persistées au start, relues par tous au reveal.
    if (teamMode) { base.teamMode = true; base.teams = teams }
    return base
  }

  return (
    <div style={{ width: 'min(1040px, 100%)', margin: '0 auto', display: 'grid', gridTemplateColumns: 'minmax(0,1fr)', gap: 18 }}>
      <style>{KEYFRAMES}</style>
      <style>{`
        .bp-lobby-grid{ grid-template-columns:minmax(0,1.3fr) minmax(260px,0.7fr); }
        @media (max-width:640px){ .bp-lobby-grid{ grid-template-columns:1fr !important; } }
        @keyframes bp-seatwait{0%,100%{box-shadow:0 0 0 4px rgba(224,165,31,0.08)}50%{box-shadow:0 0 0 5px rgba(224,165,31,0.22)}}
      `}</style>

      {/* Header code + partage */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }} style={{ ...panel, padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <span aria-hidden style={foilEdge} />
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: `radial-gradient(420px 160px at 0% 50%, ${alpha(C.gold, 0.12)}, transparent 70%)` }} />
        <div style={{ position: 'relative' }}>
          <div style={{ ...type.eyebrow, color: C.gold, marginBottom: 8, display: 'inline-flex', alignItems: 'center', gap: 8 }}><span style={{ width: 16, height: 1, background: alpha(C.gold, 0.5) }} />Salle d'embarquement</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ ...type.small, color: C.textMut, textTransform: 'uppercase', letterSpacing: '0.14em' }}>Code</span>
            {/* chaque caractère du code dans sa "tuile" foil, comme un coffre */}
            <span style={{ display: 'inline-flex', gap: 6 }}>
              {String(room.code).split('').map((ch, i) => (
                <motion.span key={i} initial={{ opacity: 0, y: 8, rotateX: -40 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} transition={{ ...SPRING_POP, delay: 0.08 * i }}
                  style={{ display: 'grid', placeItems: 'center', minWidth: 34, height: 44, padding: '0 6px', borderRadius: 10, background: `linear-gradient(165deg, ${alpha(C.gold, 0.18)}, ${alpha(C.goldDeep, 0.1)})`, border: `1px solid ${alpha(C.gold, 0.34)}`, ...type.h2, color: C.parchment, fontFamily: fonts.display, letterSpacing: 0, boxShadow: `inset 0 1px 0 ${alpha(C.goldHot, 0.3)}` }}>{ch}</motion.span>
              ))}
            </span>
          </div>
        </div>
        <Btn variant={copied ? 'sea' : 'ghost'} onClick={onCopy} style={{ position: 'relative' }}>{copied ? '✓ Lien copié' : '🔗 Copier le lien'}</Btn>
      </motion.div>

      {spectator && (
        <div role="status" style={{ ...panel, padding: '14px 18px', borderColor: alpha(C.warn, 0.3), background: alpha(C.warn, 0.08), color: C.parchment }}>
          <strong style={{ color: C.warn }}>Spectateur</strong> — la partie a déjà commencé. Tu pourras jouer à la prochaine.
        </div>
      )}

      <div className="bp-lobby-grid" style={{ display: 'grid', gap: 18, alignItems: 'start' }}>
        {/* Table du capitaine */}
        <div style={{ ...panel, padding: 24, minHeight: 360, position: 'relative' }}>
          <span aria-hidden style={foilEdge} />
          <div style={{ position: 'relative', ...type.eyebrow, color: C.textMut, marginBottom: 12 }}>Équipage · {sortedPlayers.length}</div>
          <div style={{ position: 'relative', height: Math.max(320, Math.min(460, radius * 2 + 90)), margin: '0 auto' }}>
            {/* anneau orbital décoratif derrière la table */}
            <div aria-hidden data-bp-anim style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: radius * 2 + 14, height: radius * 2 + 14, borderRadius: '50%', border: `1px dashed ${alpha(C.gold, 0.18)}`, animation: 'bp-orbit 44s linear infinite', maskImage: 'linear-gradient(#000,transparent)' }} />
            {/* Table centrale (pont) — léger bob */}
            <div data-bp-anim style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: radius * 1.12, height: radius * 1.12, borderRadius: '50%', border: `1px dashed ${C.hair}`, background: `radial-gradient(circle, ${alpha(C.sea, 0.16)}, ${alpha(C.gold, 0.05)} 55%, transparent 72%)`, boxShadow: `inset 0 0 40px ${alpha(C.sea, 0.14)}`, display: 'grid', placeItems: 'center', animation: 'bp-tablebob 5s ease-in-out infinite' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 32, filter: `drop-shadow(0 4px 16px ${alpha(C.gold, 0.4)})` }} data-bp-anim>🏴‍☠️</div>
                <div style={{ ...type.eyebrow, color: C.gold, marginTop: 4 }}>Freydiss Phone</div>
              </div>
            </div>
            {sortedPlayers.map((p, i) => (
              <PlayerSeat key={p.user_id} index={i} player={p} isMe={String(p.user_id) === String(me?.user_id)} angle={(i / Math.max(1, sortedPlayers.length)) * Math.PI * 2 - Math.PI / 2} radius={radius}
                team={teamMode ? (teams[String(p.user_id)] ?? 0) : null}
                canKick={isHost && !p.is_host && String(p.user_id) !== String(me?.user_id)}
                onKick={onKick} />
            ))}
          </div>
        </div>

        {/* Réglages + actions */}
        <div style={{ ...panel, padding: 22, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <span aria-hidden style={foilEdge} />
          <div style={{ position: 'relative' }}>
            <div style={{ ...type.eyebrow, color: C.gold, marginBottom: 10, display: 'inline-flex', alignItems: 'center', gap: 8 }}><span style={{ width: 16, height: 1, background: alpha(C.gold, 0.5) }} />Réglages</div>
            <div style={{ ...type.small, color: C.textMut, marginBottom: 12 }}>
              {players.length} carnets · {players.length} manches · mode {teamMode ? 'équipes ⚔️' : 'classique'}
            </div>
            <div style={{ ...type.statLabel, color: C.textFaint, marginBottom: 8 }}>Rythme des phases</div>
            <div style={{ display: 'grid', gap: 8 }}>
              {DURATION_PRESETS.map((d) => {
                const active = preset === d.id
                return (
                  <button key={d.id} disabled={!isHost} onClick={() => setPreset(d.id)} style={{
                    textAlign: 'left', padding: '10px 14px', borderRadius: 12, cursor: isHost ? 'pointer' : 'default',
                    border: `1px solid ${active ? alpha(C.gold, 0.4) : C.hairSoft}`,
                    background: active ? alpha(C.gold, 0.1) : 'rgba(255,255,255,0.03)',
                    color: C.text, fontFamily: fonts.body, opacity: isHost || active ? 1 : 0.7,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <span style={{ fontWeight: 800, fontSize: 14 }}>{d.label}</span>
                    <span style={{ ...type.small, color: C.textMut }}>✍ {d.writing}s · 🎨 {d.drawing}s</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Mode équipes (2v2 / NvN) */}
          <div>
            <button onClick={() => setTeamMode((m) => !m)} disabled={!isHost} style={{
              width: '100%', textAlign: 'left', padding: '10px 14px', borderRadius: 12, cursor: isHost ? 'pointer' : 'default',
              border: `1px solid ${teamMode ? alpha(C.gold, 0.4) : C.hairSoft}`, background: teamMode ? alpha(C.gold, 0.1) : 'rgba(255,255,255,0.03)',
              color: C.text, fontFamily: fonts.body, display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: isHost || teamMode ? 1 : 0.7,
            }}>
              <span style={{ fontWeight: 800, fontSize: 14 }}>⚔️ Mode équipes</span>
              <span style={{ ...type.small, color: teamMode ? C.ok : C.textMut, fontWeight: 800 }}>{teamMode ? 'ON' : 'OFF'}</span>
            </button>
            {teamMode && isHost && (
              <button onClick={balanceTeams} style={{
                width: '100%', marginTop: 8, padding: '8px 12px', borderRadius: 10, cursor: 'pointer',
                border: `1px solid ${C.hairSoft}`, background: 'rgba(255,255,255,0.04)', color: C.text, fontFamily: fonts.body, ...type.small, fontWeight: 800,
              }}>⚖️ Équilibrer les équipes</button>
            )}
            {teamMode && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
                {[0, 1].map((ti) => (
                  <div key={ti} style={{ borderRadius: 12, padding: '8px 10px', background: alpha(TEAM[ti].color, 0.1), border: `1px solid ${alpha(TEAM[ti].color, 0.35)}` }}>
                    <div style={{ ...type.small, fontWeight: 800, color: TEAM[ti].color, marginBottom: 6 }}>
                      {TEAM[ti].emoji} {TEAM[ti].label} · {sortedPlayers.filter((p) => (teams[String(p.user_id)] ?? 0) === ti).length}
                    </div>
                    {sortedPlayers.filter((p) => (teams[String(p.user_id)] ?? 0) === ti).map((p) => (
                      <button key={p.user_id} disabled={!isHost} onClick={() => flipTeam(String(p.user_id))} title={isHost ? 'Changer d\'équipe' : ''} style={{
                        display: 'block', width: '100%', textAlign: 'left', ...type.small, color: C.text,
                        background: 'transparent', border: 'none', cursor: isHost ? 'pointer' : 'default', padding: '3px 0',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>{p.display_name || 'Invité'}{isHost ? ' ⇄' : ''}</button>
                    ))}
                  </div>
                ))}
              </div>
            )}
            {teamMode && <div style={{ ...type.small, color: C.textFaint, marginTop: 8 }}>Score par équipe au dévoilement (cœurs cumulés).</div>}
          </div>

          {!isHost && me && (
            <Btn variant={me.is_ready ? 'ghost' : 'sea'} full onClick={() => onSetReady(!me.is_ready)}>
              {me.is_ready ? '✓ Prêt — annuler' : 'Je suis prêt'}
            </Btn>
          )}

          {everyoneReady && (
            <motion.div initial={{ opacity: 0, scale: 0.8, y: 6 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={SPRING_POP} style={{ position: 'relative', ...type.small, fontWeight: 800, color: C.ok, textAlign: 'center', padding: '9px 12px', borderRadius: 12, background: `linear-gradient(135deg, ${alpha(C.ok, 0.16)}, ${alpha(C.sea, 0.08)})`, border: `1px solid ${alpha(C.ok, 0.34)}`, boxShadow: `0 8px 24px ${alpha(C.ok, 0.14)}` }}>
              🏴‍☠️ Équipage au complet — larguez les amarres !
            </motion.div>
          )}
          <div style={{ ...type.small, color: everyoneReady ? C.ok : C.textMut, textAlign: 'center', marginBottom: -6 }}>{readyCount}/{sortedPlayers.length} prêts {everyoneReady ? '✓' : ''}</div>

          {isHost ? (
            <>
              <Btn variant="gold" full disabled={players.length < 1 || !teamsValid} onClick={() => onStart(settings())}
                style={everyoneReady && players.length > 1 && teamsValid ? { animation: 'bp-glowpulse 1.6s ease-in-out infinite' } : undefined}>
                Larguer les amarres 🏴‍☠️
              </Btn>
              {teamMode && !teamsValid && (
                <div style={{ ...type.small, color: C.warn, textAlign: 'center' }}>Chaque équipe doit avoir au moins 1 joueur.</div>
              )}
            </>
          ) : (
            <div style={{ ...type.small, color: C.textMut, textAlign: 'center', padding: '8px 0' }}>
              En attente du capitaine…
            </div>
          )}
          {isHost && !everyoneReady && players.length > 1 && (
            <div style={{ ...type.small, color: C.textFaint, textAlign: 'center' }}>
              Tu peux démarrer dès que tu veux.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
