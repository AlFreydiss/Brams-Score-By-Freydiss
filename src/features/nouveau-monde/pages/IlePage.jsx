// src/features/nouveau-monde/pages/IlePage.jsx
// Page d'île DATA-DRIVEN via islandById(param). Route nested : /nouveau-monde/:jeu
// (param ':jeu' = island.id). Bannière, modes (MODE_LABEL → Solo/Ami/Classé),
// bouton JOUER (téléport → navigate(island.route)), règles, classement de l'île,
// derniers matchs (api.js).

import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { islandById, MODE_LABEL } from '../data/islands'
import { getLeaderboard, getPlayerLog } from '../data/api'
import { useTeleport } from '../transition/TeleportTransition'
import { nm } from '../theme/tokens'

function formatBounty(n) {
  if (!n) return '—'
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)} Md ฿`
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)} M ฿`
  return `${Math.round(n).toLocaleString('fr-FR')} ฿`
}

// Îles disposant d'un univers de jeu autonome (route plein écran hors-monde).
const UNIVERSE = { echecs: '/jeux/echecs', dames: '/jeux/dames' }

const RULES = {
  echecs:       ['Mat le roi adverse pour la victoire.', 'Le mode Classé met ta prime ฿ en jeu (ELO).', 'Abandon = défaite et perte de prime.'],
  dames:        ['Capture toutes les pièces ou bloque l\'adversaire.', 'La dame se déplace en diagonale longue.', 'Prise multiple obligatoire.'],
  fredisu:      ['Frappe les cercles en rythme.', 'Combo = multiplicateur de prime.', 'Précision : 300 / 100 / 50 / raté.'],
  'blind-test': ['Reconnais l\'opening le plus vite.', 'Plus tu réponds tôt, plus la prime monte.', 'Pénalité sur mauvaise réponse.'],
  'brams-phone':['Dessine puis devine en chaîne.', 'Mode Ami uniquement (lobby privé).', 'Le délire collectif fait la prime.'],
  'brams-arena':['Survis aux vagues d\'ennemis.', 'Score = prime convertie.', 'Power-ups répartis sur la carte.'],
}

function ModeButton({ mode, accent, onPlay }) {
  const cfg = MODE_LABEL[mode]
  if (!cfg) return null
  const isRanked = mode === 'classe'
  return (
    <motion.button
      type="button"
      whileHover={{ y: -3 }} whileTap={{ scale: 0.97 }}
      onClick={(e) => onPlay(mode, e)}
      style={{
        flex: '1 1 160px', textAlign: 'left', cursor: 'pointer', minHeight: 64,
        padding: nm.space.md, borderRadius: nm.radius.md,
        border: `1px solid ${isRanked ? nm.color.gold + '88' : nm.color.mist}`,
        background: isRanked
          ? `linear-gradient(135deg, ${nm.color.goldDeep}33, rgba(6,20,31,0.7))`
          : 'rgba(6,20,31,0.55)',
        color: nm.color.foam, ...nm.type.button,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: isRanked ? nm.color.goldHi : accent }} />
        <span style={{ fontWeight: 700 }}>{cfg.label}</span>
      </div>
      <div style={{ ...nm.type.small, color: nm.color.foamDim, marginTop: 4 }}>{cfg.hint}</div>
    </motion.button>
  )
}

