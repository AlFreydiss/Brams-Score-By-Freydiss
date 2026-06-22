// ── Partie en ligne 1v1 : coups broadcast + persistance, horloges serveur ────
// La légalité est revérifiée des deux côtés par chess.js (garde-fou) ; le temps
// et l'ELO sont arbitrés par les RPC server-side.
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { usePartie } from '../hooks/usePartie.js'
import { useRealtimeGame } from '../hooks/useRealtimeGame.js'
import { useHorloge } from '../hooks/useHorloge.js'
import PlateauReglable from '../components/PlateauReglable.jsx'
import PanneauJoueur from '../components/PanneauJoueur.jsx'
import HistoriqueCoups from '../components/HistoriqueCoups.jsx'
import BarreActions from '../components/BarreActions.jsx'
import FinPartieModal from '../components/FinPartieModal.jsx'
import EchecsAnalyse from '../EchecsAnalyse.jsx'
import { getPartie, rpcJouerCoup, rpcTerminer, rpcAbandonner, rpcNulleAccord, rpcReclamerTemps, rpcRevanche, rpcFinaliser } from '../lib/api.js'
import { THEME, DELAI_DECO_MS, taillePlateauAuto } from '../constants.js'
import { sons } from '../lib/sons.js'
import { useReglagesEchecs } from '../hooks/useReglagesEchecs.js'

function sonDuCoup(mv, enEchec) {
  if (mv.promotion || mv.flags?.includes('p')) sons.promotion()
  else if (enEchec) sons.echec()
  else if (mv.flags?.includes('k') || mv.flags?.includes('q')) sons.roque()
  else if (mv.captured) sons.capture()
  else sons.coup()
}

