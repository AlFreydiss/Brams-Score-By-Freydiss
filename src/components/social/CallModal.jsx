import { useState, useEffect } from 'react'
import { avatar, T } from './socialStyles.js'

// Modal d'appel premium. V1 : UI complète (sonnerie → en cours → raccrocher,
// mute, caméra) + architecture prête pour brancher WebRTC plus tard.
export default function CallModal({ open, type, peer, onClose }) {
  const [phase, setPhase] = useState('ringing')   // ringing | active | ended
  const [muted, setMuted] = useState(false)
  const [camOff, setCamOff] = useState(type !== 'video')
  const [sec, setSec] = useState(0)

  useEffect(() => {
    if (!open) return
    setPhase('ringing'); setSec(0); setMuted(false); setCamOff(type !== 'video')
    // V1 : pas de WebRTC réel → on passe "en cours" après une courte sonnerie simulée.
    const t = setTimeout(() => setPhase('active'), 2200)
    return () => clearTimeout(t)
  }, [open, type])

  useEffect(() => {
    if (phase !== 'active') return
    const iv = setInterval(() => setSec(s => s + 1), 1000)
    return () => clearInterval(iv)
  }, [phase])

  if (!open) return null
  const name = peer?.name || 'Pirate'
  const dur = `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`

  function hangup() { setPhase('ended'); setTimeout(onClose, 600) }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(4,5,8,0.82)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 380, background: 'linear-gradient(160deg, #14151b, #0c0d12)', border: `1px solid ${T.border}`, borderRadius: 22, padding: '36px 28px', textAlign: 'center', boxShadow: '0 24px 80px rgba(0,0,0,.6)' }}>
        <div style={{ position: 'relative', width: 110, height: 110, margin: '0 auto 20px' }}>
          {phase === 'ringing' && <span style={{ position: 'absolute', inset: -8, borderRadius: '50%', border: `2px solid ${T.violet}`, opacity: 0.5, animation: 'callPing 1.4s ease-out infinite' }} />}
          <span style={{ ...avatar(110), fontSize: 42 }}>
            {peer?.avatar ? <img src={peer.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (name || '?').slice(0, 2).toUpperCase()}
          </span>
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, color: T.text, marginBottom: 4 }}>{name}</div>
        <div style={{ fontSize: 13, color: phase === 'active' ? T.online : T.textDim, marginBottom: 28 }}>
          {phase === 'ringing' ? `Appel ${type === 'video' ? 'vidéo' : 'vocal'}… connexion` : phase === 'active' ? `En cours · ${dur}` : 'Appel terminé'}
        </div>

        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', alignItems: 'center' }}>
          <CtrlBtn active={muted} onClick={() => setMuted(m => !m)} label={muted ? '🔇' : '🎙️'} title="Micro" />
          {type === 'video' && <CtrlBtn active={camOff} onClick={() => setCamOff(c => !c)} label={camOff ? '📷' : '🎥'} title="Caméra" />}
          <button onClick={hangup} title="Raccrocher" style={{ width: 58, height: 58, borderRadius: '50%', border: 'none', background: T.red, color: '#fff', fontSize: 22, cursor: 'pointer', boxShadow: '0 6px 20px rgba(224,82,74,.4)' }}>📞</button>
        </div>

        <div style={{ marginTop: 22, fontSize: 11, color: T.textFaint }}>Appels en bêta · WebRTC complet bientôt</div>
      </div>
      <style>{`@keyframes callPing { 0%{transform:scale(1);opacity:.6} 100%{transform:scale(1.35);opacity:0} }`}</style>
    </div>
  )
}

function CtrlBtn({ active, onClick, label, title }) {
  return (
    <button onClick={onClick} title={title} style={{
      width: 50, height: 50, borderRadius: '50%', cursor: 'pointer', fontSize: 18,
      background: active ? T.surface2 : 'rgba(255,255,255,0.06)',
      border: `1px solid ${active ? T.borderHi : T.border}`, color: active ? T.gold : T.text,
    }}>{label}</button>
  )
}
