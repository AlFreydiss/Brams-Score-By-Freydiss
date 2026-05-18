import { roomAt } from '../maps/shipMap.js'

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
  ctx.fill()
  ctx.stroke()
}

function drawRoom(ctx, room, active) {
  ctx.save()
  ctx.fillStyle = room.color
  ctx.strokeStyle = active ? room.light : 'rgba(255,255,255,.12)'
  ctx.lineWidth = active ? 4 : 2
  ctx.shadowColor = room.light
  ctx.shadowBlur = active ? 24 : 6
  roundRect(ctx, room.x, room.y, room.w, room.h, 22)
  ctx.shadowBlur = 0
  ctx.fillStyle = active ? '#fff' : 'rgba(255,255,255,.7)'
  ctx.font = '700 18px Arial'
  ctx.fillText(room.name, room.x + 18, room.y + 30)
  ctx.restore()
}

function drawPlayer(ctx, player, local, time) {
  ctx.save()
  player.trail?.forEach((point) => {
    ctx.globalAlpha = point.alpha
    ctx.fillStyle = player.color
    ctx.beginPath()
    ctx.arc(point.x, point.y, player.radius * 0.84, 0, Math.PI * 2)
    ctx.fill()
  })
  ctx.globalAlpha = 1
  ctx.translate(player.x, player.y)
  const squash = 1 + Math.sin(time * 8 + player.id.length) * 0.035
  ctx.scale(1 / squash, squash)
  ctx.shadowColor = player.color
  ctx.shadowBlur = local ? 24 : 12
  ctx.fillStyle = '#0c1018'
  ctx.strokeStyle = player.color
  ctx.lineWidth = local ? 4 : 3
  ctx.beginPath()
  ctx.ellipse(0, 0, player.radius * 0.9, player.radius * 1.12, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.shadowBlur = 0
  ctx.fillStyle = player.color
  ctx.beginPath()
  ctx.arc(0, -player.radius * 0.42, player.radius * 0.38, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.font = '900 11px Arial'
  ctx.textAlign = 'center'
  ctx.fillText(player.name.slice(0, 9), 0, player.radius + 18)
  ctx.restore()
}

function drawTasks(ctx, tasks, rooms) {
  tasks.filter((task) => !task.done).forEach((task) => {
    const room = rooms.find((item) => item.id === task.room)
    if (!room) return
    const x = room.x + room.w - 34
    const y = room.y + 36
    ctx.save()
    ctx.fillStyle = '#f6b34b'
    ctx.shadowColor = '#f6b34b'
    ctx.shadowBlur = 16
    ctx.beginPath()
    ctx.arc(x, y, 9, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  })
}

function drawMeetingFreeze(ctx, width, height, meeting) {
  if (!meeting.active) return
  ctx.save()
  ctx.fillStyle = 'rgba(5,6,9,.72)'
  ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = '#f6b34b'
  ctx.font = '900 42px Arial'
  ctx.textAlign = 'center'
  ctx.fillText('DEN DEN MUSHI EMERGENCY', width / 2, height / 2 - 20)
  ctx.fillStyle = 'rgba(255,255,255,.72)'
  ctx.font = '700 16px Arial'
  ctx.fillText('Debat vocal, accusations, mensonges. Vote dans le panneau.', width / 2, height / 2 + 18)
  ctx.restore()
}

export function renderGame(ctx, state, viewport) {
  const { canvasW, canvasH, camera, map, players, tasks, sabotage, feedback, meeting, time } = state
  ctx.clearRect(0, 0, canvasW, canvasH)
  ctx.save()
  const sx = feedback.shake ? (Math.random() - 0.5) * feedback.shake : 0
  const sy = feedback.shake ? (Math.random() - 0.5) * feedback.shake : 0
  ctx.translate(canvasW / 2 - camera.x + sx, canvasH / 2 - camera.y + sy)

  const ocean = ctx.createLinearGradient(0, 0, map.width, map.height)
  ocean.addColorStop(0, '#06101c')
  ocean.addColorStop(1, '#02050a')
  ctx.fillStyle = ocean
  ctx.fillRect(0, 0, map.width, map.height)

  ctx.strokeStyle = 'rgba(111,183,255,.06)'
  for (let x = 0; x < map.width; x += 80) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, map.height); ctx.stroke() }
  for (let y = 0; y < map.height; y += 80) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(map.width, y); ctx.stroke() }

  const local = players.find((player) => player.local)
  const activeRoom = local ? roomAt(map, local.x, local.y) : null
  map.rooms.forEach((room) => drawRoom(ctx, room, activeRoom?.id === room.id))
  drawTasks(ctx, tasks, map.rooms)
  feedback.particles.forEach((particle) => {
    ctx.globalAlpha = Math.max(0, particle.life)
    ctx.fillStyle = particle.color
    ctx.beginPath()
    ctx.arc(particle.x, particle.y, 4, 0, Math.PI * 2)
    ctx.fill()
  })
  ctx.globalAlpha = 1
  players.forEach((player) => drawPlayer(ctx, player, player.local, time))

  if (sabotage.active) {
    ctx.fillStyle = sabotage.id === 'lights' ? 'rgba(0,0,0,.46)' : `${sabotage.color}22`
    ctx.fillRect(0, 0, map.width, map.height)
  }
  ctx.restore()

  const vignette = ctx.createRadialGradient(canvasW / 2, canvasH / 2, canvasH * 0.2, canvasW / 2, canvasH / 2, canvasH * 0.75)
  vignette.addColorStop(0, 'rgba(0,0,0,0)')
  vignette.addColorStop(1, 'rgba(0,0,0,.55)')
  ctx.fillStyle = vignette
  ctx.fillRect(0, 0, canvasW, canvasH)
  if (feedback.flash > 0) {
    ctx.fillStyle = `rgba(246,179,75,${feedback.flash * 0.18})`
    ctx.fillRect(0, 0, canvasW, canvasH)
  }
  drawMeetingFreeze(ctx, canvasW, canvasH, meeting)
}