export default function MultiOnline({ partieId, monUid, onQuitter, onRejoindrePartie, troisD = false }) {
  const reglages = useReglagesEchecs()
  const partie = usePartie()
  const [row, setRow] = useState(null)             // ligne echecs_parties (vérité DB)
  const [chargement, setChargement] = useState(true)
  const [finVisible, setFinVisible] = useState(false)
  const [analyseVisible, setAnalyseVisible] = useState(false)
  const [deltaElo, setDeltaElo] = useState(null)
  const [eloFinal, setEloFinal] = useState(null)
  const [nulleRecue, setNulleRecue] = useState(false)      // l'adversaire propose
  const [nulleEnvoyee, setNulleEnvoyee] = useState(false)  // j'ai proposé
  const [revancheRecue, setRevancheRecue] = useState(false)
  const [revancheEnvoyee, setRevancheEnvoyee] = useState(false)
  const [decoDepuis, setDecoDepuis] = useState(null)
  const rowRef = useRef(null); rowRef.current = row
  const finaliseRef = useRef(false)
  const pgnChargeRef = useRef('')

  const maCouleur = row ? (row.blanc_id === monUid ? 'w' : 'b') : null
  const adversaire = row ? (maCouleur === 'w'
    ? { pseudo: row.noir_pseudo, avatar: row.noir_avatar, elo: row.noir_elo }
    : { pseudo: row.blanc_pseudo, avatar: row.blanc_avatar, elo: row.blanc_elo }) : null
  const moi = row ? (maCouleur === 'w'
    ? { pseudo: row.blanc_pseudo, avatar: row.blanc_avatar, elo: row.blanc_elo }
    : { pseudo: row.noir_pseudo, avatar: row.noir_avatar, elo: row.noir_elo }) : null

  // ── Synchronisation DB → état local (connexion, reprise, filet de sécurité) ──
  const appliquerRow = useCallback(nouvelle => {
    if (!nouvelle) return
    setRow(prec => {
      // n'écrase pas un état plus récent (comparaison sur dernier_coup_at + statut)
      if (prec && prec.statut !== 'en_cours' && nouvelle.statut === 'en_cours') return prec
      return nouvelle
    })
    // resync moteur si la DB a des coups que je n'ai pas (broadcast manqué / reprise)
    if (nouvelle.pgn !== undefined && nouvelle.pgn !== null && nouvelle.pgn !== pgnChargeRef.current) {
      const localPgn = partie.pgn()
      if (nouvelle.pgn !== localPgn && nouvelle.pgn.length > localPgn.length) {
        partie.chargerPgn(nouvelle.pgn)
        pgnChargeRef.current = nouvelle.pgn
      }
    }
  }, [partie])

  // Chargement initial
  useEffect(() => {
    let mort = false
    setChargement(true)
    getPartie(partieId).then(({ data }) => {
      if (mort) return
      if (data) {
        if (data.pgn) { partie.chargerPgn(data.pgn); pgnChargeRef.current = data.pgn }
        setRow(data)
        sons.debut()
      }
      setChargement(false)
    })
    return () => { mort = true }
  }, [partieId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Realtime ──
  const onCoupRecu = useCallback(payload => {
    if (!payload?.san) return
    const mv = partie.jouerSan(payload.san)        // chess.js revérifie la légalité
    if (mv) {
      pgnChargeRef.current = partie.pgn()
      sonDuCoup(mv, partie.chess.isCheck())
    } else if (payload.fen) {
      // désynchronisé → on fera confiance à la DB (postgres_changes suit)
      console.warn('[echecs] coup reçu illégal localement, resync DB attendu')
    }
    if (payload.row) appliquerRow(payload.row)
  }, [partie, appliquerRow])

  const { adversaireEnLigne, envoyer } = useRealtimeGame({
    partieId, monUid,
    onCoupRecu,
    onMajPartie: appliquerRow,
    onNulleProposee: () => { setNulleRecue(true); sons.notif() },
    onNulleRefusee: () => setNulleEnvoyee(false),
    onRevancheProposee: () => { setRevancheRecue(true); sons.notif() },
  })

  // Suivi déconnexion adversaire (bandeau informatif ; son temps continue de filer)
  useEffect(() => {
    if (!row || row.statut !== 'en_cours') { setDecoDepuis(null); return }
    if (adversaireEnLigne) setDecoDepuis(null)
    else if (!decoDepuis) setDecoDepuis(Date.now())
  }, [adversaireEnLigne, row, decoDepuis])

  // ── Horloges (serveur) ──
  const { tempsBlanc, tempsNoir, drapeauBlanc, drapeauNoir } = useHorloge({
    partie: row, actif: true, jouerTic: row?.trait === (maCouleur === 'w' ? 'blanc' : 'noir'),
  })

  // Drapeau → réclamation serveur (n'importe lequel des deux peut déclencher)
  useEffect(() => {
    if (!row || row.statut !== 'en_cours') return
    const tombe = (row.trait === 'blanc' && drapeauBlanc) || (row.trait === 'noir' && drapeauNoir)
    if (!tombe) return
    const t = setTimeout(async () => {
      const res = await rpcReclamerTemps(partieId)
      if (res && !res.error && res.id) appliquerRow(res)
    }, 600) // marge réseau : le serveur revalide avec SES timestamps
    return () => clearTimeout(t)
  }, [row, drapeauBlanc, drapeauNoir, partieId, appliquerRow])

  // ── Fin de partie (depuis la DB = vérité) ──
  useEffect(() => {
    if (!row || row.statut === 'en_cours' || finaliseRef.current) return
    finaliseRef.current = true
    const gagne = row.resultat !== 'nulle' && (row.resultat === 'blanc') === (maCouleur === 'w')
    if (row.resultat === 'nulle') sons.nulle()
    else if (gagne) sons.victoire()
    else sons.defaite()
    // applique l'ELO (idempotent) puis affiche les deltas
    rpcFinaliser(partieId).then(res => {
      if (res && !res.error) {
        const delta = maCouleur === 'w' ? res.delta_blanc : res.delta_noir
        const final_ = maCouleur === 'w' ? res.elo_blanc : res.elo_noir
        if (typeof delta === 'number') setDeltaElo(delta)
        if (typeof final_ === 'number') setEloFinal(final_)
      }
      setFinVisible(true)
    })
  }, [row, maCouleur, partieId])

  // Revanche créée (par moi ou par lui) → on suit le lien vers la nouvelle partie
  useEffect(() => {
    if (row?.revanche_id && (revancheEnvoyee || revancheRecue)) {
      const cible = row.revanche_id
      const t = setTimeout(() => onRejoindrePartie(cible), 600)
      return () => clearTimeout(t)
    }
  }, [row?.revanche_id, revancheEnvoyee, revancheRecue, onRejoindrePartie])

  // ── Mes actions ──
  const onCoup = useCallback(async mv => {
    sonDuCoup(mv, partie.chess.isCheck())
    const fen = partie.chess.fen()
    const pgn = partie.pgn()
    pgnChargeRef.current = pgn
    envoyer('coup', { san: mv.san, fen, pgn })
    const res = await rpcJouerCoup({ partieId, fen, pgn, san: mv.san })
    if (res && !res.error && res.id) appliquerRow(res)
  }, [partie, envoyer, partieId, appliquerRow])

  // Fin détectée par le moteur (mat/pat/nulle auto) → écrite en DB. Au re-render
  // uniquement (jamais dans onCoup : la closure y est périmée). Les deux clients
  // détectent la même fin ; le serveur n'accepte que la première écriture.
  const { fin: finLocale } = partie
  useEffect(() => {
    if (!finLocale.terminee || !rowRef.current || rowRef.current.statut !== 'en_cours') return
    rpcTerminer({
      partieId, resultat: finLocale.resultat, cause: finLocale.cause,
      fen: partie.chess.fen(), pgn: partie.pgn(),
    }).then(t => { if (t && !t.error && t.id) appliquerRow(t) })
  }, [finLocale.terminee]) // eslint-disable-line react-hooks/exhaustive-deps

  const proposerNulle = useCallback(() => {
    setNulleEnvoyee(true)
    envoyer('nulle_proposee', { par: monUid })
  }, [envoyer, monUid])

  const accepterNulle = useCallback(async () => {
    setNulleRecue(false)
    const res = await rpcNulleAccord(partieId)
    if (res && !res.error && res.id) appliquerRow(res)
  }, [partieId, appliquerRow])

  const refuserNulle = useCallback(() => {
    setNulleRecue(false)
    envoyer('nulle_refusee', { par: monUid })
  }, [envoyer, monUid])

  const abandonner = useCallback(async () => {
    const res = await rpcAbandonner(partieId)
    if (res && !res.error && res.id) appliquerRow(res)
  }, [partieId, appliquerRow])

  const demanderRevanche = useCallback(async () => {
    setRevancheEnvoyee(true)
    envoyer('revanche_proposee', { par: monUid })
    if (revancheRecue) {
      // les deux sont d'accord → je crée la revanche (couleurs inversées)
      const res = await rpcRevanche(partieId)
      if (typeof res === 'string' && res.length > 20) onRejoindrePartie(res)
    }
  }, [envoyer, monUid, revancheRecue, partieId, onRejoindrePartie])

  // L'autre a déjà demandé et JE clique → création immédiate
  useEffect(() => {
    if (revancheRecue && revancheEnvoyee && !row?.revanche_id) {
      rpcRevanche(partieId).then(res => {
        if (typeof res === 'string' && res.length > 20) onRejoindrePartie(res)
      })
    }
  }, [revancheRecue, revancheEnvoyee]) // eslint-disable-line react-hooks/exhaustive-deps

  const utiliser3D = reglages.embarque ? reglages.plateau3D : troisD
  const taillePlateau = useMemo(() => taillePlateauAuto(utiliser3D), [utiliser3D])

  if (chargement) {
    return <div style={{ textAlign: 'center', padding: 60, color: THEME.muted, fontFamily: THEME.fontBody }}>Chargement de la partie…</div>
  }
  if (!row) {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: THEME.muted, fontFamily: THEME.fontBody }}>
        Partie introuvable. <button onClick={onQuitter} style={{ color: THEME.gold, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>← Retour</button>
      </div>
    )
  }

  const { trait, fin, captures, historique, enEchec } = partie
  const monTrait = maCouleur === 'w' ? 'blanc' : 'noir'
  const enCours = row.statut === 'en_cours'
  const mesCaptures = maCouleur === 'w' ? captures.parBlanc : captures.parNoir
  const sesCaptures = maCouleur === 'w' ? captures.parNoir : captures.parBlanc
  const avantageMoi = maCouleur === 'w' ? captures.avantage : -captures.avantage
  const tempsMoi = maCouleur === 'w' ? tempsBlanc : tempsNoir
  const tempsLui = maCouleur === 'w' ? tempsNoir : tempsBlanc
  const decoLongue = decoDepuis && Date.now() - decoDepuis > DELAI_DECO_MS

  return (
    <div style={{ display: 'flex', gap: 22, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', minHeight: 'calc(100vh - 230px)' }}>
      <PlateauReglable
        partie={partie}
        orientation={maCouleur === 'w' ? 'white' : 'black'}
        peutJouer={c => enCours && c === maCouleur}
        onCoup={onCoup}
        taille={taillePlateau}
        interactif={enCours}
        maCouleur={maCouleur}
        troisD={reglages.embarque ? undefined : troisD}
      />

      <div style={{ width: 'min(330px, 92vw)', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <PanneauJoueur
          pseudo={adversaire?.pseudo} avatar={adversaire?.avatar} elo={adversaire?.elo}
          auTrait={enCours && row.trait !== monTrait}
          horlogeMs={tempsLui} horlogeActive={enCours && row.trait !== monTrait}
          capturees={sesCaptures} couleurCapturees={maCouleur}
          avantage={-avantageMoi > 0 ? -avantageMoi : 0}
          enLigne={adversaireEnLigne}
        />
        <PanneauJoueur
          pseudo={moi?.pseudo} avatar={moi?.avatar} elo={moi?.elo}
          auTrait={enCours && row.trait === monTrait}
          horlogeMs={tempsMoi} horlogeActive={enCours && row.trait === monTrait}
          capturees={mesCaptures} couleurCapturees={maCouleur === 'w' ? 'b' : 'w'}
          avantage={avantageMoi > 0 ? avantageMoi : 0}
        />

        {!adversaireEnLigne && enCours && (
          <div style={{ padding: '8px 12px', borderRadius: 10, fontSize: 12.5, fontWeight: 600, background: 'rgba(224,82,74,0.10)', border: '1px solid rgba(224,82,74,0.3)', color: '#ffb4ae' }}>
            📡 Adversaire déconnecté{decoLongue ? ' — son horloge continue de tourner.' : '…'}
          </div>
        )}

        {nulleRecue && enCours && (
          <div style={{ padding: '10px 12px', borderRadius: 12, background: 'rgba(116,185,255,0.08)', border: '1px solid rgba(116,185,255,0.35)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: THEME.blue, marginBottom: 8 }}>½ L'adversaire propose la nulle</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={accepterNulle} style={{ flex: 1, padding: '8px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 12.5, background: 'rgba(52,211,153,0.15)', color: THEME.success, border: '1px solid rgba(52,211,153,0.4)' }}>✓ Accepter</button>
              <button onClick={refuserNulle} style={{ flex: 1, padding: '8px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 12.5, background: 'rgba(224,82,74,0.12)', color: '#ffb4ae', border: '1px solid rgba(224,82,74,0.4)' }}>✕ Refuser</button>
            </div>
          </div>
        )}

        <HistoriqueCoups historique={historique} hauteur={170} />
        {enCours && (
          <BarreActions
            onAbandonner={abandonner}
            onProposerNulle={proposerNulle}
            nulleEnAttente={nulleEnvoyee}
          />
        )}
        <button onClick={onQuitter} style={{
          padding: '9px 12px', borderRadius: 10, cursor: 'pointer', fontFamily: THEME.fontBody,
          fontWeight: 600, fontSize: 12.5, color: THEME.muted, background: 'transparent',
          border: `1px solid ${THEME.cardBorder}`,
        }}>
          ← Quitter {enCours ? '(la partie continue)' : ''}
        </button>
        {enEchec && enCours && trait === maCouleur && (
          <div style={{ textAlign: 'center', color: THEME.accent, fontWeight: 800, fontSize: 13, letterSpacing: '0.06em' }}>⚠ ÉCHEC !</div>
        )}
      </div>

      {finVisible && (
        <FinPartieModal
          resultat={row.resultat} cause={row.cause} maCouleur={maCouleur}
          deltaElo={deltaElo} eloFinal={eloFinal}
          onRevanche={demanderRevanche} revancheEnAttente={revancheEnvoyee && !revancheRecue}
          onAnalyser={historique.length ? () => setAnalyseVisible(true) : undefined}
          onFermer={() => setFinVisible(false)}
        />
      )}
      {analyseVisible && (
        <EchecsAnalyse
          pgn={partie.pgn()} historique={historique}
          resultat={row.resultat} orientation={maCouleur === 'w' ? 'white' : 'black'}
          onClose={() => setAnalyseVisible(false)}
        />
      )}
      {finVisible && revancheRecue && !revancheEnvoyee && (
        <div style={{ position: 'fixed', bottom: 22, left: '50%', transform: 'translateX(-50%)', zIndex: 1001, padding: '12px 18px', borderRadius: 14, background: THEME.card, border: `1px solid rgba(255,215,0,0.4)`, display: 'flex', gap: 12, alignItems: 'center', boxShadow: '0 18px 50px -16px rgba(0,0,0,.8)' }}>
          <span style={{ fontSize: 13.5, fontWeight: 700, color: THEME.text }}>🔄 L'adversaire veut sa revanche !</span>
          <button onClick={demanderRevanche} style={{ padding: '8px 16px', borderRadius: 10, cursor: 'pointer', fontWeight: 800, fontSize: 13, background: `linear-gradient(135deg, ${THEME.gold}, #e8b800)`, color: '#1a1500', border: 'none' }}>
            Accepter
          </button>
        </div>
      )}
    </div>
  )
}
