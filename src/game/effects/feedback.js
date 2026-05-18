export function createFeedbackState() {
  return { shake: 0, flash: 0, notifications: [], particles: [] }
}

export function pushNotification(feedback, text, type = 'info') {
  feedback.notifications.unshift({ id: crypto.randomUUID(), text, type, life: 3.2 })
  feedback.notifications = feedback.notifications.slice(0, 4)
}

export function burst(feedback, x, y, color, count = 14) {
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2
    feedback.particles.push({ x, y, vx: Math.cos(angle) * (90 + Math.random() * 80), vy: Math.sin(angle) * (90 + Math.random() * 80), color, life: 0.7 })
  }
}

export function updateFeedback(feedback, dt) {
  feedback.shake = Math.max(0, feedback.shake - dt * 22)
  feedback.flash = Math.max(0, feedback.flash - dt * 2.8)
  feedback.notifications = feedback.notifications.map((n) => ({ ...n, life: n.life - dt })).filter((n) => n.life > 0)
  feedback.particles = feedback.particles.map((p) => ({ ...p, x: p.x + p.vx * dt, y: p.y + p.vy * dt, life: p.life - dt })).filter((p) => p.life > 0)
}
