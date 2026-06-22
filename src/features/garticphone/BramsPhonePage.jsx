// Freydiss Phone — point d'entrée de route. Lit :code de l'URL (sinon landing
// créer/rejoindre). Identité via useAuth + guestId. Pilote useGarticRoom et route
// selon room.status vers la phase. Gère loading / erreur / spectateur.
import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { type, fonts } from '../../styles/typography.js'
import { C, GRAD, alpha, panel, foilEdge, pageBg, dotGrid, grain, KEYFRAMES, SPRING } from './theme.js'
import { Btn, Waiting, LiveRoster } from './ui.jsx'
import { createRoom, genRoomCode, guestId } from '../../lib/garticRooms.js'
import { useGarticRoom } from './useGarticRoom.js'
import { playSound, vibrate, isMuted, toggleMuted } from './sound.js'
import Lobby from './Lobby.jsx'
import WritePhase from './WritePhase.jsx'
import DrawPhase from './DrawPhase.jsx'
import DescribePhase from './DescribePhase.jsx'
import Reveal from './Reveal.jsx'
import BarreJeu from '../../components/BarreJeu.jsx'

const Shell = ({ children }) => (
  <div className="bp-page" style={{ minHeight: '100vh', background: C.bg, color: C.text, paddingTop: 0, paddingBottom: 'max(56px, env(safe-area-inset-bottom))', paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)', position: 'relative', overflowX: 'hidden', fontFamily: fonts.body }}>
    <BarreJeu titre="Freydiss Phone" />
    <style>{KEYFRAMES}</style>
    <style>{`
      .bp-page :focus-visible{ outline:2px solid ${C.gold}; outline-offset:2px; border-radius:10px }
      @media (max-width:760px){
        .bp-landing-grid{ grid-template-columns:1fr !important; gap:24px !important; min-height:0 !important }
        .bp-landing-aside{ display:none !important }
      }
    `}</style>
    <div style={pageBg} />
    <div style={dotGrid} />
    <div style={grain} />
    <div style={{ position: 'relative', zIndex: 2, width: 'min(1180px, calc(100% - 28px))', margin: '0 auto' }}>{children}</div>
  </div>
)

// Bannière "reconnexion" quand le réseau tombe (les actions realtime/RLS échouent hors-ligne).
function OfflineBanner() {
  const [online, setOnline] = useState(typeof navigator === 'undefined' || navigator.onLine !== false)
  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false)
    window.addEventListener('online', on); window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])
  if (online) return null
  return (
    <div role="status" style={{ position: 'fixed', top: 70, left: '50%', transform: 'translateX(-50%)', zIndex: 50,
      display: 'flex', alignItems: 'center', gap: 9, padding: '9px 16px', borderRadius: 999,
      background: alpha(C.warn, 0.16), border: `1px solid ${alpha(C.warn, 0.5)}`, color: C.parchment,
      ...type.small, backdropFilter: 'blur(8px)', boxShadow: '0 10px 30px rgba(0,0,0,0.4)' }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.warn, animation: 'bp-pulse 1.2s ease-in-out infinite' }} />
      Reconnexion…
    </div>
  )
}

function normalize(c) { return (c || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) }

// ── Toast "Lien copié" ────────────────────────────────────────────────────────
// Affiché brièvement quand `copied` passe à true (le timer de reset vit déjà dans
// BramsPhonePage). Flottant, non bloquant (pointer-events:none), accents FR.
function CopiedToast({ show }) {
  if (!show) return null
  return (
    <div aria-hidden style={{ position: 'fixed', left: '50%', bottom: 30, zIndex: 70, pointerEvents: 'none', transform: 'translateX(-50%)' }}>
      <style>{'@keyframes bp-toast-in{0%{opacity:0;transform:translateY(14px) scale(.94)}16%{opacity:1;transform:translateY(0) scale(1)}84%{opacity:1;transform:translateY(0) scale(1)}100%{opacity:0;transform:translateY(-8px) scale(.98)}}'}</style>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '11px 18px', borderRadius: 999,
        background: `linear-gradient(165deg, ${alpha(C.gold, 0.22)}, ${alpha(C.goldDeep, 0.18)})`,
        border: `1px solid ${alpha(C.gold, 0.5)}`, color: C.parchment,
        ...type.small, fontWeight: 800, letterSpacing: '0.01em',
        boxShadow: `0 14px 38px rgba(0,0,0,0.5), 0 0 0 1px ${alpha(C.gold, 0.1)} inset`,
        backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
        animation: 'bp-toast-in 1.8s cubic-bezier(.18,1,.3,1) forwards',
      }}>
        <span style={{ width: 20, height: 20, borderRadius: '50%', display: 'grid', placeItems: 'center', background: C.ok, color: '#06210f', fontSize: 12, fontWeight: 900 }}>✓</span>
        Lien copié
      </div>
    </div>
  )
}

