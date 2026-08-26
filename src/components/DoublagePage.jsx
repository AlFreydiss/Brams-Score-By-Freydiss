import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { DOUBLAGE_SCENES } from '../data/doublage-data.js'
import { corsUrl } from '../lib/audioBoost.js'

// ── Guerre du Doublage ──────────────────────────────────────────────────────
// Une manche = une scène, jouée deux fois : piste VF (`src` de l'épisode) et
// piste VOSTFR (`audio[ja].mediaSrc`). Les deux vidéos sont chargées sur le
// MÊME instant, donc basculer de A à B ne change que le doublage.
// Le camp A/B est tiré au sort à chaque manche : on vote à l'aveugle, la
// révélation arrive après le vote.

const BG      = '#050308'
const PINK    = '#9d174d'
const PURPLE  = '#4c1d95'
const GRAD    = `linear-gradient(135deg, ${PINK}, ${PURPLE})`

const VF_COLOR = '#2563eb'
const JA_COLOR = '#dc2626'

const ROUNDS    = 10    // manches par session
const STORE_KEY = 'brams_doublage_stats_v1'

// Nombre total d'extraits, tous épisodes confondus (affiché en pied de page).
const CLIP_TOTAL = DOUBLAGE_SCENES.reduce((n, s) => n + s.clips.length, 0)

const CSS = `
  @keyframes dbPulse { 0%,100%{opacity:.55} 50%{opacity:1} }
  @media (prefers-reduced-motion: reduce){ [data-dbfx]{animation:none!important} }
`

// ── Persistance locale ──────────────────────────────────────────────────────
function loadStats() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY) || '{}')
    return { vf: raw.vf || 0, vostfr: raw.vostfr || 0, sessions: raw.sessions || 0 }
  } catch { return { vf: 0, vostfr: 0, sessions: 0 } }
}

function saveStats(stats) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(stats)) } catch { /* quota / navigation privée */ }
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const pick = arr => arr[Math.floor(Math.random() * arr.length)]

// ── Source média ────────────────────────────────────────────────────────────
// La majorité des épisodes sont servis en HLS : un <video src="…m3u8"> ne joue
// que sur Safari, partout ailleurs il faut passer par hls.js (déjà utilisé par
// le lecteur du site).
const isHls = url => /\.m3u8(\?|$)/i.test(url)

const NATIVE_HLS = typeof document !== 'undefined' &&
  Boolean(document.createElement('video').canPlayType('application/vnd.apple.mpegurl'))

const needsHlsJs = url => isHls(url) && !NATIVE_HLS

// hls.js alimente lui-même l'élément : lui poser un `src` ferait charger le
// manifeste comme une vidéo et casserait la lecture. Le paramètre anti-cache
// CORS ne concerne que les fichiers lus directement.
const mediaSrc = url => (needsHlsJs(url) ? undefined : corsUrl(url))

function useHlsSource(ref, url, startAt, onError) {
  useEffect(() => {
    const video = ref.current
    if (!video || !url || !needsHlsJs(url)) return

    let hls = null
    let cancelled = false

    import('hls.js').then(({ default: Hls }) => {
      if (cancelled || !video.isConnected) return
      if (!Hls.isSupported()) { onError?.(); return }
      // startPosition évite de télécharger l'épisode depuis le début pour un
      // extrait qui commence à 13 minutes.
      hls = new Hls({ enableWorker: true, maxBufferLength: 30, backBufferLength: 10, startPosition: startAt })
      hls.attachMedia(video)
      hls.on(Hls.Events.MEDIA_ATTACHED, () => hls.loadSource(url))
      hls.on(Hls.Events.ERROR, (_evt, data) => {
        if (!data?.fatal) return
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad()
        else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError()
        else onError?.()
      })
    }).catch(() => onError?.())

    return () => {
      cancelled = true
      if (hls) { try { hls.destroy() } catch { /* déjà détruit */ } }
    }
  }, [ref, url, startAt, onError])
}

// Épisodes regroupés par animé : My Hero Academia pèse à lui seul 37% des
// extraits, un tirage uniforme donnerait une session presque monochrome.
const BY_ANIME = DOUBLAGE_SCENES.reduce((map, scene) => {
  ;(map[scene.anime] ||= []).push(scene)
  return map
}, {})

