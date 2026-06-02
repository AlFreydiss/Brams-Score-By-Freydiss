// ── Opening Background items catalog ──────────────────────────────────────
// Ces items alimentent la section "Fonds d'Openings" de la boutique Berry.
// ytId : utilisé pour la thumbnail YouTube (blurred) en fond.
// dominantColor : teinte de l'overlay — identité visuelle de l'opening.

export const OPENING_BACKGROUNDS = [
  {
    id:             'bg-unravel',
    shopItemId:     'bg-unravel',
    opTitle:        'Unravel',
    anime:          'Tokyo Ghoul',
    artist:         'TK from 凛として時雨',
    rarity:         'Secret',
    price:          5000000,
    ytId:           'vStHmc6oOCo',
    videoUrl:       'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/tg-op1.mp4',
    dominantColor:  '#2d0a4a',
    overlayStart:   'rgba(45,10,74,0.75)',
    overlayEnd:     'rgba(8,4,20,0.85)',
    description:    "Un fond sombre et fragmenté. Porté uniquement par les nakamas qui ont tout compris.",
    label:          'Fond animé',
  },
  {
    id:             'bg-the-rumbling',
    shopItemId:     'bg-the-rumbling',
    opTitle:        'The Rumbling',
    anime:          'Attack on Titan Final',
    artist:         'SiM',
    rarity:         'Secret',
    price:          6000000,
    ytId:           '3tBi5RFBj7Y',
    videoUrl:       'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/aot-op5.mp4',
    dominantColor:  '#3a0c0c',
    overlayStart:   'rgba(58,12,12,0.78)',
    overlayEnd:     'rgba(10,4,4,0.88)',
    description:    "La fin du monde en fond. Réservé aux rares qui ont tenu jusqu'au bout.",
    label:          'Fond animé',
  },
  {
    id:             'bg-kaikai-kitan',
    shopItemId:     'bg-kaikai-kitan',
    opTitle:        'Kaikai Kitan',
    anime:          'Jujutsu Kaisen',
    artist:         'Eve',
    rarity:         'Mythique',
    price:          2500000,
    ytId:           'wQCOAt0nMPU',
    videoUrl:       'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/jjk-op1.mp4',
    dominantColor:  '#0a1a3a',
    overlayStart:   'rgba(10,26,58,0.74)',
    overlayEnd:     'rgba(4,8,22,0.86)',
    description:    "Les malédictions comme décor. Une ambiance unique et redoutable.",
    label:          'Fond premium',
  },
  {
    id:             'bg-we-are',
    shopItemId:     'bg-we-are',
    opTitle:        'We Are!',
    anime:          'One Piece',
    artist:         'Hiroshi Kitadani',
    rarity:         'Legendaire',
    price:          1500000,
    ytId:           'qvKAApHaHnw',
    videoUrl:       'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/op-op11.mp4',
    dominantColor:  '#0a2a5a',
    overlayStart:   'rgba(10,42,90,0.70)',
    overlayEnd:     'rgba(4,14,38,0.82)',
    description:    "Le grand voyage des nakamas. Fond culte pour les vrais fans de One Piece.",
    label:          'Fond premium',
  },
  {
    id:             'bg-again',
    shopItemId:     'bg-again',
    opTitle:        'Again',
    anime:          'FMA: Brotherhood',
    artist:         'YUI',
    rarity:         'Legendaire',
    price:          1500000,
    ytId:           'fIRCVHBEFg8',
    videoUrl:       'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/fmab-op1.mp4',
    dominantColor:  '#4a1a04',
    overlayStart:   'rgba(74,26,4,0.72)',
    overlayEnd:     'rgba(22,8,2,0.84)',
    description:    "Alchimie et métal. L'opening parfait d'une des meilleures séries de tous les temps.",
    label:          'Fond premium',
  },
  {
    id:             'bg-cruel-angel',
    shopItemId:     'bg-cruel-angel',
    opTitle:        "A Cruel Angel's Thesis",
    anime:          'Neon Genesis Evangelion',
    artist:         'Yoko Takahashi',
    rarity:         'Legendaire',
    price:          1500000,
    ytId:           'JlP1pWFruCU',
    videoUrl:       'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/nge-op1.mp4',
    dominantColor:  '#1a1050',
    overlayStart:   'rgba(26,16,80,0.72)',
    overlayEnd:     'rgba(8,6,28,0.84)',
    description:    "L'opening mythique. Un morceau de légende pour un fond qui force le respect.",
    label:          'Fond premium',
  },
  {
    id:             'bg-hacking-gate',
    shopItemId:     'bg-hacking-gate',
    opTitle:        'Hacking to the Gate',
    anime:          "Steins;Gate",
    artist:         'Kanako Itou',
    rarity:         'Legendaire',
    price:          1500000,
    ytId:           'GTFK9TIFhbk',
    videoUrl:       'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/sg-op1.mp4',
    dominantColor:  '#042040',
    overlayStart:   'rgba(4,32,64,0.74)',
    overlayEnd:     'rgba(2,12,26,0.86)',
    description:    "El Psy Kongroo. Pour les voyageurs du temps et les nostalgiques du future.",
    label:          'Fond animé',
  },
  {
    id:             'bg-blue-bird',
    shopItemId:     'bg-blue-bird',
    opTitle:        'Blue Bird',
    anime:          'Naruto',
    artist:         'Ikimono-gakari',
    rarity:         'Epique',
    price:          900000,
    ytId:           'GKnLBnl8s7E',
    videoUrl:       'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/ns-op3.mp4',
    dominantColor:  '#062040',
    overlayStart:   'rgba(6,32,64,0.70)',
    overlayEnd:     'rgba(2,12,28,0.82)',
    description:    "L'oiseau bleu de Sasuke. Nostalgie garantie pour chaque fan de Naruto.",
    label:          'Fond animé',
  },
  {
    id:             'bg-silhouette',
    shopItemId:     'bg-silhouette',
    opTitle:        'Silhouette',
    anime:          'Naruto Shippuden',
    artist:         'KANA-BOON',
    rarity:         'Epique',
    price:          900000,
    ytId:           'XHiQl-u1qEU',
    videoUrl:       'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/ns-op16.mp4',
    dominantColor:  '#3a2008',
    overlayStart:   'rgba(58,32,8,0.70)',
    overlayEnd:     'rgba(20,10,2,0.82)',
    description:    "La course vers un but. Silhouettes et ambiance chaude de Konoha.",
    label:          'Fond',
  },
  {
    id:             'bg-haruka-mirai',
    shopItemId:     'bg-haruka-mirai',
    opTitle:        'Haruka Mirai',
    anime:          'Black Clover',
    artist:         'KANA-BOON',
    rarity:         'Epique',
    price:          900000,
    ytId:           'zJmBEJZpMRE',
    videoUrl:       'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/bc-op1.mp4',
    dominantColor:  '#062818',
    overlayStart:   'rgba(6,40,24,0.70)',
    overlayEnd:     'rgba(2,16,8,0.82)',
    description:    "L'énergie brute d'Asta. Pour ceux qui n'abandonnent jamais.",
    label:          'Fond',
  },
  {
    id:             'bg-colors',
    shopItemId:     'bg-colors',
    opTitle:        'Colors',
    anime:          'Code Geass',
    artist:         'FLOW',
    rarity:         'Rare',
    price:          600000,
    ytId:           'UCo4FE5xhT0',
    videoUrl:       'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/cg-op1.mp4',
    dominantColor:  '#2a1a04',
    overlayStart:   'rgba(42,26,4,0.70)',
    overlayEnd:     'rgba(16,10,2,0.82)',
    description:    "L'échiquier de Lelouch. Stratégie et trahison comme toile de fond.",
    label:          'Fond',
  },
  {
    id:             'bg-crossing-field',
    shopItemId:     'bg-crossing-field',
    opTitle:        'crossing field',
    anime:          'Sword Art Online',
    artist:         'LiSA',
    rarity:         'Commun',
    price:          400000,
    ytId:           'u9K7B8UQRiw',
    videoUrl:       'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/sao-op1.mp4',
    dominantColor:  '#0a1428',
    overlayStart:   'rgba(10,20,40,0.68)',
    overlayEnd:     'rgba(4,8,18,0.80)',
    description:    "L'ouverture qui a lancé une génération. Simple, efficace, mémorable.",
    label:          'Fond',
  },
]

// ── LocalStorage helpers ─────────────────────────────────────────────────
const LS_KEY = 'brams_bg_equipped_v1'

export function getEquippedBgId() {
  try { return localStorage.getItem(LS_KEY) || null }
  catch { return null }
}

export function setEquippedBgId(id) {
  try {
    if (id) localStorage.setItem(LS_KEY, id)
    else localStorage.removeItem(LS_KEY)
  } catch {}
}

export function getEquippedBg() {
  const id = getEquippedBgId()
  if (!id) return null
  return OPENING_BACKGROUNDS.find(bg => bg.id === id) || null
}

export function getBgById(id) {
  return OPENING_BACKGROUNDS.find(bg => bg.id === id) || null
}
