export const TASKS = [
  { id: 'den_den_rewire', room: 'den_den', name: 'Reconnecter Den Den Mushi', type: 'sequence', difficulty: 2, reward: 45 },
  { id: 'grand_line_nav', room: 'map_room', name: 'Calibrer navigation Grand Line', type: 'dial', difficulty: 3, reward: 60 },
  { id: 'repair_cannon', room: 'cannons', name: 'Reparer canon tribord', type: 'timing', difficulty: 2, reward: 50 },
  { id: 'cargo_sort', room: 'hold', name: 'Trier cargaison', type: 'sort', difficulty: 1, reward: 35 },
  { id: 'cook_rations', room: 'kitchen', name: 'Cuisiner ration equipage', type: 'rhythm', difficulty: 2, reward: 45 },
  { id: 'clean_poison', room: 'food', name: 'Verifier reserve empoisonnee', type: 'scan', difficulty: 2, reward: 55 },
  { id: 'decode_map', room: 'captain', name: 'Dechiffrer carte secrete', type: 'glyph', difficulty: 3, reward: 70 },
  { id: 'sail_repair', room: 'main_deck', name: 'Reparer voile dechiree', type: 'drag', difficulty: 2, reward: 45 },
  { id: 'compass_align', room: 'lookout', name: 'Realigner compas', type: 'dial', difficulty: 2, reward: 50 },
  { id: 'engine_feed', room: 'engine', name: 'Alimenter moteur', type: 'timing', difficulty: 3, reward: 65 },
]

export function taskProgress(tasks) {
  if (!tasks.length) return 0
  return tasks.filter((task) => task.done).length / tasks.length
}
