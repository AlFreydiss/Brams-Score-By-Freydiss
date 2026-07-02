// ── OpeningTrainer : entraîneur d'ouvertures façon chess.com ─────────────────
// Répertoire interactif rendu dans l'onglet « Apprendre » (section Ouvertures).
// Principe : le joueur choisit une ouverture, joue les coups de SON camp sur
// l'échiquier ; l'app répond automatiquement le coup adverse de la théorie
// (~0,4 s) jusqu'à la fin de la ligne. Mauvais coup → shake + « Pas la
// théorie — <coup attendu> » + coup annulé. Indice → flèche (Arrows) sur le
// coup attendu. Fin de ligne → ✓ + topo sur les idées du plan.
//
// Données : 12 lignes POPULAIRES dont chaque séquence est un préfixe étendu
// des entrées d'openings.js (lecture seule — la TABLE n'est pas exportée, on
// recopie donc les séquences ici et on ré-ancre eco/nom via detecterOuverture).
// Chaque ligne est REJOUÉE avec chess.js au chargement : coups verbeux
// précalculés (from/to pour comparer sans ambiguïté SAN) et ligne invalide
// silencieusement écartée.
//
// Board interactif calqué sur PuzzleTrainer : react-chessboard v5, instance
// Chess locale, drag + clic-clic, thème chesscom, pièces Staunton (PIECES).
// Progression persistée en localStorage (badge ✓ sur les cartes du répertoire).
import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { Chessboard } from 'react-chessboard'
import { Chess } from 'chess.js'
import { ui, fonts } from '../../../features/games/neutralTheme.js'
import { cc } from '../ui/chesscom.js'
import { PIECES } from '../ui/pieces.jsx'
import Arrows from '../ui/Arrows.jsx'
import { boardParId } from '../logic/boards.js'
import { detecterOuverture } from '../logic/openings.js'
import { sons } from '../../../features/echecs/lib/sons.js'

const VERT = '#81b64c'
const DELAI_ADV = 420          // délai avant la réplique adverse automatique (ms)
const LS_KEY = 'echecs.ouvertures.faites.v1'

