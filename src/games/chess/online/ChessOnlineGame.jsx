// ── ChessOnlineGame : partie classée 1v1, rendu sobre dans l'univers ─────────
// Port fidèle de features/echecs/modes/MultiOnline.jsx. La COUCHE RÉSEAU est
// identique (getPartie, useRealtimeGame, useHorloge serveur, drapeau→reclamer,
// fin→finaliser ELO, onCoup→jouer_coup, finLocale→terminer, abandon, nulle,
// revanche). Le RENDU est refait en 2D strict avec les tokens neutralTheme +
// les atomes de l'univers (Plateau 2D, MoveList, EndOverlay). Zéro 3D, zéro
// ancien THEME pirate.
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { usePartie } from '../../../features/echecs/hooks/usePartie.js'
import { useRealtimeGame } from '../../../features/echecs/hooks/useRealtimeGame.js'
import { useHorloge } from '../../../features/echecs/hooks/useHorloge.js'
import {
  getPartie, rpcJouerCoup, rpcTerminer, rpcAbandonner, rpcNulleAccord,
  rpcReclamerTemps, rpcRevanche, rpcFinaliser,
} from '../../../features/echecs/lib/api.js'
import { DELAI_DECO_MS } from '../../../features/echecs/constants.js'
import { sons } from '../../../features/echecs/lib/sons.js'
import { ui, fonts } from '../../../features/games/neutralTheme.js'
import Plateau from '../../../features/echecs/components/Plateau.jsx'
import MoveList from '../ui/MoveList.jsx'
import EndOverlay from '../ui/EndOverlay.jsx'
import { boardParId } from '../logic/boards.js'
import { useChessSettings } from '../logic/useChessSettings.js'
import { formaterTemps } from '../ui/format.js'

const BRASS = '#b09467'
const SEUIL_CRITIQUE = 10000

function sonDuCoup(mv, enEchec) {
  if (mv.promotion || mv.flags?.includes('p')) sons.promotion()
  else if (enEchec) sons.echec()
  else if (mv.flags?.includes('k') || mv.flags?.includes('q')) sons.roque()
  else if (mv.captured) sons.capture()
  else sons.coup()
}

