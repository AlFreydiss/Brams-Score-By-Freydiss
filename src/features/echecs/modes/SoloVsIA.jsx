// ── Solo vs IA : Stockfish 18 avec niveaux calibrés (rangs One Piece) ────────
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { usePartie } from '../hooks/usePartie.js'
import { useStockfish } from '../hooks/useStockfish.js'
import Plateau from '../components/Plateau.jsx'
import Plateau3D from '../components/Plateau3D.jsx'
import PanneauJoueur from '../components/PanneauJoueur.jsx'
import HistoriqueCoups from '../components/HistoriqueCoups.jsx'
import BarreActions from '../components/BarreActions.jsx'
import FinPartieModal from '../components/FinPartieModal.jsx'
import BarreEval from '../components/BarreEval.jsx'
import { NIVEAUX_IA, NIVEAU_IA_DEFAUT, niveauParId } from '../lib/niveauxIA.js'
import { THEME, CLE_NIVEAU_IA, CLE_COULEUR_IA, taillePlateauAuto } from '../constants.js'
import { construireEval, construireIndice } from '../lib/analyse.js'
import { sons } from '../lib/sons.js'

const CLE_ELO_PERSO = 'echecs_elo_perso'   // ELO du curseur (mode personnalisé)

function lireStockage(cle, defaut) {
  try { return localStorage.getItem(cle) || defaut } catch { return defaut }
}

// Niveau « sur-mesure » construit depuis le curseur ELO (600–2850).
function niveauDepuisElo(elo) {
  const e = Math.max(600, Math.min(2850, Math.round(elo)))
  // movetime croît doucement avec l'ELO ; ≥2850 = pleine force (skill 20).
  const movetimeMs = Math.round(400 + (e - 600) / (2850 - 600) * 1100)
  if (e >= 2850) {
    return { id: 'perso', label: 'Sur-mesure', sousTitre: 'Pleine puissance', limitStrength: false, skillLevel: 20, movetimeMs: 1500, emoji: '🎚️', elo: e }
  }
  return { id: 'perso', label: 'Sur-mesure', sousTitre: `${e} ELO`, limitStrength: true, elo: e, movetimeMs, emoji: '🎚️' }
}

function sonDuCoup(mv, enEchec) {
  if (mv.promotion || mv.flags?.includes('p')) sons.promotion()
  else if (enEchec) sons.echec()
  else if (mv.flags?.includes('k') || mv.flags?.includes('q')) sons.roque()
  else if (mv.captured) sons.capture()
  else sons.coup()
}

