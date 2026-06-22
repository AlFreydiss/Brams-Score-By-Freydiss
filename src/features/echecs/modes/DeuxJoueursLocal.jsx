// ── 2 joueurs sur le même écran (hotseat) : validation des règles + fun local ─
import { useState, useEffect, useCallback, useMemo } from 'react'
import { usePartie } from '../hooks/usePartie.js'
import Plateau from '../components/Plateau.jsx'
import Plateau3D from '../components/Plateau3D.jsx'
import HistoriqueCoups from '../components/HistoriqueCoups.jsx'
import PiecesCapturees from '../components/PiecesCapturees.jsx'
import BarreActions from '../components/BarreActions.jsx'
import FinPartieModal from '../components/FinPartieModal.jsx'
import { THEME, taillePlateauAuto } from '../constants.js'
import { sons } from '../lib/sons.js'

export default function DeuxJoueursLocal({ onQuitter, troisD = false }) {
  const partie = usePartie()
  const [finVisible, setFinVisible] = useState(false)
  const { trait, fin, captures, historique, enEchec } = partie

  const onCoup = useCallback(mv => {
    if (mv.promotion || mv.flags?.includes('p')) sons.promotion()
    else if (partie.chess.isCheck()) sons.echec()
    else if (mv.flags?.includes('k') || mv.flags?.includes('q')) sons.roque()
    else if (mv.captured) sons.capture()
    else sons.coup()
  }, [partie])

  // fin détectée au re-render (jamais dans onCoup : la closure y est périmée)
  useEffect(() => {
    if (!fin.terminee) return
    const t = setTimeout(() => setFinVisible(true), 450)
    return () => clearTimeout(t)
  }, [fin.terminee])

  const taillePlateau = useMemo(() => taillePlateauAuto(troisD), [troisD])
  const PlateauComp = troisD ? Plateau3D : Plateau

  return (
    <div style={{ display: 'flex', gap: 22, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', minHeight: 'calc(100vh - 230px)' }}>
      <PlateauComp
        partie={partie}
        orientation="white"
        peutJouer={c => c === trait && !fin.terminee}
        onCoup={onCoup}
        taille={taillePlateau}
        interactif={!fin.terminee}
        troisD={troisD}
      />
      <div style={{ width: 'min(330px, 92vw)', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ padding: '12px 14px', background: THEME.card, border: `1px solid ${THEME.cardBorder}`, borderRadius: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: THEME.text, fontFamily: THEME.fontDisplay }}>
            {fin.terminee ? '🏁 Partie terminée' : trait === 'w' ? '♔ Aux Blancs de jouer' : '♚ Aux Noirs de jouer'}
            {enEchec && !fin.terminee && <span style={{ color: THEME.accent, marginLeft: 8 }}>⚠ ÉCHEC</span>}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            <PiecesCapturees pieces={captures.parBlanc} couleurPieces="b" avantage={captures.avantage > 0 ? captures.avantage : 0} />
            <PiecesCapturees pieces={captures.parNoir} couleurPieces="w" avantage={captures.avantage < 0 ? -captures.avantage : 0} />
          </div>
        </div>
        <HistoriqueCoups historique={historique} hauteur={230} />
        <BarreActions onAnnulerCoup={() => historique.length && partie.annuler(1)} disabled={fin.terminee} />
        <button onClick={onQuitter} style={{
          padding: '9px 12px', borderRadius: 10, cursor: 'pointer', fontFamily: THEME.fontBody,
          fontWeight: 600, fontSize: 12.5, color: THEME.muted, background: 'transparent', border: `1px solid ${THEME.cardBorder}`,
        }}>
          ← Retour au menu
        </button>
      </div>
      {finVisible && (
        <FinPartieModal
          resultat={fin.resultat} cause={fin.cause} maCouleur={null}
          onNouvellePartie={() => { partie.reinitialiser(); setFinVisible(false); sons.debut() }}
          onFermer={() => setFinVisible(false)}
        />
      )}
    </div>
  )
}
