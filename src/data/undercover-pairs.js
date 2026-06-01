// ── Paires de personnages pour l'Undercover ──────────────────────────────────
// Chaque paire = 2 persos "proches" (même archétype). En partie, on tire UNE paire :
// les civils reçoivent l'un, l'undercover l'autre (qui est qui = aléatoire).
// Catalogue extensible : ajoute simplement des entrées { a, b }.
export const UNDERCOVER_PAIRS = [
  { a: 'Broly',   b: 'Zoro' },
  { a: 'Vegeta',  b: 'Sasuke' },
  { a: 'Goku',    b: 'Luffy' },
  { a: 'Kaneki',  b: "Shinichi" },
  { a: 'Senku',   b: 'Lawliet (L)' },
  // Quelques paires bonus (même vibe) pour varier les parties :
  { a: 'Naruto',  b: 'Asta' },
  { a: 'Itachi',  b: 'Madara' },
  { a: 'Gojo',    b: 'Kakashi' },
  { a: 'Eren',    b: 'Lelouch' },
  { a: 'Saitama', b: 'Mob' },
  { a: 'Light',   b: 'Johan' },
  { a: 'Ichigo',  b: 'Natsu' },
]

// Tire une paire au hasard et décide aléatoirement quel mot est celui de
// l'undercover → renvoie { civil, undercover }.
export function pickWordPair() {
  const p = UNDERCOVER_PAIRS[Math.floor(Math.random() * UNDERCOVER_PAIRS.length)]
  return Math.random() < 0.5
    ? { civil: p.a, undercover: p.b }
    : { civil: p.b, undercover: p.a }
}

// Nombre d'intrus selon le nombre de joueurs.
export function undercoverCountFor(n) {
  if (n <= 6) return 1
  if (n <= 9) return 2
  return 3
}
