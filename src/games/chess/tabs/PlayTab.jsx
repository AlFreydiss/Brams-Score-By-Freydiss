// ── PlayTab (Échecs) : l'expérience de jeu complète, 2D STRICTE ─────────────
// Modes : vs IA (Stockfish), 2 joueurs local (option flip à chaque coup),
// online classé (stub clair). Layout : EvalBar | échiquier carré | panneau droit
// (horloges isolées, liste de coups SAN cliquable, contrôles, indicateur de trait).
// Réutilise : usePartie (chess.js), useStockfish (IA + eval), Plateau (board 2D),
// niveauxIA/elo/sons/analyse, et nos atomes (Clock/EvalBar/MoveList/EndOverlay).
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { Chess } from 'chess.js'
import { ui, fonts } from '../../../features/games/neutralTheme.js'
import { usePartie } from '../../../features/echecs/hooks/usePartie.js'
import { useStockfish } from '../../../features/echecs/hooks/useStockfish.js'
import Plateau from '../../../features/echecs/components/Plateau.jsx'
import { NIVEAUX_IA, niveauParId } from '../../../features/echecs/lib/niveauxIA.js'
import { CADENCES, parseCadence } from '../../../features/echecs/constants.js'
import { construireEval, construireIndice } from '../../../features/echecs/lib/analyse.js'
import { previsionElo } from '../../../features/echecs/lib/elo.js'
import { sons } from '../../../features/echecs/lib/sons.js'
import { boardParId, BOARD_DEFAUT } from '../logic/boards.js'
import { useChessSettings } from '../logic/useChessSettings.js'
import { useLocalClock } from '../logic/useLocalClock.js'
import Clock from '../ui/Clock.jsx'
import EvalBar from '../ui/EvalBar.jsx'
import MoveList from '../ui/MoveList.jsx'
import MiniBoard from '../ui/MiniBoard.jsx'
import Controls from '../ui/Controls.jsx'
import EndOverlay from '../ui/EndOverlay.jsx'
import Arrows from '../ui/Arrows.jsx'
import CoachPanel from '../coach/CoachPanel.jsx'
import { useCoach } from '../coach/useCoach.js'
import { cc, CHESSCOM_BOARD } from '../ui/chesscom.js'
import { detecterOuverture } from '../logic/openings.js'
import { analyzeGame } from '../analysis/analyzeGame.js'
import AnalysisPanel from '../analysis/AnalysisPanel.jsx'
import OnlineFlow from '../online/OnlineFlow.jsx'
import ArenaLayout from '../../_shell/arena/ArenaLayout.jsx'
import ArenaLight from '../../_shell/arena/ArenaLight.jsx'
import { glass } from '../../_shell/arena/arenaTokens.js'
import { FEN_INITIALE } from '../ui/MiniBoard.jsx'
import Particles from '../../_shell/arena/Particles.jsx'
import ReplayScrubber from '../../_shell/arena/ReplayScrubber.jsx'
import { useScreenShake, eventGlow } from '../../_shell/arena/fx.js'
import { genererPGN, copierPresse, telecharger } from '../logic/exportPGN.js'

const BRASS = '#81b64c'   // accent chess.com (vert) — remplace l'or laiton

function sonDuCoup(mv, enEchec) {
  if (mv.promotion || mv.flags?.includes('p')) sons.promotion()
  else if (enEchec) sons.echec()
  else if (mv.flags?.includes('k') || mv.flags?.includes('q')) sons.roque()
  else if (mv.captured) sons.capture()
  else sons.coup()
}

// FEN à un demi-coup donné (revue d'historique) en rejouant les SAN.
function fenAuCoup(historique, idx) {
  const c = new Chess()
  for (let i = 0; i <= idx && i < historique.length; i++) {
    try { c.move(historique[i].san) } catch { break }
  }
  return c.fen()
}

// ── Taille responsive de l'échiquier : carré borné par min(largeur dispo, hauteur).
function useTaillePlateau(refConteneur) {
  const [taille, setTaille] = useState(440)
  useEffect(() => {
    const calc = () => {
      const vw = window.innerWidth, vh = window.innerHeight
      const mobile = vw < 880
      // desktop : place pour les 2 rails arène (gauche 248 + droite 312) + gaps/padding
      const dispoLargeur = mobile ? vw - 28 : vw - 248 - 312 - 110
      const dispoHauteur = vh - (mobile ? 320 : 150)
      const t = Math.max(260, Math.min(640, dispoLargeur, dispoHauteur))
      setTaille(Math.floor(t))
    }
    calc()
    window.addEventListener('resize', calc)
    return () => window.removeEventListener('resize', calc)
  }, [refConteneur])
  return taille
}

