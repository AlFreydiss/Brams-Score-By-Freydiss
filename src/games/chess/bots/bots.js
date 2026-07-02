// ── Roster de bots « façon chess.com » pour /jeux/echecs ────────────────────
// Adversaires incarnés (thème pirate original, aucun nom sous copyright) qui
// REMPLACENT le simple choix de niveau dans la config. Chaque bot est mappé sur
// les réglages moteur EXISTANTS : reglagesDuBot(bot) renvoie l'entrée NIVEAUX_IA
// la plus proche de son ELO — exactement l'objet que ConfigJeu passait déjà via
// niveauParId(). Zéro changement dans useStockfish/usePartie/niveauxIA.js.
import { NIVEAUX_IA, niveauParId } from '../../../features/echecs/lib/niveauxIA.js'

// ELO « effectif » d'un niveau pour le mapping (Yonkou = pleine force ≈ 3190).
const ELO_PLEINE_FORCE = 3190
function eloEffectif(n) { return n.limitStrength ? n.elo : ELO_PLEINE_FORCE }

// couleurAccent : TOUJOURS un hex 6 chiffres (on suffixe des alphas hex dessus).
export const BOTS = [
  {
    id: 'moussaillon-titi', nom: 'Moussaillon Titi', elo: 400, emoji: '🐥',
    tagline: 'Premier jour à bord : il confond encore le fou et le cavalier.',
    style: 'fou', couleurAccent: '#E8C15A',
  },
  {
    id: 'canonnier-brice', nom: 'Canonnier Brice', elo: 700, emoji: '💣',
    tagline: 'Il tire d’abord et réfléchit ensuite. Parfois.',
    style: 'agressif', couleurAccent: '#E07A3F',
  },
  {
    id: 'navigatrice-lea', nom: 'Navigatrice Léa', elo: 1000, emoji: '🧭',
    tagline: 'Elle trace sa route sans paniquer : cap sur le centre.',
    style: 'solide', couleurAccent: '#5FB0C9',
  },
  {
    id: 'cuistot-gustavo', nom: 'Cuistot Gustavo', elo: 1150, emoji: '🍳',
    tagline: 'Il mijote ses plans à feu doux… et croque tout ce qui traîne.',
    style: 'gourmand', couleurAccent: '#D98E4A',
  },
  {
    id: 'corsaire-malo', nom: 'Corsaire Malo', elo: 1300, emoji: '⚔️',
    tagline: 'L’abordage, toujours l’abordage : gare à tes flancs.',
    style: 'agressif', couleurAccent: '#C94F4F',
  },
  {
    id: 'capitaine-morgane', nom: 'Capitaine Morgane', elo: 1600, emoji: '🏴‍☠️',
    tagline: 'Chaque coup est un piège : elle a trois coups d’avance.',
    style: 'tactique', couleurAccent: '#8E6FD8',
  },
  {
    id: 'chasseuse-vesper', nom: 'Chasseuse Vesper', elo: 1850, emoji: '🗡️',
    tagline: 'Elle flaire la moindre faiblesse et ne lâche jamais sa proie.',
    style: 'agressif', couleurAccent: '#B34FA0',
  },
  {
    id: 'amiral-drake', nom: 'Amiral Drake', elo: 2100, emoji: '⚓',
    tagline: 'La discipline de la flotte : pas une case laissée au hasard.',
    style: 'solide', couleurAccent: '#4F79C9',
  },
  {
    id: 'vice-reine-nera', nom: 'Vice-Reine Nera', elo: 2300, emoji: '🌒',
    tagline: 'Silencieuse, patiente : quand elle frappe, il est trop tard.',
    style: 'positionnel', couleurAccent: '#6E5FD8',
  },
  {
    id: 'seigneur-des-mers', nom: 'Seigneur des Mers', elo: 2850, emoji: '🌊',
    tagline: 'La légende de l’océan. Personne n’a survécu à sa tempête.',
    style: 'légende', couleurAccent: '#3FA98F',
  },
]

export function botParId(id) {
  return BOTS.find(b => b.id === id) || null
}

// ── Mapping bot → réglages moteur existants ──────────────────────────────────
// Renvoie l'entrée NIVEAUX_IA dont l'ELO effectif est le plus proche de celui
// du bot (égalité → niveau le plus fort). C'est l'objet exact qu'attendaient
// déjà usePartie/useStockfish (limitStrength/elo/skillLevel/movetimeMs/label).
export function reglagesDuBot(bot) {
  if (!bot) return niveauParId(null)   // repli : niveau par défaut de niveauxIA
  let meilleur = NIVEAUX_IA[0]
  let dist = Math.abs(eloEffectif(meilleur) - bot.elo)
  for (let i = 1; i < NIVEAUX_IA.length; i++) {
    const n = NIVEAUX_IA[i]
    const d = Math.abs(eloEffectif(n) - bot.elo)
    if (d < dist || (d === dist && eloEffectif(n) > eloEffectif(meilleur))) {
      meilleur = n
      dist = d
    }
  }
  return meilleur
}

// Bot représentatif d'un niveau (fallback quand aucun bot mémorisé) : celui
// dont l'ELO est le plus proche de l'ELO effectif du niveau demandé.
export function botPourNiveau(niveauId) {
  const cible = eloEffectif(niveauParId(niveauId))
  return BOTS.reduce((best, b) =>
    Math.abs(b.elo - cible) < Math.abs(best.elo - cible) ? b : best, BOTS[0])
}

// ── Persistance du bot choisi (clé localStorage dédiée) ──────────────────────
export const CLE_BOT_CHOISI = 'brams_chess_bot'

export function lireBotChoisi() {
  try { return botParId(localStorage.getItem(CLE_BOT_CHOISI)) } catch { return null }
}

export function memoriserBotChoisi(id) {
  try { localStorage.setItem(CLE_BOT_CHOISI, id) } catch {}
}
