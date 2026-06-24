// ── openings.js : détection d'ouverture ECO (table compacte des plus jouées) ──
// On ne vise PAS l'exhaustivité des ~3000 lignes ECO : ~55 ouvertures + variantes
// les plus courantes suffisent à nommer la quasi-totalité des débuts amateurs.
// detecterOuverture(historiqueSAN) renvoie la PLUS LONGUE séquence matchée en
// préfixe → { eco, nom } (FR), ou null si rien ne matche.
//
// Format d'une entrée : [eco, nom, 'séquence SAN espacée'].
// La séquence est un PRÉFIXE : la partie doit commencer exactement par ces coups.
// Les SAN sont sans annotation (pas de +, #, !, ? — on nettoie côté input).

const TABLE = [
  // ── 1.e4 e5 (ouvertures ouvertes) ──
  ['C60', 'Partie espagnole (Ruy Lopez)', 'e4 e5 Nf3 Nc6 Bb5'],
  ['C65', 'Espagnole, défense berlinoise', 'e4 e5 Nf3 Nc6 Bb5 Nf6'],
  ['C68', 'Espagnole, variante d\'échange', 'e4 e5 Nf3 Nc6 Bb5 a6 Bxc6'],
  ['C70', 'Espagnole, Morphy', 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4'],
  ['C50', 'Partie italienne', 'e4 e5 Nf3 Nc6 Bc4'],
  ['C53', 'Italienne, Giuoco Piano', 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3'],
  ['C55', 'Italienne, deux cavaliers', 'e4 e5 Nf3 Nc6 Bc4 Nf6'],
  ['C57', 'Deux cavaliers, attaque Fried Liver', 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5'],
  ['C44', 'Partie écossaise', 'e4 e5 Nf3 Nc6 d4'],
  ['C45', 'Écossaise, variante principale', 'e4 e5 Nf3 Nc6 d4 exd4 Nxd4'],
  ['C46', 'Partie des trois cavaliers', 'e4 e5 Nf3 Nc6 Nc3'],
  ['C47', 'Partie des quatre cavaliers', 'e4 e5 Nf3 Nc6 Nc3 Nf6'],
  ['C42', 'Défense Petroff', 'e4 e5 Nf3 Nf6'],
  ['C40', 'Défense Philidor', 'e4 e5 Nf3 d6'],
  ['C33', 'Gambit du Roi accepté', 'e4 e5 f4 exf4'],
  ['C30', 'Gambit du Roi', 'e4 e5 f4'],
  ['C23', 'Partie du fou', 'e4 e5 Bc4'],
  ['C20', 'Partie du pion roi', 'e4 e5'],
  ['C21', 'Gambit du Centre', 'e4 e5 d4'],
  ['C25', 'Partie viennoise', 'e4 e5 Nc3'],

  // ── 1.e4 c5 (Sicilienne) ──
  ['B20', 'Défense sicilienne', 'e4 c5'],
  ['B27', 'Sicilienne, Hyper-accélérée', 'e4 c5 Nf3 g6'],
  ['B23', 'Sicilienne, fermée', 'e4 c5 Nc3'],
  ['B21', 'Sicilienne, gambit Smith-Morra', 'e4 c5 d4'],
  ['B22', 'Sicilienne, variante Alapine', 'e4 c5 c3'],
  ['B50', 'Sicilienne, 2.Nf3 d6', 'e4 c5 Nf3 d6'],
  ['B54', 'Sicilienne, ouverte', 'e4 c5 Nf3 d6 d4 cxd4 Nxd4'],
  ['B90', 'Sicilienne, Najdorf', 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6'],
  ['B33', 'Sicilienne, Sveshnikov', 'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5'],
  ['B30', 'Sicilienne, 2...Nc6', 'e4 c5 Nf3 Nc6'],
  ['B40', 'Sicilienne, 2...e6', 'e4 c5 Nf3 e6'],
  ['B70', 'Sicilienne, dragon', 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6'],
  ['B10', 'Défense Caro-Kann', 'e4 c6'],
  ['B12', 'Caro-Kann, variante d\'avance', 'e4 c6 d4 d5 e5'],
  ['B13', 'Caro-Kann, variante d\'échange', 'e4 c6 d4 d5 exd5'],
  ['B18', 'Caro-Kann, classique', 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5'],

  // ── 1.e4 autres ──
  ['C00', 'Défense française', 'e4 e6'],
  ['C02', 'Française, variante d\'avance', 'e4 e6 d4 d5 e5'],
  ['C03', 'Française, Tarrasch', 'e4 e6 d4 d5 Nd2'],
  ['C10', 'Française, Paulsen', 'e4 e6 d4 d5 Nc3'],
  ['B01', 'Défense scandinave', 'e4 d5'],
  ['B02', 'Défense Alekhine', 'e4 Nf6'],
  ['B07', 'Défense Pirc', 'e4 d6 d4 Nf6 Nc3 g6'],
  ['B06', 'Défense moderne', 'e4 g6'],

  // ── 1.d4 d5 (Gambit Dame & co) ──
  ['D06', 'Gambit Dame', 'd4 d5 c4'],
  ['D20', 'Gambit Dame accepté', 'd4 d5 c4 dxc4'],
  ['D30', 'Gambit Dame refusé', 'd4 d5 c4 e6'],
  ['D35', 'Gambit Dame refusé, échange', 'd4 d5 c4 e6 Nc3 Nf6 cxd5'],
  ['D10', 'Défense slave', 'd4 d5 c4 c6'],
  ['D43', 'Demi-slave', 'd4 d5 c4 c6 Nf3 Nf6 Nc3 e6'],
  ['D00', 'Partie du pion dame', 'd4 d5'],
  ['D02', 'Système de Londres', 'd4 d5 Nf3 Nf6 Bf4'],

  // ── 1.d4 Nf6 (indiennes) ──
  ['E60', 'Défense est-indienne', 'd4 Nf6 c4 g6'],
  ['E90', 'Est-indienne, variante classique', 'd4 Nf6 c4 g6 Nc3 Bg7 e4'],
  ['E20', 'Défense Nimzo-indienne', 'd4 Nf6 c4 e6 Nc3 Bb4'],
  ['E12', 'Défense ouest-indienne', 'd4 Nf6 c4 e6 Nf3 b6'],
  ['D70', 'Défense Grünfeld', 'd4 Nf6 c4 g6 Nc3 d5'],
  ['A45', 'Défense indienne du Dame', 'd4 Nf6'],
  ['A56', 'Défense Benoni', 'd4 Nf6 c4 c5'],
  ['A57', 'Gambit Benko', 'd4 Nf6 c4 c5 d5 b5'],
  ['E00', 'Système Catalan', 'd4 Nf6 c4 e6 g3'],
  ['A40', 'Partie du pion dame', 'd4'],

  // ── Flanc ──
  ['A10', 'Partie anglaise', 'c4'],
  ['A20', 'Anglaise, partie du pion roi', 'c4 e5'],
  ['A04', 'Partie Réti', 'Nf3'],
  ['A00', 'Partie Bird', 'f4'],
  ['A00', 'Partie polonaise (Orang-outan)', 'b4'],
  ['A00', 'Ouverture Larsen', 'b3'],
]

// Pré-découpe les séquences une seule fois (perf : table figée au module load).
const ENTREES = TABLE.map(([eco, nom, seq]) => ({
  eco, nom,
  coups: seq.split(' '),
})).sort((a, b) => b.coups.length - a.coups.length) // plus longues d'abord

// Nettoie un SAN : retire échec/mat/annotations pour comparer les coups nus.
function nettoyerSan(san) {
  return String(san).replace(/[+#!?]/g, '')
}

// detecterOuverture(historiqueSAN)
//   historiqueSAN : tableau de coups SAN (strings) OU de moves verbeux { san }.
//   → { eco, nom } de la plus longue séquence matchée en préfixe, sinon null.
export function detecterOuverture(historiqueSAN) {
  if (!Array.isArray(historiqueSAN) || historiqueSAN.length === 0) return null
  const coups = historiqueSAN.map(m => nettoyerSan(typeof m === 'string' ? m : m?.san))
  // ENTREES déjà triée du plus long au plus court → premier match = le plus précis.
  for (const e of ENTREES) {
    if (e.coups.length > coups.length) continue
    let ok = true
    for (let i = 0; i < e.coups.length; i++) {
      if (coups[i] !== e.coups[i]) { ok = false; break }
    }
    if (ok) return { eco: e.eco, nom: e.nom }
  }
  return null
}

export default detecterOuverture
