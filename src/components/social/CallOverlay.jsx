import { useEffect, useRef, useState } from 'react'
import { useCall } from '../../contexts/CallContext.jsx'
import { avatar, T } from './socialStyles.js'

// Overlay global : popup d'appel entrant + interface d'appel actif (vrais flux).
export default function CallOverlay() {
  const { call, acceptCall, declineCall, endCall, toggleMute, toggleCam, getRemote, getLocal } = useCall()
  const remoteAudio = useRef(null)
  const remoteVideo = useRef(null)
  const localVideo = useRef(null)
  const [sec, setSec] = useState(0)

  // Branche les flux sur les éléments média
  useEffect(() => {
    if (!call) return
    const remote = getRemote()
    if (remoteAudio.current && remote) remoteAudio.current.srcObject = remote
    if (remoteVideo.current && remote) remoteVideo.current.srcObject = remote
    const local = getLocal()
    if (localVideo.current && local) localVideo.current.srcObject = local
  }, [call, call?.hasRemote, getRemote, getLocal])

  // Durée
  useEffect(() => {
    if (call?.phase !== 'active') { setSec(0); return }
    const iv = setInterval(() => setSec(s => s + 1), 1000)
    return () => clearInterval(iv)
  }, [call?.phase])

  if (!call) return null
  const { phase, peer, type, muted, camOff } = call
  const name = peer?.name || 'Pirate'
  const dur = `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`
  const statusLabel = phase === 'incoming' ? `Appel ${type === 'video' ? 'vidéo' : 'vocal'} entrant`
    : phase === 'outgoing' ? 'Appel en cours…'
    : phase === 'active' ? `En communication · ${dur}`
    : 'Appel terminé'

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9500, background: 'rgba(4,5,8,0.84)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      {/* audio distant (toujours présent) */}
      <audio ref={remoteAudio} autoPlay playsInline style={{ display: 'none' }} />

      <div style={{ width: '100%', maxWidth: type === 'video' && phase === 'active' ? 720 : 380, background: 'linear-gradient(160deg, #14151b, #0c0d12)', border: `1px solid ${T.border}`, borderRadius: 22, padding: type === 'video' && phase === 'active' ? 16 : '36px 28px', textAlign: 'center', boxShadow: '0 24px 80px rgba(0,0,0,.6)' }}>

        {type === 'video' && phase === 'active' ? (
          <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', background: '#000', aspectRatio: '16/9' }}>
            <video ref={remoteVideo} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <video ref={localVideo} autoPlay playsInline muted style={{ position: 'absolute', bottom: 12, right: 12, width: 130, borderRadius: 10, border: `1px solid ${T.border}`, objectFit: 'cover', background: '#111' }} />
            <div style={{ position: 'absolute', top: 12, left: 14, fontSize: 13, fontWeight: 700, color: '#fff', textShadow: '0 1px 6px #000' }}>{name} · {dur}</div>
          </div>
        ) : (
          <>
            <div style={{ position: 'relative', width: 110, height: 110, margin: '0 auto 20px' }}>
              {(phase === 'incoming' || phase === 'outgoing') && <span style={{ position: 'absolute', inset: -8, borderRadius: '50%', border: `2px solid ${T.violet}`, opacity: 0.5, animation: 'callPing 1.4s ease-out infinite' }} />}
              <span style={{ ...avatar(110), fontSize: 42 }}>
                {peer?.avatar ? <img src={peer.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (name || '?').slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: T.text, marginBottom: 4 }}>{name}</div>
            <div style={{ fontSize: 13, color: phase === 'active' ? T.online : T.textDim, marginBottom: 26 }}>{statusLabel}</div>
          </>
        )}

        {/* Contrôles */}
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', alignItems: 'center', marginTop: type === 'video' && phase === 'active' ? 14 : 0 }}>
          {phase === 'incoming' ? (
            <>
              <button onClick={declineCall} title="Refuser" style={roundBtn(T.red)}>✕</button>
              <button onClick={acceptCall} title="Accepter" style={roundBtn(T.online)}>📞</button>
            </>
          ) : (
            <>
              <CtrlBtn active={muted} onClick={toggleMute} label={muted ? '🔇' : '🎙️'} title="Micro" />
              {type === 'video' && <CtrlBtn active={camOff} onClick={toggleCam} label={camOff ? '📷' : '🎥'} title="Caméra" />}
              <button onClick={() => endCall(true)} title="Raccrocher" style={roundBtn(T.red)}>📞</button>
            </>
          )}
        </div>

        {phase !== 'active' && type !== 'video' && <div style={{ marginTop: 20, fontSize: 11, color: T.textFaint }}>Appels P2P (WebRTC) · bêta</div>}
      </div>
      <style>{`@keyframes callPing { 0%{transform:scale(1);opacity:.6} 100%{transform:scale(1.35);opacity:0} }`}</style>
    </div>
  )
}

const roundBtn = (bg) => ({ width: 58, height: 58, borderRadius: '50%', border: 'none', background: bg, color: '#fff', fontSize: 22, cursor: 'pointer', boxShadow: `0 6px 20px ${bg}55` })
function CtrlBtn({ active, onClick, label, title }) {
  return <button onClick={onClick} title={title} style={{ width: 50, height: 50, borderRadius: '50%', cursor: 'pointer', fontSize: 18, background: active ? T.surface2 : 'rgba(255,255,255,0.06)', border: `1px solid ${active ? T.borderHi : T.border}`, color: active ? T.gold : T.text }}>{label}</button>
}
