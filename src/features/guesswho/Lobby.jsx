// Guess Who — salle d'attente : code géant à partager (copier, partager, QR),
// joueurs qui débarquent, réglages et lancement (hôte, 3 min.).
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { C, FONT_BODY, FONT_DISPLAY, SPRING_POP, type, Btn, PhaseFrame, PlayerChip } from './manga.jsx'
import MicSetup from './MicSetup.jsx'
import { SoundToggle } from './fx.jsx'
import { play, vibrate } from './sfx.js'

const MAX_PLAYERS = 8
const MIN_PLAYERS = 3

const SETTINGS_KEY = 'gw_settings'
const DEFAULTS = { lives: 2, speed: 'normal', sounds: 'all' }
const OPTIONS = [
  ['lives', 'Vies', [[1, '1'], [2, '2'], [3, '3']]],
  ['speed', 'Chrono', [['normal', 'Normal'], ['fast', 'Rapide']]],
  ['sounds', 'Sons', [['all', 'Tous'], ['fr', 'VF'], ['ja', 'VO'], ['bankai', 'Bankai only']]],
]
function loadSettings() {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') } } catch { return DEFAULTS }
}

// Réglages de partie (hôte) : boutons segmentés encrés.
function Settings({ value, onChange }) {
  return (
    <div style={{ display: 'grid', gap: 10, marginTop: 18, border: `3px solid ${C.ink}`, padding: 14, background: C.yellow }}>
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 18, color: C.ink }}>Règles de la partie</div>
      {OPTIONS.map(([key, label, opts]) => (
        <div key={key} role="radiogroup" aria-label={label} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: FONT_BODY, fontWeight: 800, width: 64, color: C.ink }}>{label}</span>
          {opts.map(([v, text]) => {
            const on = value[key] === v
            return (
              <button key={String(v)} type="button" role="radio" aria-checked={on} className="gw-btn"
                onClick={() => onChange({ ...value, [key]: v })}
                style={{ minHeight: 44, padding: '0 14px', cursor: 'pointer', fontFamily: FONT_DISPLAY, fontSize: 14,
                  border: `3px solid ${C.ink}`, background: on ? C.ink : C.paper, color: on ? C.yellow : C.ink }}>{text}</button>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// Copie avec repli (vieux Safari / contexte non sécurisé).
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true } catch { /* repli */ }
  try {
    const ta = document.createElement('textarea')
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0'
    document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove()
    return true
  } catch { return false }
}

// Code du salon en tuiles géantes, chacune légèrement de travers ; un tap copie le lien.
function BigCode({ code, onCopy }) {
  return (
    <button type="button" className="gw-btn" onClick={onCopy} aria-label={`Code du salon ${code.split('').join(' ')}, appuie pour copier le lien`}
      style={{ display: 'flex', gap: 'clamp(6px,2vw,12px)', justifyContent: 'center', background: 'none', border: 0, padding: 0, cursor: 'pointer' }}>
      {code.split('').map((ch, i) => (
        <motion.span key={i} initial={{ y: -24, opacity: 0, rotate: 0 }} animate={{ y: 0, opacity: 1, rotate: i % 2 ? 4 : -4 }}
          transition={{ ...SPRING_POP, delay: 0.1 + i * 0.07 }}
          style={{
            width: 'clamp(58px, 17vw, 86px)', height: 'clamp(70px, 20vw, 100px)', display: 'grid', placeItems: 'center',
            background: i % 2 ? C.paper : C.yellow, border: `4px solid ${C.ink}`, boxShadow: `5px 5px 0 ${C.ink}`,
            fontFamily: FONT_DISPLAY, fontSize: 'clamp(2.4rem, 11vw, 3.8rem)', color: C.ink, lineHeight: 1,
          }}>{ch}</motion.span>
      ))}
    </button>
  )
}

// Place vide : silhouette en pointillés qui attend un joueur.
function EmptySeat() {
  return (
    <div aria-hidden style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: 92, opacity: 0.5 }}>
      <span style={{
        width: 56, height: 56, borderRadius: '50%', border: `3px dashed ${C.ink}`, display: 'grid', placeItems: 'center',
        fontFamily: FONT_DISPLAY, fontSize: 22, color: C.ink, boxSizing: 'border-box',
      }}>?</span>
      <span style={{ fontWeight: 800, fontSize: 13, fontFamily: FONT_BODY, color: C.textMut }}>Libre</span>
    </div>
  )
}

export default function Lobby({ code, g }) {
  const reduce = useReducedMotion()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  const [copied, setCopied] = useState(false)
  const [qr, setQr] = useState(false)
  const [settings, setSettings] = useState(loadSettings)
  const changeSettings = (next) => {
    setSettings(next)
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(next)) } catch { /* stockage indisponible */ }
  }
  const link = `${location.origin}/guess-who/${code}`
  const n = g.players.length
  const enough = n >= MIN_PLAYERS
  // Petit « pop » quand quelqu'un arrive (pas au premier rendu).
  const prevN = useRef(n)
  useEffect(() => {
    if (n > prevN.current) { play('pop'); vibrate(15) }
    prevN.current = n
  }, [n])
  const copy = async () => {
    if (await copyText(link)) { setCopied(true); play('select'); setTimeout(() => setCopied(false), 1800) }
  }
  const share = async () => {
    try { await navigator.share({ title: 'Guess Who', text: `Viens imiter des sons d'anime ! Salon ${code}`, url: link }) } catch { /* annulé */ }
  }
  const start = async () => {
    setBusy(true); setMsg(null)
    const r = await g.act.start(settings)
    if (r?.error) setMsg(r.error === 'not_enough_players' ? 'Il faut au moins 3 joueurs.' : 'Lancement impossible, réessaie.')
    setBusy(false)
  }
  const canShare = typeof navigator !== 'undefined' && !!navigator.share
  // places vides affichées : de quoi atteindre le minimum, puis une seule invitation
  const seats = n >= MAX_PLAYERS ? 0 : Math.max(MIN_PLAYERS - n, 1)
  return (
    <PhaseFrame eyebrow="Guess Who · Salle d'attente" prompt="Invite ta bande">
      <div style={{ display: 'grid', justifyItems: 'center', gap: 14, marginBottom: 20 }}>
        <div style={{ fontFamily: FONT_BODY, fontWeight: 800, fontSize: 14, color: C.textMut }}>Code du salon · appuie pour copier</div>
        <BigCode code={code} onCopy={copy} />
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Btn variant={copied ? 'sea' : 'ghost'} onClick={copy}>{copied ? '✓ Lien copié !' : '🔗 Copier le lien'}</Btn>
          {canShare && <Btn variant="ghost" onClick={share}>📤 Partager</Btn>}
          <Btn variant="ghost" onClick={() => setQr((v) => !v)} aria-expanded={qr}>{qr ? 'Masquer le QR' : '📱 QR code'}</Btn>
          <SoundToggle style={{ width: 50, height: 50, border: `3px solid ${C.ink}`, boxShadow: `4px 4px 0 ${C.ink}`, borderRadius: 6 }} />
        </div>
        <AnimatePresence>
          {qr && (
            <motion.div initial={{ scale: 0.7, opacity: 0, rotate: -4 }} animate={{ scale: 1, opacity: 1, rotate: -1 }} exit={{ scale: 0.7, opacity: 0 }}
              transition={SPRING_POP}
              style={{ padding: 10, background: C.paper, border: `3px solid ${C.ink}`, boxShadow: `5px 5px 0 ${C.ink}`, textAlign: 'center' }}>
              <img alt={`QR code du salon ${code}`} width={200} height={200} style={{ display: 'block', width: 200, height: 200 }}
                src={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=0&data=${encodeURIComponent(link)}`} />
              <div style={{ ...type.small, marginTop: 6, color: C.ink }}>Scanne avec ton téléphone</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', borderTop: `3px dashed ${C.ink}`, paddingTop: 14, marginBottom: 12 }}>
        <span style={{ fontFamily: FONT_DISPLAY, fontSize: 18, color: C.ink }}>Joueurs</span>
        <span style={{ fontFamily: FONT_BODY, fontWeight: 800, fontSize: 14, color: enough ? C.ok : C.textMut }}>
          {n}/{MAX_PLAYERS} {enough ? '· prêt à lancer ✓' : `· ${MIN_PLAYERS} minimum`}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        <AnimatePresence initial={false}>
          {g.players.map((p) => (
            <motion.div key={p.user_id} layout={!reduce}
              initial={reduce ? { opacity: 0 } : { scale: 0, rotate: -25, y: -20 }} animate={{ scale: 1, rotate: 0, y: 0, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }} transition={{ type: 'spring', stiffness: 520, damping: 14 }}>
              <PlayerChip player={p} host={p.is_host} me={p.user_id === g.me?.user_id} />
            </motion.div>
          ))}
        </AnimatePresence>
        {Array.from({ length: seats }, (_, i) => <EmptySeat key={`e${i}`} />)}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 18 }}>
        {g.isHost
        ? <Btn onClick={start} disabled={!enough || busy} style={{ flex: '1 1 260px', minHeight: 60, fontSize: 19 }}>
            {busy ? 'Lancement…' : enough ? `▶ Lancer la partie (${n})` : `Encore ${MIN_PLAYERS - n} joueur${MIN_PLAYERS - n > 1 ? 's' : ''} pour lancer`}
          </Btn>
        : <span className="gw-anim" style={{ ...type.body, fontWeight: 800, color: C.ink, animation: 'gw-blink 1.6s ease-in-out infinite' }}>
            {enough ? "L'hôte va lancer la partie…" : `En attente de joueurs (${n}/${MIN_PLAYERS} min.)…`}
          </span>}
      </div>

      <p style={{ ...type.body, color: C.textMut, margin: '18px 0 0', textAlign: 'center' }}>
        ✍️ Chacun écrit un gage · 🎧 on écoute un son d'anime · 🎙️ on l'imite · 🗳️ on vote.<br />
        Le moins voté perd une vie ; à 0, gage tiré au sort !
      </p>
      {g.isHost && <Settings value={settings} onChange={changeSettings} />}
      {/* Avant de jouer : choisir et tester son micro (le défaut est souvent le mauvais). */}
      {g.me && <div style={{ marginTop: 18 }}><MicSetup /></div>}
      {msg && <p role="alert" style={{ ...type.body, color: C.danger }}>{msg}</p>}
    </PhaseFrame>
  )
}
