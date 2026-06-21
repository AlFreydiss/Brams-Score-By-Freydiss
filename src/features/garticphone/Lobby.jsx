// Freydiss Phone — salle d'attente (pont du navire). Code partageable, joueurs autour
// d'une table de capitaine, réglages hôte, bouton Démarrer. Join tardif = spectateur.
import { useMemo, useState } from 'react'
import { type, fonts } from '../../styles/typography.js'
import { C, GRAD, alpha, panel, KEYFRAMES } from './theme.js'
import { Btn } from './ui.jsx'

const DURATION_PRESETS = [
  { id: 'chill', label: 'Tranquille', writing: 80, drawing: 150, describing: 60 },
  { id: 'normal', label: 'Normal', writing: 50, drawing: 90, describing: 40 },
  { id: 'rush', label: 'Rush', writing: 30, drawing: 50, describing: 25 },
]

function PlayerSeat({ player, isMe, angle, radius, index }) {
  const x = Math.cos(angle) * radius
  const y = Math.sin(angle) * radius
  const name = player.display_name || 'Invité'
  const avatar = player.avatar_url || `https://api.dicebear.com/8.x/thumbs/svg?seed=${encodeURIComponent(name)}`
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
          border: `2px solid ${isMe ? C.gold : player.is_ready ? C.ok : C.hairTop}`,
          boxShadow: player.is_ready ? `0 0 0 4px ${alpha(C.ok, 0.16)}` : isMe ? `0 0 0 4px ${alpha(C.gold, 0.16)}` : 'none',
          background: C.surfaceFlat, transition: 'border-color .2s, box-shadow .2s',
          animation: !player.is_ready && !player.is_host && !isMe ? 'bp-seatwait 2s ease-in-out infinite' : 'none',
        }} />
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

export default function Lobby({ room, players, me, isHost, spectator, onStart, onSetReady, onCopy, copied }) {
  const [preset, setPreset] = useState('normal')
  const connected = useMemo(() => players.filter((p) => p.connected !== false), [players])
  const radius = Math.min(150, 90 + connected.length * 6)
  const sortedPlayers = connected
  const everyoneReady = sortedPlayers.length > 0 && sortedPlayers.every((p) => p.is_ready || p.is_host)
  const readyCount = sortedPlayers.filter((p) => p.is_ready || p.is_host).length

  const settings = () => {
    const d = DURATION_PRESETS.find((x) => x.id === preset) || DURATION_PRESETS[1]
    // n = nombre de sièges, figé au start (base stable de la rotation des carnets côté client/serveur).
    return { mode: 'classique', n: players.length, rounds: players.length, phaseDurations: { writing: d.writing, drawing: d.drawing, describing: d.describing } }
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
      <div style={{ ...panel, padding: '18px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ ...type.eyebrow, color: C.gold, marginBottom: 6 }}>Salle d'embarquement</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span style={{ ...type.body, color: C.textMut }}>Code</span>
            <span style={{ ...type.h1, color: C.parchment, letterSpacing: '0.22em', fontFamily: fonts.display }}>{room.code}</span>
          </div>
        </div>
        <Btn variant="ghost" onClick={onCopy}>{copied ? '✓ Lien copié' : 'Copier le lien'}</Btn>
      </div>

      {spectator && (
        <div role="status" style={{ ...panel, padding: '14px 18px', borderColor: alpha(C.warn, 0.3), background: alpha(C.warn, 0.08), color: C.parchment }}>
          <strong style={{ color: C.warn }}>Spectateur</strong> — la partie a déjà commencé. Tu pourras jouer à la prochaine.
        </div>
      )}

      <div className="bp-lobby-grid" style={{ display: 'grid', gap: 18, alignItems: 'start' }}>
        {/* Table du capitaine */}
        <div style={{ ...panel, padding: 24, minHeight: 360, position: 'relative' }}>
          <div style={{ ...type.eyebrow, color: C.textMut, marginBottom: 12 }}>Équipage · {sortedPlayers.length}</div>
          <div style={{ position: 'relative', height: Math.max(320, Math.min(460, radius * 2 + 90)), margin: '0 auto' }}>
            {/* Table centrale (pont) */}
            <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: radius * 1.1, height: radius * 1.1, borderRadius: '50%', border: `1px dashed ${C.hair}`, background: `radial-gradient(circle, ${alpha(C.sea, 0.12)}, transparent 70%)`, display: 'grid', placeItems: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 30 }} data-bp-anim>🏴‍☠️</div>
                <div style={{ ...type.eyebrow, color: C.gold, marginTop: 4 }}>Freydiss Phone</div>
              </div>
            </div>
            {sortedPlayers.map((p, i) => (
              <PlayerSeat key={p.user_id} index={i} player={p} isMe={String(p.user_id) === String(me?.user_id)} angle={(i / Math.max(1, sortedPlayers.length)) * Math.PI * 2 - Math.PI / 2} radius={radius} />
            ))}
          </div>
        </div>

        {/* Réglages + actions */}
        <div style={{ ...panel, padding: 22, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <div style={{ ...type.eyebrow, color: C.gold, marginBottom: 10 }}>Réglages</div>
            <div style={{ ...type.small, color: C.textMut, marginBottom: 12 }}>
              {players.length} carnets · {players.length} manches · mode classique
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

          {!isHost && me && (
            <Btn variant={me.is_ready ? 'ghost' : 'sea'} full onClick={() => onSetReady(!me.is_ready)}>
              {me.is_ready ? '✓ Prêt — annuler' : 'Je suis prêt'}
            </Btn>
          )}

          <div style={{ ...type.small, color: everyoneReady ? C.ok : C.textMut, textAlign: 'center', marginBottom: -6 }}>{readyCount}/{sortedPlayers.length} prêts {everyoneReady ? '✓' : ''}</div>

          {isHost ? (
            <Btn variant="gold" full disabled={players.length < 1} onClick={() => onStart(settings())}
              style={everyoneReady && players.length > 1 ? { animation: 'bp-glowpulse 1.6s ease-in-out infinite' } : undefined}>
              Larguer les amarres 🏴‍☠️
            </Btn>
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
