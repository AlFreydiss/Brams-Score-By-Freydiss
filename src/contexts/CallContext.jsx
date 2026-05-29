import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from './AuthContext.jsx'
import { supabase } from '../lib/supabase.js'

// ── Appels WebRTC réels (audio + vidéo) ──────────────────────────────────────
// Signaling via Supabase Realtime broadcast. Chaque user écoute sa "boîte"
// call:<discordId>. Pour appeler B, on envoie sur call:<B> ; B répond sur call:<A>.
// STUN public Google (pas de TURN → peut échouer derrière NAT symétrique strict).
const ICE = { iceServers: [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
] }

const Ctx = createContext(null)
const rid = () => Math.random().toString(36).slice(2, 10)

export function CallProvider({ children }) {
  const { discordId, displayName, avatarUrl } = useAuth()
  const [call, setCall] = useState(null)
  // call: { phase:'incoming'|'outgoing'|'active'|'ended', peer:{id,name,avatar}, type:'audio'|'video', muted, camOff, callId }
  const pcRef = useRef(null)
  const localRef = useRef(null)      // MediaStream local
  const remoteRef = useRef(null)     // MediaStream distant
  const inboxRef = useRef(null)      // canal call:<moi>
  const peerChanRef = useRef(null)   // canal call:<peer> (pour envoyer)
  const pendingIce = useRef([])
  const offerRef = useRef(null)      // offre reçue (côté appelé, avant accept)
  const callRef = useRef(null)
  useEffect(() => { callRef.current = call }, [call])

  // ── Envoi de signal vers un pair ────────────────────────────────────────────
  const ensurePeerChannel = useCallback((peerId) => {
    if (peerChanRef.current?._peer === peerId) return peerChanRef.current
    try { if (peerChanRef.current) supabase.removeChannel(peerChanRef.current) } catch {}
    const ch = supabase.channel(`call:${peerId}`, { config: { broadcast: { self: false } } })
    ch._peer = peerId
    ch.subscribe()
    peerChanRef.current = ch
    return ch
  }, [])
  const signal = useCallback((peerId, payload) => {
    const ch = ensurePeerChannel(peerId)
    const send = () => { try { ch.send({ type: 'broadcast', event: 'signal', payload }) } catch {} }
    // petit délai si le canal n'est pas encore SUBSCRIBED
    send(); setTimeout(send, 250)
  }, [ensurePeerChannel])

  // ── Nettoyage ────────────────────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    try { pcRef.current?.close() } catch {}
    pcRef.current = null
    try { localRef.current?.getTracks().forEach(t => t.stop()) } catch {}
    localRef.current = null
    remoteRef.current = null
    pendingIce.current = []
    offerRef.current = null
    try { if (peerChanRef.current) supabase.removeChannel(peerChanRef.current) } catch {}
    peerChanRef.current = null
  }, [])

  const endCall = useCallback((notifyPeer = true) => {
    const c = callRef.current
    if (notifyPeer && c?.peer?.id) signal(c.peer.id, { kind: 'end', from: discordId, callId: c.callId })
    cleanup()
    setCall(prev => prev ? { ...prev, phase: 'ended' } : null)
    setTimeout(() => setCall(null), 700)
  }, [signal, cleanup, discordId])

  // ── Construit la RTCPeerConnection ────────────────────────────────────────────
  const buildPc = useCallback((peerId, callId) => {
    const pc = new RTCPeerConnection(ICE)
    pc.onicecandidate = e => { if (e.candidate) signal(peerId, { kind: 'ice', from: discordId, callId, candidate: e.candidate }) }
    pc.ontrack = e => {
      remoteRef.current = e.streams[0]
      // notifie l'UI qu'un flux distant est dispo (re-render)
      setCall(prev => prev ? { ...prev, hasRemote: true } : prev)
    }
    pc.onconnectionstatechange = () => {
      if (['failed', 'disconnected', 'closed'].includes(pc.connectionState)) endCall(false)
    }
    pcRef.current = pc
    return pc
  }, [signal, discordId, endCall])

  const getMedia = useCallback(async (type) => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === 'video' })
    localRef.current = stream
    return stream
  }, [])

  // ── Démarrer un appel (appelant) ──────────────────────────────────────────────
  const startCall = useCallback(async (peer, type = 'audio') => {
    if (callRef.current) return
    if (!discordId || !peer?.id) return
    const callId = rid()
    setCall({ phase: 'outgoing', peer, type, muted: false, camOff: type !== 'video', callId })
    try {
      const stream = await getMedia(type)
      const pc = buildPc(peer.id, callId)
      stream.getTracks().forEach(t => pc.addTrack(t, stream))
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      signal(peer.id, { kind: 'invite', from: discordId, fromName: displayName, fromAvatar: avatarUrl, type, callId, sdp: offer })
    } catch (e) {
      console.error('[call] start', e)
      endCall(false)
    }
  }, [discordId, displayName, avatarUrl, getMedia, buildPc, signal, endCall])

  // ── Accepter (appelé) ──────────────────────────────────────────────────────────
  const acceptCall = useCallback(async () => {
    const c = callRef.current
    if (!c || c.phase !== 'incoming' || !offerRef.current) return
    try {
      const stream = await getMedia(c.type)
      const pc = buildPc(c.peer.id, c.callId)
      stream.getTracks().forEach(t => pc.addTrack(t, stream))
      await pc.setRemoteDescription(new RTCSessionDescription(offerRef.current))
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      for (const cand of pendingIce.current) { try { await pc.addIceCandidate(cand) } catch {} }
      pendingIce.current = []
      signal(c.peer.id, { kind: 'answer', from: discordId, callId: c.callId, sdp: answer })
      setCall(prev => prev ? { ...prev, phase: 'active' } : prev)
    } catch (e) {
      console.error('[call] accept', e)
      endCall(true)
    }
  }, [getMedia, buildPc, signal, discordId, endCall])

  const declineCall = useCallback(() => {
    const c = callRef.current
    if (c?.peer?.id) signal(c.peer.id, { kind: 'decline', from: discordId, callId: c.callId })
    cleanup(); setCall(null)
  }, [signal, cleanup, discordId])

  const toggleMute = useCallback(() => {
    const s = localRef.current
    if (!s) return
    const next = !callRef.current?.muted
    s.getAudioTracks().forEach(t => { t.enabled = !next })
    setCall(prev => prev ? { ...prev, muted: next } : prev)
  }, [])
  const toggleCam = useCallback(() => {
    const s = localRef.current
    if (!s) return
    const next = !callRef.current?.camOff
    s.getVideoTracks().forEach(t => { t.enabled = !next })
    setCall(prev => prev ? { ...prev, camOff: next } : prev)
  }, [])

  // ── Réception des signaux ───────────────────────────────────────────────────
  useEffect(() => {
    if (!supabase || !discordId) return
    const ch = supabase.channel(`call:${discordId}`, { config: { broadcast: { self: false } } })
    ch.on('broadcast', { event: 'signal' }, async ({ payload: p }) => {
      const c = callRef.current
      if (p.kind === 'invite') {
        if (c) { signal(p.from, { kind: 'busy', from: discordId, callId: p.callId }); return } // déjà en appel
        offerRef.current = p.sdp
        setCall({ phase: 'incoming', peer: { id: p.from, name: p.fromName, avatar: p.fromAvatar }, type: p.type || 'audio', muted: false, camOff: (p.type !== 'video'), callId: p.callId })
      } else if (p.kind === 'answer') {
        if (pcRef.current && c?.callId === p.callId) {
          try {
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(p.sdp))
            for (const cand of pendingIce.current) { try { await pcRef.current.addIceCandidate(cand) } catch {} }
            pendingIce.current = []
            setCall(prev => prev ? { ...prev, phase: 'active' } : prev)
          } catch (e) { console.error('[call] answer', e) }
        }
      } else if (p.kind === 'ice') {
        if (c?.callId === p.callId) {
          if (pcRef.current?.remoteDescription) { try { await pcRef.current.addIceCandidate(p.candidate) } catch {} }
          else pendingIce.current.push(p.candidate)
        }
      } else if (p.kind === 'end' || p.kind === 'decline' || p.kind === 'busy') {
        if (c && (!p.callId || c.callId === p.callId)) endCall(false)
      }
    }).subscribe()
    inboxRef.current = ch
    return () => { try { supabase.removeChannel(ch) } catch {} }
  }, [discordId, signal, endCall])

  useEffect(() => () => cleanup(), [cleanup])

  return (
    <Ctx.Provider value={{ call, startCall, acceptCall, declineCall, endCall, toggleMute, toggleCam, getLocal: () => localRef.current, getRemote: () => remoteRef.current }}>
      {children}
    </Ctx.Provider>
  )
}

export function useCall() {
  const ctx = useContext(Ctx)
  if (!ctx) return { call: null, startCall: () => {}, acceptCall: () => {}, declineCall: () => {}, endCall: () => {}, toggleMute: () => {}, toggleCam: () => {}, getLocal: () => null, getRemote: () => null }
  return ctx
}