// Une manche = un extrait précis dans un épisode précis. On tourne animé par
// animé pour que dix manches donnent dix animés différents quand c'est possible.
function buildDeck() {
  const animes = shuffle(Object.keys(BY_ANIME))
  const usedEpisodes = new Set()
  const deck = []

  while (deck.length < ROUNDS) {
    const before = deck.length
    for (const anime of animes) {
      if (deck.length >= ROUNDS) break
      const pool = BY_ANIME[anime].filter(s => !usedEpisodes.has(s.id))
      if (!pool.length) continue
      const scene = pick(pool)
      usedEpisodes.add(scene.id)
      deck.push({ scene, clip: pick(scene.clips) })
    }
    // Aucun animé n'a plus d'épisode disponible : inutile de boucler à vide.
    if (deck.length === before) break
  }

  return deck
}

// ── Lecteur double piste ────────────────────────────────────────────────────
// Les deux <video> restent montées : la bascule doit être instantanée, sinon
// l'oreille perd la comparaison. Seule la piste active est visible et audible.
function DualTrackPlayer({ scene, side, onSideChange, startAt, endAt, started, onStart, onMediaError }) {
  const aRef = useRef(null)
  const bRef = useRef(null)
  const readyCount = useRef(0)
  const [ready, setReady] = useState(false)

  // scene.sideA vaut 'vf' ou 'vostfr' : le tirage au sort vient du parent.
  const srcA = scene.sideA === 'vf' ? scene.vf : scene.vostfr
  const srcB = scene.sideA === 'vf' ? scene.vostfr : scene.vf

  // Les épisodes HLS (la majorité) ne se lisent pas via l'attribut src.
  useHlsSource(aRef, srcA, startAt, onMediaError)
  useHlsSource(bRef, srcB, startAt, onMediaError)

  // Positionne les deux pistes sur le même instant dès l'arrivée des métadonnées.
  const handleMeta = useCallback(el => {
    if (!el) return
    // Les timecodes viennent des sous-titres français : si la piste japonaise
    // est plus courte (montage différent), on retombe sur le milieu du fichier.
    const target = Number.isFinite(el.duration) && el.duration > startAt + 5
      ? startAt
      : Math.max(0, (el.duration || 0) / 2)
    try { el.currentTime = target } catch { /* seek ignoré si pas prêt */ }
    readyCount.current += 1
    if (readyCount.current >= 2) setReady(true)
  }, [startAt])

  // Une seule piste parle ; l'autre suit en muet pour rester alignée.
  // Tant que l'utilisateur n'a pas cliqué « Lancer », on ne démarre rien : un
  // navigateur refuse toute lecture non muette avant un geste.
  useEffect(() => {
    const a = aRef.current, b = bRef.current
    if (!a || !b || !ready || !started) return
    const active  = side === 'A' ? a : b
    const passive = side === 'A' ? b : a
    // Resynchronise la piste activée sur celle qu'on quitte.
    if (Math.abs(active.currentTime - passive.currentTime) > 0.12) {
      try { active.currentTime = passive.currentTime } catch { /* ignore */ }
    }
    active.muted = false
    passive.muted = true
    active.play().catch(() => {})
    passive.play().catch(() => {})
  }, [side, ready, started])

  // Boucle sur la scène : passé endAt on repart au début de l'extrait, pour
  // pouvoir réécouter le même passage autant de fois qu'on veut.
  useEffect(() => {
    const a = aRef.current, b = bRef.current
    if (!a || !b || !ready) return
    const id = setInterval(() => {
      for (const el of [a, b]) {
        if (el.currentTime > endAt) {
          try { el.currentTime = startAt } catch { /* ignore */ }
        }
      }
    }, 400)
    return () => clearInterval(id)
  }, [startAt, endAt, ready])

  const videoStyle = visible => ({
    position: 'absolute', inset: 0, width: '100%', height: '100%',
    objectFit: 'cover', opacity: visible ? 1 : 0,
    transition: 'opacity .18s ease', pointerEvents: 'none',
  })

  return (
    <div style={{
      position: 'relative', width: '100%', aspectRatio: '16 / 9',
      borderRadius: 16, overflow: 'hidden', background: '#000',
      border: '1px solid rgba(255,255,255,.1)',
    }}>
      <video
        ref={aRef} src={mediaSrc(srcA)} crossOrigin="anonymous"
        playsInline preload="metadata" muted
        onLoadedMetadata={e => handleMeta(e.currentTarget)}
        onError={onMediaError}
        style={videoStyle(side === 'A')}
      />
      <video
        ref={bRef} src={mediaSrc(srcB)} crossOrigin="anonymous"
        playsInline preload="metadata" muted
        onLoadedMetadata={e => handleMeta(e.currentTarget)}
        onError={onMediaError}
        style={videoStyle(side === 'B')}
      />

      {!ready && (
        <div style={{
          position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
          color: 'rgba(255,255,255,.5)', fontSize: 13, letterSpacing: '.08em',
        }}>
          <span data-dbfx style={{ animation: 'dbPulse 1.4s ease-in-out infinite' }}>
            CHARGEMENT DES DEUX PISTES…
          </span>
        </div>
      )}

      {/* Premier lancement : un clic est obligatoire pour que le navigateur
          autorise le son. Ensuite les manches s'enchaînent toutes seules. */}
      {ready && !started && (
        <button
          onClick={onStart}
          style={{
            position: 'absolute', inset: 0, border: 'none', cursor: 'pointer',
            background: 'rgba(5,3,8,.72)', color: '#fff',
            display: 'grid', placeItems: 'center', gap: 8,
            fontFamily: "'Pirata One',cursive", fontSize: 30, letterSpacing: '.06em',
          }}
        >
          ▶ LANCER LA COMPARAISON
        </button>
      )}

      {/* Bascule A / B : le geste central du jeu, gros et toujours atteignable. */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        display: 'flex', gap: 2, padding: 10,
        background: 'linear-gradient(to top, rgba(0,0,0,.85), transparent)',
      }}>
        {['A', 'B'].map(s => (
          <button
            key={s}
            onClick={() => onSideChange(s)}
            disabled={!ready}
            style={{
              flex: 1, padding: '14px 0', border: 'none', cursor: ready ? 'pointer' : 'default',
              borderRadius: s === 'A' ? '10px 0 0 10px' : '0 10px 10px 0',
              background: side === s ? GRAD : 'rgba(255,255,255,.08)',
              color: side === s ? '#fff' : 'rgba(255,255,255,.55)',
              fontFamily: "'Pirata One',cursive", fontSize: 22, letterSpacing: '.08em',
              transition: 'background .18s ease, color .18s ease',
            }}
          >
            VERSION {s}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Barre de résultat ───────────────────────────────────────────────────────
function VerdictBar({ vf, vostfr, compact }) {
  const total = vf + vostfr
  const vfPct = total ? Math.round((vf / total) * 100) : 50
  return (
    <div style={{ width: '100%' }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        fontSize: compact ? 11 : 13, marginBottom: 6,
        color: 'rgba(255,255,255,.65)', letterSpacing: '.06em',
      }}>
        <span style={{ color: VF_COLOR, fontWeight: 700 }}>VF {vfPct}%</span>
        <span style={{ color: JA_COLOR, fontWeight: 700 }}>{100 - vfPct}% VOSTFR</span>
      </div>
      <div style={{
        height: compact ? 8 : 12, borderRadius: 99, overflow: 'hidden',
        background: JA_COLOR, border: '1px solid rgba(255,255,255,.12)',
      }}>
        <motion.div
          animate={{ width: `${vfPct}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          style={{ height: '100%', background: VF_COLOR }}
        />
      </div>
    </div>
  )
}

// ── Page ────────────────────────────────────────────────────────────────────
export default function DoublagePage() {
  const [stats, setStats]       = useState(loadStats)
  const [deck, setDeck]         = useState(buildDeck)
  const [index, setIndex]       = useState(0)
  const [side, setSide]         = useState('A')
  const [revealed, setReveal]   = useState(null) // 'vf' | 'vostfr' — le camp voté
  const [session, setSession]   = useState({ vf: 0, vostfr: 0 })
  const [finished, setFinished] = useState(false)
  const [started, setStarted]   = useState(false)

  const entry = deck[index]

  // L'extrait vient du catalogue (fenêtre de dialogue repérée dans les
  // sous-titres) ; seul le camp A reste tiré au sort, pour voter à l'aveugle.
  const round = useMemo(() => {
    if (!entry) return null
    return {
      ...entry.scene,
      clip:  entry.clip,
      sideA: Math.random() < 0.5 ? 'vf' : 'vostfr',
    }
  }, [entry])

  useEffect(() => { setSide('A'); setReveal(null) }, [index])

  function vote(votedSide) {
    if (revealed || !round) return
    const camp = votedSide === 'A' ? round.sideA : (round.sideA === 'vf' ? 'vostfr' : 'vf')
    setReveal(camp)
    setSession(s => ({ ...s, [camp]: s[camp] + 1 }))
    const next = { ...stats, [camp]: stats[camp] + 1 }
    setStats(next)
    saveStats(next)
  }

  function nextRound() {
    if (index + 1 >= deck.length) {
      const next = { ...stats, sessions: stats.sessions + 1 }
      setStats(next); saveStats(next)
      setFinished(true)
      return
    }
    setIndex(i => i + 1)
  }

  function restart() {
    setDeck(buildDeck())
    setIndex(0); setSession({ vf: 0, vostfr: 0 }); setFinished(false); setReveal(null)
  }

  // Un média injoignable (fichier retiré de R2) ne doit pas bloquer la manche :
  // on remplace l'épisode par un autre au lieu de laisser un écran noir.
  function replaceBrokenScene() {
    if (revealed) return
    setDeck(current => {
      const ids = new Set(current.map(r => r.scene.id))
      const candidates = DOUBLAGE_SCENES.filter(s => !ids.has(s.id))
      if (!candidates.length) return current
      const scene = pick(candidates)
      const next = [...current]
      next[index] = { scene, clip: pick(scene.clips) }
      return next
    })
  }

  // ── Écran de fin ──────────────────────────────────────────────────────────
  if (finished) {
    const total = session.vf + session.vostfr
    const vfPct = total ? Math.round((session.vf / total) * 100) : 50
    const team  = vfPct > 50 ? 'VF' : vfPct < 50 ? 'VOSTFR' : 'NEUTRE'
    const pct   = vfPct > 50 ? vfPct : 100 - vfPct

    return (
      <div style={{ minHeight: '100vh', background: BG, padding: '90px 20px 60px' }}>
        <style>{CSS}</style>
        <div style={{ maxWidth: 620, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: 13, letterSpacing: '.2em', color: 'rgba(255,255,255,.4)' }}>
            VERDICT DE LA SESSION
          </div>
          <div style={{
            fontFamily: "'Pirata One',cursive", fontSize: 64, lineHeight: 1.1, margin: '14px 0 6px',
            background: GRAD, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            TEAM {team}
          </div>
          {vfPct !== 50 && (
            <div style={{ color: 'rgba(255,255,255,.6)', fontSize: 18, marginBottom: 30 }}>
              {pct}% de tes votes à l'aveugle
            </div>
          )}

          <div style={{
            padding: 22, borderRadius: 16, marginBottom: 24,
            background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)',
          }}>
            <VerdictBar vf={session.vf} vostfr={session.vostfr} />
            <div style={{ marginTop: 18, fontSize: 12, color: 'rgba(255,255,255,.4)' }}>
              Depuis le début : {stats.vf} votes VF · {stats.vostfr} votes VOSTFR
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={restart} style={{
              padding: '14px 30px', borderRadius: 12, border: 'none', cursor: 'pointer',
              background: GRAD, color: '#fff', fontSize: 15, fontWeight: 700,
            }}>
              Rejouer {ROUNDS} scènes
            </button>
            <Link to="/tournoi" style={{
              padding: '14px 30px', borderRadius: 12, textDecoration: 'none',
              background: 'rgba(255,255,255,.06)', color: 'rgba(255,255,255,.8)',
              fontSize: 15, border: '1px solid rgba(255,255,255,.1)',
            }}>
              Retour aux tournois
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!round) return null

  return (
    <div style={{ minHeight: '100vh', background: BG, padding: '90px 16px 60px' }}>
      <style>{CSS}</style>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>

        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <Link to="/tournoi" style={{
            fontSize: 11, letterSpacing: '.18em', color: 'rgba(255,255,255,.35)', textDecoration: 'none',
          }}>
            ← TOURNOIS
          </Link>
          <h1 style={{
            fontFamily: "'Pirata One',cursive", fontSize: 46, margin: '10px 0 4px',
            background: GRAD, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            Guerre du Doublage
          </h1>
          <p style={{ color: 'rgba(255,255,255,.45)', fontSize: 14, margin: 0 }}>
            Même scène, deux doublages. Bascule, écoute, vote à l'aveugle.
          </p>
        </div>

        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 12, fontSize: 12, color: 'rgba(255,255,255,.45)',
        }}>
          <span>MANCHE {index + 1} / {deck.length}</span>
          <span style={{ color: 'rgba(255,255,255,.28)' }}>
            {revealed
              ? `${round.anime} · ${round.season}E${round.episode} — ${round.title}`
              : `Scène de ${Math.round(round.clip.endAt - round.clip.startAt)}s · ${round.clip.lines} répliques`}
          </span>
        </div>

        <DualTrackPlayer
          key={`${round.id}-${round.clip.startAt}`}
          scene={round}
          side={side}
          onSideChange={setSide}
          startAt={round.clip.startAt}
          endAt={round.clip.endAt}
          started={started}
          onStart={() => setStarted(true)}
          onMediaError={replaceBrokenScene}
        />

        <AnimatePresence mode="wait">
          {!revealed ? (
            <motion.div
              key="vote"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ marginTop: 18 }}
            >
              <div style={{
                textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,.5)', marginBottom: 12,
              }}>
                Quel doublage rend le mieux sur cette scène ?
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                {['A', 'B'].map(s => (
                  <button key={s} onClick={() => vote(s)} style={{
                    flex: 1, padding: '18px 0', borderRadius: 12, cursor: 'pointer',
                    background: 'rgba(255,255,255,.05)', color: '#fff',
                    border: '1px solid rgba(255,255,255,.14)',
                    fontFamily: "'Pirata One',cursive", fontSize: 26, letterSpacing: '.06em',
                  }}>
                    JE VOTE {s}
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="reveal"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              style={{ marginTop: 18, textAlign: 'center' }}
            >
              <div style={{
                fontFamily: "'Pirata One',cursive", fontSize: 34,
                color: revealed === 'vf' ? VF_COLOR : JA_COLOR,
              }}>
                Tu as voté {revealed === 'vf' ? 'VF' : 'VOSTFR'}
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,.45)', marginTop: 4, marginBottom: 18 }}>
                Version A = {round.sideA === 'vf' ? 'VF' : 'VOSTFR'} ·
                {' '}Version B = {round.sideA === 'vf' ? 'VOSTFR' : 'VF'}
              </div>

              <div style={{ maxWidth: 420, margin: '0 auto 20px' }}>
                <VerdictBar vf={session.vf} vostfr={session.vostfr} compact />
              </div>

              <button onClick={nextRound} style={{
                padding: '14px 36px', borderRadius: 12, border: 'none', cursor: 'pointer',
                background: GRAD, color: '#fff', fontSize: 15, fontWeight: 700,
              }}>
                {index + 1 >= deck.length ? 'Voir le verdict' : 'Scène suivante'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div style={{
          marginTop: 34, fontSize: 11, color: 'rgba(255,255,255,.25)', textAlign: 'center', lineHeight: 1.7,
        }}>
          {CLIP_TOTAL} extraits sur {DOUBLAGE_SCENES.length} épisodes · scènes repérées dans les
          sous-titres, jamais un générique ni un silence
          <br />
          Les deux versions jouent au même instant : seuls la piste audio et le doublage changent.
        </div>
      </div>
    </div>
  )
}
