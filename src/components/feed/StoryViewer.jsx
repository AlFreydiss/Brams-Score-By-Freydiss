import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { deleteStory, markStorySeen, listStoryViewers } from '../../lib/feed.js'
import { avatar, T } from '../social/socialStyles.js'

function timeAgo(iso) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 60) return "à l'instant"
  if (s < 3600) return `${Math.floor(s / 60)} min`
  return `${Math.floor(s / 3600)} h`
}

const isVideo = (url = '') => /\.(mp4|webm|mov)(\?|$)/i.test(url)
const isAudio = (url = '') => /\.(mp3|wav|ogg|webm|m4a)(\?|$)/i.test(url)

export default function StoryViewer({ authors, startIndex = 0, onClose, onDeleted, onSeen }) {
  const { discordId } = useAuth()
  const navigate = useNavigate()
  const [ai, setAi] = useState(startIndex)
  const [si, setSi] = useState(0)
  const author = authors[ai]
  const stories = author?.stories || []
  const story = stories[si]
  const [viewers, setViewers] = useState(null)
  const [audioPlaying, setAudioPlaying] = useState(false)
  const [audioMuted, setAudioMuted] = useState(false)

  const audioElRef = useRef(null)
  const videoElRef = useRef(null)
  const timerRef = useRef(null)

  // Nettoyage audio / timers
  const stopAudio = useCallback(() => {
    const a = audioElRef.current
    if (a) {
      try { a.pause(); a.src = '' } catch {}
    }
    setAudioPlaying(false)
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
  }, [])

  // Marque vue + gère audio pour la story courante
  useEffect(() => {
    setViewers(null)
    stopAudio()

    // Désactive la trail de curseur pendant l'affichage d'une story (évite les particules qui fuitent)
    document.body.dataset.storyOpen = 'true'

    if (!story?.id) return
    let alive = true
    markStorySeen(story.id).then(() => { if (alive) onSeen?.(story.id) }).catch(() => {})

    // Audio de la story (musique de rep / son)
    if (story.audio_url) {
      const a = new Audio(story.audio_url)
      a.loop = false
      a.muted = audioMuted
      a.volume = 0.9
      audioElRef.current = a

      const onEnded = () => {
        setAudioPlaying(false)
        // On laisse l'utilisateur avancer manuellement ou on next après un délai court
        timerRef.current = setTimeout(next, 600)
      }
      a.addEventListener('ended', onEnded)
      a.play().then(() => setAudioPlaying(true)).catch(() => setAudioPlaying(false))

      // Auto-advance fallback si pas de durée connue (5-7s typique IG)
      const dur = (a.duration && isFinite(a.duration)) ? Math.min(Math.max(a.duration * 1000, 3500), 12000) : 6500
      if (!timerRef.current) {
        timerRef.current = setTimeout(next, dur)
      }
    } else {
      // Pas de son → timer fixe 5.5s (progress CSS gère aussi l'animation visuelle)
      timerRef.current = setTimeout(next, 5500)
    }

    return () => {
      alive = false
      stopAudio()
      delete document.body.dataset.storyOpen
    }
  }, [story?.id, story?.audio_url, onSeen, audioMuted, stopAudio])

  // Toggle son de la story
  const toggleAudio = () => {
    const a = audioElRef.current
    if (!a) return
    if (audioPlaying) {
      a.pause()
      setAudioPlaying(false)
    } else {
      a.play().then(() => setAudioPlaying(true)).catch(() => {})
    }
  }
  const toggleMute = (e) => {
    e.stopPropagation()
    const a = audioElRef.current
    const next = !audioMuted
    setAudioMuted(next)
    if (a) a.muted = next
  }

  async function openViewers(e) {
    e.stopPropagation()
    const list = await listStoryViewers(story.id)
    setViewers(list)
  }

  const next = useCallback(() => {
    stopAudio()
    if (si < stories.length - 1) setSi(si + 1)
    else if (ai < authors.length - 1) { setAi(ai + 1); setSi(0) }
    else onClose?.()
  }, [si, stories.length, ai, authors.length, onClose, stopAudio])

  const prev = useCallback(() => {
    stopAudio()
    if (si > 0) setSi(si - 1)
    else if (ai > 0) { const p = authors[ai - 1]; setAi(ai - 1); setSi((p?.stories?.length || 1) - 1) }
  }, [si, ai, authors, stopAudio])

  // Click sur le profil de l'auteur (avatar ou nom) → va sur le profil et ferme la story
  const goProfile = (e) => {
    e?.stopPropagation?.()
    if (!author?.author_id) return
    onClose?.()
    // Petit délai pour que le viewer se démonte proprement avant la nav
    setTimeout(() => navigate(`/u/${author.author_id}`), 60)
  }

  useEffect(() => {
    const fn = e => {
      if (e.key === 'Escape') onClose?.()
      if (e.key === 'ArrowRight') next()
      if (e.key === 'ArrowLeft') prev()
      if (e.key.toLowerCase() === 'm' && story?.audio_url) toggleAudio()
    }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [next, prev, onClose, story?.audio_url])

  if (!author || !story) return null
  const mine = author.author_id === discordId
  const mediaUrl = story.media_url
  const hasAudio = !!story.audio_url
  const musicLabel = [story.music_title, story.music_artist].filter(Boolean).join(' — ') || 'Son'

  async function remove() {
    if (!window.confirm('Supprimer cette story ?')) return
    const res = await deleteStory(story.id)
    if (res?.ok) { onDeleted?.(story.id); onClose?.() }
  }

  const mediaStyle = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',           // vrai feel Insta story (remplit l'écran)
    background: '#111',
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10050,   // au dessus du CursorTrail (9998) et tout le reste
        background: '#000',
        display: 'flex',
        flexDirection: 'column',
      }}
      onClick={next} // tap droit = next (les zones précises sont au-dessus)
    >
      <style>{`
        @keyframes storyFill { from { width: 0% } to { width: 100% } }
        .story-media { transition: opacity .15s ease; }
      `}</style>

      {/* Progress bars tout en haut (IG style) */}
      <div style={{ display: 'flex', gap: 5, padding: '10px 14px 6px', zIndex: 10, background: 'linear-gradient(to bottom, rgba(0,0,0,.65), transparent)' }}>
        {stories.map((_, i) => (
          <div key={i} style={{ flex: 1, height: 3, borderRadius: 3, background: 'rgba(255,255,255,.28)', overflow: 'hidden' }}>
            {i < si && <div style={{ width: '100%', height: '100%', background: '#fff' }} />}
            {i === si && (
              <div
                key={`${ai}-${si}`}
                onAnimationEnd={next}
                style={{ height: '100%', background: '#fff', animation: hasAudio ? 'storyFill 6.5s linear forwards' : 'storyFill 5.2s linear forwards' }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Header fin (cliquable vers profil) */}
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px 10px', zIndex: 10, background: 'linear-gradient(to bottom, rgba(0,0,0,.55), transparent)' }}
        onClick={e => e.stopPropagation()}
      >
        <button onClick={goProfile} style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}>
          <span style={avatar(34)}>{author.avatar ? <img src={author.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (author.username || '?').slice(0, 2).toUpperCase()}</span>
        </button>
        <button onClick={goProfile} style={{ background: 'transparent', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer', flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', lineHeight: 1.1 }}>{author.username || `Pirate #${String(author.author_id || '').slice(-5)}`}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.65)' }}>{timeAgo(story.created_at)}</div>
        </button>

        {hasAudio && (
          <button onClick={toggleMute} style={{ background: 'rgba(255,255,255,.1)', border: 'none', color: '#fff', fontSize: 13, padding: '4px 9px', borderRadius: 999, cursor: 'pointer' }}>
            {audioMuted ? '🔇' : '🔊'}
          </button>
        )}
        {mine && (
          <button onClick={remove} title="Supprimer" style={{ border: 'none', background: 'transparent', color: '#fff', cursor: 'pointer', fontSize: 18, padding: '0 6px' }}>🗑</button>
        )}
        <button onClick={(e) => { e.stopPropagation(); onClose?.() }} title="Fermer" style={{ border: 'none', background: 'transparent', color: '#fff', cursor: 'pointer', fontSize: 26, lineHeight: 1, paddingLeft: 6 }}>✕</button>
      </div>

      {/* MEDIA AREA — prend vraiment tout l'écran restant */}
      <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#000' }} onClick={e => e.stopPropagation()}>
        {/* Vignette sombre pour que le texte (header, progress, music bar) reste lisible même sur médias très clairs / surexposés */}
        <div style={{ position:'absolute', inset:0, background:'radial-gradient(circle at center, rgba(0,0,0,0.15) 40%, rgba(0,0,0,0.55) 75%)', zIndex:1, pointerEvents:'none' }} />

        {isVideo(mediaUrl) ? (
          <video
            ref={videoElRef}
            src={mediaUrl}
            autoPlay
            playsInline
            muted={false}
            style={mediaStyle}
            onEnded={next}
            onError={next}
          />
        ) : (
          <img
            src={mediaUrl}
            alt=""
            className="story-media"
            onError={next}
            style={mediaStyle}
          />
        )}

        {/* Zones tap précises (gauche = prev, droite = next) */}
        <button onClick={(e) => { e.stopPropagation(); prev() }} aria-label="Précédent" style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '28%', background: 'transparent', border: 'none', cursor: 'pointer', zIndex: 2 }} />
        <button onClick={(e) => { e.stopPropagation(); next() }} aria-label="Suivant" style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '28%', background: 'transparent', border: 'none', cursor: 'pointer', zIndex: 2 }} />
      </div>

      {/* Barre musique / son (style sticker Insta) */}
      {hasAudio && (
        <div
          onClick={(e) => { e.stopPropagation(); toggleAudio() }}
          style={{
            position: 'absolute',
            left: 16,
            right: 16,
            bottom: 22,
            zIndex: 12,
            background: 'rgba(0,0,0,.65)',
            color: '#fff',
            borderRadius: 999,
            padding: '8px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 13,
            fontWeight: 600,
            border: '1px solid rgba(255,255,255,.12)',
            cursor: 'pointer',
            maxWidth: 420,
            margin: '0 auto',
          }}
        >
          <span style={{ fontSize: 16 }}>{audioPlaying ? '♪' : '♫'}</span>
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{musicLabel}</span>
          <span style={{ opacity: 0.7, fontSize: 11 }}>{audioPlaying ? 'pause' : 'play'}</span>
        </div>
      )}

      {/* Vues (auteur) */}
      {mine && (
        <button
          onClick={openViewers}
          style={{ position: 'absolute', bottom: 18, left: '50%', transform: 'translateX(-50%)', zIndex: 12, background: 'rgba(255,255,255,.12)', border: 'none', borderRadius: 999, padding: '6px 14px', color: '#fff', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}
        >
          👁 {story.views || 0} vue{(story.views || 0) > 1 ? 's' : ''}
        </button>
      )}

      {/* Viewers sheet */}
      {viewers !== null && (
        <div
          onClick={e => e.stopPropagation()}
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0, maxHeight: '52%', background: '#0a0b0f', borderTop: `1px solid ${T.border}`, borderRadius: '16px 16px 0 0', zIndex: 20, display: 'flex', flexDirection: 'column' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: `1px solid ${T.border}` }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: T.text }}>👁 {viewers.length} vue{viewers.length > 1 ? 's' : ''}</span>
            <button onClick={() => setViewers(null)} style={{ border: 'none', background: 'transparent', color: T.textDim, cursor: 'pointer', fontSize: 18 }}>✕</button>
          </div>
          <div style={{ overflowY: 'auto', padding: 6 }}>
            {viewers.length === 0 ? (
              <div style={{ padding: '28px 16px', textAlign: 'center', color: T.textFaint, fontSize: 13 }}>Personne n'a encore vu cette story.</div>
            ) : (
              viewers.map(v => (
                <div key={v.uid} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px' }}>
                  <span style={avatar(32)}>{v.avatar ? <img src={v.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (v.username || '?').slice(0, 2).toUpperCase()}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{v.username || `Pirate #${String(v.uid).slice(-5)}`}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
