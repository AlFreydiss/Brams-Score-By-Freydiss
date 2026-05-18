export const ROLES = [
  { id: 'loyal_pirate', name: 'Pirate loyal', faction: 'Equipage', goal: 'Finir les missions et identifier les traitres.', color: '#f6b34b', side: 'crew' },
  { id: 'marine_infiltrator', name: 'Marine infiltre', faction: 'Marine', goal: 'Saboter le navire sans etre demasque.', color: '#6fb7ff', side: 'traitor' },
  { id: 'cipher_pol_spy', name: 'Espion Cipher Pol', faction: 'Gouvernement', goal: 'Isoler les pirates et manipuler les votes.', color: '#f3f6ff', side: 'traitor' },
  { id: 'revolutionary', name: 'Revolutionnaire', faction: 'Revolutionnaires', goal: 'Proteger un joueur cible et survivre.', color: '#37b26c', side: 'neutral' },
  { id: 'bounty_hunter', name: 'Chasseur de primes', faction: 'Independant', goal: 'Faire ejecter ta cible pendant un meeting.', color: '#ad6bff', side: 'neutral' },
  { id: 'saboteur', name: 'Saboteur', faction: 'Ombre', goal: 'Creer le chaos avec les pannes du navire.', color: '#e0524a', side: 'traitor' },
]

export function assignLocalRole(seed = 0) {
  return ROLES[Math.abs(seed) % ROLES.length]
}
