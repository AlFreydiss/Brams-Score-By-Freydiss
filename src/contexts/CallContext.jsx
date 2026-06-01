import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from './AuthContext.jsx'
import { supabase } from '../lib/supabase.js'
import { logCallEvent } from '../lib/social.js'

const ICE = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
}

const CALL_TIMEOUT_MS = 45000
const TERMINAL_CLEAR_MS = 1200
const Ctx = createContext(null)
const rid = () => Math.random().toString(36).slice(2, 10)

function mediaErrorMessage(error, type) {
  const name = error?.name || ''
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return type === 'video' ? 'Permission caméra/micro refusée.' : 'Permission micro refusée.'
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return type === 'video' ? 'Caméra ou micro introuvable.' : 'Micro introuvable.'
  }
  return 'Impossible de démarrer le média.'
}

export function CallProvider({ children }) {
  const { discordId, displayName, avatarUrl } = useAuth()
  const [call, setCallState] = useState(null)
  const pcRef = useRef(null)
  const localRef = useRef(null)
  const remoteRef = useRef(null)
  const screenRef = useRef(null)
  const camTrackRef = useRef(null)
  const inboxRef = useRef(null)
  const peerChanRef = useRef(null)
  const pendingIce = useRef([])
  const offerRef = useRef(null)
  const timeoutRef = useRef(null)
  const callRef = useRef(null)

  const setCall = useCallback((next) => {
    callRef.current = typeof next === 'function' ? next(callRef.current) : next
    setCallState(callRef.current)
  }, [])

  useEffect(() => { callRef.current = call }, [call])

  const clearCallTimer = useCallback(() => {
    clearTimeout(timeoutRef.current)
    timeoutRef.current = null
  }, [])

  const ensurePeerChannel = useCallback((peerId) => {
    if (!supabase || !peerId) return null
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
    if (!ch) return
    const send = () => { try { ch.send({ type: 'broadcast', event: 'signal', payload }) } catch {} }
    send()
    setTimeout(send, 250)
  }, [ensurePeerChannel])

  const cleanup = useCallback(() => {
    clearCallTimer()
    try { pcRef.current?.close() } catch {}
    pcRef.current = null
    try { localRef.current?.getTracks().forEach(t => t.stop()) } catch {}
    localRef.current = null
    try { screenRef.current?.getTracks().forEach(t => t.stop()) } catch {}
    screenRef.current = null
    camTrackRef.current = null
    remoteRef.current = null
    pendingIce.current = []
    offerRef.current = null
    try { if (peerChanRef.current) supabase.removeChannel(peerChanRef.current) } catch {}
    peerChanRef.current = null
  }, [clearCallTimer])

  const logTerminal = useCallback((c, status) => {
    if (!c?.initiator || !c?.conversationId) return
    const duration = c.startedAt ? Math.max(0, Math.round((Date.now() - c.startedAt) / 1000)) : 0
    logCallEvent(c.conversationId, status, duration, c.callId).catch(() => {})
  }, [])

  const finishCall = useCallback((status = 'ended', notifyPeer = true, error = null) => {
    const c = callRef.current
    if (!c) return
    if (notifyPeer && c.peer?.id) {
      const kind = status === 'rejected' ? 'decline' : status === 'missed' ? 'missed' : 'end'
      signal(c.peer.id, { kind, from: discordId, callId: c.callId })
    }
    logTerminal(c, status)
    cleanup()
    setCall({ ...c, phase: status, error })
    setTimeout(() => {
      if (callRef.current?.callId === c.callId) setCall(null)
    }, TERMINAL_CLEAR_MS)
  }, [cleanup, discordId, logTerminal, setCall, signal])

  const scheduleTimeout = useCallback((callId) => {
    clearCallTimer()
    timeoutRef.current = setTimeout(() => {
      const c = callRef.current
      if (!c || c.callId !== callId || !['incoming', 'outgoing'].includes(c.phase)) return
      finishCall('missed', true)
    }, CALL_TIMEOUT_MS)
  }, [clearCallTimer, finishCall])

  const buildPc = useCallback((peerId, callId) => {
    const pc = new RTCPeerConnection(ICE)
    pc.onicecandidate = e => { if (e.candidate) signal(peerId, { kind: 'ice', from: discordId, callId, candidate: e.candidate }) }
    pc.ontrack = e => {
      remoteRef.current = e.streams[0]
      setCall(prev => prev ? { ...prev, hasRemote: true } : prev)
    }
    pc.onconnectionstatechange = () => {
      const st = pc.connectionState
      setCall(prev => prev ? { ...prev, connState: st } : prev)
      if (st === 'failed') finishCall('failed', false, 'Connexion WebRTC interrompue.')
    }
    pcRef.current = pc
    return pc
  }, [discordId, finishCall, setCall, signal])

  const getMedia = useCallback(async (type) => {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('media_devices_unavailable')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === 'video' })
      localRef.current = stream
      return { stream, type, warning: null }
    } catch (error) {
      if (type === 'video') {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
          localRef.current = stream
          return { stream, type: 'audio', warning: 'Caméra indisponible, appel audio lancé.' }
        } catch (audioError) {
          throw audioError
        }
      }
      throw error
    }
  }, [])

  const startCall = useCallback(async (peer, type = 'audio') => {
    if (callRef.current || !discordId || !peer?.id) return
    const callId = rid()
    const base = {
      phase: 'outgoing',
      peer,
      type,
      muted: false,
      camOff: type !== 'video',
      callId,
      conversationId: peer.conversationId || null,
      initiator: true,
      startedAt: null,
      error: null,
    }
    setCall(base)
    scheduleTimeout(callId)

    try {
      const media = await getMedia(type)
      const pc = buildPc(peer.id, callId)
      media.stream.getTracks().forEach(t => pc.addTrack(t, media.stream))
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      setCall(prev => prev ? { ...prev, type: media.type, camOff: media.type !== 'video', mediaWarning: media.warning } : prev)
      signal(peer.id, {
        kind: 'invite',
        from: discordId,
        fromName: displayName,
        fromAvatar: avatarUrl,
        type: media.type,
        callId,
        conversationId: peer.conversationId || null,
        sdp: offer,
      })
    } catch (error) {
      finishCall('failed', false, mediaErrorMessage(error, type))
    }
  }, [avatarUrl, buildPc, discordId, displayName, finishCall, getMedia, scheduleTimeout, setCall, signal])

  const acceptCall = useCallback(async () => {
    const c = callRef.current
    if (!c || c.phase !== 'incoming' || !offerRef.current) return
    try {
      const media = await getMedia(c.type)
      const pc = buildPc(c.peer.id, c.callId)
      media.stream.getTracks().forEach(t => pc.addTrack(t, media.stream))
      await pc.setRemoteDescription(new RTCSessionDescription(offerRef.current))
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      for (const cand of pendingIce.current) { try { await pc.addIceCandidate(cand) } catch {} }
      pendingIce.current = []
      clearCallTimer()
      signal(c.peer.id, { kind: 'answer', from: discordId, callId: c.callId, type: media.type, sdp: answer })
      setCall(prev => prev ? { ...prev, phase: 'active', type: media.type, camOff: media.type !== 'video', mediaWarning: media.warning, startedAt: Date.now() } : prev)
    } catch (error) {
      finishCall('failed', true, mediaErrorMessage(error, c.type))
    }
  }, [buildPc, clearCallTimer, discordId, finishCall, getMedia, setCall, signal])

  const declineCall = useCallback(() => finishCall('rejected', true), [finishCall])
  const endCall = useCallback((notifyPeer = true) => finishCall('ended', notifyPeer), [finishCall])

  const toggleMute = useCallback(() => {
    const s = localRef.current
    if (!s) return
    const next = !callRef.current?.muted
    s.getAudioTracks().forEach(t => { t.enabled = !next })
    setCall(prev => prev ? { ...prev, muted: next } : prev)
  }, [setCall])

  const toggleCam = useCallback(() => {
    const s = localRef.current
    if (!s) return
    const next = !callRef.current?.camOff
    s.getVideoTracks().forEach(t => { t.enabled = !next })
    setCall(prev => prev ? { ...prev, camOff: next } : prev)
  }, [setCall])

  const stopScreen = useCallback(() => {
    const pc = pcRef.current
    const sender = pc?.getSenders().find(s => s.track && s.track.kind === 'video')
    const cam = camTrackRef.current
    if (sender && cam) { try { sender.replaceTrack(cam) } catch {} }
    try { screenRef.current?.getTracks().forEach(t => t.stop()) } catch {}
    screenRef.current = null
    camTrackRef.current = null
    setCall(prev => prev ? { ...prev, screenOn: false } : prev)
  }, [setCall])

  const toggleScreenShare = useCallback(async () => {
    const pc = pcRef.current
    if (!pc) return
    if (callRef.current?.screenOn) { stopScreen(); return }
    const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video')
    if (!sender) {
      setCall(prev => prev ? { ...prev, mediaWarning: "Le partage d'écran demande un appel vidéo." } : prev)
      return
    }
    let ds
    try { ds = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false }) }
    catch { return }
    const screenTrack = ds.getVideoTracks()[0]
    if (!screenTrack) return
    camTrackRef.current = sender.track
    screenRef.current = ds
    try { await sender.replaceTrack(screenTrack) } catch {}
    screenTrack.onended = () => stopScreen()
    setCall(prev => prev ? { ...prev, screenOn: true } : prev)
  }, [setCall, stopScreen])

  useEffect(() => {
    if (!supabase || !discordId) return
    const ch = supabase.channel(`call:${discordId}`, { config: { broadcast: { self: false } } })
    ch.on('broadcast', { event: 'signal' }, async ({ payload: p }) => {
      const c = callRef.current
      if (p.kind === 'invite') {
        if (c) { signal(p.from, { kind: 'busy', from: discordId, callId: p.callId }); return }
        offerRef.current = p.sdp
        const incoming = {
          phase: 'incoming',
          peer: { id: p.from, name: p.fromName, avatar: p.fromAvatar, conversationId: p.conversationId || null },
          type: p.type || 'audio',
          muted: false,
          camOff: p.type !== 'video',
          callId: p.callId,
          conversationId: p.conversationId || null,
          initiator: false,
          startedAt: null,
          error: null,
        }
        setCall(incoming)
        scheduleTimeout(p.callId)
      } else if (p.kind === 'answer') {
        if (pcRef.current && c?.callId === p.callId) {
          try {
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(p.sdp))
            for (const cand of pendingIce.current) { try { await pcRef.current.addIceCandidate(cand) } catch {} }
            pendingIce.current = []
            clearCallTimer()
            setCall(prev => prev ? { ...prev, phase: 'active', type: p.type || prev.type, startedAt: Date.now() } : prev)
          } catch {
            finishCall('failed', false, 'Réponse WebRTC invalide.')
          }
        }
      } else if (p.kind === 'ice') {
        if (c?.callId === p.callId) {
          if (pcRef.current?.remoteDescription) { try { await pcRef.current.addIceCandidate(p.candidate) } catch {} }
          else pendingIce.current.push(p.candidate)
        }
      } else if (p.kind === 'end') {
        if (c && (!p.callId || c.callId === p.callId)) finishCall('ended', false)
      } else if (p.kind === 'decline') {
        if (c && c.callId === p.callId) finishCall('rejected', false)
      } else if (p.kind === 'busy') {
        if (c && c.callId === p.callId) finishCall('busy', false)
      } else if (p.kind === 'missed') {
        if (c && c.callId === p.callId) finishCall('missed', false)
      }
    }).subscribe()
    inboxRef.current = ch
    return () => { try { supabase.removeChannel(ch) } catch {} }
  }, [clearCallTimer, discordId, finishCall, scheduleTimeout, setCall, signal])

  useEffect(() => {
    const onBeforeUnload = () => {
      const c = callRef.current
      if (c?.peer?.id) signal(c.peer.id, { kind: 'end', from: discordId, callId: c.callId })
      cleanup()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [cleanup, discordId, signal])

  useEffect(() => () => cleanup(), [cleanup])

  return (
    <Ctx.Provider value={{ call, startCall, acceptCall, declineCall, endCall, toggleMute, toggleCam, toggleScreenShare, getLocal: () => localRef.current, getRemote: () => remoteRef.current, getScreen: () => screenRef.current }}>
      {children}
    </Ctx.Provider>
  )
}

export function useCall() {
  const ctx = useContext(Ctx)
  if (!ctx) return { call: null, startCall: () => {}, acceptCall: () => {}, declineCall: () => {}, endCall: () => {}, toggleMute: () => {}, toggleCam: () => {}, toggleScreenShare: () => {}, getLocal: () => null, getRemote: () => null, getScreen: () => null }
  return ctx
}