// ════════════════════════════════════════════════════════════════════════════
// Écran de configuration (mode + cadence + couleur/niveau)
// ════════════════════════════════════════════════════════════════════════════
function Chip({ actif, onClick, children, sub }) {
  return (
    <button onClick={onClick} style={{
      padding: '9px 13px', borderRadius: ui.radius.sm, cursor: 'pointer', textAlign: 'left',
      background: actif ? 'rgba(129,182,76,0.14)' : ui.surface,
      border: `1px solid ${actif ? 'rgba(129,182,76,0.5)' : ui.line}`,
      transition: 'background .15s, border-color .15s', minWidth: 0,
    }}>
      <span style={{ display: 'block', font: `700 13px ${fonts.body}`, color: actif ? '#e7d8b8' : ui.text }}>{children}</span>
      {sub && <span style={{ display: 'block', font: `500 11px ${fonts.mono}`, color: ui.textMute, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>{sub}</span>}
    </button>
  )
}

function SectionLabel({ children }) {
  return <div style={{ font: `700 11px ${fonts.body}`, letterSpacing: '0.09em', textTransform: 'uppercase', color: ui.textMute, margin: '0 0 9px' }}>{children}</div>
}

// Mode pré-sélectionné depuis une île du Nouveau Monde (solo/ami/classe → ia/local/online).
const ISLAND_MODE = { solo: 'ia', ami: 'local', classe: 'online' }

// ── Mobile flag réactif (aligné sur le seuil 880 de l'arène en jeu).
function useMobile() {
  const [mobile, setMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 980)
  useEffect(() => {
    const calc = () => setMobile(window.innerWidth < 980)
    calc()
    window.addEventListener('resize', calc)
    return () => window.removeEventListener('resize', calc)
  }, [])
  return mobile
}

function ConfigJeu({ onLancer, niveauDefaut, boardId = BOARD_DEFAUT }) {
  const loc = useLocation()
  const [mode, setMode] = useState(() => ISLAND_MODE[loc.state?.playMode] || 'ia')  // 'ia' | 'local' | 'online'
  const [cadenceId, setCadenceId] = useState('5+0')
  const [illimite, setIllimite] = useState(false)
  const [niveauId, setNiveauId] = useState(niveauDefaut)
  const [couleur, setCouleur] = useState('w')      // 'w' | 'b' | 'alea'
  const mobile = useMobile()

  // 4–6 niveaux exposés (spec). On retient Mousse → Yonkou (6 paliers).
  const niveaux = NIVEAUX_IA

  // lumière d'ambiance de l'aperçu : suit la couleur choisie (chaud=blancs, froid=noirs).
  const previewTurn = mode === 'ia' ? (couleur === 'b' ? 'cool' : 'warm') : 'warm'
  // orientation de l'aperçu : si je joue Noirs, on retourne pour MES pièces en bas.
  const previewOrient = mode === 'ia' && couleur === 'b' ? 'black' : 'white'
  const previewTaille = mobile ? Math.min(380, (typeof window !== 'undefined' ? window.innerWidth : 360) - 56) : 0

  const lancer = () => {
    sons.debloquer()
    const c = couleur === 'alea' ? (Math.random() < 0.5 ? 'w' : 'b') : couleur
    onLancer({
      mode,
      cadence: illimite ? null : cadenceId,
      niveau: niveauParId(niveauId),
      maCouleur: mode === 'local' ? 'w' : c,
    })
  }

  // ── Panneau réglages (verre dépoli) — partagé desktop/mobile ──
  const reglages = (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ font: `700 11px ${fonts.body}`, letterSpacing: '0.16em', textTransform: 'uppercase', color: BRASS, marginBottom: 7 }}>Échecs</div>
        <h2 style={{ margin: 0, font: `800 26px ${fonts.display}`, letterSpacing: '-0.02em', color: ui.text, lineHeight: 1.05 }}>
          Nouvelle partie
        </h2>
        <p style={{ margin: '8px 0 0', font: `400 13px ${fonts.body}`, color: ui.textDim, lineHeight: 1.5 }}>
          Choisis ton adversaire, ta cadence et lance la rencontre.
        </p>
      </div>

      <SectionLabel>Mode</SectionLabel>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 22 }}>
        <Chip actif={mode === 'ia'} onClick={() => setMode('ia')} sub="Stockfish">Contre l'IA</Chip>
        <Chip actif={mode === 'local'} onClick={() => setMode('local')} sub="même écran">2 joueurs</Chip>
        <Chip actif={mode === 'online'} onClick={() => setMode('online')} sub="classé">En ligne</Chip>
      </div>

      {mode === 'online' ? (
        <OnlineFlow accent={BRASS} />
      ) : (
        <>
          <SectionLabel>Cadence</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(92px,1fr))', gap: 8, marginBottom: 22 }}>
            {CADENCES.map(c => (
              <Chip key={c.id} actif={!illimite && cadenceId === c.id} onClick={() => { setCadenceId(c.id); setIllimite(false) }} sub={c.label}>
                {c.id}
              </Chip>
            ))}
            <Chip actif={illimite} onClick={() => setIllimite(true)} sub="sans pendule">Illimité</Chip>
          </div>

          {mode === 'ia' && (
            <>
              <SectionLabel>Niveau de l'IA</SectionLabel>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px,1fr))', gap: 8, marginBottom: 22 }}>
                {niveaux.map(n => (
                  <Chip key={n.id} actif={niveauId === n.id} onClick={() => setNiveauId(n.id)}
                    sub={n.limitStrength ? `~${n.elo} ELO` : 'Pleine force'}>
                    {n.label}
                  </Chip>
                ))}
              </div>

              <SectionLabel>Je joue</SectionLabel>
              <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                {[{ id: 'w', l: 'Blancs' }, { id: 'b', l: 'Noirs' }, { id: 'alea', l: 'Aléatoire' }].map(c => (
                  <button key={c.id} onClick={() => setCouleur(c.id)} style={{
                    flex: 1, padding: '10px', borderRadius: ui.radius.sm, cursor: 'pointer',
                    font: `700 13px ${fonts.body}`, color: couleur === c.id ? '#e7d8b8' : ui.text,
                    background: couleur === c.id ? 'rgba(129,182,76,0.14)' : ui.surface,
                    border: `1px solid ${couleur === c.id ? 'rgba(129,182,76,0.5)' : ui.line}`,
                    transition: 'background .15s, border-color .15s',
                  }}>{c.l}</button>
                ))}
              </div>
            </>
          )}

          <button onClick={lancer} style={{
            width: '100%', marginTop: 26, padding: '15px', borderRadius: ui.radius.md, cursor: 'pointer',
            font: `800 15px ${fonts.display}`, letterSpacing: '0.01em', color: '#15110a',
            background: BRASS, border: 'none', transition: 'filter .15s, transform .12s',
            boxShadow: '0 14px 34px -16px rgba(129,182,76,0.7)',
          }}
            onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.08)' }}
            onMouseLeave={e => { e.currentTarget.style.filter = 'none' }}>
            {mode === 'local' ? 'Commencer' : 'Lancer la partie'}
          </button>
        </>
      )}
    </div>
  )

  // panneau verre dépoli (réglages), réutilisé dans les 2 layouts.
  const panel = (
    <div style={{
      ...railStyleConfig(),
      width: '100%', maxWidth: mobile ? 540 : 460,
      padding: mobile ? '22px 20px' : '28px 26px',
    }}>
      {reglages}
    </div>
  )

  // aperçu décoratif du plateau (position de départ, lecture seule).
  const apercu = (sz) => (
    <div style={{ position: 'relative', width: sz, height: sz }}>
      <div aria-hidden style={{
        position: 'absolute', inset: -26, borderRadius: 32, pointerEvents: 'none',
        background: previewTurn === 'cool'
          ? 'radial-gradient(60% 55% at 50% 50%, rgba(120,150,190,0.16), transparent 72%)'
          : 'radial-gradient(60% 55% at 50% 50%, rgba(200,164,92,0.18), transparent 72%)',
        transition: 'background 700ms cubic-bezier(.4,0,.2,1)',
      }} />
      <div style={{ position: 'relative', borderRadius: 12, boxShadow: '0 36px 90px -34px rgba(0,0,0,0.9)' }}>
        <MiniBoard fen={FEN_INITIALE} taille={sz} boardId={boardId} orientation={previewOrient} coords={false} />
      </div>
    </div>
  )

  // ── MOBILE : empilé, aperçu réduit en tête, réglages pleine largeur ──
  if (mobile) {
    return (
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        <div aria-hidden style={{ position: 'absolute', inset: 0, background: cc.bg }} />
        <div style={{
          position: 'relative', zIndex: 1, height: '100%', overflowY: 'auto',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18,
          padding: '20px 14px 36px', boxSizing: 'border-box',
        }}>
          {mode !== 'online' && previewTaille > 200 && (
            <div style={{ flexShrink: 0, marginTop: 4 }}>{apercu(previewTaille)}</div>
          )}
          {panel}
        </div>
      </div>
    )
  }

  // ── DESKTOP : 2 colonnes pleine largeur (aperçu | réglages), lumière derrière ──
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <div aria-hidden style={{ position: 'absolute', inset: 0, background: cc.bg }} />
      <div style={{
        position: 'relative', zIndex: 1, height: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'clamp(36px, 6vw, 90px)',
        padding: '32px clamp(28px, 5vw, 80px)', boxSizing: 'border-box',
      }}>
        {mode !== 'online' && (
          <div style={{ flex: '0 1 auto', display: 'flex', justifyContent: 'center', minWidth: 0 }}>
            <ApercuResponsive render={apercu} />
          </div>
        )}
        <div style={{ flex: mode === 'online' ? '1 1 auto' : '0 0 auto', display: 'flex', justifyContent: mode === 'online' ? 'center' : 'flex-start', minWidth: 0 }}>
          {panel}
        </div>
      </div>
    </div>
  )
}

