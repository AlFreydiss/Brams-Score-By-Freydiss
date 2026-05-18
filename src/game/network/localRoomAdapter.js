export function createLocalRoomAdapter() {
  const roomCode = Math.random().toString(36).slice(2, 6).toUpperCase()
  const listeners = new Map()
  return {
    roomCode,
    status: 'local-simulation',
    on(event, cb) {
      listeners.set(event, cb)
      return () => listeners.delete(event)
    },
    emit(event, payload) {
      listeners.get(event)?.(payload)
    },
    syncPlayer() {},
    disconnect() {
      listeners.clear()
    },
  }
}