// ── Écran de configuration ──
function ConfigSolo({ onLancer }) {
  const [niveauId, setNiveauId] = useState(lireStockage(CLE_NIVEAU_IA, NIVEAU_IA_DEFAUT))
  const [couleur, setCouleur] = useState(lireStockage(CLE_COULEUR_IA, 'w'))
  const [elo, setElo] = useState(() => {
    const v = parseInt(lireStockage(CLE_ELO_PERSO, ''), 10)
    return Number.isFinite(v) ? Math.max(600, Math.min(2850, v)) : 1500
  })
  // Le curseur prend la main quand il est sélectionné (niveauId === 'perso').
  const persoActif = niveauId === 'perso'

  const lancer = () => {
    try {
      localStorage.setItem(CLE_NIVEAU_IA, niveauId)
      localStorage.setItem(CLE_COULEUR_IA, couleur)
      localStorage.setItem(CLE_ELO_PERSO, String(elo))
    } catch {}
    const c = couleur === 'alea' ? (Math.random() < 0.5 ? 'w' : 'b') : couleur
    sons.debloquer()
    const niveau = persoActif ? niveauDepuisElo(elo) : niveauParId(niveauId)
    onLancer({ niveau, maCouleur: c })
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

      {/* ── Curseur ELO sur-mesure (complète les niveaux fixes) ── */}
      <button
        onClick={() => setNiveauId('perso')}
        style={{
          width: '100%', textAlign: 'left', marginTop: 12, padding: '14px 16px', borderRadius: 14, cursor: 'pointer',
          background: persoActif ? 'rgba(191,164,106,0.10)' : THEME.card,
          border: `1px solid ${persoActif ? 'rgba(191,164,106,0.55)' : THEME.cardBorder}`,
          transition: 'border-color .15s, background .15s',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>🎚️</span>
            <span style={{ fontFamily: THEME.fontDisplay, fontWeight: 800, fontSize: 15, color: persoActif ? '#BFA46A' : THEME.text }}>
              Force sur-mesure
            </span>
          </span>
          <span style={{ fontFamily: THEME.fontDisplay, fontWeight: 800, fontSize: 16, color: persoActif ? '#BFA46A' : THEME.muted }}>
            {elo >= 2850 ? 'MAX' : `${elo} ELO`}
          </span>
        </div>
        <input
          type="range" min={600} max={2850} step={50} value={elo}
          onChange={e => { setElo(parseInt(e.target.value, 10)); setNiveauId('perso') }}
          onClick={e => e.stopPropagation()}
          aria-label="Force de l'IA en ELO"
          style={{
            width: '100%', marginTop: 12, cursor: 'pointer',
            accentColor: '#BFA46A', height: 24,
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: THEME.muted, marginTop: 2 }}>
          <span>600</span><span>1725</span><span>2850</span>
        </div>
      </button>

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
function PartieSolo({ niveau, maCouleur, profil, pseudo, avatar, onRejouer, onQuitter, taillePlateau, troisD }) {
  const partie = usePartie()
  const { pret, reflechit, chercherCoup, nouvellePartie, analyser } = useStockfish(niveau)
  const [finVisible, setFinVisible] = useState(false)
  const [abandonnee, setAbandonnee] = useState(false)
  const couleurIA = maCouleur === 'w' ? 'b' : 'w'
  const rechercheEnCours = useRef(false)

  const { fen, trait, fin, captures, historique, enEchec } = partie

  // ── Eval bar + indice (analyse sur le worker DÉDIÉ, jamais l'adversaire) ──
  const [evalPos, setEvalPos] = useState(null)     // { ratio, texte, ... }
  const [indice, setIndice] = useState(null)       // { cases, texte, ... } | null
  const [chargementIndice, setChargementIndice] = useState(false)
  const estMonTour = trait === maCouleur

  // Analyse débouncée à chaque changement de position — uniquement quand c'est
  // MON tour (l'IA ne réfléchit pas), pour ne pas concurrencer le moteur adverse.
  useEffect(() => {
    setIndice(null)
    if (fin.terminee || abandonnee || !pret || !estMonTour) return
    let annule = false
    const id = setTimeout(() => {
      analyser(fen, { movetime: 500 }).then(res => {
        if (annule || !res) return
        setEvalPos(construireEval(res, trait))
      })
    }, 350)
    return () => { annule = true; clearTimeout(id) }
  }, [fen, estMonTour, pret, fin.terminee, abandonnee]) // eslint-disable-line react-hooks/exhaustive-deps

  const demanderIndice = useCallback(() => {
    if (!pret || !estMonTour || fin.terminee || abandonnee || reflechit) return
    setChargementIndice(true)
    analyser(fen, { depth: 14 }).then(res => {
      setChargementIndice(false)
      if (!res) return
      setEvalPos(construireEval(res, trait))
      setIndice(construireIndice(res, trait))
    })
  }, [pret, estMonTour, fin.terminee, abandonnee, reflechit, fen, trait, analyser])

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

  const PlateauComp = troisD ? Plateau3D : Plateau

  return (
    <div style={{ display: 'flex', gap: 22, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', minHeight: 'calc(100vh - 230px)' }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <BarreEval
          ratio={evalPos?.ratio ?? 0.5}
          texte={evalPos?.texte ?? '–'}
          enCours={reflechit}
          orientation={maCouleur === 'w' ? 'white' : 'black'}
          hauteur={Math.min(taillePlateau, 560)}
        />
        <PlateauComp
          partie={partie}
          orientation={maCouleur === 'w' ? 'white' : 'black'}
          peutJouer={c => c === maCouleur && !fin.terminee && !abandonnee && !reflechit}
          onCoup={onCoup}
          taille={taillePlateau}
          interactif={!fin.terminee && !abandonnee}
          maCouleur={maCouleur}
          troisD={troisD}
        />
      </div>

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

        {/* ── Indice : meilleur coup conseillé (worker d'analyse dédié) ── */}
        <button
          onClick={demanderIndice}
          disabled={!estMonTour || fin.terminee || abandonnee || reflechit || chargementIndice}
          style={{
            padding: '11px 12px', borderRadius: 12,
            cursor: (!estMonTour || fin.terminee || abandonnee || reflechit) ? 'default' : 'pointer',
            fontFamily: THEME.fontDisplay, fontWeight: 800, fontSize: 13.5, letterSpacing: '0.01em',
            color: (!estMonTour || fin.terminee || abandonnee) ? THEME.muted : '#08090D',
            background: (!estMonTour || fin.terminee || abandonnee)
              ? THEME.card
              : 'linear-gradient(135deg, #BFA46A, #d8c089)',
            border: `1px solid rgba(191,164,106,0.45)`,
            opacity: chargementIndice ? 0.7 : 1,
            minHeight: 24,
          }}
        >
          {chargementIndice ? '⏳ Analyse…' : '💡 Indice'}
        </button>
        {indice && (
          <div
            data-testid="indice-coup"
            style={{
              textAlign: 'center', padding: '8px 10px', borderRadius: 10,
              background: 'rgba(191,164,106,0.10)', border: '1px solid rgba(191,164,106,0.30)',
              fontFamily: THEME.fontBody, fontSize: 13, color: THEME.text,
            }}
          >
            Meilleur coup :{' '}
            <strong style={{ color: '#BFA46A', fontFamily: THEME.fontDisplay, letterSpacing: '0.04em' }}>
              {indice.cases[0]} → {indice.cases[1]}
            </strong>
            {indice.evalTexte ? <span style={{ color: THEME.muted }}>{`  (${indice.evalTexte})`}</span> : null}
          </div>
        )}

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

export default function SoloVsIA({ profil, pseudo, avatar, onQuitter, troisD = false }) {
  const [config, setConfig] = useState(null)   // { niveau, maCouleur } | null
  const [cle, setCle] = useState(0)            // re-mount pour « nouvelle partie »

  const taillePlateau = useMemo(() => taillePlateauAuto(troisD), [troisD])

  if (!config) return <ConfigSolo onLancer={setConfig} />
  return (
    <PartieSolo
      key={cle}
      {...config}
      profil={profil} pseudo={pseudo} avatar={avatar}
      taillePlateau={taillePlateau} troisD={troisD}
      onRejouer={() => setCle(k => k + 1)}
      onQuitter={onQuitter}
    />
  )
}
