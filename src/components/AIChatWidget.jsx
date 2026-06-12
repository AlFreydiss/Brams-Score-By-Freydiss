import { useState, useRef, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext.jsx'

// ── Brams IA — chat refondu : fond animé, contexte live, outils IA en cartes ──

const GOLD = '#BFA46A'
const GOLD_DIM = 'rgba(191,164,106,.22)'
const HIST_KEY = 'brams_ia_chat_v2'
const ADV_KEY = 'brams_ia_adv_v1'

function normalizeIntent(text) {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function isAnimeScanRequest(text) {
  const normalized = normalizeIntent(text)
  return /\b(anime|animes|anim|episode|episodes|scan|scans|manga|lecture|lire)\b/.test(normalized)
    && !/\b(fruit|rang|grade|shanks)\b/.test(normalized)
}

const SUGGESTIONS = [
  'Quel est le fruit du démon le plus puissant ?',
  'Il me manque combien pour le prochain rang ?',
  'Conseille-moi un anime à regarder ce soir',
  'Qui peut battre Shanks ?',
]

const TOOLS = [
  { mode: 'adventure', icon: '🗺️', label: 'Aventure' },
  { mode: 'wanted', icon: '☠️', label: 'Wanted' },
  { mode: 'horoscope', icon: '🔮', label: 'Horoscope' },
  { mode: 'destin', icon: '🦈', label: 'Destin' },
  { mode: 'clash', icon: '🔥', label: 'Clash-moi' },
  { mode: 'eloge', icon: '👑', label: 'Éloge' },
  { mode: 'journal', icon: '📰', label: 'Journal' },
  { mode: 'pirate', icon: '🏴‍☠️', label: 'Pirate' },
]

const TOOL_USER_LINE = {
  adventure: '🗺️ Lance-moi une aventure !',
  wanted: '☠️ Mon avis de recherche !',
  horoscope: '🔮 Mon horoscope du jour',
  destin: '🦈 Madame Shyarly, mon destin ?',
  clash: '🔥 Vas-y, clash-moi',
  eloge: '👑 Raconte ma légende',
  journal: '📰 Le journal du jour !',
}

const ASTRES = ['Luffy', 'Zoro', 'Nami', 'Usopp', 'Sanji', 'Chopper', 'Robin', 'Franky', 'Brook', 'Jinbe', 'Shanks', 'Mihawk', 'Ace', 'Sabo', 'Law', 'Katakuri', 'Yamato', 'Buggy', 'Garp', 'Doflamingo']
const MERS = ['East Blue', 'West Blue', 'North Blue', 'South Blue', 'Grand Line', 'le Nouveau Monde']

// Petit PRNG déterministe (même horoscope toute la journée pour un même membre)
function seeded(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) }
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909)
    return ((h ^= h >>> 16) >>> 0) / 4294967296
  }
}

function loadJSON(key, fallback) {
  try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback } catch { return fallback }
}
function saveJSON(key, value) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
  } catch {}
}

async function callAPI(body) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(25_000),
  })
  let data = {}
  try { data = await res.json() } catch {}
  if (!res.ok) { const e = new Error(data.error || 'Erreur serveur'); e.status = res.status; throw e }
  return data
}

// ── Cartes riches ─────────────────────────────────────────────────────────────

const CARD_BASE = {
  border: `1px solid ${GOLD_DIM}`,
  borderRadius: 14,
  padding: '14px 16px',
  background: 'linear-gradient(180deg, rgba(191,164,106,.07), rgba(191,164,106,.02))',
  color: '#fff',
  maxWidth: '92%',
}

