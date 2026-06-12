// ── Barre d'actions : abandonner / proposer nulle (+ annuler coup en solo) ──
import { useState } from 'react'
import { THEME } from '../constants.js'

function Btn({ children, onClick, danger, disabled, title }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onClick} disabled={disabled} title={title}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        flex: 1, padding: '9px 12px', borderRadius: 10, cursor: disabled ? 'default' : 'pointer',
        fontFamily: THEME.fontBody, fontWeight: 700, fontSize: 13,
        color: disabled ? THEME.muted : danger ? '#ffb4ae' : THEME.text,
        background: hover && !disabled ? (danger ? 'rgba(224,82,74,0.18)' : 'rgba(255,255,255,0.09)') : 'rgba(255,255,255,0.05)',
        border: `1px solid ${hover && !disabled ? (danger ? 'rgba(224,82,74,0.5)' : THEME.cardBorderHover) : THEME.cardBorder}`,
        transition: 'background .15s, border-color .15s',
        opacity: disabled ? 0.55 : 1,
      }}
    >
      {children}
    </button>
  )
}

export default function BarreActions({ onAbandonner, onProposerNulle, onAnnulerCoup, nulleEnAttente, disabled }) {
  const [confirmeAbandon, setConfirmeAbandon] = useState(false)
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {onAnnulerCoup && (
        <Btn onClick={onAnnulerCoup} disabled={disabled} title="Annuler le dernier coup">↩ Annuler</Btn>
      )}
      {onProposerNulle && (
        <Btn onClick={onProposerNulle} disabled={disabled || nulleEnAttente} title="Proposer la nulle">
          {nulleEnAttente ? '½ Proposée…' : '½ Nulle'}
        </Btn>
      )}
      {onAbandonner && (
        confirmeAbandon
          ? <Btn danger onClick={() => { setConfirmeAbandon(false); onAbandonner() }} disabled={disabled} title="Confirmer l'abandon">⚠ Sûr ?</Btn>
          : <Btn danger onClick={() => { setConfirmeAbandon(true); setTimeout(() => setConfirmeAbandon(false), 3000) }} disabled={disabled} title="Abandonner la partie">🏳 Abandonner</Btn>
      )}
    </div>
  )
}
