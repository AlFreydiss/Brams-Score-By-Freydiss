// ─────────────────────────────────────────────────────────────────────────────
// Curseurs VECTORIELS dessinés main (plus d'emoji système) — un design unique
// par curseur, 40×40, dégradés + formes One Piece. Utilisés par CursorShop :
// curseur natif (data-URI) + aperçu carte. Hotspot ~ (6,4) côté CursorShop.
// ─────────────────────────────────────────────────────────────────────────────

const S = (inner) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40" shape-rendering="geometricPrecision">${inner}</svg>`

export const CURSOR_SVGS = {
  // ── COMMUN ─────────────────────────────────────────────────────────────────
  // Pièce de Berry : pièce d'or frappée ฿, tranche crantée, éclat.
  'cur-berry': S(`
    <defs><radialGradient id="b" cx="35%" cy="30%"><stop offset="0%" stop-color="#ffe9a8"/><stop offset="60%" stop-color="#e8b53a"/><stop offset="100%" stop-color="#9a6d12"/></radialGradient></defs>
    <circle cx="20" cy="20" r="16" fill="url(#b)" stroke="#7a5510" stroke-width="2" stroke-dasharray="2.5 2"/>
    <circle cx="20" cy="20" r="11.5" fill="none" stroke="#8a621a" stroke-width="1.2"/>
    <text x="20" y="26.5" font-size="17" font-weight="bold" text-anchor="middle" fill="#6d4c0c" font-family="Georgia,serif">฿</text>
    <ellipse cx="13" cy="11" rx="4.5" ry="2.6" fill="#fff7d8" opacity=".7" transform="rotate(-28 13 11)"/>`),

  // Log Pose : dôme de verre sur bracelet, aiguille rouge flottante.
  'cur-logpose': S(`
    <defs><radialGradient id="lp" cx="38%" cy="30%"><stop offset="0%" stop-color="#eafcff"/><stop offset="70%" stop-color="#9fd4e8"/><stop offset="100%" stop-color="#4d8aa8"/></radialGradient></defs>
    <rect x="6" y="26" width="28" height="8" rx="4" fill="#8a5a2a" stroke="#5e3c18" stroke-width="1.5"/>
    <circle cx="20" cy="17" r="11" fill="url(#lp)" stroke="#3c6e88" stroke-width="1.6" opacity=".95"/>
    <line x1="20" y1="17" x2="27" y2="10" stroke="#e23b2e" stroke-width="2.2" stroke-linecap="round"/>
    <line x1="20" y1="17" x2="15" y2="21" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>
    <circle cx="20" cy="17" r="2" fill="#234"/>`),

  // Coupe de Saké : coupe céramique, vague de saké, gouttes.
  'cur-sake': S(`
    <defs><linearGradient id="sk" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#fdf6ec"/><stop offset="100%" stop-color="#cdb89a"/></linearGradient></defs>
    <path d="M7 16 h26 c0 9 -6 15 -13 15 s-13 -6 -13 -15 z" fill="url(#sk)" stroke="#8a6a42" stroke-width="1.6"/>
    <ellipse cx="20" cy="16" rx="13" ry="3.4" fill="#f2e3c8" stroke="#8a6a42" stroke-width="1.2"/>
    <path d="M9.5 16 q5 2.4 10.5 1 q5.5 -1.4 10 0.6" fill="none" stroke="#d9c08e" stroke-width="1.4"/>
    <circle cx="31" cy="9" r="1.6" fill="#e8d8b8"/><circle cx="27" cy="6" r="1.1" fill="#e8d8b8"/>`),

  // Carte au Trésor : parchemin roulé, tracé pointillé, X rouge.
  'cur-map': S(`
    <defs><linearGradient id="mp" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#f4e3bb"/><stop offset="100%" stop-color="#cda866"/></linearGradient></defs>
    <path d="M8 7 h24 q2 0 2 2 v22 q0 2 -2 2 h-24 q-2 0 -2 -2 v-22 q0 -2 2 -2 z" fill="url(#mp)" stroke="#8a652c" stroke-width="1.8"/>
    <path d="M11 26 q6 -4 9 -9 q3 -5 9 -7" fill="none" stroke="#7a5a22" stroke-width="1.6" stroke-dasharray="2.6 2.4" stroke-linecap="round"/>
    <path d="M26 8 l5 5 M31 8 l-5 5" stroke="#c0392b" stroke-width="2.6" stroke-linecap="round"/>
    <circle cx="12" cy="28" r="2" fill="none" stroke="#7a5a22" stroke-width="1.2"/>`),

  // ── RARE ───────────────────────────────────────────────────────────────────
  // Chapeau de Paille : paille tressée + ruban rouge, légèrement incliné.
  'cur-strawhat': S(`
    <defs><linearGradient id="sh" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#f6dd8d"/><stop offset="100%" stop-color="#d4a948"/></linearGradient></defs>
    <g transform="rotate(-8 20 22)">
      <ellipse cx="20" cy="26" rx="17" ry="6" fill="url(#sh)" stroke="#a8842e" stroke-width="1.6"/>
      <path d="M9 24 a11 9 0 0 1 22 0 q0 3 -11 3 t-11 -3 z" fill="url(#sh)" stroke="#a8842e" stroke-width="1.6"/>
      <path d="M9.5 22 h21" stroke="#c0392b" stroke-width="4.6"/>
      <path d="M12 17 q8 -3 16 0" fill="none" stroke="#bb9440" stroke-width="1"/>
    </g>`),

  // Den Den Mushi : escargot transpondeur, coquille spirale, yeux périscope.
  'cur-dendenmushi': S(`
    <defs><radialGradient id="dd" cx="40%" cy="35%"><stop offset="0%" stop-color="#ffe9b8"/><stop offset="100%" stop-color="#e8923a"/></radialGradient></defs>
    <path d="M6 30 q10 4 22 0 q3 -1 2 -3 q-7 -4 -26 -1 q-1 3 2 4 z" fill="#f2d8a8" stroke="#a8763a" stroke-width="1.4"/>
    <circle cx="24" cy="18" r="9.5" fill="url(#dd)" stroke="#a05a18" stroke-width="1.6"/>
    <path d="M24 18 m0 -5 a5 5 0 1 1 -5 5 a3.4 3.4 0 1 0 3.4 -3.4" fill="none" stroke="#a05a18" stroke-width="1.6" stroke-linecap="round"/>
    <line x1="11" y1="25" x2="8" y2="15" stroke="#caa05e" stroke-width="1.8"/><line x1="15" y1="24" x2="14" y2="13" stroke="#caa05e" stroke-width="1.8"/>
    <circle cx="8" cy="13" r="2.8" fill="#fff" stroke="#555" stroke-width="1.2"/><circle cx="14" cy="11" r="2.8" fill="#fff" stroke="#555" stroke-width="1.2"/>
    <circle cx="8.6" cy="13.4" r="1" fill="#222"/><circle cx="14.6" cy="11.4" r="1" fill="#222"/>`),

  // Casquette Marine : blanche, visière bleue, mouette dorée.
  'cur-marine': S(`
    <defs><linearGradient id="mc" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ffffff"/><stop offset="100%" stop-color="#dfe7ee"/></linearGradient></defs>
    <path d="M7 22 a13 11 0 0 1 26 0 z" fill="url(#mc)" stroke="#9fb2c2" stroke-width="1.5"/>
    <path d="M5 22 h30 q3 0 2.4 2.6 l-.8 2.4 h-33.2 l-.8 -2.4 q-.6 -2.6 2.4 -2.6 z" fill="#2e5f8a" stroke="#1d3f5e" stroke-width="1.4"/>
    <path d="M14 16 q3 -3 6 0 q3 -3 6 0 q-3 1.6 -6 1.2 q-3 .4 -6 -1.2 z" fill="#e8b53a" stroke="#a8842e" stroke-width=".8"/>`),

  // Ancre du Navire : ancre bleu acier + corde enroulée.
  'cur-anchor': S(`
    <defs><linearGradient id="an" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#9fc2dd"/><stop offset="100%" stop-color="#3e6e96"/></linearGradient></defs>
    <circle cx="20" cy="8" r="3.6" fill="none" stroke="url(#an)" stroke-width="2.6"/>
    <line x1="20" y1="11.6" x2="20" y2="30" stroke="url(#an)" stroke-width="3" stroke-linecap="round"/>
    <line x1="12" y1="17" x2="28" y2="17" stroke="url(#an)" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M8 24 q2 8 12 8 q10 0 12 -8 l-4.5 1.5 q-1.5 4 -7.5 4 t-7.5 -4 z" fill="url(#an)" stroke="#26506e" stroke-width="1"/>
    <path d="M24 7 q4 2 2 6" fill="none" stroke="#c9a25e" stroke-width="1.6" stroke-linecap="round"/>`),

  // ── ÉPIQUE ─────────────────────────────────────────────────────────────────
  // Fruit du Démon : fruit violet à spirales, feuille en vrille.
  'cur-devilfruit': S(`
    <defs><radialGradient id="df" cx="35%" cy="30%"><stop offset="0%" stop-color="#c98ae8"/><stop offset="100%" stop-color="#5e2a8a"/></radialGradient></defs>
    <circle cx="20" cy="23" r="13" fill="url(#df)" stroke="#3c1a5e" stroke-width="1.8"/>
    <path d="M20 23 m-8 0 a8 8 0 0 1 8 -8 a5.5 5.5 0 0 0 -5.5 5.5 a4 4 0 0 1 4 4" fill="none" stroke="#3c1a5e" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M26 21 a6 6 0 0 1 -4 7 a4 4 0 0 0 4 -7 z" fill="#3c1a5e" opacity=".55"/>
    <path d="M20 10 q1 -5 6 -6 q0 5 -4 6.5 z" fill="#3f8a3c" stroke="#26591f" stroke-width="1.2"/>
    <path d="M20 10 q-3 -2 -3 -5" fill="none" stroke="#26591f" stroke-width="1.6" stroke-linecap="round"/>`),

  // Thousand Sunny : proue tête de lion solaire, crinière rayonnante.
  'cur-sunny': S(`
    <defs><radialGradient id="sun" cx="50%" cy="50%"><stop offset="0%" stop-color="#ffe27a"/><stop offset="100%" stop-color="#e89a2a"/></radialGradient></defs>
    <g transform="translate(20 19)">
      ${Array.from({ length: 10 }, (_, i) => `<ellipse cx="0" cy="-13.5" rx="3" ry="5" fill="#e8742a" stroke="#a84a14" stroke-width=".8" transform="rotate(${i * 36})"/>`).join('')}
      <circle r="9.5" fill="url(#sun)" stroke="#a86414" stroke-width="1.6"/>
      <circle cx="-3.2" cy="-1.5" r="1.4" fill="#3c2606"/><circle cx="3.2" cy="-1.5" r="1.4" fill="#3c2606"/>
      <path d="M-3.5 3.2 q3.5 2.8 7 0" fill="none" stroke="#3c2606" stroke-width="1.4" stroke-linecap="round"/>
    </g>
    <path d="M11 33 h18 l-2.5 4 h-13 z" fill="#8a5a2a" stroke="#5e3c18" stroke-width="1.2"/>`),

  // Avis de Recherche : affiche WANTED, silhouette, coins déchirés.
  'cur-wanted': S(`
    <defs><linearGradient id="wt" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#f0e2c0"/><stop offset="100%" stop-color="#cfae72"/></linearGradient></defs>
    <path d="M9 5 l3 1.5 l3 -1.5 l3 1.5 l3 -1.5 l3 1.5 l3 -1.5 l3 1.5 v27 l-3 1.5 l-3 -1.5 l-3 1.5 l-3 -1.5 l-3 1.5 l-3 -1.5 l-3 1.5 z" fill="url(#wt)" stroke="#8a652c" stroke-width="1.5"/>
    <text x="20" y="13" font-size="6.2" font-weight="bold" text-anchor="middle" fill="#5e431a" font-family="Georgia,serif" letter-spacing="1">WANTED</text>
    <circle cx="20" cy="20" r="5" fill="#7a5a30" opacity=".8"/><path d="M14 27 a6 5 0 0 1 12 0 z" fill="#7a5a30" opacity=".8"/>
    <rect x="13" y="29.5" width="14" height="2.4" fill="#5e431a" opacity=".7"/>`),

  // Sandai Kitetsu : katana courbe, lame acier, garde dorée, fourreau rouge.
  'cur-sword': S(`
    <defs><linearGradient id="kt" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#f4f8fc"/><stop offset="100%" stop-color="#9fb2c4"/></linearGradient></defs>
    <path d="M7 33 q14 -4 24 -20 l2.5 -6 l-6 3 q-12 12 -22 21 z" fill="url(#kt)" stroke="#5e7080" stroke-width="1.2"/>
    <path d="M30 13 q-10 11 -19 17.5" fill="none" stroke="#c8d8e4" stroke-width="1"/>
    <rect x="8" y="28" width="9" height="4" rx="1.6" fill="#caa23a" stroke="#8a6a18" stroke-width="1" transform="rotate(-38 12 30)"/>
    <path d="M5 36 l5 -4" stroke="#a01c1c" stroke-width="4.4" stroke-linecap="round"/>
    <path d="M6.4 35 l1.6 -1.3 M8.6 33.3 l1.4 -1.1" stroke="#5e0e0e" stroke-width="1.1"/>`),

  // ── MYTHIQUE ───────────────────────────────────────────────────────────────
  // Mera Mera no Mi : flamme vivante tricolore, cœur blanc.
  'cur-mera': S(`
    <defs><radialGradient id="fl" cx="50%" cy="78%"><stop offset="0%" stop-color="#fff5c2"/><stop offset="45%" stop-color="#ffae3b"/><stop offset="100%" stop-color="#e8421f"/></radialGradient></defs>
    <path d="M20 3 q3 7 8 10 q6 4 6 12 a14 12 0 0 1 -28 0 q0 -8 6 -12 q5 -3 8 -10 z" fill="url(#fl)" stroke="#a82a10" stroke-width="1.5"/>
    <path d="M20 14 q2 4 5 6 q3.5 2.5 3.5 7 a8.5 8 0 0 1 -17 0 q0 -4.5 3.5 -7 q3 -2 5 -6 z" fill="#fff1b8" opacity=".92"/>
    <path d="M20 22 q1.4 2.4 2.8 3.6 q1.8 1.6 1.8 3.8 a4.6 4.4 0 0 1 -9.2 0 q0 -2.2 1.8 -3.8 q1.4 -1.2 2.8 -3.6 z" fill="#ff8a3b"/>`),

  // Gomu Gomu no Pistol : poing rouge étiré, lignes de vitesse.
  'cur-gomu': S(`
    <defs><linearGradient id="gm" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#f4b8a0"/><stop offset="100%" stop-color="#e88a66"/></linearGradient></defs>
    <line x1="2" y1="14" x2="14" y2="14" stroke="#bbb" stroke-width="1.6" stroke-linecap="round" opacity=".8"/>
    <line x1="2" y1="26" x2="12" y2="26" stroke="#bbb" stroke-width="1.6" stroke-linecap="round" opacity=".8"/>
    <path d="M3 18.5 h13 q1 -2.5 4 -2.5 h8 q9 0 9 6 q0 6 -9 6 h-8 q-3 0 -4 -2.5 h-13 q-2 0 -2 -3.5 t2 -3.5 z" fill="url(#gm)" stroke="#a8543a" stroke-width="1.6"/>
    <path d="M22 16 v12 M27 16 v12 M32 16.5 v11" stroke="#a8543a" stroke-width="1.3"/>
    <path d="M20 22 q-2 -4 2 -6" fill="none" stroke="#a8543a" stroke-width="1.3"/>`),

  // Couronne de Yonko : or massif, 4 pointes, 4 gemmes (les 4 Empereurs).
  'cur-yonko': S(`
    <defs><linearGradient id="cr" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ffe27a"/><stop offset="100%" stop-color="#c8921e"/></linearGradient></defs>
    <path d="M6 30 l-1.5 -16 l7.5 6.5 l5 -10.5 l6 0 l5 10.5 l7.5 -6.5 l-1.5 16 z" fill="url(#cr)" stroke="#8a6210" stroke-width="1.8"/>
    <rect x="5.5" y="29" width="29" height="5" rx="2" fill="url(#cr)" stroke="#8a6210" stroke-width="1.4"/>
    <circle cx="11" cy="31.5" r="1.7" fill="#c0392b"/><circle cx="17" cy="31.5" r="1.7" fill="#2e6fc0"/>
    <circle cx="23" cy="31.5" r="1.7" fill="#3f9d4b"/><circle cx="29" cy="31.5" r="1.7" fill="#8a3fc0"/>
    <circle cx="20" cy="12" r="2.2" fill="#fff" opacity=".85"/>`),

  // Pavillon One Piece : jolly roger qui claque au vent.
  'cur-onepiece': S(`
    <line x1="6" y1="3" x2="6" y2="37" stroke="#8a5a2a" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M8 6 q14 -3 28 0 q-3 6 0 12 q-14 3 -28 0 q3 -6 0 -12 z" fill="#16181c" stroke="#000" stroke-width="1.2"/>
    <circle cx="21" cy="11.5" r="4.2" fill="#f4f4f0"/>
    <path d="M15.5 18.5 a5.5 4.5 0 0 1 11 0 z" fill="#f4f4f0" transform="translate(0 -2)"/>
    <circle cx="19.6" cy="11" r="1" fill="#16181c"/><circle cx="22.4" cy="11" r="1" fill="#16181c"/>
    <line x1="14" y1="9" x2="28" y2="20" stroke="#f4f4f0" stroke-width="1.6"/><line x1="28" y1="9" x2="14" y2="20" stroke="#f4f4f0" stroke-width="1.6"/>`),

  // ── INTERDIT ───────────────────────────────────────────────────────────────
  // Gear 5 — Nika : soleil rieur blanc-chaud, yeux spirale, halo.
  'cur-gear5': S(`
    <defs><radialGradient id="g5" cx="50%" cy="45%"><stop offset="0%" stop-color="#ffffff"/><stop offset="75%" stop-color="#ffeebc"/><stop offset="100%" stop-color="#ffc83b"/></radialGradient></defs>
    <g transform="translate(20 20)">
      ${Array.from({ length: 8 }, (_, i) => `<path d="M0 -18 q2.5 4 0 7 q-2.5 -3 0 -7 z" fill="#ffd24a" stroke="#d89a14" stroke-width=".7" transform="rotate(${i * 45})"/>`).join('')}
      <circle r="11" fill="url(#g5)" stroke="#d89a14" stroke-width="1.6"/>
      <path d="M-4.5 -2 a2.6 2.6 0 1 1 2.6 2.6" fill="none" stroke="#3c2606" stroke-width="1.5" stroke-linecap="round"/>
      <path d="M2 -2 a2.6 2.6 0 1 1 2.6 2.6" fill="none" stroke="#3c2606" stroke-width="1.5" stroke-linecap="round"/>
      <path d="M-5 4.5 q5 5 10 0" fill="none" stroke="#3c2606" stroke-width="1.8" stroke-linecap="round"/>
    </g>`),

  // Haoshoku Haki : éclair noir-pourpre qui fend l'air, onde de choc.
  'cur-haki': S(`
    <defs><linearGradient id="hk" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#d8b4ff"/><stop offset="55%" stop-color="#7a2dff"/><stop offset="100%" stop-color="#1c0a3c"/></linearGradient></defs>
    <path d="M24 2 l-12 16 h7 l-5 20 l16 -22 h-8 z" fill="url(#hk)" stroke="#12062a" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M6 12 a16 16 0 0 1 6 -7 M34 30 a16 16 0 0 1 -7 6" fill="none" stroke="#b06cff" stroke-width="1.8" stroke-linecap="round" opacity=".8"/>
    <circle cx="9" cy="27" r="1.3" fill="#d8b4ff"/><circle cx="31" cy="9" r="1.3" fill="#d8b4ff"/>`),

  // Akuma no Mi Interdit : fruit noir aux runes rouges incandescentes.
  'cur-akuma': S(`
    <defs><radialGradient id="ak" cx="38%" cy="30%"><stop offset="0%" stop-color="#4a1218"/><stop offset="100%" stop-color="#120406"/></radialGradient></defs>
    <circle cx="20" cy="23" r="13" fill="url(#ak)" stroke="#000" stroke-width="1.8"/>
    <path d="M20 23 m-8.5 0 a8.5 8.5 0 0 1 8.5 -8.5 a6 6 0 0 0 -6 6 a4.4 4.4 0 0 1 4.4 4.4" fill="none" stroke="#ff3b30" stroke-width="1.7" stroke-linecap="round"/>
    <path d="M27 19 a7 7 0 0 1 -5 9.5" fill="none" stroke="#ff3b30" stroke-width="1.4" stroke-linecap="round" opacity=".75"/>
    <circle cx="20" cy="23" r="13" fill="none" stroke="#ff3b30" stroke-width=".8" opacity=".4"/>
    <path d="M20 10 q1.5 -5 6 -5.5 q-.5 4.5 -4.5 5.8 z" fill="#1c0a0c" stroke="#ff3b30" stroke-width="1"/>`),

  // Œil d'Im-sama : œil fendu dans un halo d'ombre, iris sang.
  'cur-im': S(`
    <defs><radialGradient id="im" cx="50%" cy="50%"><stop offset="0%" stop-color="#ff5a4d"/><stop offset="55%" stop-color="#8a0f12"/><stop offset="100%" stop-color="#1c0406"/></radialGradient></defs>
    <ellipse cx="20" cy="20" rx="17" ry="11" fill="#0c0508" stroke="#3c0a0e" stroke-width="1.6"/>
    <path d="M4 20 q16 -13 32 0 q-16 13 -32 0 z" fill="#1c090c" stroke="#5e1216" stroke-width="1.2"/>
    <circle cx="20" cy="20" r="7" fill="url(#im)"/>
    <ellipse cx="20" cy="20" rx="2" ry="6.4" fill="#050102"/>
    <circle cx="17.5" cy="16.5" r="1.4" fill="#ffb0a8" opacity=".75"/>`),
}

// Data-URI prêt pour `cursor: url(...)` ou <img src>.
// `size` redimensionne le rendu (vectoriel → net à toutes tailles) : 32px pour le
// curseur natif (taille standard OS, pas de clipping), 40+ pour les aperçus.
export function cursorSvgURI(id, size) {
  const svg = CURSOR_SVGS[id]
  if (!svg) return null
  const out = size
    ? svg.replace('width="40" height="40"', `width="${size}" height="${size}"`)
    : svg
  return `data:image/svg+xml,${encodeURIComponent(out)}`
}
