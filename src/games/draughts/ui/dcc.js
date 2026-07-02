// ── dcc.js : jetons de design « clone chess.com » pour l'univers Dames.
// Calqué sur `cc` (src/games/chess/ui/chesscom.js) : même chrome charbon et
// panneaux SOLIDES (zéro verre dépoli), mais le charbon est refroidi et l'accent
// passe au bleu-acier #6f8fb0 (identité Dames) au lieu du vert chess.com.
// Consommé par tabs/PlayTab.jsx (config pré-partie + partie en cours).
// Styles inline only (repo inline-only).

export const dcc = {
  bg: '#2C2E30',        // fond de page (charbon froid — pendant Dames du #312E2B Échecs)
  panel: '#222426',     // panneau latéral solide (liste de coups, contrôles)
  panelHi: '#282A2C',   // surface secondaire dans le panneau (chips au repos)
  panelBorder: '#3A3D40',
  row: '#26282A',       // barre joueur au repos
  rowHi: '#34373A',     // barre joueur au trait
  line: '#393C3F',
  lineHi: '#45494D',
  text: '#FFFFFF',
  textDim: '#C2C6CA',
  textMute: '#8A8E93',
  accent: '#6f8fb0',    // bleu-acier — accent unique de l'univers Dames
  accentHover: '#88a7c6',
  accentDk: '#5a7590',
  accentInk: '#0d1319', // texte posé sur l'accent
  danger: '#CA3431',
  shadow: '0 18px 48px -22px rgba(0,0,0,0.75)',
  radius: { sm: 5, md: 8, lg: 10, pill: 999 },
}

// Styles de boutons prêts à étaler ({...dccBtn.primary}) — compléter avec la typo.
export const dccBtn = {
  primary: {
    background: dcc.accent, color: dcc.accentInk, border: 'none',
    borderRadius: dcc.radius.md, cursor: 'pointer',
    boxShadow: `0 14px 34px -16px ${dcc.accent}b3`,
  },
  ghost: {
    background: dcc.panelHi, color: dcc.text,
    border: `1px solid ${dcc.line}`,
    borderRadius: dcc.radius.sm, cursor: 'pointer',
  },
  quiet: {
    background: 'transparent', color: dcc.textMute,
    border: `1px solid ${dcc.line}`,
    borderRadius: dcc.radius.sm, cursor: 'pointer',
  },
}

// Barre joueur (au-dessus / en-dessous du plateau, façon chess.com) :
// `active` = ce camp est au trait → surface + liseré relevés.
export function dccPlayerBar(active) {
  return {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
    padding: '8px 10px', borderRadius: dcc.radius.sm, boxSizing: 'border-box',
    background: active ? dcc.rowHi : dcc.row,
    border: `1px solid ${active ? dcc.lineHi : dcc.line}`,
  }
}

// CSS global minimal à injecter UNE fois par écran via <style> :
// focus clavier visible (accent) + coupe des transitions sous reduced-motion.
export const dccGlobalCss = `
  .dcc-focus:focus-visible{ outline: 2px solid ${dcc.accent}; outline-offset: 2px; }
  @media (prefers-reduced-motion: reduce){
    .dcc-motion{ transition: none !important; animation: none !important; }
  }
`
