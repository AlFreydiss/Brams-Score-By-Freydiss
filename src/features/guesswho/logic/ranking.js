// Classement de fin de partie et mot de la transition finale.
import { hasGlyph } from './dotFont.js'

// Joueurs assis, du plus voté au moins voté (à égalité : le plus de vies).
export function rankPlayers(players) {
  return [...(players || [])].filter((p) => p.seat != null)
    .sort((a, b) => (b.total_votes || 0) - (a.total_votes || 0) || (b.lives || 0) - (a.lives || 0))
}

// Nom du vainqueur en lettres de points s'il s'écrit avec la police (10
// caractères max pour tenir sur un téléphone), sinon « FIN ».
export function endWord(players) {
  const top = rankPlayers(players)[0]
  const name = String(top?.display_name || '').trim().toUpperCase()
  if (!name || name.length > 10 || ![...name].every(hasGlyph)) return 'FIN'
  return name
}
