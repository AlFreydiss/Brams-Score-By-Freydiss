import { useEffect, useRef, useState } from 'react'
import { useCall } from '../../contexts/CallContext.jsx'
import { avatar, T } from './socialStyles.js'

// Overlay global : popup d'appel entrant + interface d'appel actif (vrais flux).
// V2 : partage d'écran, fenêtre minimisable, état de connexion, placeholder caméra.
export default function CallOverlay() {
  const { call, acceptCall, declineCall, endCall, toggleMute, toggleCam, toggleScreenShare, getRemote, getLocal, getScreen } = useCall()
  const remoteAudio = useRef(null)
  const remoteVideo = useRef(null)
  const localVideo = useRef(null)
  const miniVideo = useRef(null)
  const [sec, setSec] = useState(0)
  const [minimized, setMinimized] = useState(false)

  // Branche les flux sur les éléments média (le PiP local montre l'écran si partagé)
  useEffect(() => {
    if (!call) return
    const remote = getRemote()
    if (remoteAudio.current && remote) remoteAudio.current.srcObject = remote
    if (remoteVideo.current && remote) remoteVideo.current.srcObject = remote
    if (miniVideo.current && remote) miniVideo.current.srcObject = remote
    const localShown = call.screenOn ? getScreen() : getLocal()
    if (localVideo.current && localShown) localVideo.current.srcObject = localShown
  }, [call, call?.hasRemote, call?.screenOn, getRemote, getLocal, getScreen])

  // Durée
  useEffect(() => {
    if (call?.phase !== 'active') { setSec(0); return }
    const iv = setInterval(() => setSec(s => s + 1), 1000)
    return () => clearInterval(iv)
  }, [call?.phase])

  // Un appel terminé/raccroché → on ressort de l'état minimisé pour le prochain
  useEffect(() => { if (!call) setMinimized(false) }, [call])

  if (!call) return null
  const { phase, peer, type, muted, camOff, screenOn, connState } = call
  const name = peer?.name || 'Pirate'
  const dur = `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`
  const connecting = phase === 'active' && connState && connState !== 'connected'
  const statusLabel = phase === 'incoming' ? `Appel ${type === 'video' ? 'vidéo' : 'vocal'} entrant`
    : phase === 'outgoing' ? 'Appel en cours…'
    : phase === 'active' ? (connecting ? 'Connexion…' : `En communication · ${dur}`)
    : 'Appel terminé'
  const isVideoActive = type === 'video' && phase === 'active'

  const AvatarBlock = ({ size }) => (
    <span style={{ ...avatar(size), fontSize: size * 0.38 }}>
      {peer?.avatar ? <img src={peer.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (name || '?').slice(0, 2).toUpperCase()}
    </span>
  )

  // ── Fenêtre minimisée (appel actif) : on garde l'audio et un mini-aperçu ──────
  if (minimized && phase === 'active') {
    return (
      <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 9500, width: 248, background: 'linear-gradient(160deg, #14151b, #0c0d12)', border: `1px solid ${T.border}`, borderRadius: 16, padding: 12, boxShadow: '0 16px 50px rgba(0,0,0,.6)' }}>
        <audio ref={remoteAudio} autoPlay playsInline style={{ display: 'none' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {type === 'video'
            ? <video ref={miniVideo} autoPlay playsInline style={{ width: 64, height: 44, borderRadius: 8, objectFit: 'cover', background: '#000', flexShrink: 0 }} />
            : <AvatarBlock size={44} />}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
            <div style={{ fontSize: 11, color: connecting ? T.violet : T.online }}>{connecting ? 'Connexion…' : dur}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 10 }}>
          <CtrlBtn active={muted} onClick={toggleMute} label={muted ? '🔇' : '🎙️'} title="Micro" small />
          <button onClick={() => setMinimized(false)} title="Agrandir" style={{ ...roundBtn(T.violet), width: 40, height: 40, fontSize: 16 }}>⤢</button>
          <button onClick={() => endCall(true)} title="Raccrocher" style={{ ...roundBtn(T.red), width: 40, height: 40, fontSize: 16 }}>📞</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9500, background: 'rgba(4,5,8,0.84)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      {/* audio distant (toujours présent) */}
      <audio ref={remoteAudio} autoPlay playsInline style={{ display: 'none' }} />

      <div style={{ position: 'relative', width: '100%', maxWidth: isVideoActive ? 720 : 380, background: 'linear-gradient(160deg, #14151b, #0c0d12)', border: `1px solid ${T.border}`, borderRadius: 22, padding: isVideoActive ? 16 : '36px 28px', textAlign: 'center', boxShadow: '0 24px 80px rgba(0,0,0,.6)' }}>

        {/* Minimiser (appel actif) */}
        {phase === 'active' && (
          <button onClick={() => setMinimized(true)} title="Réduire" style={{ position: 'absolute', top: 12, right: 12, zIndex: 3, width: 32, height: 32, borderRadius: 9, border: `1px solid ${T.border}`, background: 'rgba(0,0,0,.35)', color: T.text, cursor: 'pointer', fontSize: 14 }}>—</button>
        )}

        {isVideoActive ? (
          <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', background: '#000', aspectRatio: '16/9' }}>
            <video ref={remoteVideo} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            {connecting && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, background: 'rgba(0,0,0,.5)' }}>Connexion…</div>}
            {/* PiP local : avatar si caméra coupée (et pas en partage d'écran) */}
            <div style={{ position: 'absolute', bottom: 12, right: 12, width: 130, aspectRatio: '4/3', borderRadius: 10, border: `1px solid ${T.border}`, overflow: 'hidden', background: '#111' }}>
              <video ref={localVideo} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', display: (camOff && !screenOn) ? 'none' : 'block' }} />
              {camOff && !screenOn && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><AvatarBlock size={54} /></div>}
              {screenOn && <div style={{ position: 'absolute', top: 4, left: 4, fontSize: 9, fontWeight: 700, color: '#fff', background: 'rgba(108,92,231,.85)', borderRadius: 5, padding: '1px 5px' }}>🖥️ Écran</div>}
            </div>
            <div style={{ position: 'absolute', top: 12, left: 14, fontSize: 13, fontWeight: 700, color: '#fff', textShadow: '0 1px 6px #000' }}>{name} · {dur}</div>
          </div>
        ) : (
          <>
            <div style={{ position: 'relative', width: 110, height: 110, margin: '0 auto 20px' }}>
              {(phase === 'incoming' || phase === 'outgoing') && <span style={{ position: 'absolute', inset: -8, borderRadius: '50%', border: `2px solid ${T.violet}`, opacity: 0.5, animation: 'callPing 1.4s ease-out infinite' }} />}
              <AvatarBlock size={110} />
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: T.text, marginBottom: 4 }}>{name}</div>
            <div style={{ fontSize: 13, color: connecting ? T.violet : (phase === 'active' ? T.online : T.textDim), marginBottom: 26 }}>{statusLabel}</div>
          </>
        )}

        {/* Contrôles */}
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', alignItems: 'center', marginTop: isVideoActive ? 14 : 0 }}>
          {phase === 'incoming' ? (
            <>
              <button onClick={declineCall} title="Refuser" style={roundBtn(T.red)}>✕</button>
              <button onClick={acceptCall} title="Accepter" style={roundBtn(T.online)}>📞</button>
            </>
          ) : (
            <>
              <CtrlBtn active={muted} onClick={toggleMute} label={muted ? '🔇' : '🎙️'} title="Micro" />
              {type === 'video' && <CtrlBtn active={camOff} onClick={toggleCam} label={camOff ? '📷' : '🎥'} title="Caméra" />}
              {isVideoActive && <CtrlBtn active={screenOn} onClick={toggleScreenShare} label="🖥️" title={screenOn ? 'Arrêter le partage' : "Partager l'écran"} />}
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
function CtrlBtn({ active, onClick, label, title, small }) {
  const sz = small ? 40 : 50
  return <button onClick={onClick} title={title} style={{ width: sz, height: sz, borderRadius: '50%', cursor: 'pointer', fontSize: small ? 15 : 18, background: active ? T.surface2 : 'rgba(255,255,255,0.06)', border: `1px solid ${active ? T.borderHi : T.border}`, color: active ? T.gold : T.text }}>{label}</button>
}