// ════════════════════════════════════════════════════════════════════════════
// RÉPERTOIRE — 12 ouvertures populaires. `seq` = préfixe d'openings.js étendu
// de quelques demi-coups de théorie (10 demi-coups par ligne). `camp` = camp
// conseillé pour l'entraînement. `idee` = topo affiché à la fin de la ligne.
// ════════════════════════════════════════════════════════════════════════════
const REPERTOIRE = [
  {
    id: 'italienne', nom: 'Partie italienne', camp: 'w',
    seq: 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6',
    idee: "Développement rapide, le fou vise f7 et c3 prépare la poussée d4. Plan typique : petit roque, puis manœuvre du cavalier b1 vers g3 via d2-f1.",
  },
  {
    id: 'espagnole', nom: 'Partie espagnole (Ruy Lopez)', camp: 'w',
    seq: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7',
    idee: "Pression durable sur e5 via le fou b5-a4 : les Blancs jouent un avantage d'espace à long terme. Après Re1, le plan c3-d4 construit un grand centre.",
  },
  {
    id: 'najdorf', nom: 'Sicilienne Najdorf', camp: 'b',
    seq: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6',
    idee: "a6 contrôle b5 et prépare ...e5 ou ...b5 : les Noirs jouent au contre. Pression sur e4 et expansion à l'aile dame, le déséquilibre est voulu.",
  },
  {
    id: 'francaise', nom: 'Défense française (avance)', camp: 'b',
    seq: 'e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Qb6',
    idee: "Les Noirs attaquent la chaîne e5-d4 par ...c5 puis ...Qb6 : la pression sur d4 est le fil rouge. Le fou c8 reste le problème à résoudre plus tard.",
  },
  {
    id: 'carokann', nom: 'Défense Caro-Kann (classique)', camp: 'b',
    seq: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6',
    idee: "Structure solide sans enfermer le fou c8 : Bf5 sort AVANT ...e6. Position saine, peu de faiblesses — les Noirs jouent la solidité longue durée.",
  },
  {
    id: 'gambitdame', nom: 'Gambit Dame refusé', camp: 'w',
    seq: 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O',
    idee: "Pression sur d5 et clouage du cavalier f6 : jeu de position classique. Plan à long terme côté blanc : l'attaque de minorité à l'aile dame (b4-b5).",
  },
  {
    id: 'londres', nom: 'Système de Londres', camp: 'w',
    seq: 'd4 d5 Nf3 Nf6 Bf4 e6 e3 c5 c3 Nc6',
    idee: "Système universel : le fou f4 sort avant e3, pyramide de pions c3-d4-e3. Plans simples — Bd3, Nbd2, et souvent Ne5 suivi d'une attaque sur le roi.",
  },
  {
    id: 'anglaise', nom: 'Partie anglaise', camp: 'w',
    seq: 'c4 e5 Nc3 Nf6 g3 d5 cxd5 Nxd5 Bg2 Nb6',
    idee: "Sicilienne inversée avec un temps de plus : le fou g2 raye la grande diagonale. Les Blancs jouent sur les cases blanches et la colonne c ouverte.",
  },
  {
    id: 'scandinave', nom: 'Défense scandinave', camp: 'b',
    seq: 'e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3 c6',
    idee: "Les Noirs liquident le centre dès le premier coup ; la dame reste active en a5. ...c6 donne une structure Caro-Kann : développement simple et solide.",
  },
  {
    id: 'estindienne', nom: 'Défense est-indienne', camp: 'b',
    seq: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O',
    idee: "Les Noirs concèdent le centre pour l'attaquer ensuite par ...e5 : jeu de contre typique. À l'aile roi, la poussée ...f5-f4 est l'attaque classique.",
  },
  {
    id: 'ecossaise', nom: 'Partie écossaise', camp: 'w',
    seq: 'e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Bc5 Be3 Qf6',
    idee: "Le centre s'ouvre dès le 3e coup : jeu de pièces actif sans la montagne de théorie de l'Espagnole. Après c3 et Qd2, le grand roque devient possible.",
  },
  {
    id: 'slave', nom: 'Défense slave', camp: 'b',
    seq: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 dxc4 a4 Bf5',
    idee: "...c6 défend d5 sans enfermer le fou c8 : après ...dxc4 puis ...Bf5, le développement est harmonieux. a4 empêche ...b5 mais affaiblit la case b4.",
  },
]

// ════════════════════════════════════════════════════════════════════════════
// Validation au chargement : chaque séquence SAN est rejouée sur une instance
// Chess ; on précalcule les coups verbeux { san, from, to, promotion } (pour
// comparer le coup joué sans ambiguïté SAN). Ligne invalide → écartée en
// silence. eco/nom sont ré-ancrés sur la base openings.js via detecterOuverture.
// ════════════════════════════════════════════════════════════════════════════
function lignesValides(liste) {
  const ok = []
  for (const l of liste || []) {
    try {
      const sans = String(l.seq || '').trim().split(/\s+/)
      if (sans.length < 6) continue
      const c = new Chess()
      const coups = []
      let valide = true
      for (const san of sans) {
        let mv = null
        try { mv = c.move(san) } catch { mv = null }
        if (!mv) { valide = false; break }
        coups.push({ san: mv.san, from: mv.from, to: mv.to, promotion: mv.promotion })
      }
      if (!valide) continue
      const det = detecterOuverture(sans)
      ok.push({ ...l, coups, eco: det?.eco || null, nomBase: det?.nom || null })
    } catch { /* ligne malformée → ignorée */ }
  }
  return ok
}

// Progression persistée (Set d'ids complétés).
function lireFaites() {
  try {
    const v = JSON.parse(localStorage.getItem(LS_KEY))
    return new Set(Array.isArray(v) ? v : [])
  } catch { return new Set() }
}
function sauverFaites(set) {
  try { localStorage.setItem(LS_KEY, JSON.stringify([...set])) } catch {}
}

// Aperçu des premiers coups pour une carte : "1.e4 e5 2.Cf3 …"
function apercu(coups, n = 4) {
  const bouts = []
  for (let i = 0; i < Math.min(n, coups.length); i++) {
    bouts.push(i % 2 === 0 ? `${i / 2 + 1}.${coups[i].san}` : coups[i].san)
  }
  return bouts.join(' ') + (coups.length > n ? ' …' : '')
}

