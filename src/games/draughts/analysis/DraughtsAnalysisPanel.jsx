// ── DraughtsAnalysisPanel : bilan de partie des Dames (post-partie) ──────────
// Pendant Dames de l'AnalysisPanel Échecs, en chrome dcc (accent bleu-acier) :
//   bouton « Analyser la partie » → barre de progression → chips de verdicts
//   (gaffes / imprécisions / bons / excellents), TOURNANT cliquable, graphe SVG
//   d'éval zéro-centré (aire Foncés au-dessus / Clairs en-dessous, markers
//   cliquables) et liste de coups annotée. Tout clic → onAller(idx) où idx est
//   l'index de REVUE existant de PlayTab (nb de plies affichés = ply + 1).
// Analyse = analyzeDraughts.js (recherche moteur par chunks, jamais de gel UI).
// Styles inline only. Respecte prefers-reduced-motion.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { fonts } from '../../../features/games/neutralTheme.js'
import { dcc } from '../ui/dcc.js'
import { P } from '../../../features/dames/engine/draughts-engine.js'
import { analyserPartie } from './analyzeDraughts.js'

// Verdicts (mêmes teintes que la review Échecs pour la cohérence inter-univers).
const COULEUR = {
  gaffe: dcc.danger,          // '??' rouge
  imprecision: '#e8a13a',     // '?'  orange
  bon: dcc.textDim,           //      neutre
  excellent: '#26c2a3',       // '!'  teal
}
const GLYPHE = { gaffe: '??', imprecision: '?', bon: '', excellent: '!' }
const CHIPS = [
  { key: 'gaffes', label: 'Gaffes', sym: '??', color: COULEUR.gaffe },
  { key: 'imprecisions', label: 'Imprécisions', sym: '?', color: COULEUR.imprecision },
  { key: 'bons', label: 'Bons', sym: '=', color: COULEUR.bon },
  { key: 'excellents', label: 'Excellents', sym: '!', color: COULEUR.excellent },
]

// Numéro de coup lisible : "12." pour un coup Foncé, "12…" pour la réplique Claire.
const numeroCoup = (ply, side) => `${Math.floor(ply / 2) + 1}${side === P ? '.' : '…'}`
// Éval centipions POV Foncés → texte "+1.2" (pions).
const evalTexte = (cp) => `${cp >= 0 ? '+' : '−'}${(Math.abs(cp) / 100).toFixed(1)}`

// ── Graphe d'éval zéro-centré (adapté d'EvalGraph Échecs) ────────────────────
// X = plies, Y = éval moteur (tanh(cp/200) → ±1 pion ≈ mi-hauteur). Aire au-dessus
// de 0 = avantage Foncés (teinte acier), en-dessous = Clairs (teinte claire).
// Markers cliquables sur gaffes/imprécisions, clic n'importe où = ply le plus
// proche via onSelect(ply), curseur vertical synchro revue, tooltip au survol.
const H = 92
const PAD_X = 5
const PAD_Y = 6
const FOND = '#1B1D1F'
const AIRE_FONCES = 'rgba(111,143,176,0.55)'   // dcc.accent — camp Foncé en haut
const AIRE_CLAIRS = 'rgba(232,230,224,0.82)'   // clair — camp Clair en bas

