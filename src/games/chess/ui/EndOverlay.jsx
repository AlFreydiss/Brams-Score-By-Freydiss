// ── EndOverlay : fin de partie (sobre) ──────────────────────────────────────
// Affiche le résultat + cause, delta ELO si classé, et les actions Rejouer /
// Revoir / Retour. Overlay neutre, accent laiton, zéro confetti criard.
import { ui, fonts } from '../../../features/games/neutralTheme.js'

const BRASS = '#b09467'

const LIBELLE_CAUSE = {
  mat: 'Échec et mat', pat: 'Pat', repetition: 'Nulle par répétition',
  materiel: 'Matériel insuffisant', cinquante_coups: 'Règle des 50 coups',
  abandon: 'Abandon', temps: 'Au temps', nulle_accord: 'Nulle par accord',
}

function Bouton({ children, onClick, primaire, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '11px 16px', borderRadius: ui.radius.sm, cursor: disabled ? 'default' : 'pointer', minWidth: 110,
        font: `700 13.5px ${fonts.body}`,
        color: primaire ? '#15110a' : ui.text,
        background: primaire ? BRASS : ui.surface,
        border: `1px solid ${primaire ? BRASS : ui.line}`,
        opacity: disabled ? 0.6 : 1,
        transition: 'filter .15s, border-color .15s, background .15s',
      }}
      onMouseEnter={e => { if (disabled) return; if (primaire) e.currentTarget.style.filter = 'brightness(1.08)'; else { e.currentTarget.style.background = ui.surfaceHi; e.currentTarget.style.borderColor = ui.lineHi } }}
      onMouseLeave={e => { if (disabled) return; e.currentTarget.style.filter = 'none'; if (!primaire) { e.currentTarget.style.background = ui.surface; e.currentTarget.style.borderColor = ui.line } }}
    >
      {children}
    </button>
  )
}

export default function EndOverlay({ resultat, cause, maCouleur, deltaElo, eloFinal, revancheEnvoyee, onRejouer, onRevoir, onRetour, onFermer, onAnalyser, analyseEnCours, analyseProgres }) {
  // resultat : 'blanc' | 'noir' | 'nulle'. maCouleur : 'w' | 'b' | null (local).
  let titre, accent
  if (resultat === 'nulle') { titre = 'Partie nulle'; accent = ui.textDim }
  else if (maCouleur) {
    const gagne = (resultat === 'blanc') === (maCouleur === 'w')
    titre = gagne ? 'Victoire' : 'Défaite'
    accent = gagne ? ui.good : ui.bad
  } else {
    titre = resultat === 'blanc' ? 'Les Blancs gagnent' : 'Les Noirs gagnent'
    accent = BRASS
  }

  return (
    <div
      onClick={onFermer}
      style={{
        position: 'absolute', inset: 0, zIndex: 40,
        background: 'rgba(8,9,12,0.72)', backdropFilter: 'blur(4px)',
        display: 'grid', placeItems: 'center', padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        role="dialog" aria-label="Fin de partie"
        style={{
          width: 'min(380px, 92vw)', textAlign: 'center',
          background: ui.bgElev, border: `1px solid ${ui.lineHi}`,
          borderRadius: ui.radius.lg, padding: '28px 26px 24px',
          boxShadow: ui.shadow,
        }}
      >
        <style>{`button:focus-visible{outline:2px solid ${BRASS};outline-offset:2px}`}</style>
        <div aria-hidden style={{ width: 38, height: 4, borderRadius: 2, background: accent, margin: '0 auto 16px' }} />
        <h2 style={{ margin: 0, font: `800 26px ${fonts.display}`, letterSpacing: '-0.02em', color: ui.text }}>{titre}</h2>
        <p style={{ margin: '7px 0 0', font: `500 13.5px ${fonts.body}`, color: ui.textDim }}>
          {LIBELLE_CAUSE[cause] || 'Fin de partie'}
        </p>
        {deltaElo != null && (() => {
          const avant = typeof eloFinal === 'number' ? eloFinal - deltaElo : null
          const couleurDelta = deltaElo > 0 ? ui.good : (deltaElo < 0 ? ui.bad : ui.textDim)
          return (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 10, marginTop: 16, padding: '7px 14px',
              borderRadius: ui.radius.pill, background: ui.surface, border: `1px solid ${ui.line}`,
              fontVariantNumeric: 'tabular-nums',
            }}>
              <span style={{ font: `600 10px ${fonts.body}`, letterSpacing: '0.1em', color: ui.textMute }}>ELO</span>
              {avant != null ? (
                <span style={{ font: `700 15px ${fonts.mono}`, fontVariantNumeric: 'tabular-nums', color: ui.text }}>
                  {avant}
                  <span style={{ color: ui.textMute, margin: '0 5px' }}>→</span>
                  {eloFinal}
                  <span style={{ color: couleurDelta, marginLeft: 8 }}>
                    ({deltaElo > 0 ? `+${deltaElo}` : deltaElo})
                  </span>
                </span>
              ) : (
                <span style={{ font: `800 16px ${fonts.mono}`, fontVariantNumeric: 'tabular-nums', color: couleurDelta }}>
                  {deltaElo > 0 ? `+${deltaElo}` : deltaElo}
                </span>
              )}
            </div>
          )
        })()}
        {onAnalyser && (
          <div style={{ marginTop: 18 }}>
            <Bouton onClick={analyseEnCours ? undefined : onAnalyser} disabled={analyseEnCours}>
              {analyseEnCours
                ? (analyseProgres != null ? `Analyse… ${analyseProgres}%` : 'Analyse…')
                : 'Analyser la partie'}
            </Bouton>
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: onAnalyser ? 12 : 24, flexWrap: 'wrap' }}>
          <Bouton onClick={onRejouer} primaire disabled={revancheEnvoyee}>
            {revancheEnvoyee ? 'Revanche demandée…' : 'Rejouer'}
          </Bouton>
          {onRevoir && <Bouton onClick={onRevoir}>Revoir</Bouton>}
          <Bouton onClick={onRetour}>Retour</Bouton>
        </div>
      </div>
    </div>
  )
}
