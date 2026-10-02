// Guess Who — point d'entrée : /guess-who (créer / rejoindre) ou /guess-who/:code (salon).
// Identité « planche de manga » : voir manga.jsx.
import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { C, FONT_BODY, FONT_DISPLAY, GLOBAL_CSS, Btn, PhaseFrame, Waiting, MangaBackdrop } from './manga.jsx'
import BarreJeu from '../../components/BarreJeu.jsx'
import { createRoom, guestId } from '../../lib/guessWhoRooms.js'
import { useGuessWhoRoom } from './useGuessWhoRoom.js'
import { useReactions } from './Reactions.jsx'
import RoomView from './RoomView.jsx'

// null tant que l'auth n'est pas connue : sinon on rejoindrait d'abord en
// invité puis, la session arrivée, une 2e fois avec l'id Discord (place fantôme).
// Filet : au bout de 6 s on joue en invité plutôt que d'attendre pour toujours.
function useIdentity() {
  const auth = useAuth()
  const [gaveUp, setGaveUp] = useState(false)
  useEffect(() => {
    if (!auth.loading) return
    const t = setTimeout(() => setGaveUp(true), 6000)
    return () => clearTimeout(t)
  }, [auth.loading])
  const ready = !auth.loading || gaveUp
  return useMemo(() => ready ? ({
    userId: String(auth.discordId || guestId()),
    displayName: auth.displayName || 'Invité',
    avatarUrl: auth.avatarUrl || null,
  }) : null, [ready, auth.discordId, auth.displayName, auth.avatarUrl])
}

const RULES = [
  ['Imite', "Un cri de technique ou un bout d'opening passe : reproduis-le au micro."],
  ['Vote', 'On réécoute tout le monde et on vote pour la meilleure imitation.'],
  ['Survis', 'Le moins voté perd une vie. À 0, tu fais le gage tiré au sort.'],
]

// Ce qu'on veut savoir avant de lancer : combien, avec quoi, combien de temps.
const FACTS = [
  ['👥', '3 à 8 joueurs'],
  ['🎙️', 'Micro requis'],
  ['📱', 'Mobile ou PC'],
  ['🎌', "Sons d'anime"],
]

// Dernier salon rejoint : un onglet tué par le téléphone (appel, appareil
// photo…) ramenait sur l'accueil sans le code. 3 h après, il est sûrement fini.
const LAST_ROOM_KEY = 'gw_last_room'
const LAST_ROOM_TTL = 3 * 3600 * 1000
function rememberRoom(code) {
  try { localStorage.setItem(LAST_ROOM_KEY, JSON.stringify({ code, at: Date.now() })) } catch {}
}
function forgetRoom() {
  try { localStorage.removeItem(LAST_ROOM_KEY) } catch {}
}
function lastRoom() {
  try {
    const r = JSON.parse(localStorage.getItem(LAST_ROOM_KEY) || 'null')
    return r?.code && Date.now() - r.at < LAST_ROOM_TTL ? r.code : null
  } catch { return null }
}

const cleanCode = (s) => s.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4)

