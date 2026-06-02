import { useEffect, useRef, useState } from 'react'
import { Maximize2, Mic, MicOff, Minimize2, MonitorUp, Phone, PhoneOff, Video, VideoOff } from 'lucide-react'
import { useCall } from '../../contexts/CallContext.jsx'
import { avatar, T } from './socialStyles.js'

const terminalPhases = new Set(['ended', 'missed', 'rejected', 'busy', 'failed'])

function labelFor(call, duration, connecting) {
  const type = call.type === 'video' ? 'vidéo' : 'vocal'
  if (call.phase === 'incoming') return `Appel ${type} entrant`
  if (call.phase === 'outgoing') return 'Sonnerie...'
  if (call.phase === 'active') return connecting ? 'Connexion...' : `En communication · ${duration}`
  if (call.phase === 'missed') return 'Appel manqué'
  if (call.phase === 'rejected') return 'Appel refusé'
  if (call.phase === 'busy') return 'Correspondant occupé'
  if (call.phase === 'failed') return 'Appel impossible'
  return 'Appel terminé'
}

async function playRingTone(kind) {
  const AudioCtx = window.AudioContext || window.webkitAudioContext
  if (!AudioCtx) return
  let ctx
  try {
    ctx = new AudioCtx()
    if (ctx.state === 'suspended') await ctx.resume()

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.0001, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(kind === 'incoming' ? 0.12 : 0.07, ctx.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.22)
    gain.connect(ctx.destination)

    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(kind === 'incoming' ? 880 : 520, ctx.currentTime)
    osc.connect(gain)
    osc.start()
    osc.stop(ctx.currentTime + 0.24)
    osc.onended = () => { try { ctx.close() } catch {} }
  } catch {
    try { ctx?.close() } catch {}
  }
}

