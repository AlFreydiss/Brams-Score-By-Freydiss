// Guess Who — salle d'attente : code à partager, joueurs, lancement (hôte, 3 min.).
import { useState } from 'react'
import { type } from './manga.jsx'
import { C } from './manga.jsx'
import { Btn, PhaseFrame, PlayerChip } from './manga.jsx'
import MicSetup from './MicSetup.jsx'
import { FONT_BODY, FONT_DISPLAY } from './manga.jsx'

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
                style={{ minHeight: 40, padding: '0 14px', cursor: 'pointer', fontFamily: FONT_DISPLAY, fontSize: 14,
                  border: `3px solid ${C.ink}`, background: on ? C.ink : C.paper, color: on ? C.yellow : C.ink }}>{text}</button>
            )
          })}
        </div>
      ))}
    </div>
  )
}

export default function Lobby({ code, g }) {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  const [settings, setSettings] = useState(loadSettings)
  const changeSettings = (next) => {
    setSettings(next)
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(next)) } catch { /* stockage indisponible */ }
  }
  const link = `${location.origin}/guess-who/${code}`
  const enough = g.players.length >= 3
  const start = async () => {
    setBusy(true); setMsg(null)
    const r = await g.act.start(settings)
    if (r?.error) setMsg(r.error === 'not_enough_players' ? 'Il faut au moins 3 joueurs.' : 'Lancement impossible, réessaie.')
    setBusy(false)
  }
  return (
    <PhaseFrame eyebrow="Guess Who" prompt={`Salon ${code}`}
      footer={g.isHost
        ? <Btn onClick={start} disabled={!enough || busy}>{enough ? 'Lancer la partie' : `En attente (${g.players.length}/3)`}</Btn>
        : <span style={{ ...type.body, color: C.textMut }}>L'hôte lance la partie…</span>}>
      <p style={{ ...type.body, color: C.textMut, margin: '0 0 14px' }}>
        Chacun écrit un gage, puis on imite des sons d'anime. Le moins voté perd une vie. 2 vies : le premier éliminé fait un gage.
      </p>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
        <code style={{ fontSize: 28, fontWeight: 900, letterSpacing: '0.2em', color: C.gold }}>{code}</code>
        <Btn variant="ghost" onClick={() => navigator.clipboard?.writeText(link)}>Copier le lien</Btn>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {g.players.map((p) => <PlayerChip key={p.user_id} player={p} host={p.is_host} me={p.user_id === g.me?.user_id} />)}
      </div>
      {g.isHost && <Settings value={settings} onChange={changeSettings} />}
      {/* Avant de jouer : choisir et tester son micro (le défaut est souvent le mauvais). */}
      {g.me && <div style={{ marginTop: 18 }}><MicSetup /></div>}
      {msg && <p style={{ ...type.body, color: C.danger }}>{msg}</p>}
    </PhaseFrame>
  )
}
