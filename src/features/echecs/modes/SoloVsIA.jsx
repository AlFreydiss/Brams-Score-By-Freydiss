// ── Solo vs IA : Stockfish 18 avec niveaux calibrés (rangs One Piece) ────────
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { usePartie } from '../hooks/usePartie.js'
import { useStockfish } from '../hooks/useStockfish.js'
import Plateau from '../components/Plateau.jsx'
import PanneauJoueur from '../components/PanneauJoueur.jsx'
import HistoriqueCoups from '../components/HistoriqueCoups.jsx'
import BarreActions from '../components/BarreActions.jsx'
import FinPartieModal from '../components/FinPartieModal.jsx'
import { NIVEAUX_IA, NIVEAU_IA_DEFAUT, niveauParId } from '../lib/niveauxIA.js'
import { THEME, CLE_NIVEAU_IA, CLE_COULEUR_IA } from '../constants.js'
import { sons } from '../lib/sons.js'

function lireStockage(cle, defaut) {
  try { return localStorage.getItem(cle) || defaut } catch { return defaut }
}

function sonDuCoup(mv, enEchec) {
  if (enEchec) sons.echec()
  else if (mv.flags?.includes('k') || mv.flags?.includes('q')) sons.roque()
  else if (mv.captured) sons.capture()
  else sons.coup()
}

// ── Écran de configuration ──
function ConfigSolo({ onLancer }) {
  const [niveauId, setNiveauId] = useState(lireStockage(CLE_NIVEAU_IA, NIVEAU_IA_DEFAUT))
  const [couleur, setCouleur] = useState(lireStockage(CLE_COULEUR_IA, 'w'))

  const lancer = () => {
    try { localStorage.setItem(CLE_NIVEAU_IA, niveauId); localStorage.setItem(CLE_COULEUR_IA, couleur) } catch {}
    const c = couleur === 'alea' ? (Math.random() < 0.5 ? 'w' : 'b') : couleur
    sons.debloquer()
    onLancer({ niveau: niveauParId(niveauId), maCouleur: c })
  }

  return (
    <div style={{ maxWidth: 660, margin: '0 auto' }}>
      <h2 style={{ fontFamily: THEME.fontDisplay, fontWeight: 800, fontSize: 24, color: THEME.text, margin: '0 0 18px' }}>
        ⚔️ Défier l'IA
      </h2>

      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: THEME.muted, marginBottom: 10 }}>Niveau</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 10 }}>
        {NIVEAUX_IA.map(n => {
          const actif = n.id === niveauId
          return (
            <button key={n.id} onClick={() => setNiveauId(n.id)} style={{
              textAlign: 'left', padding: '12px 14px', borderRadius: 14, cursor: 'pointer',
              background: actif ? 'rgba(255,215,0,0.10)' : THEME.card,
              border: `1px solid ${actif ? 'rgba(255,215,0,0.45)' : THEME.cardBorder}`,
              transition: 'border-color .15s, background .15s',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20 }}>{n.emoji}</span>
                <span style={{ fontFamily: THEME.fontDisplay, fontWeight: 800, fontSize: 15, color: actif ? THEME.gold : THEME.text }}>{n.label}</span>
              </div>
              <div style={{ fontSize: 12, color: THEME.muted, marginTop: 3 }}>{n.sousTitre}</div>
              <div style={{ fontSize: 11.5, color: actif ? THEME.gold : THEME.muted, fontWeight: 700, marginTop: 5 }}>
                {n.limitStrength ? `~${n.elo} ELO` : 'Pleine puissance'}
              </div>
            </button>
          )
        })}
      </div>

      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: THEME.muted, margin: '20px 0 10px' }}>Je joue</div>
      <div style={{ display: 'flex', gap: 10 }}>
        {[{ id: 'w', label: '♔ Blancs' }, { id: 'b', label: '♚ Noirs' }, { id: 'alea', label: '🎲 Aléatoire' }].map(c => (
          <button key={c.id} onClick={() => setCouleur(c.id)} style={{
            flex: 1, padding: '11px 10px', borderRadius: 12, cursor: 'pointer', fontWeight: 700, fontSize: 14,
            fontFamily: THEME.fontBody, color: couleur === c.id ? THEME.gold : THEME.text,
            background: couleur === c.id ? 'rgba(255,215,0,0.10)' : THEME.card,
            border: `1px solid ${couleur === c.id ? 'rgba(255,215,0,0.45)' : THEME.cardBorder}`,
          }}>
            {c.label}
          </button>
        ))}
      </div>

      <button onClick={lancer} style={{
        width: '100%', marginTop: 24, padding: '15px 20px', borderRadius: 14, cursor: 'pointer',
        fontFamily: THEME.fontDisplay, fontWeight: 800, fontSize: 17, letterSpacing: '0.01em',
        background: `linear-gradient(135deg, ${THEME.accent}, #c23a32)`, color: '#fff', border: 'none',
        boxShadow: '0 16px 40px -14px rgba(224,82,74,.55)',
      }}>
        Hisser les voiles ⛵
      </button>
    </div>
  )
}

