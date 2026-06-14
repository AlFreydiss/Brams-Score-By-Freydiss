// Brams Phone — point d'entrée de route. Lit :code de l'URL (sinon landing
// créer/rejoindre). Identité via useAuth + guestId. Pilote useGarticRoom et route
// selon room.status vers la phase. Gère loading / erreur / spectateur.
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { type, fonts } from '../../styles/typography.js'
import { C, GRAD, alpha, panel, pageBg, dotGrid, KEYFRAMES } from './theme.js'
import { Btn, Waiting } from './ui.jsx'
import { createRoom, genRoomCode, guestId } from '../../lib/garticRooms.js'
import { useGarticRoom } from './useGarticRoom.js'
import Lobby from './Lobby.jsx'
import WritePhase from './WritePhase.jsx'
import DrawPhase from './DrawPhase.jsx'
import DescribePhase from './DescribePhase.jsx'
import Reveal from './Reveal.jsx'

const Shell = ({ children }) => (
  <div style={{ minHeight: '100vh', background: C.bg, color: C.text, paddingTop: 92, paddingBottom: 56, position: 'relative', overflowX: 'hidden', fontFamily: fonts.body }}>
    <style>{KEYFRAMES}</style>
    <div style={pageBg} />
    <div style={dotGrid} />
    <div style={{ position: 'relative', zIndex: 2, width: 'min(1180px, calc(100% - 28px))', margin: '0 auto' }}>{children}</div>
  </div>
)

function normalize(c) { return (c || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) }

// ── Landing : créer ou rejoindre ──────────────────────────────────────────────
function Landing({ identity, onCreated }) {
  const navigate = useNavigate()
  const [joinCode, setJoinCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const create = async () => {
    setBusy(true); setErr('')
    const res = await createRoom(identity)
    setBusy(false)
    if (res.error) { setErr('Création impossible : ' + res.error); return }
    onCreated?.(res.code)
    navigate(`/brams-phone/${res.code}`)
  }
  const join = () => { const c = normalize(joinCode); if (c.length >= 3) navigate(`/brams-phone/${c}`) }

  return (
    <Shell>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.05fr) minmax(340px,0.78fr)', gap: 36, alignItems: 'center', minHeight: 'min(560px, calc(100vh - 180px))' }}>
        <div style={{ maxWidth: 600 }}>
          <div data-bp-anim style={{ display: 'inline-flex', alignItems: 'center', gap: 9, marginBottom: 20, padding: '7px 14px', borderRadius: 999, ...type.eyebrow, color: C.gold, background: alpha(C.gold, 0.1), border: `1px solid ${alpha(C.gold, 0.26)}` }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.gold, animation: 'bp-pulse 2s ease-in-out infinite' }} />
            Multijoueur · temps réel
          </div>
          <h1 style={{ ...type.hero, color: C.text, margin: '0 0 16px' }}>
            Brams <span style={{ background: GRAD.goldText, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Phone</span>
          </h1>
          <p style={{ ...type.lead, color: C.textMut, margin: '0 0 28px', maxWidth: 520 }}>
            Écris une phrase, fais-la dessiner, devine le dessin… et regarde la chaîne dériver façon Gartic Phone. Entre potes, en direct.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Btn variant="gold" onClick={create} disabled={busy}>{busy ? 'Création…' : 'Créer un salon'}</Btn>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(normalize(e.target.value))}
                onKeyDown={(e) => e.key === 'Enter' && join()}
                placeholder="CODE"
                style={{ width: 130, height: 46, borderRadius: 13, border: `1px solid ${C.hairTop}`, background: 'rgba(255,255,255,0.05)', color: C.text, padding: '0 16px', fontFamily: fonts.display, fontWeight: 800, letterSpacing: '0.18em', fontSize: 17, textAlign: 'center', boxSizing: 'border-box' }}
              />
              <Btn variant="ghost" onClick={join} disabled={normalize(joinCode).length < 3}>Rejoindre</Btn>
            </div>
          </div>
          {err && <p role="alert" style={{ ...type.small, color: C.danger, marginTop: 14 }}>{err}</p>}
          {!identity.userId.startsWith('guest_') ? null : (
            <p style={{ ...type.small, color: C.textFaint, marginTop: 16 }}>
              Tu joues en invité. Connecte-toi (Discord) pour pouvoir uploader tes dessins.
            </p>
          )}
        </div>
        <div data-bp-anim style={{ ...panel, padding: 30, textAlign: 'center', animation: 'bp-float 7s ease-in-out infinite' }}>
          <div style={{ fontSize: 64, marginBottom: 10 }}>🏴‍☠️</div>
          <div style={{ ...type.h2, color: C.parchment, marginBottom: 6 }}>Le téléphone arabe</div>
          <div style={{ ...type.body, color: C.textMut }}>version pirate de Brams</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 18, marginTop: 22, ...type.small, color: C.textMut }}>
            <span>✍ Écris</span><span>🎨 Dessine</span><span>🔍 Devine</span>
          </div>
        </div>
      </div>
    </Shell>
  )
}