export default function CallOverlay() {
  const { call, acceptCall, declineCall, endCall, toggleMute, toggleCam, toggleScreenShare, getRemote, getLocal, getScreen } = useCall()
  const remoteAudio = useRef(null)
  const remoteVideo = useRef(null)
  const localVideo = useRef(null)
  const miniVideo = useRef(null)
  const [sec, setSec] = useState(0)
  const [minimized, setMinimized] = useState(false)

  useEffect(() => {
    if (!call) return
    const remote = getRemote()
    if (remoteAudio.current && remote) remoteAudio.current.srcObject = remote
    if (remoteVideo.current && remote) remoteVideo.current.srcObject = remote
    if (miniVideo.current && remote) miniVideo.current.srcObject = remote
    const localShown = call.screenOn ? getScreen() : getLocal()
    if (localVideo.current && localShown) localVideo.current.srcObject = localShown
  }, [call, call?.hasRemote, call?.screenOn, minimized, getRemote, getLocal, getScreen])

  useEffect(() => {
    if (call?.phase !== 'active') { setSec(0); return }
    const iv = setInterval(() => setSec(s => s + 1), 1000)
    return () => clearInterval(iv)
  }, [call?.phase])

  useEffect(() => { if (!call) setMinimized(false) }, [call])

  useEffect(() => {
    if (call?.phase !== 'incoming' && call?.phase !== 'outgoing') return
    let stopped = false
    const ring = () => {
      if (stopped) return
      playRingTone(call.phase)
      if (call.phase === 'incoming') {
        try { navigator.vibrate?.([160, 70, 160]) } catch {}
      }
    }
    ring()
    const iv = setInterval(ring, call.phase === 'incoming' ? 1400 : 2200)
    return () => {
      stopped = true
      clearInterval(iv)
      try { navigator.vibrate?.(0) } catch {}
    }
  }, [call?.phase])

  if (!call) return null
  const { phase, peer, type, muted, camOff, screenOn, connState, error, mediaWarning } = call
  const terminal = terminalPhases.has(phase)
  const name = peer?.name || 'Pirate'
  const dur = `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`
  const connecting = phase === 'active' && connState && connState !== 'connected'
  const isVideoActive = type === 'video' && phase === 'active'
  const statusLabel = labelFor(call, dur, connecting)

  const AvatarBlock = ({ size }) => (
    <span style={{ ...avatar(size), fontSize: size * 0.38 }}>
      {peer?.avatar ? <img src={peer.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (name || '?').slice(0, 2).toUpperCase()}
    </span>
  )

  if (minimized && phase === 'active') {
    return (
      <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 9500, width: 248, background: 'linear-gradient(160deg, #14151b, #0c0d12)', border: `1px solid ${T.border}`, borderRadius: 14, padding: 12, boxShadow: '0 16px 50px rgba(0,0,0,.6)' }}>
        <audio ref={remoteAudio} autoPlay playsInline style={{ display: 'none' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {type === 'video'
            ? <video ref={miniVideo} autoPlay playsInline style={{ width: 64, height: 44, borderRadius: 8, objectFit: 'cover', background: '#000', flexShrink: 0 }} />
            : <AvatarBlock size={44} />}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
            <div style={{ fontSize: 11, color: connecting ? T.violet : T.online }}>{connecting ? 'Connexion...' : dur}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 10 }}>
          <CtrlBtn active={muted} onClick={toggleMute} title="Micro">{muted ? <MicOff size={16} /> : <Mic size={16} />}</CtrlBtn>
          <CtrlBtn onClick={() => setMinimized(false)} title="Agrandir"><Maximize2 size={16} /></CtrlBtn>
          <CtrlBtn danger onClick={() => endCall(true)} title="Raccrocher"><PhoneOff size={17} /></CtrlBtn>
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9500, background: 'rgba(4,5,8,0.84)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <audio ref={remoteAudio} autoPlay playsInline style={{ display: 'none' }} />

      <div style={{ position: 'relative', width: '100%', maxWidth: isVideoActive ? 760 : 390, background: 'linear-gradient(160deg, #14151b, #0c0d12)', border: `1px solid ${T.border}`, borderRadius: 18, padding: isVideoActive ? 16 : '34px 28px', textAlign: 'center', boxShadow: '0 24px 80px rgba(0,0,0,.6)' }}>
        {phase === 'active' && (
          <button onClick={() => setMinimized(true)} title="Réduire" style={{ position: 'absolute', top: 12, right: 12, zIndex: 3, width: 32, height: 32, borderRadius: 8, border: `1px solid ${T.border}`, background: 'rgba(0,0,0,.35)', color: T.text, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Minimize2 size={16} /></button>
        )}

        {isVideoActive ? (
          <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: '#000', aspectRatio: '16/9' }}>
            <video ref={remoteVideo} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            {connecting && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, background: 'rgba(0,0,0,.5)' }}>Connexion...</div>}
            <div style={{ position: 'absolute', bottom: 12, right: 12, width: 136, aspectRatio: '4/3', borderRadius: 10, border: `1px solid ${T.border}`, overflow: 'hidden', background: '#111' }}>
              <video ref={localVideo} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', display: (camOff && !screenOn) ? 'none' : 'block' }} />
              {camOff && !screenOn && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><AvatarBlock size={54} /></div>}
              {screenOn && <div style={{ position: 'absolute', top: 4, left: 4, fontSize: 9, fontWeight: 800, color: '#fff', background: 'rgba(91,141,239,.85)', borderRadius: 5, padding: '1px 5px' }}>Écran</div>}
            </div>
            <div style={{ position: 'absolute', top: 12, left: 14, fontSize: 13, fontWeight: 800, color: '#fff', textShadow: '0 1px 6px #000' }}>{name} · {dur}</div>
          </div>
        ) : (
          <>
            <div style={{ position: 'relative', width: 110, height: 110, margin: '0 auto 20px' }}>
              {(phase === 'incoming' || phase === 'outgoing') && <span style={{ position: 'absolute', inset: -8, borderRadius: '50%', border: `2px solid ${T.gold}`, opacity: 0.5, animation: 'callPing 1.4s ease-out infinite' }} />}
              <AvatarBlock size={110} />
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, color: T.text, marginBottom: 5 }}>{name}</div>
            <div style={{ fontSize: 13, color: terminal || error ? T.red : connecting ? T.violet : (phase === 'active' ? T.online : T.textDim), marginBottom: (error || mediaWarning) ? 8 : 26 }}>{statusLabel}</div>
            {(error || mediaWarning) && <div style={{ fontSize: 12, color: error ? T.red : T.gold, marginBottom: 20, lineHeight: 1.45 }}>{error || mediaWarning}</div>}
          </>
        )}

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', alignItems: 'center', marginTop: isVideoActive ? 14 : 0 }}>
          {phase === 'incoming' ? (
            <>
              <CtrlBtn danger onClick={declineCall} title="Refuser"><PhoneOff size={20} /></CtrlBtn>
              <CtrlBtn accept onClick={acceptCall} title="Accepter"><Phone size={20} /></CtrlBtn>
            </>
          ) : terminal ? null : (
            <>
              <CtrlBtn active={muted} onClick={toggleMute} title="Micro">{muted ? <MicOff size={19} /> : <Mic size={19} />}</CtrlBtn>
              {type === 'video' && <CtrlBtn active={camOff} onClick={toggleCam} title="Caméra">{camOff ? <VideoOff size={19} /> : <Video size={19} />}</CtrlBtn>}
              {isVideoActive && <CtrlBtn active={screenOn} onClick={toggleScreenShare} title={screenOn ? 'Arrêter le partage' : "Partager l'écran"}><MonitorUp size={19} /></CtrlBtn>}
              <CtrlBtn danger onClick={() => endCall(true)} title="Raccrocher"><PhoneOff size={20} /></CtrlBtn>
            </>
          )}
        </div>

        {phase !== 'active' && !terminal && <div style={{ marginTop: 20, fontSize: 11, color: T.textFaint }}>Appel P2P WebRTC</div>}
      </div>
      <style>{`@keyframes callPing { 0%{transform:scale(1);opacity:.6} 100%{transform:scale(1.35);opacity:0} }`}</style>
    </div>
  )
}

function CtrlBtn({ active, danger, accept, onClick, title, children }) {
  const bg = danger ? T.red : accept ? T.online : active ? T.surface2 : 'rgba(255,255,255,0.06)'
  return (
    <button onClick={onClick} title={title} style={{
      width: 52,
      height: 52,
      borderRadius: '50%',
      cursor: 'pointer',
      background: bg,
      border: `1px solid ${active ? T.borderHi : T.border}`,
      color: danger || accept ? '#fff' : active ? T.gold : T.text,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: danger || accept ? `0 8px 24px ${bg}55` : 'none',
    }}>{children}</button>
  )
}