// ── Partie en cours ──
function PartieSolo({ niveau, maCouleur, profil, pseudo, avatar, onRejouer, onQuitter, taillePlateau }) {
  const partie = usePartie()
  const { pret, reflechit, chercherCoup, nouvellePartie } = useStockfish(niveau)
  const [finVisible, setFinVisible] = useState(false)
  const [abandonnee, setAbandonnee] = useState(false)
  const couleurIA = maCouleur === 'w' ? 'b' : 'w'
  const rechercheEnCours = useRef(false)

  const { fen, trait, fin, captures, historique, enEchec } = partie

  useEffect(() => { sons.debut() }, [])

  // Tour de l'IA → recherche + application (fallback : coup légal aléatoire)
  useEffect(() => {
    if (fin.terminee || abandonnee || trait !== couleurIA || !pret || rechercheEnCours.current) return
    rechercheEnCours.current = true
    let annule = false
    chercherCoup(fen).then(coup => {
      rechercheEnCours.current = false
      if (annule || partie.fin.terminee) return
      let mv = coup ? partie.jouer(coup) : null
      if (!mv) {
        const legaux = partie.chess.moves({ verbose: true })
        if (legaux.length) {
          const alea = legaux[Math.floor(Math.random() * legaux.length)]
          mv = partie.jouer({ from: alea.from, to: alea.to, promotion: alea.promotion })
        }
      }
      if (mv) sonDuCoup(mv, partie.chess.isCheck())
    })
    return () => { annule = true }
  }, [fen, trait, couleurIA, pret, fin.terminee, abandonnee]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fin détectée → sons + modale
  useEffect(() => {
    if (!fin.terminee) return
    const gagne = fin.resultat !== 'nulle' && (fin.resultat === 'blanc') === (maCouleur === 'w')
    setTimeout(() => {
      if (fin.resultat === 'nulle') sons.nulle()
      else if (gagne) sons.victoire()
      else sons.defaite()
      setFinVisible(true)
    }, 450)
  }, [fin.terminee]) // eslint-disable-line react-hooks/exhaustive-deps

  const onCoup = useCallback(mv => { sonDuCoup(mv, partie.chess.isCheck()) }, [partie])

  const annulerCoup = useCallback(() => {
    if (reflechit || fin.terminee) return
    // annule la paire (réponse IA + mon coup) pour revenir à mon tour
    const n = trait === maCouleur ? 2 : 1
    if (historique.length >= n) partie.annuler(n)
  }, [reflechit, fin.terminee, trait, maCouleur, historique.length, partie])

  const abandonner = useCallback(() => { setAbandonnee(true); sons.defaite(); setFinVisible(true) }, [])

  const rejouer = useCallback(() => {
    nouvellePartie()
    onRejouer()
  }, [nouvellePartie, onRejouer])

  const resultatFinal = abandonnee ? (maCouleur === 'w' ? 'noir' : 'blanc') : fin.resultat
  const causeFinale = abandonnee ? 'abandon' : fin.cause

  const mesCaptures = maCouleur === 'w' ? captures.parBlanc : captures.parNoir
  const sesCaptures = maCouleur === 'w' ? captures.parNoir : captures.parBlanc
  const avantageMoi = maCouleur === 'w' ? captures.avantage : -captures.avantage

  return (
    <div style={{ display: 'flex', gap: 22, justifyContent: 'center', alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <Plateau
        partie={partie}
        orientation={maCouleur === 'w' ? 'white' : 'black'}
        peutJouer={c => c === maCouleur && !fin.terminee && !abandonnee && !reflechit}
        onCoup={onCoup}
        taille={taillePlateau}
        interactif={!fin.terminee && !abandonnee}
      />

      <div style={{ width: 'min(330px, 92vw)', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <PanneauJoueur
          pseudo={`${niveau.emoji} IA · ${niveau.label}`}
          sousTitre={reflechit ? '🧠 L\'IA réfléchit…' : (niveau.limitStrength ? `~${niveau.elo} ELO` : 'Pleine puissance')}
          auTrait={trait === couleurIA && !fin.terminee}
          capturees={sesCaptures} couleurCapturees={maCouleur} avantage={-avantageMoi > 0 ? -avantageMoi : 0}
        />
        <PanneauJoueur
          pseudo={pseudo} avatar={avatar} elo={profil?.elo ?? null}
          sousTitre={profil ? undefined : 'Partie non classée'}
          auTrait={trait === maCouleur && !fin.terminee}
          capturees={mesCaptures} couleurCapturees={couleurIA} avantage={avantageMoi > 0 ? avantageMoi : 0}
        />
        <HistoriqueCoups historique={historique} hauteur={200} />
        <BarreActions
          onAnnulerCoup={annulerCoup}
          onAbandonner={abandonner}
          disabled={fin.terminee || abandonnee}
        />
        <button onClick={onQuitter} style={{
          padding: '9px 12px', borderRadius: 10, cursor: 'pointer', fontFamily: THEME.fontBody,
          fontWeight: 600, fontSize: 12.5, color: THEME.muted, background: 'transparent',
          border: `1px solid ${THEME.cardBorder}`,
        }}>
          ← Retour au menu
        </button>
        {enEchec && !fin.terminee && (
          <div style={{ textAlign: 'center', color: THEME.accent, fontWeight: 800, fontSize: 13, letterSpacing: '0.06em' }}>⚠ ÉCHEC !</div>
        )}
      </div>

      {finVisible && (
        <FinPartieModal
          resultat={resultatFinal} cause={causeFinale} maCouleur={maCouleur}
          onNouvellePartie={rejouer}
          onFermer={() => setFinVisible(false)}
        />
      )}
    </div>
  )
}

export default function SoloVsIA({ profil, pseudo, avatar, onQuitter }) {
  const [config, setConfig] = useState(null)   // { niveau, maCouleur } | null
  const [cle, setCle] = useState(0)            // re-mount pour « nouvelle partie »

  const taillePlateau = useMemo(() => {
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1200
    const vh = typeof window !== 'undefined' ? window.innerHeight : 900
    return Math.max(280, Math.min(560, vw - 32, vh - 260))
  }, [])

  if (!config) return <ConfigSolo onLancer={setConfig} />
  return (
    <PartieSolo
      key={cle}
      {...config}
      profil={profil} pseudo={pseudo} avatar={avatar}
      taillePlateau={taillePlateau}
      onRejouer={() => setCle(k => k + 1)}
      onQuitter={onQuitter}
    />
  )
}
