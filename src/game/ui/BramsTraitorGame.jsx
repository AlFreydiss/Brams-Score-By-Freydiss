import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { createGameState } from '../states/createGameState.js'
import { startGameLoop } from '../core/gameLoop.js'
import { taskProgress } from '../tasks/taskCatalog.js'
import { createLocalRoomAdapter } from '../network/localRoomAdapter.js'

function HUD({ state, room }) {
  const local = state.players.find((player) => player.local)
  const progress = Math.round(taskProgress(state.tasks) * 100)
  const role = local?.role

  return (
    <div className="traitor-hud">
      <div className="traitor-role" style={{ '--role': role?.color }}>
        <span>ROLE SECRET</span>
        <strong>{role?.name}</strong>
        <em>{role?.goal}</em>
      </div>
      <div className="traitor-hud-center">
        <strong>BRAMS TRAITOR</strong>
        <span>Room {room.roomCode} / {state.players.length} joueurs / tasks {progress}%</span>
      </div>
      <div className="traitor-keys">
        <span>WASD</span><span>Shift dash</span><span>E task</span><span>Q meeting</span><span>F sabotage demo</span>
      </div>
    </div>
  )
}

function SidePanel({ state }) {
  const visibleTasks = state.tasks.filter((task) => !task.done).slice(0, 5)
  return (
    <aside className="traitor-side">
      <div className="traitor-section">
        <span>MISSIONS EQUIPAGE</span>
        {visibleTasks.map((task) => (
          <div className="traitor-task" key={task.id}>
            <strong>{task.name}</strong>
            <em>{task.room.replaceAll('_', ' ')}</em>
          </div>
        ))}
      </div>
      <div className="traitor-section">
        <span>SUSPECTS</span>
        {state.players.slice(0, 6).map((player) => (
          <div className="traitor-suspect" key={player.id}>
            <i style={{ background: player.color }} />
            <strong>{player.name}</strong>
            <em>{player.suspicion}%</em>
          </div>
        ))}
      </div>
    </aside>
  )
}

function MeetingPanel({ meeting, players }) {
  return (
    <AnimatePresence>
      {meeting.active && (
        <motion.div className="traitor-meeting" initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 18 }}>
          <div>
            <span>DEN DEN MUSHI EMERGENCY</span>
            <h2>{meeting.reason}</h2>
            <p>Timer vote: {Math.ceil(meeting.timer)}s. Accuse, mens, defend ton equipage.</p>
          </div>
          <div className="traitor-vote-grid">
            {players.map((player) => <button key={player.id}><i style={{ background: player.color }} />{player.name}</button>)}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Notifications({ notifications }) {
  return (
    <div className="traitor-notifications">
      {notifications.map((note) => <div key={note.id} className={note.type}>{note.text}</div>)}
    </div>
  )
}

export default function BramsTraitorGame({ onClose }) {
  const canvasRef = useRef(null)
  const { displayName } = useAuth()
  const gameStateRef = useRef(createGameState(displayName))
  const [state, setState] = useState(gameStateRef.current)
  const room = useRef(createLocalRoomAdapter()).current

  useEffect(() => {
    gameStateRef.current = createGameState(displayName)
    setState(gameStateRef.current)
  }, [displayName])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined
    const liveState = gameStateRef.current
    liveState.phase = 'playing'
    const stop = startGameLoop(canvas, liveState, { onState: (next) => setState({ ...next }) })
    const interval = setInterval(() => setState({ ...liveState }), 500)
    return () => {
      stop()
      clearInterval(interval)
      room.disconnect()
    }
  }, [room])

  return (
    <div className="traitor-shell">
      <canvas ref={canvasRef} className="traitor-canvas" />
      <div className="traitor-vignette" />
      <button className="traitor-close" onClick={onClose}>Fermer</button>
      <HUD state={state} room={room} />
      <SidePanel state={state} />
      <Notifications notifications={state.feedback.notifications} />
      <MeetingPanel meeting={state.meeting} players={state.players} />
      {state.sabotage.active && (
        <div className="traitor-sabotage" style={{ '--sabotage': state.sabotage.color }}>
          <strong>{state.sabotage.name}</strong>
          <span>{state.sabotage.description} / {Math.ceil(state.sabotage.timer)}s</span>
        </div>
      )}
      <div className="traitor-berries">+{state.berriesEarned} berries potentiels</div>
    </div>
  )
}
