// ── Controls : barre de contrôles de la partie ──────────────────────────────
// Nouvelle partie · Abandonner (confirm) · Proposer nulle · Annuler · Retourner.
// Plus la navigation historique ⏮ ◀ ▶ ⏭. Sobre, accent laiton, états worked.
import { useState } from 'react'
import { ui, fonts } from '../../../features/games/neutralTheme.js'

const BRASS = '#81b64c'

function Btn({ children, onClick, disabled, danger, title, large }) {
  return (
    <button
      onClick={onClick} disabled={disabled} title={title}
      className="cc-btn"
      style={{
        flex: large ? 1 : '0 0 auto',
        padding: large ? '10px 12px' : '8px 11px', borderRadius: ui.radius.sm,
        cursor: disabled ? 'default' : 'pointer',
        font: `600 12.5px ${fonts.body}`,
        color: disabled ? ui.textMute : (danger ? '#e7b3aa' : ui.text),
        background: ui.surface,
        border: `1px solid ${ui.line}`, opacity: disabled ? 0.5 : 1,
        transition: 'background .15s, border-color .15s, color .15s',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      }}
      onMouseEnter={e => { if (!disabled) { e.currentTarget.style.background = ui.surfaceHi; e.currentTarget.style.borderColor = danger ? 'rgba(212,104,90,0.5)' : ui.lineHi } }}
      onMouseLeave={e => { e.currentTarget.style.background = ui.surface; e.currentTarget.style.borderColor = ui.line }}
    >
      {children}
    </button>
  )
}

export default function Controls({
  onNouvelle, onAbandonner, onNulle, onAnnuler, onFlip,
  peutAnnuler, peutAbandonner, nulleProposee,
  curseur, nbCoups, onAller,
}) {
  const [confirmAbandon, setConfirmAbandon] = useState(false)
  const enRevue = curseur < nbCoups - 1

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <style>{`.cc-btn:focus-visible{ outline:2px solid ${BRASS}; outline-offset:2px; }`}</style>
      {/* Navigation historique */}
      <div style={{ display: 'flex', gap: 6 }}>
        <Btn onClick={() => onAller(-1)} disabled={nbCoups === 0 || curseur === -1} title="Début" large>⏮</Btn>
        <Btn onClick={() => onAller(curseur - 1)} disabled={curseur < 0} title="Précédent (←)" large>◀</Btn>
        <Btn onClick={() => onAller(curseur + 1)} disabled={curseur >= nbCoups - 1} title="Suivant (→)" large>▶</Btn>
        <Btn onClick={() => onAller(nbCoups - 1)} disabled={nbCoups === 0 || !enRevue} title="Fin" large>⏭</Btn>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6 }}>
        <Btn onClick={onAnnuler} disabled={!peutAnnuler} title="Annuler le dernier coup" large>Annuler</Btn>
        <Btn onClick={onFlip} title="Retourner l'échiquier" large>Retourner</Btn>
      </div>

      {onNulle && (
        <div style={{ display: 'flex', gap: 6 }}>
          <Btn onClick={onNulle} disabled={nulleProposee} title="Proposer la nulle" large>
            {nulleProposee ? 'Nulle proposée' : 'Proposer nulle'}
          </Btn>
        </div>
      )}

      <div style={{ display: 'flex', gap: 6 }}>
        {!confirmAbandon ? (
          <Btn onClick={() => setConfirmAbandon(true)} disabled={!peutAbandonner} danger title="Abandonner la partie" large>
            Abandonner
          </Btn>
        ) : (
          <>
            <Btn onClick={() => { setConfirmAbandon(false); onAbandonner() }} danger large>Confirmer</Btn>
            <Btn onClick={() => setConfirmAbandon(false)} large>Annuler</Btn>
          </>
        )}
      </div>

      <button
        onClick={onNouvelle}
        className="cc-btn"
        style={{
          padding: '11px 14px', borderRadius: ui.radius.sm, cursor: 'pointer', marginTop: 2,
          font: `700 13.5px ${fonts.body}`, color: '#15110a',
          background: BRASS, border: `1px solid ${BRASS}`,
          transition: 'filter .15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.08)' }}
        onMouseLeave={e => { e.currentTarget.style.filter = 'none' }}
      >
        Nouvelle partie
      </button>
    </div>
  )
}