function Home({ identity }) {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [last] = useState(lastRoom)
  const join = () => { if (code.length === 4) navigate(`/guess-who/${code}`) }
  const create = async () => {
    if (!identity) return
    setBusy(true); setErr(null)
    const r = await createRoom(identity)
    setBusy(false)
    if (r.error) setErr("Le salon n'a pas pu être créé. Vérifie ta connexion et réessaie.")
    else navigate(`/guess-who/${r.code}`)
  }
  return (
    <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gap: 26 }}>
      {/* Couverture : le titre EST l'image. */}
      <motion.h1
        initial={{ scale: 0.6, rotate: -8, opacity: 0 }}
        animate={{ scale: 1, rotate: -3, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 420, damping: 14 }}
        style={{
          margin: '10px 0 0', textAlign: 'center', fontFamily: FONT_DISPLAY, fontWeight: 400, lineHeight: 0.92,
          fontSize: 'clamp(3.6rem, 13vw, 8.5rem)', color: C.yellow, WebkitTextStroke: `4px ${C.ink}`,
          paintOrder: 'stroke fill', textShadow: `7px 7px 0 ${C.ink}`, letterSpacing: '-0.01em',
        }}>
        Guess<br />Who<span style={{ color: C.red }}>!</span>
      </motion.h1>

      {last && (
        <button onClick={() => navigate(`/guess-who/${last}`)} className="gw-focus" style={{
          justifySelf: 'center', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
          padding: '10px 18px', border: `3px solid ${C.ink}`, background: C.yellow, color: C.ink,
          boxShadow: `4px 4px 0 ${C.ink}`, transform: 'rotate(-1deg)', fontFamily: FONT_BODY, fontWeight: 800, fontSize: 16,
        }}>
          ↩ Revenir au salon <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 400, letterSpacing: '0.14em' }}>{last}</span>
        </button>
      )}

      <PhaseFrame tilt={0.5}>
        <ul aria-label="En bref" style={{ listStyle: 'none', margin: '0 0 16px', padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(150px, 45%), max-content))', gap: 8 }}>
          {FACTS.map(([icon, label]) => (
            <li key={label} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', border: `2px solid ${C.ink}`,
              background: C.paper, fontFamily: FONT_BODY, fontWeight: 800, fontSize: 'clamp(12.5px, 3.4vw, 14px)', lineHeight: 1.2, color: C.ink,
            }}><span aria-hidden>{icon}</span>{label}</li>
          ))}
        </ul>
        <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          {RULES.map(([title, text], i) => (
            <li key={title} style={{ border: `3px solid ${C.ink}`, padding: '12px 14px', background: i === 2 ? C.yellow : C.paper }}>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, color: C.ink }}>{i + 1}. {title}</div>
              <p style={{ margin: '6px 0 0', fontFamily: FONT_BODY, fontWeight: 500, fontSize: 15, lineHeight: 1.45, color: C.ink }}>{text}</p>
            </li>
          ))}
        </ol>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginTop: 22 }}>
          <Btn onClick={create} disabled={busy || !identity}>{busy ? 'Création…' : 'Créer un salon'}</Btn>
          <span style={{ fontFamily: FONT_BODY, fontWeight: 800, color: C.textMut }}>ou</span>
          <input className="gw-focus" value={code} onChange={(e) => setCode(cleanCode(e.target.value))}
            onKeyDown={(e) => { if (e.key === 'Enter') join() }}
            placeholder="CODE" aria-label="Code du salon" autoCapitalize="characters" autoComplete="off" spellCheck={false}
            style={{
              width: 130, minHeight: 50, border: `3px solid ${C.ink}`, borderRadius: 6, padding: '0 12px',
              fontFamily: FONT_DISPLAY, fontSize: 22, letterSpacing: '0.18em', textAlign: 'center',
              background: C.paper, color: C.ink, boxSizing: 'border-box',
            }} />
          <Btn variant="ghost" disabled={code.length !== 4} onClick={join}>Rejoindre</Btn>
        </div>
        {err && <p style={{ fontFamily: FONT_BODY, fontWeight: 700, color: C.red }}>{err}</p>}
        {identity && identity.userId.startsWith('guest_') && (
          <p style={{ margin: '14px 0 0', fontFamily: FONT_BODY, fontWeight: 600, fontSize: 14, color: C.textMut }}>
            Pas besoin de compte : tu joues en invité. Connecte-toi avec Discord pour garder ton pseudo et ton avatar.
          </p>
        )}
      </PhaseFrame>
    </div>
  )
}

function Room({ code, identity }) {
  if (!identity) return <Waiting label="Connexion…" />
  return <RoomInner code={code} identity={identity} />
}

function RoomInner({ code, identity }) {
  const g = useGuessWhoRoom({ code, identity })
  const reactions = useReactions(code, g.status === 'ready')
  const navigate = useNavigate()
  useEffect(() => {
    if (g.status === 'ready') rememberRoom(code)
    else if (g.status === 'error') forgetRoom()
  }, [g.status, code])
  if (g.status === 'joining') {
    return <Waiting label={g.error ? 'Réseau lent… nouvelle tentative de connexion au salon' : 'Connexion au salon…'} />
  }
  if (g.status === 'error') {
    return (
      <PhaseFrame prompt="Salon introuvable">
        <p style={{ fontFamily: FONT_BODY, color: C.textMut }}>Aucun salon avec le code {code}. Vérifie le code ou crée un nouveau salon.</p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 16 }}>
          <Btn onClick={() => navigate('/guess-who')}>Retour à l'accueil du jeu</Btn>
        </div>
      </PhaseFrame>
    )
  }
  return <RoomView g={g} code={code} reactions={reactions} />
}

export default function GuessWhoPage() {
  const { code } = useParams()
  const identity = useIdentity()
  return (
    <div style={{ position: 'relative', minHeight: '100dvh', padding: 'clamp(12px,3vw,32px)', fontFamily: FONT_BODY }}>
      <style>{GLOBAL_CSS}</style>
      <MangaBackdrop />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <BarreJeu titre="Guess Who" skin="brams" />
      </div>
      <div style={{ position: 'relative', zIndex: 1, marginTop: 22, paddingBottom: 120 }}>
        {code ? <Room code={code.toUpperCase()} identity={identity} /> : <Home identity={identity} />}
      </div>
    </div>
  )
}
