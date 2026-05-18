import { createInputController } from './input.js'
import { renderGame } from './renderer.js'
import { updateBots, updateMovement } from '../systems/movementSystem.js'
import { burst, pushNotification, updateFeedback } from '../effects/feedback.js'
import { randomSabotage } from '../sabotages/sabotageCatalog.js'
import { startMeeting, updateMeeting } from '../meetings/meetingSystem.js'
import { roomAt } from '../maps/shipMap.js'

export function startGameLoop(canvas, state, callbacks = {}) {
  const ctx = canvas.getContext('2d')
  const input = createInputController()
  let raf = 0
  let last = performance.now()
  let sabotageCooldown = 10
  let taskCooldown = 0

  function resize() {
    const rect = canvas.getBoundingClientRect()
    const dpr = Math.min(window.devicePixelRatio || 1, 1.6)
    canvas.width = Math.max(900, Math.floor(rect.width * dpr))
    canvas.height = Math.max(520, Math.floor(rect.height * dpr))
    state.canvasW = canvas.width
    state.canvasH = canvas.height
  }

  function completeNearbyTask(local) {
    const room = roomAt(state.map, local.x, local.y)
    if (!room) return
    const task = state.tasks.find((item) => item.room === room.id && !item.done)
    if (!task) return
    task.done = true
    state.berriesEarned += task.reward
    state.feedback.flash = 1
    burst(state.feedback, local.x, local.y, '#f6b34b', 18)
    pushNotification(state.feedback, `${task.name} terminee +${task.reward} berries`, 'success')
    callbacks.onState?.(state)
  }

  function triggerSabotage() {
    const sabotage = randomSabotage(Math.floor(state.time * 10))
    state.sabotage = { ...sabotage, active: true, timer: sabotage.duration }
    state.feedback.shake = sabotage.id === 'storm' ? 18 : 8
    state.feedback.flash = 0.8
    pushNotification(state.feedback, `Sabotage: ${sabotage.name}`, 'danger')
    callbacks.onState?.(state)
  }

  function tick(now) {
    const dt = Math.min(0.033, (now - last) / 1000)
    last = now
    state.time += dt
    const local = state.players.find((player) => player.local)

    if (!state.meeting.active && local) {
      updateMovement(local, input, dt, state.map)
      updateBots(state.players, dt, state.map, state.time)
      taskCooldown = Math.max(0, taskCooldown - dt)
      if (input.pressed('e') && taskCooldown <= 0) {
        completeNearbyTask(local)
        taskCooldown = 0.6
      }
      if (input.pressed('q') && taskCooldown <= 0) {
        startMeeting(state.meeting, 'Den Den Mushi active')
        state.feedback.shake = 12
        pushNotification(state.feedback, 'Den Den Mushi Emergency lance', 'danger')
        callbacks.onState?.(state)
        taskCooldown = 1
      }
      if (input.pressed('f') && taskCooldown <= 0) {
        triggerSabotage()
        taskCooldown = 1
      }
    }

    sabotageCooldown -= dt
    if (sabotageCooldown <= 0 && !state.sabotage.active && state.phase === 'playing') {
      triggerSabotage()
      sabotageCooldown = 18 + Math.random() * 12
    }
    if (state.sabotage.active) {
      state.sabotage.timer -= dt
      if (state.sabotage.timer <= 0) state.sabotage = { active: false, timer: 0 }
    }
    updateMeeting(state.meeting, dt)
    updateFeedback(state.feedback, dt)
    if (local) {
      state.camera.x += (local.x - state.camera.x) * (1 - Math.pow(0.001, dt))
      state.camera.y += (local.y - state.camera.y) * (1 - Math.pow(0.001, dt))
    }
    renderGame(ctx, state, {})
    raf = requestAnimationFrame(tick)
  }

  resize()
  window.addEventListener('resize', resize)
  raf = requestAnimationFrame(tick)
  return () => {
    cancelAnimationFrame(raf)
    window.removeEventListener('resize', resize)
    input.destroy()
  }
}
