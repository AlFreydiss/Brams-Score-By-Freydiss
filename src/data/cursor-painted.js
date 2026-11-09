// Curseurs PEINTS (Grok Imagine 2.0, détourés) : public/cursors/painted/<id>.webp (96 px,
// aperçus + curseur animé) et <id>-32.png (curseur natif). Valeur = point de clic
// en px dans l'image 32 px (pointe de l'objet, calculée sur la diagonale haut-gauche).
export const PAINTED_CURSORS = {
  'cur-berry': [8,4],
  'cur-logpose': [5,6],
  'cur-sake': [2,4],
  'cur-map': [7,1],
  'cur-strawhat': [4,7],
  'cur-dendenmushi': [3,4],
  'cur-marine': [5,2],
  'cur-anchor': [14,1],
  'cur-devilfruit': [8,1],
  'cur-sunny': [12,1],
  'cur-wanted': [5,1],
  'cur-sword': [1,2],
  'cur-clairobscur': [1,1],
  'cur-mera': [11,1],
  'cur-gomu': [8,2],
  'cur-yonko': [1,7],
  'cur-onepiece': [2,1],
  'cur-gear5': [8,4],
  'cur-haki': [6,7],
  'cur-akuma': [9,1],
  'cur-im': [6,4],
  'cur-bottle': [13,1],
  'cur-island': [9,1],
  'cur-spyglass': [2,2],
  'cur-northstar': [15,2],
  'cur-parrot': [4,1],
  'cur-jollyroger': [9,2],
  'cur-trident': [4,2],
  'cur-mermaid': [2,1]
}

export const paintedCursor = (id) => PAINTED_CURSORS[id]
  ? { src: `/cursors/painted/${id}.webp`, src32: `/cursors/painted/${id}-32.png`, hot: PAINTED_CURSORS[id] }
  : null
