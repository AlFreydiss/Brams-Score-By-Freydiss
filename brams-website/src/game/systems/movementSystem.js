export function updateMovement(player, input, dt, map) {
  const axis = input.axis()
  const accel = 1550
  const damping = Math.pow(0.0008, dt)
  player.vx = player.vx * damping + axis.x * accel * dt
  player.vy = player.vy * damping + axis.y * accel * dt
  const maxSpeed = input.pressed('shift') ? 420 : 285
  const speed = Math.hypot(player.vx, player.vy)
  if (speed > maxSpeed) {
    player.vx = (player.vx / speed) * maxSpeed
    player.vy = (player.vy / speed) * maxSpeed
  }

  player.x = Math.max(70, Math.min(map.width - 70, player.x + player.vx * dt))
  player.y = Math.max(70, Math.min(map.height - 70, player.y + player.vy * dt))
  player.trail.unshift({ x: player.x, y: player.y, alpha: 0.34 })
  player.trail = player.trail.slice(0, input.pressed('shift') ? 14 : 8).map((point, index) => ({ ...point, alpha: 0.28 * (1 - index / 14) }))
}

export function updateBots(players, dt, map, time) {
  players.filter((player) => !player.local).forEach((player, index) => {
    const a = time * (0.34 + index * 0.03) + index * 1.8
    player.vx = Math.cos(a) * 70
    player.vy = Math.sin(a * 0.73) * 55
    player.x = Math.max(80, Math.min(map.width - 80, player.x + player.vx * dt))
    player.y = Math.max(80, Math.min(map.height - 80, player.y + player.vy * dt))
  })
}
