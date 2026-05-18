export const SABOTAGES = [
  { id: 'lights', name: 'Lumieres coupees', duration: 18, color: '#111827', description: 'La vision tombe, les silhouettes deviennent suspectes.' },
  { id: 'storm', name: 'Tempete Grand Line', duration: 20, color: '#4db5ff', description: 'Le navire tangue et la camera tremble.' },
  { id: 'prison_break', name: 'Prison ouverte', duration: 16, color: '#9ca3af', description: 'Les portes de prison se deverrouillent.' },
  { id: 'poison', name: 'Reserve empoisonnee', duration: 22, color: '#37b26c', description: 'Les pirates doivent nettoyer la reserve.' },
  { id: 'comms', name: 'Communications coupees', duration: 20, color: '#ad6bff', description: 'Den Den Mushi indisponible.' },
  { id: 'fire', name: 'Incendie cale', duration: 18, color: '#e0524a', description: 'La cale se remplit de fumee.' },
]

export function randomSabotage(frame = 0) {
  return SABOTAGES[frame % SABOTAGES.length]
}
