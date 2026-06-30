// ── coachContext : transforme une position + analyse Stockfish en message pour le coach IA.
// On donne au LLM des faits VÉRIFIÉS (FEN, éval moteur, ligne principale en SAN légale)
// pour qu'il explique sans inventer de coup. La conversion UCI→SAN se fait via chess.js.
import { Chess } from 'chess.js'
import { normaliserVersBlanc, formaterEval } from '../../../features/echecs/lib/analyse.js'

// pv (coups UCI) → liste de SAN légaux rejoués depuis la FEN (borne à `max` demi-coups).
function pvVersSan(fen, pv, max = 6) {
  const c = new Chess(fen)
  const sans = []
  for (const uci of (pv || []).slice(0, max)) {
    try {
      const mv = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || undefined })
      if (!mv) break
      sans.push(mv.san)
    } catch { break }
  }
  return sans
}

// Décrit le matériel restant (compte simple) pour ancrer l'explication.
function materiel(fen) {
  const champ = fen.split(' ')[0]
  const compte = (re) => (champ.match(re) || []).length
  return {
    blanc: { P: compte(/P/g), N: compte(/N/g), B: compte(/B/g), R: compte(/R/g), Q: compte(/Q/g) },
    noir: { p: compte(/p/g), n: compte(/n/g), b: compte(/b/g), r: compte(/r/g), q: compte(/q/g) },
  }
}

// Construit le message texte envoyé au mode `coach` de /api/chat.
// args : { fen, trait:'w'|'b', resultat (retour analyser), dernierSan, niveauLabel, question }
// `question` = texte libre du joueur (chat). Si présent, le coach répond À CETTE question.
export function construireMessageCoach({ fen, trait, resultat, dernierSan, niveauLabel, question }) {
  const blanc = normaliserVersBlanc(resultat || {}, trait)
  const evalTxt = formaterEval(blanc)
  const ligne = pvVersSan(fen, resultat?.pv, 6)
  const meilleur = ligne[0] || null
  const m = materiel(fen)
  const matTxt = `Blancs P${m.blanc.P} C${m.blanc.N} F${m.blanc.B} T${m.blanc.R} D${m.blanc.Q} · `
    + `Noirs P${m.noir.p} C${m.noir.n} F${m.noir.b} T${m.noir.r} D${m.noir.q}`

  const lignes = [
    `Position (FEN) : ${fen}`,
    `Trait aux ${trait === 'w' ? 'Blancs' : 'Noirs'}.`,
    `Évaluation moteur (côté Blancs) : ${evalTxt}.`,
    meilleur ? `Meilleur coup : ${meilleur}.` : null,
    ligne.length > 1 ? `Ligne principale : ${ligne.join(' ')}.` : null,
    dernierSan ? `Dernier coup joué : ${dernierSan}.` : null,
    `Matériel : ${matTxt}.`,
    niveauLabel ? `Niveau du joueur : ${niveauLabel}.` : null,
    question
      ? `Question du joueur : « ${String(question).slice(0, 300)} ». Réponds précisément à CETTE question, en t'appuyant sur la position et la ligne moteur ci-dessus. Si on te demande quel coup jouer, recommande le meilleur coup et explique brièvement pourquoi.`
      : (dernierSan
        ? `Explique d'abord si ${dernierSan} était un bon coup, puis conseille la suite.`
        : `Explique la position et conseille le meilleur plan.`),
  ].filter(Boolean)

  return lignes.join('\n')
}