// Aperçu plateau dimensionné par l'espace dispo (≈ moitié gauche, borné).
function ApercuResponsive({ render }) {
  const [sz, setSz] = useState(440)
  useEffect(() => {
    const calc = () => {
      const vw = window.innerWidth, vh = window.innerHeight
      // ~moitié de la largeur dispo une fois le panneau (≈500) et les gaps retirés.
      const dispoLargeur = (vw - 500 - 200) * 0.62
      const dispoHauteur = vh - 150
      setSz(Math.floor(Math.max(300, Math.min(560, dispoLargeur, dispoHauteur))))
    }
    calc()
    window.addEventListener('resize', calc)
    return () => window.removeEventListener('resize', calc)
  }, [])
  return render(sz)
}

// panneau de config chess.com : surface solide (plus de verre dépoli arène).
function railStyleConfig() {
  return {
    background: cc.panel,
    border: `1px solid ${cc.line}`,
    borderRadius: cc.radius.lg,
    boxShadow: cc.shadow,
    boxSizing: 'border-box',
  }
}

// ════════════════════════════════════════════════════════════════════════════
// Partie en cours
// ════════════════════════════════════════════════════════════════════════════
function PartieEnCours({ config, reglagesCtx, onRejouer, onQuitter }) {
  const { mode, cadence: cadenceId, niveau, maCouleur } = config
  const { reglages } = reglagesCtx
  const partie = usePartie()
  const { fen, trait, fin, historique, captures, enEchec } = partie
  const cadence = useMemo(() => (cadenceId ? parseCadence(cadenceId) : null), [cadenceId])
  const horloge = useLocalClock(cadence)
  const isIA = mode === 'ia'
  const couleurIA = maCouleur === 'w' ? 'b' : 'w'

  const refConteneur = useRef(null)
  const taille = useTaillePlateau(refConteneur)
  const mobile = typeof window !== 'undefined' && window.innerWidth < 880

  const sf = useStockfish(isIA ? niveau : null)
  const { pret, reflechit, chercherCoup, analyser, nouvellePartie } = sf

  const [abandonnee, setAbandonnee] = useState(false)
  const [resultatForce, setResultatForce] = useState(null)   // { resultat, cause }
  const [finVisible, setFinVisible] = useState(false)
  const [curseur, setCurseur] = useState(-1)                 // demi-coup affiché (-1 → suit le live)
  const [posInitiale, setPosInitiale] = useState(false)      // revue figée sur la position de départ (avant le 1er coup)
  const [evalPos, setEvalPos] = useState(null)
  const [nulleProposee, setNulleProposee] = useState(false)
  const [flip, setFlip] = useState(false)
  const [indice, setIndice] = useState(null)        // flèche meilleur coup (overlay coach)
  const coach = useCoach()
  const rechercheRef = useRef(false)

  // ── Replay (auto-play) ──
  const [lecture, setLecture] = useState(false)              // play/pause de l'auto-advance
  const [vitesse, setVitesse] = useState(1)                  // 0.5× / 1× / 2×
  const [copiePGN, setCopiePGN] = useState(false)            // feedback transitoire "Copié ✓"

  // ── Analyse post-partie (à la demande uniquement, coûteuse) ──
  const [analyse, setAnalyse] = useState(null)        // résultat analyzeGame
  const [analyseEnCours, setAnalyseEnCours] = useState(false)
  const [analyseProgres, setAnalyseProgres] = useState(null)  // 0..100
  const [analysePanneau, setAnalysePanneau] = useState(false)
  const analyseSignalRef = useRef(null)

  // ── Détection d'ouverture ECO (préfixe SAN) — recalcul léger sur l'historique ──
  const ouverture = useMemo(() => detecterOuverture(historique), [historique])

  // ── Juice arène : particules de capture + micro-shake sur échec ──
  const particlesRef = useRef(null)
  const arena = useScreenShake()
  const fireFx = useCallback((mv, enEchecApres) => {
    if (mv?.captured && particlesRef.current) {
      const t = taille
      particlesRef.current.burst(t / 2, t / 2)
    }
    if (enEchecApres) arena.shake(5)
  }, [taille, arena])

  // orientation : MES pièces en bas (IA) ; en local on suit le trait si auto-flip.
  const orientationBase = isIA ? (maCouleur === 'w' ? 'white' : 'black') : 'white'
  const autoFlip = mode === 'local' && reglages.autoFlipLocal
  const orientation = useMemo(() => {
    let o = orientationBase
    if (autoFlip) o = trait === 'w' ? 'white' : 'black'
    if (flip) o = o === 'white' ? 'black' : 'white'
    return o
  }, [orientationBase, autoFlip, trait, flip])

  const termine = fin.terminee || abandonnee || !!resultatForce
  // En revue = on regarde une position passée (position initiale OU un demi-coup antérieur au dernier).
  const enRevue = posInitiale || (curseur >= 0 && curseur < historique.length - 1)

  // ── Démarrage horloge ──
  useEffect(() => { sons.debut(); if (cadence) horloge.demarrer('w') }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Eval bar : analyse débouncée quand c'est mon tour (worker dédié) ──
  const estMonTour = isIA ? trait === maCouleur : true
  useEffect(() => {
    if (!isIA || termine || !pret || !estMonTour) return
    let annule = false
    const id = setTimeout(() => {
      analyser(fen, { movetime: 500 }).then(res => { if (!annule && res) setEvalPos(construireEval(res, trait)) })
    }, 320)
    return () => { annule = true; clearTimeout(id) }
  }, [fen, estMonTour, pret, termine, isIA]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Coup de l'IA ──
  useEffect(() => {
    if (!isIA || termine || trait !== couleurIA || !pret || rechercheRef.current) return
    rechercheRef.current = true
    let annule = false
    chercherCoup(fen).then(coup => {
      rechercheRef.current = false
      if (annule || partie.fin.terminee) return
      let mv = coup ? partie.jouer(coup) : null
      if (!mv) {
        const legaux = partie.chess.moves({ verbose: true })
        if (legaux.length) { const a = legaux[(Math.random() * legaux.length) | 0]; mv = partie.jouer({ from: a.from, to: a.to, promotion: a.promotion }) }
      }
      if (mv) { const ch = partie.chess.isCheck(); sonDuCoup(mv, ch); fireFx(mv, ch); if (cadence) horloge.basculer(partie.trait) }
    })
    return () => { annule = true }
  }, [fen, trait, couleurIA, pret, termine, isIA]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Coup joué (humain) → son + horloge + suit le live ──
  const onCoup = useCallback((mv) => {
    const ch = partie.chess.isCheck()
    sonDuCoup(mv, ch)
    fireFx(mv, ch)
    setNulleProposee(false)
    setCurseur(-1)
    if (cadence) horloge.basculer(partie.trait)
  }, [partie, cadence, horloge, fireFx])

  // ── Fin de partie (mat/pat/nulle/abandon/temps) ──
  useEffect(() => {
    if (!fin.terminee) return
    if (cadence) horloge.stopper()
    const t = setTimeout(() => {
      const gagne = isIA && fin.resultat !== 'nulle' && (fin.resultat === 'blanc') === (maCouleur === 'w')
      if (fin.resultat === 'nulle') sons.nulle(); else if (isIA) (gagne ? sons.victoire() : sons.defaite()); else sons.victoire()
      setFinVisible(true)
    }, 420)
    return () => clearTimeout(t)
  }, [fin.terminee]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Drapeau (temps écoulé) ──
  useEffect(() => {
    if (!horloge.drapeau || termine) return
    const perdant = horloge.drapeau                       // 'w' | 'b'
    setResultatForce({ resultat: perdant === 'w' ? 'noir' : 'blanc', cause: 'temps' })
    horloge.stopper()
    const gagne = isIA && (perdant === 'w') !== (maCouleur === 'w')
    setTimeout(() => { isIA ? (gagne ? sons.victoire() : sons.defaite()) : sons.victoire(); setFinVisible(true) }, 200)
  }, [horloge.drapeau]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Navigation clavier ←/→ ──
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); aller(Math.max(-1, (curseur === -1 ? historique.length - 1 : curseur) - 1)) }
      else if (e.key === 'ArrowRight') { e.preventDefault(); aller(Math.min(historique.length - 1, (curseur === -1 ? historique.length - 1 : curseur) + 1)) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }) // re-attache à chaque render pour capturer curseur/historique courants

  const aller = useCallback((idx) => {
    const clamp = Math.max(-1, Math.min(historique.length - 1, idx))
    setPosInitiale(false)
    setCurseur(clamp === historique.length - 1 ? -1 : clamp)
  }, [historique.length])

  // ── Replay : seek par nombre de demi-coups affichés (0 = position initiale … total = finale). ──
  const totalPlies = historique.length
  const indexLecture = posInitiale ? 0 : (curseur === -1 ? totalPlies : curseur + 1)
  const seekLecture = useCallback((plies) => {
    const p = Math.max(0, Math.min(totalPlies, plies))
    if (p === 0) { setPosInitiale(true); setCurseur(-1) }    // avant le 1er coup
    else { setPosInitiale(false); setCurseur(p >= totalPlies ? -1 : p - 1) }
  }, [totalPlies])

  // Auto-play : avance le curseur à intervalle dépendant de la vitesse ; stoppe en fin de partie.
  useEffect(() => {
    if (!lecture) return
    if (indexLecture >= totalPlies) { setLecture(false); return }
    const base = 900
    const delai = Math.max(180, base / (vitesse || 1))
    const id = setTimeout(() => seekLecture(indexLecture + 1), delai)
    return () => clearTimeout(id)
  }, [lecture, indexLecture, totalPlies, vitesse, seekLecture])

  // Sécurité : ne jamais auto-jouer pendant une partie live au trait du joueur.
  useEffect(() => { if (!termine && !enRevue) setLecture(false) }, [termine, enRevue])

  // ── Annuler (vs IA : paire ; local : 1) ──
  const annuler = useCallback(() => {
    if (termine || reflechit) return
    const n = isIA && trait === maCouleur ? 2 : 1
    if (historique.length >= n) { partie.annuler(n); setCurseur(-1) }
  }, [termine, reflechit, isIA, trait, maCouleur, historique.length, partie])

  const abandonner = useCallback(() => {
    if (isIA) setAbandonnee(true)
    else setResultatForce({ resultat: trait === 'w' ? 'noir' : 'blanc', cause: 'abandon' })
    sons.defaite()
    if (cadence) horloge.stopper()
    setFinVisible(true)
  }, [isIA, trait, cadence, horloge])

  const proposerNulle = useCallback(() => {
    // local/IA : accord immédiat (pas d'adversaire réseau à consulter)
    setResultatForce({ resultat: 'nulle', cause: 'nulle_accord' })
    sons.nulle(); if (cadence) horloge.stopper(); setFinVisible(true)
  }, [cadence, horloge])

  const rejouer = useCallback(() => { nouvellePartie?.(); onRejouer() }, [nouvellePartie, onRejouer])

  // ── Coach : flèche du meilleur coup + explication FR (à la demande). ──
  const peutAider = !termine && !enRevue && pret && (isIA ? estMonTour : true)

  const demanderIndice = useCallback(async () => {
    if (!peutAider) return
    const r = await analyser(fen, { movetime: 600 })
    if (r) setIndice(construireIndice(r, trait))
  }, [peutAider, analyser, fen, trait])

  const demanderConseil = useCallback(async () => {
    if (!peutAider) return
    const r = await analyser(fen, { movetime: 800 })
    if (r) setIndice(construireIndice(r, trait))
    await coach.demander({
      fen, trait, resultat: r,
      dernierSan: historique[historique.length - 1]?.san || null,
      niveauLabel: isIA ? niveau.label : null,
    })
  }, [peutAider, analyser, fen, trait, coach, historique, isIA, niveau])

  // La flèche + le conseil ne valent que pour la position courante : on les efface au coup suivant.
  useEffect(() => { setIndice(null); coach.reset() }, [fen]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Export PGN : meta dérivée du contexte (couleurs/résultat/ouverture) ──
  const exporterPGN = useCallback(async (mode = 'copie') => {
    const resultat = resultatForce?.resultat ?? (abandonnee ? (maCouleur === 'w' ? 'noir' : 'blanc') : fin.resultat)
    const blanc = isIA ? (maCouleur === 'w' ? 'Vous' : `IA · ${niveau.label}`) : 'Blancs'
    const noir = isIA ? (maCouleur === 'b' ? 'Vous' : `IA · ${niveau.label}`) : 'Noirs'
    const pgn = genererPGN(historique, {
      event: isIA ? `Brams · vs IA (${niveau.label})` : 'Brams · 2 joueurs',
      white: blanc, black: noir, result: resultat,
      eco: ouverture?.eco, opening: ouverture?.nom,
      timeControl: cadenceId || undefined,
    })
    if (mode === 'fichier') { telecharger(pgn, 'partie-brams.pgn'); return }
    const ok = await copierPresse(pgn)
    if (ok) { setCopiePGN(true); setTimeout(() => setCopiePGN(false), 1600) }
    else telecharger(pgn, 'partie-brams.pgn')   // repli : si le presse-papier échoue, on télécharge
  }, [historique, resultatForce, abandonnee, maCouleur, fin.resultat, isIA, niveau, ouverture, cadenceId])

  // Lance l'analyse Stockfish séquentielle sur tous les coups (réutilise `analyser`).
  const lancerAnalyse = useCallback(async () => {
    if (analyseEnCours || !historique.length) return
    if (analyse) { setAnalysePanneau(true); return }   // déjà calculée → réouvre
    const signal = { annule: false }
    analyseSignalRef.current = signal
    setAnalyseEnCours(true)
    setAnalyseProgres(0)
    try {
      const res = await analyzeGame(historique, analyser, {
        movetime: 220,
        signal,
        onProgress: (fait, total) => { if (!signal.annule) setAnalyseProgres(total ? Math.round((fait / total) * 100) : 100) },
      })
      if (signal.annule) return
      if (res) { setAnalyse(res); setAnalysePanneau(true) }
    } finally {
      if (!signal.annule) { setAnalyseEnCours(false); setAnalyseProgres(null) }
    }
  }, [analyseEnCours, analyse, historique, analyser])

  // Sauter à une position depuis le panneau d'analyse (réutilise le curseur de revue).
  const allerDepuisAnalyse = useCallback((ply) => {
    setFinVisible(false)
    aller(ply)
  }, [aller])

  // Coupe l'analyse en vol si le composant disparaît (rejoue / quitte).
  useEffect(() => () => { if (analyseSignalRef.current) analyseSignalRef.current.annule = true }, [])

  // ── Résultat final + delta ELO (prévision, vs IA classé seulement → ici non classé) ──
  const resultatFinal = resultatForce?.resultat ?? (abandonnee ? (maCouleur === 'w' ? 'noir' : 'blanc') : fin.resultat)
  const causeFinale = resultatForce?.cause ?? (abandonnee ? 'abandon' : fin.cause)

  // ── Données panneaux ──
  const peutJouer = useCallback((c) => {
    if (termine || enRevue) return false
    if (isIA) return c === maCouleur && !reflechit
    return c === trait   // local : chacun son tour
  }, [termine, enRevue, isIA, maCouleur, reflechit, trait])

  // FEN affichée : position initiale (revue au départ) · live · ou demi-coup en revue.
  const fenAffichee = posInitiale ? fenAuCoup(historique, -1) : (enRevue ? fenAuCoup(historique, curseur) : fen)
  const boardId = 'chesscom'        // interface chess.com : board vert/crème forcé
  const tema = CHESSCOM_BOARD

  // labels des deux camps (haut = adversaire, bas = moi en IA)
  const labelHaut = isIA ? `IA · ${niveau.label}` : 'Noirs'
  const labelBas = isIA ? 'Vous' : 'Blancs'
  const campHaut = orientation === 'white' ? 'b' : 'w'
  const campBas = orientation === 'white' ? 'w' : 'b'

  const Indicateur = () => (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderRadius: ui.radius.sm,
      background: ui.surface, border: `1px solid ${ui.line}`,
    }}>
      <span aria-hidden style={{ width: 11, height: 11, borderRadius: 3, background: trait === 'w' ? '#ece3cc' : '#26282e', border: `1px solid ${ui.lineHi}` }} />
      <span style={{ font: `600 12.5px ${fonts.body}`, color: ui.textDim }}>
        {termine ? 'Partie terminée' : enEchec ? 'Échec' : `Trait aux ${trait === 'w' ? 'Blancs' : 'Noirs'}`}
        {isIA && reflechit && !termine ? ' · l\'IA réfléchit…' : ''}
      </span>
    </div>
  )

  // ── Rangée joueur (avatar/label + horloge + capturées) ──
  const Joueur = ({ label, camp, capturees }) => (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
      padding: '8px 10px', borderRadius: ui.radius.sm,
      background: trait === camp && !termine ? ui.surfaceHi : ui.surface,
      border: `1px solid ${trait === camp && !termine ? ui.lineHi : ui.line}`,
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ font: `700 13px ${fonts.body}`, color: ui.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
        {capturees.length > 0 && (
          <div style={{ font: `400 13px ${fonts.body}`, color: ui.textDim, lineHeight: 1, marginTop: 2 }}>
            {capturees.map((p, i) => <span key={i} style={{ opacity: 0.8 }}>{glyphe(camp, p)}</span>)}
          </div>
        )}
      </div>
      {cadence && <Clock horloge={horloge} camp={camp} actif={trait === camp && !termine} />}
    </div>
  )

  const sesCaptures = campHaut === 'w' ? captures.parBlanc : captures.parNoir
  const mesCaptures = campBas === 'w' ? captures.parBlanc : captures.parNoir

  // ── Plateau central (avec overlay particules + glow d'échec) ──
  const boardNode = (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
      {!mobile && (
        <EvalBar evaluation={isIA ? evalPos : null} enCours={reflechit} orientation={orientation} hauteur={taille} />
      )}
      <div ref={refConteneur} style={{ position: 'relative', width: taille, height: taille }}>
        {enRevue ? (
          <MiniBoard fen={fenAffichee} taille={taille} boardId={boardId} orientation={orientation} coords={reglages.coords} />
        ) : (
          <Plateau
            partie={partie}
            orientation={orientation}
            peutJouer={peutJouer}
            onCoup={onCoup}
            taille={taille}
            interactif={!termine}
            maCouleur={isIA ? maCouleur : null}
            theme={tema}
            animationMs={reglages.animations ? reglages.vitesseAnim : 0}
            afficherCoupsLegaux={reglages.surbrillanceLegale}
            afficherDernierCoup
            afficherEchec
            premoveActif={isIA && reglages.premoves}
            autoPromo={reglages.autoQueen}
            coordonnees={reglages.coords ? 'exterieur' : 'masque'}
          />
        )}
        {indice && !enRevue && (
          <Arrows cases={indice.cases} orientation={orientation} taille={taille} accent={BRASS} />
        )}
        {/* anneau d'échec : glow or/rouge sobre autour du plateau */}
        <div aria-hidden style={{
          position: 'absolute', inset: -2, borderRadius: 6, pointerEvents: 'none', zIndex: 4,
          boxShadow: enEchec && !termine && !enRevue ? eventGlow('echec') : 'none',
          transition: 'box-shadow 240ms ease',
        }} />
        {enRevue && (
          <div style={{
            position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', zIndex: 5,
            padding: '4px 12px', borderRadius: ui.radius.pill, background: 'rgba(8,9,12,0.82)',
            border: `1px solid ${BRASS}`, font: `700 11px ${fonts.body}`, color: BRASS, whiteSpace: 'nowrap',
          }}>Revue · {posInitiale ? 'position initiale' : `coup ${curseur + 1}/${historique.length}`}</div>
        )}
      </div>
    </div>
  )

  // ── Panneau latéral chess.com : surface solide (fini les rails verre dépoli de l'arène) ──
  const panneauStyle = {
    display: 'flex', flexDirection: 'column', gap: 10,
    background: cc.panel, border: `1px solid ${cc.line}`, borderRadius: cc.radius.lg,
    padding: '12px', boxSizing: 'border-box', overflowY: 'auto',
  }

  // ── Contenu du panneau droit : liste de coups (scroll) · coach · contrôles · menu ──
  const rightRail = (
    <>
      {ouverture && (
        <div style={{
          display: 'flex', alignItems: 'baseline', gap: 8, padding: '6px 10px', borderRadius: ui.radius.sm,
          background: ui.surface, border: `1px solid ${ui.line}`,
        }}>
          <span style={{ font: `700 10px ${fonts.mono}`, letterSpacing: '0.06em', color: ui.textMute, fontVariantNumeric: 'tabular-nums' }}>
            {ouverture.eco}
          </span>
          <span style={{
            font: `600 12px ${fonts.body}`, color: ui.textDim,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }} title={ouverture.nom}>{ouverture.nom}</span>
        </div>
      )}
      {(isIA || mode === 'local') && (
        <CoachPanel
          accent={BRASS}
          texte={coach.texte} loading={coach.loading} erreur={coach.erreur}
          onIndice={demanderIndice} onConseil={demanderConseil}
          peutAider={peutAider} indiceTexte={indice?.texte}
        />
      )}
      <div style={{ flex: 1, minHeight: 120, display: 'flex' }}>
        <MoveList historique={historique} curseur={curseur === -1 ? historique.length - 1 : curseur} onAller={aller} />
      </div>
      <Controls
        onNouvelle={rejouer}
        onAbandonner={abandonner}
        onNulle={termine ? null : proposerNulle}
        onAnnuler={annuler}
        onFlip={() => setFlip(f => !f)}
        peutAnnuler={!termine && historique.length > 0 && !reflechit}
        peutAbandonner={!termine && historique.length > 0}
        nulleProposee={nulleProposee}
        curseur={curseur === -1 ? historique.length - 1 : curseur}
        nbCoups={historique.length}
        onAller={aller}
      />

      {/* Replay + export : seulement en revue ou partie terminée (jamais pendant le jeu live). */}
      {(termine || enRevue) && historique.length > 0 && (
        <ReplayScrubber
          index={indexLecture}
          total={totalPlies}
          onSeek={seekLecture}
          playing={lecture}
          onTogglePlay={() => {
            if (lecture) { setLecture(false); return }
            if (indexLecture >= totalPlies) seekLecture(0)   // au bout : relance depuis le début
            setLecture(true)
          }}
          speed={vitesse}
          onSpeed={setVitesse}
          accent={BRASS}
        />
      )}
      {historique.length > 0 && (
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => exporterPGN('copie')}
            title="Copier le PGN dans le presse-papier"
            style={{
              flex: 1, padding: '8px', borderRadius: ui.radius.sm, cursor: 'pointer',
              font: `600 12px ${fonts.body}`, color: copiePGN ? '#cdeac0' : ui.text,
              background: ui.surface, border: `1px solid ${copiePGN ? 'rgba(127,184,106,0.5)' : ui.line}`,
              transition: 'color .15s, border-color .15s',
            }}
          >{copiePGN ? 'PGN copié ✓' : 'Exporter PGN'}</button>
          <button
            onClick={() => exporterPGN('fichier')}
            title="Télécharger le fichier .pgn"
            aria-label="Télécharger le PGN"
            style={{
              flex: '0 0 auto', padding: '8px 11px', borderRadius: ui.radius.sm, cursor: 'pointer',
              font: `600 12px ${fonts.body}`, color: ui.textDim,
              background: ui.surface, border: `1px solid ${ui.line}`,
            }}
          >↓ .pgn</button>
        </div>
      )}
      <button onClick={onQuitter} style={{
        padding: '8px', borderRadius: ui.radius.sm, cursor: 'pointer',
        font: `600 12px ${fonts.body}`, color: ui.textMute, background: 'transparent',
        border: `1px solid ${ui.line}`,
      }}>← Menu</button>
    </>
  )

  // ── Colonne board chess.com : barre adversaire (haut) · plateau · barre joueur (bas) ──
  const colonneBoard = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7, alignItems: mobile ? 'stretch' : 'flex-start' }}>
      <Joueur label={labelHaut} camp={campHaut} capturees={sesCaptures} />
      <div style={{ alignSelf: mobile ? 'center' : 'flex-start' }}>{boardNode}</div>
      <Joueur label={labelBas} camp={campBas} capturees={mesCaptures} />
    </div>
  )

  return (
    <div style={{ position: 'absolute', inset: 0, background: cc.bg }}>
      {mobile ? (
        <div style={{
          height: '100%', overflowY: 'auto', boxSizing: 'border-box',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '12px 10px 30px',
        }}>
          <div style={{ width: '100%', maxWidth: taille }}>{colonneBoard}</div>
          <div style={{ ...panneauStyle, width: '100%', maxWidth: 480 }}>
            <Indicateur />
            {rightRail}
          </div>
        </div>
      ) : (
        <div style={{
          height: '100%', boxSizing: 'border-box',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18, padding: '18px 26px',
        }}>
          {colonneBoard}
          <div style={{ ...panneauStyle, width: 350, maxHeight: '94%' }}>
            <Indicateur />
            {rightRail}
          </div>
        </div>
      )}
      {finVisible && (
        <EndOverlay
          resultat={resultatFinal} cause={causeFinale} maCouleur={isIA ? maCouleur : null}
          deltaElo={null}
          onRejouer={rejouer}
          onRevoir={historique.length ? () => { setFinVisible(false); seekLecture(0); setLecture(true) } : undefined}
          onRetour={onQuitter}
          onFermer={() => setFinVisible(false)}
          onAnalyser={historique.length ? lancerAnalyse : undefined}
          analyseEnCours={analyseEnCours}
          analyseProgres={analyseProgres}
        />
      )}
      {analysePanneau && (
        <AnalysisPanel
          resultat={analyse}
          curseur={curseur === -1 ? historique.length - 1 : curseur}
          onAller={allerDepuisAnalyse}
          onFermer={() => setAnalysePanneau(false)}
          historique={historique}
          analyser={analyser}
        />
      )}
    </div>
  )
}

// glyphe d'une pièce capturée (camp = qui a capturé → pièce adverse)
const GLYPHES = { w: { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛' }, b: { p: '♙', n: '♘', b: '♗', r: '♖', q: '♕' } }
function glyphe(campCapteur, type) { return (GLYPHES[campCapteur] && GLYPHES[campCapteur][type]) || '' }

// ════════════════════════════════════════════════════════════════════════════
export default function PlayTab() {
  const reglagesCtx = useChessSettings()
  const [config, setConfig] = useState(null)
  const [cle, setCle] = useState(0)

  if (!config) {
    return (
      <div style={{ position: 'relative', height: '100%' }}>
        <ConfigJeu
          onLancer={setConfig}
          niveauDefaut={reglagesCtx.reglages.niveauIa}
          boardId="chesscom"
        />
      </div>
    )
  }
  return (
    <div style={{ position: 'relative', height: '100%' }}>
      <PartieEnCours
        key={cle}
        config={config}
        reglagesCtx={reglagesCtx}
        onRejouer={() => setCle(k => k + 1)}
        onQuitter={() => setConfig(null)}
      />
    </div>
  )
}
