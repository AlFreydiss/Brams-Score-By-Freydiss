// ── EvalGraph : graphe d'évaluation façon chess.com Game Review ──────────────
// SVG maison (zéro dépendance), largeur 100 %, hauteur fixe ~100 px.
// X = plies, Y = win% blanc (cpVersWin). « Montagne » claire = probabilité de
// gain des Blancs sur fond sombre (les Noirs), ligne médiane à 50 %.
// Markers cliquables sur les coups tagués (gaffe/imprécision/brillant — mêmes
// couleurs que les chips VERDICTS d'AnalysisPanel), clic n'importe où = ply le
// plus proche via onSelect(ply), curseur vertical sur selPly, tooltip au survol
// (desktop uniquement — au tap mobile on sélectionne, sans tooltip).
import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { fonts } from '../../../features/games/neutralTheme.js'
import { cc } from '../ui/chesscom.js'
import { cpVersWin } from './analyzeGame.js'
import { numeroCoup } from './reviewSummary.js'

// Mêmes couleurs que les chips VERDICTS d'AnalysisPanel (cohérence visuelle).
const COULEUR_GAFFE = cc.danger        // '??'  rouge
const COULEUR_IMPRECISION = '#e8a13a'  // '?'   orange
const COULEUR_BRILLANT = '#26c2a3'     // '!'   quasi parfait → teal « brilliant »
const SEUIL_BRILLANT = 0.2             // même seuil que reviewSummary (non exporté là-bas)

const H = 100        // hauteur du graphe (px)
const PAD_X = 5      // évite de rogner les markers aux bords
const PAD_Y = 6

const FOND_NOIR = '#1B1916'            // aire « Noirs » (fond du graphe)
const FOND_BLANC = '#E8E6E0'           // aire « Blancs » (montagne claire)

// Couleur du marker d'un coup tagué, null si le coup ne mérite pas de point.
function couleurMarker(c) {
  if (c.glyphe === '??') return COULEUR_GAFFE
  if (c.glyphe === '?') return COULEUR_IMPRECISION
  if (c.glyphe === '!' && c.perte <= SEUIL_BRILLANT) return COULEUR_BRILLANT
  return null
}

