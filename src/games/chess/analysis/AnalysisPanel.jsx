// ── AnalysisPanel : résultat de l'analyse post-partie (sobre, inline only) ────
// Affiche : précision par camp (barre), compteurs gaffes/imprécisions, et la
// liste annotée des coups. Cliquer un coup → onAller(ply) (réutilise le curseur
// de revue de PlayTab, comme MoveList). respecte prefers-reduced-motion.
import { ui, fonts } from '../../../features/games/neutralTheme.js'

const BRASS = '#b09467'

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

export default function AnalysisPanel({ resultat, curseur = -1, onAller, onFermer }) {
  if (!resultat) return null
  const reduit = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  // regroupe en paires (blanc/noir) par numéro de coup pour l'affichage liste.
  const { coups } = resultat
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
        onClick={() => onAller?.(c.ply)}
        title={info ? info.label : undefined}
        style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-start',
          padding: '3px 7px', borderRadius: 5, cursor: 'pointer', border: 'none',
          background: actif ? 'rgba(176,148,103,0.18)' : 'transparent',
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

        <div style={{ display: 'flex', gap: 18, marginBottom: 18 }}>
          <BarrePrecision label="Blancs" data={resultat.blancs} reduit={reduit} />
          <div aria-hidden style={{ width: 1, background: ui.line, alignSelf: 'stretch' }} />
          <BarrePrecision label="Noirs" data={resultat.noirs} reduit={reduit} />
        </div>

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
      </div>
    </div>
  )
}
