// ── AnalysisPanel : résultat de l'analyse post-partie (sobre, inline only) ────
// Affiche : précision par camp (barre), compteurs gaffes/imprécisions, et la
// liste annotée des coups. Cliquer un coup → onAller(ply) (réutilise le curseur
// de revue de PlayTab, comme MoveList). respecte prefers-reduced-motion.
import { useState, useRef, useEffect, useCallback } from 'react'
import { Chess } from 'chess.js'
import { ui, fonts } from '../../../features/games/neutralTheme.js'
import { cc } from '../ui/chesscom.js'
import { useCoach } from '../coach/useCoach.js'
import { compteursGlobaux, coupCritique, construireMessageBilan } from './reviewSummary.js'
import EvalGraph from './EvalGraph.jsx'

const BRASS = '#81b64c'   // accent chess.com (vert)

// Couleurs des verdicts (chips récap), façon chess.com.
const VERDICTS = [
  { key: 'brillants',    label: 'Brillant',    sym: '!!', color: '#26c2a3' }, // teal « brilliant »
  { key: 'excellents',   label: 'Excellent',   sym: '!',  color: cc.green },
  { key: 'imprecisions', label: 'Imprécision', sym: '?',  color: '#e8a13a' },
  { key: 'gaffes',       label: 'Gaffe',       sym: '??', color: cc.danger },
]

// FEN de la position AVANT le demi-coup d'index `ply` (rejoue les SAN précédents).
function fenAvant(historique, ply) {
  const c = new Chess()
  for (let i = 0; i < ply; i++) {
    const s = typeof historique[i] === 'string' ? historique[i] : historique[i]?.san
    try { c.move(s) } catch { break }
  }
  return c.fen()
}

// Couleur de précision : du rouge (faible) au vert (élevée), accent neutre au milieu.
function couleurPrecision(p) {
  if (p >= 90) return ui.good
  if (p >= 75) return ui.accent
  if (p >= 60) return ui.warn
  return ui.bad
}

const GLYPHE_INFO = {
  '!':  { couleur: ui.good, label: 'Excellent' },
  '?':  { couleur: ui.warn, label: 'Imprécision' },
  '??': { couleur: ui.bad,  label: 'Gaffe' },
}

function BarrePrecision({ label, data, reduit }) {
  const c = couleurPrecision(data.precision)
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
        <span style={{ font: `700 12px ${fonts.body}`, color: ui.textDim }}>{label}</span>
        <span style={{ font: `800 16px ${fonts.mono}`, color: c, fontVariantNumeric: 'tabular-nums' }}>
          {data.precision}%
        </span>
      </div>
      <div style={{
        position: 'relative', height: 7, borderRadius: 4, overflow: 'hidden',
        background: ui.bg, border: `1px solid ${ui.line}`,
      }}>
        <div style={{
          position: 'absolute', inset: 0, width: `${data.precision}%`,
          background: c, borderRadius: 4,
          transition: reduit ? 'none' : 'width .5s cubic-bezier(.4,0,.2,1)',
        }} />
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 7, font: `600 11px ${fonts.body}`, color: ui.textMute }}>
        <span><b style={{ color: ui.bad }}>{data.blunders}</b> gaffe{data.blunders > 1 ? 's' : ''}</span>
        <span><b style={{ color: ui.warn }}>{data.imprecisions}</b> imprécision{data.imprecisions > 1 ? 's' : ''}</span>
        <span><b style={{ color: ui.good }}>{data.excellents}</b> excellent{data.excellents > 1 ? 's' : ''}</span>
      </div>
    </div>
  )
}