// Son d'un coup légal (réutilise le module sons, garde-fous si une clé manque).
function sonDuCoup(mv, enEchec) {
  try {
    if (enEchec) sons.echec?.()
    else if (mv.flags?.includes('k') || mv.flags?.includes('q')) sons.roque?.()
    else if (mv.captured) sons.capture?.()
    else sons.coup?.()
  } catch {}
}

// ════════════════════════════════════════════════════════════════════════════
// Échiquier jouable d'une ligne (react-chessboard direct, instance Chess locale).
// Le joueur joue `camp` ; l'adversaire répond automatiquement la théorie.
//  onProgres(ply)                    → avancement (demi-coups joués)
//  onErreur('illegal'|'theorie', s)  → coup refusé (s = SAN attendu)
//  onFini()                          → ligne complétée
// ════════════════════════════════════════════════════════════════════════════
function PlateauOuverture({ ligne, camp, taille, coords, indiceActif, cle, fini, onProgres, onErreur, onFini }) {
  const tema = useMemo(() => boardParId('chesscom'), [])
  const chessRef = useRef(null)
  const plyRef = useRef(0)
  const timeoutRef = useRef(null)
  const [fen, setFen] = useState(() => new Chess().fen())
  const [selection, setSelection] = useState(null)
  const [erreurCase, setErreurCase] = useState(null)
  const [attenteAdv, setAttenteAdv] = useState(false)   // verrou pendant la réplique automatique
  const [dernierCoup, setDernierCoup] = useState(null)  // { from, to } du dernier coup joué
  const [shake, setShake] = useState(false)

  const orient = camp === 'b' ? 'black' : 'white'
  const verrou = fini || attenteAdv

  // Joue automatiquement le coup adverse de la théorie après un court délai.
  const jouerAuto = useCallback(() => {
    setAttenteAdv(true)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      const chess = chessRef.current
      const coup = ligne.coups[plyRef.current]
      let mv = null
      try { mv = coup ? chess.move(coup.san) : null } catch { mv = null }
      if (mv) {
        plyRef.current += 1
        setDernierCoup({ from: mv.from, to: mv.to })
        setFen(chess.fen())
        sonDuCoup(mv, chess.inCheck())
        onProgres(plyRef.current)
      }
      setAttenteAdv(false)
      timeoutRef.current = null
      if (plyRef.current >= ligne.coups.length) onFini()
    }, DELAI_ADV)
  }, [ligne, onProgres, onFini])

  // (Ré)initialise l'instance chess.js + l'état quand la ligne, le camp ou la
  // clé « recommencer » change. Si le joueur a les Noirs, l'app ouvre pour les Blancs.
  useEffect(() => {
    chessRef.current = new Chess()
    plyRef.current = 0
    setFen(chessRef.current.fen())
    setSelection(null); setErreurCase(null); setDernierCoup(null); setShake(false)
    setAttenteAdv(false)
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null }
    if (camp === 'b') jouerAuto()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ligne.id, camp, cle])

  // Nettoyage du timer si le composant est démonté.
  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current) }, [])

  const secouer = useCallback((sq) => {
    setErreurCase(sq)
    setShake(true)
    try { sons.illegal?.() } catch {}
    setTimeout(() => setErreurCase(null), 420)
    setTimeout(() => setShake(false), 380)
  }, [])

  // Évalue un coup tenté : chess.js juge la légalité, nous jugeons la théorie
  // (comparaison from/to du coup attendu précalculé — insensible aux ambiguïtés SAN).
  const tenter = useCallback((from, to) => {
    if (verrou) return false
    const chess = chessRef.current
    const attendu = ligne.coups[plyRef.current]
    if (!attendu || chess.turn() !== camp) return false
    let mv = null
    try { mv = chess.move({ from, to, promotion: attendu.promotion || 'q' }) } catch { mv = null }
    if (!mv) { secouer(to); onErreur('illegal', attendu.san); return false }
    if (mv.from === attendu.from && mv.to === attendu.to && (!attendu.promotion || mv.promotion === attendu.promotion)) {
      plyRef.current += 1
      setDernierCoup({ from: mv.from, to: mv.to })
      setFen(chess.fen())
      sonDuCoup(mv, chess.inCheck())
      onProgres(plyRef.current)
      if (plyRef.current >= ligne.coups.length) onFini()
      else jouerAuto()
      return true
    }
    chess.undo()                       // coup légal mais hors théorie → annulé
    secouer(to)
    onErreur('theorie', attendu.san)
    return false
  }, [verrou, ligne, camp, secouer, onErreur, onProgres, onFini, jouerAuto])

  // ── react-chessboard v5 : drag & drop ──
  const onPieceDrop = useCallback(({ sourceSquare, targetSquare }) => {
    if (!targetSquare || verrou) return false
    return tenter(sourceSquare, targetSquare)
  }, [tenter, verrou])

  // ── clic-clic (accessibilité + mobile) ──
  const onSquareClick = useCallback(({ square }) => {
    if (verrou) return
    const chess = chessRef.current
    if (selection) {
      if (square === selection) { setSelection(null); return }
      const p = chess.get(square)
      if (p && p.color === camp && chess.turn() === camp) { setSelection(square); return }
      tenter(selection, square)
      setSelection(null)
    } else {
      const p = chess.get(square)
      if (p && p.color === camp && chess.turn() === camp) setSelection(square)
    }
  }, [selection, verrou, tenter, camp])

  const canDragPiece = useCallback(({ piece }) => {
    if (verrou) return false
    const couleur = typeof piece === 'string' ? piece[0]?.toLowerCase() : piece?.pieceType?.[0]?.toLowerCase()
    return couleur === camp && chessRef.current?.turn() === camp
  }, [verrou, camp])

  // Coup attendu à l'étape courante (plyRef est à jour à chaque re-render fen/attente).
  const attendu = !fini && !attenteAdv ? ligne.coups[plyRef.current] : null
  const tourJoueur = !!attendu && chessRef.current?.turn() === camp

  // ── Surbrillances : dernier coup, sélection, coups légaux, erreur ──
  const squareStyles = useMemo(() => {
    const s = {}
    if (dernierCoup) {
      s[dernierCoup.from] = { ...(s[dernierCoup.from] || {}), background: 'rgba(255,255,51,0.32)' }
      s[dernierCoup.to] = { ...(s[dernierCoup.to] || {}), background: 'rgba(255,255,51,0.44)' }
    }
    if (selection) {
      s[selection] = { ...(s[selection] || {}), background: 'rgba(129,182,76,0.42)' }
      const chess = chessRef.current
      if (chess) {
        for (const m of chess.moves({ square: selection, verbose: true })) {
          s[m.to] = m.captured
            ? { ...(s[m.to] || {}), boxShadow: `inset 0 0 0 4px rgba(212,104,90,0.85)`, borderRadius: 2 }
            : { ...(s[m.to] || {}), background: `radial-gradient(circle, rgba(40,40,46,0.35) 26%, transparent 30%)` }
        }
      }
    }
    if (erreurCase) s[erreurCase] = { ...(s[erreurCase] || {}), background: 'rgba(212,104,90,0.55)' }
    return s
  }, [selection, erreurCase, dernierCoup, fen])

  const notationTaille = Math.max(9, taille * 0.024)
  const options = useMemo(() => ({
    id: `ouverture-${ligne.id}`,
    pieces: PIECES,
    position: fen,
    boardOrientation: orient,
    onPieceDrop,
    onSquareClick,
    canDragPiece,
    allowDragging: !verrou,
    animationDurationInMs: 200,
    showNotation: coords,
    squareStyles,
    boardStyle: { borderRadius: 12, overflow: 'hidden', boxShadow: '0 30px 70px -28px rgba(0,0,0,.85), 0 0 0 1px rgba(255,255,255,.05)' },
    darkSquareStyle: { backgroundColor: tema.foncee },
    lightSquareStyle: { backgroundColor: tema.claire },
    lightSquareNotationStyle: { fontSize: notationTaille, fontFamily: fonts.body, fontWeight: 700, color: tema.notationClaire },
    darkSquareNotationStyle: { fontSize: notationTaille, fontFamily: fonts.body, fontWeight: 700, color: tema.notationFoncee },
  }), [fen, ligne.id, orient, onPieceDrop, onSquareClick, canDragPiece, verrou, coords, squareStyles, tema, notationTaille])

  return (
    <div className={shake ? 'ouvShake' : undefined} style={{ position: 'relative', width: taille, height: taille, flexShrink: 0 }}>
      <Chessboard options={options} />

      {/* flèche d'indice sur le coup attendu (mode indice, au tour du joueur) */}
      {indiceActif && tourJoueur && (
        <Arrows cases={[attendu.from, attendu.to]} orientation={orient} taille={taille} accent={VERT} />
      )}

      {/* badge « réflexion adverse » pendant la réplique automatique */}
      {attenteAdv && (
        <div aria-hidden style={{
          position: 'absolute', top: 10, left: 10, zIndex: 5, padding: '5px 11px', borderRadius: 999,
          background: 'rgba(0,0,0,0.62)', backdropFilter: 'blur(4px)',
          font: `700 11px ${fonts.body}`, letterSpacing: '0.04em', color: '#e9efe2',
          border: '1px solid rgba(129,182,76,0.45)',
        }}>L'adversaire répond…</div>
      )}

      {/* halo de succès autour du plateau */}
      <div aria-hidden style={{
        position: 'absolute', inset: -2, borderRadius: 14, pointerEvents: 'none', zIndex: 4,
        boxShadow: fini ? '0 0 0 2px rgba(127,184,106,0.65), 0 0 40px 4px rgba(127,184,106,0.35)' : 'none',
        transition: 'box-shadow 320ms ease',
      }} />
    </div>
  )
}

