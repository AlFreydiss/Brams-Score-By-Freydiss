// Guess Who — point d'entrée : /guess-who (créer / rejoindre) ou /guess-who/:code (salon).
// Identité Brams (encre chaude + champagne) : voir theme.js et manga.jsx.
import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { C, FONT_BODY, GLOBAL_CSS, Btn, PhaseFrame, Waiting, MangaBackdrop } from './manga.jsx'
import { T, F, LINE, RADIUS, pill } from './theme.js'
import BarreJeu from '../../components/BarreJeu.jsx'
import { createRoom, guestId } from '../../lib/guessWhoRooms.js'
import { useGuessWhoRoom } from './useGuessWhoRoom.js'
import { useReactions } from './Reactions.jsx'
import RoomView from './RoomView.jsx'
import RuleArt from './RuleArt.jsx'

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
    <div style={{ maxWidth: 880, margin: '0 auto', display: 'grid', gap: 22 }}>
      {/* Couverture : le titre en chasse large porte la page, le reste se tait. */}
      <motion.header initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.2, 0.7, 0.2, 1] }}
        style={{ textAlign: 'center', padding: 'clamp(18px,6vw,56px) 0 6px' }}>
        <h1 className="gw-title" style={{
          margin: 0, fontFamily: F.display, fontWeight: 800, lineHeight: 0.88, letterSpacing: '-0.04em',
          color: T.textHi,
        }}><span className="gw-word">Guess</span> <span className="gw-word">Who</span></h1>
        <p style={{ margin: '20px auto 0', maxWidth: 440, fontFamily: F.ui, fontSize: 17, lineHeight: 1.5, color: T.text }}>
          Imite un son d'anime, votez pour la meilleure imitation. Le moins voté perd une vie.
        </p>
        <p style={{ margin: '8px auto 0', fontFamily: F.ui, fontSize: 14, color: T.textMute }}>
          De 3 à 8 joueurs, sur mobile ou PC. Il faut un micro.
        </p>
      </motion.header>

      {last && (
        <button onClick={() => navigate(`/guess-who/${last}`)} className="gw-focus gw-btn" style={{
          ...pill('ghost'), justifySelf: 'center', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
          minHeight: 44, padding: '0 18px', fontFamily: F.ui, fontWeight: 600, fontSize: 15,
        }}>
          ↩ Revenir au salon <span style={{ fontFamily: F.display, fontWeight: 500, letterSpacing: '0.2em', color: T.accentLit }}>{last}</span>
        </button>
      )}

      <PhaseFrame>
        {/* Un tour en trois temps : la numérotation suit vraiment l'ordre du jeu. */}
        <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 'clamp(14px,3vw,28px)', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))' }}>
          {RULES.map(([title, text], i) => (
            <li key={title}>
              <RuleArt rule={title} />
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 15, color: T.accent }}>{i + 1}</span>
                <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 19, letterSpacing: '-0.02em', color: T.textHi }}>{title}</span>
              </div>
              <p style={{ margin: '8px 0 0', fontFamily: F.ui, fontWeight: 400, fontSize: 14.5, lineHeight: 1.5, color: T.textMute }}>{text}</p>
            </li>
          ))}
        </ol>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginTop: 28 }}>
          <Btn onClick={create} disabled={busy || !identity}>{busy ? 'Création…' : 'Créer un salon'}</Btn>
          <span style={{ fontFamily: F.ui, fontWeight: 500, color: T.textFaint }}>ou</span>
          <input className="gw-focus" value={code} onChange={(e) => setCode(cleanCode(e.target.value))}
            onKeyDown={(e) => { if (e.key === 'Enter') join() }}
            placeholder="CODE" aria-label="Code du salon" autoCapitalize="characters" autoComplete="off" spellCheck={false}
            style={{
              width: 140, minHeight: 48, border: LINE, borderRadius: RADIUS.pill, padding: '0 14px', outline: 'none',
              fontFamily: F.display, fontWeight: 700, fontSize: 18, letterSpacing: '0.18em', textAlign: 'center',
              background: T.deep, color: T.textHi, boxSizing: 'border-box',
            }} />
          <Btn variant="ghost" disabled={code.length !== 4} onClick={join}>Rejoindre</Btn>
        </div>
        {err && <p style={{ fontFamily: F.ui, fontWeight: 600, color: T.danger }}>{err}</p>}
        {identity && identity.userId.startsWith('guest_') && (
          <p style={{ margin: '14px 0 0', fontFamily: F.ui, fontWeight: 400, fontSize: 14, color: T.textMute }}>
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
