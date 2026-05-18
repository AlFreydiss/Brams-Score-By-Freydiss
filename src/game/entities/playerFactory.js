import { SHIP_MAP } from '../maps/shipMap.js'
import { ROLES } from '../roles/roleCatalog.js'

const COLORS = ['#e0524a', '#f6b34b', '#49d6ff', '#37b26c', '#ad6bff', '#ff9bd4', '#d8ecff', '#9ccf78']

export function createPlayer({ id, name, local = false, index = 0 }) {
  const angle = (index / 8) * Math.PI * 2
  return {
    id,
    name,
    local,
    role: ROLES[index % ROLES.length],
    color: COLORS[index % COLORS.length],
    x: SHIP_MAP.spawn.x + Math.cos(angle) * 70,
    y: SHIP_MAP.spawn.y + Math.sin(angle) * 48,
    vx: 0,
    vy: 0,
    radius: local ? 20 : 18,
    alive: true,
    suspicion: Math.round(18 + index * 9),
    trail: [],
    emote: null,
  }
}

export function createMockCrew(displayName = 'Pirate') {
  const names = [displayName, 'Nami.exe', 'ZoroLost', 'SanjiCook', 'RobinCalm', 'FrankyBot', 'Marine???', 'SaboVibes']
  return names.map((name, index) => createPlayer({ id: index === 0 ? 'local' : `bot-${index}`, name, local: index === 0, index }))
}