// ── Taille responsive du plateau (carré borné, même heuristique que Puzzles). ──
function useTailleOuv() {
  const [t, setT] = useState(380)
  useEffect(() => {
    const calc = () => {
      const vw = window.innerWidth, vh = window.innerHeight
      const mobile = vw < 860
      const dispoL = mobile ? vw - 64 : Math.min(520, (vw - 120) * 0.42)
      const dispoH = vh - (mobile ? 360 : 260)
      setT(Math.floor(Math.max(260, Math.min(480, dispoL, dispoH))))
    }
    calc()
    window.addEventListener('resize', calc)
    return () => window.removeEventListener('resize', calc)
  }, [])
  return t
}

// ════════════════════════════════════════════════════════════════════════════
// OpeningTrainer — sélecteur de répertoire + entraînement guidé d'une ligne.
// ════════════════════════════════════════════════════════════════════════════
export default function OpeningTrainer() {
  const ouvertures = useMemo(() => lignesValides(REPERTOIRE), [])
  const taille = useTailleOuv()

  const [faites, setFaites] = useState(lireFaites)
  const [selId, setSelId] = useState(null)          // null → vue répertoire
  const [camp, setCamp] = useState('w')
  const [cle, setCle] = useState(0)                 // bump = recommencer
  const [ply, setPly] = useState(0)                 // demi-coups joués
  const [statut, setStatut] = useState('encours')   // 'encours' | 'fini'
  const [feedback, setFeedback] = useState(null)    // { type:'ok'|'err'|'info', txt, idee? }
  const [indiceActif, setIndiceActif] = useState(false)

  const ligne = useMemo(() => ouvertures.find(o => o.id === selId) || null, [ouvertures, selId])

  // Reset de l'état d'entraînement à chaque ouverture / camp / recommencer.
  useEffect(() => {
    setPly(0); setStatut('encours'); setFeedback(null); setIndiceActif(false)
  }, [selId, camp, cle])

  const choisir = useCallback((o) => { setSelId(o.id); setCamp(o.camp); setCle(k => k + 1) }, [])
  const retour = useCallback(() => setSelId(null), [])
  const recommencer = useCallback(() => setCle(k => k + 1), [])

  const onProgres = useCallback((p) => {
    setPly(p)
    setIndiceActif(false)
    setFeedback(f => (f && f.type === 'err' ? null : f))
  }, [])

  const onErreur = useCallback((type, sanAttendu) => {
    setFeedback(type === 'illegal'
      ? { type: 'err', txt: 'Coup illégal — ce déplacement n’est pas autorisé.' }
      : { type: 'err', txt: `Pas la théorie — le coup attendu est ${sanAttendu}.` })
  }, [])

  const onFini = useCallback(() => {
    if (!ligne) return
    setStatut('fini')
    setFeedback({ type: 'ok', txt: 'Ligne complétée — tu connais le début de cette ouverture.', idee: ligne.idee })
    setFaites(s => { const n = new Set(s); n.add(ligne.id); sauverFaites(n); return n })
    try { sons.victoire?.() } catch {}
  }, [ligne])

  const montrerIndice = useCallback(() => {
    setIndiceActif(true)
    setFeedback({ type: 'info', txt: 'Indice : la flèche sur l’échiquier montre le coup de la théorie.' })
  }, [])

  // ── Styles globaux (focus, hover, shake, barre) injectés une fois. ──
  const styleBlock = (
    <style>{`
      .ouvFocus:focus-visible { outline: 2px solid ${VERT}; outline-offset: 2px; border-radius: 8px; }
      .ouvPrimaire:hover { filter: brightness(1.08); }
      .ouvCarte:hover { border-color: rgba(129,182,76,0.55); }
      @keyframes ouvShake {
        0%, 100% { transform: translateX(0); }
        20% { transform: translateX(-6px); }
        40% { transform: translateX(5px); }
        60% { transform: translateX(-4px); }
        80% { transform: translateX(3px); }
      }
      @media (prefers-reduced-motion: no-preference){
        .ouvShake { animation: ouvShake 340ms ease; }
        .ouvBar { transition: width 420ms cubic-bezier(.4,0,.2,1); }
      }
      @media (prefers-reduced-motion: reduce){
        .ouvShake { animation: none; }
        .ouvBar { transition: none !important; }
      }
    `}</style>
  )

  // ── Aucune ligne valide : message sobre. ──
  if (!ouvertures.length) {
    return (
      <div style={carteVide()}>
        <span aria-hidden style={{ fontSize: 30 }}>♞</span>
        <p style={{ margin: '10px 0 0', font: `500 14px ${fonts.body}`, color: ui.textDim, lineHeight: 1.6, textAlign: 'center' }}>
          Aucune ouverture disponible pour le moment. Reviens bientôt.
        </p>
      </div>
    )
  }

  // ════════════════════════════ VUE RÉPERTOIRE ════════════════════════════
  if (!ligne) {
    const nbFaites = ouvertures.reduce((n, o) => n + (faites.has(o.id) ? 1 : 0), 0)
    return (
      <>
        {styleBlock}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ font: `700 11px ${fonts.body}`, letterSpacing: '0.14em', textTransform: 'uppercase', color: ui.textMute }}>
            {ouvertures.length} ouvertures
          </span>
          <span style={{ font: `600 11px ${fonts.mono}`, color: ui.textMute, fontVariantNumeric: 'tabular-nums' }}>
            {nbFaites}/{ouvertures.length} complétées
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%,250px),1fr))', gap: 12, marginTop: 10 }}>
          {ouvertures.map(o => {
            const faite = faites.has(o.id)
            return (
              <button
                key={o.id} className="ouvFocus ouvCarte" onClick={() => choisir(o)}
                aria-label={`S'entraîner : ${o.nom}${faite ? ' (complétée)' : ''}`}
                style={{
                  textAlign: 'left', cursor: 'pointer', padding: '14px 16px', borderRadius: ui.radius.md,
                  background: cc.panel, border: `1px solid ${faite ? 'rgba(127,184,106,0.45)' : cc.line}`,
                  display: 'flex', flexDirection: 'column', gap: 8, transition: 'border-color .15s',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ font: `700 15px ${fonts.body}`, color: ui.text, lineHeight: 1.3 }}>{o.nom}</span>
                  {faite && (
                    <span aria-hidden title="Complétée" style={{
                      flexShrink: 0, width: 20, height: 20, borderRadius: 999, display: 'inline-flex',
                      alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800,
                      color: '#15110a', background: VERT,
                    }}>✓</span>
                  )}
                </span>
                <span style={{ font: `600 12px ${fonts.mono}`, color: ui.textDim, letterSpacing: '0.01em' }}>
                  {apercu(o.coups)}
                </span>
                <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {o.eco && <span style={petitBadge(ui.textMute)}>{o.eco}</span>}
                  <span style={petitBadge(VERT)}>Conseillé : {o.camp === 'w' ? 'Blancs' : 'Noirs'}</span>
                  <span style={petitBadge(ui.textMute)}>{o.coups.length} demi-coups</span>
                </span>
              </button>
            )
          })}
        </div>
      </>
    )
  }

  // ════════════════════════════ VUE ENTRAÎNEMENT ═══════════════════════════
  const fini = statut === 'fini'
  const total = ligne.coups.length
  const progres = Math.round((ply / total) * 100)
  const joues = ligne.coups.slice(0, ply)

  return (
    <>
      {styleBlock}
      <section style={{
        ...railVerre(), padding: 0, overflow: 'hidden', display: 'grid',
        gridTemplateColumns: taille >= 360 ? 'auto minmax(0,1fr)' : '1fr', alignItems: 'stretch',
      }}>
        {/* Colonne plateau */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(16px,2vw,26px)', borderRight: `1px solid ${cc.line}`, background: 'rgba(0,0,0,0.12)' }}>
          <PlateauOuverture
            ligne={ligne} camp={camp} taille={taille} coords
            indiceActif={indiceActif} cle={cle} fini={fini}
            onProgres={onProgres} onErreur={onErreur} onFini={onFini}
          />
        </div>

        {/* Colonne info / feedback / actions */}
        <div style={{ display: 'flex', flexDirection: 'column', padding: 'clamp(18px,2vw,28px)', minWidth: 0, gap: 16 }}>
          {/* retour + progression */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
              <button className="ouvFocus" onClick={retour} style={{ ...btnSecondaire(false), padding: '6px 12px', font: `700 12px ${fonts.body}` }}>
                ← Répertoire
              </button>
              <span style={{ font: `600 11px ${fonts.mono}`, color: ui.textMute, fontVariantNumeric: 'tabular-nums' }}>
                {ply}/{total} demi-coups
              </span>
            </div>
            <div style={{ height: 6, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
              <div className="ouvBar" style={{ height: '100%', width: `${progres}%`, background: `linear-gradient(90deg, ${VERT}, #b7e08a)`, borderRadius: 999 }} />
            </div>
          </div>

          {/* titre / badges / consigne */}
          <div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
              {ligne.eco && <span style={petitBadge(VERT)}>{ligne.eco}</span>}
              {ligne.nomBase && <span style={petitBadge(ui.textMute)}>{ligne.nomBase}</span>}
            </div>
            <h3 style={{ margin: '0 0 8px', font: `800 22px ${fonts.display}`, letterSpacing: '-0.02em', color: ui.text }}>
              {ligne.nom}
            </h3>
            <p style={{ margin: 0, font: `400 14.5px ${fonts.body}`, color: ui.textDim, lineHeight: 1.6 }}>
              Tu joues les <strong style={{ color: ui.text }}>{camp === 'w' ? 'Blancs' : 'Noirs'}</strong> — l'adversaire répond
              automatiquement la théorie. Joue les coups de la ligne principale, coup par coup.
            </p>
          </div>

          {/* choix du camp */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ font: `700 11px ${fonts.body}`, letterSpacing: '0.14em', textTransform: 'uppercase', color: ui.textMute }}>Camp</span>
            {[{ id: 'w', label: 'Blancs' }, { id: 'b', label: 'Noirs' }].map(c => (
              <button
                key={c.id} className="ouvFocus" onClick={() => setCamp(c.id)}
                aria-pressed={camp === c.id} style={chipCamp(camp === c.id)}
              >
                {c.label}{ligne.camp === c.id ? ' ★' : ''}
              </button>
            ))}
          </div>

          {/* coups joués (la suite reste masquée : on apprend en jouant) */}
          <div aria-label="Coups joués" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, minHeight: 30, alignContent: 'flex-start' }}>
            {joues.length === 0 && (
              <span style={{ font: `500 12.5px ${fonts.body}`, color: ui.textMute }}>
                {camp === 'w' ? 'À toi de jouer le premier coup.' : 'Les Blancs ouvrent…'}
              </span>
            )}
            {joues.map((c, i) => (
              <span key={i} style={{
                font: `600 12.5px ${fonts.mono}`, color: i === ply - 1 ? '#15110a' : ui.textDim,
                background: i === ply - 1 ? VERT : ui.surface, border: `1px solid ${i === ply - 1 ? VERT : ui.line}`,
                padding: '3px 8px', borderRadius: ui.radius.pill, fontVariantNumeric: 'tabular-nums',
              }}>
                {i % 2 === 0 ? `${i / 2 + 1}. ` : ''}{c.san}
              </span>
            ))}
          </div>

          {/* zone feedback (hauteur réservée pour éviter le saut de layout) */}
          <div aria-live="polite" style={{ minHeight: 58 }}>
            {feedback && (
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 10, padding: '11px 14px', borderRadius: ui.radius.sm,
                background: feedback.type === 'ok' ? 'rgba(127,184,106,0.12)' : feedback.type === 'err' ? 'rgba(212,104,90,0.12)' : 'rgba(111,168,214,0.12)',
                border: `1px solid ${feedback.type === 'ok' ? 'rgba(127,184,106,0.45)' : feedback.type === 'err' ? 'rgba(212,104,90,0.45)' : 'rgba(111,168,214,0.4)'}`,
              }}>
                <span aria-hidden style={{ fontSize: 16, lineHeight: 1.4, color: feedback.type === 'ok' ? ui.good : feedback.type === 'err' ? ui.bad : ui.info }}>
                  {feedback.type === 'ok' ? '✓' : feedback.type === 'err' ? '✕' : '○'}
                </span>
                <span style={{ font: `500 13.5px ${fonts.body}`, color: feedback.type === 'ok' ? '#cdeac0' : feedback.type === 'err' ? '#f0c3bb' : '#cfe2f4', lineHeight: 1.5 }}>
                  {feedback.txt}{feedback.idee ? ` ${feedback.idee}` : ''}
                </span>
              </div>
            )}
          </div>

          {/* actions */}
          <div style={{ marginTop: 'auto', display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
            <button className="ouvFocus" onClick={montrerIndice} disabled={fini} style={btnSecondaire(fini)}>💡 Indice</button>
            <button className="ouvFocus" onClick={recommencer} style={btnSecondaire(false)}>↻ Recommencer</button>
            {fini && (
              <button className="ouvFocus ouvPrimaire" onClick={retour} style={btnPrincipal()}>Choisir une autre ouverture →</button>
            )}
          </div>
        </div>
      </section>
    </>
  )
}