// ── Splash d'intro de phase ───────────────────────────────────────────────────
// Overlay bref (~1.2s, auto-disparait) qui annonce la consigne au changement de
// phase. pointer-events:none → ne bloque jamais l'interaction. prefers-reduced-
// motion respecté via la classe .bp-splash (neutralisée dans KEYFRAMES).
const SPLASH_COPY = {
  writing:    { icon: '✍️', label: 'À toi d’écrire !', c: C.gold },
  drawing:    { icon: '🎨', label: 'Dessine !',        c: C.sea },
  describing: { icon: '🔍', label: 'Devine le dessin !', c: C.goldSoft },
}
function PhaseSplash({ phaseKey }) {
  // phaseKey = "writing:2" → on isole la phase mais garde la clé pour retrigger par round.
  const [shown, setShown] = useState(null)
  const seen = useRef(null)
  useEffect(() => {
    if (!phaseKey || phaseKey === seen.current) return
    seen.current = phaseKey
    const phase = String(phaseKey).split(':')[0]
    const copy = SPLASH_COPY[phase]
    if (!copy) { setShown(null); return }
    setShown({ key: phaseKey, ...copy })
    const t = setTimeout(() => setShown(null), 1250)
    return () => clearTimeout(t)
  }, [phaseKey])
  if (!shown) return null
  return (
    <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 60, pointerEvents: 'none', display: 'grid', placeItems: 'center' }}>
      {/* halo radial coloré derrière l'annonce */}
      <div className="bp-splash" key={shown.key + '-halo'} style={{ position: 'absolute', width: 'min(72vw,640px)', height: 'min(72vw,640px)', borderRadius: '50%', background: `radial-gradient(circle, ${alpha(shown.c, 0.28)}, transparent 66%)`, animation: 'bp-splash 1.25s ease-out forwards', filter: 'blur(8px)' }} />
      <div className="bp-splash" key={shown.key} style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, position: 'relative',
        animation: 'bp-splash 1.25s cubic-bezier(.18,1,.3,1) forwards',
        textShadow: `0 8px 40px ${alpha(C.bgDeep, 0.9)}`,
      }}>
        <div style={{ fontSize: 'clamp(56px,12vw,112px)', lineHeight: 1, filter: `drop-shadow(0 0 34px ${alpha(shown.c, 0.6)})` }}>{shown.icon}</div>
        <div style={{
          fontFamily: fonts.display, fontWeight: 900, letterSpacing: '-0.01em',
          fontSize: 'clamp(2rem,6.5vw,4.4rem)', color: C.text, lineHeight: 1,
          background: `linear-gradient(100deg, ${C.goldHot}, ${shown.c} 60%, ${C.parchment})`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>{shown.label}</div>
      </div>
    </div>
  )
}

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

  const stagger = (i) => ({ initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 }, transition: { ...SPRING, delay: 0.06 * i } })
  return (
    <Shell>
      <div className="bp-landing-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.05fr) minmax(340px,0.78fr)', gap: 36, alignItems: 'center', minHeight: 'min(560px, calc(100vh - 180px))' }}>
        <div style={{ maxWidth: 600 }}>
          <motion.div {...stagger(0)} style={{ display: 'inline-flex', alignItems: 'center', gap: 9, marginBottom: 22, padding: '8px 15px', borderRadius: 999, ...type.eyebrow, color: C.gold, background: `linear-gradient(135deg, ${alpha(C.gold, 0.14)}, ${alpha(C.gold, 0.04)})`, border: `1px solid ${alpha(C.gold, 0.3)}`, boxShadow: `0 8px 22px ${alpha(C.gold, 0.1)}` }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.ok, boxShadow: `0 0 0 3px ${alpha(C.ok, 0.22)}`, animation: 'bp-pulse 2s ease-in-out infinite' }} />
            Multijoueur · temps réel
          </motion.div>
          <motion.h1 {...stagger(1)} style={{ ...type.hero, color: C.text, margin: '0 0 16px', fontWeight: 800 }}>
            Freydiss <span style={{ position: 'relative', background: GRAD.goldText, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: `drop-shadow(0 4px 22px ${alpha(C.gold, 0.4)})` }}>Phone</span>
          </motion.h1>
          <motion.p {...stagger(2)} style={{ ...type.lead, color: C.textMut, margin: '0 0 30px', maxWidth: 520 }}>
            Écris une phrase, fais-la dessiner, devine le dessin… et regarde la chaîne dériver façon Gartic Phone. Entre potes, en direct.
          </motion.p>
          <motion.div {...stagger(3)} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Btn variant="gold" onClick={create} disabled={busy}>{busy ? 'Création…' : '🏴‍☠️ Créer un salon'}</Btn>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(normalize(e.target.value))}
                onKeyDown={(e) => e.key === 'Enter' && join()}
                placeholder="CODE"
                style={{ width: 130, height: 48, borderRadius: 14, border: `1px solid ${C.hairTop}`, background: 'rgba(255,255,255,0.05)', color: C.text, padding: '0 16px', fontFamily: fonts.display, fontWeight: 800, letterSpacing: '0.2em', fontSize: 17, textAlign: 'center', boxSizing: 'border-box' }}
              />
              <Btn variant="ghost" onClick={join} disabled={normalize(joinCode).length < 3}>Rejoindre</Btn>
            </div>
          </motion.div>
          {err && <p role="alert" style={{ ...type.small, color: C.danger, marginTop: 14 }}>{err}</p>}
          {!identity.userId.startsWith('guest_') ? null : (
            <p style={{ ...type.small, color: C.textFaint, marginTop: 16 }}>
              Tu joues en invité. Connecte-toi (Discord) pour pouvoir uploader tes dessins.
            </p>
          )}
        </div>
        <motion.div initial={{ opacity: 0, y: 30, rotate: -1.5 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ ...SPRING, delay: 0.2 }} className="bp-landing-aside" style={{ ...panel, padding: 32, textAlign: 'center', animation: 'bp-float 7s ease-in-out infinite' }}>
          <span aria-hidden style={foilEdge} />
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: `radial-gradient(360px 180px at 50% -10%, ${alpha(C.gold, 0.16)}, transparent 70%)` }} />
          <div style={{ position: 'relative', fontSize: 66, marginBottom: 10, filter: `drop-shadow(0 8px 26px ${alpha(C.gold, 0.4)})` }}>🏴‍☠️</div>
          <div style={{ position: 'relative', ...type.h2, color: C.parchment, marginBottom: 6 }}>Le téléphone arabe</div>
          <div style={{ position: 'relative', ...type.body, color: C.textMut }}>version pirate de Brams</div>
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', gap: 10, marginTop: 24, flexWrap: 'wrap' }}>
            {[['✍️', 'Écris'], ['🎨', 'Dessine'], ['🔍', 'Devine']].map(([ic, lb], i) => (
              <div key={lb} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '10px 14px', borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.hairSoft}` }}>
                <span style={{ fontSize: 22 }}>{ic}</span>
                <span style={{ ...type.small, color: C.textMut, fontWeight: 700 }}>{lb}</span>
              </div>
            ))}
          </div>
        </motion.div>
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
    mySubmitted, submittedSeats, kicked, start, advance, setReady, submit, prevPage, allPages, replay, kick,
    revealStep, sendReaction, sendRevealStep, onReaction } = hook

  // Exclu par l'hôte → on quitte le salon (retour au lobby Freydiss Phone) après un court message.
  useEffect(() => {
    if (!kicked) return
    const t = setTimeout(() => navigate('/brams-phone'), 2600)
    return () => clearTimeout(t)
  }, [kicked, navigate])

  const total = useMemo(() => {
    if (!room?.settings?.phaseDurations || !room.current_phase) return null
    return room.settings.phaseDurations[room.current_phase] || null
  }, [room?.settings, room?.current_phase])

  const status = room?.status
  const connectedCount = players.filter((p) => p.connected !== false).length
  const submittedLabel = `${submittedSeats?.size ?? 0}/${connectedCount} pirates ont envoyé`
  const [muted, setMutedState] = useState(isMuted())
  const onToggleMute = () => setMutedState(toggleMuted())
  // Phase annoncée par le splash (null = montage initial → pas de splash au 1er rendu).
  const [splashPhase, setSplashPhase] = useState(null)

  // Feedback sensoriel : sons + vibrations aux moments clés (hooks AVANT tout return).
  const prevStatusRef = useRef(null)
  useEffect(() => {
    if (!status) return
    const prev = prevStatusRef.current
    prevStatusRef.current = status
    if (prev === null || prev === status) return // pas de son au montage initial
    if (status === 'reveal' || status === 'finished') { playSound('reveal'); vibrate([20, 40, 30]) }
    else { playSound('phase'); if (myTask) vibrate(30) }
    // Splash de phase uniquement pour les 3 phases jouables (pas lobby/reveal).
    if (['writing', 'drawing', 'describing'].includes(status)) setSplashPhase(status + ':' + (room?.current_round ?? 0))
  }, [status, myTask, room?.current_round])

  useEffect(() => { if (mySubmitted) { playSound('submit'); vibrate(20) } }, [mySubmitted])

  const prevCountRef = useRef(0)
  useEffect(() => {
    const c = players.length
    if (status === 'lobby' && c > prevCountRef.current && prevCountRef.current > 0) playSound('join')
    prevCountRef.current = c
  }, [players.length, status])

  const lastTickRef = useRef(-1)
  useEffect(() => {
    if (remaining == null || !['writing', 'drawing', 'describing'].includes(status)) { lastTickRef.current = -1; return }
    const s = Math.ceil(remaining)
    if (s > 0 && s <= 5 && s !== lastTickRef.current) { lastTickRef.current = s; playSound('tick') }
    else if (s <= 0 && lastTickRef.current !== 0) { lastTickRef.current = 0; playSound('phase'); vibrate(40) }
  }, [remaining, status])

  if (kicked) {
    return (
      <Shell>
        <div style={{ ...panel, maxWidth: 440, margin: '60px auto 0', textAlign: 'center', padding: 30 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🚪</div>
          <h2 style={{ ...type.h2, color: C.text, margin: '0 0 8px' }}>Tu as été exclu</h2>
          <p style={{ ...type.body, color: C.textMut, margin: '0 0 22px' }}>Le capitaine t'a retiré du salon.</p>
          <Btn variant="gold" onClick={() => navigate('/brams-phone')}>Retour</Btn>
        </div>
      </Shell>
    )
  }

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

  return (
    <Shell>
      <OfflineBanner />
      <CopiedToast show={copied} />
      <PhaseSplash phaseKey={splashPhase} />
      {/* Urgence : vignette rouge pulsée sur les 5 dernières secondes (tant que je n'ai pas envoyé). */}
      {!spectator && ['writing', 'drawing', 'describing'].includes(status) && !mySubmitted && remaining != null && remaining > 0 && remaining <= 5 && (
        <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 55, pointerEvents: 'none', boxShadow: `inset 0 0 150px 28px ${alpha(C.ember, 0.5)}, inset 0 0 60px 8px ${alpha(C.emberDeep, 0.3)}`, animation: 'bp-pulse .8s ease-in-out infinite' }} />
      )}
      {/* Topbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <Btn variant="ghost" onClick={() => navigate('/brams-phone')} style={{ minHeight: 40, padding: '0 14px', fontSize: 13 }}>← Quitter</Btn>
        <div style={{ position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', gap: 9, background: `linear-gradient(135deg, ${alpha(C.gold, 0.14)}, ${alpha(C.gold, 0.04)})`, border: `1px solid ${alpha(C.gold, 0.32)}`, borderRadius: 12, padding: '8px 15px' }}>
          <span style={{ ...type.eyebrow, color: C.gold, opacity: 0.8 }}>CODE</span>
          <strong style={{ ...type.h3, color: C.parchment, letterSpacing: '0.2em', fontFamily: fonts.display }}>{room.code}</strong>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ ...type.small, color: C.textMut }}>
            👥 {players.filter((p) => p.connected !== false).length}
            {status !== 'lobby' && status !== 'reveal' && status !== 'finished' && <> · manche {(room.current_round ?? 0) + 1}/{n}</>}
          </span>
          <button onClick={onToggleMute} aria-label={muted ? 'Activer le son' : 'Couper le son'} title={muted ? 'Activer le son' : 'Couper le son'}
            style={{ width: 38, height: 38, borderRadius: 10, border: `1px solid ${C.hairSoft}`, background: 'rgba(255,255,255,0.04)', color: C.text, cursor: 'pointer', fontSize: 16, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
            {muted ? '🔇' : '🔊'}
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
      <motion.div key={status}
        initial={{ opacity: 0, y: 24, filter: 'blur(6px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        exit={{ opacity: 0, y: -16, filter: 'blur(6px)' }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
      {status === 'lobby' && (
        <Lobby room={room} players={players} me={me} isHost={isHost} spectator={spectator}
          onStart={start} onSetReady={setReady} onCopy={onCopy} copied={copied} onKick={kick} />
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
          ? <WritePhase remaining={remaining} total={total} mySubmitted={mySubmitted} submit={submit} submittedLabel={submittedLabel} draftKey={me && room ? `bp_d_${room.code}_w_${room.current_round}_${me.seat}` : null} />
          : <div style={{ ...panel, maxWidth: 600, margin: '0 auto', padding: 30 }}><Waiting label="Préparation de la partie…" /></div>
      )}
      {!spectator && status === 'drawing' && myTask && (
        <DrawPhase room={room} remaining={remaining} total={total} mySubmitted={mySubmitted} prevPage={prevPage} submit={submit} submittedLabel={submittedLabel} draftKey={me && room ? `bp_d_${room.code}_d_${room.current_round}_${me.seat}` : null} />
      )}
      {!spectator && status === 'describing' && myTask && (
        <DescribePhase remaining={remaining} total={total} mySubmitted={mySubmitted} prevPage={prevPage} submit={submit} submittedLabel={submittedLabel} draftKey={me && room ? `bp_d_${room.code}_s_${room.current_round}_${me.seat}` : null} />
      )}
      {!spectator && (status === 'drawing' || status === 'describing') && !myTask && (
        <div style={{ ...panel, maxWidth: 600, margin: '0 auto', padding: 30 }}><Waiting label="En attente du round suivant…" /></div>
      )}

      {/* Roster live : qui a déjà envoyé / qui on attend (toutes phases jouables, joueurs ET spectateurs). */}
      {['writing', 'drawing', 'describing'].includes(status) && (
        <LiveRoster players={players} submittedSeats={submittedSeats} meUserId={me?.user_id} />
      )}

      {(status === 'reveal' || status === 'finished') && (
        <Reveal room={room} players={players} n={n} isHost={isHost} allPages={allPages} userId={identity.userId}
          revealStep={revealStep} sendRevealStep={sendRevealStep} sendReaction={sendReaction} onReaction={onReaction}
          onReplay={async () => { const ok = await replay(); if (!ok) navigate('/brams-phone') }} />
      )}
      </motion.div>
      </AnimatePresence>
    </Shell>
  )
}
