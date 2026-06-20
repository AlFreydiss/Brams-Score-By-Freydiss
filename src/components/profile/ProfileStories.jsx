// ── Ligne stories + highlights du profil (style Insta, sobre) ────────────────
// Réutilise getUserStories / createStory / uploadAttachment / StoryViewer du Fil.
import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUserStories } from '../../lib/profile.js'
import { createStory, uploadAttachment } from '../../lib/feed.js'
import StoryViewer from '../feed/StoryViewer.jsx'

const ALLOWED_IMG = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'video/mp4', 'video/webm']
const ALLOWED_AUDIO = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm']

// Highlights : raccourcis premium vers les espaces Brams (mini-cover figée).
const HIGHLIGHTS = [
  { key: 'wiki',      label: 'Wiki',       icon: '📖', action: 'encyclopedie' },
  { key: 'theories',  label: 'Théories',   icon: '🧭', href: '/fil' },
  { key: 'tournois',  label: 'Tournois',   icon: '🏆', href: '/tournoi' },
  { key: 'blindtest', label: 'Blind Test', icon: '🎧', href: '/blind-test' },
  { key: 'equipage',  label: 'Équipage',   icon: '⚓', href: '/equipage' },
  { key: 'succes',    label: 'Succès',     icon: '🎖', href: '?tab=achievements' },
]

export default function ProfileStories({ discordId, isOwnProfile, member }) {
  const navigate = useNavigate()
  const [stories, setStories] = useState([])
  const [open, setOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)
  const aliveRef = useRef(true)
  useEffect(() => () => { aliveRef.current = false }, [])

  const load = useCallback(() => {
    if (!discordId) return
    getUserStories(discordId).then(s => { if (aliveRef.current) setStories(Array.isArray(s) ? s : []) })
  }, [discordId])
  useEffect(() => { load() }, [load])

  const [pendingAudio, setPendingAudio] = useState(null)
  const [musicTitle, setMusicTitle] = useState('')
  const audioFileRef = useRef(null)

  async function onPick(e) {
    const f = e.target.files?.[0]; e.target.value = ''
    if (!f) return
    if (!ALLOWED_IMG.includes(f.type) && !f.type.startsWith('video/')) {
      alert('Format image ou vidéo non supporté')
      return
    }
    if (f.size > 40 * 1024 * 1024) { alert('Fichier trop lourd'); return }
    setUploading(true)
    try {
      const up = await uploadAttachment(f)
      if (up.error) { alert(up.error); return }

      let audioUrl = null
      const mTitle = musicTitle || null
      if (pendingAudio?.file) {
        const aup = await uploadAttachment(pendingAudio.file)
        if (!aup.error) audioUrl = aup.url
      }

      const res = await createStory({ mediaUrl: up.url, audioUrl, musicTitle: mTitle })
      if (res?.ok) {
        setPendingAudio(null)
        setMusicTitle('')
        load()
      } else if (res?.error) {
        alert(res.error)
      }
    } finally { setUploading(false) }
  }

  function onPickAudio(e) {
    const f = e.target.files?.[0]; e.target.value = ''
    if (!f) return
    if (!ALLOWED_AUDIO.includes(f.type) && !f.type.startsWith('audio/')) {
      alert('Format audio non supporté')
      return
    }
    setPendingAudio({ file: f })
    const t = window.prompt('Titre du son / musique (optionnel)', '')
    if (t != null) setMusicTitle(t.trim())
  }

  const hasStories = stories.length > 0
  // Auteur unique reconstruit pour StoryViewer (qui attend une liste d'auteurs).
  const viewerAuthors = [{
    author_id: discordId,
    username: member?.username,
    avatar: member?.avatar_url,
    stories,
    all_seen: false,
  }]

  const goHighlight = (h) => {
    if (h.action === 'encyclopedie') { document.dispatchEvent(new CustomEvent('open-encyclopedie')); return }
    if (h.href.startsWith('?')) navigate(`/u/${discordId}${h.href}`)
    else navigate(h.href)
  }

  return (
    <div className="pfx-stories">
      {/* Ajouter / voir sa story */}
      {isOwnProfile && (
        <button type="button" className="pfx-story" onClick={() => hasStories ? setOpen(true) : fileRef.current?.click()} disabled={uploading}>
          <span className={`pfx-story-ring${hasStories ? ' active' : ' add'}`}>
            <span className="pfx-story-cover">
              {member?.avatar_url
                ? <img loading="lazy" decoding="async" src={member.avatar_url} alt="" />
                : <em>{(member?.username || '?').slice(0, 2).toUpperCase()}</em>}
            </span>
            {!hasStories && <span className="pfx-story-plus">+</span>}
          </span>
          <span className="pfx-story-label">{uploading ? '…' : hasStories ? 'Ta story' : 'Nouveau'}</span>
        </button>
      )}

      {/* Story d'un autre membre */}
      {!isOwnProfile && hasStories && (
        <button type="button" className="pfx-story" onClick={() => setOpen(true)}>
          <span className="pfx-story-ring active">
            <span className="pfx-story-cover">
              {member?.avatar_url ? <img loading="lazy" decoding="async" src={member.avatar_url} alt="" /> : <em>{(member?.username || '?').slice(0, 2).toUpperCase()}</em>}
            </span>
          </span>
          <span className="pfx-story-label">Story</span>
        </button>
      )}

      {/* Highlights */}
      {HIGHLIGHTS.map(h => (
        <button type="button" key={h.key} className="pfx-story" onClick={() => goHighlight(h)}>
          <span className="pfx-story-ring highlight">
            <span className="pfx-story-cover pfx-story-cover-hl"><em>{h.icon}</em></span>
          </span>
          <span className="pfx-story-label">{h.label}</span>
        </button>
      ))}

      <input ref={fileRef} type="file" accept="image/*,video/mp4,video/webm" onChange={onPick} style={{ display: 'none' }} />
      <input ref={audioFileRef} type="file" accept="audio/*" onChange={onPickAudio} style={{ display: 'none' }} />

      {/* Bouton son optionnel sur le profil */}
      {isOwnProfile && (
        <button
          type="button"
          className="pfx-story"
          onClick={() => audioFileRef.current?.click()}
          disabled={uploading}
          style={{ opacity: pendingAudio ? 1 : 0.85 }}
          title="Ajouter un son / musique de rep à ta story"
        >
          <span className="pfx-story-ring highlight">
            <span className="pfx-story-cover pfx-story-cover-hl"><em>♫</em></span>
          </span>
          <span className="pfx-story-label" style={{ fontSize: 10 }}>{pendingAudio ? 'Son OK' : 'Son'}</span>
        </button>
      )}

      {open && hasStories && (
        <StoryViewer authors={viewerAuthors} startIndex={0} onClose={() => setOpen(false)} onDeleted={load} onSeen={() => {}} />
      )}
    </div>
  )
}