export default function BramsPhonePage() {
  const { code: routeCode } = useParams()
  const navigate = useNavigate()
  const auth = useAuth()
  const code = normalize(routeCode)

  // Identité : discordId si connecté, sinon guest stable.
  const identity = useMemo(() => {
    const id = auth.discordId || guestId()
    return { userId: String(id), displayName: auth.displayName || 'Invité', avatarUrl: auth.avatarUrl || null }
  }, [auth.discordId, auth.displayName, auth.avatarUrl])

  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard?.writeText(`${window.location.origin}/brams-phone/${code}`)
    setCopied(true); setTimeout(() => setCopied(false), 1800)
  }

  // Pas de code → landing.
  if (!code) return <Landing identity={identity} />

  return <Room code={code} identity={identity} navigate={navigate} copied={copied} onCopy={copy} />
}

function Room({ code, identity, navigate, copied, onCopy }) {
  const hook = useGarticRoom({ code, ...identity })
  const { room, players, me, n, myTask, remaining, isHost, spectator, error, ready,
    mySubmitted, start, advance, setReady, submit, prevPage, allPages } = hook

  const total = useMemo(() => {
    if (!room?.settings?.phaseDurations || !room.current_phase) return null
    return room.settings.phaseDurations[room.current_phase] || null
  }, [room?.settings, room?.current_phase])

  if (error === 'introuvable') {
    return (
      <Shell>
        <div style={{ ...panel, maxWidth: 440, margin: '60px auto 0', textAlign: 'center', padding: 30 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
          <h2 style={{ ...type.h2, color: C.text, margin: '0 0 8px' }}>Salon introuvable</h2>
          <p style={{ ...type.body, color: C.textMut, margin: '0 0 22px' }}>
            Le code <strong style={{ color: C.gold, letterSpacing: '0.12em' }}>{code}</strong> ne mène à aucun salon.
          </p>
          <Btn variant="gold" onClick={() => navigate('/brams-phone')}>Créer ou rejoindre</Btn>
        </div>
      </Shell>
    )
  }

  if (!ready || !room) {
    return <Shell><div style={{ ...panel, maxWidth: 440, margin: '70px auto 0', padding: 30 }}><Waiting label={`Connexion au salon ${code}…`} /></div></Shell>
  }

  const status = room.status

  return (
    <Shell>
      {/* Topbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <Btn variant="ghost" onClick={() => navigate('/brams-phone')} style={{ minHeight: 40, padding: '0 14px', fontSize: 13 }}>← Quitter</Btn>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: alpha(C.gold, 0.1), border: `1px solid ${alpha(C.gold, 0.28)}`, borderRadius: 11, padding: '8px 14px' }}>
          <span style={{ ...type.small, color: C.textMut }}>CODE</span>
          <strong style={{ ...type.h3, color: C.parchment, letterSpacing: '0.18em' }}>{room.code}</strong>
        </div>
        <div style={{ marginLeft: 'auto', ...type.small, color: C.textMut }}>
          👥 {players.filter((p) => p.connected !== false).length}
          {status !== 'lobby' && status !== 'reveal' && status !== 'finished' && <> · manche {(room.current_round ?? 0) + 1}/{n}</>}
        </div>
      </div>

      {status === 'lobby' && (
        <Lobby room={room} players={players} me={me} isHost={isHost} spectator={spectator}
          onStart={start} onSetReady={setReady} onCopy={onCopy} copied={copied} />
      )}

      {spectator && status !== 'lobby' && status !== 'reveal' && status !== 'finished' && (
        <div style={{ ...panel, maxWidth: 560, margin: '40px auto 0', padding: 28, textAlign: 'center' }}>
          <div style={{ fontSize: 34, marginBottom: 8 }}>🍿</div>
          <h2 style={{ ...type.h2, color: C.text, margin: '0 0 6px' }}>Tu regardes la partie</h2>
          <p style={{ ...type.body, color: C.textMut }}>Tu as rejoint après le départ. Tu joueras à la prochaine — assiste au dévoilement à la fin !</p>
        </div>
      )}

      {!spectator && status === 'writing' && (
        myTask
          ? <WritePhase remaining={remaining} total={total} mySubmitted={mySubmitted} submit={submit} />
          : <div style={{ ...panel, maxWidth: 600, margin: '0 auto', padding: 30 }}><Waiting label="Préparation de la partie…" /></div>
      )}
      {!spectator && status === 'drawing' && myTask && (
        <DrawPhase room={room} remaining={remaining} total={total} mySubmitted={mySubmitted} prevPage={prevPage} submit={submit} />
      )}
      {!spectator && status === 'describing' && myTask && (
        <DescribePhase remaining={remaining} total={total} mySubmitted={mySubmitted} prevPage={prevPage} submit={submit} />
      )}
      {!spectator && (status === 'drawing' || status === 'describing') && !myTask && (
        <div style={{ ...panel, maxWidth: 600, margin: '0 auto', padding: 30 }}><Waiting label="En attente du round suivant…" /></div>
      )}

      {(status === 'reveal' || status === 'finished') && (
        <Reveal room={room} players={players} n={n} isHost={isHost} allPages={allPages}
          onReplay={() => navigate('/brams-phone')} />
      )}
    </Shell>
  )
}