function GrapheEval({ plies, selPly, onSelect, accent, reduit }) {
  const wrapRef = useRef(null)
  const svgRef = useRef(null)
  const [w, setW] = useState(0)
  const [hoverPly, setHoverPly] = useState(null)
  const uid = useRef(`dga${Math.random().toString(36).slice(2, 8)}`).current

  const sansHover = typeof window !== 'undefined'
    && window.matchMedia?.('(hover: none)').matches

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const mesure = () => setW(el.clientWidth)
    mesure()
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(mesure)
      ro.observe(el)
      return () => ro.disconnect()
    }
    window.addEventListener('resize', mesure)
    return () => window.removeEventListener('resize', mesure)
  }, [])

  // Points : index 0 = position initiale (evalAvant du 1er coup), puis un point
  // par coup (evalApres, POV Foncés).
  const pts = useMemo(() => {
    const arr = [{ cp: plies[0]?.evalAvant ?? 0, p: null }]
    for (const p of plies) arr.push({ cp: p.evalApres, p })
    return arr
  }, [plies])

  const n = pts.length - 1
  const x = useCallback((idx) => PAD_X + (n ? idx / n : 0) * (w - 2 * PAD_X), [n, w])
  const yMid = H / 2
  // tanh(cp/200) : 1 pion (100) ≈ 46 % d'amplitude, une dame d'avance sature en douceur.
  const y = (cp) => yMid - Math.tanh(cp / 200) * (yMid - PAD_Y)

  const plyDepuisEvent = useCallback((e) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect || !n) return null
    const t = (e.clientX - rect.left - PAD_X) / Math.max(1, rect.width - 2 * PAD_X)
    const idx = Math.max(1, Math.min(n, Math.round(t * n)))
    return idx - 1
  }, [n])

  const clic = useCallback((e) => {
    const ply = plyDepuisEvent(e)
    if (ply != null) onSelect?.(ply)
  }, [plyDepuisEvent, onSelect])

  const survol = useCallback((e) => {
    if (sansHover || e.pointerType === 'touch') return
    setHoverPly(plyDepuisEvent(e))
  }, [sansHover, plyDepuisEvent])

  if (!n) return null

  const ligne = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.cp).toFixed(1)}`).join(' ')
  // Aire fermée sur la médiane 0 : remplie 2 fois (clip haut = Foncés, clip bas = Clairs).
  const aire = `M${x(0).toFixed(1)},${yMid} `
    + pts.map((p, i) => `L${x(i).toFixed(1)},${y(p.cp).toFixed(1)}`).join(' ')
    + ` L${x(n).toFixed(1)},${yMid} Z`

  const selIdx = (selPly != null && selPly >= 0 && selPly + 1 <= n) ? selPly + 1 : null
  const hov = (hoverPly != null && pts[hoverPly + 1]?.p) ? pts[hoverPly + 1] : null
  const hovX = hov ? x(hoverPly + 1) : 0
  const hovY = hov ? y(hov.cp) : 0

  return (
    <div
      ref={wrapRef}
      style={{
        position: 'relative', width: '100%', height: H,
        borderRadius: dcc.radius.md, border: `1px solid ${dcc.line}`,
        overflow: 'hidden', background: FOND,
        animation: reduit ? 'none' : 'dccBilanIn .4s ease-out',
      }}
    >
      {w > 0 && (
        <svg
          ref={svgRef}
          width={w} height={H} viewBox={`0 0 ${w} ${H}`}
          role="img" aria-label="Graphe d'évaluation : avantage Foncés en haut, Clairs en bas, coup par coup"
          style={{ display: 'block', cursor: 'pointer', touchAction: 'manipulation' }}
          onClick={clic}
          onPointerMove={survol}
          onPointerLeave={() => setHoverPly(null)}
        >
          <defs>
            <clipPath id={`${uid}h`}><rect x={0} y={0} width={w} height={yMid} /></clipPath>
            <clipPath id={`${uid}b`}><rect x={0} y={yMid} width={w} height={H - yMid} /></clipPath>
          </defs>

          {/* Aire au-dessus de 0 = avantage Foncés (acier), en-dessous = Clairs (clair). */}
          <path d={aire} fill={AIRE_FONCES} clipPath={`url(#${uid}h)`} />
          <path d={aire} fill={AIRE_CLAIRS} clipPath={`url(#${uid}b)`} />
          <path d={ligne} fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth={1} />

          {/* Médiane 0 (égalité). */}
          <line
            x1={0} x2={w} y1={yMid} y2={yMid}
            stroke="#8B8E92" strokeOpacity={0.55} strokeWidth={1} strokeDasharray="3 3"
          />

          {/* Ligne de survol (desktop). */}
          {hov && (
            <line x1={hovX} x2={hovX} y1={0} y2={H} stroke="rgba(255,255,255,0.25)" strokeWidth={1} />
          )}

          {/* Curseur vertical synchro revue. */}
          {selIdx != null && (
            <>
              <line x1={x(selIdx)} x2={x(selIdx)} y1={0} y2={H} stroke={accent} strokeWidth={1.5} />
              <circle
                cx={x(selIdx)} cy={y(pts[selIdx].cp)} r={3.5}
                fill={accent} stroke="#fff" strokeWidth={1.2}
              />
            </>
          )}

          {/* Markers cliquables : gaffes + imprécisions. */}
          {pts.map((pt, i) => {
            if (!i || !pt.p) return null
            const v = pt.p.verdict
            if (v !== 'gaffe' && v !== 'imprecision') return null
            const ply = pt.p.ply
            return (
              <circle
                key={ply}
                cx={x(i)} cy={y(pt.cp)} r={ply === selPly ? 5 : 4}
                fill={COULEUR[v]} stroke={FOND} strokeWidth={1.5}
                style={{ cursor: 'pointer' }}
                onClick={(e) => { e.stopPropagation(); onSelect?.(ply) }}
              >
                <title>{`${numeroCoup(ply, pt.p.side)} ${pt.p.notation} ${GLYPHE[v]}`}</title>
              </circle>
            )
          })}
        </svg>
      )}

      {/* Légende des camps (coins). */}
      <span aria-hidden style={{ position: 'absolute', top: 3, left: 6, font: `700 8.5px ${fonts.body}`, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', pointerEvents: 'none' }}>Foncés</span>
      <span aria-hidden style={{ position: 'absolute', bottom: 3, left: 6, font: `700 8.5px ${fonts.body}`, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(27,29,31,0.55)', pointerEvents: 'none' }}>Clairs</span>

      {/* Tooltip léger (n° + notation + éval en pions), desktop uniquement. */}
      {hov && (
        <div
          style={{
            position: 'absolute', pointerEvents: 'none', zIndex: 2,
            left: Math.max(56, Math.min(w - 56, hovX)),
            top: hovY < H / 2 ? Math.min(H - 26, hovY + 10) : Math.max(2, hovY - 30),
            transform: 'translateX(-50%)',
            padding: '3px 8px', borderRadius: 5, whiteSpace: 'nowrap',
            background: '#141618', border: `1px solid ${dcc.lineHi}`,
            font: `700 11px ${fonts.mono}`, color: dcc.text, fontVariantNumeric: 'tabular-nums',
            boxShadow: '0 6px 16px -8px rgba(0,0,0,0.7)',
          }}
        >
          {numeroCoup(hov.p.ply, hov.p.side)} {hov.p.notation}
          <span style={{ color: dcc.textMute }}> · {evalTexte(hov.cp)}</span>
        </div>
      )}
    </div>
  )
}

// ── Cellule de coup annotée (liste par paires, cliquable → revue) ────────────
function CoupCell({ p, actif, onClick, reduit }) {
  if (!p) return <span style={{ flex: 1 }} />
  const v = p.verdict
  const glyphe = GLYPHE[v]
  return (
    <button
      type="button"
      onClick={onClick}
      className="dcc-focus"
      title={v === 'gaffe' ? 'Gaffe' : v === 'imprecision' ? 'Imprécision' : v === 'excellent' ? 'Excellent' : 'Bon coup'}
      style={{
        flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-start',
        padding: '3px 7px', borderRadius: 5, cursor: 'pointer', border: 'none',
        background: actif ? `${dcc.accent}2e` : 'transparent',
        color: actif ? dcc.text : dcc.textDim,
        font: `${actif ? 700 : 600} 12.5px ${fonts.mono}`, fontVariantNumeric: 'tabular-nums',
        transition: reduit ? 'none' : 'background .12s',
      }}
      onMouseEnter={(e) => { if (!actif) e.currentTarget.style.background = dcc.panelHi }}
      onMouseLeave={(e) => { if (!actif) e.currentTarget.style.background = actif ? `${dcc.accent}2e` : 'transparent' }}
    >
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.notation}</span>
      {glyphe && <span style={{ color: COULEUR[v], font: `800 11.5px ${fonts.mono}`, flexShrink: 0 }}>{glyphe}</span>}
    </button>
  )
}

// ── Panneau bilan ─────────────────────────────────────────────────────────────
// props : { mvLog, rules, revueIdx, onAller(idx), accent }
//   revueIdx = index de revue de PlayTab (nb de plies affichés, null = live/final)
//   onAller  = setRevueIdx borné (le clic sur le coup `ply` envoie ply + 1)
export default function DraughtsAnalysisPanel({ mvLog = [], rules, revueIdx = null, onAller, accent = dcc.accent }) {
  const reduit = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  const [etat, setEtat] = useState('idle')     // 'idle' | 'run' | 'done' | 'erreur'
  const [pct, setPct] = useState(0)
  const [resultat, setResultat] = useState(null)
  const signalRef = useRef(null)
  // coupe une analyse en vol au démontage (nouvelle partie / retour menu).
  useEffect(() => () => { if (signalRef.current) signalRef.current.annule = true }, [])

  const lancer = useCallback(async () => {
    if (signalRef.current && !signalRef.current.annule) signalRef.current.annule = true
    const signal = { annule: false }
    signalRef.current = signal
    setEtat('run'); setPct(0)
    try {
      const res = await analyserPartie(mvLog, rules, { profondeur: 5, onProgress: setPct, signal })
      if (signal.annule) return
      if (!res || !res.plies.length) { setEtat('erreur'); return }
      setResultat(res); setEtat('done')
    } catch {
      if (!signal.annule) setEtat('erreur')
    }
  }, [mvLog, rules])

  // Coup « sélectionné » = dernier ply affiché par la revue existante.
  const selPly = revueIdx != null && revueIdx > 0 ? revueIdx - 1 : null
  const aller = useCallback((ply) => { onAller?.(ply + 1) }, [onAller])

  // paires (Foncé / Clair) pour la liste annotée.
  const paires = useMemo(() => {
    const plies = resultat?.plies || []
    const arr = []
    for (let i = 0; i < plies.length; i += 2) arr.push({ n: i / 2 + 1, fonce: plies[i], clair: plies[i + 1] })
    return arr
  }, [resultat])

  const tournant = resultat?.tournant || null

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 9,
      padding: '11px 12px', borderRadius: dcc.radius.sm,
      background: dcc.row, border: `1px solid ${dcc.line}`,
    }}>
      {!reduit && <style>{`@keyframes dccBilanIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}`}</style>}

      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <span aria-hidden style={{ width: 7, height: 7, borderRadius: 2, background: accent, boxShadow: `0 0 8px ${accent}` }} />
        <span style={{ font: `800 12px ${fonts.body}`, letterSpacing: '0.08em', textTransform: 'uppercase', color: accent }}>
          Bilan de partie
        </span>
      </div>

      {/* ── Idle / erreur : bouton de lancement ── */}
      {etat !== 'done' && (
        <>
          {etat === 'erreur' && (
            <p style={{ margin: 0, font: `400 11.5px ${fonts.body}`, color: '#e0a3a3', lineHeight: 1.45 }}>
              L’analyse a échoué — réessaie.
            </p>
          )}
          {etat === 'run' ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
                <span style={{ font: `600 11.5px ${fonts.body}`, color: dcc.textDim }}>Le moteur rejoue la partie…</span>
                <span style={{ font: `700 12px ${fonts.mono}`, color: accent, fontVariantNumeric: 'tabular-nums' }}>{pct}%</span>
              </div>
              <div
                role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}
                style={{ position: 'relative', height: 7, borderRadius: 4, overflow: 'hidden', background: dcc.panel, border: `1px solid ${dcc.line}` }}
              >
                <div style={{
                  position: 'absolute', inset: 0, width: `${pct}%`, background: accent, borderRadius: 4,
                  transition: reduit ? 'none' : 'width .25s ease-out',
                }} />
              </div>
            </div>
          ) : (
            <button
              type="button" onClick={lancer} className="dcc-focus dcc-motion"
              style={{
                width: '100%', padding: '10px 12px', borderRadius: dcc.radius.md, cursor: 'pointer',
                font: `700 13px ${fonts.body}`, color: dcc.accentInk,
                background: accent, border: 'none', transition: 'filter .15s',
                boxShadow: `0 12px 28px -14px ${accent}b3`,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(1.1)' }}
              onMouseLeave={(e) => { e.currentTarget.style.filter = 'none' }}
            >
              {etat === 'erreur' ? 'Réessayer l’analyse' : 'Analyser la partie'}
            </button>
          )}
          {etat === 'idle' && (
            <p style={{ margin: 0, font: `400 11.5px ${fonts.body}`, color: dcc.textMute, lineHeight: 1.45 }}>
              Verdict coup par coup, tournant de la partie et graphe d’évaluation.
            </p>
          )}
        </>
      )}

      {/* ── Résultat ── */}
      {etat === 'done' && resultat && (
        <>
          {/* chips compteurs */}
          <div style={{ display: 'flex', gap: 6 }}>
            {CHIPS.map((c) => (
              <div key={c.key} title={c.label} style={{
                flex: 1, minWidth: 0, padding: '7px 4px', borderRadius: dcc.radius.sm,
                background: dcc.panel, border: `1px solid ${dcc.line}`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ color: c.color, font: `800 12px ${fonts.mono}` }}>{c.sym}</span>
                  <span style={{ font: `800 15px ${fonts.mono}`, color: dcc.text, fontVariantNumeric: 'tabular-nums' }}>
                    {resultat.compteurs[c.key]}
                  </span>
                </div>
                <span style={{
                  maxWidth: '100%', font: `600 9px ${fonts.body}`, color: dcc.textMute,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>{c.label}</span>
              </div>
            ))}
          </div>

          {/* tournant : le coup le plus coûteux (cliquable → revue) */}
          {tournant && (
            <button
              type="button" className="dcc-focus"
              onClick={() => aller(tournant.ply)}
              title="Revoir le tournant de la partie"
              style={{
                display: 'flex', alignItems: 'center', gap: 9, width: '100%', textAlign: 'left',
                padding: '8px 11px', borderRadius: dcc.radius.sm, cursor: 'pointer',
                background: dcc.panel, border: `1px solid ${dcc.line}`, borderLeft: `3px solid ${COULEUR[tournant.verdict] || dcc.danger}`,
                transition: reduit ? 'none' : 'background .12s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = dcc.panelHi }}
              onMouseLeave={(e) => { e.currentTarget.style.background = dcc.panel }}
            >
              <span style={{ flexShrink: 0, font: `700 9px ${fonts.body}`, letterSpacing: '0.08em', textTransform: 'uppercase', color: COULEUR[tournant.verdict] || dcc.danger }}>
                Tournant
              </span>
              <span style={{
                flex: 1, minWidth: 0, font: `700 12.5px ${fonts.mono}`, color: dcc.text,
                fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {numeroCoup(tournant.ply, tournant.side)} {tournant.notation}
              </span>
              <span style={{ flexShrink: 0, font: `800 12.5px ${fonts.mono}`, color: COULEUR[tournant.verdict] || dcc.danger, fontVariantNumeric: 'tabular-nums' }}>
                −{(tournant.perte / 100).toFixed(1)}
              </span>
              <span aria-hidden style={{ flexShrink: 0, color: dcc.textMute, font: `700 15px ${fonts.body}`, lineHeight: 1 }}>›</span>
            </button>
          )}

          {/* graphe d'éval synchro revue */}
          <GrapheEval plies={resultat.plies} selPly={selPly} onSelect={aller} accent={accent} reduit={reduit} />

          {/* liste annotée (cliquable → revue) */}
          <div>
            <div style={{ font: `700 9.5px ${fonts.body}`, letterSpacing: '0.09em', textTransform: 'uppercase', color: dcc.textMute, margin: '0 0 5px' }}>
              Coups · clique pour revoir
            </div>
            <div style={{
              maxHeight: 150, overflowY: 'auto',
              background: dcc.panel, borderRadius: dcc.radius.sm, border: `1px solid ${dcc.line}`, padding: 4,
            }}>
              {paires.map((pr) => (
                <div key={pr.n} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <span style={{
                    width: 26, flexShrink: 0, textAlign: 'right', paddingRight: 5,
                    color: dcc.textMute, font: `600 11.5px ${fonts.mono}`, fontVariantNumeric: 'tabular-nums',
                  }}>{pr.n}.</span>
                  <CoupCell p={pr.fonce} actif={pr.fonce?.ply === selPly} onClick={() => aller(pr.fonce.ply)} reduit={reduit} />
                  <CoupCell p={pr.clair} actif={pr.clair?.ply === selPly} onClick={() => pr.clair && aller(pr.clair.ply)} reduit={reduit} />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
