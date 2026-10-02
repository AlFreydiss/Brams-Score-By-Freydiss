// Guess Who — salle d'attente : code gravé à partager (copier, partager, QR),
// joueurs qui débarquent, réglages et lancement (hôte, 3 min.).
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { C, type, Btn, PhaseFrame, PlayerChip } from './manga.jsx'
import { T, F, LINE, RADIUS, plate, pill, label } from './theme.js'
import MicSetup from './MicSetup.jsx'
import { SoundToggle } from './fx.jsx'
import { play, vibrate } from './sfx.js'
import { inAppBrowser, openInBrowserHint } from './logic/recordFlow.js'
import { startErrorText } from './logic/startError.js'
import { logEvent } from '../../lib/guessWhoLog.js'

const MAX_PLAYERS = 8
const MIN_PLAYERS = 3

const SETTINGS_KEY = 'gw_settings'
const DEFAULTS = { lives: 2, speed: 'normal', sounds: 'all', rounds: 0 }
// Anciens réglages (base sans la migration 20261002b).
const LEGACY = [
  ['lives', 'Vies', [[1, '1'], [2, '2'], [3, '3']]],
  ['speed', 'Chrono', [['normal', 'Normal'], ['fast', 'Rapide']]],
  ['sounds', 'Sons', [['all', 'Tous'], ['fr', 'VF'], ['ja', 'VO'], ['bankai', 'Bankai only']]],
]
// Réglages complets (migration 20261002b) : vies 1-5, chrono lent, types de sons, tours max.
const FULL = [
  ['lives', 'Vies', [1, 2, 3, 4, 5].map((n) => [n, String(n)])],
  ['speed', 'Chrono', [['slow', 'Lent'], ['normal', 'Normal'], ['fast', 'Rapide']]],
  ['sounds', 'Sons', [['all', 'Tous'], ['fr', 'VF'], ['ja', 'VO'], ['technique', 'Techniques'], ['opening', 'Openings'], ['meme', 'Mèmes'], ['bankai', 'Bankai']]],
  ['rounds', 'Tours', [[0, '∞'], [5, '5'], [10, '10'], [15, '15'], [20, '20']]],
]
function loadSettings() {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') } } catch { return DEFAULTS }
}
// Réglages envoyés : seulement ce que la base comprend (sinon valeur par défaut).
function cleanSettings(value, options) {
  const out = {}
  for (const [key, , opts] of options) out[key] = opts.some(([v]) => v === value[key]) ? value[key] : DEFAULTS[key]
  return out
}

// Réglages de partie (hôte) : contrôles segmentés sobres, qui passent à la ligne sur mobile.
function Settings({ value, onChange, options }) {
  return (
    <div style={{ display: 'grid', gap: 14, marginTop: 18, border: LINE, borderRadius: RADIUS.md, padding: 16, background: T.deep }}>
      <div style={{ fontFamily: F.display, fontWeight: 500, fontSize: 18, color: T.textHi }}>Règles de la partie</div>
      {options.map(([key, text, opts]) => (
        <div key={key} role="radiogroup" aria-label={text} style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {/* libellé sur sa propre ligne : les boutons gardent toute la largeur sur mobile */}
          <span style={label({ flex: '1 0 100%' })}>{text}</span>
          {opts.map(([v, t]) => {
            const on = value[key] === v
            return (
              <button key={String(v)} type="button" role="radio" aria-checked={on} className="gw-btn"
                onClick={() => onChange({ ...value, [key]: v })}
                style={{ ...pill(on ? 'primary' : 'ghost'), minHeight: 44, minWidth: 44, padding: '0 14px', cursor: 'pointer',
                  fontFamily: F.ui, fontWeight: on ? 700 : 500, fontSize: 14, color: on ? T.onAccent : T.text }}>{t}</button>
            )
          })}
        </div>
      ))}
      {options === FULL && (
        <div style={{ ...type.small, fontWeight: 500, color: T.textMute }}>
          {value.rounds ? `Au tour ${value.rounds}, s'il n'y a pas d'éliminé, le joueur avec le moins de vies prend le gage.` : 'Tours illimités : on joue jusqu\'au premier éliminé.'}
        </div>
      )}
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

// Code du salon en grand, gravé ; un tap copie le lien.
function BigCode({ code, onCopy }) {
  return (
    <button type="button" className="gw-btn" onClick={onCopy} aria-label={`Code du salon ${code.split('').join(' ')}, appuie pour copier le lien`}
      style={{ ...plate({ borderRadius: RADIUS.lg }), display: 'flex', gap: 'clamp(10px,3vw,22px)', justifyContent: 'center', padding: 'clamp(14px,3vw,22px) clamp(22px,6vw,40px)', cursor: 'pointer' }}>
      {code.split('').map((ch, i) => (
        <motion.span key={i} initial={{ y: 6, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.05 + i * 0.06 }}
          style={{ fontFamily: F.display, fontWeight: 500, fontSize: 'clamp(2.6rem, 11vw, 4rem)', color: T.textHi, lineHeight: 1 }}>{ch}</motion.span>
      ))}
    </button>
  )
}

// Place vide : cercle pointillé qui attend un joueur.
function EmptySeat() {
  return (
    <div aria-hidden style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: 90, opacity: 0.6 }}>
      <span style={{
        width: 54, height: 54, borderRadius: '50%', border: `1px dashed ${T.textFaint}`, display: 'grid', placeItems: 'center',
        fontFamily: F.display, fontSize: 18, color: T.textFaint, boxSizing: 'border-box',
      }}>+</span>
      <span style={{ fontWeight: 500, fontSize: 13, fontFamily: F.ui, color: T.textFaint }}>Libre</span>
    </div>
  )
}

