// ── Emotes préréglés (arène jeux) ───────────────────────────────────────────
// Set FERMÉ, anti-toxique : uniquement des réactions sportives/positives. Aucun
// texte libre (pas d'insulte possible), aucun emote provocateur. Diffusés via le
// canal Realtime de la partie (broadcast) — voir EmoteBar.jsx.
//
// Chaque emote : { id (clé broadcast stable), glyph (rendu), label (a11y/tooltip) }.
export const EMOTES = [
  { id: 'gg',     glyph: '👍', label: 'GG, bien joué' },
  { id: 'beau',   glyph: '♟️', label: 'Joli coup' },
  { id: 'oups',   glyph: '😅', label: 'Oups' },
  { id: 'feu',    glyph: '🔥', label: 'Quel niveau' },
  { id: 'main',   glyph: '🤝', label: 'Respect' },
  { id: 'temps',  glyph: '⏱️', label: 'Vite, le temps file' },
  { id: 'coeur',  glyph: '❤️', label: 'Merci' },
  { id: 'wow',    glyph: '😮', label: 'Impressionnant' },
]

// Accès O(1) par id (validation à la réception : on n'affiche QUE des emotes connus).
export const EMOTE_BY_ID = Object.fromEntries(EMOTES.map(e => [e.id, e]))

// Délai mini entre deux emotes d'un même joueur (anti-spam, ms).
export const EMOTE_THROTTLE_MS = 2000
