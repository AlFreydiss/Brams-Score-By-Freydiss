// ── Modale de fin : résultat, variation d'ELO animée, revanche ───────────────
import { useEffect, useState } from 'react'
import { THEME } from '../constants.js'
import { rangPourElo } from '../lib/elo.js'

const LIBELLES_CAUSE = {
  mat: 'Échec et mat', pat: 'Pat', abandon: 'Abandon', temps: 'Au temps',
  nulle_accord: 'Nulle sur accord', repetition: 'Triple répétition',
  materiel: 'Matériel insuffisant', cinquante_coups: 'Règle des 50 coups',
  deconnexion: 'Déconnexion',
}

// Compteur animé pour le delta ELO
function DeltaElo({ delta, eloFinal }) {
  const [affiche, setAffiche] = useState(0)
  useEffect(() => {
    if (!delta) { setAffiche(0); return }
    const t0 = performance.now()
    let raf
    const anim = now => {
      const t = Math.min(1, (now - t0) / 900)
      setAffiche(Math.round(delta * (1 - Math.pow(1 - t, 3))))
      if (t < 1) raf = requestAnimationFrame(anim)
    }
    raf = requestAnimationFrame(anim)
    return () => cancelAnimationFrame(raf)
  }, [delta])
  if (delta == null) return null
  const pos = delta >= 0
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 10, marginTop: 6 }}>
      <span style={{
        fontFamily: THEME.fontDisplay, fontWeight: 800, fontSize: 34,
        color: pos ? THEME.success : THEME.accent, fontVariantNumeric: 'tabular-nums',
      }}>
        {pos ? '+' : ''}{affiche}
      </span>
      {eloFinal != null && (
        <span style={{ fontSize: 15, color: THEME.muted }}>
          → <b style={{ color: THEME.gold }}>{eloFinal}</b> ELO
        </span>
      )}
    </div>
  )
}

export default function FinPartieModal({
  resultat,            // 'blanc' | 'noir' | 'nulle'
  cause,
  maCouleur,           // 'w' | 'b' | null (hotseat)
  deltaElo = null,     // variation pour MOI (null en solo)
  eloFinal = null,
  onRevanche, revancheEnAttente,
  onFermer, onNouvellePartie,
}) {
  const gagne = maCouleur && resultat !== 'nulle' && ((resultat === 'blanc') === (maCouleur === 'w'))
  const titre = resultat === 'nulle' ? 'Partie nulle'
    : maCouleur ? (gagne ? 'Victoire !' : 'Défaite')
    : (resultat === 'blanc' ? 'Les Blancs gagnent' : 'Les Noirs gagnent')
  const emoji = resultat === 'nulle' ? '🤝' : gagne ? '🏆' : maCouleur ? '💀' : '⚔️'
  const couleurTitre = resultat === 'nulle' ? THEME.blue : gagne || !maCouleur ? THEME.gold : THEME.accent
  const rang = eloFinal != null ? rangPourElo(eloFinal) : null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(8,9,11,0.72)', backdropFilter: 'blur(6px)', animation: 'echecsFadeIn .25s ease',
    }}>
      <style>{`
        @keyframes echecsFadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes echecsPop { from { opacity: 0; transform: translateY(18px) scale(.96) } to { opacity: 1; transform: none } }
      `}</style>
      <div style={{
        width: 'min(400px, calc(100vw - 40px))', padding: '30px 28px 24px', textAlign: 'center',
        background: 'linear-gradient(160deg, rgba(36,38,42,0.96), rgba(24,25,28,0.96))',
        border: `1px solid ${THEME.cardBorderHover}`, borderRadius: 22,
        boxShadow: '0 40px 90px -30px rgba(0,0,0,.9)', animation: 'echecsPop .35s cubic-bezier(.34,1.56,.64,1)',
      }}>
        <div style={{ fontSize: 54, lineHeight: 1 }}>{emoji}</div>
        <h2 style={{ margin: '12px 0 2px', fontFamily: THEME.fontDisplay, fontWeight: 800, fontSize: 30, color: couleurTitre, letterSpacing: '-0.01em' }}>
          {titre}
        </h2>
        <div style={{ fontSize: 14, color: THEME.muted, fontWeight: 600 }}>{LIBELLES_CAUSE[cause] || cause || ''}</div>

        <DeltaElo delta={deltaElo} eloFinal={eloFinal} />
        {rang && (
          <div style={{ marginTop: 4, fontSize: 12.5, color: rang.couleur, fontWeight: 700 }}>
            {rang.emoji} {rang.label} · {rang.zone}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          {onRevanche && (
            <button
              onClick={onRevanche} disabled={revancheEnAttente}
              style={{
                flex: 1, padding: '12px 14px', borderRadius: 12, cursor: revancheEnAttente ? 'default' : 'pointer',
                fontFamily: THEME.fontBody, fontWeight: 800, fontSize: 14,
                background: revancheEnAttente ? 'rgba(255,215,0,0.12)' : `linear-gradient(135deg, ${THEME.gold}, #e8b800)`,
                color: revancheEnAttente ? THEME.gold : '#1a1500', border: 'none',
              }}
            >
              {revancheEnAttente ? '⏳ En attente…' : '🔄 Revanche'}
            </button>
          )}
          {onNouvellePartie && (
            <button
              onClick={onNouvellePartie}
              style={{
                flex: 1, padding: '12px 14px', borderRadius: 12, cursor: 'pointer',
                fontFamily: THEME.fontBody, fontWeight: 800, fontSize: 14,
                background: 'rgba(255,255,255,0.08)', color: THEME.text, border: `1px solid ${THEME.cardBorderHover}`,
              }}
            >
              ♟ Nouvelle partie
            </button>
          )}
          <button
            onClick={onFermer}
            style={{
              flex: onRevanche || onNouvellePartie ? 0.6 : 1, padding: '12px 14px', borderRadius: 12, cursor: 'pointer',
              fontFamily: THEME.fontBody, fontWeight: 700, fontSize: 14,
              background: 'transparent', color: THEME.muted, border: `1px solid ${THEME.cardBorder}`,
            }}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}
