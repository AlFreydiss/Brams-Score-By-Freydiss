// ── Carte joueur : avatar, pseudo, rang One Piece, ELO, captures, horloge ────
import { THEME } from '../constants.js'
import { rangPourElo } from '../lib/elo.js'
import Horloge from './Horloge.jsx'
import PiecesCapturees from './PiecesCapturees.jsx'

export default function PanneauJoueur({
  pseudo, avatar, elo,                 // elo: null → non classé (IA / invité)
  sousTitre,                           // ex: niveau IA « Shichibukai · ~2000 »
  auTrait = false,
  horlogeMs = null, horlogeActive = false,
  capturees = [], couleurCapturees = 'w', avantage = 0,
  enLigne = null,                      // null = pas d'indicateur ; bool sinon
  masquerCaptures = false,             // réglage piecesCapturees off → on masque la ligne
}) {
  const rang = elo != null ? rangPourElo(elo) : null
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
      background: THEME.card,
      border: `1px solid ${auTrait ? 'rgba(200,164,92,0.42)' : THEME.cardBorder}`,
      borderRadius: 14,
      boxShadow: auTrait ? '0 0 0 1px rgba(200,164,92,0.18), 0 0 26px -12px rgba(200,164,92,.55)' : '0 14px 34px -22px rgba(0,0,0,.7)',
      transition: 'border-color .25s, box-shadow .25s',
    }}>
      <div style={{ position: 'relative', flexShrink: 0 }}>
        {avatar
          ? <img loading="lazy" decoding="async" src={avatar} alt="" style={{ width: 44, height: 44, borderRadius: 12, objectFit: 'cover', display: 'block' }} />
          : <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{rang?.emoji || '♟'}</div>}
        {enLigne != null && (
          <span style={{
            position: 'absolute', right: -3, bottom: -3, width: 12, height: 12, borderRadius: 6,
            background: enLigne ? THEME.success : THEME.muted, border: `2px solid ${THEME.surface}`,
          }} />
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontFamily: THEME.fontDisplay, fontWeight: 700, fontSize: 15, color: THEME.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {pseudo || 'Pirate'}
          </span>
          {elo != null && (
            <span style={{ fontSize: 13, fontWeight: 700, color: THEME.gold, fontVariantNumeric: 'tabular-nums' }}>{elo}</span>
          )}
        </div>
        <div style={{ fontSize: 11.5, color: rang ? rang.couleur : THEME.muted, fontWeight: 600, marginTop: 1 }}>
          {sousTitre || (rang ? `${rang.emoji} ${rang.label} · ${rang.zone}` : '')}
        </div>
        {!masquerCaptures && (
          <div style={{ marginTop: 4 }}>
            <PiecesCapturees pieces={capturees} couleurPieces={couleurCapturees} avantage={avantage} />
          </div>
        )}
      </div>

      {horlogeMs != null && <Horloge ms={horlogeMs} actif={horlogeActive} />}
    </div>
  )
}
