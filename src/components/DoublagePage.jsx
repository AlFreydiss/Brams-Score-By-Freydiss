import { useState, useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { DOUBLAGE_SCENES } from '../data/doublage-data.js'
import { DOUBLAGE_SUBS } from '../data/doublage-subs.js'
import { loadCues, cueAt } from '../lib/vttCues.js'
import { corsUrl } from '../lib/audioBoost.js'
import DoublageBackdrop, { SIDE_A, SIDE_B } from './tournament/DoublageBackdrop.jsx'
import ArenaField from './tournament/ArenaField.jsx'

// ── Guerre du Doublage ──────────────────────────────────────────────────────
// Une manche = un extrait de dialogue, joué deux fois : la piste française et
// la piste japonaise du même épisode (résolues côté script de génération, voir
// scripts/gen-doublage-catalog.mjs). Les deux vidéos sont chargées sur le MÊME
// instant, donc basculer de A à B ne change que le doublage.
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
const SUBS_KEY  = 'brams_doublage_subs'

// Nombre total d'extraits, tous épisodes confondus (affiché en pied de page).
const CLIP_TOTAL = DOUBLAGE_SCENES.reduce((n, s) => n + s.clips.length, 0)

const CSS = `
  @keyframes dbPulse { 0%,100%{opacity:.55} 50%{opacity:1} }
  /* Pas de clavier physique sous le doigt : on masque le rappel des touches. */
  @media (hover: none) and (pointer: coarse) { .db-keys { display:none } }
  @media (max-width: 560px) { .db-keys { display:none } }
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
  // onError vient du parent et change d'identité à chaque rendu : le garder
  // dans les dépendances détruirait et recréerait l'instance hls.js en boucle.
  const errorRef = useRef(onError)
  useEffect(() => { errorRef.current = onError }, [onError])

  useEffect(() => {
    const video = ref.current
    if (!video || !url || !needsHlsJs(url)) return
    const fail = () => errorRef.current?.()

    let hls = null
    let cancelled = false

    import('hls.js').then(({ default: Hls }) => {
      if (cancelled || !video.isConnected) return
      if (!Hls.isSupported()) { fail(); return }
      // startPosition évite de télécharger l'épisode depuis le début pour un
      // extrait qui commence à 13 minutes.
      hls = new Hls({ enableWorker: true, maxBufferLength: 30, backBufferLength: 10, startPosition: startAt })
      hls.attachMedia(video)
      hls.on(Hls.Events.MEDIA_ATTACHED, () => hls.loadSource(url))
      hls.on(Hls.Events.ERROR, (_evt, data) => {
        if (!data?.fatal) return
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad()
        else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError()
        else fail()
      })
    }).catch(() => fail())

    return () => {
      cancelled = true
      if (hls) { try { hls.destroy() } catch { /* déjà détruit */ } }
    }
  }, [ref, url, startAt])
}

// Épisodes regroupés par animé : My Hero Academia pèse à lui seul plus de la
// moitié des extraits, un tirage uniforme donnerait une session monochrome.
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
function DualTrackPlayer({ scene, side, onSideChange, startAt, endAt, started, onStart, onMediaError, replayRef, subsOn }) {
  const aRef = useRef(null)
  const bRef = useRef(null)
  const [ready, setReady] = useState(false)
  const [cue, setCue] = useState(null)

  const errorRef = useRef(onMediaError)
  useEffect(() => { errorRef.current = onMediaError }, [onMediaError])

  // scene.sideA vaut 'vf' ou 'vostfr' : le tirage au sort vient du parent.
  const srcA = scene.sideA === 'vf' ? scene.vf : scene.vostfr
  const srcB = scene.sideA === 'vf' ? scene.vostfr : scene.vf

  // Les épisodes HLS (la majorité) ne se lisent pas via l'attribut src.
  useHlsSource(aRef, srcA, startAt, onMediaError)
  useHlsSource(bRef, srcB, startAt, onMediaError)

  // Positionne les deux pistes sur le même instant.
  //
  // Un simple seek sur `loadedmetadata` ne suffit pas : sur un gros fichier
  // (un film de 35 min) le seek peut être avalé et la piste reste à 0, ce qui
  // laissait l'écran de chargement à vie. On réapplique donc la position tant
  // qu'elle n'a pas pris, et on ne déclare prêt que quand LES DEUX pistes sont
  // réellement au bon endroit.
  useEffect(() => {
    const a = aRef.current, b = bRef.current
    if (!a || !b) return

    let done = false
    const deadline = Date.now() + 25000

    // On vise startAt par défaut : en HLS la durée vaut encore NaN ou Infinity
    // au début, et retomber sur 0 ferait démarrer l'extrait au tout début de
    // l'épisode. On ne dévie que si la piste est plus courte que l'extrait.
    const targetFor = el => {
      const d = el.duration
      return (Number.isFinite(d) && d > 0 && d <= startAt + 5) ? Math.max(0, d / 2) : startAt
    }

    const tick = () => {
      if (done) return
      let placed = 0
      for (const el of [a, b]) {
        if (el.readyState < 1) continue          // métadonnées pas encore là
        const want = targetFor(el)
        if (Math.abs(el.currentTime - want) > 1.5) {
          if (!el.seeking) { try { el.currentTime = want } catch { /* pas encore seekable */ } }
          continue
        }
        placed++
      }
      if (placed === 2) { done = true; setReady(true); return }
      // Une piste qui ne se cale jamais (média retiré, épisode illisible) :
      // on passe à une autre scène plutôt que de bloquer la manche.
      if (Date.now() > deadline) { done = true; errorRef.current?.() }
    }

    const id = setInterval(tick, 250)
    tick()
    return () => { done = true; clearInterval(id) }
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

  // Relecture manuelle de l'extrait, exposée au parent (bouton + touche R).
  useEffect(() => {
    if (!replayRef) return
    replayRef.current = () => {
      for (const el of [aRef.current, bRef.current]) {
        if (!el) continue
        try { el.currentTime = startAt } catch { /* pas encore seekable */ }
        el.play().catch(() => {})
      }
    }
    return () => { replayRef.current = null }
  }, [replayRef, startAt])

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

  // ── Sous-titres ───────────────────────────────────────────────────────────
  // Le fichier est celui de la VOSTFR, mais il est calé sur le même montage que
  // la VF : la même ligne tombe au même instant sur les deux pistes. On l'affiche
  // donc quel que soit le camp écouté — ça n'indique pas laquelle est laquelle,
  // et ça permet de suivre la scène quand on écoute la version japonaise.
  useEffect(() => {
    if (!subsOn || !started) { setCue(null); return }
    let alive = true
    let raf = 0
    let cues = []

    loadCues(DOUBLAGE_SUBS[scene.id]).then(list => { if (alive) cues = list })

    let shown = null
    function tick() {
      const el = side === 'A' ? aRef.current : bRef.current
      if (el && cues.length) {
        const found = cueAt(cues, el.currentTime)
        // On ne repasse par setState que quand la réplique change vraiment.
        if (found !== shown) { shown = found; setCue(found) }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => { alive = false; cancelAnimationFrame(raf) }
  }, [subsOn, started, scene.id, side])

  return (
    <div style={{
      position: 'relative', width: '100%', aspectRatio: '16 / 9',
      borderRadius: 16, overflow: 'hidden', background: '#000',
      // Le cadre prend la couleur du camp qu'on écoute : on sait toujours où on
      // en est sans lire les boutons.
      border: `1px solid ${side === 'A' ? SIDE_A.glow : SIDE_B.glow}55`,
      boxShadow: `0 0 46px -12px ${side === 'A' ? SIDE_A.glow : SIDE_B.glow}66`,
      transition: 'border-color .3s ease, box-shadow .3s ease',
    }}>
      <video
        ref={aRef} src={mediaSrc(srcA)} crossOrigin="anonymous"
        playsInline preload="metadata" muted
        onError={onMediaError}
        style={videoStyle(side === 'A')}
      />
      <video
        ref={bRef} src={mediaSrc(srcB)} crossOrigin="anonymous"
        playsInline preload="metadata" muted
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
            fontFamily: "'Pirata One',cursive",
            // Taille fixe, le libellé touchait les bords sur un écran de 390 px.
            fontSize: 'clamp(17px,4.6vw,30px)', letterSpacing: '.06em',
            padding: '0 12px', textAlign: 'center',
          }}
        >
          ▶ LANCER LA COMPARAISON
        </button>
      )}

      {/* Sous-titres — posés au-dessus de la bascule A/B, jamais dessous. */}
      {subsOn && cue && started && (
        <div style={{
          position: 'absolute', left: '4%', right: '4%', bottom: 78,
          textAlign: 'center', pointerEvents: 'none', zIndex: 3,
        }}>
          <span style={{
            display: 'inline-block',
            padding: '7px 15px', borderRadius: 8,
            background: 'rgba(0,0,0,.62)',
            backdropFilter: 'blur(3px)',
            color: '#fff',
            fontSize: 'clamp(14px,1.6vw,20px)', lineHeight: 1.42, fontWeight: 600,
            // Ombre portée plutôt qu'un contour : lisible sur un plan clair
            // comme sur un plan sombre, sans écraser l'image.
            textShadow: '0 2px 6px rgba(0,0,0,.95), 0 0 2px rgba(0,0,0,.9)',
            whiteSpace: 'pre-line',
          }}>
            {cue.text}
          </span>
        </div>
      )}

      {/* Bascule A / B : le geste central du jeu, gros et toujours atteignable. */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        display: 'flex', gap: 2, padding: 10,
        background: 'linear-gradient(to top, rgba(0,0,0,.85), transparent)',
      }}>
        {['A', 'B'].map(s => {
          const camp = s === 'A' ? SIDE_A : SIDE_B
          const on = side === s
          return (
            <button
              key={s}
              onClick={() => onSideChange(s)}
              disabled={!ready}
              style={{
                flex: 1, padding: '14px 0', cursor: ready ? 'pointer' : 'default',
                borderRadius: s === 'A' ? '10px 0 0 10px' : '0 10px 10px 0',
                border: `1px solid ${on ? camp.glow : 'rgba(255,255,255,.12)'}`,
                // Chaque version a sa couleur, mais aucune ne trahit la VF :
                // le camp A/B est retiré au sort à chaque manche.
                background: on
                  ? `linear-gradient(135deg, ${camp.base}, ${camp.glow}44)`
                  : 'rgba(255,255,255,.05)',
                color: on ? '#fff' : 'rgba(255,255,255,.5)',
                textShadow: on ? `0 0 18px ${camp.glow}` : 'none',
                fontFamily: "'Pirata One',cursive", fontSize: 22, letterSpacing: '.08em',
                transition: 'background .25s ease, color .25s ease, border-color .25s ease',
              }}
            >
              VERSION {s}
            </button>
          )
        })}
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
  // Un vote par manche, pour la frise de progression en haut de page.
  const [history, setHistory]   = useState([])
  // Temps d'écoute par camp : voter sans avoir entendu les deux n'a pas de sens,
  // on le signale au lieu de laisser passer.
  const [heard, setHeard]       = useState({ A: 0, B: 0 })
  // Préférence de sous-titres, gardée d'une session à l'autre.
  const [subsOn, setSubsOn]     = useState(() => {
    try { return localStorage.getItem(SUBS_KEY) !== '0' } catch { return true }
  })
  const replayRef               = useRef(null)

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

  useEffect(() => { setSide('A'); setReveal(null); setHeard({ A: 0, B: 0 }) }, [index])

  useEffect(() => {
    try { localStorage.setItem(SUBS_KEY, subsOn ? '1' : '0') } catch {}
  }, [subsOn])

  // Compte le temps passé sur chaque version pendant l'écoute.
  useEffect(() => {
    if (!started || revealed) return
    const id = setInterval(() => setHeard(h => ({ ...h, [side]: h[side] + 250 })), 250)
    return () => clearInterval(id)
  }, [started, revealed, side])

  // Raccourcis clavier : comparer sans lâcher le clavier va beaucoup plus vite.
  useEffect(() => {
    const onKey = e => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      const k = e.key.toLowerCase()
      if (k === 'a') setSide('A')
      if (k === 'b') setSide('B')
      if (k === 'r') replayRef.current?.()
      if (k === 's') setSubsOn(v => !v)
      if (k === '1') vote('A')
      if (k === '2') vote('B')
      if (k === 'enter' && revealed) nextRound()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  function vote(votedSide) {
    if (revealed || !round) return
    const camp = votedSide === 'A' ? round.sideA : (round.sideA === 'vf' ? 'vostfr' : 'vf')
    setReveal(camp)
    setHistory(h => [...h, camp])
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
    setHistory([]); setHeard({ A: 0, B: 0 })
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
      <div style={{ minHeight: '100vh', background: BG, padding: '90px 20px 60px', position: 'relative' }}>
        <style>{CSS}</style>
        {/* Le fond garde la couleur du camp majoritaire de la session. */}
        <DoublageBackdrop side={vfPct >= 50 ? 'A' : 'B'} revealed={vfPct > 50 ? 'vf' : vfPct < 50 ? 'vostfr' : null} started />
        {/* Champ d'énergie commun aux pages de tournoi, teinté du camp gagnant. */}
        <ArenaField
          accentA={vfPct >= 50 ? SIDE_A.glow : SIDE_B.glow}
          accentB={vfPct >= 50 ? SIDE_B.glow : SIDE_A.glow}
          density={0.6}
          zIndex={0}
        />
        <div style={{ maxWidth: 620, margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 13, letterSpacing: '.2em', color: 'rgba(255,255,255,.4)' }}>
            VERDICT DE LA SESSION
          </div>
          {/* Ici la couleur a un sens : le camp est révélé. Le verdict prend
              donc celle du camp gagnant, comme le fond derrière lui. */}
          <div style={{
            fontFamily: "'Pirata One',cursive", fontSize: 'clamp(44px,9vw,70px)', lineHeight: 1.08,
            margin: '14px 0 6px',
            background: team === 'NEUTRE'
              ? 'linear-gradient(180deg,#ffffff,#a9a2bb)'
              : `linear-gradient(180deg,#ffffff 0%, ${team === 'VF' ? SIDE_B.glow : SIDE_A.glow} 100%)`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text', color: 'transparent',
            filter: `drop-shadow(0 0 30px ${team === 'VF' ? SIDE_B.glow : SIDE_A.glow}4d)`,
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

  // Couleur du camp actuellement écouté : sert au titre, au filet et au champ.
  const campGlow = side === 'A' ? SIDE_A.glow : SIDE_B.glow

  return (
    <div style={{ minHeight: '100vh', background: BG, padding: '90px 16px 60px', position: 'relative' }}>
      <style>{CSS}</style>
      <DoublageBackdrop side={side} revealed={revealed} started={started} />
      {/* Le champ suit le camp qui parle : l'accent bascule avec `side`. */}
      <ArenaField
        accentA={side === 'A' ? SIDE_A.glow : SIDE_B.glow}
        accentB={side === 'A' ? SIDE_B.glow : SIDE_A.glow}
        density={0.6}
        zIndex={0}
      />
      <div style={{ maxWidth: 860, margin: '0 auto', position: 'relative', zIndex: 1 }}>

        {/* Entrée en fondu montant, comme les sections du portfolio. */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }}
          style={{ textAlign: 'center', marginBottom: 22 }}
        >
          <Link to="/tournoi" style={{
            fontSize: 11, letterSpacing: '.18em', color: 'rgba(255,255,255,.35)', textDecoration: 'none',
          }}>
            ← TOURNOIS
          </Link>
          {/* Le titre est volontairement NEUTRE. En rose il portait la couleur
              du camp B, sur un fond qui prend celle du camp écouté : deux
              chromas concurrents, et un titre qui semblait prendre parti. Ici
              il reste blanc, et le seul accent coloré de la page est celui du
              camp qu'on écoute — porté par le halo et le filet sous le titre. */}
          {/* Le titre est en inline-block (pour que le halo colle aux glyphes),
              il lui faut donc sa propre ligne : sinon il remonte à côté du lien
              de retour, qui est inline. */}
          <div>
          <h1 style={{
            position: 'relative', display: 'inline-block',
            fontFamily: "'Pirata One',cursive",
            fontSize: 'clamp(38px,6vw,58px)', margin: '12px 0 10px',
            lineHeight: 1.02, letterSpacing: '.01em',
            background: 'linear-gradient(180deg,#ffffff 0%,#e8e4ef 46%,#a9a2bb 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text', color: 'transparent',
            filter: `drop-shadow(0 0 26px ${campGlow}59) drop-shadow(0 2px 2px rgba(0,0,0,.6))`,
            transition: 'filter .45s ease',
          }}>
            Guerre du Doublage
          </h1>
          </div>
          {/* Filet lumineux : la seule couleur du bloc titre, et elle bascule
              avec le camp — le fond, le cadre vidéo et lui disent la même chose. */}
          <div aria-hidden style={{
            width: 'min(280px, 62%)', height: 2, margin: '0 auto 12px', borderRadius: 2,
            background: `linear-gradient(90deg, transparent, ${campGlow}, transparent)`,
            boxShadow: `0 0 18px ${campGlow}80`,
            transition: 'background .45s ease, box-shadow .45s ease',
          }} />
          <p style={{ color: 'rgba(255,255,255,.5)', fontSize: 14, margin: 0 }}>
            Même scène, deux doublages. Bascule, écoute, vote à l'aveugle.
          </p>
        </motion.div>

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

        {/* Frise de session : chaque manche jouée se colore du camp voté, ce qui
            donne à voir sa propre tendance sans attendre le verdict final. */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
          {deck.map((_, i) => {
            const vote = history[i]
            return (
              <div key={i} style={{
                flex: 1, height: 4, borderRadius: 2,
                background: vote === 'vf' ? VF_COLOR
                  : vote === 'vostfr' ? JA_COLOR
                  : i === index ? 'rgba(255,255,255,.35)' : 'rgba(255,255,255,.08)',
                transition: 'background .35s ease',
              }} />
            )
          })}
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
          replayRef={replayRef}
          subsOn={subsOn}
        />

        {/* Barre de contrôle : relecture de l'extrait, équilibre d'écoute, et
            rappel des raccourcis. */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
          marginTop: 10, fontSize: 11, color: 'rgba(255,255,255,.4)',
        }}>
          <button
            onClick={() => replayRef.current?.()}
            style={{
              padding: '7px 14px', borderRadius: 9, cursor: 'pointer',
              background: 'rgba(255,255,255,.05)', color: 'rgba(255,255,255,.75)',
              border: '1px solid rgba(255,255,255,.12)', fontSize: 12,
            }}
          >
            ↺ Réécouter l'extrait
          </button>

          <button
            onClick={() => setSubsOn(v => !v)}
            aria-pressed={subsOn}
            style={{
              padding: '7px 14px', borderRadius: 9, cursor: 'pointer',
              background: subsOn ? 'rgba(255,255,255,.10)' : 'rgba(255,255,255,.03)',
              color: subsOn ? 'rgba(255,255,255,.85)' : 'rgba(255,255,255,.45)',
              border: `1px solid ${subsOn ? 'rgba(255,255,255,.26)' : 'rgba(255,255,255,.10)'}`,
              fontSize: 12,
            }}
          >
            {subsOn ? '▣ Sous-titres' : '□ Sous-titres'}
          </button>

          {/* Deux jauges qui montrent le temps passé de chaque côté. */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 200 }}>
            <span>écoute</span>
            {['A', 'B'].map(s => {
              const camp = s === 'A' ? SIDE_A : SIDE_B
              const total = heard.A + heard.B || 1
              return (
                <div key={s} style={{
                  flex: 1, height: 5, borderRadius: 3, overflow: 'hidden',
                  background: 'rgba(255,255,255,.07)',
                }}>
                  <div style={{
                    width: `${Math.round((heard[s] / total) * 100)}%`, height: '100%',
                    background: camp.glow, transition: 'width .3s linear',
                  }} />
                </div>
              )
            })}
          </div>

          {/* Les raccourcis n'ont rien à dire sur un écran tactile : ils y
              prenaient une ligne pour annoncer des touches absentes. */}
          <span className="db-keys" style={{ color: 'rgba(255,255,255,.25)' }}>
            A / B bascule · 1 / 2 vote · R réécoute · S sous-titres
          </span>
        </div>

        {/* Rappel discret quand on s'apprête à voter sans avoir entendu les deux. */}
        {!revealed && started && (heard.A < 2000 || heard.B < 2000) && (
          <div style={{
            marginTop: 8, fontSize: 12, textAlign: 'center',
            color: heard.A < 2000 && heard.B < 2000 ? 'rgba(255,255,255,.3)' : '#f0b429',
          }}>
            {heard.A < 2000 && heard.B < 2000
              ? 'Écoute les deux versions avant de trancher.'
              : `Tu n'as presque pas écouté la version ${heard.A < 2000 ? 'A' : 'B'}.`}
          </div>
        )}

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
                {['A', 'B'].map(s => {
                  const camp = s === 'A' ? SIDE_A : SIDE_B
                  return (
                    <button key={s} onClick={() => vote(s)} style={{
                      flex: 1, padding: '18px 0', borderRadius: 12, cursor: 'pointer',
                      background: `linear-gradient(135deg, ${camp.base}33, transparent)`,
                      color: '#fff', border: `1px solid ${camp.glow}55`,
                      textShadow: `0 0 16px ${camp.glow}88`,
                      fontFamily: "'Pirata One',cursive", fontSize: 26, letterSpacing: '.06em',
                      transition: 'background .2s ease, border-color .2s ease',
                    }}>
                      JE VOTE {s}
                    </button>
                  )
                })}
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