// ── styles helpers (cohérents avec PuzzleTrainer / TutorialTab) ──────────────
function chipCamp(active) {
  return {
    padding: '7px 14px', borderRadius: ui.radius.pill, cursor: 'pointer',
    font: `700 12.5px ${fonts.body}`, letterSpacing: '0.01em',
    color: active ? '#15110a' : ui.text,
    background: active ? VERT : ui.surface,
    border: `1px solid ${active ? VERT : ui.line}`,
    boxShadow: active ? '0 10px 24px -16px rgba(129,182,76,0.8)' : 'none',
    transition: 'border-color .15s, filter .15s',
  }
}
function petitBadge(couleur) {
  return {
    font: `700 10.5px ${fonts.body}`, letterSpacing: '0.06em', textTransform: 'uppercase',
    color: couleur, padding: '4px 9px', borderRadius: ui.radius.pill,
    background: ui.surface, border: `1px solid ${ui.line}`,
  }
}
function btnPrincipal() {
  return {
    padding: '11px 20px', borderRadius: ui.radius.sm, cursor: 'pointer', border: 'none',
    font: `800 14px ${fonts.display}`, color: '#15110a', background: VERT,
    boxShadow: '0 12px 28px -14px rgba(129,182,76,0.7)', transition: 'filter .15s, transform .12s',
  }
}
function btnSecondaire(disabled) {
  return {
    padding: '10px 16px', borderRadius: ui.radius.sm, cursor: disabled ? 'default' : 'pointer',
    font: `700 13px ${fonts.body}`, color: disabled ? ui.textMute : ui.text,
    background: ui.surface, border: `1px solid ${ui.line}`, opacity: disabled ? 0.5 : 1,
    transition: 'border-color .15s',
  }
}
function railVerre() {
  return {
    background: cc.panel, border: `1px solid ${cc.line}`,
    borderRadius: ui.radius.lg, boxShadow: cc.shadow, boxSizing: 'border-box',
  }
}
function carteVide() {
  return {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    padding: '40px 24px', borderRadius: ui.radius.lg, background: cc.panel, border: `1px solid ${cc.line}`,
  }
}