export default function AnalysisPanel({ resultat, curseur = -1, onAller, onFermer, historique = [], analyser }) {
  const reduit = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  const [selPly, setSelPly] = useState(null)   // coup sélectionné pour l'explication coach
  const coach = useCoach()

  // Bilan global de la partie (coach IA, fetch direct car le message décrit toute la
  // partie et non une position — donc on ne passe pas par construireMessageCoach).
  const [bilan, setBilan] = useState({ texte: '', loading: false, erreur: null })
  const bilanReq = useRef(0)
  useEffect(() => () => { bilanReq.current++ }, [])  // invalide une requête en vol au démontage

  const demanderBilan = useCallback(async () => {
    const id = ++bilanReq.current
    setBilan({ texte: '', loading: true, erreur: null })
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'coach', message: construireMessageBilan(resultat) }),
      })
      const data = await res.json().catch(() => ({}))
      if (id !== bilanReq.current) return
      if (!res.ok) {
        setBilan({ texte: '', loading: false, erreur: data?.error || 'Le coach est indisponible, réessaie.' })
        return
      }
      setBilan({ texte: String(data?.reply || '').trim(), loading: false, erreur: null })
    } catch {
      if (id !== bilanReq.current) return
      setBilan({ texte: '', loading: false, erreur: 'Connexion au coach impossible.' })
    }
  }, [resultat])

  const coups = resultat?.coups || []
  const compteurs = compteursGlobaux(resultat)
  const critique = coupCritique(resultat)

  // Reconstruit la position avant le coup choisi, l'analyse, et demande l'explication FR.
  const expliquer = useCallback(async (ply) => {
    const c = coups[ply]
    if (!c) return
    const fen = fenAvant(historique, ply)
    const r = typeof analyser === 'function' ? await analyser(fen, { movetime: 500 }) : null
    await coach.demander({ fen, trait: c.color, resultat: r, dernierSan: c.san })
  }, [coups, historique, analyser, coach])

  if (!resultat) return null

  // regroupe en paires (blanc/noir) par numéro de coup pour l'affichage liste.
  const paires = []
  for (let i = 0; i < coups.length; i += 2) {
    paires.push({ n: i / 2 + 1, blanc: coups[i], noir: coups[i + 1] })
  }

  const CoupCell = ({ c }) => {
    if (!c) return <span style={{ flex: 1 }} />
    const actif = c.ply === curseur
    const info = c.glyphe ? GLYPHE_INFO[c.glyphe] : null
    return (
      <button
        onClick={() => { onAller?.(c.ply); setSelPly(c.ply); coach.reset() }}
        title={info ? info.label : undefined}
        style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-start',
          padding: '3px 7px', borderRadius: 5, cursor: 'pointer', border: 'none',
          background: actif ? 'rgba(129,182,76,0.18)' : 'transparent',
          color: actif ? '#e7d8b8' : ui.text,
          font: `${actif ? 700 : 600} 13px ${fonts.mono}`, fontVariantNumeric: 'tabular-nums',
          transition: reduit ? 'none' : 'background .12s',
        }}
        onMouseEnter={e => { if (!actif) e.currentTarget.style.background = ui.surfaceHi }}
        onMouseLeave={e => { if (!actif) e.currentTarget.style.background = 'transparent' }}
      >
        <span>{c.san}</span>
        {info && <span style={{ color: info.couleur, font: `800 12px ${fonts.mono}` }}>{c.glyphe}</span>}
      </button>
    )
  }

  return (
    <div
      onClick={onFermer}
      style={{
        position: 'absolute', inset: 0, zIndex: 42,
        background: 'rgba(8,9,12,0.72)', backdropFilter: 'blur(4px)',
        display: 'grid', placeItems: 'center', padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        role="dialog" aria-label="Analyse de la partie"
        style={{
          width: 'min(460px, 94vw)', maxHeight: '88vh', display: 'flex', flexDirection: 'column',
          background: ui.bgElev, border: `1px solid ${ui.lineHi}`,
          borderRadius: ui.radius.lg, padding: '22px 22px 18px', boxShadow: ui.shadow,
        }}
      >
        <style>{`button:focus-visible{outline:2px solid ${BRASS};outline-offset:2px}`}</style>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ margin: 0, font: `800 19px ${fonts.display}`, letterSpacing: '-0.02em', color: ui.text }}>
            Analyse de la partie
          </h2>
          <button onClick={onFermer} aria-label="Fermer" style={{
            width: 28, height: 28, borderRadius: ui.radius.sm, cursor: 'pointer',
            background: ui.surface, border: `1px solid ${ui.line}`, color: ui.textDim,
            font: `700 15px ${fonts.body}`, lineHeight: 1,
          }}>×</button>
        </div>

        <div style={{ display: 'flex', gap: 18, marginBottom: 16 }}>
          <BarrePrecision label="Blancs" data={resultat.blancs} reduit={reduit} />
          <div aria-hidden style={{ width: 1, background: ui.line, alignSelf: 'stretch' }} />
          <BarrePrecision label="Noirs" data={resultat.noirs} reduit={reduit} />
        </div>

        {/* ── Compteurs globaux (verdicts des 2 camps) ── */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {VERDICTS.map(v => (
            <div key={v.key} title={v.label} style={{
              flex: 1, minWidth: 0, padding: '8px 4px', borderRadius: cc.radius.md,
              background: cc.panel, border: `1px solid ${cc.line}`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ color: v.color, font: `800 13px ${fonts.mono}` }}>{v.sym}</span>
                <span style={{ font: `800 16px ${fonts.mono}`, color: cc.text, fontVariantNumeric: 'tabular-nums' }}>
                  {compteurs[v.key]}
                </span>
              </div>
              <span style={{
                maxWidth: '100%', font: `600 10px ${fonts.body}`, color: cc.textMute,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>{v.label}</span>
            </div>
          ))}
        </div>

        {/* ── Tournant : le coup le plus coûteux de la partie (cliquable) ── */}
        {critique && (
          <button
            onClick={() => { onAller?.(critique.ply); setSelPly(critique.ply); coach.reset() }}
            title="Revoir le tournant de la partie"
            style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left',
              padding: '9px 12px', marginBottom: 12, borderRadius: cc.radius.md, cursor: 'pointer',
              background: cc.panel, border: `1px solid ${cc.line}`, borderLeft: `3px solid ${cc.danger}`,
              transition: reduit ? 'none' : 'background .12s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = cc.panelHi }}
            onMouseLeave={e => { e.currentTarget.style.background = cc.panel }}
          >
            <span style={{ flexShrink: 0, font: `700 9px ${fonts.body}`, letterSpacing: '0.08em', textTransform: 'uppercase', color: cc.danger }}>
              Tournant
            </span>
            <span style={{
              flex: 1, minWidth: 0, font: `700 13px ${fonts.mono}`, color: cc.text,
              fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {critique.numero} {critique.san}
            </span>
            <span style={{ flexShrink: 0, font: `800 13px ${fonts.mono}`, color: cc.danger, fontVariantNumeric: 'tabular-nums' }}>
              −{Math.round(critique.perte)}%
            </span>
            <span aria-hidden style={{ flexShrink: 0, color: cc.textMute, font: `700 16px ${fonts.body}`, lineHeight: 1 }}>›</span>
          </button>
        )}

        {/* ── Résumé de la partie par le coach IA ── */}
        <div style={{ marginBottom: 16 }}>
          <button
            onClick={demanderBilan}
            disabled={bilan.loading}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, width: '100%',
              padding: '10px 12px', borderRadius: cc.radius.md, whiteSpace: 'nowrap',
              cursor: bilan.loading ? 'default' : 'pointer', font: `700 13px ${fonts.body}`,
              color: bilan.loading ? cc.textMute : '#15110a',
              background: bilan.loading ? cc.panel : cc.green,
              border: `1px solid ${bilan.loading ? cc.line : cc.green}`,
            }}
          >
            {bilan.loading
              ? 'Le coach rédige le bilan…'
              : (bilan.texte ? '📋 Régénérer le résumé' : '📋 Résumé de la partie')}
          </button>
          {(bilan.texte || bilan.erreur || bilan.loading) && (
            <div style={{
              marginTop: 10, maxHeight: 170, overflowY: 'auto', padding: '11px 13px', borderRadius: cc.radius.md,
              background: cc.panel, border: `1px solid ${cc.line}`,
              font: `400 12.5px/1.6 ${fonts.body}`, color: cc.textDim, whiteSpace: 'pre-wrap',
            }}>
              {bilan.erreur
                ? <span style={{ color: '#e0a3a3' }}>{bilan.erreur}</span>
                : (bilan.texte || 'Le coach analyse la partie…')}
            </div>
          )}
        </div>

        {/* ── Graphe d'évaluation (win% blanc par coup, cliquable) ── */}
        {coups.length > 0 && (
          <EvalGraph
            coups={coups}
            selPly={curseur >= 0 ? curseur : selPly}
            onSelect={(ply) => { onAller?.(ply); setSelPly(ply); coach.reset() }}
            reduit={reduit}
            style={{ marginBottom: 14, flexShrink: 0 }}
          />
        )}

        <div style={{ font: `700 10px ${fonts.body}`, letterSpacing: '0.09em', textTransform: 'uppercase', color: ui.textMute, marginBottom: 7 }}>
          Coups · cliquez pour revoir
        </div>
        <div style={{
          flex: 1, minHeight: 0, overflowY: 'auto',
          background: ui.bg, borderRadius: ui.radius.sm, border: `1px solid ${ui.line}`, padding: 4,
        }}>
          {paires.map(p => (
            <div key={p.n} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <span style={{
                width: 28, flexShrink: 0, textAlign: 'right', paddingRight: 6,
                color: ui.textMute, font: `600 12px ${fonts.mono}`, fontVariantNumeric: 'tabular-nums',
              }}>{p.n}.</span>
              <CoupCell c={p.blanc} />
              <CoupCell c={p.noir} />
            </div>
          ))}
        </div>

        {/* ── Coach : explique le coup sélectionné en français ── */}
        {selPly != null && coups[selPly] && (
          <div style={{ marginTop: 14, padding: '11px 12px', borderRadius: ui.radius.sm, background: ui.surface, border: `1px solid ${ui.line}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: coach.texte || coach.loading || coach.erreur ? 8 : 0 }}>
              <span style={{ font: `700 13px ${fonts.mono}`, color: ui.text, fontVariantNumeric: 'tabular-nums' }}>
                {Math.floor(selPly / 2) + 1}.{coups[selPly].color === 'b' ? '..' : ''} {coups[selPly].san}
                {coups[selPly].glyphe && (
                  <span style={{ color: (GLYPHE_INFO[coups[selPly].glyphe] || {}).couleur, marginLeft: 5, font: `800 12px ${fonts.mono}` }}>
                    {coups[selPly].glyphe}
                  </span>
                )}
              </span>
              <button onClick={() => expliquer(selPly)} disabled={coach.loading} style={{
                flexShrink: 0, padding: '7px 11px', borderRadius: ui.radius.sm,
                cursor: coach.loading ? 'default' : 'pointer', whiteSpace: 'nowrap',
                font: `700 12px ${fonts.body}`, color: coach.loading ? ui.textMute : '#15110a',
                background: coach.loading ? ui.surface : BRASS, border: `1px solid ${coach.loading ? ui.line : BRASS}`,
              }}>
                {coach.loading ? 'Le coach réfléchit…' : '🎓 Pourquoi ce coup ?'}
              </button>
            </div>
            {(coach.texte || coach.erreur || coach.loading) && (
              <div style={{
                maxHeight: 180, overflowY: 'auto', padding: '9px 11px', borderRadius: ui.radius.sm,
                background: ui.bg, border: `1px solid ${ui.line}`,
                font: `400 12.5px/1.55 ${fonts.body}`, color: ui.textDim, whiteSpace: 'pre-wrap',
              }}>
                {coach.erreur
                  ? <span style={{ color: '#e0a3a3' }}>{coach.erreur}</span>
                  : (coach.texte || 'Analyse de la position…')}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