export default function EvalGraph({ coups = [], selPly = null, onSelect, reduit = false, style }) {
  const wrapRef = useRef(null)
  const svgRef = useRef(null)
  const [w, setW] = useState(0)
  const [hoverPly, setHoverPly] = useState(null)

  // Écran sans hover (tactile) : tap = select, jamais de tooltip.
  const sansHover = typeof window !== 'undefined'
    && window.matchMedia?.('(hover: none)').matches

  // Largeur réelle du conteneur (SVG dessiné en coordonnées pixel → cercles ronds,
  // pas d'étirement preserveAspectRatio).
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

  // Points : index 0 = position initiale (50 %), puis un point par coup
  // (win% blanc APRÈS le coup, cpApres est déjà côté blanc). Éval manquante
  // (analyse interrompue) → on prolonge la dernière valeur connue.
  const pts = useMemo(() => {
    let dernier = 50
    const arr = [{ win: 50, coup: null }]
    for (const c of coups) {
      const win = c.cpApres == null ? dernier : cpVersWin(c.cpApres)
      dernier = win
      arr.push({ win, coup: c })
    }
    return arr
  }, [coups])

  const n = pts.length - 1  // nombre de coups tracés

  const x = useCallback(
    (idx) => PAD_X + (n ? idx / n : 0) * (w - 2 * PAD_X),
    [n, w],
  )
  const y = (win) => PAD_Y + (1 - win / 100) * (H - 2 * PAD_Y)

  // Ply le plus proche du pointeur (le point 0 = départ n'est pas sélectionnable).
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

  // Tracés (chemins SVG en pixels).
  const ligne = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.win).toFixed(1)}`).join(' ')
  const aire = `M${x(0).toFixed(1)},${H} `
    + pts.map((p, i) => `L${x(i).toFixed(1)},${y(p.win).toFixed(1)}`).join(' ')
    + ` L${x(n).toFixed(1)},${H} Z`

  const selIdx = (selPly != null && selPly >= 0 && selPly + 1 <= n) ? selPly + 1 : null
  const hov = (hoverPly != null && pts[hoverPly + 1]?.coup) ? pts[hoverPly + 1] : null
  const hovX = hov ? x(hoverPly + 1) : 0
  const hovY = hov ? y(hov.win) : 0

  return (
    <div
      ref={wrapRef}
      style={{
        position: 'relative', width: '100%', height: H,
        borderRadius: cc.radius.md, border: `1px solid ${cc.line}`,
        overflow: 'hidden', background: FOND_NOIR,
        animation: reduit ? 'none' : 'ccEvalGraphIn .4s ease-out',
        ...style,
      }}
    >
      {!reduit && (
        <style>{`@keyframes ccEvalGraphIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}`}</style>
      )}
      {w > 0 && (
        <svg
          ref={svgRef}
          width={w} height={H} viewBox={`0 0 ${w} ${H}`}
          role="img" aria-label="Graphe d'évaluation : probabilité de gain des Blancs coup par coup"
          style={{ display: 'block', cursor: 'pointer', touchAction: 'manipulation' }}
          onClick={clic}
          onPointerMove={survol}
          onPointerLeave={() => setHoverPly(null)}
        >
          {/* Montagne blanche (win% des Blancs) sur fond sombre (les Noirs). */}
          <path d={aire} fill={FOND_BLANC} />
          <path d={ligne} fill="none" stroke="#B9B6AE" strokeWidth={1} />

          {/* Ligne médiane 50 % (gris moyen, lisible sur les deux aires). */}
          <line
            x1={0} x2={w} y1={y(50)} y2={y(50)}
            stroke="#8B8884" strokeOpacity={0.5} strokeWidth={1} strokeDasharray="3 3"
          />

          {/* Ligne de survol (desktop). */}
          {hov && (
            <line x1={hovX} x2={hovX} y1={0} y2={H} stroke="rgba(255,255,255,0.25)" strokeWidth={1} />
          )}

          {/* Curseur vertical sur le ply sélectionné. */}
          {selIdx != null && (
            <>
              <line x1={x(selIdx)} x2={x(selIdx)} y1={0} y2={H} stroke={cc.green} strokeWidth={1.5} />
              <circle
                cx={x(selIdx)} cy={y(pts[selIdx].win)} r={3.5}
                fill={cc.green} stroke="#fff" strokeWidth={1.2}
              />
            </>
          )}

          {/* Markers cliquables sur les coups tagués (gaffe / imprécision / brillant). */}
          {pts.map((p, i) => {
            if (!i || !p.coup) return null
            const col = couleurMarker(p.coup)
            if (!col) return null
            const ply = p.coup.ply
            return (
              <circle
                key={ply}
                cx={x(i)} cy={y(p.win)} r={ply === selPly ? 5 : 4}
                fill={col} stroke={FOND_NOIR} strokeWidth={1.5}
                style={{ cursor: 'pointer' }}
                onClick={(e) => { e.stopPropagation(); onSelect?.(ply) }}
              >
                <title>{`${numeroCoup(ply, p.coup.color)} ${p.coup.san} ${p.coup.glyphe}`}</title>
              </circle>
            )
          })}
        </svg>
      )}

      {/* Tooltip léger (n° de coup + SAN + win% blanc), desktop uniquement. */}
      {hov && (
        <div
          style={{
            position: 'absolute', pointerEvents: 'none', zIndex: 2,
            left: Math.max(58, Math.min(w - 58, hovX)),
            top: hovY < H / 2 ? Math.min(H - 26, hovY + 10) : Math.max(2, hovY - 30),
            transform: 'translateX(-50%)',
            padding: '3px 8px', borderRadius: 5, whiteSpace: 'nowrap',
            background: '#15130F', border: `1px solid ${cc.lineHi}`,
            font: `700 11px ${fonts.mono}`, color: cc.text, fontVariantNumeric: 'tabular-nums',
            boxShadow: '0 6px 16px -8px rgba(0,0,0,0.7)',
          }}
        >
          {numeroCoup(hov.coup.ply, hov.coup.color)} {hov.coup.san}
          <span style={{ color: cc.textMute }}> · Blancs {Math.round(hov.win)}%</span>
        </div>
      )}
    </div>
  )
}
