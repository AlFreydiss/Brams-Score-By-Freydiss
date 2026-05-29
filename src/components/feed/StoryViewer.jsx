import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { deleteStory } from '../../lib/feed.js'
import { avatar, T } from '../social/socialStyles.js'

function timeAgo(iso) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 60) return "à l'instant"
  if (s < 3600) return `${Math.floor(s / 60)} min`
  return `${Math.floor(s / 3600)} h`
}

// Visionneuse plein écran type Insta : barres de progression + auto-défilement 5s.
export default function StoryViewer({ authors, startIndex = 0, onClose, onDeleted }) {
  const { discordId } = useAuth()
  const [ai, setAi] = useState(startIndex)   // index auteur
  const [si, setSi] = useState(0)            // index story dans l'auteur
  const author = authors[ai]
  const stories = author?.stories || []
  const story = stories[si]

  const next = useCallback(() => {
    if (si < stories.length - 1) setSi(si + 1)
    else if (ai < authors.length - 1) { setAi(ai + 1); setSi(0) }
    else onClose?.()
  }, [si, stories.length, ai, authors.length, onClose])
  const prev = useCallback(() => {
    if (si > 0) setSi(si - 1)
    else if (ai > 0) { const p = authors[ai - 1]; setAi(ai - 1); setSi((p?.stories?.length || 1) - 1) }
  }, [si, ai, authors])

  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') onClose?.(); if (e.key === 'ArrowRight') next(); if (e.key === 'ArrowLeft') prev() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [next, prev, onClose])

  if (!author || !story) return null
  const mine = author.author_id === discordId

  async function remove() {
    if (!window.confirm('Supprimer cette story ?')) return
    const res = await deleteStory(story.id)
    if (res?.ok) { onDeleted?.(story.id); onClose?.() }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9600, background: 'rgba(0,0,0,0.94)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <style>{`@keyframes storyFill { from{width:0%} to{width:100%} }`}</style>
      <div style={{ position: 'relative', width: '100%', maxWidth: 420, height: '100%', maxHeight: 760, display: 'flex', flexDirection: 'column' }}>
        {/* Barres de progression */}
        <div style={{ display: 'flex', gap: 4, padding: '10px 12px 0', zIndex: 3 }}>
          {stories.map((_, i) => (
            <div key={i} style={{ flex: 1, height: 3, borderRadius: 3, background: 'rgba(255,255,255,.3)', overflow: 'hidden' }}>
              {i < si && <div style={{ width: '100%', height: '100%', background: '#fff' }} />}
              {i === si && <div key={`${ai}-${si}`} onAnimationEnd={next} style={{ height: '100%', background: '#fff', animation: 'storyFill 5s linear forwards' }} />}
            </div>
          ))}
        </div>

        {/* En-tête */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px', zIndex: 3 }}>
          <span style={avatar(36)}>{author.avatar ? <img src={author.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (author.username || '?').slice(0, 2).toUpperCase()}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{author.username || `Pirate #${String(author.author_id || '').slice(-5)}`}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.6)' }}>{timeAgo(story.created_at)}</div>
          </div>
          {mine && <button onClick={remove} title="Supprimer" style={{ border: 'none', background: 'transparent', color: '#fff', cursor: 'pointer', fontSize: 16 }}>🗑</button>}
          <button onClick={onClose} title="Fermer" style={{ border: 'none', background: 'transparent', color: '#fff', cursor: 'pointer', fontSize: 22, lineHeight: 1 }}>✕</button>
        </div>

        {/* Image */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src={story.media_url} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
        </div>

        {/* Zones de tap (sous l'en-tête en z-index) */}
        <button onClick={prev} aria-label="Précédent" style={{ position: 'absolute', left: 0, top: 60, bottom: 0, width: '35%', background: 'transparent', border: 'none', cursor: 'pointer', zIndex: 2 }} />
        <button onClick={next} aria-label="Suivant" style={{ position: 'absolute', right: 0, top: 60, bottom: 0, width: '35%', background: 'transparent', border: 'none', cursor: 'pointer', zIndex: 2 }} />
      </div>
    </div>
  )
}