// glyphe d'une pièce capturée (campCapteur = qui a capturé → pièce adverse)
const GLYPHES = { w: { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛' }, b: { p: '♙', n: '♘', b: '♗', r: '♖', q: '♕' } }
function glyphe(campCapteur, type) { return (GLYPHES[campCapteur] && GLYPHES[campCapteur][type]) || '' }

// ── Horloge serveur (valeur ms brute, pas d'abonnement local) ──────────────
// Mirroir visuel de l'atome Clock mais alimenté par useHorloge (temps serveur).
function ServerClock({ ms, actif }) {
  const critique = actif && ms != null && ms < SEUIL_CRITIQUE
  const couleur = critique ? ui.bad : (actif ? ui.text : ui.textDim)
  return (
    <div role="timer" style={{
      display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
      minWidth: 104, padding: '7px 14px', borderRadius: ui.radius.sm,
      background: actif ? ui.surfaceHi : ui.surface,
      border: `1px solid ${critique ? 'rgba(212,104,90,0.55)' : (actif ? ui.lineHi : ui.line)}`,
      boxShadow: actif ? 'inset 0 0 0 1px rgba(255,255,255,0.03)' : 'none',
      transition: 'background .18s, border-color .18s',
    }}>
      <span style={{
        font: `700 21px ${fonts.mono}`, fontVariantNumeric: 'tabular-nums',
        letterSpacing: '0.02em', color: couleur, fontFeatureSettings: '"tnum" 1',
      }}>
        {ms == null ? '—:—' : formaterTemps(ms)}
      </span>
    </div>
  )
}

// ── Rangée joueur (pseudo/avatar/elo + point en ligne + horloge serveur) ────
function JoueurEnLigne({ pseudo, avatar, elo, auTrait, ms, capturees, couleurCapturees, enLigne, montrerLigne }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
      padding: '8px 10px', borderRadius: ui.radius.sm,
      background: auTrait ? ui.surfaceHi : ui.surface,
      border: `1px solid ${auTrait ? ui.lineHi : ui.line}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        {avatar
          ? <img src={avatar} alt="" style={{ width: 32, height: 32, borderRadius: ui.radius.sm, objectFit: 'cover', flexShrink: 0, border: `1px solid ${ui.line}` }} />
          : <div style={{ width: 32, height: 32, borderRadius: ui.radius.sm, flexShrink: 0, background: ui.bg, border: `1px solid ${ui.line}`, display: 'grid', placeItems: 'center', font: `700 13px ${fonts.body}`, color: ui.textMute }}>
              {(pseudo || '?').slice(0, 1).toUpperCase()}
            </div>}
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {montrerLigne && (
              <span aria-hidden title={enLigne ? 'En ligne' : 'Hors ligne'} style={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                background: enLigne ? ui.good : ui.textMute,
              }} />
            )}
            <span style={{ font: `700 13px ${fonts.body}`, color: ui.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {pseudo || 'Joueur'}
            </span>
            <span style={{ font: `600 11px ${fonts.mono}`, color: ui.textMute, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
              {elo ?? '—'}
            </span>
          </div>
          {capturees.length > 0 && (
            <div style={{ font: `400 13px ${fonts.body}`, color: ui.textDim, lineHeight: 1, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {capturees.map((p, i) => <span key={i} style={{ opacity: 0.8 }}>{glyphe(couleurCapturees, p)}</span>)}
            </div>
          )}
        </div>
      </div>
      <ServerClock ms={ms} actif={auTrait} />
    </div>
  )
}

export default function ChessOnlineGame({ partieId, monUid, onQuitter, onRejoindrePartie }) {
  const { reglages } = useChessSettings()
  const partie = usePartie()
  const [row, setRow] = useState(null)             // ligne echecs_parties (vérité DB)
  const [chargement, setChargement] = useState(true)
  const [finVisible, setFinVisible] = useState(false)
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
      // n'écrase pas un état plus récent (comparaison sur statut)
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
    // reset des états de partie quand on change de partieId (revanche)
    setFinVisible(false); setDeltaElo(null); setEloFinal(null)
    setNulleRecue(false); setNulleEnvoyee(false); setRevancheRecue(false); setRevancheEnvoyee(false)
    finaliseRef.current = false
    getPartie(partieId).then(({ data }) => {
      if (mort) return
      if (data) {
        if (data.pgn) { partie.chargerPgn(data.pgn); pgnChargeRef.current = data.pgn }
        else { partie.reinitialiser(); pgnChargeRef.current = '' }
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
    setNulleRecue(false)
    const fen = partie.chess.fen()
    const pgn = partie.pgn()
    pgnChargeRef.current = pgn
    envoyer('coup', { san: mv.san, fen, pgn })
    const res = await rpcJouerCoup({ partieId, fen, pgn, san: mv.san })
    if (res && !res.error && res.id) appliquerRow(res)
  }, [partie, envoyer, partieId, appliquerRow])

  // Fin détectée par le moteur (mat/pat/nulle auto) → écrite en DB. Au re-render
  // uniquement (jamais dans onCoup : la closure y est périmée).
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

  // ── Taille responsive du plateau (mirroir de PlayTab) ──
  const [taille, setTaille] = useState(440)
  const mobile = typeof window !== 'undefined' && window.innerWidth < 880
  useEffect(() => {
    const calc = () => {
      const vw = window.innerWidth, vh = window.innerHeight
      const m = vw < 880
      const dispoLargeur = m ? vw - 28 : vw - 320 - 64 - 16
      const dispoHauteur = vh - (m ? 320 : 150)
      const t = Math.max(260, Math.min(640, dispoLargeur, dispoHauteur))
      setTaille(Math.floor(t))
    }
    calc()
    window.addEventListener('resize', calc)
    return () => window.removeEventListener('resize', calc)
  }, [])

  const boardId = reglages.board
  const tema = useMemo(() => boardParId(boardId), [boardId])

  if (chargement) {
    return <div style={{ textAlign: 'center', padding: 60, color: ui.textDim, font: `500 14px ${fonts.body}` }}>Chargement de la partie…</div>
  }
  if (!row) {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: ui.textDim, font: `500 14px ${fonts.body}` }}>
        Partie introuvable.{' '}
        <button onClick={onQuitter} style={{ color: BRASS, background: 'none', border: 'none', cursor: 'pointer', font: `700 14px ${fonts.body}` }}>← Retour</button>
      </div>
    )
  }

  const { trait, captures, historique, enEchec } = partie
  const monTrait = maCouleur === 'w' ? 'blanc' : 'noir'
  const enCours = row.statut === 'en_cours'
  const mesCaptures = maCouleur === 'w' ? captures.parBlanc : captures.parNoir
  const sesCaptures = maCouleur === 'w' ? captures.parNoir : captures.parBlanc
  const tempsMoi = maCouleur === 'w' ? tempsBlanc : tempsNoir
  const tempsLui = maCouleur === 'w' ? tempsNoir : tempsBlanc
  const decoLongue = decoDepuis && Date.now() - decoDepuis > DELAI_DECO_MS
  const orientation = maCouleur === 'w' ? 'white' : 'black'

  return (
    <div style={{
      display: 'flex', flexDirection: mobile ? 'column' : 'row',
      gap: mobile ? 14 : 24, alignItems: mobile ? 'stretch' : 'flex-start',
      justifyContent: 'center', padding: mobile ? '12px 10px 30px' : '18px 22px 24px',
      minHeight: 0, position: 'relative',
    }}>
      {/* Board */}
      <div style={{ display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
        <div style={{ position: 'relative', width: taille, height: taille }}>
          <Plateau
            partie={partie}
            orientation={orientation}
            peutJouer={c => enCours && c === maCouleur}
            onCoup={onCoup}
            taille={taille}
            interactif={enCours}
            maCouleur={maCouleur}
            theme={tema}
            animationMs={reglages.animations ? reglages.vitesseAnim : 0}
            afficherCoupsLegaux={reglages.surbrillanceLegale}
            afficherDernierCoup
            afficherEchec
            premoveActif={reglages.premoves}
            autoPromo={reglages.autoQueen}
            coordonnees={reglages.coords ? 'exterieur' : 'masque'}
          />
        </div>
      </div>

      {/* Panneau droit */}
      <div style={{
        width: mobile ? '100%' : 320, flexShrink: 0,
        display: 'flex', flexDirection: 'column', gap: 10,
        maxHeight: mobile ? 'none' : taille + 20, minHeight: 0,
      }}>
        <JoueurEnLigne
          pseudo={adversaire?.pseudo} avatar={adversaire?.avatar} elo={adversaire?.elo}
          auTrait={enCours && row.trait !== monTrait}
          ms={tempsLui}
          capturees={sesCaptures} couleurCapturees={maCouleur}
          enLigne={adversaireEnLigne} montrerLigne
        />

        {!adversaireEnLigne && enCours && (
          <div style={{ padding: '8px 12px', borderRadius: ui.radius.sm, font: `600 12.5px ${fonts.body}`, background: 'rgba(217,164,65,0.10)', border: '1px solid rgba(217,164,65,0.3)', color: ui.warn }}>
            Adversaire déconnecté{decoLongue ? ' — son horloge continue de tourner.' : '…'}
          </div>
        )}

        {nulleRecue && enCours && (
          <div style={{ padding: '10px 12px', borderRadius: ui.radius.sm, background: ui.surface, border: `1px solid ${ui.lineHi}` }}>
            <div style={{ font: `700 13px ${fonts.body}`, color: ui.text, marginBottom: 8 }}>L'adversaire propose la nulle</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={accepterNulle} style={{ flex: 1, padding: '8px', borderRadius: ui.radius.sm, cursor: 'pointer', font: `700 12.5px ${fonts.body}`, background: 'rgba(127,184,106,0.14)', color: ui.good, border: '1px solid rgba(127,184,106,0.4)' }}>Accepter</button>
              <button onClick={refuserNulle} style={{ flex: 1, padding: '8px', borderRadius: ui.radius.sm, cursor: 'pointer', font: `700 12.5px ${fonts.body}`, background: 'rgba(212,104,90,0.12)', color: '#e7b3aa', border: '1px solid rgba(212,104,90,0.4)' }}>Refuser</button>
            </div>
          </div>
        )}

        <div style={{ flex: 1, minHeight: 120, display: 'flex' }}>
          <MoveList historique={historique} curseur={historique.length - 1} onAller={() => {}} />
        </div>

        {enCours && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={proposerNulle} disabled={nulleEnvoyee} style={{
              flex: 1, padding: '10px', borderRadius: ui.radius.sm, cursor: nulleEnvoyee ? 'default' : 'pointer',
              font: `600 12.5px ${fonts.body}`, color: nulleEnvoyee ? ui.textMute : ui.text,
              background: ui.surface, border: `1px solid ${ui.line}`, opacity: nulleEnvoyee ? 0.6 : 1,
            }}>{nulleEnvoyee ? 'Nulle proposée' : 'Proposer nulle'}</button>
            <button onClick={abandonner} style={{
              flex: 1, padding: '10px', borderRadius: ui.radius.sm, cursor: 'pointer',
              font: `600 12.5px ${fonts.body}`, color: '#e7b3aa',
              background: ui.surface, border: `1px solid ${ui.line}`,
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(212,104,90,0.5)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = ui.line }}>
              Abandonner
            </button>
          </div>
        )}

        <JoueurEnLigne
          pseudo={moi?.pseudo} avatar={moi?.avatar} elo={moi?.elo}
          auTrait={enCours && row.trait === monTrait}
          ms={tempsMoi}
          capturees={mesCaptures} couleurCapturees={maCouleur === 'w' ? 'b' : 'w'}
        />

        {enEchec && enCours && trait === maCouleur && (
          <div style={{ textAlign: 'center', color: ui.bad, font: `800 13px ${fonts.body}`, letterSpacing: '0.08em' }}>ÉCHEC</div>
        )}

        <button onClick={onQuitter} style={{
          padding: '8px', borderRadius: ui.radius.sm, cursor: 'pointer',
          font: `600 12px ${fonts.body}`, color: ui.textMute, background: 'transparent',
          border: `1px solid ${ui.line}`,
        }}>
          ← Quitter {enCours ? '(la partie continue)' : ''}
        </button>
      </div>

      {finVisible && (
        <EndOverlay
          resultat={row.resultat} cause={row.cause} maCouleur={maCouleur}
          deltaElo={deltaElo}
          eloFinal={eloFinal}
          onRejouer={demanderRevanche}
          onRetour={onQuitter}
          onFermer={() => setFinVisible(false)}
        />
      )}

      {finVisible && revancheRecue && !revancheEnvoyee && (
        <div style={{
          position: 'fixed', bottom: 22, left: '50%', transform: 'translateX(-50%)', zIndex: 1001,
          padding: '12px 18px', borderRadius: ui.radius.md, background: ui.bgElev,
          border: `1px solid ${ui.lineHi}`, display: 'flex', gap: 12, alignItems: 'center', boxShadow: ui.shadow,
        }}>
          <span style={{ font: `700 13.5px ${fonts.body}`, color: ui.text }}>L'adversaire veut sa revanche</span>
          <button onClick={demanderRevanche} style={{
            padding: '8px 16px', borderRadius: ui.radius.sm, cursor: 'pointer',
            font: `800 13px ${fonts.body}`, color: '#15110a', background: BRASS, border: 'none',
          }}>
            Accepter
          </button>
        </div>
      )}
    </div>
  )
}
