export function createInputController() {
  const keys = new Set()

  const down = (event) => keys.add(event.key.toLowerCase())
  const up = (event) => keys.delete(event.key.toLowerCase())

  window.addEventListener('keydown', down)
  window.addEventListener('keyup', up)

  return {
    axis() {
      const x = (keys.has('arrowright') || keys.has('d') ? 1 : 0) - (keys.has('arrowleft') || keys.has('a') ? 1 : 0)
      const y = (keys.has('arrowdown') || keys.has('s') ? 1 : 0) - (keys.has('arrowup') || keys.has('w') ? 1 : 0)
      const length = Math.hypot(x, y) || 1
      return { x: x / length, y: y / length }
    },
    pressed(key) {
      return keys.has(key.toLowerCase())
    },
    destroy() {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    },
  }
}