function Sep() {
  return <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${GOLD_DIM}, transparent)`, margin: '10px 0' }} />
}

function CardTitle({ children }) {
  return <div style={{ fontSize: 11, letterSpacing: '.22em', color: GOLD, fontWeight: 800, textAlign: 'center', textTransform: 'uppercase' }}>{children}</div>
}

function WantedCard({ data, name, avatarUrl, berrys }) {
  return (
    <div style={{ ...CARD_BASE, textAlign: 'center' }}>
      <CardTitle>☠️ Wanted — Dead or Alive</CardTitle>
      {avatarUrl && (
        <img src={avatarUrl} alt="" style={{ width: 74, height: 74, borderRadius: 12, margin: '12px auto 0', display: 'block', border: `2px solid ${GOLD_DIM}`, filter: 'sepia(.45) contrast(1.05)' }} />
      )}
      <div style={{ fontSize: 17, fontWeight: 900, letterSpacing: '.06em', marginTop: 10, textTransform: 'uppercase' }}>{name}</div>
      <div style={{ fontSize: 12.5, fontStyle: 'italic', color: 'rgba(255,255,255,.65)' }}>dit « {data.epithete} »</div>
      <Sep />
      <div style={{ textAlign: 'left', fontSize: 12.5, lineHeight: 1.65, color: 'rgba(255,255,255,.85)' }}>
        {(data.motifs || []).slice(0, 4).map((m, i) => <div key={i}>• {m}</div>)}
      </div>
      <Sep />
      <div style={{ fontSize: 14, fontWeight: 800, color: GOLD }}>
        PRIME : {berrys != null ? `${Number(berrys).toLocaleString('fr-FR')} ฿` : '???'}
      </div>
      {data.citation && <div style={{ fontSize: 12, fontStyle: 'italic', marginTop: 8, color: 'rgba(255,255,255,.6)' }}>« {data.citation} »</div>}
    </div>
  )
}

function HoroscopeCard({ data }) {
  return (
    <div style={CARD_BASE}>
      <CardTitle>🔮 Horoscope pirate du jour</CardTitle>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 10, flexWrap: 'wrap' }}>
        {[['⭐', data.astre], ['🌊', data.mer], ['🎲', data.chiffre]].map(([ic, v], i) => (
          <span key={i} style={{ fontSize: 11.5, padding: '4px 10px', borderRadius: 100, border: `1px solid ${GOLD_DIM}`, color: 'rgba(255,255,255,.85)' }}>{ic} {v}</span>
        ))}
      </div>
      <Sep />
      <div style={{ fontSize: 13, lineHeight: 1.65, color: 'rgba(255,255,255,.88)' }}>{data.prediction}</div>
      <Sep />
      <div style={{ fontSize: 12.5, lineHeight: 1.6, color: 'rgba(255,255,255,.75)' }}>
        <div>🎙️ <b style={{ color: GOLD }}>Vocal</b> — {data.vocal}</div>
        <div style={{ marginTop: 5 }}>⚓ <b style={{ color: GOLD }}>Conseil</b> — <i>{data.conseil}</i></div>
      </div>
    </div>
  )
}

function JournalCard({ data }) {
  return (
    <div style={CARD_BASE}>
      <CardTitle>📰 Le Brams Times</CardTitle>
      <div style={{ fontSize: 15.5, fontWeight: 900, lineHeight: 1.35, marginTop: 10, textTransform: 'uppercase', letterSpacing: '.02em' }}>{data.une}</div>
      <Sep />
      <div style={{ fontSize: 13, lineHeight: 1.65, color: 'rgba(255,255,255,.88)' }}>{data.article}</div>
      <Sep />
      <div style={{ fontSize: 12.5, lineHeight: 1.6, color: 'rgba(255,255,255,.75)' }}>
        <div>🗞️ <b style={{ color: GOLD }}>En bref</b> — {data.breve}</div>
        <div style={{ marginTop: 5 }}>🌦️ <b style={{ color: GOLD }}>Météo de Grand Line</b> — {data.meteo}</div>
      </div>
    </div>
  )
}

const ADV_OUTCOMES = {
  triomphe: { title: '🏆 TRIOMPHE SUR GRAND LINE', color: '#7ec98f' },
  survie: { title: '🌊 TU AS SURVÉCU… DE JUSTESSE', color: '#8fb7d9' },
  desastre: { title: '☠️ DÉSASTRE EN MER', color: '#d98f8f' },
}

function AdventureCard({ data, isActive, loading, onChoose }) {
  const done = !!data.done
  const out = done ? (ADV_OUTCOMES[data.outcome] || ADV_OUTCOMES.survie) : null
  return (
    <div style={{ ...CARD_BASE, maxWidth: '96%' }}>
      {done ? (
        <div style={{ fontSize: 12, letterSpacing: '.18em', color: out.color, fontWeight: 800, textAlign: 'center' }}>{out.title}</div>
      ) : (
        <CardTitle>🗺️ Aventure — Chapitre {data.chapter}/5</CardTitle>
      )}
      {!done && (
        <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginTop: 8 }}>
          {[1, 2, 3, 4, 5].map(n => (
            <span key={n} style={{ width: 22, height: 3, borderRadius: 2, background: n <= data.chapter ? GOLD : 'rgba(255,255,255,.12)' }} />
          ))}
        </div>
      )}
      <div style={{ fontSize: 13, lineHeight: 1.7, marginTop: 10, color: 'rgba(255,255,255,.9)' }}>{data.scene}</div>
      {done && data.epilogue && (
        <>
          <Sep />
          <div style={{ fontSize: 12.5, fontStyle: 'italic', textAlign: 'center', color: 'rgba(255,255,255,.65)' }}>⚓ {data.epilogue}</div>
        </>
      )}
      {!done && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
          {(data.choices || []).map((c, i) => {
            const chosen = data.chosen === c
            const enabled = isActive && !data.chosen && !loading
            return (
              <button key={i} onClick={() => enabled && onChoose(i)} disabled={!enabled} style={{
                textAlign: 'left', fontSize: 12.5, lineHeight: 1.5, padding: '9px 12px', borderRadius: 10,
                border: `1px solid ${chosen ? GOLD : GOLD_DIM}`,
                background: chosen ? 'rgba(191,164,106,.18)' : 'rgba(255,255,255,.03)',
                color: chosen ? '#fff' : (enabled ? 'rgba(255,255,255,.85)' : 'rgba(255,255,255,.4)'),
                cursor: enabled ? 'pointer' : 'default', transition: 'all .15s',
              }}
                onMouseEnter={e => { if (enabled) e.currentTarget.style.background = 'rgba(191,164,106,.14)' }}
                onMouseLeave={e => { if (enabled) e.currentTarget.style.background = 'rgba(255,255,255,.03)' }}
              >
                <span style={{ color: GOLD, fontWeight: 700, marginRight: 6 }}>{['A', 'B', 'C'][i]}</span>{c}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: 5, padding: '10px 14px', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.07)', borderRadius: '14px 14px 14px 4px', width: 'fit-content' }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: GOLD, display: 'block', animation: `pulse 1.2s ${i * 0.2}s infinite` }} />
      ))}
    </div>
  )
}

// ── Widget ────────────────────────────────────────────────────────────────────

export default function AIChatWidget({ hidden = false }) {
  const { displayName, avatarUrl, discordId, berryCount } = useAuth()
  const [open, setOpen] = useState(false)
  const [history, setHistory] = useState(() => loadJSON(HIST_KEY, []))
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [unread, setUnread] = useState(0)
  const [shaking, setShaking] = useState(false)
  const [notice, setNotice] = useState('')
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const advLogRef = useRef(loadJSON(ADV_KEY, []))
  const boardRef = useRef({ t: 0, rows: null })

  // Masque les contrôles son ambiants quand le chat est ouvert (superposition).
  useEffect(() => {
    const r = document.documentElement
    if (open) r.dataset.chatopen = '1'; else delete r.dataset.chatopen
    return () => { delete document.documentElement.dataset.chatopen }
  }, [open])

  useEffect(() => { saveJSON(HIST_KEY, history.slice(-60)) }, [history])

  useEffect(() => {
    if (hidden || open) return
    const id = setInterval(() => {
      setShaking(true)
      setTimeout(() => setShaking(false), 700)
    }, 9000)
    return () => clearInterval(id)
  }, [hidden, open])

  useEffect(() => {
    if (open) {
      setUnread(0)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history, loading, open])

  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(''), 4200)
    return () => clearTimeout(t)
  }, [notice])

  // Classement (CDN-cached côté API) : position + heures réelles du membre, top 5 pour le journal.
  const getBoard = useCallback(async () => {
    const now = Date.now()
    if (boardRef.current.rows && now - boardRef.current.t < 120_000) return boardRef.current.rows
    try {
      const res = await fetch('/api/leaderboard?limit=500&period=week', { signal: AbortSignal.timeout(6000) })
      if (!res.ok) return boardRef.current.rows
      const rows = await res.json()
      if (Array.isArray(rows)) boardRef.current = { t: now, rows }
      return boardRef.current.rows
    } catch { return boardRef.current.rows }
  }, [])

  const buildContext = useCallback(async ({ withServer = false } = {}) => {
    const ctx = { name: displayName }
    if (berryCount != null) ctx.berrys = berryCount
    const rows = await getBoard()
    if (rows) {
      if (discordId) {
        const idx = rows.findIndex(r => String(r.uid) === String(discordId))
        if (idx !== -1) {
          ctx.hours7d = rows[idx].vocal_h
          ctx.rankPos = idx + 1
          ctx.total = rows.length
          if (ctx.berrys == null) ctx.berrys = rows[idx].berrys
        }
      }
      if (withServer) {
        ctx.server = {
          actifs: rows.filter(r => r.vocal_h > 0).length,
          top: rows.slice(0, 5).map(r => ({ name: r.username, hours: r.vocal_h })),
        }
      }
    }
    return ctx
  }, [displayName, discordId, berryCount, getBoard])

  const pushUser = (text) => setHistory(h => [...h, { role: 'user', type: 'text', text }])
  const pushModel = (item) => {
    setHistory(h => [...h, { role: 'model', ...item }])
    if (!open) setUnread(u => u + 1)
  }

  function handleError(err) {
    if (err?.status === 429) setNotice(err.message || 'Pause courte. Réessaie dans quelques secondes.')
    else if (err?.name === 'TimeoutError' || err?.name === 'AbortError') setNotice('Réponse trop lente. Réessaie.')
    else setNotice(err?.message || 'Erreur inattendue. Réessaie dans un instant.')
  }

  // ── Chat classique ──
  async function send(text) {
    const msg = (text ?? input).trim()
    if (!msg || loading) return
    setInput('')
    const prior = history.filter(m => m.type === 'text').map(m => ({ role: m.role, text: m.text })).slice(-10)
    pushUser(msg)

    if (isAnimeScanRequest(msg)) {
      pushModel({ type: 'text', text: "J'ouvre la page Animés & Scans du site. Tu vas y trouver les épisodes et les scans disponibles." })
      setOpen(false)
      setTimeout(() => { document.dispatchEvent(new CustomEvent('open-anime-hub')) }, 120)
      return
    }

    setLoading(true)
    setNotice('')
    try {
      const data = await callAPI({ message: msg, history: prior, context: await buildContext() })
      pushModel({ type: 'text', text: data.reply || 'Quelque chose a raté, réessaie.' })
    } catch (err) {
      handleError(err)
    } finally {
      setLoading(false)
    }
  }

  // ── Outils IA (cartes riches) ──
  async function runTool(mode) {
    if (loading) return
    setNotice('')

    if (mode === 'pirate') {
      const msg = input.trim()
      if (!msg) { setNotice('Écris d\'abord ton message, puis re-clique 🏴‍☠️ pour le traduire en pirate.'); return }
      setInput('')
      pushUser(`🏴‍☠️ ${msg}`)
      setLoading(true)
      try {
        const data = await callAPI({ mode: 'pirate', message: msg })
        pushModel({ type: 'text', text: data.reply })
      } catch (err) { handleError(err) } finally { setLoading(false) }
      return
    }

    if (mode === 'adventure') {
      const last = [...history].reverse().find(m => m.type === 'adventure')
      if (last && !last.data.done && advLogRef.current) {
        setNotice('⚓ Termine ton aventure en cours — choisis A, B ou C !')
        return
      }
      advLogRef.current = []
      saveJSON(ADV_KEY, [])
    }

    pushUser(TOOL_USER_LINE[mode] || mode)
    setLoading(true)
    try {
      const ctx = await buildContext({ withServer: mode === 'journal' })

      if (mode === 'horoscope') {
        const today = new Date().toLocaleDateString('fr-CA')
        const rng = seeded(`${discordId || displayName}-${today}`)
        ctx.name = displayName
        const astre = ASTRES[Math.floor(rng() * ASTRES.length)]
        const mer = MERS[Math.floor(rng() * MERS.length)]
        const chiffre = 1 + Math.floor(rng() * 99)
        const data = await callAPI({ mode, context: ctx, message: `Astre gardien du jour : ${astre}. Mer dominante : ${mer}.` })
        pushModel({ type: 'horoscope', data: { ...data.data, astre, mer, chiffre } })
        return
      }

      const data = await callAPI({ mode, context: ctx, ...(mode === 'adventure' ? { adventure: { log: [] } } : {}) })

      if (mode === 'wanted') pushModel({ type: 'wanted', data: data.data })
      else if (mode === 'journal') pushModel({ type: 'journal', data: data.data })
      else if (mode === 'adventure') pushModel({ type: 'adventure', data: { ...data.data, chapter: 1, chosen: null } })
      else pushModel({ type: 'text', text: data.reply })
    } catch (err) {
      handleError(err)
    } finally {
      setLoading(false)
    }
  }

  // ── Aventure : choix d'un chapitre ──
  async function advChoose(item, idx) {
    if (loading) return
    const choice = item.data.choices[idx]
    setHistory(h => h.map(x => (x === item ? { ...x, data: { ...x.data, chosen: choice } } : x)))
    const log = [...(advLogRef.current || []), { scene: item.data.scene, choice }]
    advLogRef.current = log
    saveJSON(ADV_KEY, log)
    setLoading(true)
    setNotice('')
    try {
      const data = await callAPI({ mode: 'adventure', context: await buildContext(), adventure: { log } })
      pushModel({ type: 'adventure', data: { ...data.data, chapter: log.length + 1, chosen: null } })
      if (data.data.done) { advLogRef.current = []; saveJSON(ADV_KEY, null) }
    } catch (err) {
      // Le choix reste marqué : on retire le flag pour permettre de re-cliquer.
      setHistory(h => h.map(x => (x.type === 'adventure' && x.data.chosen === choice ? { ...x, data: { ...x.data, chosen: null } } : x)))
      advLogRef.current = log.slice(0, -1)
      saveJSON(ADV_KEY, advLogRef.current)
      handleError(err)
    } finally {
      setLoading(false)
    }
  }

  function clearChat() {
    setHistory([])
    advLogRef.current = []
    saveJSON(HIST_KEY, null)
    saveJSON(ADV_KEY, null)
  }

  if (hidden) return null

  const lastAdvIndex = (() => { for (let i = history.length - 1; i >= 0; i--) if (history[i].type === 'adventure') return i; return -1 })()

  return (
    <>
      <style>{`
        @keyframes chatRingSpin { to { transform: rotate(360deg) } }
        @keyframes aiSwell { 0% { background-position: 0 0 } 100% { background-position: 240px 0 } }
        @keyframes aiFadeUp { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: none } }
        @media (prefers-reduced-motion: reduce) { .chat-ring, .ai-swell { animation: none !important } }
        .ai-tools::-webkit-scrollbar { display: none }
      `}</style>

      {/* Panel */}
      <div className="cinema-hide" style={{
        position: 'fixed', bottom: 90, right: 24, zIndex: 900,
        width: 392, maxWidth: 'calc(100vw - 40px)',
        background: '#0a0b10',
        border: `1px solid ${GOLD_DIM}`, borderRadius: 20,
        boxShadow: '0 28px 70px rgba(0,0,0,.7), 0 0 30px rgba(191,164,106,.06)',
        display: 'flex', flexDirection: 'column',
        maxHeight: open ? 'min(660px, calc(100dvh - 130px))' : 0,
        opacity: open ? 1 : 0,
        pointerEvents: open ? 'all' : 'none',
        transition: 'max-height .35s cubic-bezier(.4,0,.2,1), opacity .25s ease',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '14px 16px', borderBottom: `1px solid ${GOLD_DIM}`,
          background: 'linear-gradient(90deg, rgba(191,164,106,.10), rgba(191,164,106,.02))',
          display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: 11, flexShrink: 0,
            border: `1px solid ${GOLD_DIM}`, background: 'rgba(191,164,106,.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
          }}>⚓</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 13.5, color: '#fff', letterSpacing: '.12em' }}>BRAMS IA</div>
            <div style={{ fontSize: 11, color: GOLD, display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#5fd38d', display: 'inline-block', animation: 'pulse 2s infinite' }} />
              L'esprit de l'équipage • en ligne
            </div>
          </div>
          {history.length > 0 && (
            <button onClick={clearChat} style={{ fontSize: 11, color: 'rgba(255,255,255,.55)', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 6, padding: '3px 8px', cursor: 'pointer' }}>
              Effacer
            </button>
          )}
          <button onClick={() => setOpen(false)} style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.04)', color: 'rgba(255,255,255,.6)', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        {/* Messages — le fond : profondeurs de Grand Line */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '14px 14px 8px', position: 'relative',
          background: `
            radial-gradient(ellipse 95% 55% at 50% -8%, rgba(191,164,106,.09), transparent 60%),
            radial-gradient(ellipse 75% 50% at 88% 108%, rgba(34,46,75,.45), transparent 65%),
            radial-gradient(ellipse 60% 45% at 6% 102%, rgba(80,30,38,.28), transparent 60%),
            linear-gradient(180deg, #0b0c12, #08090d)
          `,
        }}>
          {/* Houle dorée en filigrane */}
          <div className="ai-swell" aria-hidden style={{
            position: 'sticky', top: 0, left: 0, right: 0, height: 0, zIndex: 0, pointerEvents: 'none',
          }} />
          <div aria-hidden style={{
            position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 150, opacity: .035, filter: 'grayscale(1)',
          }}>🏴‍☠️</div>

          <div style={{ position: 'relative', zIndex: 1 }}>
            {history.length === 0 && (
              <div style={{ textAlign: 'center', padding: '18px 6px' }}>
                <div style={{ fontSize: 30, marginBottom: 8 }}>⚓</div>
                <p style={{ color: 'rgba(255,255,255,.55)', fontSize: 12.5, marginBottom: 6 }}>
                  {displayName && displayName !== 'Pirate' ? `Yo ${displayName} !` : 'Yo, pirate !'} Je connais tes vraies stats, le serveur et tout le site.
                </p>
                <p style={{ color: 'rgba(255,255,255,.4)', fontSize: 11.5, marginBottom: 14 }}>
                  Pose ta question, ou tente un des outils dorés en bas 👇
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {SUGGESTIONS.map(s => (
                    <button key={s} onClick={() => send(s)} style={{
                      background: 'rgba(191,164,106,.06)', border: `1px solid ${GOLD_DIM}`,
                      borderRadius: 10, padding: '8px 12px', fontSize: 12, color: 'rgba(255,255,255,.7)',
                      cursor: 'pointer', textAlign: 'left', transition: 'all .15s',
                    }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(191,164,106,.14)'; e.currentTarget.style.color = '#fff' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(191,164,106,.06)'; e.currentTarget.style.color = 'rgba(255,255,255,.7)' }}
                    >💬 {s}</button>
                  ))}
                </div>
              </div>
            )}

            {history.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 10, animation: 'aiFadeUp .25s ease-out' }}>
                {m.role === 'model' && m.type === 'text' && (
                  <div style={{ width: 26, height: 26, borderRadius: 8, border: `1px solid ${GOLD_DIM}`, background: 'rgba(191,164,106,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0, marginRight: 8, marginTop: 2 }}>⚓</div>
                )}
                {m.type === 'text' ? (
                  <div style={{
                    maxWidth: '80%', padding: '9px 13px',
                    borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                    background: m.role === 'user' ? `linear-gradient(135deg, ${GOLD}, #937a45)` : 'rgba(255,255,255,.05)',
                    border: m.role === 'user' ? 'none' : '1px solid rgba(255,255,255,.07)',
                    fontSize: 13, lineHeight: 1.6,
                    color: m.role === 'user' ? '#15120a' : '#fff',
                    fontWeight: m.role === 'user' ? 600 : 400,
                    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  }}>{m.text}</div>
                ) : m.type === 'wanted' ? (
                  <WantedCard data={m.data} name={displayName} avatarUrl={avatarUrl} berrys={berryCount} />
                ) : m.type === 'horoscope' ? (
                  <HoroscopeCard data={m.data} />
                ) : m.type === 'journal' ? (
                  <JournalCard data={m.data} />
                ) : m.type === 'adventure' ? (
                  <AdventureCard data={m.data} isActive={i === lastAdvIndex} loading={loading} onChoose={(idx) => advChoose(m, idx)} />
                ) : null}
              </div>
            ))}

            {loading && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <div style={{ width: 26, height: 26, borderRadius: 8, border: `1px solid ${GOLD_DIM}`, background: 'rgba(191,164,106,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>⚓</div>
                <TypingDots />
              </div>
            )}
            {notice && (
              <div style={{
                margin: '0 0 8px', padding: '8px 12px', borderRadius: 10,
                background: 'rgba(191,164,106,.08)', border: `1px solid ${GOLD_DIM}`,
                color: 'rgba(255,255,255,.82)', fontSize: 12, lineHeight: 1.45,
              }}>{notice}</div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Outils IA */}
        <div className="ai-tools" style={{
          display: 'flex', gap: 6, padding: '8px 12px 2px', overflowX: 'auto', flexShrink: 0,
          scrollbarWidth: 'none', borderTop: '1px solid rgba(255,255,255,.05)', background: '#0a0b10',
        }}>
          {TOOLS.map(t => (
            <button key={t.mode} onClick={() => runTool(t.mode)} disabled={loading} style={{
              flexShrink: 0, fontSize: 11.5, padding: '5px 10px', borderRadius: 100,
              border: `1px solid ${GOLD_DIM}`, background: 'rgba(191,164,106,.05)',
              color: loading ? 'rgba(255,255,255,.35)' : 'rgba(255,255,255,.78)',
              cursor: loading ? 'default' : 'pointer', transition: 'all .15s', whiteSpace: 'nowrap',
            }}
              onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = 'rgba(191,164,106,.16)'; e.currentTarget.style.color = '#fff' } }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(191,164,106,.05)'; e.currentTarget.style.color = 'rgba(255,255,255,.78)' }}
            >{t.icon} {t.label}</button>
          ))}
        </div>

        {/* Input */}
        <div style={{ padding: '8px 12px 10px', display: 'flex', gap: 8, flexShrink: 0, background: '#0a0b10' }}>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder="Parle à l'équipage…"
            maxLength={500}
            style={{ flex: 1, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 10, padding: '9px 14px', fontSize: 13, color: '#fff', outline: 'none', fontFamily: 'var(--body)' }}
            onFocus={e => e.target.style.borderColor = 'rgba(191,164,106,.45)'}
            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,.08)'}
          />
          <button onClick={() => send()} disabled={!input.trim() || loading}
            style={{
              width: 38, height: 38, borderRadius: 10, flexShrink: 0,
              background: input.trim() && !loading ? `linear-gradient(135deg, ${GOLD}, #8a7340)` : 'rgba(255,255,255,.06)',
              border: 'none', color: input.trim() && !loading ? '#15120a' : '#fff', fontSize: 16, fontWeight: 700,
              cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .15s',
            }}>
            →
          </button>
        </div>
      </div>

      {/* Bulle — anneau doré en rotation */}
      <button
        className="cinema-hide"
        onClick={() => setOpen(o => !o)}
        aria-label="Chat IA Brams"
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 901,
          width: 60, height: 60, borderRadius: '50%',
          background: 'transparent', border: 'none', padding: 0,
          cursor: 'pointer',
          animation: shaking ? 'shake 0.7s ease' : open ? 'none' : 'floatAI 3s ease-in-out infinite',
          filter: 'drop-shadow(0 8px 26px rgba(191,164,106,.35))',
          transition: 'filter .2s, transform .15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.filter = 'drop-shadow(0 10px 34px rgba(191,164,106,.6))'; e.currentTarget.style.transform = 'scale(1.08)' }}
        onMouseLeave={e => { e.currentTarget.style.filter = 'drop-shadow(0 8px 26px rgba(191,164,106,.35))'; e.currentTarget.style.transform = 'scale(1)' }}
      >
        <span className="chat-ring" aria-hidden style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          background: `conic-gradient(${GOLD}, #5d4c26, #f0dca8, ${GOLD})`,
          animation: 'chatRingSpin 3.2s linear infinite',
        }} />
        <span style={{
          position: 'absolute', inset: 4, borderRadius: '50%', background: '#0b0b10',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
        }}>
          {open ? '✕' : '🏴‍☠️'}
        </span>
        {!open && unread > 0 && (
          <span style={{ position: 'absolute', top: -2, right: -2, width: 20, height: 20, borderRadius: '50%', background: GOLD, border: '2px solid #0e0f11', fontSize: 11, fontWeight: 700, color: '#15120a', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>{unread}</span>
        )}
      </button>
    </>
  )
}
