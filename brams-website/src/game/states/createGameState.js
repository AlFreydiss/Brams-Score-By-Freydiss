import { SHIP_MAP } from '../maps/shipMap.js'
import { TASKS } from '../tasks/taskCatalog.js'
import { createMockCrew } from '../entities/playerFactory.js'
import { createFeedbackState } from '../effects/feedback.js'
import { createMeetingState } from '../meetings/meetingSystem.js'

export function createGameState(displayName) {
  const players = createMockCrew(displayName)
  return {
    canvasW: 1280,
    canvasH: 720,
    map: SHIP_MAP,
    players,
    tasks: TASKS.map((task) => ({ ...task, done: false })),
    sabotage: { active: null, timer: 0 },
    meeting: createMeetingState(),
    feedback: createFeedbackState(),
    camera: { x: SHIP_MAP.spawn.x, y: SHIP_MAP.spawn.y },
    time: 0,
    berriesEarned: 0,
    phase: 'lobby',
  }
}