export default function IlePage() {
  const { jeu } = useParams()
  const navigate = useNavigate()
  const { teleport } = useTeleport()
  const island = useMemo(() => islandById(jeu), [jeu])
  const [board, setBoard] = useState(null)
  const [matches, setMatches] = useState(null)

  useEffect(() => {
    if (!island) return
    let alive = true
    ;(async () => {
      const b = await getLeaderboard(island.ratingKey, 'week')
      if (alive) setBoard(b)
      const log = await getPlayerLog('873117504367648798') // placeholder : derniers matchs de l'île
      if (alive) setMatches((log?.history || []).filter((h) => h.island === island.id).slice(0, 5))
    })()
    return () => { alive = false }
  }, [island])

  if (!island) {
    return (
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', padding: nm.space.xl }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ ...nm.type.posterTitle, color: nm.color.parchment }}>Île introuvable</div>
          <Link to="/nouveau-monde" style={{ ...nm.type.button, color: nm.color.goldHi, textDecoration: 'none' }}>← Retour à la carte</Link>
        </div>
      </div>
    )
  }

  // Échecs/Dames ont leur univers autonome plein écran (2D sobre) → on SORT du monde
  // vers /jeux/* (les univers sont fixed inset:0 z-50, pas embarquables). Morph depuis
  // le bouton cliqué + playMode présélectionné. Les autres jeux restent embarqués.
  const onPlay = (mode, e) => {
    if (island.status !== 'live') return
    if (UNIVERSE[island.id]) {
      const r = e?.currentTarget?.getBoundingClientRect?.()
      const gameOrigin = r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null
      navigate(UNIVERSE[island.id], { state: { gameOrigin, playMode: mode } })
      return
    }
    // On reste DANS le monde : accostage = route /jouer embarquée (le jeu se charge sous la
    // nav du Nouveau Monde). La transition douce du layout suffit (pas de gros téléport in-world).
    navigate(`/nouveau-monde/${island.id}/jouer${mode ? `?mode=${mode}` : ''}`)
  }

  return (
    <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', padding: `0 ${nm.space.xl} ${nm.space.xxl}` }}>
      <div style={{ maxWidth: 1120, margin: '0 auto', display: 'grid', gap: nm.space.lg, gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', alignItems: 'start' }}>

        {/* ── Colonne principale ──────────────────────────────────────────── */}
        <div style={{ display: 'grid', gap: nm.space.lg, minWidth: 0 }}>
          {/* Bannière */}
          <motion.div
            initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: nm.motion.easeOut }}
            style={{
              position: 'relative', overflow: 'hidden', borderRadius: nm.radius.lg,
              padding: nm.space.xl, marginTop: nm.space.md,
              background: island.art
                ? `linear-gradient(135deg, ${island.accent}22, rgba(6,20,31,0.74) 52%, rgba(6,20,31,0.95)), url(${island.art}) right center/cover`
                : `linear-gradient(135deg, ${island.accent}28, rgba(6,20,31,0.92)), ${nm.color.deepSea}`,
              minHeight: 240,
              border: `1px solid ${island.accent}55`, boxShadow: nm.shadow.island,
            }}
          >
            <div style={{ ...nm.type.eyebrow, color: nm.color.goldHi }}>Île · {island.ratingKey}</div>
            <h1 style={{ ...nm.type.hero, color: nm.color.foam, margin: '6px 0 8px' }}>{island.title}</h1>
            <p style={{ ...nm.type.body, color: nm.color.foamDim, margin: 0 }}>{island.tagline}</p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: nm.space.sm, marginTop: nm.space.lg }}>
              {island.modes.map((m) => (
                <ModeButton key={m} mode={m} accent={island.accent} onPlay={onPlay} />
              ))}
            </div>

            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={(e) => onPlay(island.modes[0], e)}
              style={{
                marginTop: nm.space.lg, width: '100%', cursor: 'pointer', minHeight: 52,
                padding: '14px 22px', borderRadius: nm.radius.pill, border: 'none',
                background: `linear-gradient(135deg, ${nm.color.goldHi}, ${nm.color.gold})`,
                color: nm.color.abyss, fontFamily: nm.fonts.display, fontWeight: 800,
                fontSize: '1.1rem', letterSpacing: '0.02em', boxShadow: nm.shadow.goldGlow,
              }}
            >
              ⚔ JOUER — Accoster sur {island.title}
            </motion.button>
          </motion.div>

          {/* Règles */}
          <section style={{
            borderRadius: nm.radius.lg, padding: nm.space.lg,
            background: `linear-gradient(160deg, ${nm.color.parchment}, ${nm.color.parchmentDim})`,
            color: nm.color.ink, boxShadow: nm.shadow.card,
          }}>
            <div style={{ ...nm.type.posterTitle, fontSize: '1.2rem', color: nm.color.ink, marginBottom: nm.space.sm }}>Le Code de l'île</div>
            <ul style={{ margin: 0, paddingLeft: '1.1rem', display: 'grid', gap: 6 }}>
              {(RULES[island.id] || ['Rejoins une partie et fais grimper ta prime.']).map((r, i) => (
                <li key={i} style={{ ...nm.type.body, color: nm.color.ink }}>{r}</li>
              ))}
            </ul>
          </section>
        </div>

        {/* ── Colonne droite : classement + derniers matchs ───────────────── */}
        <div style={{ display: 'grid', gap: nm.space.lg, minWidth: 0, marginTop: nm.space.md }}>
          <section style={{
            borderRadius: nm.radius.lg, padding: nm.space.lg,
            background: 'rgba(6,20,31,0.6)', border: `1px solid ${nm.color.mist}`,
            backdropFilter: 'blur(8px)',
          }}>
            <div style={{ ...nm.type.eyebrow, color: nm.color.goldHi, marginBottom: nm.space.sm }}>Avis de recherche · {island.title}</div>
            {!board ? (
              <Skeleton rows={5} />
            ) : (
              <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
                {board.slice(0, 6).map((p, i) => (
                  <li key={p.uid} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 10px', borderRadius: nm.radius.md,
                    background: i === 0 ? `${nm.color.gold}22` : 'rgba(234,243,244,0.03)',
                    border: i === 0 ? `1px solid ${nm.color.gold}66` : '1px solid transparent',
                  }}>
                    <span style={{ width: 22, textAlign: 'center', fontWeight: 800, color: i === 0 ? nm.color.goldHi : nm.color.foamDim }}>{i + 1}</span>
                    <span style={{ flex: 1, color: nm.color.foam, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                    <span style={{ color: nm.color.goldHi, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{formatBounty(p.bounty)}</span>
                  </li>
                ))}
              </ol>
            )}
            <Link to="/nouveau-monde/classements" style={{ ...nm.type.small, color: nm.color.foamDim, display: 'inline-block', marginTop: nm.space.sm, textDecoration: 'none' }}>
              Voir tous les avis de recherche →
            </Link>
          </section>

          <section style={{
            borderRadius: nm.radius.lg, padding: nm.space.lg,
            background: 'rgba(6,20,31,0.6)', border: `1px solid ${nm.color.mist}`,
          }}>
            <div style={{ ...nm.type.eyebrow, color: nm.color.foamDim, marginBottom: nm.space.sm }}>Derniers abordages</div>
            {!matches ? <Skeleton rows={3} /> : matches.length === 0 ? (
              <div style={{ ...nm.type.small, color: nm.color.foamDim }}>Aucun match récent sur cette île.</div>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 6 }}>
                {matches.map((m) => (
                  <li key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, ...nm.type.small }}>
                    <span style={{ color: m.result === 'win' ? nm.color.win : nm.color.danger, fontWeight: 700 }}>
                      {m.result === 'win' ? 'Victoire' : 'Défaite'}
                    </span>
                    <span style={{ color: nm.color.foamDim }}>vs {m.opponent}</span>
                    <span style={{ marginLeft: 'auto', color: m.result === 'win' ? nm.color.goldHi : nm.color.foamDim }}>{m.delta}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

function Skeleton({ rows = 4 }) {
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <motion.div key={i}
          animate={{ opacity: [0.35, 0.7, 0.35] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.1 }}
          style={{ height: 30, borderRadius: nm.radius.sm, background: 'rgba(234,243,244,0.06)' }}
        />
      ))}
    </div>
  )
}