export default function Lobby({ code, g }) {
  const reduce = useReducedMotion()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  const [copied, setCopied] = useState(false)
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  const [inAppHidden, setInAppHidden] = useState(() => {
    try { return sessionStorage.getItem('gw_inapp_hidden') === '1' } catch { return false }
  })
  const showInApp = inAppBrowser(ua) && !inAppHidden
  const hideInApp = () => {
    setInAppHidden(true)
    try { sessionStorage.setItem('gw_inapp_hidden', '1') } catch { /* stockage indisponible */ }
  }
  const [qr, setQr] = useState(false)
  const [settings, setSettings] = useState(loadSettings)
  const changeSettings = (next) => {
    setSettings(next)
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(next)) } catch { /* stockage indisponible */ }
  }
  const link = `${location.origin}/guess-who/${code}`
  // QR dessiné dans le navigateur : il dépendait d'api.qrserver.com (lien du
  // salon envoyé à un tiers, et plus de QR si ce service tombait).
  const [qrSrc, setQrSrc] = useState(null)
  useEffect(() => {
    if (!qr || qrSrc) return
    let alive = true
    import('qrcode')
      .then((m) => m.toDataURL(link, { margin: 0, width: 400, errorCorrectionLevel: 'M', color: { dark: '#0B0B0C', light: '#EDEAE3' } }))
      .then((src) => { if (alive) setQrSrc(src) })
      .catch(() => {})
    return () => { alive = false }
  }, [qr, qrSrc, link])
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
  // Migration 20261002b présente : les joueurs ont un champ « ready ».
  const robust = g.players.some((p) => 'ready' in p)
  const options = robust ? FULL : LEGACY
  const [readyOff, setReadyOff] = useState(false) // serveur sans guesswho_set_ready
  const [readyBusy, setReadyBusy] = useState(false)
  const showReady = robust && !readyOff && !!g.me && !g.spectator
  const readyCount = g.players.filter((p) => p.ready).length
  const toggleReady = async () => {
    setReadyBusy(true)
    const r = await g.act.ready(!g.me.ready)
    setReadyBusy(false)
    if (r?.error === 'unsupported') setReadyOff(true)
    else if (r?.ok) { play('select'); vibrate(20) }
  }
  const start = async () => {
    setBusy(true); setMsg(null)
    const r = await g.act.start(cleanSettings(settings, options))
    setMsg(startErrorText(r))
    if (r?.error) logEvent(code, 'start_refused', `lobby:${r.error}`)
    setBusy(false)
  }
  const canShare = typeof navigator !== 'undefined' && !!navigator.share
  // places vides affichées : de quoi atteindre le minimum, puis une seule invitation
  const seats = n >= MAX_PLAYERS ? 0 : Math.max(MIN_PLAYERS - n, 1)
  return (
    <PhaseFrame eyebrow="Guess Who · Salle d'attente" prompt="Invite ta bande">
      {showInApp && (
        <div role="alert" style={{ ...plate({ borderRadius: RADIUS.md }), border: `1px solid ${T.accent}`, padding: '14px 16px', marginBottom: 18, display: 'grid', gap: 10 }}>
          <div style={{ fontFamily: F.display, fontWeight: 500, fontSize: 18, color: T.textHi }}>Le micro ne marche pas ici</div>
          <div style={{ ...type.body, color: T.text }}>
            Tu es dans le navigateur de l'appli. Ouvre le salon dans ton navigateur. {openInBrowserHint(ua)}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Btn onClick={copy}>{copied ? 'Lien copié ✓' : 'Copier le lien'}</Btn>
            <Btn variant="ghost" onClick={hideInApp}>J'ai compris</Btn>
          </div>
        </div>
      )}
      <div style={{ display: 'grid', justifyItems: 'center', gap: 14, marginBottom: 20 }}>
        <div style={label()}>Code du salon · appuie pour copier</div>
        <BigCode code={code} onCopy={copy} />
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Btn variant={copied ? 'sea' : 'ghost'} onClick={copy}>{copied ? '✓ Lien copié' : 'Copier le lien'}</Btn>
          {canShare && <Btn variant="ghost" onClick={share}>Partager</Btn>}
          <Btn variant="ghost" onClick={() => setQr((v) => !v)} aria-expanded={qr}>{qr ? 'Masquer le QR' : 'QR code'}</Btn>
          <SoundToggle style={{ width: 48, height: 48 }} />
        </div>
        <AnimatePresence>
          {qr && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.2 }}
              style={{ padding: 12, background: '#EDEAE3', borderRadius: RADIUS.md, textAlign: 'center' }}>
              {qrSrc
                ? <img alt={`QR code du salon ${code}`} width={200} height={200} style={{ display: 'block', width: 200, height: 200 }} src={qrSrc} />
                : <div aria-label="QR code en préparation" style={{ width: 200, height: 200, display: 'grid', placeItems: 'center', ...type.small, color: C.textMut }}>…</div>}
              <div style={{ ...type.small, marginTop: 6, color: '#3A3833' }}>Scanne avec ton téléphone</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', borderTop: LINE, paddingTop: 16, marginBottom: 14 }}>
        <span style={{ fontFamily: F.display, fontWeight: 500, fontSize: 19, color: T.textHi }}>Joueurs</span>
        <span style={{ fontFamily: F.ui, fontWeight: 600, fontSize: 14, color: enough ? T.ok : T.textMute }}>
          {n}/{MAX_PLAYERS} {enough ? '· prêt à lancer ✓' : `· ${MIN_PLAYERS} minimum`}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        <AnimatePresence initial={false}>
          {g.players.map((p) => (
            <motion.div key={p.user_id} layout={!reduce}
              initial={reduce ? { opacity: 0 } : { scale: 0.85, y: 6, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 26 }}>
              <PlayerChip player={p} host={p.is_host} me={p.user_id === g.me?.user_id} submitted={showReady && !!p.ready} />
            </motion.div>
          ))}
        </AnimatePresence>
        {Array.from({ length: seats }, (_, i) => <EmptySeat key={`e${i}`} />)}
      </div>
      {showReady && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
          <Btn variant={g.me.ready ? 'sea' : 'ghost'} onClick={toggleReady} disabled={readyBusy} aria-pressed={!!g.me.ready}>
            {g.me.ready ? '✓ Prêt !' : '✋ Je suis prêt'}
          </Btn>
          <span style={{ ...type.small, color: C.textMut }}>{readyCount}/{n} prêt{readyCount > 1 ? 's' : ''}</span>
        </div>
      )}
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
      {g.isHost && <Settings value={settings} onChange={changeSettings} options={options} />}
      {/* Avant de jouer : choisir et tester son micro (le défaut est souvent le mauvais). */}
      {g.me && <div style={{ marginTop: 18 }}><MicSetup onError={(c) => logEvent(code, 'mic_error', `setup:${c}`)} /></div>}
      {msg && <p role="alert" style={{ ...type.body, color: C.danger }}>{msg}</p>}
    </PhaseFrame>
  )
}
