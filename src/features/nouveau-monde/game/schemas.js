// src/features/nouveau-monde/game/schemas.js
// Schémas DÉCLARATIFS de réglages par jeu, consommés par <SettingsDrawer>.
// Item : { key, label, type, options?, min?, max?, step?, group, hint?, format? }
//   type ∈ toggle | select | segmented | slider | color
// Le schéma échecs exhaustif (lichess-like) est étoffé + câblé au plateau par l'intégration échecs.
// Ici = base partagée + valeurs par défaut dérivées.

export const ECHECS_SETTINGS = [
  // Plateau & pièces
  { group: 'Plateau & pièces', key: 'themePlateau', label: 'Thème du plateau', type: 'select',
    options: [
      { value: 'parchemin', label: 'Bois Wano (parchemin)' },
      { value: 'ardoise', label: 'Ardoise' },
      { value: 'emeraude', label: 'Émeraude' },
    ] },
  { group: 'Plateau & pièces', key: 'plateau3D', label: 'Plateau 3D', type: 'toggle', hint: 'Inclinaison perspective' },

  // Coups & repères
  { group: 'Coups & repères', key: 'coupsLegaux', label: 'Afficher les coups légaux', type: 'toggle' },
  { group: 'Coups & repères', key: 'surbrillanceDernier', label: 'Surbrillance du dernier coup', type: 'toggle' },
  { group: 'Coups & repères', key: 'indicateurEchec', label: "Indicateur d'échec", type: 'toggle' },

  // Animation & saisie
  { group: 'Animation & saisie', key: 'vitesseAnim', label: 'Vitesse des pièces', type: 'segmented',
    options: [{ value: 'instant', label: 'Instant' }, { value: 'rapide', label: 'Rapide' }, { value: 'normal', label: 'Normal' }, { value: 'lent', label: 'Lent' }] },
  { group: 'Animation & saisie', key: 'premove', label: 'Premoves', type: 'toggle', hint: "Jouer pendant le tour adverse" },
  { group: 'Animation & saisie', key: 'autoPromo', label: 'Auto-promotion en Dame', type: 'toggle' },

  // Affichage
  { group: 'Affichage', key: 'coordonnees', label: 'Coordonnées', type: 'segmented',
    options: [{ value: 'exterieur', label: 'Extérieur' }, { value: 'interieur', label: 'Intérieur' }, { value: 'masque', label: 'Masqué' }] },
  { group: 'Affichage', key: 'barreEval', label: "Barre d'évaluation", type: 'toggle' },
  { group: 'Affichage', key: 'piecesCapturees', label: 'Pièces capturées + avantage', type: 'toggle' },

  // Sons
  { group: 'Sons', key: 'sons', label: 'Sons', type: 'toggle' },
  { group: 'Sons', key: 'volume', label: 'Volume', type: 'slider', min: 0, max: 1, step: 0.05, format: (v) => `${Math.round(v * 100)}%` },

  // Accessibilité
  { group: 'Accessibilité', key: 'daltonien', label: 'Mode daltonien / contraste élevé', type: 'toggle' },
  { group: 'Accessibilité', key: 'mesPiecesEnBas', label: 'Toujours mes pièces en bas', type: 'toggle' },

  // Moteur
  { group: 'Moteur', key: 'niveauIA', label: 'Niveau IA par défaut', type: 'slider', min: 1, max: 8, step: 1, format: (v) => `Nv ${v}` },
]

export const DAMES_SETTINGS = [
  { group: 'Règles', key: 'variante', label: 'Variante', type: 'segmented',
    options: [{ value: '10x10', label: '10×10' }, { value: '8x8', label: '8×8' }] },
  { group: 'Règles', key: 'priseObligatoire', label: 'Prise obligatoire', type: 'toggle' },
  { group: 'Règles', key: 'priseMaximale', label: 'Prise maximale obligatoire', type: 'toggle' },
  { group: 'Règles', key: 'dameVolante', label: 'Dame volante', type: 'toggle' },
  { group: 'Affichage', key: 'vue2D', label: 'Vue 2D top-down', type: 'toggle' },
  { group: 'Affichage', key: 'surbrillancePrises', label: 'Surbrillance des prises', type: 'toggle' },
  { group: 'Affichage', key: 'coordonnees', label: 'Coordonnées', type: 'toggle' },
  { group: 'Animation', key: 'vitesseRafle', label: 'Vitesse des rafles', type: 'segmented',
    options: [{ value: 'rapide', label: 'Rapide' }, { value: 'normal', label: 'Normal' }, { value: 'lent', label: 'Lent' }] },
  { group: 'Sons', key: 'sons', label: 'Sons', type: 'toggle' },
  { group: 'Sons', key: 'volume', label: 'Volume', type: 'slider', min: 0, max: 1, step: 0.05, format: (v) => `${Math.round(v * 100)}%` },
  { group: 'Moteur', key: 'niveauIA', label: 'Niveau IA par défaut', type: 'slider', min: 1, max: 4, step: 1, format: (v) => `Nv ${v}` },
]

export const SCHEMAS = { echecs: ECHECS_SETTINGS, dames: DAMES_SETTINGS }

// Valeurs par défaut "raisonnables" par jeu (le board lit ces clés via useGameShell()).
export const DEFAULTS = {
  echecs: {
    themePlateau: 'parchemin', plateau3D: true, coupsLegaux: true, surbrillanceDernier: true,
    indicateurEchec: true, vitesseAnim: 'normal', premove: true, autoPromo: false,
    coordonnees: 'exterieur', barreEval: true, piecesCapturees: true, sons: true, volume: 0.6,
    daltonien: false, mesPiecesEnBas: true, niveauIA: 4,
  },
  dames: {
    variante: '10x10', priseObligatoire: true, priseMaximale: true, dameVolante: true,
    vue2D: false, surbrillancePrises: true, coordonnees: true, vitesseRafle: 'normal',
    sons: true, volume: 0.6, niveauIA: 2,
  },
}

export function schemaFor(jeu) { return SCHEMAS[jeu] || [] }
export function defaultsFor(jeu) { return DEFAULTS[jeu] || {} }
