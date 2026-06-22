// ── 2 joueurs sur le même écran (hotseat) : validation des règles + fun local ─
import { useState, useEffect, useCallback, useMemo } from 'react'
import { usePartie } from '../hooks/usePartie.js'
import PlateauReglable from '../components/PlateauReglable.jsx'
import HistoriqueCoups from '../components/HistoriqueCoups.jsx'
import PiecesCapturees from '../components/PiecesCapturees.jsx'
import BarreActions from '../components/BarreActions.jsx'
import FinPartieModal from '../components/FinPartieModal.jsx'
import EchecsAnalyse from '../EchecsAnalyse.jsx'
import { THEME, taillePlateauAuto } from '../constants.js'
import { sons } from '../lib/sons.js'
import { useReglagesEchecs } from '../hooks/useReglagesEchecs.js'

export default function DeuxJoueursLocal({ onQuitter, troisD = false }) {
  const reglages = useReglagesEchecs()
  const partie = usePartie()
  const [finVisible, setFinVisible] = useState(false)
  const [analyseVisible, setAnalyseVisible] = useState(false)
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

  const utiliser3D = reglages.embarque ? reglages.plateau3D : troisD
  const taillePlateau = useMemo(() => taillePlateauAuto(utiliser3D), [utiliser3D])

  return (
    <div style={{ display: 'flex', gap: 22, justifyContent: 'center', alignItems: 'flex-start', flexWrap: 'wrap', minHeight: 'calc(100vh - 230px)', paddingTop: 8 }}>
      <PlateauReglable
        partie={partie}
        orientation="white"
        peutJouer={c => c === trait && !fin.terminee}
        onCoup={onCoup}
        taille={taillePlateau}
        interactif={!fin.terminee}
        troisD={reglages.embarque ? undefined : troisD}
      />
      <div style={{ width: 'min(330px, 92vw)', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ padding: '12px 14px', background: THEME.card, border: `1px solid ${THEME.cardBorder}`, borderRadius: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: THEME.text, fontFamily: THEME.fontDisplay }}>
            {fin.terminee ? 'Partie terminée' : trait === 'w' ? 'Trait aux Blancs' : 'Trait aux Noirs'}
            {enEchec && !fin.terminee && <span style={{ color: THEME.accent, marginLeft: 8, letterSpacing: '0.08em' }}>ÉCHEC</span>}
          </div>
          {reglages.piecesCapturees && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              <PiecesCapturees pieces={captures.parBlanc} couleurPieces="b" avantage={captures.avantage > 0 ? captures.avantage : 0} />
              <PiecesCapturees pieces={captures.parNoir} couleurPieces="w" avantage={captures.avantage < 0 ? -captures.avantage : 0} />
            </div>
          )}
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
          onAnalyser={historique.length ? () => setAnalyseVisible(true) : undefined}
          onFermer={() => setFinVisible(false)}
        />
      )}
      {analyseVisible && (
        <EchecsAnalyse
          pgn={partie.pgn()} historique={historique}
          resultat={fin.resultat} orientation="white"
          onClose={() => setAnalyseVisible(false)}
        />
      )}
    </div>
  )
}
