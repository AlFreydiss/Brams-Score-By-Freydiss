// ── CoachPanel : le coach IA en jeu. Deux aides distinctes :
//   • Indice  → flèche du meilleur coup sur le plateau (Stockfish, instantané).
//   • Conseil → explication en français du plan/menace (LLM via /api/chat).
// 2D stricte, DA laiton, cohérent avec les rails de PlayTab.
import { ui, fonts } from '../../../features/games/neutralTheme.js'

function Btn({ onClick, disabled, accent, primaire, children, title }) {
  return (
    <button onClick={onClick} disabled={disabled} title={title} style={{
      flex: 1, padding: '9px 10px', borderRadius: ui.radius.sm,
      cursor: disabled ? 'default' : 'pointer', whiteSpace: 'nowrap',
      font: `700 12.5px ${fonts.body}`,
      color: disabled ? ui.textMute : (primaire ? '#15110a' : ui.text),
      background: disabled ? ui.surface : (primaire ? accent : ui.surface),
      border: `1px solid ${disabled ? ui.line : (primaire ? accent : ui.line)}`,
      opacity: disabled ? 0.55 : 1, transition: 'filter .15s, border-color .15s',
    }}
      onMouseEnter={e => { if (!disabled && primaire) e.currentTarget.style.filter = 'brightness(1.07)' }}
      onMouseLeave={e => { e.currentTarget.style.filter = 'none' }}
    >{children}</button>
  )
}

// Petit interrupteur « Coach auto » (accent vert), aligné à droite de l'en-tête.
function ToggleAuto({ on, onToggle, accent }) {
  return (
    <button onClick={onToggle} role="switch" aria-checked={on}
      title="Le coach commente automatiquement tes coups et explique tes gaffes"
      style={{
        display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
        background: 'transparent', border: 'none', padding: 0,
      }}>
      <span style={{ font: `700 10px ${fonts.body}`, letterSpacing: '0.07em', textTransform: 'uppercase', color: on ? accent : ui.textMute }}>
        Auto
      </span>
      <span aria-hidden style={{
        position: 'relative', width: 30, height: 17, borderRadius: 999, flexShrink: 0,
        background: on ? accent : ui.line, border: `1px solid ${on ? accent : ui.lineHi}`,
        transition: 'background .15s, border-color .15s',
      }}>
        <span style={{
          position: 'absolute', top: 1, left: on ? 14 : 1, width: 13, height: 13, borderRadius: 999,
          background: '#fff', transition: 'left .15s',
        }} />
      </span>
    </button>
  )
}

export default function CoachPanel({
  accent = '#81b64c', texte, loading, erreur,
  onIndice, onConseil, peutAider, indiceTexte,
  coachAuto, onToggleCoachAuto,
}) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 9,
      padding: '11px 12px', borderRadius: ui.radius.sm,
      background: ui.surface, border: `1px solid ${ui.line}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <span aria-hidden style={{
          width: 7, height: 7, borderRadius: 2, background: accent,
          boxShadow: `0 0 8px ${accent}`,
        }} />
        <span style={{ font: `800 12px ${fonts.body}`, letterSpacing: '0.08em', textTransform: 'uppercase', color: accent }}>
          Coach IA
        </span>
        {onToggleCoachAuto && (
          <>
            <span style={{ flex: 1 }} />
            <ToggleAuto on={!!coachAuto} onToggle={onToggleCoachAuto} accent={accent} />
          </>
        )}
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        <Btn onClick={onIndice} disabled={!peutAider} accent={accent} title="Affiche la flèche du meilleur coup">
          💡 Indice{indiceTexte ? ` · ${indiceTexte}` : ''}
        </Btn>
        <Btn onClick={onConseil} disabled={!peutAider || loading} accent={accent} primaire title="Le coach explique le plan en français">
          {loading ? 'Le coach réfléchit…' : '🎓 Conseil'}
        </Btn>
      </div>

      {(texte || erreur || loading) && (
        <div style={{
          maxHeight: 220, overflowY: 'auto',
          padding: '9px 11px', borderRadius: ui.radius.sm,
          background: ui.bg || 'rgba(0,0,0,0.25)', border: `1px solid ${ui.line}`,
          font: `400 13px/1.55 ${fonts.body}`, color: ui.textDim, whiteSpace: 'pre-wrap',
        }}>
          {erreur
            ? <span style={{ color: '#e0a3a3' }}>{erreur}</span>
            : (texte || (loading ? 'Analyse de la position en cours…' : ''))}
        </div>
      )}

      {!texte && !erreur && !loading && (
        <p style={{ margin: 0, font: `400 11.5px ${fonts.body}`, color: ui.textMute, lineHeight: 1.45 }}>
          Bloqué ? Demande la flèche du meilleur coup, ou un conseil expliqué en français.
        </p>
      )}
    </div>
  )
}
